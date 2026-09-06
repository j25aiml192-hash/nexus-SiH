import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useComplaints } from '../hooks/useNexusData';

export const ComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    complaints,
    allComplaintsCount,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    refetch,
  } = useComplaints();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="complaints-container p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E2E8E6] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-wide text-[#102A2A]">
              Cybercrime Complaint Registry
            </h1>
            <span className="nexus-badge-tech">{allComplaintsCount} COMPLAINTS FILED</span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 font-medium">
            National Cybercrime Reporting Portal (NCRP) verified victims and associated mule transaction links.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="alerts-filter-bar flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border border-[#E2E8E6]">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by Complaint ID, Victim Name, Contact, or Mule Account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="nexus-input pl-9 pr-3 py-2 text-xs w-full font-mono bg-[#F7FAF9] border border-[#E2E8E6] rounded"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-[#64748B] font-mono mr-1 font-bold">Status:</span>
          {(['all', 'filed', 'analyzing', 'alerted', 'resolved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`nexus-pill-button text-xs uppercase ${
                statusFilter === st ? 'active' : ''
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints Table Card */}
      <div className="nexus-card overflow-hidden p-0 bg-white border border-[#E2E8E6] rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="nexus-table w-full text-left">
            <thead className="bg-[#F7FAF9] border-b border-[#E2E8E6] text-[11px] font-bold text-[#102A2A] uppercase font-mono">
              <tr>
                <th className="py-3 px-4">COMPLAINT ID</th>
                <th className="py-3 px-4">VICTIM IDENTITY</th>
                <th className="py-3 px-4">CONTACT</th>
                <th className="py-3 px-4">REPORTED LOSS</th>
                <th className="py-3 px-4">TARGET MULE ACCOUNT</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E6] text-xs">
              {isLoading && complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Loader2 size={32} className="mx-auto mb-2 text-primary-brand animate-spin" />
                    <div className="font-semibold text-slate-700">Loading complaint registry...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-red-600">
                    <div>{error}</div>
                    <button onClick={() => refetch()} className="nexus-pill-button mt-2 text-xs">
                      Retry
                    </button>
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <FileText size={36} className="mx-auto mb-2 opacity-40" />
                    No complaints match current search query or filter.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[#F7FAF9] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#087F5B]">
                      {c.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#102A2A]">
                      {c.victimInfo.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#64748B]">
                      {c.victimInfo.contact}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#102A2A]">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span
                        onClick={() => navigate(`/prediction/${c.linkedAccountId}`)}
                        className="text-[#087F5B] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                        title="View GNN Prediction for this account"
                      >
                        {c.linkedAccountId}
                        <ExternalLink size={12} />
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          c.status === 'alerted'
                            ? 'bg-amber-100 text-amber-800'
                            : c.status === 'resolved'
                            ? 'bg-[#E8F5F0] text-[#087F5B]'
                            : c.status === 'analyzing'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/prediction/${c.linkedAccountId}`)}
                        className="nexus-pill-button text-xs py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        Analyze <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
