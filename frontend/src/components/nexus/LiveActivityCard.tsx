import React from 'react';
import {
  FileText,
  Activity,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Radio,
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
        return <FileText size={16} className="text-indigo-600" />;
      case 'prediction':
        return <Activity size={16} className="text-blue-600" />;
      case 'alert':
        return <ArrowUpRight size={16} className="text-amber-600" />;
      case 'officer':
        return <UserCheck size={16} className="text-emerald-600" />;
      case 'incident':
        return <CheckCircle2 size={16} className="text-emerald-700" />;
      default:
        return <FileText size={16} className="text-indigo-600" />;
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
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <h3 className="nexus-box-title text-base font-bold">Live Operational Telemetry</h3>
            <p className="nexus-box-subtitle text-xs text-[var(--colors-ink-subtle)]">
              Real-time telemetry stream from LEA operational networks
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/complaints')}
          className="nexus-link-btn flex items-center gap-1 text-[var(--colors-primary)] hover:text-[var(--colors-primary-hover)] text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50/60 border border-indigo-100 transition-all"
        >
          <span>View all</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="nexus-activity-list">
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--colors-ink-subtle)] bg-slate-50 rounded-xl border border-slate-100">
            No operational events recorded yet.
          </div>
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
                    <span className="font-semibold text-[var(--colors-ink)] text-xs truncate">{item.title}</span>
                    <span className={`nexus-activity-badge ${getBadgeClass(item.badge)}`}>
                      {item.badge}
                    </span>
                  </div>
                  <div className="nexus-activity-desc text-[var(--colors-ink-subtle)] text-xs truncate">
                    {item.subtitle}
                  </div>
                </div>
              </div>

              <div className="nexus-activity-right flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-[var(--colors-ink-tertiary)]">{formatTime(item.created_at)}</span>
                <ChevronRight size={15} className="text-[var(--colors-hairline-strong)]" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
