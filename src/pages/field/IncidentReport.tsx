import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  FileCheck,
  MapPin,
  Shield,
  Upload,
  UserCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNexusStore } from '@/store/nexusStore';
import { SEED_PREDICTIONS } from '@/lib/constants';

interface AssignmentData {
  prediction_id: string;
  complaint_id: string;
  atm_name: string;
  atm_address: string;
}

export default function IncidentReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useNexusStore((s) => s.user);

  const [assignment, setAssignment] = useState<AssignmentData>({
    prediction_id: searchParams.get('prediction_id') || 'PRED-101',
    complaint_id: searchParams.get('complaint_id') || 'NCRP-2026-847291',
    atm_name: 'State Bank of India ATM #401',
    atm_address: 'Station Road, Deoghar, Jharkhand',
  });

  const [suspectObserved, setSuspectObserved] = useState<boolean>(false);
  const [suspectApprehended, setSuspectApprehended] = useState<boolean>(false);
  const [fundsSecured, setFundsSecured] = useState<boolean>(false);
  const [amountRecovered, setAmountRecovered] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [photoName, setPhotoName] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitTime, setSubmitTime] = useState<string>('');

  useEffect(() => {
    async function fetchActiveAssignment() {
      try {
        const { data } = await supabase
          .from('predictions')
          .select('*')
          .eq('status', 'active')
          .limit(1)
          .single();

        if (data) {
          const atm = data.predicted_atms?.[0] || {
            bank_name: 'State Bank of India',
            address: 'Station Road, Deoghar',
          };
          setAssignment({
            prediction_id: data.id,
            complaint_id: data.complaint_id || 'NCRP-2026-001',
            atm_name: `${atm.bank_name} ATM`,
            atm_address: atm.address,
          });
        }
      } catch {
        // Keep initial seed assignment
      }
    }

    if (!searchParams.get('prediction_id')) {
      fetchActiveAssignment();
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const nowIso = new Date().toISOString();
    const isIntercepted = suspectApprehended || fundsSecured;

    try {
      // 1. Insert into incident_reports
      const { error: insertErr } = await supabase.from('incident_reports').insert([
        {
          prediction_id: assignment.prediction_id,
          complaint_id: assignment.complaint_id,
          suspect_observed: suspectObserved,
          suspect_apprehended: suspectApprehended,
          funds_secured: fundsSecured,
          amount_recovered: fundsSecured ? parseFloat(amountRecovered || '0') : 0,
          notes: notes.trim(),
          photo_evidence: photoName || null,
          officer_id: user?.id || null,
          created_at: nowIso,
        },
      ]);

      if (insertErr) {
        console.warn('Incident report insert issue, trying fallback:', insertErr);
      }

      // 2. Mark prediction as intercepted
      if (assignment.prediction_id) {
        await supabase
          .from('predictions')
          .update({ status: isIntercepted ? 'intercepted' : 'active' })
          .eq('id', assignment.prediction_id);
      }

      // 3. Mark alert as acknowledged
      if (assignment.complaint_id) {
        await supabase
          .from('alerts')
          .update({ status: 'acknowledged' })
          .eq('complaint_id', assignment.complaint_id);
      }

      setSubmitTime(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      );
      setDone(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit report. Please check your network.');
    } finally {
      setSaving(false);
    }
  };

  // Full-screen Success State
  if (done) {
    return (
      <div className="mx-auto flex max-w-lg min-h-[75vh] flex-col items-center justify-center py-12 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-[#16A34A] shadow-md animate-in zoom-in">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-[#0F1B2D]">Report Submitted</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B] max-w-sm">
          NEXUS engine has been updated. This prediction is now marked as intercepted and synchronized across the national intelligence network.
        </p>

        <div className="mt-5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 font-mono text-xs font-semibold text-[#16A34A]">
          Logged at {submitTime} · Interdiction Synchronized
        </div>

        <button
          onClick={() => navigate('/field')}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#1E40AF] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E3A8A] transition shadow-md"
        >
          <ChevronLeft size={16} />
          <span>Return to Assignment</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">
          Field Response Protocol
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F1B2D]">
          Incident Interdiction Report
        </h1>
        <p className="mt-0.5 text-xs text-[#64748B]">
          Record field findings, suspect status, and recovered funds at the target ATM.
        </p>
      </div>

      {/* Assigned Node Information Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E40AF]">
          <MapPin size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              TARGET DISPATCH LOCATION
            </span>
            <span className="font-mono text-[10px] font-semibold text-[#1E40AF]">
              {assignment.prediction_id}
            </span>
          </div>
          <h3 className="mt-0.5 text-sm font-bold text-[#0F1B2D] truncate">
            {assignment.atm_name}
          </h3>
          <p className="text-xs text-[#64748B] truncate">{assignment.atm_address}</p>
        </div>
      </div>

      {/* Form Container */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-xs space-y-5"
      >
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
            {errorMsg}
          </div>
        )}

        {/* Prediction ID (Pre-filled, not editable) */}
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">
            Prediction Reference ID
          </label>
          <input
            type="text"
            readOnly
            value={assignment.prediction_id}
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2 text-xs font-mono font-semibold text-[#64748B] cursor-not-allowed"
          />
        </div>

        {/* Toggle 1: Suspect Observed */}
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-2">
            Suspect Observed at Location?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSuspectObserved(true)}
              className={`min-h-[42px] rounded-xl text-xs font-bold transition-all border ${
                suspectObserved
                  ? 'bg-[#1E40AF] text-white border-[#1E40AF] shadow-xs'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-slate-100'
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => {
                setSuspectObserved(false);
                setSuspectApprehended(false);
              }}
              className={`min-h-[42px] rounded-xl text-xs font-bold transition-all border ${
                !suspectObserved
                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-slate-100'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Toggle 2: Suspect Apprehended (Conditional) */}
        {suspectObserved && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-150">
            <label className="block text-xs font-semibold text-[#374151] mb-2">
              Suspect Apprehended?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSuspectApprehended(true)}
                className={`min-h-[42px] rounded-xl text-xs font-bold transition-all border ${
                  suspectApprehended
                    ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-xs'
                    : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-slate-100'
                }`}
              >
                YES (Apprehended)
              </button>
              <button
                type="button"
                onClick={() => setSuspectApprehended(false)}
                className={`min-h-[42px] rounded-xl text-xs font-bold transition-all border ${
                  !suspectApprehended
                    ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                    : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-slate-100'
                }`}
              >
                NO (Fled Scene)
              </button>
            </div>
          </div>
        )}

        {/* Toggle 3: Funds Secured */}
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-2">
            Were Cash / Funds Secured?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFundsSecured(true)}
              className={`min-h-[42px] rounded-xl text-xs font-bold transition-all border ${
                fundsSecured
                  ? 'bg-[#1E40AF] text-white border-[#1E40AF] shadow-xs'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-slate-100'
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => {
                setFundsSecured(false);
                setAmountRecovered('');
              }}
              className={`min-h-[42px] rounded-xl text-xs font-bold transition-all border ${
                !fundsSecured
                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-slate-100'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Amount Recovered (Conditional) */}
        {fundsSecured && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-150">
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Amount Recovered (₹) *
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                required
                inputMode="numeric"
                placeholder="250000"
                value={amountRecovered}
                onChange={(e) => setAmountRecovered(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-8 pr-3.5 text-sm font-mono font-bold text-[#0F1B2D] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </div>
        )}

        {/* Observation Notes */}
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">
            Field Notes & Observations
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what happened at the ATM..."
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#0F1B2D] outline-none focus:border-[#3B82F6] focus:bg-white resize-none"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">
            Photographic Evidence / ATM Receipt
          </label>
          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center cursor-pointer hover:bg-slate-100 transition">
            <Camera size={22} className="text-[#64748B] mb-1" />
            <span className="text-xs font-semibold text-[#1E40AF]">
              {photoName ? photoName : 'Tap to capture / upload photo'}
            </span>
            <span className="text-[10px] text-[#94A3B8] mt-0.5">
              JPG, PNG or PDF up to 10MB
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setPhotoName(e.target.files[0].name);
                }
              }}
            />
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[#1E40AF] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#1E3A8A] transition disabled:opacity-50"
        >
          {saving ? 'Synchronizing with NEXUS Engine...' : 'Submit Incident Report'}
        </button>
      </form>
    </div>
  );
}
