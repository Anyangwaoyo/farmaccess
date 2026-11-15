import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  MapPin,
  Search,
  Tractor,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  ALL_SERVICE_TYPES,
  formatDateShort,
  formatNaira,
  formatPricingMethod,
  getDefaultUnitForService,
  NIGERIAN_STATES,
} from '../../lib/formatters';
import { farmAccessService } from '../../services/farmAccessService';
import type {
  Booking,
  Equipment,
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
  QuotationStatusBadge,
} from '../ui/StatusIndicator';

interface FarmerDashboardProps {
  profile: Profile;
  equipment: Equipment[];
  providers: ProviderProfile[];
  serviceRequests: ServiceRequest[];
  quotations: Quotation[];
  bookings: Booking[];
  preselectedService?: { serviceType: ServiceType; equipmentId?: string } | null;
  onClearPreselectedService: () => void;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  onProfileUpdated: (updated: Profile) => void;
  onGoHome: () => void;
  onLogout: () => void;
}

type ConfirmAction =
  | { kind: 'accept_quote'; quotation: Quotation }
  | { kind: 'decline_quote'; quotation: Quotation }
  | { kind: 'cancel_request'; request: ServiceRequest }
  | { kind: 'confirm_completion'; booking: Booking }
  | null;

export function FarmerDashboard({
  profile,
  equipment,
  providers,
  serviceRequests,
  quotations,
  bookings,
  preselectedService,
  onClearPreselectedService,
  onRefresh,
  onNotify,
  onProfileUpdated,
  onGoHome,
  onLogout,
}: FarmerDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>(
    preselectedService ? 'new_request' : 'overview'
  );

  // Browse filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Land Preparation' | 'Crop Processing'>('All');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [browseView, setBrowseView] = useState<'equipment' | 'providers'>('equipment');

  // New Service Request Form
  const [reqServiceType, setReqServiceType] = useState<ServiceType>(
    preselectedService?.serviceType || 'Ploughing'
  );
  const [reqEquipmentId, setReqEquipmentId] = useState<string>(
    preselectedService?.equipmentId || ''
  );
  const [reqState, setReqState] = useState<string>(profile.state || 'Kaduna');
  const [reqLga, setReqLga] = useState<string>(profile.lga || '');
  const [reqLocation, setReqLocation] = useState<string>(
    profile.community ? `${profile.community} Farm Plot` : ''
  );
  const [reqQuantity, setReqQuantity] = useState<string>('2');
  const [reqUnit, setReqUnit] = useState<string>(
    getDefaultUnitForService(preselectedService?.serviceType || 'Ploughing')
  );
  const [reqDate, setReqDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [reqNotes, setReqNotes] = useState<string>('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Profile form
  const [profName, setProfName] = useState(profile.full_name);
  const [profEmail, setProfEmail] = useState(profile.email);
  const [profPhone, setProfPhone] = useState(profile.phone);
  const [profState, setProfState] = useState(profile.state || 'Kaduna');
  const [profLga, setProfLga] = useState(profile.lga);
  const [profCommunity, setProfCommunity] = useState(profile.community);
  const [profBio, setProfBio] = useState(profile.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Confirm Dialog
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // My data slices
  const myRequests = useMemo(
    () => serviceRequests.filter((r) => r.farmer_id === profile.id),
    [serviceRequests, profile.id]
  );

  const myRequestIds = useMemo(() => new Set(myRequests.map((r) => r.id)), [myRequests]);

  const myIncomingQuotations = useMemo(
    () => quotations.filter((q) => myRequestIds.has(q.request_id)),
    [quotations, myRequestIds]
  );

  const pendingQuotationsCount = useMemo(
    () => myIncomingQuotations.filter((q) => q.status === 'Pending').length,
    [myIncomingQuotations]
  );

  const myBookings = useMemo(
    () => bookings.filter((b) => b.farmer_id === profile.id),
    [bookings, profile.id]
  );

  const confirmedBookingsCount = useMemo(
    () =>
      myBookings.filter((b) => ['Confirmed', 'In Progress'].includes(b.status))
        .length,
    [myBookings]
  );

  const completedJobsCount = useMemo(
    () => myBookings.filter((b) => b.status === 'Completed').length,
    [myBookings]
  );

  // Approved equipment & providers for browsing
  const approvedEquipment = useMemo(
    () =>
      equipment.filter((eq) => {
        if (eq.provider_approval_status !== 'approved' || !eq.is_available) return false;
        if (categoryFilter !== 'All' && eq.category !== categoryFilter) return false;
        if (stateFilter !== 'All' && !eq.service_locations.includes(stateFilter)) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            eq.name.toLowerCase().includes(q) ||
            eq.equipment_type.toLowerCase().includes(q) ||
            eq.services_offered.some((s) => s.toLowerCase().includes(q)) ||
            (eq.provider_name || '').toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      }),
    [equipment, categoryFilter, stateFilter, searchQuery]
  );

  const approvedProviders = useMemo(
    () =>
      providers.filter((p) => {
        if (p.approval_status !== 'approved' || p.account_status === 'suspended') return false;
        if (stateFilter !== 'All' && !p.coverage_states.includes(stateFilter)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            p.business_name.toLowerCase().includes(q) ||
            p.coverage_lgas.toLowerCase().includes(q) ||
            p.bio.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [providers, stateFilter, searchQuery]
  );

  const tabs: NavTabItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'browse', label: 'Services & Equipment', icon: Tractor },
    { id: 'new_request', label: 'Request Service', icon: FilePlus2 },
    {
      id: 'requests',
      label: 'Requests & Quotes',
      icon: ClipboardList,
      badgeCount: pendingQuotationsCount,
    },
    {
      id: 'bookings',
      label: 'Bookings & History',
      icon: CalendarCheck,
      badgeCount: confirmedBookingsCount,
    },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const startRequestWithEquipment = (eq: Equipment) => {
    const primarySvc = eq.services_offered[0] || 'Tractor hiring';
    setReqServiceType(primarySvc);
    setReqUnit(getDefaultUnitForService(primarySvc));
    setReqEquipmentId(eq.id);
    setActiveTab('new_request');
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(reqQuantity);
    if (!reqLocation.trim() || !reqLga.trim() || !reqDate) {
      onNotify('error', 'Missing details', 'Please fill in farm location, LGA, and preferred date.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      onNotify('error', 'Invalid quantity', 'Farm size or bag quantity must be greater than zero.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await farmAccessService.createServiceRequest(profile.id, {
        service_type: reqServiceType,
        farm_location: reqLocation.trim(),
        state: reqState,
        lga: reqLga.trim(),
        quantity: qty,
        unit: reqUnit,
        preferred_date: reqDate,
        additional_requirements: reqNotes.trim(),
        preferred_equipment_id: reqEquipmentId || null,
      });
      await onRefresh();
      onClearPreselectedService();
      setReqNotes('');
      setReqEquipmentId('');
      onNotify(
        'success',
        'Service request submitted',
        'Approved providers in your region can now review your request and submit quotations.'
      );
      setActiveTab('requests');
    } catch (err) {
      onNotify('error', 'Request failed', err instanceof Error ? err.message : 'Unable to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      if (confirmAction.kind === 'accept_quote') {
        const booking = await farmAccessService.acceptQuotation(
          confirmAction.quotation.id,
          profile.id
        );
        await onRefresh();
        onNotify(
          'success',
          `Booking confirmed (${booking.reference_number})`,
          'You can track dispatch and job progress under Bookings & History.'
        );
        setActiveTab('bookings');
      } else if (confirmAction.kind === 'decline_quote') {
        await farmAccessService.declineQuotation(confirmAction.quotation.id, profile.id);
        await onRefresh();
        onNotify('info', 'Quotation declined');
      } else if (confirmAction.kind === 'cancel_request') {
        await farmAccessService.cancelServiceRequest(confirmAction.request.id, profile.id);
        await onRefresh();
        onNotify('info', `Request ${confirmAction.request.reference_code} cancelled`);
      } else if (confirmAction.kind === 'confirm_completion') {
        await farmAccessService.confirmBookingCompletionByFarmer(
          confirmAction.booking.id,
          profile.id
        );
        await onRefresh();
        onNotify(
          'success',
          'Job completion confirmed',
          `Booking ${confirmAction.booking.reference_number} has been signed off.`
        );
      }
      setConfirmAction(null);
    } catch (err) {
      onNotify('error', 'Action failed', err instanceof Error ? err.message : 'Operation could not be completed.');
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profName.trim() || (!profPhone.trim() && !profEmail.trim())) {
      onNotify('error', 'Incomplete profile', 'Name and at least an email or phone number are required.');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await farmAccessService.updateProfile(profile.id, {
        full_name: profName.trim(),
        email: profEmail.trim().toLowerCase(),
        phone: profPhone.trim(),
        state: profState,
        lga: profLga.trim(),
        community: profCommunity.trim(),
        bio: profBio.trim(),
      });
      onProfileUpdated(updated);
      await onRefresh();
      onNotify('success', 'Bio and profile updated');
    } catch (err) {
      onNotify('error', 'Save failed', err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const needsBioUpdate = !profile.bio.trim() || !profile.state.trim() || !profile.lga.trim();

  return (
    <DashboardShell
      profile={profile}
      portalTitle="Farmer Account"
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onGoHome={onGoHome}
      onLogout={onLogout}
      primaryAction={
        <button
          type="button"
          onClick={() => setActiveTab('new_request')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0"
        >
          <FilePlus2 className="w-4 h-4" aria-hidden="true" />
          <span>New Request</span>
        </button>
      }
    >
      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {needsBioUpdate && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#14532D]">
                  Complete your Bio and farm location
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  Add your farming Bio, state, and LGA in My Profile so equipment providers understand your farm location and crop needs.
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
              <p className="text-xs font-medium text-slate-500">Total Requests</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {myRequests.length}
              </p>
              <p className="mt-1 text-xs text-slate-600">Submitted service requests</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Pending Quotations</p>
              <p className="mt-2 font-display text-3xl font-bold text-[#B45309] font-mono tabular-nums">
                {pendingQuotationsCount}
              </p>
              <p className="mt-1 text-xs text-slate-600">Awaiting your review</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Confirmed Bookings</p>
              <p className="mt-2 font-display text-3xl font-bold text-[#14532D] font-mono tabular-nums">
                {confirmedBookingsCount}
              </p>
              <p className="mt-1 text-xs text-slate-600">Scheduled or in progress</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Completed Jobs</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {completedJobsCount}
              </p>
              <p className="mt-1 text-xs text-slate-600">Finished field operations</p>
            </div>
          </div>

          {/* Pending quotations callout if any */}
          {pendingQuotationsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  You have {pendingQuotationsCount} pending quotation
                  {pendingQuotationsCount > 1 ? 's' : ''} ready to compare
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Review provider pricing and available dates to confirm your machinery booking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                Review Quotations
              </button>
            </div>
          )}

          {/* Recent Booking Activities */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Recent Booking &amp; Request Activity
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest updates across your requests and confirmed bookings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className="text-xs font-semibold text-[#14532D] hover:underline whitespace-nowrap"
              >
                View all bookings
              </button>
            </div>

            {myBookings.length === 0 && myRequests.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-slate-900">
                  No service requests or bookings yet
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Browse available equipment or submit your first agricultural service request.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new_request')}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534]"
                >
                  Submit First Request
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F8FAF8] text-xs font-medium text-slate-500">
                      <th className="py-3 px-6">Reference</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Location &amp; Scale</th>
                      <th className="py-3 px-4">Target Date</th>
                      <th className="py-3 px-4">Agreed Price</th>
                      <th className="py-3 px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {myBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                          {b.reference_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{b.service_type}</p>
                          <p className="text-xs text-slate-500">{b.provider_name}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {b.state} · <span className="font-mono tabular-nums">{b.quantity}</span> {b.unit}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {formatDateShort(b.scheduled_date)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatNaira(b.agreed_amount)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <BookingStatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                    {myRequests
                      .filter((r) => !myBookings.some((b) => b.request_id === r.id))
                      .slice(0, 5)
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-6 font-mono text-xs font-medium text-slate-600 whitespace-nowrap">
                            {r.reference_code}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-slate-900">{r.service_type}</p>
                            <p className="text-xs text-slate-500">Service Request</p>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {r.state} · <span className="font-mono tabular-nums">{r.quantity}</span> {r.unit}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                            {formatDateShort(r.preferred_date)}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            Awaiting selection
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <BookingStatusBadge status={r.status} />
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

      {/* BROWSE SERVICES & EQUIPMENT TAB */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="inline-flex p-1 bg-slate-100 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setBrowseView('equipment')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    browseView === 'equipment'
                      ? 'bg-white text-[#14532D] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Equipment Listings ({approvedEquipment.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBrowseView('providers')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    browseView === 'providers'
                      ? 'bg-white text-[#14532D] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Verified Providers ({approvedProviders.length})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tractor, ploughing, Kano..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                  />
                </div>

                {browseView === 'equipment' && (
                  <select
                    aria-label="Filter by service category"
                    value={categoryFilter}
                    onChange={(e) =>
                      setCategoryFilter(
                        e.target.value as 'All' | 'Land Preparation' | 'Crop Processing'
                      )
                    }
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                  >
                    <option value="All">All Categories</option>
                    <option value="Land Preparation">Land Preparation</option>
                    <option value="Crop Processing">Crop Processing</option>
                  </select>
                )}

                <select
                  aria-label="Filter by Nigerian state"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                >
                  <option value="All">All States</option>
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {browseView === 'equipment' ? (
            approvedEquipment.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  No matching equipment found
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Try clearing filters, or submit an open service request so providers in your state can quote directly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('All');
                    setStateFilter('All');
                  }}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-[#14532D] border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedEquipment.map((eq) => (
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
                        <p className="text-xs text-slate-500">
                          {eq.category} · Verified Equipment
                        </p>
                        <h3 className="mt-1 text-base font-bold text-slate-900">
                          {eq.name}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-[#166534]">
                          {eq.provider_name}
                        </p>
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                          {eq.description}
                        </p>
                        <p className="mt-3 text-xs text-slate-700">
                          Services: <span className="font-medium">{eq.services_offered.join(', ')}</span>
                        </p>
                        <p className="mt-1.5 text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          <span>{eq.service_locations.join(', ')}</span>
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Indicative rate</p>
                          <p className="text-sm font-bold text-[#14532D] font-mono tabular-nums">
                            {formatNaira(eq.base_price)}{' '}
                            <span className="font-sans font-normal text-xs text-slate-500">
                              {formatPricingMethod(eq.pricing_method)}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => startRequestWithEquipment(eq)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap"
                        >
                          Request Service
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : approvedProviders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No verified providers match this filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {approvedProviders.map((prov) => {
                const provEq = equipment.filter(
                  (e) => e.provider_id === prov.id && e.is_available
                );
                return (
                  <div
                    key={prov.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-xs text-slate-500">
                        Verified Provider · {prov.years_experience} yrs experience
                      </p>
                      <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
                        {prov.business_name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        {prov.bio}
                      </p>
                      <div className="mt-4 space-y-1 text-xs text-slate-700">
                        <p>
                          <span className="text-slate-500">States covered:</span>{' '}
                          {prov.coverage_states.join(', ')}
                        </p>
                        <p>
                          <span className="text-slate-500">LGAs:</span> {prov.coverage_lgas}
                        </p>
                        <p>
                          <span className="text-slate-500">Available units:</span>{' '}
                          <span className="font-mono tabular-nums">{provEq.length}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (provEq[0]) {
                            startRequestWithEquipment(provEq[0]);
                          } else {
                            setActiveTab('new_request');
                          }
                        }}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534]"
                      >
                        Request Service
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBMIT SERVICE REQUEST TAB */}
      {activeTab === 'new_request' && (
        <div className="max-w-3xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Submit Agricultural Service Request
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Provide accurate farm location and size details so approved equipment providers can calculate accurate Naira quotations.
          </p>

          <form onSubmit={handleSubmitRequest} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="req-service"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Service Type <span className="text-rose-600">*</span>
                </label>
                <select
                  id="req-service"
                  value={reqServiceType}
                  onChange={(e) => {
                    const svc = e.target.value as ServiceType;
                    setReqServiceType(svc);
                    setReqUnit(getDefaultUnitForService(svc));
                  }}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                >
                  {ALL_SERVICE_TYPES.map((svc) => (
                    <option key={svc} value={svc}>
                      {svc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="req-preferred-eq"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Preferred Equipment (Optional)
                </label>
                <select
                  id="req-preferred-eq"
                  value={reqEquipmentId}
                  onChange={(e) => setReqEquipmentId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                >
                  <option value="">Open to all verified providers</option>
                  {equipment
                    .filter((e) => e.provider_approval_status === 'approved' && e.is_available)
                    .map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({formatNaira(eq.base_price)})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="req-state"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  State <span className="text-rose-600">*</span>
                </label>
                <select
                  id="req-state"
                  value={reqState}
                  onChange={(e) => setReqState(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="req-lga"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  LGA <span className="text-rose-600">*</span>
                </label>
                <input
                  id="req-lga"
                  type="text"
                  required
                  value={reqLga}
                  onChange={(e) => setReqLga(e.target.value)}
                  placeholder="e.g. Giwa"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
              <div>
                <label
                  htmlFor="req-date"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Preferred Date <span className="text-rose-600">*</span>
                </label>
                <input
                  id="req-date"
                  type="date"
                  required
                  value={reqDate}
                  onChange={(e) => setReqDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="req-location"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Farm / Drying Yard Location Description <span className="text-rose-600">*</span>
              </label>
              <input
                id="req-location"
                type="text"
                required
                value={reqLocation}
                onChange={(e) => setReqLocation(e.target.value)}
                placeholder="e.g. Shika North Plot 3, off Zaria-Funtua Road"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="req-quantity"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Farm Size or Quantity <span className="text-rose-600">*</span>
                </label>
                <input
                  id="req-quantity"
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
              <div>
                <label
                  htmlFor="req-unit"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Measurement Unit
                </label>
                <select
                  id="req-unit"
                  value={reqUnit}
                  onChange={(e) => setReqUnit(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                >
                  <option value="hectares">Hectares</option>
                  <option value="acres">Acres</option>
                  <option value="bags">Bags (75–100 kg)</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="req-notes"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Additional Field Requirements
              </label>
              <textarea
                id="req-notes"
                rows={3}
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                placeholder="Mention soil condition, stump clearing status, road access for tractors, or crop variety."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRequest}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] disabled:opacity-60"
              >
                {submittingRequest ? 'Submitting...' : 'Submit Service Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MY REQUESTS & QUOTATIONS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {myRequests.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                You have not submitted any service requests yet
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('new_request')}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534]"
              >
                Create Service Request
              </button>
            </div>
          ) : (
            myRequests.map((req) => {
              const reqQuotes = quotations.filter((q) => q.request_id === req.id);
              const canCancel = ['Pending', 'Quoted'].includes(req.status);

              return (
                <section
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  <div className="p-5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAF8]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-900">
                          {req.reference_code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{req.service_category}</span>
                        <span aria-hidden="true">·</span>
                        <span>Preferred: {formatDateShort(req.preferred_date)}</span>
                      </div>
                      <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                        {req.service_type} —{' '}
                        <span className="font-mono tabular-nums">
                          {req.quantity}
                        </span>{' '}
                        {req.unit}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {req.farm_location} ({req.lga}, {req.state})
                      </p>
                      {req.additional_requirements && (
                        <p className="mt-1.5 text-xs text-slate-600">
                          Notes: {req.additional_requirements}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <BookingStatusBadge status={req.status} />
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({ kind: 'cancel_request', request: req })
                          }
                          className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 whitespace-nowrap"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quotations Comparison Panel */}
                  <div className="p-5 sm:px-6">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Received Quotations ({reqQuotes.length})
                      </h4>
                      {reqQuotes.length > 1 && req.status === 'Quoted' && (
                        <span className="text-xs text-slate-500">
                          Compare total Naira amount and available dates before accepting
                        </span>
                      )}
                    </div>

                    {reqQuotes.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3">
                        {req.status === 'Cancelled'
                          ? 'Request was cancelled before quotations were accepted.'
                          : 'Waiting for approved providers to review your request and submit quotations.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reqQuotes.map((q) => (
                          <div
                            key={q.id}
                            className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${
                              q.status === 'Accepted'
                                ? 'border-[#14532D] bg-emerald-50/40'
                                : 'border-slate-200 bg-[#F8FAF8]'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {q.provider_name}
                                  </p>
                                  <p className="text-xs text-slate-600 mt-0.5 truncate">
                                    {q.equipment_name}
                                  </p>
                                </div>
                                <QuotationStatusBadge status={q.status} />
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-200 flex items-baseline justify-between gap-2">
                                <span className="text-xs text-slate-500">
                                  Quoted Total
                                </span>
                                <span className="font-display text-xl font-bold text-[#14532D] font-mono tabular-nums">
                                  {formatNaira(q.quoted_amount)}
                                </span>
                              </div>

                              <p className="mt-2 text-xs text-slate-700">
                                <span className="text-slate-500">Breakdown:</span>{' '}
                                {q.pricing_breakdown}
                              </p>
                              <p className="mt-1 text-xs text-slate-700">
                                <span className="text-slate-500">Available date:</span>{' '}
                                {formatDateShort(q.available_date)}
                              </p>
                              {q.notes && (
                                <p className="mt-1 text-xs text-slate-600">
                                  {q.notes}
                                </p>
                              )}
                            </div>

                            {q.status === 'Pending' && ['Pending', 'Quoted'].includes(req.status) && (
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmAction({
                                      kind: 'accept_quote',
                                      quotation: q,
                                    })
                                  }
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors"
                                >
                                  Accept Offer
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmAction({
                                      kind: 'decline_quote',
                                      quotation: q,
                                    })
                                  }
                                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* BOOKINGS & HISTORY TAB */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {myBookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No confirmed bookings yet
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Accept a quotation under Requests &amp; Quotes to create a confirmed booking with a reference number.
              </p>
            </div>
          ) : (
            myBookings.map((b) => {
              const needsFarmerConfirmation =
                b.status === 'Completed' && !b.farmer_confirmed_at;

              return (
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
                        {b.service_type} ({b.equipment_name})
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Provider: <span className="font-medium text-slate-800">{b.provider_name}</span>
                        {b.provider_phone ? ` · ${b.provider_phone}` : ''}
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
                      <p className="text-slate-500">Job Volume</p>
                      <p className="mt-0.5 font-medium font-mono tabular-nums">
                        {b.quantity} {b.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Completion Sign-Off</p>
                      <p className="mt-0.5 font-medium">
                        {b.farmer_confirmed_at
                          ? `Confirmed ${formatDateShort(b.farmer_confirmed_at)}`
                          : b.provider_completed_at
                          ? 'Provider finished — awaiting your sign-off'
                          : 'In progress / scheduled'}
                      </p>
                    </div>
                  </div>

                  {needsFarmerConfirmation && (
                    <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50 -mx-6 -mb-6 p-5 rounded-b-xl">
                      <p className="text-xs text-[#14532D] font-medium">
                        The provider has marked this job as Completed. Please verify the work on your farm and confirm completion.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({ kind: 'confirm_completion', booking: b })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] whitespace-nowrap shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>Confirm Completion</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Farmer Bio &amp; Profile Details
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Update your Bio, contact details, and farming cluster location after signing in.
          </p>

          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profEmail}
                  onChange={(e) => setProfEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  State
                </label>
                <select
                  value={profState}
                  onChange={(e) => setProfState(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]"
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
                  LGA
                </label>
                <input
                  type="text"
                  value={profLga}
                  onChange={(e) => setProfLga(e.target.value)}
                  placeholder="e.g. Giwa"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Community / Cluster
                </label>
                <input
                  type="text"
                  value={profCommunity}
                  onChange={(e) => setProfCommunity(e.target.value)}
                  placeholder="e.g. Shika Cluster"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Farmer Bio &amp; Crop Focus
              </label>
              <textarea
                rows={3}
                value={profBio}
                onChange={(e) => setProfBio(e.target.value)}
                placeholder="Tell providers about your farm size, primary crops (e.g. maize, rice, soybean), and seasonal mechanisation needs."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Bio & Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.kind === 'accept_quote'
            ? `Accept quotation of ${formatNaira(confirmAction.quotation.quoted_amount)}?`
            : confirmAction?.kind === 'decline_quote'
            ? 'Decline this quotation?'
            : confirmAction?.kind === 'cancel_request'
            ? `Cancel service request ${confirmAction.request.reference_code}?`
            : confirmAction?.kind === 'confirm_completion'
            ? `Confirm completion for ${confirmAction.booking.reference_number}?`
            : ''
        }
        description={
          confirmAction?.kind === 'accept_quote'
            ? `Accepting ${confirmAction.quotation.provider_name}'s offer will confirm your booking and decline any competing quotations for this request.`
            : confirmAction?.kind === 'decline_quote'
            ? 'This provider offer will be marked as declined. You can still accept other quotations on your request.'
            : confirmAction?.kind === 'cancel_request'
            ? 'Cancelling this pending request will withdraw it from providers and close open quotations.'
            : confirmAction?.kind === 'confirm_completion'
            ? 'Confirming indicates the provider completed the agricultural service on your farm as agreed.'
            : ''
        }
        confirmLabel={
          confirmAction?.kind === 'accept_quote'
            ? 'Confirm Booking'
            : confirmAction?.kind === 'decline_quote'
            ? 'Decline Offer'
            : confirmAction?.kind === 'cancel_request'
            ? 'Cancel Request'
            : 'Confirm Completion'
        }
        tone={
          confirmAction?.kind === 'cancel_request' || confirmAction?.kind === 'decline_quote'
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
