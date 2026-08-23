import { useMemo } from 'react';
import { useNexusStore } from '@/store/nexusStore';
import { usePredictions } from '@/hooks/usePredictions';
import { useAlerts } from '@/hooks/useAlerts';
import { STATE_CENTROIDS } from '@/lib/constants';
import NationalMap from '@/components/map/NationalMap';
import KPICard from '@/components/shared/KPICard';
import AlertCard from '@/components/alerts/AlertCard';
import { Bell, Banknote, MapPin } from 'lucide-react';

export default function StateDashboard() {
  const user = useNexusStore((s) => s.user);
  const predictions = usePredictions();
  const { alerts, acknowledgeAlert } = useAlerts();

  const filtered = useMemo(
    () =>
      predictions.filter((p) =>
        user?.state === 'Jharkhand' ? [24.48, 24.19].some((lat) => Math.abs(p.predicted_lat - lat) < 1) : true
      ),
    [predictions, user]
  );

  const center = STATE_CENTROIDS[user?.state || 'Jharkhand'];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">{user?.state || 'State'} operations</p>
        <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">State response dashboard</h1>
        <p className="mt-0.5 text-xs text-[#64748B]">Live predictions and deployments within your jurisdiction.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Active zones" value={filtered.length} subtitle="In your jurisdiction" icon={MapPin} iconColor="#1E40AF" />
        <KPICard
          title="Pending alerts"
          value={alerts.filter((a) => a.status !== 'acknowledged').length}
          subtitle="Require response"
          icon={Bell}
          iconColor="#D97706"
        />
        <KPICard title="Funds at risk" value="₹1.1 Cr" subtitle="Under active watch" icon={Banknote} iconColor="#DC2626" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <NationalMap predictions={filtered} onPinClick={() => {}} center={[center.lat, center.lng]} zoom={center.zoom} />
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-[#0F1B2D]">State alert queue</h2>
          {alerts.slice(0, 4).map((a) => (
            <AlertCard key={a.id} alert={a} onAcknowledge={acknowledgeAlert} />
          ))}
        </div>
      </div>
    </div>
  );
}
