import { useAlerts } from '@/hooks/useAlerts';
import AlertCard from '@/components/alerts/AlertCard';

export default function BankAlerts() {
  const { alerts, acknowledgeAlert } = useAlerts();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Fraud desk</p>
        <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Bank alert feed</h1>
        <p className="mt-0.5 text-xs text-[#64748B]">Real-time warnings for accounts and cash-out locations.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {alerts.map((a) => (
          <AlertCard key={a.id} alert={a} onAcknowledge={acknowledgeAlert} />
        ))}
      </div>
    </div>
  );
}
