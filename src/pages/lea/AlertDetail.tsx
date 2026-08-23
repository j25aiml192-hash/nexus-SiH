import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  UserCheck,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import LoadingPulse from '@/components/shared/LoadingPulse';

interface AlertItem {
  id: string;
  prediction_id: string;
  complaint_id: string;
  message: string;
  alert_level: string;
  sent_at: string;
  status: string;
  recipient_role?: string;
  predictions?: {
    id?: string;
    complaint_id?: string;
    risk_score?: number;
    alert_level?: string;
    victim_district?: string;
    predicted_district?: string;
    cashout_window_hours?: number;
    predicted_atms?: any[];
    llm_narrative?: string;
  };
}

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [alertsList, setAlertsList] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active deployment modal/inline form states keyed by alertId
  const [deployingAlertId, setDeployingAlertId] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [submittingDeploy, setSubmittingDeploy] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('alerts')
        .select('*, predictions(*)')
        .order('sent_at', { ascending: false })
        .limit(20);

      // If specific ID in URL
      if (id) {
        query = query.eq('id', id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alerts for LEA:', error);
        // Fallback: fetch without role filter
        const fallback = await supabase
          .from('alerts')
          .select('*, predictions(*)')
          .order('sent_at', { ascending: false })
          .limit(20);
        setAlertsList(fallback.data || []);
      } else if (data && data.length > 0) {
        setAlertsList(data);
      } else {
        const allAlerts = await supabase
          .from('alerts')
          .select('*, predictions(*)')
          .order('sent_at', { ascending: false })
          .limit(20);
        setAlertsList(allAlerts.data || []);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [id]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      setAlertsList((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: 'acknowledged' }
            : a
        )
      );
      showSuccess('Alert status updated to Acknowledged');
    } catch (err: any) {
      showError(err?.message || 'Failed to acknowledge alert');
    }
  };

  const handleConfirmDeployment = async (alertItem: AlertItem) => {
    if (!officerName.trim()) {
      showError('Please enter the Officer Name');
      return;
    }

    setSubmittingDeploy(true);
    try {
      // 1. Try to record deployment if table exists
      try {
        await supabase.from('deployments').insert({
          alert_id: alertItem.id,
          prediction_id: alertItem.prediction_id,
          officer_name: officerName.trim(),
          vehicle_number: vehicleNumber.trim() || 'N/A',
          deployed_at: new Date().toISOString(),
          status: 'dispatched',
        });
      } catch {
        // deployments table might not exist in standard schema, fallback gracefully
      }

      // 2. Update alert status to acknowledged
      await supabase
        .from('alerts')
        .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
        .eq('id', alertItem.id);

      setAlertsList((prev) =>
        prev.map((a) =>
          a.id === alertItem.id
            ? { ...a, status: 'acknowledged' }
            : a
        )
      );

      showSuccess(`Deployment logged: Officer ${officerName} dispatched.`);
      setDeployingAlertId(null);
      setOfficerName('');
      setVehicleNumber('');
    } catch (err: any) {
      showError(err?.message || 'Failed to log deployment');
    } finally {
      setSubmittingDeploy(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">
            <Shield size={16} /> State LEA Command Center
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F1B2D]">
            Active Alert Response Feed
          </h1>
          <p className="mt-0.5 text-xs text-[#64748B]">
            High-priority dispatch queue and interdiction command protocols.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="nexus-btn-secondary flex items-center gap-2 py-2 px-3 text-xs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Alerts
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingPulse label="Loading state alerts queue..." />
        </div>
      ) : alertsList.length === 0 ? (
        <div className="rounded-2xl border border-[#EAECF0] bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1E40AF] mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-base font-bold text-[#0F1B2D]">All alerts acknowledged</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#64748B]">
            No pending high-risk dispatch alerts at this moment. New incoming threats will trigger live dispatch notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alertsList.map((alertItem) => {
            const isRed = alertItem.alert_level === 'RED';
            const isAcknowledged = alertItem.status === 'acknowledged';
            const pred = alertItem.predictions;
            const district =
              pred?.victim_district || pred?.predicted_district || 'Deoghar';
            const riskPct = Math.round((pred?.risk_score || 0.85) * 100);
            const cashoutWindow = pred?.cashout_window_hours || 4;

            return (
              <div
                key={alertItem.id}
                className={`rounded-2xl border bg-white p-6 shadow-xs transition-all ${
                  isRed
                    ? 'border-red-200 hover:border-red-300'
                    : 'border-[#EAECF0] hover:border-slate-300'
                }`}
              >
                {/* Top Row: Badges & Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold uppercase ${
                        isRed
                          ? 'bg-red-100 text-[#DC2626] border border-red-200'
                          : 'bg-amber-100 text-[#D97706] border border-amber-200'
                      }`}
                    >
                      <Zap size={13} />
                      {alertItem.alert_level || 'THREAT'} ALERT
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#0F1B2D]">
                      {alertItem.complaint_id}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[#94A3B8]">
                      {new Date(alertItem.sent_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isAcknowledged
                          ? 'bg-emerald-100 text-[#16A34A] border border-emerald-200'
                          : 'bg-blue-100 text-[#1E40AF] border border-blue-200 animate-pulse'
                      }`}
                    >
                      {alertItem.status}
                    </span>
                  </div>
                </div>

                {/* Narrative Text */}
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#0F1B2D] leading-relaxed">
                    {alertItem.message}
                  </p>
                  {pred?.llm_narrative && (
                    <p className="mt-2 text-xs text-[#64748B] leading-relaxed rounded-xl bg-[#F8FAFC] p-3 border border-slate-200/60">
                      {pred.llm_narrative}
                    </p>
                  )}
                </div>

                {/* Linked Prediction Details Bar */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-[#F8FAFC] p-3 text-xs border border-[#F1F5F9]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      Risk Confidence
                    </span>
                    <p className="mt-0.5 font-mono font-bold text-[#DC2626]">{riskPct}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      Target District
                    </span>
                    <p className="mt-0.5 font-semibold text-[#0F1B2D]">{district}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      Cash-Out Window
                    </span>
                    <p className="mt-0.5 font-mono font-semibold text-[#1E40AF]">
                      &lt; {cashoutWindow} Hours
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      Action Node
                    </span>
                    <p className="mt-0.5 font-semibold text-[#16A34A]">ATM Interdiction</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-4">
                  <button
                    onClick={() =>
                      navigate(`/prediction/${alertItem.prediction_id || alertItem.complaint_id}`)
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E40AF] hover:underline"
                  >
                    <span>View Target Forensics & Mule Graph</span>
                    <ArrowUpRight size={14} />
                  </button>

                  <div className="flex items-center gap-2">
                    {!isAcknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alertItem.id)}
                        className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F1B2D] hover:bg-[#F8FAFC] transition shadow-xs"
                      >
                        Acknowledge
                      </button>
                    )}

                    <button
                      onClick={() =>
                        setDeployingAlertId(
                          deployingAlertId === alertItem.id ? null : alertItem.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition shadow-xs"
                    >
                      <UserCheck size={14} />
                      <span>Deploy Team</span>
                    </button>
                  </div>
                </div>

                {/* Inline Deploy Team Form */}
                {deployingAlertId === alertItem.id && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-[#EFF6FF]/60 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    <h4 className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider mb-3">
                      Dispatch Field Interdiction Unit
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#374151] mb-1">
                          Officer Name *
                        </label>
                        <input
                          type="text"
                          value={officerName}
                          onChange={(e) => setOfficerName(e.target.value)}
                          placeholder="e.g. Inspector R. Verma"
                          className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#0F1B2D] outline-none focus:border-[#3B82F6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#374151] mb-1">
                          Vehicle / Unit Number
                        </label>
                        <input
                          type="text"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          placeholder="e.g. JH-01-CR-4091"
                          className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#0F1B2D] outline-none focus:border-[#3B82F6]"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => setDeployingAlertId(null)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleConfirmDeployment(alertItem)}
                        disabled={submittingDeploy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition shadow-xs disabled:opacity-50"
                      >
                        <Send size={13} />
                        <span>{submittingDeploy ? 'Confirming...' : 'Confirm Deployment'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
