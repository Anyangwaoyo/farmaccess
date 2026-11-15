import { EMPTY_DB, type LocalFarmAccessDB } from '../data/seedData';
import {
  generateReferenceNumber,
  getCategoryForService,
} from '../lib/formatters';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  AccountStatus,
  Booking,
  BookingStatus,
  Equipment,
  PricingMethod,
  Profile,
  ProviderApprovalStatus,
  ProviderProfile,
  Quotation,
  ServiceRequest,
  ServiceType,
  TransactionPaymentStatus,
  TransactionRecord,
} from '../types/farmaccess';

const STORAGE_KEY = 'farmaccess_mvp_db_v2';
const SESSION_KEY = 'farmaccess_mvp_session_profile_id';

function loadLocalDB(): LocalFarmAccessDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(EMPTY_DB));
      return structuredClone(EMPTY_DB);
    }
    return JSON.parse(raw) as LocalFarmAccessDB;
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

function saveLocalDB(db: LocalFarmAccessDB): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export interface RegisterPayload {
  fullName: string;
  contact: string; // Email address OR Phone number
  password: string;
  role: 'farmer' | 'provider';
}

export interface ServiceSnapshot {
  profiles: Profile[];
  providers: ProviderProfile[];
  equipment: Equipment[];
  serviceRequests: ServiceRequest[];
  quotations: Quotation[];
  bookings: Booking[];
  transactionRecords: TransactionRecord[];
}

function isEmailInput(value: string): boolean {
  return value.includes('@');
}

function normalizePhone(value: string): string {
  return value.replace(/\s+/g, '').trim();
}

function hydrateSnapshot(
  raw: ServiceSnapshot,
  viewerProfile: Profile | null
): ServiceSnapshot {
  const profileMap = new Map(raw.profiles.map((p) => [p.id, p]));
  const equipmentMap = new Map(raw.equipment.map((e) => [e.id, e]));

  const providers: ProviderProfile[] = raw.providers.map((prov) => {
    const owner = profileMap.get(prov.profile_id);
    return {
      ...prov,
      owner_name: owner?.full_name,
      owner_phone: owner?.phone,
      owner_email: owner?.email,
      account_status: owner?.account_status,
    };
  });

  const hydratedProviderMap = new Map(providers.map((p) => [p.id, p]));

  const equipment: Equipment[] = raw.equipment.map((eq) => {
    const prov = hydratedProviderMap.get(eq.provider_id);
    return {
      ...eq,
      provider_name: prov?.business_name,
      provider_approval_status: prov?.approval_status,
    };
  });

  const viewerProvider = viewerProfile
    ? providers.find((p) => p.profile_id === viewerProfile.id)
    : undefined;

  const serviceRequests: ServiceRequest[] = raw.serviceRequests.map((req) => {
    const farmer = profileMap.get(req.farmer_id);
    const prefEq = req.preferred_equipment_id
      ? equipmentMap.get(req.preferred_equipment_id)
      : undefined;

    const hasConfirmedBookingWithViewer =
      viewerProvider &&
      raw.bookings.some(
        (b) => b.request_id === req.id && b.provider_id === viewerProvider.id
      );

    const canSeePrivateFarmerDetails =
      viewerProfile?.role === 'admin' ||
      viewerProfile?.id === req.farmer_id ||
      Boolean(hasConfirmedBookingWithViewer);

    return {
      ...req,
      farmer_name: canSeePrivateFarmerDetails
        ? farmer?.full_name
        : `Farmer in ${req.lga || req.state}`,
      farmer_phone: canSeePrivateFarmerDetails ? farmer?.phone : undefined,
      preferred_equipment_name: prefEq?.name,
    };
  });

  const quotations: Quotation[] = raw.quotations.map((q) => {
    const prov = hydratedProviderMap.get(q.provider_id);
    const eq = equipmentMap.get(q.equipment_id);
    return {
      ...q,
      provider_name: prov?.business_name,
      provider_states: prov?.coverage_states,
      equipment_name: eq?.name,
      equipment_type: eq?.equipment_type,
      equipment_image: eq?.image_url,
    };
  });

  const bookings: Booking[] = raw.bookings.map((b) => {
    const farmer = profileMap.get(b.farmer_id);
    const prov = hydratedProviderMap.get(b.provider_id);
    const eq = equipmentMap.get(b.equipment_id);
    return {
      ...b,
      farmer_name: farmer?.full_name,
      farmer_phone: farmer?.phone,
      provider_name: prov?.business_name,
      provider_phone: prov?.owner_phone,
      equipment_name: eq?.name,
    };
  });

  return {
    profiles: raw.profiles,
    providers,
    equipment,
    serviceRequests,
    quotations,
    bookings,
    transactionRecords: raw.transactionRecords,
  };
}

