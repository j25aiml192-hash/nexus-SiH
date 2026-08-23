import { ALERT_COLORS } from '@/lib/constants';

export default function AlertTicker({
  alerts,
}: {
  alerts: { id: string; alert_level: string; message: string; sent_at: string }[];
}) {
  const items = [...alerts, ...alerts];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 h-9 overflow-hidden border-t border-[#243049] bg-[#1A2035]">
      <div className="flex h-full w-max animate-ticker items-center gap-8 whitespace-nowrap px-5">
        {items.length ? (
          items.map((alert, index) => (
            <div key={`${alert.id}-${index}`} className="flex items-center gap-3 text-xs text-[#A8B4CC]">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: ALERT_COLORS[alert.alert_level] || '#16A34A' }}
              />
              <span>{alert.message}</span>
              <span className="text-[#64748B]">|</span>
              <span className="font-mono text-[11px] text-[#94A3B8]">
                {new Date(alert.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        ) : (
          <span className="text-xs uppercase tracking-widest text-[#94A3B8]">NEXUS monitoring network activity</span>
        )}
      </div>
    </div>
  );
}
