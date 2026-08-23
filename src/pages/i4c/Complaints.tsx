import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { SEED_PREDICTIONS, FRAUD_TYPES } from '@/lib/constants';
import StatusBadge from '@/components/shared/StatusBadge';
import ComplaintModal from '@/components/shared/ComplaintModal';

export default function Complaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Record<string, unknown>[]>([]);
  const [predictionMap, setPredictionMap] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [fraudTypeFilter, setFraudTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [alertLevelFilter, setAlertLevelFilter] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const fetchComplaintsAndPredictions = async () => {
    try {
      // 1. Fetch predictions mapping (complaint_id -> prediction id)
      const { data: preds } = await supabase.from('predictions').select('id, complaint_id');
      const predMap: Record<string, string> = {};
      if (preds) {
        preds.forEach((p) => {
          if (p.complaint_id) predMap[p.complaint_id] = p.id;
        });
      } else {
        // Fallback mapping from SEED_PREDICTIONS
        SEED_PREDICTIONS.forEach((sp) => {
          predMap[sp.complaint_id] = sp.id;
        });
      }
      setPredictionMap(predMap);

      // 2. Fetch complaints
      const { data: compData, error } = await supabase
        .from('complaints')
        .select('*')
        .order('filed_at', { ascending: false });

      if (!error && compData && compData.length > 0) {
        setComplaints(compData);
      } else {
        // Seed fallback data
        const seedRows = SEED_PREDICTIONS.map((p) => ({
          id: p.complaint_id,
          complaint_id: p.complaint_id,
          fraud_type: p.complaint_id.includes('0002')
            ? 'investment_scam'
            : p.complaint_id.includes('0003')
            ? 'digital_arrest'
            : 'upi_fraud',
          amount: p.risk_score > 0.8 ? 450000 : 125000,
          victim_state: p.predicted_lat < 25 ? 'Jharkhand' : 'Haryana',
          alert_level: p.alert_level,
          status: p.status,
          filed_at: p.created_at,
        }));
        setComplaints(seedRows);
      }
    } catch {
      // Ignore fallback errors
    }
  };

  useEffect(() => {
    fetchComplaintsAndPredictions();

    // Subscribe to realtime insert events on complaints table
    const channel = supabase
      .channel('complaints_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'complaints' },
        (payload) => {
          if (payload.new) {
            setComplaints((prev) => [payload.new as Record<string, unknown>, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper for relative time formatting
  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'Recently';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  // Client-side filtering
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const cId = String(c.complaint_id || '').toLowerCase();
      const fType = String(c.fraud_type || '').toLowerCase();
      const search = searchQuery.toLowerCase().trim();

      const matchesSearch = !search || cId.includes(search) || fType.includes(search);
      const matchesFraud = fraudTypeFilter === 'ALL' || c.fraud_type === fraudTypeFilter;
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesAlert = alertLevelFilter === 'ALL' || c.alert_level === alertLevelFilter;

      return matchesSearch && matchesFraud && matchesStatus && matchesAlert;
    });
  }, [complaints, searchQuery, fraudTypeFilter, statusFilter, alertLevelFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, currentPage]);

  const clearFilters = () => {
    setSearchQuery('');
    setFraudTypeFilter('ALL');
    setStatusFilter('ALL');
    setAlertLevelFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Ingestion stream</p>
          <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Complaints</h1>
          <p className="mt-0.5 text-xs text-[#64748B]">Real-time NCRP intake records feeding NEXUS pipeline.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#EFF6FF] px-3 py-1 font-mono text-xs font-semibold text-[#1E40AF]">
            {filteredComplaints.length} Total Records
          </span>
          <button onClick={() => setModalOpen(true)} className="nexus-btn flex items-center gap-2 text-xs py-2 px-3">
            <Plus size={16} /> New Complaint
          </button>
        </div>
      </div>

      {/* Filter Bar (White Card) */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-3 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search complaint ID or fraud type..."
            className="nexus-input pl-9 text-xs"
          />
        </div>

        <select
          value={fraudTypeFilter}
          onChange={(e) => {
            setFraudTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="nexus-input w-auto text-xs"
        >
          <option value="ALL">All Fraud Types</option>
          {FRAUD_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>
              {ft.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="nexus-input w-auto text-xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="flagged">Flagged</option>
          <option value="alerted">Alerted</option>
          <option value="intercepted">Intercepted</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={alertLevelFilter}
          onChange={(e) => {
            setAlertLevelFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="nexus-input w-auto text-xs"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="RED">RED (Critical)</option>
          <option value="AMBER">AMBER (High)</option>
          <option value="GREEN">GREEN (Monitoring)</option>
        </select>

        <button
          onClick={clearFilters}
          className="text-xs font-semibold text-[#1E40AF] hover:underline px-2 py-1"
        >
          Clear Filters
        </button>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F1B2D]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              <tr>
                <th className="py-3 px-4">Complaint ID</th>
                <th className="py-3 px-4">Fraud Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Victim State</th>
                <th className="py-3 px-4">Filed</th>
                <th className="py-3 px-4">Alert Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {paginatedComplaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#94A3B8]">
                    No complaints match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedComplaints.map((c) => {
                  const compId = String(c.complaint_id || '');
                  const predId = predictionMap[compId] || (compId.includes('NCRP') ? compId : null);
                  const fraudObj = FRAUD_TYPES.find((f) => f.value === c.fraud_type);

                  return (
                    <tr
                      key={String(c.id || compId)}
                      onClick={() => predId && navigate(`/prediction/${predId}`)}
                      className={`transition-colors hover:bg-[#F8FAFC] ${
                        predId ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1A2035]">
                        {compId}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {fraudObj ? fraudObj.label : String(c.fraud_type || 'UPI Fraud')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#DC2626]">
                        ₹{Number(c.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5 text-[#374151]">
                          <MapPin size={14} className="text-[#64748B]" />
                          {String(c.victim_state || 'Jharkhand')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">
                        {getRelativeTime(String(c.filed_at || c.created_at || ''))}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={String(c.alert_level || 'GREEN')} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={String(c.status || 'pending')} />
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {predId ? (
                          <button
                            onClick={() => navigate(`/prediction/${predId}`)}
                            className="nexus-btn-secondary px-3 py-1 text-[11px]"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-[#94A3B8]">
                            Processing...
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-3 bg-[#F8FAFC]">
          <p className="text-xs text-[#64748B]">
            Showing <span className="font-semibold text-[#0F1B2D]">{paginatedComplaints.length ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-semibold text-[#0F1B2D]">{Math.min(currentPage * pageSize, filteredComplaints.length)}</span> of{' '}
            <span className="font-semibold text-[#0F1B2D]">{filteredComplaints.length}</span> complaints
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="nexus-btn-secondary py-1 px-2 text-xs disabled:opacity-50"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-[#0F1B2D] px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="nexus-btn-secondary py-1 px-2 text-xs disabled:opacity-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && <ComplaintModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
