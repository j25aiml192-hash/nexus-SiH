import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SentinelPanel from '@/components/sentinel/SentinelPanel';
import { Shield, RefreshCw } from 'lucide-react';

interface SentinelScore {
  id: string;
  account_hash: string;
  bank: string;
  state: string;
  surge_score: number;
  velocity_score?: number;
  dormancy_score?: number;
  time_score?: number;
  flag_score?: number;
  trigger_reason: string;
  status: string;
  last_updated: string;
}

export default function Sentinel() {
  const [scores, setScores] = useState<SentinelScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllScores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sentinel_scores')
        .select('*')
        .order('surge_score', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Sentinel fetch error:', error);
        setScores([]);
        return;
      }
      setScores(data || []);
    } catch (err) {
      console.error('Error fetching all sentinel scores:', err);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllScores();

    const channel = supabase
      .channel('sentinel_full_page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sentinel_scores',
        },
        () => fetchAllScores()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const scoreColor = (score: number) => {
    if (score >= 80) return '#FF4444';
    if (score >= 50) return '#FF9900';
    return '#00C48C';
  };

  const getStatusBadge = (status: string) => {
    const isSurge = status === 'surge';
    return (
      <span
        style={{
          background: isSurge ? '#FF444420' : '#00C48C20',
          color: isSurge ? '#FF4444' : '#00C48C',
          border: `1px solid ${isSurge ? '#FF4444' : '#00C48C'}`,
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {status || 'monitoring'}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">
            <Shield size={16} /> Autonomous Behavioral Engine
          </div>
          <h1 className="mt-1 text-2xl font-bold text-[#0F1B2D]">NEXUS Sentinel Matrix</h1>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Real-time mule account surge velocity scoring & automated withdrawal interdiction.
          </p>
        </div>

        <button
          onClick={fetchAllScores}
          className="nexus-btn-secondary flex items-center gap-2 py-2 px-3 text-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Scores
        </button>
      </div>

      {/* Top Section: SentinelPanel summary */}
      <div>
        <SentinelPanel />
      </div>

      {/* Bottom Section: Full Sentinel Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F1B2D]">All Monitored Accounts</h2>
            <p className="text-xs text-[#64748B]">
              Comprehensive behavioral surge register across active banking networks.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-[#1E40AF]">
            {scores.length} Accounts Monitored
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#64748B]">Loading accounts registry...</div>
        ) : scores.length === 0 ? (
          <div className="rounded-lg bg-[#F8FAFC] py-12 text-center text-xs text-[#64748B]">
            No account behavioral anomalies recorded yet. The Sentinel engine evaluates accounts every 3 minutes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4 font-semibold">Account Hash</th>
                  <th className="py-3 px-4 font-semibold">Bank</th>
                  <th className="py-3 px-4 font-semibold">State</th>
                  <th className="py-3 px-4 font-semibold">Surge Score</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Trigger Reason</th>
                  <th className="py-3 px-4 font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {scores.map((score) => (
                  <tr key={score.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F1B2D]">
                      {score.account_hash}
                    </td>
                    <td className="py-3.5 px-4 text-[#0F1B2D] font-medium">{score.bank}</td>
                    <td className="py-3.5 px-4 text-[#64748B]">{score.state}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono font-bold text-sm"
                          style={{ color: scoreColor(score.surge_score) }}
                        >
                          {score.surge_score}
                        </span>
                        <div className="h-1.5 w-16 rounded-full bg-[#E2E8F0] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, score.surge_score)}%`,
                              backgroundColor: scoreColor(score.surge_score),
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(score.status)}</td>
                    <td className="py-3.5 px-4 text-[#64748B] max-w-xs truncate" title={score.trigger_reason}>
                      {score.trigger_reason}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8]">
                      {score.last_updated ? new Date(score.last_updated).toLocaleTimeString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
