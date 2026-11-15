import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Edit3,
  LayoutDashboard,
  Plus,
  Tractor,
  Upload,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { EQUIPMENT_IMAGE_MAP } from '../../data/seedData';
import {
  ALL_SERVICE_TYPES,
  formatDateShort,
  formatNaira,
  formatPricingMethod,
  NIGERIAN_STATES,
} from '../../lib/formatters';
import { farmAccessService } from '../../services/farmAccessService';
import type {
  Booking,
  BookingStatus,
  Equipment,
  PricingMethod,
  Profile,
  ProviderProfile,
  Quotation,
  ServiceRequest,
  ServiceType,
} from '../../types/farmaccess';
import { DashboardShell, type NavTabItem } from '../layout/DashboardShell';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ResilientImage } from '../ui/ResilientImage';
import {
  BookingStatusBadge,
  ProviderApprovalBadge,
  QuotationStatusBadge,
} from '../ui/StatusIndicator';

interface ProviderDashboardProps {
  profile: Profile;
  providerProfile: ProviderProfile | undefined;
  equipment: Equipment[];
  serviceRequests: ServiceRequest[];
  quotations: Quotation[];
  bookings: Booking[];
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  onProfileUpdated: (updated: Profile) => void;
  onGoHome: () => void;
  onLogout: () => void;
}

type ProviderConfirmAction =
  | { kind: 'decline_request'; request: ServiceRequest }
  | {
      kind: 'update_job';
      booking: Booking;
      nextStatus: Extract<BookingStatus, 'In Progress' | 'Completed' | 'Cancelled'>;
    }
  | null;

