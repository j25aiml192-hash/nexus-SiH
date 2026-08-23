import { useEffect, useMemo, useState } from 'react';
import { Bell, Brain, FileText, TrendingDown, X } from 'lucide-react';
import { usePredictions } from '@/hooks/usePredictions';
import { useAlerts } from '@/hooks/useAlerts';
import { useNexusStore } from '@/store/nexusStore';
import { SEED_MULE_CHAINS, FRAUD_TYPES } from '@/lib/constants';
import KPICard from '@/components/shared/KPICard';
import NationalMap from '@/components/map/NationalMap';
import AlertCard from '@/components/alerts/AlertCard';
import RecoveryRing from '@/components/predictions/RecoveryRing';
import MuleChainGraph from '@/components/predictions/MuleChainGraph';
import NarrativeCard from '@/components/predictions/NarrativeCard';
import StatusBadge from '@/components/shared/StatusBadge';
import SentinelPanel from '@/components/sentinel/SentinelPanel';
import { Link } from 'react-router-dom';

export default function CommandCenter() {
  const predictions = usePredictions();
  const { alerts, acknowledgeAlert } = useAlerts();
  const selected = useNexusStore((s) => s.selectedPrediction);
  const setSelected = useNexusStore((s) => s.setSelectedPrediction);
  const [toast, setToast] = useState('');

  const active = useMemo(
    () => predictions.filter((p) => p.status === 'active' || p.status === 'escalated' || !p.status),
    [predictions]
  );

  const [complaintsCount, setComplaintsCount] = useState<number>(80);
  const [totalRiskAmount, setTotalRiskAmount] = useState<number>(24500000);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, count } = await supabase
          .from('complaints')
          .select('amount', { count: 'exact' });

        if (count != null) {
          setComplaintsCount(count);
        }
        if (data && data.length > 0) {
          const sum = data.reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
          setTotalRiskAmount(sum);
        }
      } catch (err) {
        console.error('Failed to load complaint stats:', err);
      }
    }
    fetchStats();
  }, []);

  const fundsAtRiskStr =
    totalRiskAmount >= 10000000
      ? `₹${(totalRiskAmount / 10000000).toFixed(2)} Cr`
      : totalRiskAmount >= 100000
      ? `₹${(totalRiskAmount / 100000).toFixed(1)} L`
      : `₹${totalRiskAmount.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Complaints registered"
          value={complaintsCount.toLocaleString('en-IN')}
          subtitle="Realtime NCRP Ingestion"
          icon={FileText}
          iconColor="#1E40AF"
          trend={14}
        />
        <KPICard
          title="Active predictions"
          value={active.length || 8}
          subtitle="Across active state networks"
          icon={Brain}
          iconColor="#7C3AED"
          trend={12}
        />
        <KPICard
          title="Alerts dispatched"
          value={alerts.length || 35}
          subtitle="Dispatched to LEA & Banks"
          icon={Bell}
          iconColor="#D97706"
          trend={8}
        />
        <KPICard
          title="Total Funds at Risk"
          value={fundsAtRiskStr}
          subtitle="Under active watch"
          icon={TrendingDown}
          iconColor="#DC2626"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="relative z-0 min-h-[500px]">
          <NationalMap predictions={active} onPinClick={setSelected} />
          <div className="absolute left-4 top-4 z-[10] rounded-xl border border-[#E2E8F0] bg-white/95 px-4 py-3 shadow-md backdrop-blur-xs">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">National threat surface</p>
            <p className="mt-0.5 font-mono text-xs font-medium text-[#0F1B2D]">{active.length} active zones · live</p>
          </div>
        </div>

        <div className="min-h-[500px] space-y-4">
          {selected ? (
            <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selected.alert_level} />
                    <span className="font-mono text-xs text-[#64748B]">{selected.complaint_id}</span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-[#0F1B2D]">
                    {FRAUD_TYPES.find((f) => f.value === selected.complaint_id)?.label || 'Predictive threat event'}
                  </h2>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#64748B] transition hover:text-[#0F1B2D]">
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center justify-around border-y border-[#F1F5F9] py-4">
                <RecoveryRing cashoutWindowHours={selected.cashout_window_hours} createdAt={selected.created_at} status={selected.status} />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Risk score</p>
                  <p className="mt-1 font-mono text-3xl font-bold text-[#DC2626]">{Math.round(selected.risk_score * 100)}%</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">confidence</p>
                </div>
              </div>

              <MuleChainGraph complaintId={selected.complaint_id} />
              <NarrativeCard narrative={selected.llm_narrative} />

              <div className="flex gap-3">
                <Link
                  to={`/prediction/${selected.id}`}
                  className="nexus-btn-secondary flex-1 py-2 text-center text-xs"
                >
                  View full detail
                </Link>
                <button
                  onClick={() => setToast('Alert queued for all assigned responders.')}
                  className="nexus-btn flex-1 py-2 text-xs"
                >
                  Send alert
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-[#0F1B2D]">Live alert feed</h2>
                  <p className="mt-0.5 text-xs text-[#64748B]">Autonomous engine output</p>
                </div>
                <Link to="/lea/alerts" className="text-xs font-semibold text-[#1E40AF] hover:underline">
                  View all
                </Link>
              </div>
              {alerts.slice(0, 4).map((alert) => (
                <AlertCard key={alert.id} alert={alert} onAcknowledge={acknowledgeAlert} />
              ))}
            </>
          )}


        </div>
      </div>

      {toast && (
        <button
          onClick={() => setToast('')}
          className="fixed bottom-14 right-6 z-50 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-xs font-medium text-[#0F1B2D] shadow-lg"
        >
          {toast}
        </button>
      )}
    </div>
  );
}
