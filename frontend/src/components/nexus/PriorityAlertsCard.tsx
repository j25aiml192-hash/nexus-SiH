import React from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PRIORITY_ALERTS } from '../../data/nexus-data';

export const PriorityAlertsCard: React.FC = () => {
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
        {PRIORITY_ALERTS.map((alert) => {
          const complaintCleanId = alert.complaintId.replace('#', '');
          return (
            <div
              key={alert.id}
              onClick={() => navigate(`/complaints/${complaintCleanId}`)}
              className="nexus-priority-row cursor-pointer"
            >
              <div className="nexus-priority-left">
                <span className={`nexus-badge-risk nexus-badge-${alert.riskLevel.toLowerCase()}`}>
                  {alert.riskLevel}
                </span>
                <div className="nexus-priority-info">
                  <div className="nexus-priority-accounts">
                    <span className="font-semibold text-[#102A2A]">{alert.account}</span>
                    <span className="text-[#64748B] ml-2">Complaint {alert.complaintId}</span>
                  </div>
                  <div className="nexus-priority-branch text-[#64748B] text-xs">
                    {alert.bankBranch}
                  </div>
                </div>
              </div>

              <div className="nexus-priority-right">
                <div className="text-right">
                  <div className="text-sm font-bold text-[#102A2A] font-mono">
                    {alert.riskScore} <span className="text-[10px] text-[#64748B] font-sans font-normal">RISK</span>
                  </div>
                </div>
                <div className="text-right min-w-[90px]">
                  <div className="text-xs font-semibold text-[#DC2626] font-mono whitespace-nowrap">
                    {alert.cashOutTimeRemaining}
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#94A3B8] ml-1 flex-shrink-0" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="nexus-escalation-bar">
        <span className="text-[#64748B]">Escalation queue</span>
        <span className="text-[#102A2A] font-mono">4 OF 38 ACTIVE ALERTS SHOWN</span>
        <span className="text-[#DC2626] font-mono font-semibold">1 CRITICAL WINDOW CLOSING IN 2H</span>
      </div>
    </div>
  );
};
