import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  MapPin,
  UserCheck,
  ExternalLink,
  Clock,
  CheckCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { useAlerts, useAssignOfficer } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';
import { realtimeClient } from '../services/realtime';
import { dataSource } from '../services/dataSource';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    alerts,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    riskFilter,
    setRiskFilter,
    searchQuery,
    setSearchQuery,
  } = useAlerts();

  const { assign, isAssigning } = useAssignOfficer();
  const setMapFocus = useNexusStore((state) => state.setMapFocus);

  const [assignModalAlertId, setAssignModalAlertId] = useState<string | null>(null);
  const [officerIdInput, setOfficerIdInput] = useState('OFF-8841');
  const [assignSuccessNotice, setAssignSuccessNotice] = useState<{
    alertId: string;
    incidentId: string;
  } | null>(null);

  const handleViewOnMap = (atmId?: string, h3Cell?: string) => {
    const target = atmId || h3Cell;
    if (target) {
      setMapFocus({
        cellOrAtmId: target,
        zoom: 15,
        timestamp: Date.now(),
      });
      navigate('/map');
    }
  };

  const handleOpenAssign = (alertId: string) => {
    setAssignModalAlertId(alertId);
    setOfficerIdInput(`OFF-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleConfirmAssign = async () => {
    if (!assignModalAlertId || !officerIdInput.trim()) return;
    const result = await assign(assignModalAlertId, officerIdInput.trim());
    setAssignSuccessNotice({
      alertId: assignModalAlertId,
      incidentId: result.incident.id,
    });
    setAssignModalAlertId(null);
    setTimeout(() => setAssignSuccessNotice(null), 5000);
  };

  // Quick simulate inbound alert for testing realtime push
  const handleSimulateInboundAlert = () => {
    const id = `ALT-${Math.floor(2000 + Math.random() * 7000)}`;
    const mockAlert = {
      id,
      predictionId: 'PRED-ACC-89214',
      atmId: 'ATM-DEL-042',
      h3Cell: '882681a4bffffff',
      status: 'new' as const,
      createdAt: new Date().toISOString(),
    };
    realtimeClient.emitAlertCreated(mockAlert);
  };

  return (
    <div className="alerts-container">
      {/* Header */}
      <div className="alerts-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-wide mb-30">
              Active Alerts
            </h1>


          </div>
          <p className="text-xs text-slate-400 mt-1">
            Transductive graph alerts prioritized by GNN severity score and chronological arrival.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateInboundAlert}
            className="nexus-pill-button text-xs"
            title="Simulate inbound socket event"
          >
            <Plus size={14} className="text-cyan-400" />
            Simulate Inbound Alert
          </button>
        </div>
      </div>

      {/* Assignment Success Banner */}
      {assignSuccessNotice && (
        <div className="nexus-alert-banner">
          <div className="flex items-center gap-3">
            <CheckCircle size={22} className="text-emerald-400" />
            <div>
              <div className="font-bold text-slate-900 text-sm">
                ALERT {assignSuccessNotice.alertId} ASSIGNED → INCIDENT{' '}
                {assignSuccessNotice.incidentId} CREATED
              </div>
              <div className="text-xs text-emerald-700 font-semibold">
                Case dossier initialized in tactical queue.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/incidents/${assignSuccessNotice.incidentId}`)}
            className="nexus-pill-button text-xs"
          >
            Open Incident Dossier <ExternalLink size={12} />
          </button>
        </div>
      )}

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
            placeholder="Search by Alert ID, Account ID, ATM, or H3 Cell..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="nexus-input pl-9 pr-3 py-2 text-xs w-full font-mono"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 font-mono mr-1">Status:</span>
          {(['all', 'new', 'assigned', 'actioned'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`nexus-pill-button text-xs uppercase ${statusFilter === st ? 'active' : ''
                }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Risk Filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 font-mono mr-1">Risk:</span>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((rf) => (
            <button
              key={rf}
              onClick={() => setRiskFilter(rf)}
              className={`nexus-pill-button text-xs uppercase ${riskFilter === rf ? 'active' : ''
                }`}
            >
              {rf}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="alerts-grid">
        {isLoading && alerts.length === 0 ? (
          <div className="nexus-empty-state py-12">
            <Loader2 size={36} className="nexus-spinner mx-auto mb-2 text-primary-brand animate-spin" />
            <div className="text-slate-700 font-bold">STREAMING TACTICAL ALERTS...</div>
            <div className="text-xs text-slate-500">Querying live event bus and transductive graph inference...</div>
          </div>
        ) : error ? (
          <div className="nexus-empty-state py-12">
            <div className="text-red-600 font-bold">Failed to load alerts</div>
            <div className="text-xs text-slate-500">{error}</div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="nexus-empty-state">
            <Bell size={42} className="text-slate-600 mb-2" />
            <div className="text-slate-300 font-bold">No matching alerts detected</div>
            <div className="text-xs text-slate-500">
              Adjust filters or emit a simulated alert to test queue.
            </div>
          </div>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.derivedRisk === 'critical';
            const isHigh = alert.derivedRisk === 'high';
            const isAssigned = alert.status === 'assigned';
            const isNew = alert.status === 'new';

            return (
              <div
                key={alert.id}
                className={`alert-card ${isCritical ? 'border-red-500/50' : ''}`}
              >
                {/* Header */}
                <div className="alert-card-header">
                  <div className="flex items-center gap-2">
                    <span className="alert-card-id">{alert.id}</span>
                    <span
                      className={`risk-badge-pill ${isCritical
                        ? 'risk-crit'
                        : isHigh
                          ? 'risk-hi'
                          : alert.derivedRisk === 'medium'
                            ? 'risk-med'
                            : 'risk-lo'
                        }`}
                    >
                      {alert.derivedRisk.toUpperCase()} RISK
                    </span>
                  </div>

                  <span
                    className={`status-chip ${isNew ? 'chip-new' : isAssigned ? 'chip-assigned' : 'chip-actioned'
                      }`}
                  >
                    {alert.status.toUpperCase()}
                  </span>
                </div>

                {/* Body Details */}
                <div className="alert-card-body">
                  <div className="alert-detail-line">
                    <span className="text-slate-400">Target Account:</span>
                    <span
                      className="text-cyan-400 cursor-pointer hover:underline"
                      onClick={() => navigate(`/prediction/${alert.linkedAccountId}`)}
                    >
                      {alert.linkedAccountId}
                    </span>
                  </div>

                  <div className="alert-detail-line">
                    <span className="text-slate-400">Target H3 Cell:</span>
                    <span className="font-mono text-slate-200">{alert.h3Cell}</span>
                  </div>

                  {alert.atmId && (
                    <div className="alert-detail-line">
                      <span className="text-slate-400">Target ATM Hub:</span>
                      <span className="text-amber-400 font-bold">{alert.atmId}</span>
                    </div>
                  )}

                  {alert.assignedOfficerId && (
                    <div className="alert-detail-line">
                      <span className="text-slate-400">Assigned Officer:</span>
                      <span className="text-emerald-400 font-bold">
                        {alert.assignedOfficerId}
                      </span>
                    </div>
                  )}

                  <div className="alert-timestamp">
                    <Clock size={12} />
                    <span>
                      {alert.createdAt
                        ? new Date(alert.createdAt).toLocaleString()
                        : 'Realtime Dispatch'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="alert-card-actions">
                  <button
                    onClick={() => handleViewOnMap(alert.atmId, alert.h3Cell)}
                    className="alert-btn-action"
                    title="View on Map"
                  >
                    <MapPin size={14} className="text-cyan-400" />
                    <span>View on map</span>
                  </button>

                  {alert.status === 'new' ? (
                    <button
                      onClick={() => handleOpenAssign(alert.id)}
                      className="alert-btn-assign"
                    >
                      <UserCheck size={14} />
                      <span>Assign to officer</span>
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        const incidents = await dataSource.getIncidents();
                        const linkedInc = incidents.find(
                          (i) => i.alertId === alert.id
                        );
                        if (linkedInc) {
                          navigate(`/incidents/${linkedInc.id}`);
                        } else {
                          navigate('/incidents');
                        }
                      }}
                      className="alert-btn-assigned-status"
                    >
                      <ExternalLink size={13} />
                      <span>Incident Active</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Officer Assignment Modal Dialog */}
      {assignModalAlertId && (
        <div className="nexus-modal-backdrop">
          <div className="nexus-modal-card">
            <div className="nexus-modal-title">
              <UserCheck size={20} className="text-cyan-400" />
              <span>ASSIGN ALERT TO TACTICAL FIELD OFFICER</span>
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-4">
              Assigning alert <strong className="text-slate-900">{assignModalAlertId}</strong> will
              create an Incident dossier in the registry and dispatch the officer.
            </p>

            <div className="mb-4">
              <label className="text-xs font-mono text-slate-700 block mb-1 font-semibold">
                Field Officer Identifier:
              </label>
              <input
                type="text"
                value={officerIdInput}
                onChange={(e) => setOfficerIdInput(e.target.value)}
                placeholder="e.g. OFF-8841"
                className="nexus-input w-full font-mono text-sm py-2 px-3"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAssignModalAlertId(null)}
                className="nexus-pill-button text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={isAssigning}
                className="nexus-btn-primary text-xs"
              >
                {isAssigning ? 'Dispatching...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
