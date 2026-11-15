import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { AppNotification } from '../../types/farmaccess';

interface ToastContainerProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({
  notifications,
  onDismiss,
}: ToastContainerProps) {
  if (!notifications.length) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-full max-w-sm px-4 sm:px-0 pointer-events-none"
      aria-live="polite"
    >
      {notifications.map((n) => {
        const iconMap = {
          success: <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />,
          error: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />,
          info: <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />,
        };
        const borderMap = {
          success: 'border-emerald-200',
          error: 'border-rose-200',
          info: 'border-amber-200',
        };

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg bg-white border ${borderMap[n.type]} p-3.5 shadow-lg`}
          >
            {iconMap[n.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{n.title}</p>
              {n.message && (
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  {n.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(n.id)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
