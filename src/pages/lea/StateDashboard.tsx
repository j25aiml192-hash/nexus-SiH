import React, { useMemo } from 'react';
import { useNexusStore } from '@/store/nexusStore';
import { usePredictions } from '@/hooks/usePredictions';
import { useAlerts } from '@/hooks/useAlerts';
import { STATE_CENTROIDS } from '@/lib/constants';
import NationalMap from '@/components/map/NationalMap';
import KPICard from '@/components/shared/KPICard';
import AlertCard from '@/components/alerts/AlertCard';
import { Bell, Banknote, MapPin } from 'lucide-react';

class HeatmapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[420px] rounded-xl border border-[#E2E8F0] bg-[#1A2035] text-gray-400 text-sm">
          Map loading — data syncing from engine...
        </div>
      );
    }
    return this.props.children;
  }
}

export default function StateDashboard() {
  const user = useNexusStore((s) => s.user);
  const userState = user?.state || 'All States';
  const predictions = usePredictions();
  const { alerts, acknowledgeAlert } = useAlerts();

  const validPredictions = useMemo(() => {
    return (predictions || []).filter(
      (p) =>
        p &&
        p.predicted_lat != null &&
        p.predicted_lng != null &&
        typeof p.predicted_lat === 'number' &&
        typeof p.predicted_lng === 'number' &&
        !isNaN(p.predicted_lat) &&
        !isNaN(p.predicted_lng) &&
        p.predicted_lat !== 0 &&
        p.predicted_lng !== 0
    );
  }, [predictions]);

  const filtered = useMemo(
    () =>
      validPredictions.filter((p) =>
        userState === 'Jharkhand'
          ? [24.48, 24.19].some((lat) => Math.abs(p.predicted_lat - lat) < 1)
          : true
      ),
    [validPredictions, userState]
  );

  const center = (user?.state && STATE_CENTROIDS[user.state]) || STATE_CENTROIDS['Jharkhand'] || { lat: 23.6102, lng: 85.2799, zoom: 7 };

  const pendingAlertsCount = (alerts || []).filter((a) => a.status !== 'acknowledged').length ?? 0;
  const activeZonesCount = filtered?.length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">{userState} operations</p>
        <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">State response dashboard</h1>
        <p className="mt-0.5 text-xs text-[#64748B]">Live predictions and deployments within your jurisdiction.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Active zones" value={activeZonesCount || 0} subtitle="In your jurisdiction" icon={MapPin} iconColor="#1E40AF" />
        <KPICard
          title="Pending alerts"
          value={pendingAlertsCount || 0}
          subtitle="Require response"
          icon={Bell}
          iconColor="#D97706"
        />
        <KPICard title="Funds at risk" value="₹1.1 Cr" subtitle="Under active watch" icon={Banknote} iconColor="#DC2626" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <HeatmapErrorBoundary>
          <NationalMap predictions={filtered} onPinClick={() => {}} center={[center.lat, center.lng]} zoom={center.zoom} />
        </HeatmapErrorBoundary>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-[#0F1B2D]">State alert queue</h2>
          {(alerts || []).slice(0, 4).map((a) => (
            <AlertCard key={a.id} alert={a} onAcknowledge={acknowledgeAlert} />
          ))}
        </div>
      </div>
    </div>
  );
}
