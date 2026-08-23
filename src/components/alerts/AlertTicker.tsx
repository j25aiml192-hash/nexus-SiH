import { ALERT_COLORS } from '@/lib/constants';
import { useNexusStore } from '@/store/nexusStore';

export default function AlertTicker({
  alerts,
}: {
  alerts: { id: string; alert_level: string; message: string; sent_at: string }[];
}) {
  const items = [...alerts, ...alerts];
  const collapsed = useNexusStore((s) => s.sidebarCollapsed);

  return (
    <div
      className={`fixed bottom-0 right-0 z-[1000] h-9 overflow-hidden border-t border-[#EAECF0] bg-white shadow-xs transition-all duration-300 ease-in-out ${
        collapsed ? 'left-0 lg:left-[72px]' : 'left-0 lg:left-64'
      }`}
    >
      <div className="flex h-full w-max animate-ticker items-center gap-8 whitespace-nowrap px-5">
        {items.length ? (
          items.map((alert, index) => (
            <div key={`${alert.id}-${index}`} className="flex items-center gap-2.5 text-xs text-[#1E293B]">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: ALERT_COLORS[alert.alert_level] || '#16A34A' }}
              />
              <span className="font-medium">{alert.message}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-[11px] text-[#64748B]">
                {new Date(alert.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        ) : (
          <span className="text-xs uppercase font-mono tracking-widest text-[#64748B]">
            NEXUS Live Monitoring Active — No Urgent Threat Dispatches
          </span>
        )}
      </div>
    </div>
  );
}
