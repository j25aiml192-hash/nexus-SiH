import { Map, Navigation, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RecoveryRing from '@/components/predictions/RecoveryRing';
import { SEED_PREDICTIONS, FRAUD_TYPE_DESCRIPTIONS } from '@/lib/constants';

export default function Assignment() {
  const navigate = useNavigate();
  const prediction = SEED_PREDICTIONS[0];
  const atm = prediction.predicted_atms[0];

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Field response unit</p>
        <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">My assignment</h1>
        <p className="mt-0.5 text-xs text-[#64748B]">Priority interception · {prediction.complaint_id}</p>
      </div>

      <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">Priority location</p>
            <h2 className="mt-1.5 text-lg font-bold text-[#0F1B2D]">{atm.bank_name} ATM</h2>
            <p className="mt-0.5 text-xs text-[#64748B]">{atm.address}</p>
          </div>
          <Map className="text-[#DC2626]" size={24} />
        </div>
        <button
          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${atm.lat},${atm.lng}`, '_blank')}
          className="nexus-btn mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-xs"
        >
          <Navigation size={15} /> Get directions
        </button>
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white py-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <RecoveryRing
          cashoutWindowHours={prediction.cashout_window_hours}
          createdAt={prediction.created_at}
          status={prediction.status}
          size={190}
        />
        <p className="mt-5 font-mono text-2xl font-bold text-[#DC2626]">02:14:36</p>
        <p className="mt-0.5 text-xs uppercase tracking-widest text-[#64748B]">estimated window remaining</p>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 text-[#1E40AF]">
          <PhoneCall size={16} />
          <p className="text-xs font-semibold uppercase tracking-wider">Field guidance</p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#0F1B2D]">{FRAUD_TYPE_DESCRIPTIONS.upi_fraud}</p>
      </div>

      <button onClick={() => navigate('/field/report')} className="nexus-btn flex w-full items-center justify-center py-3 text-xs">
        File incident report
      </button>
    </div>
  );
}
