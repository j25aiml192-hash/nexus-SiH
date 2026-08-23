import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import SentinelPanel from '@/components/sentinel/SentinelPanel';
import {
  Activity,
  AlertOctagon,
  ArrowUpRight,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface SentinelScore {
  id: string;
  account_hash: string;
  complaint_id?: string;
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
  const navigate = useNavigate();
  const [scores, setScores] = useState<SentinelScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SURGE' | 'MONITORING'>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');

  const fetchAllScores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sentinel_scores')
        .select('*')
        .order('surge_score', { ascending: false })
        .limit(100);

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

  // Filtered Scores
  const filteredScores = useMemo(() => {
    return scores.filter((score) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        score.account_hash?.toLowerCase().includes(q) ||
        score.bank?.toLowerCase().includes(q) ||
        score.state?.toLowerCase().includes(q) ||
        score.trigger_reason?.toLowerCase().includes(q);

      // Status
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SURGE' && (score.status === 'surge' || score.surge_score >= 80)) ||
        (statusFilter === 'MONITORING' && score.status !== 'surge' && score.surge_score < 80);

      // Bank
      const matchesBank = bankFilter === 'ALL' || score.bank === bankFilter;

      return matchesSearch && matchesStatus && matchesBank;
    });
  }, [scores, searchQuery, statusFilter, bankFilter]);

  // Unique Banks for Dropdown
  const banksList = useMemo(() => {
    const set = new Set<string>();
    scores.forEach((s) => s.bank && set.add(s.bank));
    return Array.from(set);
  }, [scores]);

  // Metrics
  const surgeAccounts = scores.filter((s) => s.surge_score >= 80).length;
  const monitoringAccounts = scores.filter((s) => s.surge_score >= 50 && s.surge_score < 80).length;
  const normalAccounts = scores.filter((s) => s.surge_score < 50).length;

  const scoreColor = (score: number) => {
    if (score >= 80) return '#DC2626';
    if (score >= 50) return '#D97706';
    return '#16A34A';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">
            <ShieldAlert size={15} /> Autonomous Behavioral Engine
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F1B2D]">
            Sentinel Surge Matrix
          </h1>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Real-time mule account surge velocity scoring, dormancy break analysis, and withdrawal interdiction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllScores}
            className="nexus-btn-secondary flex items-center gap-2 py-2 px-3.5 text-xs shadow-xs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Sentinel
          </button>
        </div>
      </div>

      {/* KPI Overview Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Critical Surge */}
        <div className="rounded-2xl border border-red-200/80 bg-red-50/40 p-5 shadow-xs transition-all hover:bg-red-50/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              Critical Surge Nodes
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <Zap size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-[#DC2626]">
              {surgeAccounts}
            </span>
            <span className="text-xs font-semibold text-red-600">Accounts</span>
          </div>
          <p className="mt-1 text-[11px] text-red-600/80 font-medium">
            Imminent cash-out anomaly detected (Score ≥ 80)
          </p>
        </div>

        {/* Card 2: Elevated Monitoring */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-xs transition-all hover:bg-amber-50/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Elevated Velocity
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Activity size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-[#D97706]">
              {monitoringAccounts}
            </span>
            <span className="text-xs font-semibold text-amber-600">Accounts</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-600/80 font-medium">
            Active burst transactions (Score 50–79)
          </p>
        </div>

        {/* Card 3: Normal Baseline */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-xs transition-all hover:bg-emerald-50/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Baseline Watch
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-[#16A34A]">
              {normalAccounts}
            </span>
            <span className="text-xs font-semibold text-emerald-600">Accounts</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600/80 font-medium">
            Normal behavioral bounds (Score &lt; 50)
          </p>
        </div>

        {/* Card 4: Total Registry */}
        <div className="rounded-2xl border border-[#EAECF0] bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Total Monitored Nodes
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#1E40AF]">
              <Shield size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-[#0F1B2D]">
              {scores.length}
            </span>
            <span className="text-xs font-semibold text-[#64748B]">Entities</span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Automated re-evaluation every 180 seconds
          </p>
        </div>
      </div>

      {/* Top Section: Real-time Sentinel Live Panel */}
      <div>
        <SentinelPanel />
      </div>

      {/* Main Table Section: Filterable Monitored Accounts Registry */}
      <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-xs">
        {/* Table Header & Controls Bar */}
        <div className="flex flex-col gap-4 border-b border-[#F1F5F9] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F1B2D]">Behavioral Registry</h2>
            <p className="text-xs text-[#64748B]">
              Multi-dimensional velocity scoring across all active mule banking chains.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search account, bank, state..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs text-[#0F1B2D] outline-none transition focus:border-[#3B82F6] focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-xs">
              {(['ALL', 'SURGE', 'MONITORING'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    statusFilter === st
                      ? 'bg-white text-[#1E40AF] font-bold shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F1B2D]'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'SURGE' ? 'Surge Only' : 'Monitoring'}
                </button>
              ))}
            </div>

            {/* Bank Filter */}
            {banksList.length > 0 && (
              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#0F1B2D] outline-none transition focus:border-[#3B82F6] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Banks</option>
                {banksList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="py-16 text-center text-xs text-[#64748B] font-mono">
            Loading behavioral records...
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="rounded-xl bg-[#F8FAFC] py-14 text-center text-xs text-[#64748B]">
            No account records match the selected filter criteria.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAECF0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Account Hash</th>
                  <th className="py-3 px-4">Bank & State</th>
                  <th className="py-3 px-4">Surge Velocity</th>
                  <th className="py-3 px-4">Threat Status</th>
                  <th className="py-3 px-4">Trigger Assessment</th>
                  <th className="py-3 px-4">Last Sync</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredScores.map((score) => {
                  const isSurge = score.surge_score >= 80;
                  const color = scoreColor(score.surge_score);

                  return (
                    <tr
                      key={score.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* Account Hash */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F1B2D]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span>{score.account_hash}</span>
                        </div>
                      </td>

                      {/* Bank & State */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0F1B2D]">{score.bank}</div>
                        <div className="text-[11px] text-[#64748B]">{score.state}</div>
                      </td>

                      {/* Surge Velocity Score */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="font-mono text-sm font-bold w-7"
                            style={{ color }}
                          >
                            {score.surge_score}
                          </span>
                          <div className="h-2 w-20 rounded-full bg-[#E2E8F0] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, score.surge_score)}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                            isSurge
                              ? 'bg-red-100 text-[#DC2626] border border-red-200'
                              : score.surge_score >= 50
                              ? 'bg-amber-100 text-[#D97706] border border-amber-200'
                              : 'bg-emerald-100 text-[#16A34A] border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSurge ? 'bg-[#DC2626] animate-pulse' : 'bg-current'
                            }`}
                          />
                          {score.status || (isSurge ? 'surge' : 'monitoring')}
                        </span>
                      </td>

                      {/* Trigger Reason */}
                      <td
                        className="py-3.5 px-4 text-xs text-[#64748B] max-w-xs truncate"
                        title={score.trigger_reason}
                      >
                        {score.trigger_reason}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8]">
                        {score.last_updated
                          ? new Date(score.last_updated).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Live'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            if (score.complaint_id) {
                              navigate(`/complaints`);
                            } else {
                              navigate(`/dashboard`);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1E40AF] shadow-xs hover:bg-[#EFF6FF] hover:border-blue-300 transition"
                        >
                          <span>Inspect Node</span>
                          <ArrowUpRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
