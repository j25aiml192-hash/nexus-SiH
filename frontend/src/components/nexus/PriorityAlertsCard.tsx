import React from 'react';
import { ArrowRight, ChevronRight, ShieldAlert, Clock, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PriorityAlertsCardProps {
  alerts?: Array<{
    alert_id?: string;
    id?: string;
    complaint_id: string;
    message: string;
    severity: string;
    created_at: string;
    risk_score: number;
    cashout_window_hours: number;
    amount_inr: number;
    accused_bank?: string;
  }>;
}

const DEFAULT_PRIORITY_ITEMS = [
  {
    alert_id: 'ALT-9081',
    id: 'ALT-9081',
    complaint_id: 'CMP-2026-9081',
    accused_bank: 'Airtel Payments Bank',
    risk_score: 0.94,
    cashout_window_hours: 4,
    severity: 'CRITICAL',
    message: 'NEXUS CRITICAL: Rs 8,45,000 digital arrest fraud. Immediate extraction window.',
    created_at: new Date().toISOString(),
    amount_inr: 845000,
  },
  {
    alert_id: 'ALT-9082',
    id: 'ALT-9082',
    complaint_id: 'CMP-2026-9082',
    accused_bank: 'Paytm Payments Bank',
    risk_score: 0.89,
    cashout_window_hours: 6,
    severity: 'HIGH',
    message: 'NEXUS RED ALERT: Rapid UPI disbursement targeting Nuh-Taoru corridor.',
    created_at: new Date().toISOString(),
    amount_inr: 480000,
  },
  {
    alert_id: 'ALT-9083',
    id: 'ALT-9083',
    complaint_id: 'CMP-2026-9083',
    accused_bank: 'HDFC Bank',
    risk_score: 0.80,
    cashout_window_hours: 12,
    severity: 'HIGH',
    message: 'NEXUS RED: High-value investment scam Rs 12.5L. Cashout in Giridih district.',
    created_at: new Date().toISOString(),
    amount_inr: 1250000,
  },
];

export const PriorityAlertsCard: React.FC<PriorityAlertsCardProps> = ({ alerts = [] }) => {
  const navigate = useNavigate();
  const displayAlerts = (alerts.length > 0 ? alerts : DEFAULT_PRIORITY_ITEMS).slice(0, 3);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0B192C] text-slate-100 p-5 shadow-lg overflow-hidden min-w-0">
      <div className="pb-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-700/50 text-red-400 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">Priority Threat Alerts</h3>
            <p className="text-xs text-slate-400">
              Highest-risk accounts inside active cash-out window
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/alerts')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-all cursor-pointer shrink-0"
        >
          <span>View All Alerts</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="divide-y divide-slate-800/80 mt-1">
        {displayAlerts.map((alert) => {
          const complaintId = alert.complaint_id;
          const isCritical = alert.severity === 'CRITICAL';

          return (
            <div
              key={alert.alert_id || alert.id || alert.complaint_id}
              onClick={() => navigate(`/prediction/${complaintId}`)}
              className="p-3.5 hover:bg-slate-900/60 transition-all cursor-pointer rounded-xl my-1 group border border-transparent hover:border-slate-800"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isCritical
                        ? 'bg-red-950 text-red-400 border border-red-700/60 animate-pulse'
                        : 'bg-amber-950 text-amber-400 border border-amber-700/60'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {alert.complaint_id}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-emerald-400 font-bold">
                    ₹{(alert.amount_inr / 100000).toFixed(1)} L
                  </span>
                  <ChevronRight size={14} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed mb-2">
                {alert.message}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-1">
                  <Building2 size={12} className="text-slate-500" />
                  <span>{alert.accused_bank || 'Paytm Bank'}</span>
                </div>
                <div className="flex items-center gap-1 text-cyan-400 font-semibold">
                  <Clock size={12} />
                  <span>Window: {alert.cashout_window_hours}h remaining</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
