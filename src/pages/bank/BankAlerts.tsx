import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface AlertItem {
  id: string;
  complaint_id?: string;
  alert_level: string;
  recipient_role: string;
  channel?: string;
  message: string;
  sent_at?: string;
  status?: string;
  predictions?: any;
}

export default function BankAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgingIds, setAcknowledgingIds] = useState<Set<string>>(new Set());

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, predictions(*)')
        .order('sent_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Failed to fetch bank alerts:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledgingIds((prev) => new Set(prev).add(alertId));
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'acknowledged' })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' } : a))
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    } finally {
      setAcknowledgingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const formatRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'Just now';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const getAlertBadgeStyle = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'RED':
        return {
          bg: '#FEF2F2',
          text: '#DC2626',
          border: '#FECACA',
        };
      case 'AMBER':
        return {
          bg: '#FFFBEB',
          text: '#D97706',
          border: '#FDE68A',
        };
      default:
        return {
          bg: '#F0FDF4',
          text: '#16A34A',
          border: '#BBF7D0',
        };
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Fraud desk</p>
        <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Bank alert feed</h1>
        <p className="mt-0.5 text-xs text-[#64748B]">Real-time warnings for accounts and cash-out locations.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-[#64748B]">
          <Loader2 className="animate-spin mb-3 text-[#1E40AF]" size={28} />
          <p className="text-xs">Loading alert feed...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
          <Bell className="mx-auto mb-3 text-[#94A3B8]" size={28} />
          <p className="text-xs leading-relaxed text-[#64748B] max-w-md mx-auto">
            No alerts yet. Alerts appear here as the NEXUS engine processes complaints. Engine runs every 90 seconds.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {alerts.map((a) => {
            const badgeStyle = getAlertBadgeStyle(a.alert_level);
            const isAcknowledged = a.status === 'acknowledged';
            const isProcessing = acknowledgingIds.has(a.id);
            const complaintId = a.complaint_id || a.predictions?.complaint_id || 'COMP-NEXUS';

            return (
              <div
                key={a.id}
                className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.text,
                        borderColor: badgeStyle.border,
                      }}
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                    >
                      {a.alert_level || 'INFO'}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#00D4FF]">
                      {complaintId}
                    </span>
                  </div>

                  <p
                    className="mt-3 text-xs leading-relaxed text-[#0F1B2D]"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {a.message}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                    <Clock size={12} />
                    <span>{formatRelativeTime(a.sent_at)}</span>
                  </div>

                  <button
                    onClick={() => handleAcknowledge(a.id)}
                    disabled={isAcknowledged || isProcessing}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isAcknowledged
                        ? 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed border border-[#E2E8F0]'
                        : 'bg-[#1E40AF] text-white hover:bg-[#1D4ED8] cursor-pointer shadow-sm'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Acknowledging...
                      </>
                    ) : isAcknowledged ? (
                      <>
                        <CheckCircle size={12} className="text-[#16A34A]" /> Acknowledged
                      </>
                    ) : (
                      'Acknowledge'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
