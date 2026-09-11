import React from 'react';
import {
  FileText,
  Activity,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LIVE_ACTIVITY_ITEMS, type LiveActivityItem } from '../../data/nexus-data';

export const LiveActivityCard: React.FC = () => {
  const navigate = useNavigate();

  const getIcon = (type: LiveActivityItem['type']) => {
    switch (type) {
      case 'complaint':
        return <FileText size={16} className="text-[#64748B]" />;
      case 'prediction':
        return <Activity size={16} className="text-[#64748B]" />;
      case 'alert':
        return <ArrowUpRight size={16} className="text-[#64748B]" />;
      case 'officer':
        return <UserCheck size={16} className="text-[#64748B]" />;
      case 'incident':
        return <CheckCircle2 size={16} className="text-[#087F5B]" />;
      default:
        return <FileText size={16} className="text-[#64748B]" />;
    }
  };

  const getBadgeClass = (badge: LiveActivityItem['badge']) => {
    switch (badge) {
      case 'INTAKE':
        return 'nexus-activity-badge-intake';
      case 'HIGH':
        return 'nexus-activity-badge-high';
      case 'CRITICAL':
        return 'nexus-activity-badge-critical';
      case 'ACTIVE':
        return 'nexus-activity-badge-active';
      case 'CLOSED':
        return 'nexus-activity-badge-closed';
      case 'MEDIUM':
        return 'nexus-activity-badge-medium';
      default:
        return 'nexus-activity-badge-intake';
    }
  };

  const handleItemClick = (item: LiveActivityItem) => {
    const cleanRef = item.refId.replace('#', '');
    if (cleanRef.startsWith('C')) {
      navigate(`/complaints/${cleanRef}`);
    } else if (cleanRef.startsWith('A')) {
      navigate('/alerts');
    } else if (cleanRef.startsWith('I')) {
      navigate(`/incidents/${cleanRef}`);
    } else {
      navigate('/complaints');
    }
  };

  return (
    <div className="nexus-box-card">
      <div className="nexus-box-card-header">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="nexus-box-title">Live Activity</h3>
            <span className="w-2 h-2 rounded-full bg-[#0F9D72] animate-pulse"></span>
          </div>
          <p className="nexus-box-subtitle">Shared event stream across complaints, predictions, alerts and incidents</p>
        </div>
        <span className="text-[11px] font-mono text-[#94A3B8] font-medium tracking-wide">
          UPDATED JUST NOW
        </span>
      </div>

      <div className="nexus-activity-list">
        {LIVE_ACTIVITY_ITEMS.map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="nexus-activity-row cursor-pointer"
          >
            <div className="nexus-activity-icon-container">
              {getIcon(item.type)}
            </div>

            <div className="nexus-activity-content">
              <div className="nexus-activity-main-text">
                <span className="font-semibold text-[#102A2A]">{item.title}</span>{' '}
                <span className="font-mono text-[#087F5B] font-semibold">{item.refId}</span>
              </div>
              <div className="nexus-activity-sub-text text-xs text-[#64748B]">
                {item.subtitle}
              </div>
            </div>

            <div className="nexus-activity-meta">
              <span className={`nexus-activity-badge ${getBadgeClass(item.badge)}`}>
                {item.badge}
              </span>
              <span className="text-xs text-[#94A3B8] font-mono whitespace-nowrap min-w-[65px] text-right">
                {item.timeAgo}
              </span>
              <ChevronRight size={15} className="text-[#94A3B8] ml-1" />
            </div>
          </div>
        ))}
      </div>

      <div className="nexus-activity-footer">
        <button
          onClick={() => navigate('/complaints')}
          className="nexus-link-btn flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-xs font-semibold"
        >
          View full event ledger <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
