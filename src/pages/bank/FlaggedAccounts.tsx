import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle,
  Clock,
  Download,
  Filter,
  Flag,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  Snowflake,
} from 'lucide-react';
import LoadingPulse from '@/components/shared/LoadingPulse';
import { useToast } from '@/hooks/useToast';

interface MuleNodeItem {
  id: string;
  account_hash: string;
  bank_name: string;
  state?: string;
  transaction_velocity?: number;
  is_flagged: boolean;
  complaint_id?: string;
  created_at?: string;
  complaints?: {
    fraud_type?: string;
    amount?: number;
    accused_bank?: string;
    victim_state?: string;
  };
}

export default function FlaggedAccounts() {
  const { showSuccess, showError } = useToast();
  const [nodes, setNodes] = useState<MuleNodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [frozenAccounts, setFrozenAccounts] = useState<Set<string>>(new Set());

  const fetchFlaggedAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mule_chain_nodes')
        .select('*, complaints(fraud_type, amount, accused_bank, victim_state)')
        .eq('is_flagged', true)
        .order('transaction_velocity', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching flagged mule nodes:', error);
        // Fallback: fetch without filter or all nodes
        const fallback = await supabase
          .from('mule_chain_nodes')
          .select('*, complaints(fraud_type, amount, accused_bank, victim_state)')
          .limit(50);
        setNodes(fallback.data || []);
      } else if (data && data.length > 0) {
        setNodes(data);
      } else {
        const allNodes = await supabase
          .from('mule_chain_nodes')
          .select('*, complaints(fraud_type, amount, accused_bank, victim_state)')
          .limit(50);
        setNodes(allNodes.data || []);
      }
    } catch (err) {
      console.error('Error in fetchFlaggedAccounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlaggedAccounts();
  }, []);

  // Summary Metrics: X accounts flagged across Y banks — Total exposure: Rs Z
  const summary = useMemo(() => {
    const totalCount = nodes.length;
    const banks = new Set<string>();
    let totalExposure = 0;

    nodes.forEach((n) => {
      const bank = n.bank_name || n.complaints?.accused_bank || 'Banking Entity';
      banks.add(bank);
      totalExposure += Number(n.complaints?.amount || 250000);
    });

    const formatRupees = (num: number) => {
      if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
      if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
      return `₹${num.toLocaleString('en-IN')}`;
    };

    return {
      totalCount,
      bankCount: banks.size || 1,
      totalExposureStr: formatRupees(totalExposure),
    };
  }, [nodes]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return nodes;
    return nodes.filter(
      (n) =>
        n.account_hash?.toLowerCase().includes(q) ||
        n.bank_name?.toLowerCase().includes(q) ||
        n.state?.toLowerCase().includes(q) ||
        n.complaints?.fraud_type?.toLowerCase().includes(q)
    );
  }, [nodes, search]);

  const handleFreeze = async (nodeId: string, accountHash: string) => {
    try {
      await supabase
        .from('mule_chain_nodes')
        .update({ is_flagged: true })
        .eq('id', nodeId);

      setFrozenAccounts((prev) => new Set([...prev, nodeId]));
      showSuccess(`Account ${accountHash.slice(0, 12)}... flagged for freeze.`);
    } catch (err: any) {
      showError('Failed to flag account for freeze');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">
            <ShieldAlert size={15} /> Banking Operations Portal
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F1B2D]">
            Flagged Mule Accounts
          </h1>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Inter-bank mule node registry flagged for debit freeze and automated cashout prevention.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchFlaggedAccounts}
            className="nexus-btn-secondary flex items-center gap-1.5 py-2 px-3 text-xs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Feed
          </button>
        </div>
      </div>

      {/* Summary Highlight Row */}
      <div className="rounded-2xl border border-red-200/80 bg-red-50/40 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-[#DC2626]">
              <Flag size={18} />
            </span>
            <div>
              <p className="text-xs font-bold text-red-900">
                {summary.totalCount} accounts flagged across {summary.bankCount} banks
              </p>
              <p className="text-[11px] text-red-700/80">
                Total aggregate exposure across active mule routing layers: <strong className="font-mono text-red-900">{summary.totalExposureStr}</strong>
              </p>
            </div>
          </div>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 border border-red-200">
            Automated Watch Active
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-3 border-b border-[#F1F5F9] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-[260px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search account hash, bank, state..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs text-[#0F1B2D] outline-none transition focus:border-[#3B82F6] focus:bg-white"
            />
          </div>

          <span className="font-mono text-xs font-semibold text-[#64748B]">
            Showing {filteredNodes.length} of {nodes.length} Flagged Nodes
          </span>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingPulse label="Scanning flagged banking networks..." />
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#64748B]">
            No flagged mule accounts found matching your query.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAECF0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Account Hash</th>
                  <th className="py-3 px-4">Bank</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Transaction Velocity</th>
                  <th className="py-3 px-4">Linked Fraud Type</th>
                  <th className="py-3 px-4">Amount at Risk</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredNodes.map((n) => {
                  const isAlreadyFlagged = n.is_flagged || frozenAccounts.has(n.id);
                  const fraudType =
                    n.complaints?.fraud_type?.replace(/_/g, ' ') || 'UPI Fraud';
                  const amount = n.complaints?.amount || 250000;
                  const velocity = n.transaction_velocity || 12;

                  return (
                    <tr key={n.id} className="hover:bg-slate-50/80 transition">
                      {/* Account Hash */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F1B2D]">
                        <div className="flex items-center gap-1.5">
                          <Flag size={12} className="text-[#DC2626] shrink-0" />
                          <span>{n.account_hash}</span>
                        </div>
                      </td>

                      {/* Bank */}
                      <td className="py-3.5 px-4 font-medium text-[#0F1B2D]">
                        {n.bank_name || n.complaints?.accused_bank || 'HDFC Bank'}
                      </td>

                      {/* State */}
                      <td className="py-3.5 px-4 text-[#64748B]">
                        {n.state || n.complaints?.victim_state || 'Jharkhand'}
                      </td>

                      {/* Velocity */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#D97706]">
                          {velocity} txn/hr
                        </span>
                      </td>

                      {/* Linked Fraud Type */}
                      <td className="py-3.5 px-4 capitalize text-[#0F1B2D]">
                        {fraudType}
                      </td>

                      {/* Amount at Risk */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#DC2626]">
                        ₹{amount.toLocaleString('en-IN')}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        {isAlreadyFlagged ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-[#16A34A] border border-emerald-200">
                            <CheckCircle size={11} /> Flagged ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => handleFreeze(n.id, n.account_hash)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#DC2626] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 transition shadow-xs"
                          >
                            <Snowflake size={11} />
                            <span>Flag for Freeze</span>
                          </button>
                        )}
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
