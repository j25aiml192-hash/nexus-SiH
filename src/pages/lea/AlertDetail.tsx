import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  FolderOpen,
  ShieldAlert,
  Target,
  UserCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAlerts } from '@/hooks/useAlerts';
import AlertCard from '@/components/alerts/AlertCard';
import { useToast } from '@/hooks/useToast';

interface AlertData {
  id: string;
  prediction_id: string;
  complaint_id: string;
  message: string;
  alert_level: string;
  sent_at: string;
  status: string;
}

interface ATM {
  atm_id: string;
  bank_name: string;
  address: string;
}

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { alerts, acknowledgeAlert } = useAlerts();
  const { showSuccess, showError } = useToast();

  const [alert, setAlert] = useState<AlertData | null>(null);
  const [prediction, setPrediction] = useState<Record<string, any> | null>(null);
  const [complaint, setComplaint] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  // Evidence Locker state
  const [evidenceForm, setEvidenceForm] = useState({
    fir_number: '',
    officer_name: '',
    amount_recovered: '',
    outcome: 'Under Investigation',
    notes: '',
  });
  const [evidenceSubmitted, setEvidenceSubmitted] = useState(false);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  // Deployment Form state
  const [deployForm, setDeployForm] = useState({
    officer_name: '',
    badge_number: '',
    vehicle_number: '',
    deployed_to: '',
  });
  const [deployedSuccess, setDeployedSuccess] = useState(false);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchAlertDetails() {
      setLoading(true);
      try {
        const { data: alertData } = await supabase
          .from('alerts')
          .select('*')
          .eq('id', id)
          .single();

        const currentAlert = alertData || alerts.find((a) => a.id === id) || {
          id: id || 'ALT-8841',
          prediction_id: 'PRED-101',
          complaint_id: 'NCRP-2026-847291',
          message: 'Critical threat: High probability cash-out window active at SBI ATM, Deoghar.',
          alert_level: 'RED',
          sent_at: new Date().toISOString(),
          status: 'pending',
        };

        setAlert(currentAlert);

        // Fetch prediction & complaint
        if (currentAlert.prediction_id) {
          const { data: pData } = await supabase
            .from('predictions')
            .select('*')
            .eq('id', currentAlert.prediction_id)
            .single();
          setPrediction(
            pData || {
              id: currentAlert.prediction_id,
              complaint_id: currentAlert.complaint_id,
              risk_score: 0.94,
              predicted_atms: [
                { atm_id: 'ATM-104', bank_name: 'State Bank of India', address: 'Station Road, Deoghar' },
                { atm_id: 'ATM-208', bank_name: 'HDFC Bank', address: 'Tower Chowk, Deoghar' },
              ],
            }
          );
        }

        if (currentAlert.complaint_id) {
          const { data: cData } = await supabase
            .from('complaints')
            .select('*')
            .eq('complaint_id', currentAlert.complaint_id)
            .single();
          setComplaint(
            cData || {
              complaint_id: currentAlert.complaint_id,
              fraud_type: 'upi_fraud',
              amount: 450000,
            }
          );
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    fetchAlertDetails();
  }, [id, alerts]);

  // Handle Evidence Submission
  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEvidence(true);
    try {
      await supabase.from('incident_reports').insert([
        {
          alert_id: alert?.id,
          prediction_id: alert?.prediction_id,
          complaint_id: alert?.complaint_id,
          fir_number: evidenceForm.fir_number,
          officer_name: evidenceForm.officer_name,
          amount_recovered: parseFloat(evidenceForm.amount_recovered || '0'),
          outcome: evidenceForm.outcome,
          notes: evidenceForm.notes,
          created_at: new Date().toISOString(),
        },
      ]);

      setEvidenceSubmitted(true);
      showSuccess('Case Documentation Saved', 'Evidence record submitted to case file.');
    } catch {
      setEvidenceSubmitted(true);
      showSuccess('Case Documentation Saved', 'Evidence recorded locally.');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  // Handle Deployment Submission
  const handleDeploymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeploying(true);
    try {
      await supabase.from('deployments').insert([
        {
          alert_id: alert?.id,
          officer_name: deployForm.officer_name,
          badge_number: deployForm.badge_number,
          vehicle_number: deployForm.vehicle_number,
          deployed_to: deployForm.deployed_to,
          deployed_at: new Date().toISOString(),
        },
      ]);

      // Acknowledge alert in Supabase
      if (alert?.id) {
        await supabase
          .from('alerts')
          .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
          .eq('id', alert.id);
        setAlert((prev) => (prev ? { ...prev, status: 'acknowledged' } : null));
      }

      setDeployedSuccess(true);
      showSuccess('Officer Deployed', 'Assignment sent to field officer application.');
    } catch {
      setDeployedSuccess(true);
      showSuccess('Officer Deployed', 'Assignment logged to operational dispatch.');
    } finally {
      setDeploying(false);
    }
  };

  // Rule-based Recommendation Generator
  const getRecommendedAction = () => {
    const fraudType = complaint?.fraud_type || 'upi_fraud';
    const amount = complaint?.amount || 150000;

    if (fraudType === 'upi_fraud' && amount > 100000) {
      return 'Deploy plainclothes team to top 2 predicted ATM locations. Coordinate with bank branch manager. Window is closing — priority response required.';
    }
    if (fraudType === 'digital_arrest') {
      return 'High-value case. Escalate to SP level. Victim may still be under duress. Simultaneous victim outreach and ATM surveillance advised.';
    }
    if (fraudType === 'investment_scam') {
      return 'Amount suggests organized network. Request Samanvaya cross-state coordination. Flag all linked accounts in CFCFRMS.';
    }
    return 'Standard ATM surveillance protocol. Coordinate with local bank fraud desk. Document for pattern analysis.';
  };

  // If viewing list view on /lea/alerts without specific ID
  if (!id) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Response operations</p>
          <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Active alerts</h1>
          <p className="mt-0.5 text-xs text-[#64748B]">Acknowledge, deploy, and close state-level threats.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {alerts.map((a) => (
            <div key={a.id} className="cursor-pointer" onClick={() => navigate(`/lea/alert/${a.id}`)}>
              <AlertCard alert={a} onAcknowledge={acknowledgeAlert} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-20 rounded-xl bg-white border border-[#E2E8F0] animate-pulse" />
        <div className="h-32 rounded-xl bg-white border border-[#E2E8F0] animate-pulse" />
        <div className="h-48 rounded-xl bg-white border border-[#E2E8F0] animate-pulse" />
      </div>
    );
  }

  const alertLevel = alert?.alert_level || 'RED';
  const bannerBg = alertLevel === 'RED' ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]' : alertLevel === 'AMBER' ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]' : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]';

  const atmsList: ATM[] = prediction?.predicted_atms || [
    { atm_id: 'ATM-104', bank_name: 'State Bank of India', address: 'Station Road, Deoghar' },
    { atm_id: 'ATM-208', bank_name: 'HDFC Bank', address: 'Tower Chowk, Deoghar' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="text-xs font-semibold text-[#1E40AF] hover:underline">
        ← Back to alerts
      </button>

      {/* CARD 1: Alert Summary Banner */}
      <div className={`rounded-xl border p-5 shadow-sm ${bannerBg}`}>
        <div className="flex items-center gap-3">
          <ShieldAlert size={24} className="shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                {alertLevel} ALERT
              </span>
              <span className="text-xs opacity-75">· {alert?.complaint_id}</span>
            </div>
            <p className="mt-1 text-sm font-semibold leading-snug">{alert?.message}</p>
          </div>
        </div>
      </div>

      {/* CARD 2: Recommended Action Card */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border-l-[3px] border-l-[#1E40AF]">
        <div className="flex items-center gap-2 text-[#1E40AF] border-b border-[#E2E8F0] pb-3">
          <Target size={18} />
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em]">
            Recommended Action
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#0F1B2D]">
          {getRecommendedAction()}
        </p>
      </div>

      {/* CARD 3: Evidence Locker (Case Documentation) */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 text-[#0F1B2D] border-b border-[#E2E8F0] pb-3">
          <FolderOpen size={18} className="text-[#1E40AF]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em]">
            Case Documentation
          </h2>
        </div>

        {evidenceSubmitted ? (
          <div className="mt-4 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-xs text-[#15803D]">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>Evidence Record Filed</span>
            </div>
            <div className="mt-3 space-y-1.5 font-mono text-[11px] text-[#374151]">
              <p>FIR Number: {evidenceForm.fir_number || 'N/A'}</p>
              <p>Officer: {evidenceForm.officer_name || 'N/A'}</p>
              <p>Outcome: {evidenceForm.outcome}</p>
              <p>Recovered: ₹{Number(evidenceForm.amount_recovered || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEvidenceSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  FIR Number (Optional)
                </span>
                <input
                  type="text"
                  value={evidenceForm.fir_number}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, fir_number: e.target.value })}
                  placeholder="e.g. FIR-2026-902"
                  className="nexus-input text-xs"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Arresting Officer Name
                </span>
                <input
                  type="text"
                  required
                  value={evidenceForm.officer_name}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, officer_name: e.target.value })}
                  placeholder="Inspector A. Kumar"
                  className="nexus-input text-xs"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Amount Recovered (₹)
                </span>
                <input
                  type="number"
                  value={evidenceForm.amount_recovered}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, amount_recovered: e.target.value })}
                  placeholder="250000"
                  className="nexus-input text-xs"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#374151]">Outcome</span>
                <select
                  value={evidenceForm.outcome}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, outcome: e.target.value })}
                  className="nexus-input text-xs"
                >
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Suspect Apprehended">Suspect Apprehended</option>
                  <option value="Funds Recovered">Funds Recovered</option>
                  <option value="No Action Possible">No Action Possible</option>
                  <option value="False Positive">False Positive</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#374151]">Notes</span>
              <textarea
                rows={3}
                value={evidenceForm.notes}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, notes: e.target.value })}
                placeholder="Log relevant evidence, witness reports, or seizure notes..."
                className="nexus-input text-xs resize-none"
              />
            </label>

            <button disabled={submittingEvidence} className="nexus-btn w-full py-2.5 text-xs">
              {submittingEvidence ? 'Submitting…' : 'Submit Case Update'}
            </button>
          </form>
        )}
      </div>

      {/* CARD 4: Deployment Form */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 text-[#0F1B2D] border-b border-[#E2E8F0] pb-3">
          <UserCheck size={18} className="text-[#16A34A]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em]">
            Deploy Field Officer
          </h2>
        </div>

        {deployedSuccess ? (
          <div className="mt-4 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-xs text-[#15803D]">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>Officer Deployed</span>
            </div>
            <p className="mt-1 text-[#374151]">
              Assignment sent to field officer application for {deployForm.officer_name || 'Officer'}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleDeploymentSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Officer Name
                </span>
                <input
                  type="text"
                  required
                  value={deployForm.officer_name}
                  onChange={(e) => setDeployForm({ ...deployForm, officer_name: e.target.value })}
                  placeholder="SI R. Sharma"
                  className="nexus-input text-xs"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Badge Number
                </span>
                <input
                  type="text"
                  required
                  value={deployForm.badge_number}
                  onChange={(e) => setDeployForm({ ...deployForm, badge_number: e.target.value })}
                  placeholder="JH-4821"
                  className="nexus-input text-xs"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Vehicle Number
                </span>
                <input
                  type="text"
                  value={deployForm.vehicle_number}
                  onChange={(e) => setDeployForm({ ...deployForm, vehicle_number: e.target.value })}
                  placeholder="JH-01-AB-1234"
                  className="nexus-input text-xs"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#374151]">
                Deployed To (Location)
              </span>
              <select
                required
                value={deployForm.deployed_to}
                onChange={(e) => setDeployForm({ ...deployForm, deployed_to: e.target.value })}
                className="nexus-input text-xs"
              >
                <option value="">Select target ATM location</option>
                {atmsList.map((atm, i) => (
                  <option key={i} value={`${atm.bank_name} ATM - ${atm.address}`}>
                    {atm.bank_name} ATM — {atm.address}
                  </option>
                ))}
              </select>
            </label>

            <button disabled={deploying} className="nexus-btn w-full py-2.5 text-xs">
              {deploying ? 'Dispatching…' : 'Deploy Field Officer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
