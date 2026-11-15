import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  PlayCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  AccountStatus,
  BookingStatus,
  ProviderApprovalStatus,
  QuotationStatus,
  TransactionPaymentStatus,
} from '../../types/farmaccess';

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const config: Record<
    BookingStatus,
    { classes: string; icon: typeof Clock; label: string }
  > = {
    Pending: {
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Clock,
      label: 'Pending',
    },
    Quoted: {
      classes: 'bg-sky-50 text-sky-800 border-sky-200',
      icon: FileText,
      label: 'Quoted',
    },
    Accepted: {
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      label: 'Accepted',
    },
    Confirmed: {
      classes: 'bg-[#ECFDF3] text-[#14532D] border-[#BBF7D0]',
      icon: ShieldCheck,
      label: 'Confirmed',
    },
    'In Progress': {
      classes: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: PlayCircle,
      label: 'In Progress',
    },
    Completed: {
      classes: 'bg-[#14532D] text-white border-[#14532D]',
      icon: CheckCircle2,
      label: 'Completed',
    },
    Cancelled: {
      classes: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: XCircle,
      label: 'Cancelled',
    },
  };

  const item = config[status];
  const Icon = item.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${item.classes}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </span>
  );
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const styles: Record<QuotationStatus, string> = {
    Pending: 'bg-amber-50 text-amber-800 border-amber-200',
    Accepted: 'bg-[#ECFDF3] text-[#14532D] border-[#BBF7D0]',
    Declined: 'bg-rose-50 text-rose-700 border-rose-200',
    Withdrawn: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function ProviderApprovalBadge({
  status,
}: {
  status: ProviderApprovalStatus;
}) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md border bg-[#ECFDF3] text-[#14532D] border-[#BBF7D0] whitespace-nowrap shrink-0">
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Approved</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md border bg-rose-50 text-rose-800 border-rose-200 whitespace-nowrap shrink-0">
        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Rejected</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md border bg-amber-50 text-amber-800 border-amber-200 whitespace-nowrap shrink-0">
      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Pending Review</span>
    </span>
  );
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return status === 'active' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border bg-emerald-50 text-emerald-800 border-emerald-200 whitespace-nowrap shrink-0">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border bg-rose-50 text-rose-800 border-rose-200 whitespace-nowrap shrink-0">
      Suspended
    </span>
  );
}

export function TransactionStatusBadge({
  status,
}: {
  status: TransactionPaymentStatus;
}) {
  const map: Record<TransactionPaymentStatus, string> = {
    'Pending Settlement': 'bg-amber-50 text-amber-800 border-amber-200',
    'Recorded on Delivery': 'bg-sky-50 text-sky-800 border-sky-200',
    'Verified Settlement': 'bg-[#ECFDF3] text-[#14532D] border-[#BBF7D0]',
    Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${map[status]}`}
    >
      {status}
    </span>
  );
}
