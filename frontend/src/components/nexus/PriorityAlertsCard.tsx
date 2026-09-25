import React from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
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

export const PriorityAlertsCard: React.FC<PriorityAlertsCardProps> = ({ alerts = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="nexus-box-card">
      <div className="nexus-box-card-header">
        <div>
          <h3 className="nexus-box-title">Priority Alerts</h3>
          <p className="nexus-box-subtitle">Highest-risk accounts inside an open cash-out window</p>
        </div>
        <button
          onClick={() => navigate('/alerts')}
          className="nexus-link-btn flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-xs font-semibold"
        >
          View all <ArrowRight size={13} />
        </button>
      </div>

      <div className="nexus-priority-list">
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#64748B]">No active critical alerts found.</div>
        ) : (
          alerts.map((alert) => {
            const complaintId = alert.complaint_id;
            const riskPct = Math.round((alert.risk_score || 0.85) * 100);
            const level = alert.severity || 'CRITICAL';
            const bank = alert.accused_bank || 'National Bank';

            return (
              <div
                key={alert.alert_id || alert.id || complaintId}
                onClick={() => navigate(`/complaints/${complaintId}`)}
                className="nexus-priority-row cursor-pointer"
              >
                <div className="nexus-priority-left">
                  <span className={`nexus-badge-risk nexus-badge-${level.toLowerCase()}`}>
                    {level}
                  </span>
                  <div className="nexus-priority-info">
                    <div className="nexus-priority-accounts">
                      <span className="font-semibold text-[#102A2A]">{bank}</span>
                      <span className="text-[#64748B] ml-2">Case {complaintId}</span>
                    </div>
                    <div className="nexus-priority-branch text-[#64748B] text-xs">
                      {alert.message || 'Rapid cashout extraction pattern detected.'}
                    </div>
                  </div>
                </div>

                <div className="nexus-priority-right">
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#102A2A] font-mono">
                      {riskPct}% <span className="text-[10px] text-[#64748B] font-sans font-normal">RISK</span>
                    </div>
                  </div>
                  <div className="text-right min-w-[90px]">
                    <div className="text-xs font-semibold text-[#DC2626] font-mono whitespace-nowrap">
                      {alert.cashout_window_hours}h Window
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#94A3B8] ml-1 flex-shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
