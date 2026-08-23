import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '@/hooks/useAlerts';
import { useNexusStore } from '@/store/nexusStore';

export default function NotificationBell() {
  const navigate = useNavigate();
  const { alerts, acknowledgeAlert } = useAlerts();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Unread alerts count (status !== 'acknowledged')
  const unreadAlerts = alerts.filter((a) => a.status !== 'acknowledged');
  const unreadCount = unreadAlerts.length;

  const markAllRead = async () => {
    for (const a of unreadAlerts) {
      await acknowledgeAlert(a.id);
    }
  };

  const handleAlertClick = (alert: (typeof alerts)[number]) => {
    if (alert.status !== 'acknowledged') {
      acknowledgeAlert(alert.id);
    }
    setIsOpen(false);
    if (alert.prediction_id) {
      navigate(`/prediction/${alert.prediction_id}`);
    } else {
      navigate('/dashboard');
    }
  };

  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'just now';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatTitle = (alert: (typeof alerts)[number]) => {
    if (alert.message.includes(':')) {
      const parts = alert.message.split(':');
      return parts[0].trim();
    }
    return `${alert.alert_level || 'THREAT'} ALERT — ${alert.complaint_id || 'NEXUS'}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Circular Bell Button with Red Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-900 bg-white shadow-xs hover:bg-slate-50 transition cursor-pointer"
        title="Notifications"
      >
        <Bell size={17} className="text-slate-900 fill-slate-200 stroke-[2.2]" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-white animate-in zoom-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notifications Popover */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-[1100] w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification Items List */}
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {alerts.length > 0 ? (
              alerts.slice(0, 15).map((alert) => {
                const isUnread = alert.status !== 'acknowledged';

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`group relative flex items-start gap-3 rounded-xl p-3 transition-all cursor-pointer ${
                      isUnread
                        ? 'border border-blue-200/80 bg-[#EFF6FF] hover:bg-blue-100/60 shadow-2xs'
                        : 'border border-slate-100 bg-white hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    {/* Blue / Gray Dot */}
                    <span
                      className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        isUnread ? 'bg-[#2563EB] ring-2 ring-blue-200' : 'bg-slate-300'
                      }`}
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-bold truncate ${
                          isUnread ? 'text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {formatTitle(alert)}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600 leading-relaxed">
                        {alert.message}
                      </p>
                      <span className="mt-1 block font-mono text-[10px] text-slate-400">
                        {getRelativeTime(alert.sent_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                No notifications found
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 border-t border-slate-100 pt-2.5 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/dashboard');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-[#1E40AF] transition"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