export const farmAccessService = {
  isSupabaseMode(): boolean {
    return isSupabaseConfigured;
  },

  async getCurrentSessionProfile(): Promise<Profile | null> {
    if (isSupabaseConfigured && supabase) {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      return (profile as Profile) ?? null;
    }

    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return null;
    const db = loadLocalDB();
    return db.profiles.find((p) => p.id === sessionId) ?? null;
  },

  async login(identifier: string, password: string): Promise<Profile> {
    const clean = identifier.trim();
    if (!clean || !password) {
      throw new Error('Please enter your email or phone number and password.');
    }

    if (isSupabaseConfigured && supabase) {
      const isEmail = isEmailInput(clean);
      const { data, error } = isEmail
        ? await supabase.auth.signInWithPassword({
            email: clean.toLowerCase(),
            password,
          })
        : await supabase.auth.signInWithPassword({
            phone: normalizePhone(clean),
            password,
          });
      if (error || !data.user) {
        throw new Error(error?.message || 'Invalid login credentials.');
      }
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (profErr || !profile) {
        throw new Error('Account profile not found.');
      }
      if (profile.account_status === 'suspended') {
        await supabase.auth.signOut();
        throw new Error('Your account has been suspended. Please contact an administrator.');
      }
      return profile as Profile;
    }

    const db = loadLocalDB();
    const lowerClean = clean.toLowerCase();
    const normPhone = normalizePhone(clean);
    const cred = db.credentials.find(
      (c) =>
        c.password === password &&
        (c.identifier.toLowerCase() === lowerClean ||
          (c.email && c.email.toLowerCase() === lowerClean) ||
          (c.phone && normalizePhone(c.phone) === normPhone))
    );
    if (!cred) {
      throw new Error('Invalid email/phone number or password.');
    }
    const profile = db.profiles.find((p) => p.id === cred.profileId);
    if (!profile) {
      throw new Error('Profile record could not be loaded.');
    }
    if (profile.account_status === 'suspended') {
      throw new Error('This account has been suspended by an administrator.');
    }
    localStorage.setItem(SESSION_KEY, profile.id);
    return profile;
  },

  async register(payload: RegisterPayload): Promise<Profile> {
    const cleanName = payload.fullName.trim();
    const cleanContact = payload.contact.trim();

    if (!cleanName || !cleanContact || !payload.password) {
      throw new Error('Please fill in your name, email or phone number, and password.');
    }
    if (payload.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const usingEmail = isEmailInput(cleanContact);
    const emailValue = usingEmail ? cleanContact.toLowerCase() : '';
    const phoneValue = usingEmail ? '' : normalizePhone(cleanContact);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = usingEmail
        ? await supabase.auth.signUp({
            email: emailValue,
            password: payload.password,
          })
        : await supabase.auth.signUp({
            phone: phoneValue,
            password: payload.password,
          });
      if (error || !data.user) {
        throw new Error(error?.message || 'Registration failed.');
      }
      const userId = data.user.id;
      const newProfile: Omit<Profile, 'created_at'> = {
        id: userId,
        full_name: cleanName,
        email: emailValue,
        phone: phoneValue,
        state: '',
        lga: '',
        community: '',
        bio: '',
        role: payload.role,
        account_status: 'active',
      };
      const { error: profErr } = await supabase.from('profiles').insert(newProfile);
      if (profErr) throw new Error(profErr.message);

      if (payload.role === 'provider') {
        const { error: provErr } = await supabase.from('providers').insert({
          profile_id: userId,
          business_name: `${cleanName} Agro Services`,
          registration_number: '',
          coverage_states: [],
          coverage_lgas: '',
          bio: '',
          years_experience: 1,
          approval_status: 'pending',
        });
        if (provErr) throw new Error(provErr.message);
      }

      const { data: created } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return created as Profile;
    }

    const db = loadLocalDB();
    const duplicate = db.credentials.some(
      (c) =>
        (emailValue && c.email.toLowerCase() === emailValue) ||
        (phoneValue && normalizePhone(c.phone) === phoneValue)
    );
    if (duplicate) {
      throw new Error('An account with this email or phone number already exists.');
    }

    const newProfileId = `prof-${Date.now()}`;
    const newProfile: Profile = {
      id: newProfileId,
      full_name: cleanName,
      email: emailValue,
      phone: phoneValue,
      state: '',
      lga: '',
      community: '',
      bio: '',
      role: payload.role,
      account_status: 'active',
      created_at: new Date().toISOString(),
    };

    db.profiles.push(newProfile);
    db.credentials.push({
      identifier: cleanContact,
      email: emailValue,
      phone: phoneValue,
      password: payload.password,
      profileId: newProfileId,
    });

    if (payload.role === 'provider') {
      db.providers.push({
        id: `prov-${Date.now()}`,
        profile_id: newProfileId,
        business_name: `${cleanName} Agro Services`,
        registration_number: '',
        coverage_states: [],
        coverage_lgas: '',
        bio: '',
        years_experience: 1,
        approval_status: 'pending',
        admin_notes: 'Complete your provider Bio and business details for verification.',
        created_at: new Date().toISOString(),
      });
    }

    saveLocalDB(db);
    localStorage.setItem(SESSION_KEY, newProfile.id);
    return newProfile;
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(SESSION_KEY);
  },

  async fetchSnapshot(viewerProfile: Profile | null): Promise<ServiceSnapshot> {
    if (isSupabaseConfigured && supabase) {
      const [
        { data: profiles },
        { data: providers },
        { data: equipment },
        { data: serviceRequests },
        { data: quotations },
        { data: bookings },
        { data: transactionRecords },
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('providers').select('*').order('created_at', { ascending: false }),
        supabase.from('equipment').select('*').order('created_at', { ascending: false }),
        supabase.from('service_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('quotations').select('*').order('created_at', { ascending: false }),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('transaction_records').select('*').order('recorded_at', { ascending: false }),
      ]);

      return hydrateSnapshot(
        {
          profiles: (profiles ?? []) as Profile[],
          providers: (providers ?? []) as ProviderProfile[],
          equipment: (equipment ?? []) as Equipment[],
          serviceRequests: (serviceRequests ?? []) as ServiceRequest[],
          quotations: (quotations ?? []) as Quotation[],
          bookings: (bookings ?? []) as Booking[],
          transactionRecords: (transactionRecords ?? []) as TransactionRecord[],
        },
        viewerProfile
      );
    }

    const db = loadLocalDB();
    return hydrateSnapshot(
      {
        profiles: db.profiles,
        providers: db.providers,
        equipment: db.equipment,
        serviceRequests: db.serviceRequests,
        quotations: db.quotations,
        bookings: db.bookings,
        transactionRecords: db.transactionRecords,
      },
      viewerProfile
    );
  },

  async updateProfile(
    profileId: string,
    updates: Pick<
      Profile,
      'full_name' | 'email' | 'phone' | 'state' | 'lga' | 'community' | 'bio'
    >
  ): Promise<Profile> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    }

    const db = loadLocalDB();
    const idx = db.profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) throw new Error('Profile not found.');
    db.profiles[idx] = { ...db.profiles[idx], ...updates };
    const credIdx = db.credentials.findIndex((c) => c.profileId === profileId);
    if (credIdx !== -1) {
      if (updates.email) db.credentials[credIdx].email = updates.email.toLowerCase();
      if (updates.phone) db.credentials[credIdx].phone = normalizePhone(updates.phone);
    }
    saveLocalDB(db);
    return db.profiles[idx];
  },

  async updateProviderProfile(
    providerId: string,
    updates: Pick<
      ProviderProfile,
      'business_name' | 'registration_number' | 'coverage_states' | 'coverage_lgas' | 'bio' | 'years_experience'
    >
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('providers').update(updates).eq('id', providerId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDB();
    const idx = db.providers.findIndex((p) => p.id === providerId);
    if (idx === -1) throw new Error('Provider profile not found.');
    db.providers[idx] = { ...db.providers[idx], ...updates };
    saveLocalDB(db);
  },

  async uploadEquipmentImage(file: File): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `equipment/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('equipment-images').upload(path, file);
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('equipment-images').getPublicUrl(path);
      return data.publicUrl;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read selected image file.'));
      reader.readAsDataURL(file);
    });
  },

  async createEquipment(
    providerId: string,
    payload: {
      name: string;
      equipment_type: string;
      services_offered: ServiceType[];
      description: string;
      pricing_method: PricingMethod;
      base_price: number;
      service_locations: string[];
      image_url: string;
      is_available: boolean;
    }
  ): Promise<void> {
    if (!payload.services_offered.length) {
      throw new Error('Select at least one agricultural service offered by this equipment.');
    }
    const category = getCategoryForService(payload.services_offered[0]);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('equipment').insert({
        provider_id: providerId,
        ...payload,
        category,
      });
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDB();
    const provider = db.providers.find((p) => p.id === providerId);
    if (!provider || provider.approval_status !== 'approved') {
      throw new Error('Only admin-approved providers can publish equipment listings.');
    }
    const newEq: Equipment = {
      id: `equip-${Date.now()}`,
      provider_id: providerId,
      category,
      ...payload,
      created_at: new Date().toISOString(),
    };
    db.equipment.unshift(newEq);
    saveLocalDB(db);
  },

  async updateEquipment(
    equipmentId: string,
    providerId: string,
    updates: Partial<
      Pick<
        Equipment,
        | 'name'
        | 'equipment_type'
        | 'services_offered'
        | 'description'
        | 'pricing_method'
        | 'base_price'
        | 'service_locations'
        | 'image_url'
        | 'is_available'
      >
    >
  ): Promise<void> {
    const category = updates.services_offered?.length
      ? getCategoryForService(updates.services_offered[0])
      : undefined;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('equipment')
        .update({ ...updates, ...(category ? { category } : {}) })
        .eq('id', equipmentId)
        .eq('provider_id', providerId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDB();
    const idx = db.equipment.findIndex((e) => e.id === equipmentId && e.provider_id === providerId);
    if (idx === -1) throw new Error('Equipment listing not found or unauthorized.');
    db.equipment[idx] = {
      ...db.equipment[idx],
      ...updates,
      ...(category ? { category } : {}),
    };
    saveLocalDB(db);
  },

  async createServiceRequest(
    farmerId: string,
    payload: {
      service_type: ServiceType;
      farm_location: string;
      state: string;
      lga: string;
      quantity: number;
      unit: string;
      preferred_date: string;
      additional_requirements: string;
      preferred_equipment_id?: string | null;
    }
  ): Promise<void> {
    const reference_code = generateReferenceNumber('REQ');
    const service_category = getCategoryForService(payload.service_type);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('service_requests').insert({
        reference_code,
        farmer_id: farmerId,
        service_category,
        ...payload,
        status: 'Pending',
      });
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDB();
    const farmer = db.profiles.find((p) => p.id === farmerId);
    if (!farmer || farmer.role !== 'farmer' || farmer.account_status !== 'active') {
      throw new Error('Only active farmer accounts can submit service requests.');
    }

    const now = new Date().toISOString();
    db.serviceRequests.unshift({
      id: `req-${Date.now()}`,
      reference_code,
      farmer_id: farmerId,
      service_category,
      ...payload,
      status: 'Pending',
      declined_by_provider_ids: [],
      created_at: now,
      updated_at: now,
    });
    saveLocalDB(db);
  },

  async cancelServiceRequest(requestId: string, farmerId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('farmer_id', farmerId)
        .in('status', ['Pending', 'Quoted']);
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDB();
    const req = db.serviceRequests.find((r) => r.id === requestId && r.farmer_id === farmerId);
    if (!req) throw new Error('Service request not found.');
    if (!['Pending', 'Quoted'].includes(req.status)) {
      throw new Error('Only Pending or Quoted requests can be cancelled.');
    }
    req.status = 'Cancelled';
    req.updated_at = new Date().toISOString();
    db.quotations.forEach((q) => {
      if (q.request_id === requestId && q.status === 'Pending') {
        q.status = 'Withdrawn';
      }
    });
    saveLocalDB(db);
  },

  async declineIncomingRequest(requestId: string, providerId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { data: existing } = await supabase
        .from('service_requests')
        .select('declined_by_provider_ids')
        .eq('id', requestId)
        .single();
      const prev = (existing?.declined_by_provider_ids as string[]) || [];
      if (!prev.includes(providerId)) {
        const { error } = await supabase
          .from('service_requests')
          .update({ declined_by_provider_ids: [...prev, providerId] })
          .eq('id', requestId);
        if (error) throw new Error(error.message);
      }
      return;
    }

    const db = loadLocalDB();
    const req = db.serviceRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found.');
    if (!req.declined_by_provider_ids.includes(providerId)) {
      req.declined_by_provider_ids.push(providerId);
    }
    saveLocalDB(db);
  },

  async submitQuotation(
    providerId: string,
    payload: {
      request_id: string;
      equipment_id: string;
      quoted_amount: number;
      pricing_breakdown: string;
      available_date: string;
      notes: string;
    }
  ): Promise<void> {
    if (payload.quoted_amount <= 0) {
      throw new Error('Quoted amount must be greater than ₦0.');
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('quotations').insert({
        provider_id: providerId,
        ...payload,
        status: 'Pending',
      });
      if (error) throw new Error(error.message);
      await supabase
        .from('service_requests')
        .update({ status: 'Quoted', updated_at: new Date().toISOString() })
        .eq('id', payload.request_id)
        .eq('status', 'Pending');
      return;
    }

    const db = loadLocalDB();
    const provider = db.providers.find((p) => p.id === providerId);
    if (!provider || provider.approval_status !== 'approved') {
      throw new Error('Unapproved providers cannot submit quotations.');
    }
    const req = db.serviceRequests.find((r) => r.id === payload.request_id);
    if (!req || !['Pending', 'Quoted'].includes(req.status)) {
      throw new Error('This service request is no longer open for quotations.');
    }
    const eq = db.equipment.find((e) => e.id === payload.equipment_id && e.provider_id === providerId);
    if (!eq) {
      throw new Error('Select a valid piece of your own equipment.');
    }

    db.quotations.unshift({
      id: `quot-${Date.now()}`,
      provider_id: providerId,
      ...payload,
      status: 'Pending',
      created_at: new Date().toISOString(),
    });
    req.status = 'Quoted';
    req.updated_at = new Date().toISOString();
    saveLocalDB(db);
  },

  async declineQuotation(quotationId: string, farmerId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('quotations')
        .update({ status: 'Declined' })
        .eq('id', quotationId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDB();
    const quot = db.quotations.find((q) => q.id === quotationId);
    if (!quot) throw new Error('Quotation not found.');
    const req = db.serviceRequests.find((r) => r.id === quot.request_id && r.farmer_id === farmerId);
    if (!req) throw new Error('Unauthorized: You can only decline quotations for your own requests.');
    quot.status = 'Declined';
    saveLocalDB(db);
  },

  async acceptQuotation(quotationId: string, farmerId: string): Promise<Booking> {
    const reference_number = generateReferenceNumber('FA');

    if (isSupabaseConfigured && supabase) {
      const { data: quot, error: qErr } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();
      if (qErr || !quot) throw new Error('Quotation not found.');

      const { data: req, error: rErr } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', quot.request_id)
        .eq('farmer_id', farmerId)
        .single();
      if (rErr || !req) throw new Error('Service request not found or unauthorized.');

      await supabase.from('quotations').update({ status: 'Accepted' }).eq('id', quotationId);
      await supabase
        .from('quotations')
        .update({ status: 'Declined' })
        .eq('request_id', req.id)
        .neq('id', quotationId);
      await supabase
        .from('service_requests')
        .update({ status: 'Confirmed', updated_at: new Date().toISOString() })
        .eq('id', req.id);

      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .insert({
          reference_number,
          request_id: req.id,
          quotation_id: quot.id,
          farmer_id: farmerId,
          provider_id: quot.provider_id,
          equipment_id: quot.equipment_id,
          service_type: req.service_type,
          service_category: req.service_category,
          farm_location: req.farm_location,
          state: req.state,
          lga: req.lga,
          quantity: req.quantity,
          unit: req.unit,
          scheduled_date: quot.available_date,
          agreed_amount: quot.quoted_amount,
          status: 'Confirmed',
          notes: quot.notes || '',
        })
        .select('*')
        .single();
      if (bErr || !booking) throw new Error(bErr?.message || 'Booking creation failed.');

      const { data: farmerProf } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', farmerId)
        .single();
      const { data: provProf } = await supabase
        .from('providers')
        .select('business_name')
        .eq('id', quot.provider_id)
        .single();

      await supabase.from('transaction_records').insert({
        booking_id: booking.id,
        reference_number,
        farmer_name: farmerProf?.full_name || 'Farmer',
        provider_name: provProf?.business_name || 'Provider',
        service_type: req.service_type,
        agreed_amount: quot.quoted_amount,
        payment_status: 'Pending Settlement',
        notes: 'Agreed quotation recorded on booking confirmation.',
      });

      return booking as Booking;
    }

    const db = loadLocalDB();
    const quot = db.quotations.find((q) => q.id === quotationId);
    if (!quot || quot.status !== 'Pending') {
      throw new Error('This quotation is no longer available to accept.');
    }
    const req = db.serviceRequests.find((r) => r.id === quot.request_id);
    if (!req || req.farmer_id !== farmerId) {
      throw new Error('Unauthorized: You may only accept valid quotations on your own requests.');
    }
    if (!['Pending', 'Quoted'].includes(req.status)) {
      throw new Error('This service request already has an accepted booking or is closed.');
    }
    const provider = db.providers.find((p) => p.id === quot.provider_id);
    if (!provider || provider.approval_status !== 'approved') {
      throw new Error('Unapproved providers cannot receive confirmed bookings.');
    }

    const farmer = db.profiles.find((p) => p.id === farmerId);
    const now = new Date().toISOString();

    quot.status = 'Accepted';
    db.quotations.forEach((other) => {
      if (other.request_id === req.id && other.id !== quot.id && other.status === 'Pending') {
        other.status = 'Declined';
      }
    });

    req.status = 'Confirmed';
    req.updated_at = now;

    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      reference_number,
      request_id: req.id,
      quotation_id: quot.id,
      farmer_id: farmerId,
      provider_id: quot.provider_id,
      equipment_id: quot.equipment_id,
      service_type: req.service_type,
      service_category: req.service_category,
      farm_location: req.farm_location,
      state: req.state,
      lga: req.lga,
      quantity: req.quantity,
      unit: req.unit,
      scheduled_date: quot.available_date,
      agreed_amount: quot.quoted_amount,
      status: 'Confirmed',
      provider_completed_at: null,
      farmer_confirmed_at: null,
      notes: quot.notes || '',
      created_at: now,
      updated_at: now,
    };
    db.bookings.unshift(newBooking);

    db.transactionRecords.unshift({
      id: `txn-${Date.now()}`,
      booking_id: newBooking.id,
      reference_number,
      farmer_name: farmer?.full_name || 'Farmer',
      provider_name: provider.business_name,
      service_type: req.service_type,
      agreed_amount: quot.quoted_amount,
      payment_status: 'Pending Settlement',
      recorded_at: now,
      notes: 'Agreed booking value recorded upon quotation acceptance.',
    });

    saveLocalDB(db);
    return newBooking;
  },

  async updateBookingStatusByProvider(
    bookingId: string,
    providerId: string,
    nextStatus: Extract<BookingStatus, 'In Progress' | 'Completed' | 'Cancelled'>
  ): Promise<void> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const updates: Record<string, unknown> = {
        status: nextStatus,
        updated_at: now,
      };
      if (nextStatus === 'Completed') {
        updates.provider_completed_at = now;
      }
      const { data: booking, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .eq('provider_id', providerId)
        .select('request_id')
        .single();
      if (error) throw new Error(error.message);

      if (booking) {
        await supabase
          .from('service_requests')
          .update({ status: nextStatus, updated_at: now })
          .eq('id', booking.request_id);
      }
      if (nextStatus === 'Cancelled') {
        await supabase
          .from('transaction_records')
          .update({ payment_status: 'Cancelled' })
          .eq('booking_id', bookingId);
      }
      return;
    }

    const db = loadLocalDB();
    const booking = db.bookings.find((b) => b.id === bookingId && b.provider_id === providerId);
    if (!booking) throw new Error('Booking not found or unauthorized.');

    booking.status = nextStatus;
    booking.updated_at = now;
    if (nextStatus === 'Completed') {
      booking.provider_completed_at = now;
    }

    const req = db.serviceRequests.find((r) => r.id === booking.request_id);
    if (req) {
      req.status = nextStatus;
      req.updated_at = now;
    }

    if (nextStatus === 'Cancelled') {
      const txn = db.transactionRecords.find((t) => t.booking_id === bookingId);
      if (txn) {
        txn.payment_status = 'Cancelled';
        txn.notes = 'Booking cancelled prior to completion.';
      }
    }

    saveLocalDB(db);
  },

  async confirmBookingCompletionByFarmer(bookingId: string, farmerId: string): Promise<void> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('bookings')
        .update({ farmer_confirmed_at: now, status: 'Completed', updated_at: now })
        .eq('id', bookingId)
        .eq('farmer_id', farmerId);
      if (error) throw new Error(error.message);

      await supabase
        .from('transaction_records')
        .update({
          payment_status: 'Recorded on Delivery',
          notes: 'Farmer confirmed completed service delivery.',
        })
        .eq('booking_id', bookingId);
      return;
    }

    const db = loadLocalDB();
    const booking = db.bookings.find((b) => b.id === bookingId && b.farmer_id === farmerId);
    if (!booking) throw new Error('Booking not found.');
    if (booking.status !== 'Completed') {
      throw new Error('The service provider must mark the job as Completed first.');
    }

    booking.farmer_confirmed_at = now;
    booking.updated_at = now;

    const txn = db.transactionRecords.find((t) => t.booking_id === bookingId);
    if (txn) {
      txn.payment_status = 'Recorded on Delivery';
      txn.notes = 'Farmer confirmed service completion; agreed amount recorded.';
    }

    saveLocalDB(db);
  },

  async adminReviewProvider(
    providerId: string,
    approvalStatus: ProviderApprovalStatus,
    adminNotes: string
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('providers')
        .update({ approval_status: approvalStatus, admin_notes: adminNotes })
        .eq('id', providerId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDB();
    const prov = db.providers.find((p) => p.id === providerId);
    if (!prov) throw new Error('Provider record not found.');
    prov.approval_status = approvalStatus;
    prov.admin_notes = adminNotes;
    saveLocalDB(db);
  },

  async adminSetAccountStatus(
    profileId: string,
    accountStatus: AccountStatus,
    actingAdminId: string
  ): Promise<void> {
    if (profileId === actingAdminId) {
      throw new Error('You cannot suspend your own administrator account.');
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: accountStatus })
        .eq('id', profileId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDB();
    const profile = db.profiles.find((p) => p.id === profileId);
    if (!profile) throw new Error('Account not found.');
    profile.account_status = accountStatus;
    saveLocalDB(db);
  },

  async adminUpdateTransactionStatus(
    txnId: string,
    paymentStatus: TransactionPaymentStatus,
    notes: string
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('transaction_records')
        .update({ payment_status: paymentStatus, notes })
        .eq('id', txnId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDB();
    const txn = db.transactionRecords.find((t) => t.id === txnId);
    if (!txn) throw new Error('Transaction record not found.');
    txn.payment_status = paymentStatus;
    txn.notes = notes;
    saveLocalDB(db);
  },
};
