import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { COMPLAINTS_DATA, type ComplaintDetail } from '../data/complaints-data';
import { NewComplaintModal } from '../components/nexus/NewComplaintModal';

export const ComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allComplaints, setAllComplaints] = useState<ComplaintDetail[]>(COMPLAINTS_DATA);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All time');
  const [officerFilter, setOfficerFilter] = useState('All');
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
    return allComplaints.filter((comp) => {
      // Search matching id, account, type, officer
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = comp.id.toLowerCase().includes(q);
        const matchesAccount = comp.primaryAccount.toLowerCase().includes(q);
        const matchesType = comp.complaintType.toLowerCase().includes(q);
        const matchesOfficer = comp.assignedOfficer.toLowerCase().includes(q);
        if (!matchesId && !matchesAccount && !matchesType && !matchesOfficer) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'All' && comp.status !== statusFilter) {
        return false;
      }

      // Risk
      if (riskFilter !== 'All' && comp.risk !== riskFilter) {
        return false;
      }

      // Officer
      if (officerFilter !== 'All') {
        if (officerFilter === 'Unassigned' && comp.assignedOfficer !== 'Unassigned') {
          return false;
        }
        if (officerFilter !== 'Unassigned' && comp.assignedOfficer !== officerFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allComplaints, searchQuery, statusFilter, riskFilter, officerFilter]);

  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, currentPage]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setRiskFilter('All');
    setDateFilter('All time');
    setOfficerFilter('All');
    setCurrentPage(1);
    setSearchParams({});
  };

  const handleComplaintCreated = (newComp: Partial<ComplaintDetail>) => {
    const updated = [newComp as ComplaintDetail, ...allComplaints];
    setAllComplaints(updated);
  };

  const getRiskBadge = (risk: ComplaintDetail['risk']) => {
    let barColor = '#087F5B';
    if (risk === 'CRITICAL') barColor = '#DC2626';
    if (risk === 'HIGH') barColor = '#EA580C';
    if (risk === 'MEDIUM') barColor = '#D97706';

    return (
      <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: barColor }}>
        <span className="w-1 h-3.5 rounded-sm inline-block" style={{ backgroundColor: barColor }}></span>
        <span>{risk}</span>
      </div>
    );
  };

  const getStatusPill = (status: ComplaintDetail['status']) => {
    switch (status) {
      case 'Under Investigation':
        return <span className="nexus-pill-under-investigation">{status}</span>;
      case 'New':
        return <span className="nexus-pill-new">{status}</span>;
      case 'Resolved':
        return <span className="nexus-pill-resolved">{status}</span>;
      default:
        return <span className="nexus-pill-under-investigation">{status}</span>;
    }
  };

  return (
    <div className="nexus-page-container">
      {/* Header Section */}
      <div className="nexus-complaints-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="nexus-page-title">Complaints</h1>
          <p className="nexus-page-subtitle">Review and manage reported cases.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="nexus-quick-btn-primary flex items-center gap-1.5 px-4 py-2"
        >
          <Plus size={16} /> New Complaint
        </button>
      </div>

      {/* Complaint Summary Container (Single horizontal card on desktop with 60%/40% split & vertical divider) */}
      <div className="nexus-complaints-summary-container">
        {/* Total Complaints (approx 60% width) */}
        <div className="nexus-complaints-summary-left">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">
            TOTAL COMPLAINTS
          </span>
          <div className="text-3xl font-extrabold text-[#102A2A] font-mono mt-1">
            86
          </div>
          <div className="text-xs text-[#64748B] mt-1">All reported cases</div>
        </div>

        {/* Open Complaints (approx 40% width) */}
        <div className="nexus-complaints-summary-right">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">
            OPEN COMPLAINTS
          </span>
          <div className="text-3xl font-extrabold text-[#087F5B] font-mono mt-1">
            24
          </div>
          <div className="text-xs text-[#64748B] mt-1">Currently open</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="nexus-filter-bar">
        {/* Search */}
        <div className="nexus-filter-search">
          <Search size={15} className="text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search complaint ID, account ID..."
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
              <option value="Under Investigation">Under Investigation</option>
              <option value="New">New</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="nexus-filter-select-group">
            <span className="nexus-filter-label">RISK</span>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="nexus-filter-select"
            >
              <option value="All">All</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="nexus-filter-select-group">
            <span className="nexus-filter-label">DATE</span>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="nexus-filter-select"
            >
              <option value="All time">All time</option>
              <option value="Last 24h">Last 24h</option>
              <option value="Last 7d">Last 7d</option>
              <option value="Last 30d">Last 30d</option>
            </select>
          </div>

          <div className="nexus-filter-select-group">
            <span className="nexus-filter-label">OFFICER</span>
            <select
              value={officerFilter}
              onChange={(e) => {
                setOfficerFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="nexus-filter-select"
            >
              <option value="All">All</option>
              <option value="A. Sharma">A. Sharma</option>
              <option value="A. Verma">A. Verma</option>
              <option value="S. Nair">S. Nair</option>
              <option value="R. Iyer">R. Iyer</option>
              <option value="P. Deshmukh">P. Deshmukh</option>
              <option value="Unassigned">Unassigned</option>
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
              <th>
                <span className="flex items-center gap-1">
                  REPORTED ON <ChevronDown size={13} className="text-[#64748B]" />
                </span>
              </th>
              <th>COMPLAINT TYPE</th>
              <th>PRIMARY ACCOUNT</th>
              <th>AMOUNT</th>
              <th>RISK</th>
              <th>STATUS</th>
              <th>ASSIGNED OFFICER</th>
              <th>LAST UPDATED</th>
            </tr>
          </thead>
          <tbody>
            {paginatedComplaints.map((complaint) => (
              <tr
                key={complaint.id}
                onClick={() => navigate(`/complaints/${complaint.id}`)}
                className="nexus-table-row cursor-pointer"
              >
                <td className="font-mono font-bold text-[#087F5B]">
                  {complaint.id}
                </td>
                <td className="font-mono text-xs text-[#102A2A]">
                  {complaint.reportedOn}
                </td>
                <td className="font-semibold text-xs text-[#102A2A]">
                  {complaint.complaintType}
                </td>
                <td className="font-mono text-xs text-[#102A2A]">
                  {complaint.primaryAccount}
                </td>
                <td className="font-mono font-bold text-xs text-[#102A2A]">
                  {complaint.amountFormatted}
                </td>
                <td>{getRiskBadge(complaint.risk)}</td>
                <td>{getStatusPill(complaint.status)}</td>
                <td className="text-xs text-[#64748B]">
                  {complaint.assignedOfficer}
                </td>
                <td className="font-mono text-xs text-[#64748B]">
                  {complaint.lastUpdated}
                </td>
              </tr>
            ))}
            {paginatedComplaints.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-[#64748B] text-xs">
                  No complaints found matching the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="nexus-pagination-bar">
        <div className="text-xs text-[#64748B] font-mono">
          Showing {(currentPage - 1) * pageSize + 1}-
          {Math.min(currentPage * pageSize, filteredComplaints.length)} of {filteredComplaints.length} complaints
        </div>

        <div className="nexus-pagination-controls">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="nexus-page-btn"
          >
            <ChevronLeft size={13} /> Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`nexus-page-number ${currentPage === page ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="nexus-page-btn"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* New Complaint Modal */}
      <NewComplaintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplaintCreated={handleComplaintCreated}
      />

      {/* Footer */}
      <footer className="nexus-demonstration-footer">
        NEXUS · RESTRICTED OPERATIONAL USE · ALL IDENTIFIERS MASKED · DEMONSTRATION DATA
      </footer>
    </div>
  );
};
