import { useNexusStore, ToastItem } from '@/store/nexusStore';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const TYPE_CONFIG = {
  success: {
    borderColor: '#16A34A',
    iconColor: '#16A34A',
    Icon: CheckCircle2,
  },
  error: {
    borderColor: '#DC2626',
    iconColor: '#DC2626',
    Icon: XCircle,
  },
  warning: {
    borderColor: '#D97706',
    iconColor: '#D97706',
    Icon: AlertTriangle,
  },
  info: {
    borderColor: '#1E40AF',
    iconColor: '#1E40AF',
    Icon: Info,
  },
};

export default function Toast() {
  const toasts = useNexusStore((s) => s.toasts);
  const removeToast = useNexusStore((s) => s.removeToast);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast: ToastItem) => {
        const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
        const IconComponent = config.Icon;

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-[10px] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.12)] border-l-4 transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right-full"
            style={{ borderLeftColor: config.borderColor }}
          >
            <IconComponent size={20} className="shrink-0 mt-0.5" style={{ color: config.iconColor }} />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-[#0F1B2D] leading-tight">{toast.title}</h4>
              {toast.message && <p className="mt-1 text-xs text-[#64748B] leading-normal">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-[#94A3B8] hover:text-[#0F1B2D] transition-colors p-1"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
