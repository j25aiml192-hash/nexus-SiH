import React, { useEffect, useState } from 'react';
import { Map, Navigation, PhoneCall, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import RecoveryRing from '@/components/predictions/RecoveryRing';
import { FRAUD_TYPE_DESCRIPTIONS } from '@/lib/constants';

export default function Assignment() {
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssignment() {
      setLoading(true);
      try {
        // 1. Check for assigned alert from Supabase
        const { data: alertData, error: alertError } = await supabase
          .from('alerts')
          .select('*')
          .eq('recipient_role', 'field_officer')
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(1)
          .single();

        if (alertData && !alertError) {
          setAssignment(alertData);
          localStorage.setItem('nexus_assignment', JSON.stringify(alertData));
        } else {
          // 2. Fallback to most recent prediction
          const { data: predData, error: predError } = await supabase
            .from('predictions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (predData && !predError) {
            setAssignment(predData);
            localStorage.setItem('nexus_assignment', JSON.stringify(predData));
          } else {
            // 3. Fallback to local storage if no remote data
            const cached = localStorage.getItem('nexus_assignment');
            if (cached) {
              try {
                setAssignment(JSON.parse(cached));
              } catch {
                setAssignment(null);
              }
            } else {
              setAssignment(null);
            }
          }
        }
      } catch (err) {
        console.warn('Assignment fetch failed, trying offline cache:', err);
        const cached = localStorage.getItem('nexus_assignment');
        if (cached) {
          try {
            setAssignment(JSON.parse(cached));
          } catch {
            setAssignment(null);
          }
        } else {
          setAssignment(null);
        }
      } finally {
        setLoading(false);
      }
    }

    loadAssignment();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: '16px',
          maxWidth: '480px',
          margin: '0 auto',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8A9BB5',
          fontSize: '13px',
        }}
      >
        <Loader2 className="animate-spin mb-2" size={24} color="#00D4FF" />
        Loading assignment details...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="mx-auto max-w-[480px] min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1E40AF] mb-4">
          <Navigation size={26} />
        </div>
        <h3 className="text-base font-bold text-[#0F1B2D]">No Active Dispatch Orders</h3>
        <p className="mt-1 max-w-xs text-xs text-[#64748B] leading-relaxed">
          Stand by for field deployment orders. When a cash-out prediction triggers, your target ATM coordinates will appear here.
        </p>
        <button
          onClick={() => navigate('/field/report')}
          className="mt-5 rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1E3A8A] transition"
        >
          File Standalone Incident Report
        </button>
      </div>
    );
  }

  const lat =
    assignment.predicted_lat ||
    assignment.metadata?.lat ||
    assignment.predicted_atms?.[0]?.lat ||
    24.482;
  const lng =
    assignment.predicted_lng ||
    assignment.metadata?.lng ||
    assignment.predicted_atms?.[0]?.lng ||
    86.702;

  const bankName =
    assignment.predicted_atms?.[0]?.bank_name ||
    assignment.bank_name ||
    assignment.metadata?.bank_name ||
    'Target Cash-out Point';

  const address =
    assignment.predicted_atms?.[0]?.address ||
    assignment.address ||
    assignment.message ||
    'High-risk ATM Cluster Area';

  const complaintId = assignment.complaint_id || assignment.id || 'NEXUS-OPS';
  const cashoutWindowHours = assignment.cashout_window_hours || 4;
  const createdAt = assignment.created_at || assignment.sent_at || new Date().toISOString();
  const status = assignment.status || 'active';

  return (
    <div
      style={{
        padding: '16px',
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
      }}
      className="space-y-4 pb-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Field response unit</p>
        <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">My assignment</h1>
        <p className="mt-0.5 text-xs text-[#64748B]">Priority interception · {complaintId}</p>
      </div>

      <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">Priority location</p>
            <h2 className="mt-1.5 text-lg font-bold text-[#0F1B2D]">{bankName} ATM</h2>
            <p className="mt-0.5 text-xs text-[#64748B]">{address}</p>
          </div>
          <Map className="text-[#DC2626] flex-shrink-0 ml-2" size={24} />
        </div>
        <button
          onClick={() =>
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
          }
          className="nexus-btn mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-xs"
        >
          <Navigation size={15} /> Get directions
        </button>
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white py-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <RecoveryRing
          cashoutWindowHours={cashoutWindowHours}
          createdAt={createdAt}
          status={status}
          size={190}
        />
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 text-[#1E40AF]">
          <PhoneCall size={16} />
          <p className="text-xs font-semibold uppercase tracking-wider">Field guidance</p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#0F1B2D]">{FRAUD_TYPE_DESCRIPTIONS.upi_fraud}</p>
      </div>

      <button
        onClick={() => navigate('/field/report')}
        className="nexus-btn flex w-full items-center justify-center py-3 text-xs"
      >
        File incident report
      </button>
    </div>
  );
}
