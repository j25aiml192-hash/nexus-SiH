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

interface LiveActivityItem {
  type: 'complaint' | 'prediction' | 'alert' | 'officer' | 'incident' | string;
  ref_id: string;
  title: string;
  subtitle: string;
  badge: string;
  created_at: string;
}

interface LiveActivityCardProps {
  items?: LiveActivityItem[];
}

export const LiveActivityCard: React.FC<LiveActivityCardProps> = ({ items = [] }) => {
  const navigate = useNavigate();

  const getIcon = (type: string) => {
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

  const getBadgeClass = (badge: string) => {
    const b = badge.toUpperCase();
    if (b.includes('RED') || b.includes('CRITICAL')) return 'nexus-activity-badge-critical';
    if (b.includes('AMBER') || b.includes('HIGH')) return 'nexus-activity-badge-high';
    if (b.includes('GREEN') || b.includes('MEDIUM')) return 'nexus-activity-badge-medium';
    if (b.includes('FLAGGED') || b.includes('NEW')) return 'nexus-activity-badge-intake';
    if (b.includes('AUTHORIZED') || b.includes('CLOSED')) return 'nexus-activity-badge-closed';
    return 'nexus-activity-badge-intake';
  };

  const handleItemClick = (item: LiveActivityItem) => {
    const ref = item.ref_id;
    if (ref.startsWith('CMP-')) {
      navigate(`/complaints/${ref}`);
    } else if (ref.startsWith('ALT-')) {
      navigate('/alerts');
    } else if (ref.startsWith('INC-')) {
      navigate(`/incidents/${ref}`);
    } else {
      navigate('/complaints');
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="nexus-box-card">
      <div className="nexus-box-card-header">
        <div>
          <h3 className="nexus-box-title">Live Activity</h3>
          <p className="nexus-box-subtitle">Real-time telemetry stream from LEA operational networks</p>
        </div>
        <button
          onClick={() => navigate('/complaints')}
          className="nexus-link-btn flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-xs font-semibold"
        >
          View all <ArrowRight size={13} />
        </button>
      </div>

      <div className="nexus-activity-list">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#64748B]">No operational events recorded yet.</div>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.ref_id}-${idx}`}
              onClick={() => handleItemClick(item)}
              className="nexus-activity-row cursor-pointer"
            >
              <div className="nexus-activity-left">
                <div className="nexus-activity-icon-box">{getIcon(item.type)}</div>
                <div className="nexus-activity-info">
                  <div className="nexus-activity-topline">
                    <span className="font-semibold text-[#102A2A] text-xs">{item.title}</span>
                    <span className={`nexus-activity-badge ${getBadgeClass(item.badge)}`}>
                      {item.badge}
                    </span>
                  </div>
                  <div className="nexus-activity-desc text-[#64748B] text-xs">
                    {item.subtitle}
                  </div>
                </div>
              </div>

              <div className="nexus-activity-right flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#94A3B8]">{formatTime(item.created_at)}</span>
                <ChevronRight size={15} className="text-[#CBD5E1]" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
