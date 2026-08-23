import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { FRAUD_TYPES, INDIAN_STATES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { ingestComplaintBackend } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

async function generateSha256Hash(input: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ComplaintModal({ onClose }: { onClose: () => void }) {
  const { showSuccess, showInfo, showError } = useToast();
  const [form, setForm] = useState({
    fraud_type: 'upi_fraud',
    amount: '',
    victim_state: 'Jharkhand',
    victim_district: '',
    accused_phone_prefix: '',
    accused_bank: '',
    filed_at: new Date().toISOString().slice(0, 16),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.victim_district || form.accused_phone_prefix.length < 5) {
      setError('Please complete all required fields.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const year = new Date().getFullYear();
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const complaint_id = `NCRP-${year}-${randomDigits}`;

      const rawHashInput = `${form.accused_bank}${form.accused_phone_prefix}${complaint_id}`;
      const accused_account_hash = await generateSha256Hash(rawHashInput);

      const complaintData = {
        complaint_id,
        fraud_type: form.fraud_type,
        amount: parseFloat(form.amount),
        filed_at: new Date(form.filed_at).toISOString(),
        victim_state: form.victim_state,
        victim_district: form.victim_district,
        accused_phone_prefix: form.accused_phone_prefix,
        accused_bank: form.accused_bank || 'State Bank of India',
        accused_account_hash,
        mule_chain_depth: 2,
        status: 'pending',
      };

      // 1. Insert directly into Supabase complaints table
      const { error: dbError } = await supabase.from('complaints').insert([complaintData]);
      if (dbError) {
        console.warn('Supabase direct insert notice:', dbError.message);
      }

      // 2. Call backend POST /api/complaints/ingest
      let backendSuccess = false;
      try {
        await ingestComplaintBackend(complaint_id);
        backendSuccess = true;
      } catch (backendErr) {
        console.warn('Backend engine ingestion offline:', backendErr);
      }

      if (backendSuccess) {
        showSuccess(`Complaint ${complaint_id} ingested`, 'NEXUS engine processing prediction.');
      } else {
        showInfo(`Complaint ${complaint_id} saved`, 'Prediction engine offline — connect backend to generate prediction.');
      }

      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred saving the complaint.';
      setError(msg);
      showError('Ingestion error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] p-5">
          <div>
            <h2 className="text-base font-semibold text-[#0F1B2D]">Ingest new complaint</h2>
            <p className="mt-0.5 text-xs text-[#64748B]">Feed the autonomous prediction loop</p>
          </div>
          <button onClick={onClose} className="text-[#64748B] transition hover:text-[#0F1B2D]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
          {[
            ['fraud_type', 'Fraud type'],
            ['amount', 'Amount (₹)'],
            ['victim_state', 'Victim state'],
            ['victim_district', 'Victim district'],
            ['accused_phone_prefix', 'Accused phone prefix'],
            ['accused_bank', 'Accused bank'],
            ['filed_at', 'Time of fraud'],
          ].map(([key, label]) => (
            <label key={key} className={key === 'filed_at' ? 'sm:col-span-2' : 'block'}>
              <span className="mb-1.5 block text-xs font-medium text-[#374151]">{label}</span>
              {key === 'fraud_type' ? (
                <select className="nexus-input" value={form.fraud_type} onChange={(e) => update(key, e.target.value)}>
                  {FRAUD_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : key === 'victim_state' ? (
                <select className="nexus-input" value={form.victim_state} onChange={(e) => update(key, e.target.value)}>
                  {INDIAN_STATES.map((state) => (
                    <option key={state}>{state}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="nexus-input"
                  type={key === 'amount' ? 'number' : key === 'filed_at' ? 'datetime-local' : 'text'}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={key === 'accused_phone_prefix' ? '76XXX' : key === 'accused_bank' ? 'HDFC Bank' : ''}
                />
              )}
            </label>
          ))}
          {error && (
            <p className="sm:col-span-2 rounded-lg bg-[#FEF2F2] p-3 text-xs text-[#DC2626] border border-[#FECACA]">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 sm:col-span-2 mt-2">
            <button type="button" onClick={onClose} className="nexus-btn-secondary">
              Cancel
            </button>
            <button disabled={loading} className="nexus-btn">
              {loading ? 'Processing…' : 'Ingest complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