export function ProviderDashboard({
  profile,
  providerProfile,
  equipment,
  serviceRequests,
  quotations,
  bookings,
  onRefresh,
  onNotify,
  onProfileUpdated,
  onGoHome,
  onLogout,
}: ProviderDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const isApproved = providerProfile?.approval_status === 'approved';

  const myEquipment = useMemo(
    () =>
      providerProfile
        ? equipment.filter((e) => e.provider_id === providerProfile.id)
        : [],
    [equipment, providerProfile]
  );

  const availableEquipment = useMemo(
    () => myEquipment.filter((e) => e.is_available),
    [myEquipment]
  );

  const myQuotations = useMemo(
    () =>
      providerProfile
        ? quotations.filter((q) => q.provider_id === providerProfile.id)
        : [],
    [quotations, providerProfile]
  );

  const myBookings = useMemo(
    () =>
      providerProfile
        ? bookings.filter((b) => b.provider_id === providerProfile.id)
        : [],
    [bookings, providerProfile]
  );

  const incomingRequests = useMemo(() => {
    if (!providerProfile) return [];
    const myServices = new Set(myEquipment.flatMap((e) => e.services_offered));
    const myStates = new Set(providerProfile.coverage_states);
    return serviceRequests.filter((req) => {
      if (!['Pending', 'Quoted'].includes(req.status)) return false;
      if (req.declined_by_provider_ids.includes(providerProfile.id)) return false;
      const matchesState = myStates.size === 0 || myStates.has(req.state);
      const matchesService =
        myServices.size === 0 || myServices.has(req.service_type);
      return matchesState || matchesService;
    });
  }, [providerProfile, myEquipment, serviceRequests]);

  const pendingQuotationsCount = useMemo(
    () => myQuotations.filter((q) => q.status === 'Pending').length,
    [myQuotations]
  );

  const confirmedJobsCount = useMemo(
    () =>
      myBookings.filter((b) => ['Confirmed', 'In Progress'].includes(b.status))
        .length,
    [myBookings]
  );

  const completedJobs = useMemo(
    () => myBookings.filter((b) => b.status === 'Completed'),
    [myBookings]
  );

  const estimatedCompletedEarnings = useMemo(
    () => completedJobs.reduce((sum, job) => sum + Number(job.agreed_amount || 0), 0),
    [completedJobs]
  );

  // Equipment Modal / Form state
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [eqName, setEqName] = useState('');
  const [eqType, setEqType] = useState('');
  const [eqServices, setEqServices] = useState<ServiceType[]>(['Ploughing']);
  const [eqDescription, setEqDescription] = useState('');
  const [eqPricingMethod, setEqPricingMethod] = useState<PricingMethod>('per_hectare');
  const [eqBasePrice, setEqBasePrice] = useState('35000');
  const [eqLocations, setEqLocations] = useState<string[]>(
    providerProfile?.coverage_states.length ? providerProfile.coverage_states : ['Kaduna']
  );
  const [eqImageUrl, setEqImageUrl] = useState(EQUIPMENT_IMAGE_MAP.tractorPlough);
  const [eqAvailable, setEqAvailable] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingEquipment, setSavingEquipment] = useState(false);

  // Quotation Modal state
  const [quotingRequest, setQuotingRequest] = useState<ServiceRequest | null>(null);
  const [quoteEquipId, setQuoteEquipId] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteBreakdown, setQuoteBreakdown] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Profile forms
  const [ownerName, setOwnerName] = useState(profile.full_name);
  const [ownerEmail, setOwnerEmail] = useState(profile.email);
  const [ownerPhone, setOwnerPhone] = useState(profile.phone);
  const [ownerState, setOwnerState] = useState(profile.state || 'Kaduna');
  const [ownerLga, setOwnerLga] = useState(profile.lga);
  const [ownerCommunity, setOwnerCommunity] = useState(profile.community);

  const [bizName, setBizName] = useState(providerProfile?.business_name || '');
  const [bizReg, setBizReg] = useState(providerProfile?.registration_number || '');
  const [bizStates, setBizStates] = useState<string[]>(
    providerProfile?.coverage_states.length ? providerProfile.coverage_states : ['Kaduna']
  );
  const [bizLgas, setBizLgas] = useState(providerProfile?.coverage_lgas || '');
  const [bizYears, setBizYears] = useState(String(providerProfile?.years_experience ?? 1));
  const [bizBio, setBizBio] = useState(providerProfile?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Confirm Dialog
  const [confirmAction, setConfirmAction] = useState<ProviderConfirmAction>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const tabs: NavTabItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'requests',
      label: 'Incoming Requests',
      icon: ClipboardList,
      badgeCount: incomingRequests.length,
    },
    {
      id: 'jobs',
      label: 'Jobs & Bookings',
      icon: Briefcase,
      badgeCount: confirmedJobsCount,
    },
    { id: 'equipment', label: 'My Equipment', icon: Tractor },
    { id: 'profile', label: 'Provider Profile', icon: User },
  ];

  const openNewEquipmentForm = () => {
    setEditingEquipmentId(null);
    setEqName('');
    setEqType('');
    setEqServices(['Ploughing']);
    setEqDescription('');
    setEqPricingMethod('per_hectare');
    setEqBasePrice('35000');
    setEqLocations(
      providerProfile?.coverage_states.length
        ? providerProfile.coverage_states
        : [profile.state]
    );
    setEqImageUrl(EQUIPMENT_IMAGE_MAP.tractorPlough);
    setEqAvailable(true);
    setShowEquipmentForm(true);
  };

  const openEditEquipmentForm = (eq: Equipment) => {
    setEditingEquipmentId(eq.id);
    setEqName(eq.name);
    setEqType(eq.equipment_type);
    setEqServices(eq.services_offered);
    setEqDescription(eq.description);
    setEqPricingMethod(eq.pricing_method);
    setEqBasePrice(String(eq.base_price));
    setEqLocations(eq.service_locations);
    setEqImageUrl(eq.image_url);
    setEqAvailable(eq.is_available);
    setShowEquipmentForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onNotify('error', 'Invalid file type', 'Please select a JPG, PNG, or WebP image.');
      return;
    }
    setUploadingImage(true);
    try {
      const url = await farmAccessService.uploadEquipmentImage(file);
      setEqImageUrl(url);
      onNotify('success', 'Equipment image uploaded');
    } catch (err) {
      onNotify('error', 'Upload failed', err instanceof Error ? err.message : 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerProfile) return;
    const price = Number(eqBasePrice);
    if (!eqName.trim() || !eqType.trim() || !eqServices.length || !eqLocations.length) {
      onNotify('error', 'Incomplete equipment form', 'Enter name, type, services offered, and coverage states.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      onNotify('error', 'Invalid price', 'Base price in Naira must be greater than ₦0.');
      return;
    }

    setSavingEquipment(true);
    try {
      if (editingEquipmentId) {
        await farmAccessService.updateEquipment(editingEquipmentId, providerProfile.id, {
          name: eqName.trim(),
          equipment_type: eqType.trim(),
          services_offered: eqServices,
          description: eqDescription.trim(),
          pricing_method: eqPricingMethod,
          base_price: price,
          service_locations: eqLocations,
          image_url: eqImageUrl,
          is_available: eqAvailable,
        });
        onNotify('success', 'Equipment updated');
      } else {
        await farmAccessService.createEquipment(providerProfile.id, {
          name: eqName.trim(),
          equipment_type: eqType.trim(),
          services_offered: eqServices,
          description: eqDescription.trim(),
          pricing_method: eqPricingMethod,
          base_price: price,
          service_locations: eqLocations,
          image_url: eqImageUrl,
          is_available: eqAvailable,
        });
        onNotify('success', 'Equipment listing published');
      }
      await onRefresh();
      setShowEquipmentForm(false);
    } catch (err) {
      onNotify('error', 'Save failed', err instanceof Error ? err.message : 'Could not save equipment.');
    } finally {
      setSavingEquipment(false);
    }
  };

  const toggleEquipmentAvailability = async (eq: Equipment) => {
    if (!providerProfile) return;
    try {
      await farmAccessService.updateEquipment(eq.id, providerProfile.id, {
        is_available: !eq.is_available,
      });
      await onRefresh();
      onNotify(
        'info',
        `${eq.name} marked ${!eq.is_available ? 'Available' : 'Unavailable'}`
      );
    } catch (err) {
      onNotify('error', 'Update failed', err instanceof Error ? err.message : 'Unable to toggle status.');
    }
  };

  const openQuotationModal = (req: ServiceRequest) => {
    const defaultEq =
      myEquipment.find(
        (e) => e.is_available && e.services_offered.includes(req.service_type)
      ) || availableEquipment[0];
    setQuotingRequest(req);
    setQuoteEquipId(defaultEq?.id || '');
    const estimated = defaultEq ? defaultEq.base_price * req.quantity : 35000 * req.quantity;
    setQuoteAmount(String(Math.round(estimated)));
    setQuoteBreakdown(
      defaultEq
        ? `${req.quantity} ${req.unit} × ${formatNaira(defaultEq.base_price)} (${formatPricingMethod(defaultEq.pricing_method)})`
        : `${req.quantity} ${req.unit} service delivery`
    );
    setQuoteDate(req.preferred_date);
    setQuoteNotes('');
  };

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerProfile || !quotingRequest) return;
    const amount = Number(quoteAmount);
    if (!quoteEquipId) {
      onNotify('error', 'Select equipment', 'You must select one of your registered equipment units.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0 || !quoteDate) {
      onNotify('error', 'Invalid quotation', 'Enter a valid Naira amount and available date.');
      return;
    }

    setSubmittingQuote(true);
    try {
      await farmAccessService.submitQuotation(providerProfile.id, {
        request_id: quotingRequest.id,
        equipment_id: quoteEquipId,
        quoted_amount: amount,
        pricing_breakdown: quoteBreakdown.trim() || `Total for ${quotingRequest.quantity} ${quotingRequest.unit}`,
        available_date: quoteDate,
        notes: quoteNotes.trim(),
      });
      await onRefresh();
      setQuotingRequest(null);
      onNotify(
        'success',
        'Quotation sent to farmer',
        `Submitted offer of ${formatNaira(amount)} for ${quotingRequest.reference_code}.`
      );
    } catch (err) {
      onNotify('error', 'Quotation failed', err instanceof Error ? err.message : 'Unable to submit quotation.');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmAction || !providerProfile) return;
    setConfirmBusy(true);
    try {
      if (confirmAction.kind === 'decline_request') {
        await farmAccessService.declineIncomingRequest(
          confirmAction.request.id,
          providerProfile.id
        );
        await onRefresh();
        onNotify('info', `Declined request ${confirmAction.request.reference_code}`);
      } else if (confirmAction.kind === 'update_job') {
        await farmAccessService.updateBookingStatusByProvider(
          confirmAction.booking.id,
          providerProfile.id,
          confirmAction.nextStatus
        );
        await onRefresh();
        onNotify(
          'success',
          `Booking ${confirmAction.booking.reference_number} updated to ${confirmAction.nextStatus}`
        );
      }
      setConfirmAction(null);
    } catch (err) {
      onNotify('error', 'Update failed', err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleSaveProviderProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerProfile || !ownerName.trim() || !bizName.trim()) {
      onNotify('error', 'Required fields missing', 'Contact name and business name are required.');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await farmAccessService.updateProfile(profile.id, {
        full_name: ownerName.trim(),
        email: ownerEmail.trim().toLowerCase(),
        phone: ownerPhone.trim(),
        state: ownerState,
        lga: ownerLga.trim(),
        community: ownerCommunity.trim(),
        bio: bizBio.trim(),
      });
      await farmAccessService.updateProviderProfile(providerProfile.id, {
        business_name: bizName.trim(),
        registration_number: bizReg.trim(),
        coverage_states: bizStates.length ? bizStates : [ownerState],
        coverage_lgas: bizLgas.trim(),
        years_experience: Number(bizYears) || 1,
        bio: bizBio.trim(),
      });
      onProfileUpdated(updated);
      await onRefresh();
      onNotify('success', 'Provider Bio and profile saved');
    } catch (err) {
      onNotify('error', 'Save failed', err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const needsBioUpdate = !providerProfile?.bio.trim() || !profile.state.trim();

  return (
    <DashboardShell
      profile={profile}
      portalTitle={providerProfile?.business_name || 'Provider Account'}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onGoHome={onGoHome}
      onLogout={onLogout}
      primaryAction={
        isApproved ? (
          <button
            type="button"
            onClick={() => {
              setActiveTab('equipment');
              openNewEquipmentForm();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Equipment</span>
          </button>
        ) : undefined
      }
    >
      {/* Approval Gate Notice */}
      {providerProfile && providerProfile.approval_status !== 'approved' && (
        <div
          className={`mb-6 p-5 rounded-xl border flex items-start gap-3 ${
            providerProfile.approval_status === 'rejected'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">
                {providerProfile.approval_status === 'rejected'
                  ? 'Provider Application Rejected'
                  : 'Provider Account Pending Administrator Approval'}
              </span>
              <ProviderApprovalBadge status={providerProfile.approval_status} />
            </div>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              Unapproved providers cannot publish equipment listings, send quotations, or receive confirmed bookings. Keep your business details updated under Provider Profile while an administrator completes verification.
            </p>
            {providerProfile.admin_notes && (
              <p className="mt-1.5 text-xs font-medium">
                Admin note: {providerProfile.admin_notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {needsBioUpdate && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#14532D]">
                  Complete your Provider Bio &amp; Business Details
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  Add your business Bio, coverage states, and registration details so administrators can review and approve your provider account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                Update Bio &amp; Profile
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Registered Equipment</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {myEquipment.length}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                <span className="font-mono tabular-nums">{availableEquipment.length}</span> currently available
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Incoming Requests</p>
              <p className="mt-2 font-display text-3xl font-bold text-[#B45309] font-mono tabular-nums">
                {incomingRequests.length}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                <span className="font-mono tabular-nums">{pendingQuotationsCount}</span> pending quotations sent
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Confirmed / Active Jobs</p>
              <p className="mt-2 font-display text-3xl font-bold text-[#14532D] font-mono tabular-nums">
                {confirmedJobsCount}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                <span className="font-mono tabular-nums">{completedJobs.length}</span> completed jobs
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">
                Estimated Completed Earnings
              </p>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#14532D] font-mono tabular-nums">
                {formatNaira(estimatedCompletedEarnings)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Agreed value of completed jobs
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-bold text-slate-900">
                Recent Assigned Bookings
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className="text-xs font-semibold text-[#14532D] hover:underline"
              >
                Manage all jobs
              </button>
            </div>

            {myBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-600">
                No confirmed jobs assigned yet. Review incoming service requests and submit quotations to farmers.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F8FAF8] text-xs font-medium text-slate-500">
                      <th className="py-3 px-6">Booking Ref</th>
                      <th className="py-3 px-4">Service &amp; Farmer</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Scheduled Date</th>
                      <th className="py-3 px-4">Agreed Fee</th>
                      <th className="py-3 px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {myBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-900">
                          {b.reference_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{b.service_type}</p>
                          <p className="text-xs text-slate-500">{b.farmer_name}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {b.lga}, {b.state}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {formatDateShort(b.scheduled_date)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {formatNaira(b.agreed_amount)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <BookingStatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INCOMING REQUESTS & QUOTATIONS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Open Service Requests ({incomingRequests.length})
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Farmer contact details remain private until a quotation is accepted and a booking is confirmed.
                </p>
              </div>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
                No open service requests matching your coverage areas right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {incomingRequests.map((req) => {
                  const alreadyQuoted = myQuotations.find(
                    (q) => q.request_id === req.id
                  );

                  return (
                    <div
                      key={req.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {req.reference_code} · {req.service_category}
                          </span>
                          <BookingStatusBadge status={req.status} />
                        </div>

                        <h3 className="mt-2 font-display text-lg font-bold text-slate-900">
                          {req.service_type} —{' '}
                          <span className="font-mono tabular-nums">
                            {req.quantity}
                          </span>{' '}
                          {req.unit}
                        </h3>

                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          <p>
                            <span className="text-slate-500">Location:</span>{' '}
                            {req.farm_location} ({req.lga}, {req.state})
                          </p>
                          <p>
                            <span className="text-slate-500">Preferred Date:</span>{' '}
                            {formatDateShort(req.preferred_date)}
                          </p>
                          <p>
                            <span className="text-slate-500">Requester:</span>{' '}
                            {req.farmer_name}
                          </p>
                          {req.preferred_equipment_name && (
                            <p className="text-[#166534] font-medium">
                              Requested equipment: {req.preferred_equipment_name}
                            </p>
                          )}
                          {req.additional_requirements && (
                            <p className="pt-1 text-slate-700">
                              Notes: {req.additional_requirements}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                        {alreadyQuoted ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-medium text-[#14532D]">
                              Quotation sent: {formatNaira(alreadyQuoted.quoted_amount)}
                            </span>
                            <QuotationStatusBadge status={alreadyQuoted.status} />
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={!isApproved || availableEquipment.length === 0}
                              onClick={() => openQuotationModal(req)}
                              className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {!isApproved
                                ? 'Approval Required to Quote'
                                : availableEquipment.length === 0
                                ? 'Add Available Equipment First'
                                : 'Submit Quotation'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAction({
                                  kind: 'decline_request',
                                  request: req,
                                })
                              }
                              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Submitted Quotations History */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                My Submitted Quotations ({myQuotations.length})
              </h2>
            </div>
            {myQuotations.length === 0 ? (
              <p className="p-6 text-xs text-slate-500">
                You have not submitted any quotations yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F8FAF8] text-xs font-medium text-slate-500">
                      <th className="py-3 px-6">Equipment</th>
                      <th className="py-3 px-4">Breakdown</th>
                      <th className="py-3 px-4">Available Date</th>
                      <th className="py-3 px-4">Quoted Amount</th>
                      <th className="py-3 px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {myQuotations.map((q) => (
                      <tr key={q.id}>
                        <td className="py-3.5 px-6 font-medium text-slate-900">
                          {q.equipment_name}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {q.pricing_breakdown}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {formatDateShort(q.available_date)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatNaira(q.quoted_amount)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <QuotationStatusBadge status={q.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* JOBS & BOOKINGS TAB */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {myBookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No confirmed jobs yet
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Once a farmer accepts one of your quotations, the confirmed booking appears here for dispatch and status updates.
              </p>
            </div>
          ) : (
            myBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-xl p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold text-[#14532D]">
                        {b.reference_number}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Scheduled {formatDateShort(b.scheduled_date)}</span>
                    </div>
                    <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
                      {b.service_type} — {b.quantity} {b.unit}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Farmer: <span className="font-medium text-slate-800">{b.farmer_name}</span>
                      {b.farmer_phone ? ` · ${b.farmer_phone}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                      {formatNaira(b.agreed_amount)}
                    </span>
                    <BookingStatusBadge status={b.status} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
                  <div>
                    <p className="text-slate-500">Farm Location</p>
                    <p className="mt-0.5 font-medium">
                      {b.farm_location} ({b.lga}, {b.state})
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Assigned Equipment</p>
                    <p className="mt-0.5 font-medium">{b.equipment_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Farmer Confirmation</p>
                    <p className="mt-0.5 font-medium">
                      {b.farmer_confirmed_at
                        ? `Confirmed ${formatDateShort(b.farmer_confirmed_at)}`
                        : b.status === 'Completed'
                        ? 'Awaiting farmer sign-off'
                        : 'Pending job completion'}
                    </p>
                  </div>
                </div>

                {/* Action buttons for Confirmed / In Progress */}
                {(b.status === 'Confirmed' || b.status === 'In Progress') && (
                  <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
                    {b.status === 'Confirmed' && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({
                            kind: 'update_job',
                            booking: b,
                            nextStatus: 'In Progress',
                          })
                        }
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534]"
                      >
                        Start Job (In Progress)
                      </button>
                    )}
                    {b.status === 'In Progress' && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({
                            kind: 'update_job',
                            booking: b,
                            nextStatus: 'Completed',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534]"
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>Mark Job Completed</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAction({
                          kind: 'update_job',
                          booking: b,
                          nextStatus: 'Cancelled',
                        })
                      }
                      className="px-3.5 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MY EQUIPMENT TAB */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Registered Machinery &amp; Implements ({myEquipment.length})
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Keep availability toggles and Naira rates accurate so farmers receive reliable matches.
              </p>
            </div>
            {isApproved && !showEquipmentForm && (
              <button
                type="button"
                onClick={openNewEquipmentForm}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] self-start"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Register Equipment</span>
              </button>
            )}
          </div>

          {showEquipmentForm && (
            <form
              onSubmit={handleSaveEquipment}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h3 className="font-display text-base font-bold text-slate-900">
                  {editingEquipmentId ? 'Edit Equipment Listing' : 'Register New Equipment'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEquipmentForm(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Equipment Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eqName}
                    onChange={(e) => setEqName(e.target.value)}
                    placeholder="e.g. John Deere 5075E + 3-Disc Plough"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Equipment Type <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eqType}
                    onChange={(e) => setEqType(e.target.value)}
                    placeholder="e.g. 75HP 4WD Utility Tractor"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                  />
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700 mb-1.5">
                  Services Offered <span className="text-rose-600">*</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {ALL_SERVICE_TYPES.map((svc) => {
                    const active = eqServices.includes(svc);
                    return (
                      <button
                        key={svc}
                        type="button"
                        onClick={() =>
                          setEqServices((prev) =>
                            prev.includes(svc)
                              ? prev.filter((item) => item !== svc)
                              : [...prev, svc]
                          )
                        }
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          active
                            ? 'bg-[#14532D] text-white border-[#14532D]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {svc}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Pricing Method
                  </label>
                  <select
                    value={eqPricingMethod}
                    onChange={(e) => setEqPricingMethod(e.target.value as PricingMethod)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                  >
                    <option value="per_hectare">Per Hectare</option>
                    <option value="per_hour">Per Hour</option>
                    <option value="per_bag">Per Bag</option>
                    <option value="per_day">Per Day</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Base Price (₦) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    required
                    value={eqBasePrice}
                    onChange={(e) => setEqBasePrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eqAvailable}
                      onChange={(e) => setEqAvailable(e.target.checked)}
                      className="rounded border-slate-300 text-[#14532D] focus:ring-[#14532D]"
                    />
                    <span>Available for booking</span>
                  </label>
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700 mb-1.5">
                  Service Locations (States)
                </span>
                <div className="flex flex-wrap gap-2">
                  {NIGERIAN_STATES.slice(0, 12).map((st) => {
                    const active = eqLocations.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          setEqLocations((prev) =>
                            prev.includes(st)
                              ? prev.filter((item) => item !== st)
                              : [...prev, st]
                          )
                        }
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
                          active
                            ? 'bg-[#14532D] text-white border-[#14532D]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Equipment Image Upload
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-32 h-24 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                    <ResilientImage
                      src={eqImageUrl}
                      alt="Equipment preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="text-xs text-slate-500">
                      Or select a machinery photo preset:{' '}
                      <button
                        type="button"
                        onClick={() => setEqImageUrl(EQUIPMENT_IMAGE_MAP.tractorPlough)}
                        className="text-[#14532D] underline mr-2"
                      >
                        Tractor
                      </button>
                      <button
                        type="button"
                        onClick={() => setEqImageUrl(EQUIPMENT_IMAGE_MAP.harrowRidger)}
                        className="text-[#14532D] underline mr-2"
                      >
                        Harrow
                      </button>
                      <button
                        type="button"
                        onClick={() => setEqImageUrl(EQUIPMENT_IMAGE_MAP.maizeSheller)}
                        className="text-[#14532D] underline mr-2"
                      >
                        Sheller
                      </button>
                      <button
                        type="button"
                        onClick={() => setEqImageUrl(EQUIPMENT_IMAGE_MAP.riceThresher)}
                        className="text-[#14532D] underline"
                      >
                        Thresher
                      </button>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description &amp; Specifications
                </label>
                <textarea
                  rows={3}
                  value={eqDescription}
                  onChange={(e) => setEqDescription(e.target.value)}
                  placeholder="Describe capacity, soil suitability, and whether operator and fuel are included."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEquipmentForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEquipment}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] disabled:opacity-60"
                >
                  {savingEquipment
                    ? 'Saving...'
                    : editingEquipmentId
                    ? 'Save Changes'
                    : 'Publish Equipment'}
                </button>
              </div>
            </form>
          )}

          {myEquipment.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No equipment registered yet
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {isApproved
                  ? 'Register your tractors, implements, shellers, or threshers to start receiving requests.'
                  : 'Once an administrator approves your provider registration, you can list your equipment here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myEquipment.map((eq) => (
                <article
                  key={eq.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] bg-slate-100 border-b border-slate-200 overflow-hidden">
                    <ResilientImage
                      src={eq.image_url}
                      alt={eq.name}
                      className="w-full h-full object-cover"
                      fallbackTitle={eq.name}
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500">{eq.category}</span>
                        <span
                          className={`font-medium ${
                            eq.is_available ? 'text-[#16A34A]' : 'text-slate-500'
                          }`}
                        >
                          {eq.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base font-bold text-slate-900">
                        {eq.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {eq.services_offered.join(', ')}
                      </p>
                      <p className="mt-2 font-mono text-sm font-bold text-[#14532D] tabular-nums">
                        {formatNaira(eq.base_price)}{' '}
                        <span className="font-sans font-normal text-xs text-slate-500">
                          {formatPricingMethod(eq.pricing_method)}
                        </span>
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleEquipmentAvailability(eq)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        {eq.is_available ? 'Set Unavailable' : 'Set Available'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditEquipmentForm(eq)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#14532D] bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROVIDER PROFILE TAB */}
      {activeTab === 'profile' && providerProfile && (
        <div className="max-w-3xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Provider &amp; Business Profile
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Verification status and operating coverage across Nigeria
              </p>
            </div>
            <ProviderApprovalBadge status={providerProfile.approval_status} />
          </div>

          <form onSubmit={handleSaveProviderProfile} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Operator / Owner Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="provider@example.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Business / Cooperative Name
                </label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={bizReg}
                  onChange={(e) => setBizReg(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Base State
                </label>
                <select
                  value={ownerState}
                  onChange={(e) => setOwnerState(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Base LGA
                </label>
                <input
                  type="text"
                  value={ownerLga}
                  onChange={(e) => setOwnerLga(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Years Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={bizYears}
                  onChange={(e) => setBizYears(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1.5">
                Coverage States
              </span>
              <div className="flex flex-wrap gap-2">
                {NIGERIAN_STATES.slice(0, 12).map((st) => {
                  const active = bizStates.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setBizStates((prev) =>
                          prev.includes(st)
                            ? prev.filter((item) => item !== st)
                            : [...prev, st]
                        )
                      }
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
                        active
                          ? 'bg-[#14532D] text-white border-[#14532D]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Coverage LGAs
              </label>
              <input
                type="text"
                value={bizLgas}
                onChange={(e) => setBizLgas(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Depot / Yard Address
              </label>
              <input
                type="text"
                value={ownerCommunity}
                onChange={(e) => setOwnerCommunity(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Business Bio
              </label>
              <textarea
                rows={3}
                value={bizBio}
                onChange={(e) => setBizBio(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Provider Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quotation Modal */}
      {quotingRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl p-6">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Submit Quotation for {quotingRequest.reference_code}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {quotingRequest.service_type} · {quotingRequest.quantity}{' '}
              {quotingRequest.unit} · {quotingRequest.lga}, {quotingRequest.state}
            </p>

            <form onSubmit={handleSubmitQuotation} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Assigned Equipment <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={quoteEquipId}
                  onChange={(e) => setQuoteEquipId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({formatNaira(eq.base_price)}{' '}
                      {formatPricingMethod(eq.pricing_method)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Quoted Amount (₦) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="500"
                    required
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Available Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pricing Breakdown
                </label>
                <input
                  type="text"
                  required
                  value={quoteBreakdown}
                  onChange={(e) => setQuoteBreakdown(e.target.value)}
                  placeholder="e.g. 3 ha × ₦35,000/ha including diesel & operator"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dispatch Notes
                </label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Share estimated arrival window or site access notes."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuotingRequest(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuote}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] disabled:opacity-60"
                >
                  {submittingQuote ? 'Sending...' : 'Send Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.kind === 'decline_request'
            ? `Decline request ${confirmAction.request.reference_code}?`
            : confirmAction?.kind === 'update_job'
            ? `Update booking ${confirmAction.booking.reference_number} to ${confirmAction.nextStatus}?`
            : ''
        }
        description={
          confirmAction?.kind === 'decline_request'
            ? 'This request will be hidden from your incoming queue.'
            : confirmAction?.kind === 'update_job' &&
              confirmAction.nextStatus === 'Completed'
            ? 'Marking this job as Completed notifies the farmer to verify and confirm completion.'
            : confirmAction?.kind === 'update_job' &&
              confirmAction.nextStatus === 'Cancelled'
            ? 'Cancelling a confirmed booking notifies the farmer and marks the transaction record as Cancelled.'
            : 'Updating status to In Progress lets the farmer know your operator is on site.'
        }
        confirmLabel={
          confirmAction?.kind === 'decline_request'
            ? 'Decline Request'
            : confirmAction?.kind === 'update_job'
            ? `Set ${confirmAction.nextStatus}`
            : 'Confirm'
        }
        tone={
          confirmAction?.kind === 'decline_request' ||
          (confirmAction?.kind === 'update_job' &&
            confirmAction.nextStatus === 'Cancelled')
            ? 'danger'
            : 'primary'
        }
        loading={confirmBusy}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </DashboardShell>
  );
}
