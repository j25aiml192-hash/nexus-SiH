import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useIncidents } from '../hooks/useNexusData';

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    incidents,
    totalCount,
    isLoading,
    error,
    refetch,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
  } = useIncidents();

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Recent';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-wide">
              Incident Case Files
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800">
              {totalCount} ACTIVE DOSSIERS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 102 CrPC asset preservation registries, tactical actions, and lien authorizations.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => refetch()} className="ml-auto underline font-semibold text-xs">
            Retry Connection
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 border border-[#E2E8E6] rounded-xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Incident ID, complaint reference, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-md p-1.5 bg-white font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="authorized">Authorized</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="nexus-table-wrapper">
        <table className="nexus-table">
          <thead>
            <tr>
              <th>INCIDENT ID</th>
              <th>CREATED AT</th>
              <th>COMPLAINT REF</th>
              <th>TACTICAL ACTION / STATUS</th>
              <th>STATUS</th>
              <th>APPREHENDED</th>
              <th>DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    Querying real incident files from database...
                  </div>
                </td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                  No incidents found matching the active criteria.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="nexus-table-row cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="font-mono font-bold text-[#087F5B]">
                    {inc.id}
                  </td>
                  <td className="font-mono text-xs text-[#102A2A]">
                    {formatDate(inc.createdAt || inc.created_at)}
                  </td>
                  <td className="font-mono text-xs text-[#102A2A]">
                    {inc.complaint_id || 'Case Ref'}
                  </td>
                  <td className="text-xs text-slate-700 max-w-xs truncate">
                    {inc.action_taken || inc.notes || 'Interception action underway.'}
                  </td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${inc.status === 'authorized' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {inc.status?.toUpperCase() || 'OPEN'}
                    </span>
                  </td>
                  <td className="text-xs font-mono font-semibold text-slate-700">
                    {inc.suspect_apprehended ? 'YES' : 'NO'}
                  </td>
                  <td>
                    <span className="text-xs text-[#087F5B] font-semibold flex items-center gap-0.5">
                      Dossier <ChevronRight size={13} />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
