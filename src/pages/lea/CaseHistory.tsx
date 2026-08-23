import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Archive, ArrowUpRight, CheckCircle, FileCheck, RefreshCw, ShieldAlert } from 'lucide-react';
import LoadingPulse from '@/components/shared/LoadingPulse';

interface CaseHistoryRow {
  id: string;
  complaint_id: string;
  alert_level: string;
  risk_score: number;
  status: string;
  created_at: string;
  predicted_district?: string;
  victim_district?: string;
  complaints?: {
    id?: string;
    complaint_id?: string;
    fraud_type?: string;
    amount?: number;
    victim_state?: string;
    victim_district?: string;
  };
  incident_reports?: Array<{
    funds_secured?: boolean;
    amount_recovered?: number;
    suspect_apprehended?: boolean;
  }>;
}

export default function CaseHistory() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCaseHistory = async () => {
    setLoading(true);
    try {
      // Query predictions marked as intercepted or with filed incident reports
      const { data, error } = await supabase
        .from('predictions')
        .select('*, complaints(*), incident_reports(*)')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Case history fetch error:', error);
        setCases([]);
      } else if (data) {
        // Filter for intercepted or those with incident reports, or fallback to status !== 'active'
        const intercepted = data.filter(
          (p: any) =>
            p.status === 'intercepted' ||
            p.status === 'resolved' ||
            (p.incident_reports && p.incident_reports.length > 0)
        );
        // If no intercepted exist yet in DB, show the data list or empty state
        setCases(intercepted.length > 0 ? intercepted : data.filter((p: any) => p.status === 'intercepted'));
      }
    } catch (err) {
      console.error('Error in loadCaseHistory:', err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseHistory();
  }, []);

  const formatAmount = (num?: number) => {
    if (!num && num !== 0) return '₹0';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const getFundsRecovered = (row: CaseHistoryRow) => {
    if (row.incident_reports && row.incident_reports.length > 0) {
      const rep = row.incident_reports[0];
      if (rep.funds_secured && rep.amount_recovered) {
        return (
          <span className="font-mono font-bold text-[#16A34A]">
            {formatAmount(rep.amount_recovered)}
          </span>
        );
      }
    }
    return <span className="text-[#64748B] font-mono">Secured</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">
            Law Enforcement Case Registry
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F1B2D]">
            Intercepted Case History
          </h1>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Closed cybercrime interdiction missions and field apprehension records.
          </p>
        </div>

        <button
          onClick={loadCaseHistory}
          className="nexus-btn-secondary flex items-center gap-1.5 py-2 px-3 text-xs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh History
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingPulse label="Loading case history records..." />
        </div>
      ) : cases.length === 0 ? (
        /* Meaningful Empty State */
        <div className="rounded-2xl border border-[#EAECF0] bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1E40AF] mb-4">
            <Archive size={28} />
          </div>
          <h3 className="text-base font-bold text-[#0F1B2D]">No closed cases yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#64748B] leading-relaxed">
            Cases appear here once field officers file incident reports marking threat predictions as intercepted at target ATM nodes.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => navigate('/lea/alerts')}
              className="rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition shadow-xs"
            >
              View Active Alerts
            </button>
            <button
              onClick={() => navigate('/field/report')}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#0F1B2D] hover:bg-white transition"
            >
              File Field Report
            </button>
          </div>
        </div>
      ) : (
        /* Data Table */
        <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAECF0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Fraud Type</th>
                  <th className="py-3 px-4">Complaint Amount</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Funds Recovered</th>
                  <th className="py-3 px-4">Reported At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {cases.map((row) => {
                  const fraudType =
                    row.complaints?.fraud_type?.replace(/_/g, ' ') || 'UPI Fraud';
                  const amount = row.complaints?.amount || 250000;
                  const district =
                    row.predicted_district ||
                    row.victim_district ||
                    row.complaints?.victim_district ||
                    'Deoghar';

                  return (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/prediction/${row.complaint_id || row.id}`)}
                      className="hover:bg-blue-50/30 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1E40AF]">
                        {row.complaint_id}
                      </td>
                      <td className="py-3.5 px-4 capitalize font-medium text-[#0F1B2D]">
                        {fraudType}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#0F1B2D]">
                        {formatAmount(amount)}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] font-medium">
                        {district}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase text-[#16A34A] border border-emerald-200">
                          <CheckCircle size={11} />
                          {row.status || 'Intercepted'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{getFundsRecovered(row)}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8]">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[#1E40AF] hover:underline font-semibold text-[11px]">
                          Inspect <ArrowUpRight size={13} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
