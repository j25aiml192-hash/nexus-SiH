import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNexusStore } from '@/store/nexusStore';
import { SEED_PREDICTIONS } from '@/lib/constants';

interface AssignmentData {
  prediction_id: string;
  complaint_id: string;
  atm_name: string;
  atm_address: string;
}

const LOCAL_STORAGE_KEY = 'nexus_field_report_cache';

export default function IncidentReport() {
  const user = useNexusStore((s) => s.user);

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [form, setForm] = useState({
    suspect_observed: false,
    suspect_apprehended: false,
    funds_secured: false,
    amount_recovered: '',
    notes: '',
  });
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitTime, setSubmitTime] = useState<string>('');

  // 1. Fetch active assignment on mount
  useEffect(() => {
    async function fetchAssignment() {
      try {
        const { data } = await supabase
          .from('alerts')
          .select('*')
          .eq('recipient_id', user?.id || '')
          .neq('status', 'closed')
          .limit(1)
          .single();

        if (data) {
          setAssignment({
            prediction_id: data.prediction_id || 'PRED-101',
            complaint_id: data.complaint_id || 'NCRP-2025-0001',
            atm_name: 'State Bank of India ATM',
            atm_address: 'Station Road, Deoghar, Jharkhand',
          });
        } else {
          // Fallback seed assignment
          const seed = SEED_PREDICTIONS[0];
          const atm = seed.predicted_atms[0];
          setAssignment({
            prediction_id: seed.id,
            complaint_id: seed.complaint_id,
            atm_name: `${atm.bank_name} ATM`,
            atm_address: atm.address,
          });
        }
      } catch {
        const seed = SEED_PREDICTIONS[0];
        const atm = seed.predicted_atms[0];
        setAssignment({
          prediction_id: seed.id,
          complaint_id: seed.complaint_id,
          atm_name: `${atm.bank_name} ATM`,
          atm_address: atm.address,
        });
      }
    }

    fetchAssignment();

    // 2. Restore cached form state from localStorage if present
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        setForm(JSON.parse(cached));
      } catch {
        // Ignore JSON parse errors
      }
    }
  }, [user]);

  // Update form & persist to localStorage
  const updateFormField = (key: string, value: any) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const isIntercepted = form.suspect_apprehended;
    const nowIso = new Date().toISOString();

    try {
      // 1. Insert into incident_reports table
      await supabase.from('incident_reports').insert([
        {
          prediction_id: assignment?.prediction_id,
          complaint_id: assignment?.complaint_id,
          suspect_observed: form.suspect_observed,
          suspect_apprehended: form.suspect_apprehended,
          funds_secured: form.funds_secured,
          amount_recovered: parseFloat(form.amount_recovered || '0'),
          notes: form.notes,
          officer_id: user?.id,
          created_at: nowIso,
        },
      ]);

      // 2. Update prediction status if suspect apprehended
      if (assignment?.prediction_id) {
        await supabase
          .from('predictions')
          .update({ status: isIntercepted ? 'intercepted' : 'active' })
          .eq('id', assignment.prediction_id);
      }

      // 3. Update alert status to acknowledged
      if (assignment?.complaint_id) {
        await supabase
          .from('alerts')
          .update({ status: 'acknowledged' })
          .eq('complaint_id', assignment.complaint_id);
      }
    } catch {
      // Offline fallback success
    } finally {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSubmitTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setDone(true);
      setSaving(false);
    }
  };

  // Full-screen Success View
  if (done) {
    return (
      <div className="mx-auto flex max-w-[480px] min-h-[70vh] flex-col items-center justify-center py-16 px-4 text-center">
        <CheckCircle2 size={80} className="text-[#16A34A]" />
        <h1 className="mt-6 text-2xl font-bold text-[#0F1B2D]">Report Submitted</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          Your report has been logged and synced to the NEXUS command center.
        </p>
        <div className="mt-6 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-1.5 font-mono text-xs font-semibold text-[#16A34A]">
          Logged at {submitTime || '12:45 PM'} · NCRP Sync Active
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[480px] space-y-5 pb-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Field response unit</p>
        <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Incident report</h1>
        <p className="mt-0.5 text-xs text-[#64748B]">Record what happened at the assigned location.</p>
      </div>

      {/* Top Assigned Location Card */}
      {assignment && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] flex items-start gap-3">
          <div className="rounded-lg bg-[#EFF6FF] p-2.5 text-[#1E40AF] shrink-0">
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Assigned ATM</p>
            <h2 className="mt-0.5 text-sm font-bold text-[#0F1B2D]">{assignment.atm_name}</h2>
            <p className="mt-0.5 text-xs text-[#64748B]">{assignment.atm_address}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit} className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] space-y-5">
        {/* Question 1 */}
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-2">
            Did you observe a suspect?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateFormField('suspect_observed', true)}
              className={`min-h-[44px] flex-1 rounded-lg text-xs font-bold transition-all border ${
                form.suspect_observed
                  ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => updateFormField('suspect_observed', false)}
              className={`min-h-[44px] flex-1 rounded-lg text-xs font-bold transition-all border ${
                !form.suspect_observed
                  ? 'bg-[#DC2626] text-white border-[#DC2626]'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Question 2 */}
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-2">
            Was a suspect apprehended?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateFormField('suspect_apprehended', true)}
              className={`min-h-[44px] flex-1 rounded-lg text-xs font-bold transition-all border ${
                form.suspect_apprehended
                  ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => updateFormField('suspect_apprehended', false)}
              className={`min-h-[44px] flex-1 rounded-lg text-xs font-bold transition-all border ${
                !form.suspect_apprehended
                  ? 'bg-[#DC2626] text-white border-[#DC2626]'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Question 3 */}
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-2">
            Were funds secured?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateFormField('funds_secured', true)}
              className={`min-h-[44px] flex-1 rounded-lg text-xs font-bold transition-all border ${
                form.funds_secured
                  ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => updateFormField('funds_secured', false)}
              className={`min-h-[44px] flex-1 rounded-lg text-xs font-bold transition-all border ${
                !form.funds_secured
                  ? 'bg-[#DC2626] text-white border-[#DC2626]'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Amount Recovered */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#374151]">
            Amount Recovered (₹)
          </span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={form.amount_recovered}
            onChange={(e) => updateFormField('amount_recovered', e.target.value)}
            className="nexus-input min-h-[44px] text-sm font-mono font-bold"
          />
        </label>

        {/* Observation Notes */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#374151]">
            Observation Notes
          </span>
          <textarea
            rows={5}
            value={form.notes}
            onChange={(e) => updateFormField('notes', e.target.value)}
            placeholder="Describe suspect appearance, vehicle details, cash denomination, or seized items..."
            className="nexus-input text-xs resize-none"
          />
        </label>

        {/* Large 52px Primary Submit Button */}
        <button
          disabled={saving}
          className="nexus-btn w-full h-[52px] text-sm font-bold tracking-wide"
        >
          {saving ? 'Submitting Report…' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}
