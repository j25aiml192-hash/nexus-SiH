import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useIncidents } from '../hooks/useNexusData';

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    incidents,
    totalCount,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
  } = useIncidents();

  return (
    <div className="incidents-container">
      {/* Header */}
      <div className="incidents-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-wide" style={{ color: '#102A2A' }}>
              Incident Case Files
            </h1>
            <span className="nexus-badge-tech">{totalCount} TOTAL DOSSIERS</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 102 CrPC asset preservation registries, tactical actions, and lien authorizations.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="alerts-filter-bar">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search by Incident ID, Alert ID, Complaint, or Officer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="nexus-input pl-9 pr-3 py-2 text-xs w-full font-mono"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 font-mono mr-1">Status:</span>
          {(['all', 'open', 'authorized', 'closed'] as const).map((st) => (
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

      {/* Incident Table */}
      <div className="nexus-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="nexus-table">
            <thead>
              <tr>
                <th>INCIDENT ID</th>
                <th>LINKED ALERT</th>
                <th>COMPLAINT / ACCOUNT</th>
                <th>OFFICER ACTIONS</th>
                <th>LAST UPDATED</th>
                <th>CASE STATUS</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Loader2 size={32} className="mx-auto mb-2 text-primary-brand animate-spin" />
                    <div className="font-semibold text-slate-700">Loading incident dossiers...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-red-600">
                    {error}
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <FileText size={36} className="mx-auto mb-2 opacity-40" />
                    No incidents match current filter criteria.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => {
                  const status = incident.status || 'open';
                  const isAuthorized = status === 'authorized';
                  const isClosed = status === 'closed';

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="font-mono font-bold text-[#087F5B]">
                        {incident.id}
                      </td>
                      <td className="font-mono text-xs text-slate-600">
                        {incident.alertId || 'ALT-LINKED'}
                      </td>
                      <td className="font-mono text-xs text-slate-800">
                        {incident.complaint_id || 'CMP-2026-9081'}
                      </td>
                      <td className="text-xs text-slate-600 max-w-xs truncate">
                        {incident.action_taken || 'Monitoring inter-bank mule activity.'}
                      </td>
                      <td className="font-mono text-xs text-slate-500">
                        {incident.createdAt ? new Date(incident.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                      </td>
                      <td>
                        <span
                          className={`nexus-status-pill-small ${
                            isClosed
                              ? 'status-resolved'
                              : isAuthorized
                              ? 'status-under-investigation'
                              : 'status-new'
                          }`}
                        >
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/incidents/${incident.id}`);
                          }}
                          className="nexus-btn-outline-action"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          View Docket <ChevronRight size={12} className="inline ml-1" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default IncidentsPage;
