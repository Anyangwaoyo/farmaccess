import {
  Briefcase,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Tractor,
  Users,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatDateShort,
  formatNaira,
  formatPricingMethod,
} from '../../lib/formatters';
import { farmAccessService } from '../../services/farmAccessService';
import type {
  AccountStatus,
  Booking,
  Equipment,
  Profile,
  ProviderApprovalStatus,
  ProviderProfile,
  Quotation,
  ServiceRequest,
  TransactionPaymentStatus,
  TransactionRecord,
} from '../../types/farmaccess';
import { DashboardShell, type NavTabItem } from '../layout/DashboardShell';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  AccountStatusBadge,
  BookingStatusBadge,
  ProviderApprovalBadge,
  TransactionStatusBadge,
} from '../ui/StatusIndicator';

interface AdminDashboardProps {
  profile: Profile;
  profiles: Profile[];
  providers: ProviderProfile[];
  equipment: Equipment[];
  serviceRequests: ServiceRequest[];
  quotations: Quotation[];
  bookings: Booking[];
  transactionRecords: TransactionRecord[];
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  onGoHome: () => void;
  onLogout: () => void;
}

type AdminConfirmAction =
  | {
      kind: 'review_provider';
      provider: ProviderProfile;
      nextStatus: ProviderApprovalStatus;
      notes: string;
    }
  | {
      kind: 'toggle_account';
      account: Profile;
      nextStatus: AccountStatus;
    }
  | null;

