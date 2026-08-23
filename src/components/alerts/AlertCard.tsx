import { Clock3, Radio, UserCheck } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

export default function AlertCard({
  alert,
  onAcknowledge,
}: {
  alert: {
    id: string;
    complaint_id?: string;
    message: string;
    alert_level: string;
    sent_at: string;
    recipient_role?: string;
    status: string;
  };
  onAcknowledge?: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150">
      <div className="flex items-center justify-between">
        <StatusBadge status={alert.alert_level} />
        <span className="font-mono text-xs text-[#64748B]">
          {new Date(alert.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#0F1B2D]">{alert.message}</p>
      <div className="mt-3 flex items-center justify-between border-t border-[#F1F5F9] pt-3">
        <div className="flex items-center gap-3 text-xs text-[#64748B]">
          <span className="flex items-center gap-1">
            <Radio size={13} /> {alert.complaint_id || 'N/A'}
          </span>
          <span className="flex items-center gap-1">
            <UserCheck size={13} /> {alert.recipient_role?.replace('_', ' ') || 'ops'}
          </span>
        </div>
        {alert.status !== 'acknowledged' && onAcknowledge ? (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="nexus-btn-secondary flex items-center gap-1.5 py-1 px-3 text-xs"
          >
            <Clock3 size={13} /> Acknowledge
          </button>
        ) : (
          <StatusBadge status="acknowledged" />
        )}
      </div>
    </div>
  );
}
