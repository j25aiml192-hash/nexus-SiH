import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, AlertTriangle, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SentinelScore {
  id: string;
  account_hash: string;
  bank: string;
  state: string;
  surge_score: number;
  trigger_reason: string;
  status: string;
  last_updated: string;
}

export default function SentinelPanel() {
  const navigate = useNavigate();
  const [scores, setScores] = useState<SentinelScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    const { data, error } = await supabase
      .from('sentinel_scores')
      .select('*')
      .order('surge_score', { ascending: false })
      .limit(6);
    if (error) {
      console.error('Sentinel panel fetch error:', error);
      setScores([]);
      setLoading(false);
      return;
    }
    setScores(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchScores();

    const channel = supabase
      .channel('sentinel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sentinel_scores',
        },
        () => fetchScores()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const scoreColor = (score: number) => {
    if (score >= 80) return '#DC2626';
    if (score >= 50) return '#D97706';
    return '#16A34A';
  };

  const surgeCount = scores.filter((s) => s.surge_score >= 80).length;

  return (
    <div className="rounded-2xl border border-[#EAECF0] bg-white p-5 shadow-xs">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1E40AF]">
              <Zap size={14} />
            </span>
            <h3 className="text-sm font-bold text-[#0F172A]">Sentinel Behavioral Surge Monitor</h3>
          </div>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Automated anomaly detection across mule nodes · updates every 3 min
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
              surgeCount > 0
                ? 'border border-red-200 bg-red-50 text-[#DC2626]'
                : 'border border-emerald-200 bg-emerald-50 text-[#16A34A]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                surgeCount > 0 ? 'bg-[#DC2626] animate-pulse' : 'bg-[#16A34A]'
              }`}
            />
            {surgeCount} CRITICAL SURGE
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-8 text-center text-xs text-[#64748B] font-mono">
          Scanning behavioral signals...
        </div>
      ) : scores.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#64748B]">
          No accounts in surge state. Engine continuously monitors incoming complaints.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {scores.map((score) => {
            const isSurge = score.surge_score >= 80;
            const color = scoreColor(score.surge_score);

            return (
              <div
                key={score.id}
                onClick={() => navigate('/sentinel')}
                className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all cursor-pointer hover:shadow-sm ${
                  isSurge
                    ? 'border-red-200 bg-red-50/40 hover:border-red-300 hover:bg-red-50/70'
                    : 'border-[#EAECF0] bg-[#F8FAFC] hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0F172A]">
                      {score.account_hash?.slice(0, 14)}...
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        isSurge
                          ? 'bg-red-100 text-[#DC2626]'
                          : score.surge_score >= 50
                          ? 'bg-amber-100 text-[#D97706]'
                          : 'bg-emerald-100 text-[#16A34A]'
                      }`}
                    >
                      {score.status || (isSurge ? 'SURGE' : 'MONITORING')}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-[#64748B] mb-1">
                      <span>Threat Velocity</span>
                      <span className="font-mono font-bold" style={{ color }}>
                        {score.surge_score}/100
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${score.surge_score}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs font-semibold text-[#0F172A]">
                    {score.bank}
                  </p>
                  <p className="text-[11px] text-[#64748B]">{score.state}</p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-[#94A3B8]">
                  <span className="truncate max-w-[170px]" title={score.trigger_reason}>
                    {score.trigger_reason}
                  </span>
                  <ArrowUpRight
                    size={13}
                    className="shrink-0 text-slate-400 group-hover:text-[#1E40AF] transition-transform group-hover:translate-x-0.5"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