export function AdminDashboard({
  profile,
  profiles,
  providers,
  equipment,
  serviceRequests,
  quotations,
  bookings,
  transactionRecords,
  onRefresh,
  onNotify,
  onGoHome,
  onLogout,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [bookingFilter, setBookingFilter] = useState<string>('All');
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<AdminConfirmAction>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const farmers = useMemo(
    () => profiles.filter((p) => p.role === 'farmer'),
    [profiles]
  );

  const pendingProviders = useMemo(
    () => providers.filter((p) => p.approval_status === 'pending'),
    [providers]
  );

  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === 'Completed'),
    [bookings]
  );

  const pendingBookingsCount = useMemo(
    () =>
      bookings.filter((b) => ['Confirmed', 'In Progress'].includes(b.status))
        .length +
      serviceRequests.filter((r) => ['Pending', 'Quoted'].includes(r.status)).length,
    [bookings, serviceRequests]
  );

  const totalRecordedBookingValue = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== 'Cancelled')
        .reduce((sum, b) => sum + Number(b.agreed_amount || 0), 0),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    if (bookingFilter === 'All') return bookings;
    return bookings.filter((b) => b.status === bookingFilter);
  }, [bookings, bookingFilter]);

  const tabs: NavTabItem[] = [
    { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard },
    {
      id: 'providers',
      label: 'Providers & Approvals',
      icon: ShieldCheck,
      badgeCount: pendingProviders.length,
    },
    { id: 'accounts', label: 'Farmers & Accounts', icon: Users },
    { id: 'equipment', label: 'Equipment Directory', icon: Tractor },
    { id: 'bookings', label: 'Requests & Bookings', icon: Briefcase },
    { id: 'transactions', label: 'Transaction Records', icon: Receipt },
  ];

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      if (confirmAction.kind === 'review_provider') {
        await farmAccessService.adminReviewProvider(
          confirmAction.provider.id,
          confirmAction.nextStatus,
          confirmAction.notes
        );
        await onRefresh();
        onNotify(
          'success',
          `${confirmAction.provider.business_name} marked ${confirmAction.nextStatus}`
        );
      } else if (confirmAction.kind === 'toggle_account') {
        await farmAccessService.adminSetAccountStatus(
          confirmAction.account.id,
          confirmAction.nextStatus,
          profile.id
        );
        await onRefresh();
        onNotify(
          'info',
          `Account ${confirmAction.account.full_name} is now ${confirmAction.nextStatus}`
        );
      }
      setConfirmAction(null);
    } catch (err) {
      onNotify('error', 'Admin action failed', err instanceof Error ? err.message : 'Unable to apply change.');
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleUpdateTransactionStatus = async (
    txn: TransactionRecord,
    status: TransactionPaymentStatus
  ) => {
    try {
      await farmAccessService.adminUpdateTransactionStatus(
        txn.id,
        status,
        status === 'Verified Settlement'
          ? 'Verified recorded offline settlement by administrator.'
          : txn.notes
      );
      await onRefresh();
      onNotify('success', `Record ${txn.reference_number} updated to ${status}`);
    } catch (err) {
      onNotify('error', 'Update failed', err instanceof Error ? err.message : 'Unable to update record.');
    }
  };

  return (
    <DashboardShell
      profile={profile}
      portalTitle="Admin Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onGoHome={onGoHome}
      onLogout={onLogout}
    >
      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Total Farmers</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {farmers.length}
              </p>
              <p className="mt-1 text-xs text-slate-600">Registered farmer accounts</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Total Providers</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {providers.length}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                <span className="font-mono tabular-nums">{pendingProviders.length}</span> awaiting approval
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Equipment Listings</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {equipment.length}
              </p>
              <p className="mt-1 text-xs text-slate-600">Registered machinery units</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">
                Total Recorded Booking Value
              </p>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#14532D] font-mono tabular-nums">
                {formatNaira(totalRecordedBookingValue)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Agreed non-cancelled bookings
              </p>
            </div>
          </div>

          {/* Second KPI row for Total, Completed, Pending Bookings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Total Bookings</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {bookings.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Completed Bookings</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-[#14532D] font-mono tabular-nums">
                {completedBookings.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">
                Pending / Active Requests &amp; Bookings
              </p>
              <p className="mt-1.5 font-display text-2xl font-bold text-[#B45309] font-mono tabular-nums">
                {pendingBookingsCount}
              </p>
            </div>
          </div>

          {/* Pending Approvals Shortcut */}
          {pendingProviders.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  {pendingProviders.length} provider registration
                  {pendingProviders.length > 1 ? 's' : ''} awaiting verification
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Review registration documents and coverage states before granting listing permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('providers')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                Review Providers
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                Recent Platform Bookings
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className="text-xs font-semibold text-[#14532D] hover:underline"
              >
                View all records
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAF8] text-xs font-medium text-slate-500">
                    <th className="py-3 px-6">Booking Ref</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Farmer</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Agreed Value</th>
                    <th className="py-3 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-900">
                        {b.reference_number}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-800 font-medium">
                        {b.service_type}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{b.farmer_name}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{b.provider_name}</td>
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
          </div>
        </div>
      )}

      {/* PROVIDERS & APPROVALS TAB */}
      {activeTab === 'providers' && (
        <div className="space-y-5">
          {providers.map((prov) => {
            const draftNote =
              reviewNotesMap[prov.id] ?? prov.admin_notes ?? '';
            return (
              <div
                key={prov.id}
                className="bg-white border border-slate-200 rounded-xl p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {prov.business_name}
                      </h3>
                      <ProviderApprovalBadge status={prov.approval_status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Owner: <span className="font-medium text-slate-800">{prov.owner_name}</span> ·{' '}
                      {prov.owner_email} · {prov.owner_phone}
                    </p>
                  </div>

                  <div className="text-xs text-slate-500">
                    Reg No: <span className="font-mono text-slate-800">{prov.registration_number || 'Not provided'}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
                  <div>
                    <p className="text-slate-500">Coverage States</p>
                    <p className="mt-0.5 font-medium">{prov.coverage_states.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Coverage LGAs</p>
                    <p className="mt-0.5 font-medium">{prov.coverage_lgas || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Experience</p>
                    <p className="mt-0.5 font-medium font-mono tabular-nums">
                      {prov.years_experience} years
                    </p>
                  </div>
                </div>

                {prov.bio && (
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                    {prov.bio}
                  </p>
                )}

                <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <input
                    type="text"
                    value={draftNote}
                    onChange={(e) =>
                      setReviewNotesMap((prev) => ({
                        ...prev,
                        [prov.id]: e.target.value,
                      }))
                    }
                    placeholder="Admin verification note..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    {prov.approval_status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({
                            kind: 'review_provider',
                            provider: prov,
                            nextStatus: 'approved',
                            notes: draftNote || 'Approved after admin review.',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Approve Provider</span>
                      </button>
                    )}
                    {prov.approval_status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({
                            kind: 'review_provider',
                            provider: prov,
                            nextStatus: 'rejected',
                            notes: draftNote || 'Rejected pending valid credentials.',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50"
                      >
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FARMERS & ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-display text-base font-bold text-slate-900">
              Registered Platform Accounts ({profiles.length})
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Inspect registered farmers, providers, and administrators, and suspend or reactivate accounts when necessary.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAF8] text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">Name &amp; Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {profiles.map((acct) => {
                  const isSelf = acct.id === profile.id;
                  return (
                    <tr key={acct.id}>
                      <td className="py-3.5 px-6">
                        <p className="font-medium text-slate-900">{acct.full_name}</p>
                        <p className="text-xs text-slate-500">{acct.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 capitalize">
                        {acct.role}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {acct.lga ? `${acct.lga}, ` : ''}
                        {acct.state}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {acct.phone}
                      </td>
                      <td className="py-3.5 px-4">
                        <AccountStatusBadge status={acct.account_status} />
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {isSelf ? (
                          <span className="text-xs text-slate-400">Current Admin</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                kind: 'toggle_account',
                                account: acct,
                                nextStatus:
                                  acct.account_status === 'active'
                                    ? 'suspended'
                                    : 'active',
                              })
                            }
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                              acct.account_status === 'active'
                                ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                                : 'text-[#14532D] border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            {acct.account_status === 'active'
                              ? 'Suspend'
                              : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EQUIPMENT DIRECTORY TAB */}
      {activeTab === 'equipment' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-display text-base font-bold text-slate-900">
              All Registered Equipment ({equipment.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAF8] text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">Equipment</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Services</th>
                  <th className="py-3 px-4">States</th>
                  <th className="py-3 px-4">Base Rate</th>
                  <th className="py-3 px-6 text-right">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {equipment.map((eq) => (
                  <tr key={eq.id}>
                    <td className="py-3.5 px-6">
                      <p className="font-medium text-slate-900">{eq.name}</p>
                      <p className="text-xs text-slate-500">
                        {eq.category}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      <p>{eq.provider_name}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {eq.services_offered.join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {eq.service_locations.join(', ')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatNaira(eq.base_price)} / {formatPricingMethod(eq.pricing_method).replace('per ', '')}
                    </td>
                    <td className="py-3.5 px-6 text-right text-xs font-medium">
                      <span
                        className={
                          eq.is_available ? 'text-[#16A34A]' : 'text-slate-500'
                        }
                      >
                        {eq.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REQUESTS & BOOKINGS MONITOR TAB */}
      {activeTab === 'bookings' && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-display text-base font-bold text-slate-900">
                Bookings Monitor ({filteredBookings.length})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setBookingFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        bookingFilter === st
                          ? 'bg-[#14532D] text-white border-[#14532D]'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAF8] text-xs font-medium text-slate-500">
                    <th className="py-3 px-6">Reference</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Farmer &amp; Provider</th>
                    <th className="py-3 px-4">Scheduled</th>
                    <th className="py-3 px-4">Agreed Amount</th>
                    <th className="py-3 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-900">
                        {b.reference_number}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-medium text-slate-900">{b.service_type}</p>
                        <p className="text-slate-500">
                          {b.quantity} {b.unit} · {b.state}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <p>Farmer: {b.farmer_name}</p>
                        <p>Provider: {b.provider_name}</p>
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
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#14532D]" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-900">
                Service Requests &amp; Quotations ({serviceRequests.length} requests · {quotations.length} quotations)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAF8] text-xs font-medium text-slate-500">
                    <th className="py-3 px-6">Request Ref</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Farmer</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Quotes</th>
                    <th className="py-3 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {serviceRequests.map((r) => {
                    const count = quotations.filter((q) => q.request_id === r.id).length;
                    return (
                      <tr key={r.id}>
                        <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-900">
                          {r.reference_code}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-900">
                          {r.service_type} ({r.quantity} {r.unit})
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{r.farmer_name}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {r.lga}, {r.state}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums">
                          {count}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <BookingStatusBadge status={r.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION RECORDS TAB */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-600">
            <strong className="text-slate-900">Transaction Ledger Notice:</strong>{' '}
            FarmAccess records agreed Naira booking amounts and offline settlement statuses for transparency. No automated card or bank payment processing occurs on this platform.
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAF8] text-xs font-medium text-slate-500">
                    <th className="py-3 px-6">Booking Ref</th>
                    <th className="py-3 px-4">Parties</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Recorded Date</th>
                    <th className="py-3 px-4">Agreed Amount</th>
                    <th className="py-3 px-4">Settlement Status</th>
                    <th className="py-3 px-6 text-right">Update Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {transactionRecords.map((txn) => (
                    <tr key={txn.id}>
                      <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-900">
                        {txn.reference_number}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <p className="font-medium text-slate-900">{txn.farmer_name}</p>
                        <p>{txn.provider_name}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {txn.service_type}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {formatDateShort(txn.recorded_at)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#14532D] tabular-nums whitespace-nowrap">
                        {formatNaira(txn.agreed_amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <TransactionStatusBadge status={txn.payment_status} />
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {txn.payment_status !== 'Cancelled' &&
                        txn.payment_status !== 'Verified Settlement' ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTransactionStatus(txn, 'Verified Settlement')
                            }
                            className="px-3 py-1.5 text-xs font-medium text-[#14532D] bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap"
                          >
                            Verify Settlement
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.kind === 'review_provider'
            ? `${confirmAction.nextStatus === 'approved' ? 'Approve' : 'Reject'} ${
                confirmAction.provider.business_name
              }?`
            : confirmAction?.kind === 'toggle_account'
            ? `${
                confirmAction.nextStatus === 'suspended' ? 'Suspend' : 'Reactivate'
              } ${confirmAction.account.full_name}?`
            : ''
        }
        description={
          confirmAction?.kind === 'review_provider'
            ? confirmAction.nextStatus === 'approved'
              ? 'Approved providers can immediately publish machinery listings, submit quotations, and receive confirmed bookings.'
              : 'Rejected providers remain blocked from publishing listings or submitting quotations.'
            : confirmAction?.kind === 'toggle_account'
            ? confirmAction.nextStatus === 'suspended'
              ? 'Suspended users cannot log in or perform booking actions until reactivated.'
              : 'Reactivating restores full platform access for this user.'
            : ''
        }
        confirmLabel={
          confirmAction?.kind === 'review_provider'
            ? confirmAction.nextStatus === 'approved'
              ? 'Approve Provider'
              : 'Reject Provider'
            : confirmAction?.kind === 'toggle_account'
            ? confirmAction.nextStatus === 'suspended'
              ? 'Suspend Account'
              : 'Reactivate Account'
            : 'Confirm'
        }
        tone={
          (confirmAction?.kind === 'review_provider' &&
            confirmAction.nextStatus === 'rejected') ||
          (confirmAction?.kind === 'toggle_account' &&
            confirmAction.nextStatus === 'suspended')
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
