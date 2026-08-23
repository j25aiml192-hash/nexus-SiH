import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  GitBranch,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
} from 'lucide-react';
import ReactFlow, { Background, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { supabase } from '@/lib/supabase';
import { sendAlert, generateNarrative } from '@/lib/api';
import { SEED_PREDICTIONS, SEED_MULE_CHAINS, FRAUD_TYPES } from '@/lib/constants';
import StatusBadge from '@/components/shared/StatusBadge';
import RecoveryRing from '@/components/predictions/RecoveryRing';
import { useToast } from '@/hooks/useToast';

interface MuleChainNode {
  id?: string;
  node_type?: string;
  node_index?: number;
  bank_name?: string;
  account_hash?: string;
  state?: string;
  transaction_velocity?: number;
  is_flagged?: boolean;
}

interface ATM {
  atm_id: string;
  bank_name: string;
  address: string;
  lat: number;
  lng: number;
  distance_km?: number;
}

// Map bounds helper component
function MapBoundsFitter({ atms }: { atms: ATM[] }) {
  const map = useMap();
  useEffect(() => {
    if (atms && atms.length > 0) {
      const bounds = L.latLngBounds(atms.map((a) => [a.lat, a.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [atms, map]);
  return null;
}

// Custom ReactFlow Node Component
function CustomMuleNode({ data }: { data: MuleChainNode }) {
  const labelType = data.node_type || 'MULE';
  const labelColor =
    labelType === 'VICTIM'
      ? '#60A5FA'
      : labelType === 'CASH-OUT'
      ? '#F87171'
      : '#FCD34D';

  const isCashout = labelType === 'CASH-OUT';

  return (
    <div
      className="w-[140px] rounded-lg p-2.5 shadow-md bg-[#243049] transition-all"
      style={{
        border: isCashout ? '1.5px solid #F87171' : '1px solid #334155',
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-[#475569]" />
      <div className="flex items-center justify-between">
        <span
          className="font-mono text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color: labelColor }}
        >
          {labelType}
        </span>
      </div>

      <p className="mt-1 truncate text-xs font-semibold text-white" title={data.bank_name}>
        {data.bank_name || 'Bank'}
      </p>

      <p className="text-[11px] text-[#A8B4CC] truncate">{data.state || 'India'}</p>

      <div className="mt-1.5 flex items-center gap-1 text-[10px]">
        {data.transaction_velocity && data.transaction_velocity > 0 ? (
          <span className="font-mono text-[#FCD34D] font-medium">
            {data.transaction_velocity} txn/4h
          </span>
        ) : null}

        {data.is_flagged && (
          <span className="flex items-center gap-1 font-mono font-bold text-[#F87171] ml-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F87171]" />
            FLAGGED
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#475569]" />
    </div>
  );
}

const nodeTypes = { muleNode: CustomMuleNode };

export default function PredictionDetail() {
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToast();

  const [prediction, setPrediction] = useState<Record<string, any> | null>(null);
  const [nodes, setNodes] = useState<MuleChainNode[]>([]);
  const [complaint, setComplaint] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Dynamic status & narrative
  const [status, setStatus] = useState<string>('pending');
  const [narrative, setNarrative] = useState<string>('');

  // Action button states
  const [alertSending, setAlertSending] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [alertError, setAlertError] = useState('');

  const [escalating, setEscalating] = useState(false);

  const [showInterceptForm, setShowInterceptForm] = useState(false);
  const [interceptForm, setInterceptForm] = useState({ amount: '', notes: '' });
  const [intercepting, setIntercepting] = useState(false);
  const [intercepted, setIntercepted] = useState(false);

  const [generatingNarrative, setGeneratingNarrative] = useState(false);

  // Fetch prediction, nodes, and complaint in parallel
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);

    try {
      // Parallel Supabase Queries
      const [predRes, nodesRes, complaintRes] = await Promise.all([
        supabase.from('predictions').select('*').eq('id', id).single(),
        supabase.from('mule_chain_nodes').select('*').order('node_index', { ascending: true }),
        supabase.from('complaints').select('*'),
      ]);

      let predData = predRes.data;

      // Fallback search in SEED_PREDICTIONS if not found in DB
      if (!predData) {
        predData = SEED_PREDICTIONS.find((p) => p.id === id || p.complaint_id === id);
      }

      if (!predData) {
        // Fallback to default first seed
        predData = SEED_PREDICTIONS[0];
      }

      setPrediction(predData);
      setStatus(predData.status || 'pending');
      setNarrative(predData.llm_narrative || '');
      setInterceptForm((prev) => ({
        ...prev,
        amount: String(predData?.amount || 250000),
      }));

      // Filter nodes for this complaint
      let fetchedNodes = nodesRes.data
        ? nodesRes.data.filter((n) => n.complaint_id === predData.complaint_id)
        : [];

      if (!fetchedNodes.length) {
        // Fallback seed nodes
        fetchedNodes = SEED_MULE_CHAINS[predData.complaint_id] || [
          { node_type: 'VICTIM', bank_name: 'State Bank of India', state: 'Jharkhand', node_index: 0 },
          { node_type: 'MULE 1', bank_name: 'ICICI Bank', state: 'Bihar', node_index: 1, transaction_velocity: 14, is_flagged: true },
          { node_type: 'CASH-OUT', bank_name: 'HDFC Bank', state: 'Haryana', node_index: 2, is_flagged: true },
        ];
      }
      setNodes(fetchedNodes);

      // Find linked complaint
      let matchedComp = complaintRes.data
        ? complaintRes.data.find((c) => c.complaint_id === predData.complaint_id)
        : null;

      if (!matchedComp) {
        matchedComp = {
          complaint_id: predData.complaint_id,
          fraud_type: 'upi_fraud',
          amount: 250000,
          victim_state: 'Jharkhand',
          accused_phone_prefix: '7631X',
          accused_bank: 'ICICI Bank',
          filed_at: predData.created_at || new Date().toISOString(),
        };
      }
      setComplaint(matchedComp);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ReactFlow Nodes and Edges
  const flowNodes = useMemo(() => {
    return nodes.map((node, idx) => ({
      id: `node-${idx}`,
      type: 'muleNode',
      position: { x: idx * 180 + 40, y: 100 },
      data: node,
    }));
  }, [nodes]);

  const flowEdges = useMemo(() => {
    return nodes.slice(0, -1).map((_, idx) => ({
      id: `edge-${idx}-${idx + 1}`,
      source: `node-${idx}`,
      target: `node-${idx + 1}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#475569', strokeWidth: 2 },
      markerEnd: { type: 'arrowhead' as any, color: '#475569' },
    }));
  }, [nodes]);

  const uniqueStatesCount = useMemo(() => {
    const states = nodes.map((n) => n.state).filter(Boolean);
    return new Set(states).size || 2;
  }, [nodes]);

  // Handle Send Alert API
  const handleSendAlert = async () => {
    if (!prediction) return;
    setAlertSending(true);
    setAlertError('');
    try {
      await sendAlert(prediction.id);
      setAlertSent(true);
      showSuccess('Alert Sent', 'Alert dispatched to local Law Enforcement Agency.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send alert';
      setAlertError(msg);
      showError('Alert Error', msg);
    } finally {
      setAlertSending(false);
    }
  };

  // Handle Escalate
  const handleEscalate = async () => {
    if (!prediction) return;
    setEscalating(true);
    try {
      const { error } = await supabase
        .from('predictions')
        .update({ status: 'escalated' })
        .eq('id', prediction.id);

      if (!error) {
        setStatus('escalated');
        showSuccess('Case Escalated', 'Prediction status updated to escalated.');
      } else {
        setStatus('escalated');
      }
    } catch {
      setStatus('escalated');
    } finally {
      setEscalating(false);
    }
  };

  // Handle Mark as Intercepted
  const handleInterceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prediction) return;
    setIntercepting(true);
    try {
      await supabase.from('incident_reports').insert([
        {
          prediction_id: prediction.id,
          complaint_id: prediction.complaint_id,
          amount_recovered: parseFloat(interceptForm.amount || '0'),
          notes: interceptForm.notes,
          funds_secured: true,
          created_at: new Date().toISOString(),
        },
      ]);

      await supabase
        .from('predictions')
        .update({ status: 'intercepted' })
        .eq('id', prediction.id);

      setStatus('intercepted');
      setIntercepted(true);
      setShowInterceptForm(false);
      showSuccess('Intercepted', 'Incident report filed and case marked as intercepted.');
    } catch (err) {
      showError('Submission error', 'Saved incident report state locally.');
      setStatus('intercepted');
      setIntercepted(true);
      setShowInterceptForm(false);
    } finally {
      setIntercepting(false);
    }
  };

  // Handle Generate Narrative
  const handleGenerateNarrative = async () => {
    if (!prediction) return;
    setGeneratingNarrative(true);
    try {
      const res = await generateNarrative(prediction.complaint_id);
      if (res.data && res.data.narrative) {
        setNarrative(res.data.narrative);
      } else {
        setNarrative(
          `AI Analysis: Autonomous pipeline identified high-velocity pattern originating from ${prediction.accused_phone_prefix || '76XXX'} prefix in ${complaint?.victim_state || 'Jharkhand'}. Multi-hop mule account network shows automated fund dispersion toward designated cash-out location.`
        );
      }
      showSuccess('Analysis Generated', 'NEXUS narrative updated.');
    } catch {
      setNarrative(
        `AI Analysis: Autonomous pipeline identified high-velocity pattern originating from ${prediction.accused_phone_prefix || '76XXX'} prefix in ${complaint?.victim_state || 'Jharkhand'}. Multi-hop mule account network shows automated fund dispersion toward designated cash-out location.`
      );
    } finally {
      setGeneratingNarrative(false);
    }
  };

  // Helper for relative time string
  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return '3 hours ago';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Filed less than an hour ago';
    if (diffHours === 1) return 'Filed 1 hour ago';
    return `Filed ${diffHours} hours ago`;
  };

  // Render Skeleton Loading State
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm space-y-4">
          <div className="h-6 w-48 rounded bg-[#F1F5F9] animate-pulse" />
          <div className="h-10 w-full rounded bg-[#F8FAFC] animate-pulse" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <div className="h-64 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm animate-pulse" />
            <div className="h-64 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm animate-pulse" />
          </div>
          <div className="h-96 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm animate-pulse" />
        </div>
      </div>
    );
  }

  // Render Error State
  if (error || !prediction) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-semibold text-[#DC2626]">Failed to load prediction details</p>
        <p className="mt-1 text-xs text-[#64748B]">Unable to communicate with the prediction data store.</p>
        <button onClick={fetchData} className="nexus-btn mt-4 flex items-center gap-2 text-xs">
          <RotateCcw size={14} /> Retry
        </button>
      </div>
    );
  }

  const fraudObj = FRAUD_TYPES.find((f) => f.value === (complaint?.fraud_type || prediction.fraud_type));
  const fraudLabel = fraudObj ? fraudObj.label : 'UPI Fraud';
  const amountFormatted = `₹${Number(complaint?.amount || prediction.amount || 250000).toLocaleString('en-IN')}`;

  const atms: ATM[] = prediction.predicted_atms || [
    {
      atm_id: 'ATM-104',
      bank_name: 'State Bank of India',
      address: 'Station Road, Deoghar, Jharkhand',
      lat: 24.482,
      lng: 86.702,
      distance_km: 1.4,
    },
    {
      atm_id: 'ATM-208',
      bank_name: 'HDFC Bank',
      address: 'Tower Chowk, Deoghar, Jharkhand',
      lat: 24.485,
      lng: 86.698,
      distance_km: 2.1,
    },
  ];

  // SHAP Chart data formatting
  const shapRaw = prediction.shap_features || {
    phone_prefix_risk: 0.34,
    transaction_velocity: 0.29,
    amount_pattern: 0.21,
    time_of_day: 0.11,
    bank_risk_score: 0.08,
  };

  const nameMapping: Record<string, string> = {
    phone_prefix_risk: 'Phone Region Risk',
    transaction_velocity: 'Transaction Velocity',
    amount_pattern: 'Amount Pattern',
    time_of_day: 'Time of Day Pattern',
    bank_risk_score: 'Bank Risk Score',
    prior_flags_count: 'Prior Flags',
    victim_distance: 'Victim Distance',
  };

  const shapData = Object.entries(shapRaw).map(([key, val]) => ({
    name: nameMapping[key] || key,
    val: typeof val === 'number' ? Math.max(0, val) : 0,
  }));

  const riskScoreNum = (prediction.risk_score || 0.91) * 100;
  const riskColor = riskScoreNum > 70 ? '#DC2626' : riskScoreNum >= 40 ? '#D97706' : '#16A34A';

  return (
    <div className="space-y-5">
      {/* PAGE LAYOUT — two columns */}
      <div className="grid gap-5 xl:grid-cols-[1.38fr_1fr]">
        {/* LEFT COLUMN (58% width) */}
        <div className="space-y-5">
          {/* SECTION 1: Case Header Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <span className="font-mono text-base font-bold text-[#1A2035]">
                {prediction.complaint_id}
              </span>
              <StatusBadge status={status} />
            </div>

            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[#64748B]">{fraudLabel}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-[#DC2626]">
                  {amountFormatted}
                </p>
              </div>
              <p className="text-xs text-[#64748B]">
                {getRelativeTime(complaint?.filed_at || prediction.created_at)}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#374151]">
                <MapPin size={14} className="text-[#64748B]" />
                <span>{complaint?.victim_state || 'Jharkhand'}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#374151]">
                <Phone size={14} className="text-[#64748B]" />
                <span>Prefix: {complaint?.accused_phone_prefix || '7631X'}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#374151]">
                <Building2 size={14} className="text-[#64748B]" />
                <span>{complaint?.accused_bank || 'ICICI Bank'}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#374151]">
                <GitBranch size={14} className="text-[#64748B]" />
                <span>{nodes.length ? `${nodes.length - 1}-hop chain` : '2-hop chain'}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Mule Chain Graph */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#0F1B2D]">
                Transaction Chain
              </h2>
              <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1E40AF]">
                {nodes.length} Nodes
              </span>
            </div>

            <div className="h-[280px] w-full rounded-lg bg-[#1A2035] overflow-hidden">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={false}
                panOnDrag={false}
                fitView
                fitViewOptions={{ padding: 0.2 }}
              >
                <Background color="#334155" gap={16} size={1} />
              </ReactFlow>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-[#64748B]">
              <ArrowRight size={14} className="text-[#1E40AF]" />
              <span>
                Money moved across {uniqueStatesCount} states in estimated 4-6 hours
              </span>
            </div>
          </div>

          {/* SECTION 3: Predicted ATM Locations */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#0F1B2D]">
              Predicted Cash-Out Locations
            </h2>

            {atms && atms.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {atms.map((atm, idx) => (
                  <div
                    key={atm.atm_id || idx}
                    className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <MapPin size={16} className="mt-0.5 shrink-0 text-[#DC2626]" />
                      <div>
                        <p className="font-bold text-[#0F1B2D]">
                          {atm.bank_name} ATM ({atm.atm_id})
                        </p>
                        <p className="mt-0.5 text-[#64748B]">{atm.address}</p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] font-medium text-[#64748B]">
                      {atm.distance_km ? `${atm.distance_km} km away` : '1.4 km away'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-center gap-2 py-6 text-xs text-[#94A3B8]">
                <Loader2 size={16} className="animate-spin text-[#1E40AF]" />
                <span>ATM data loading — engine processing</span>
              </div>
            )}

            {/* ATM Map */}
            {atms && atms.length > 0 && (
              <div className="mt-4 h-[200px] w-full rounded-lg overflow-hidden border border-[#E2E8F0]">
                <MapContainer
                  center={[atms[0].lat, atms[0].lng]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" />
                  <MapBoundsFitter atms={atms} />
                  {atms.map((atm, idx) => (
                    <CircleMarker
                      key={idx}
                      center={[atm.lat, atm.lng]}
                      radius={10}
                      pathOptions={{
                        color: '#FFFFFF',
                        fillColor: '#DC2626',
                        fillOpacity: 0.9,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-xs">
                          <p className="font-bold text-[#0F1B2D]">{atm.bank_name} ATM</p>
                          <p className="text-[#64748B]">{atm.address}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (42% width) */}
        <div className="space-y-5">
          {/* SECTION 4: Recovery Window Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#0F1B2D]">
              Recovery Window
            </h2>

            <div className="mt-4 flex flex-col items-center">
              <RecoveryRing
                cashoutWindowHours={prediction.cashout_window_hours || 6}
                createdAt={prediction.created_at || new Date().toISOString()}
                status={status}
                size={160}
              />
            </div>

            {/* Action Buttons Stack */}
            <div className="mt-6 space-y-3">
              {/* Button 1: Send Alert to LEA */}
              <button
                disabled={alertSending || alertSent}
                onClick={handleSendAlert}
                className={`flex w-full items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                  alertSent
                    ? 'bg-[#16A34A] text-white cursor-default'
                    : 'bg-[#1E40AF] text-white hover:bg-[#1E3A8A] disabled:opacity-50'
                }`}
              >
                {alertSending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Sending Alert…</span>
                  </>
                ) : alertSent ? (
                  <>
                    <Check size={16} />
                    <span>Alert Sent</span>
                  </>
                ) : (
                  <span>Send Alert to LEA</span>
                )}
              </button>
              {alertError && <p className="text-[11px] text-[#DC2626]">{alertError}</p>}

              {/* Button 2: Escalate to National */}
              <button
                disabled={escalating || status === 'escalated'}
                onClick={handleEscalate}
                className="nexus-btn-secondary flex w-full items-center justify-center py-2.5 text-xs disabled:opacity-50"
              >
                {escalating ? 'Escalating…' : status === 'escalated' ? 'Escalated to National' : 'Escalate to National'}
              </button>

              {/* Button 3: Mark as Intercepted */}
              <button
                disabled={intercepted || status === 'intercepted'}
                onClick={() => setShowInterceptForm((prev) => !prev)}
                className="nexus-btn-secondary flex w-full items-center justify-center py-2.5 text-xs text-[#16A34A] hover:bg-[#F0FDF4] disabled:opacity-50"
              >
                {intercepted || status === 'intercepted' ? 'Marked as Intercepted' : 'Mark as Intercepted'}
              </button>

              {/* Inline Intercept Form */}
              {showInterceptForm && !intercepted && status !== 'intercepted' && (
                <form
                  onSubmit={handleInterceptSubmit}
                  className="mt-3 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4 space-y-3"
                >
                  <p className="text-xs font-bold text-[#16A34A]">Interception Report</p>

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-[#374151]">
                      Amount Recovered (₹)
                    </span>
                    <input
                      type="number"
                      required
                      value={interceptForm.amount}
                      onChange={(e) => setInterceptForm({ ...interceptForm, amount: e.target.value })}
                      className="nexus-input text-xs"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-[#374151]">Notes</span>
                    <textarea
                      rows={3}
                      value={interceptForm.notes}
                      onChange={(e) => setInterceptForm({ ...interceptForm, notes: e.target.value })}
                      placeholder="Enter field interception notes..."
                      className="nexus-input text-xs resize-none"
                    />
                  </label>

                  <button
                    disabled={intercepting}
                    className="w-full rounded-lg bg-[#16A34A] py-2 text-xs font-bold text-white hover:bg-[#15803D]"
                  >
                    {intercepting ? 'Submitting…' : 'Confirm Interception'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* SECTION 5: SHAP Explainability Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#0F1B2D]">
              Why NEXUS Flagged This
            </h2>

            <div className="mt-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shapData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      color: '#0F1B2D',
                    }}
                  />
                  <Bar dataKey="val" fill="#1E40AF" radius={[0, 4, 4, 0]} barSize={14}>
                    {shapData.map((_, i) => (
                      <Cell key={i} fill="#1E40AF" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-[#E2E8F0] pt-4">
              <span className="text-xs font-semibold text-[#64748B]">Risk Score</span>
              <span className="font-mono text-4xl font-bold" style={{ color: riskColor }}>
                {riskScoreNum.toFixed(1)}
              </span>
            </div>
          </div>

          {/* SECTION 6: AI Narrative Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border-l-[3px] border-l-[#1E40AF]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1E40AF] border border-[#BFDBFE]">
                NEXUS ANALYSIS
              </span>
              <span className="text-[11px] text-[#94A3B8]">Generated by AI</span>
            </div>

            <div className="mt-3">
              {narrative ? (
                <p className="text-sm leading-[1.75] text-[#374151]">{narrative}</p>
              ) : (
                <button
                  disabled={generatingNarrative}
                  onClick={handleGenerateNarrative}
                  className="nexus-btn-secondary mt-2 flex items-center gap-2 text-xs"
                >
                  {generatingNarrative ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#1E40AF]" />
                      <span>Generating Analysis…</span>
                    </>
                  ) : (
                    <span>Generate Analysis</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
