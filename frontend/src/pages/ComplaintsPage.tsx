import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, X, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { NewComplaintModal } from '../components/nexus/NewComplaintModal';
import { useComplaints } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';

export const ComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setSelectedComplaintId = useNexusStore((state) => state.setSelectedComplaintId);

  const { complaints, isLoading, error, refetch } = useComplaints();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'new');

  const pageSize = 8;

  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
    }
  }, [searchParams]);

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((comp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = comp.id.toLowerCase().includes(q);
        const matchesBank = (comp.accused_bank || '').toLowerCase().includes(q);
        const matchesType = (comp.fraud_type || '').toLowerCase().includes(q);
        const matchesVictim = (comp.victimInfo?.name || '').toLowerCase().includes(q);
        if (!matchesId && !matchesBank && !matchesType && !matchesVictim) {
          return false;
        }
      }

      if (statusFilter !== 'All') {
        const s = (comp.status || '').toLowerCase();
        if (statusFilter.toLowerCase() !== s) {
          return false;
        }
      }

      return true;
    });
  }, [complaints, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, currentPage]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setCurrentPage(1);
    setSearchParams({});
  };

  const handleSelectComplaint = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    navigate(`/complaints/${complaintId}`);
  };

  const formatAmount = (amt: number) => {
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Recent';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const openCount = complaints.filter((c) => c.status !== 'resolved').length;

  return (
    <div className="nexus-page-container">
      {/* Header Section */}
      <div className="nexus-complaints-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="nexus-page-title">Complaints</h1>
          <p className="nexus-page-subtitle">Review, investigate and track real reported cybercrime cases.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="nexus-quick-btn-primary flex items-center gap-1.5 px-4 py-2"
        >
          <Plus size={16} /> New Complaint
        </button>
      </div>

      {/* Complaint Summary Container */}
      <div className="nexus-complaints-summary-container">
        <div className="nexus-complaints-summary-left">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">
            TOTAL COMPLAINTS
          </span>
          <div className="text-3xl font-extrabold text-[#102A2A] font-mono mt-1">
            {isLoading ? '...' : complaints.length}
          </div>
          <div className="text-xs text-[#64748B] mt-1">All live ingested cases in DB</div>
        </div>

        <div className="nexus-complaints-summary-right">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">
            OPEN INVESTIGATIONS
          </span>
          <div className="text-3xl font-extrabold text-[#087F5B] font-mono mt-1">
            {isLoading ? '...' : openCount}
          </div>
          <div className="text-xs text-[#64748B] mt-1">Active interception dockets</div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => refetch()} className="ml-auto underline font-semibold text-xs">
            Retry Connection
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="nexus-filter-bar">
        {/* Search */}
        <div className="nexus-filter-search">
          <Search size={15} className="text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search complaint ID, suspect bank, fraud type..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="nexus-filter-input"
          />
        </div>

        {/* Dropdowns */}
        <div className="nexus-filter-dropdowns">
          <div className="nexus-filter-select-group">
            <span className="nexus-filter-label">STATUS</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="nexus-filter-select"
            >
              <option value="All">All</option>
              <option value="flagged">Flagged</option>
              <option value="alerted">Alerted</option>
              <option value="analyzing">Analyzing</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs font-mono font-semibold text-[#64748B]">
              {filteredComplaints.length} MATCHING
            </span>

            <button
              onClick={handleClearFilters}
              className="nexus-filter-clear-btn flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="nexus-table-wrapper">
        <table className="nexus-table">
          <thead>
            <tr>
              <th>COMPLAINT ID</th>
              <th>REPORTED ON</th>
              <th>FRAUD TYPE</th>
              <th>SUSPECT BANK</th>
              <th>AMOUNT</th>
              <th>VICTIM LOCATION</th>
              <th>STATUS</th>
              <th>CHANNEL</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-10">
                  <div className="flex justify-center items-center gap-2 text-slate-500 text-xs">
                    <Loader2 size={18} className="animate-spin text-emerald-600" />
                    Querying live records from NEXUS backend...
                  </div>
                </td>
              </tr>
            ) : paginatedComplaints.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                  No complaints found matching current filters.
                </td>
              </tr>
            ) : (
              paginatedComplaints.map((complaint) => (
                <tr
                  key={complaint.id}
                  onClick={() => handleSelectComplaint(complaint.id)}
                  className="nexus-table-row cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="font-mono font-bold text-[#087F5B]">
                    {complaint.id}
                  </td>
                  <td className="font-mono text-xs text-[#102A2A]">
                    {formatDate(complaint.created_at || complaint.filed_at)}
                  </td>
                  <td className="font-semibold text-xs text-[#102A2A] capitalize">
                    {(complaint.fraud_type || 'UPI Fraud').replace(/_/g, ' ')}
                  </td>
                  <td className="font-mono text-xs text-[#102A2A]">
                    {complaint.accused_bank || 'Beneficiary Node'}
                  </td>
                  <td className="font-mono font-bold text-xs text-[#102A2A]">
                    {formatAmount(complaint.amount)}
                  </td>
                  <td className="text-xs text-[#64748B]">
                    {complaint.victim_district ? `${complaint.victim_district}, ${complaint.victim_state || ''}` : 'National'}
                  </td>
                  <td>
                    <span className="nexus-pill-under-investigation capitalize">
                      {complaint.status || 'flagged'}
                    </span>
                  </td>
                  <td className="text-xs text-[#64748B]">
                    {complaint.channel || 'Online Portal'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="nexus-pagination-footer flex items-center justify-between mt-4">
        <span className="text-xs text-[#64748B]">
          Showing {paginatedComplaints.length} of {filteredComplaints.length} cases
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-[#E2E8E6] disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-mono font-bold text-[#102A2A] px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-[#E2E8E6] disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* New Complaint Modal */}
      <NewComplaintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplaintCreated={() => refetch()}
      />
    </div>
  );
};
