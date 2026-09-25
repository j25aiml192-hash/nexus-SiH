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
  X,
  Check,
} from 'lucide-react';
import { useAlerts } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';
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
    refetch,
  } = useAlerts();

  const setMapFocus = useNexusStore((state) => state.setMapFocus);
  const setSelectedComplaintId = useNexusStore((state) => state.setSelectedComplaintId);

  const [assignModalAlertId, setAssignModalAlertId] = useState<string | null>(null);
  const [officerNameInput, setOfficerNameInput] = useState('Inspector Rajesh Sharma');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccessNotice, setAssignSuccessNotice] = useState<{
    alertId: string;
    officer: string;
  } | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);

  const handleViewOnMap = (alert: any) => {
    if (alert.complaint_id) {
      setSelectedComplaintId(alert.complaint_id);
    }
    setMapFocus({
      cellOrAtmId: alert.id,
      zoom: 14,
      timestamp: Date.now(),
    });
    navigate('/map');
  };

  const handleOpenAssign = (alertId: string) => {
    setAssignModalAlertId(alertId);
  };

  const handleConfirmAssign = async () => {
    if (!assignModalAlertId || !officerNameInput.trim()) return;
    setIsAssigning(true);
    try {
      await dataSource.assignOfficer(assignModalAlertId, officerNameInput.trim());
      setAssignSuccessNotice({
        alertId: assignModalAlertId,
        officer: officerNameInput.trim(),
      });
      setAssignModalAlertId(null);
      refetch();
      setTimeout(() => setAssignSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to assign officer');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSimulateInboundAlert = async () => {
    setIsSimulating(true);
    try {
      await dataSource.simulateAlert();
      refetch();
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="alerts-container">
      {/* Header */}
      <div className="alerts-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-wide">
              Active Intercept Alerts
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Realtime cybercrime intercept notifications prioritized by Dual LightGBM & XGBoost risk vectors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateInboundAlert}
            disabled={isSimulating}
            className="nexus-pill-button text-xs"
            title="Create live test alert in database"
          >
            <Plus size={14} className="text-cyan-400" />
            {isSimulating ? 'Simulating Intercept...' : 'Simulate Inbound Alert'}
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
                ALERT {assignSuccessNotice.alertId} ASSIGNED TO {assignSuccessNotice.officer.toUpperCase()}
              </div>
              <div className="text-xs text-emerald-700 font-semibold">
                Officer notified and field docket updated in database.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/incidents')}
            className="nexus-pill-button text-xs"
          >
            Open Incidents Registry <ExternalLink size={12} />
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
            placeholder="Search by Alert ID, Complaint ID, Officer, or Message..."
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
              className={`nexus-pill-button text-xs uppercase ${statusFilter === st ? 'active' : ''}`}
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
              className={`nexus-pill-button text-xs uppercase ${riskFilter === rf ? 'active' : ''}`}
            >
              {rf}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="alerts-grid">
        {isLoading && alerts.length === 0 ? (
          <div className="nexus-empty-state py-12" style={{ gridColumn: '1 / -1' }}>
            <Loader2 size={36} className="nexus-spinner mx-auto mb-2 text-primary-brand animate-spin" />
            <div className="text-slate-700 font-bold">STREAMING TACTICAL ALERTS...</div>
            <div className="text-xs text-slate-500">Querying live event feed from NEXUS database...</div>
          </div>
        ) : error ? (
          <div className="nexus-empty-state py-12" style={{ gridColumn: '1 / -1' }}>
            <div className="text-red-600 font-bold">Failed to load alerts feed</div>
            <div className="text-xs text-slate-500">{error}</div>
            <button onClick={() => refetch()} className="nexus-pill-button text-xs mt-3">
              Retry Connection
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="nexus-empty-state" style={{ gridColumn: '1 / -1' }}>
            <Bell size={42} className="text-slate-600 mb-2" />
            <div className="text-slate-700 font-bold">No matching alerts detected</div>
            <div className="text-xs text-slate-500">
              Adjust filters or click "Simulate Inbound Alert" to create a live alert.
            </div>
          </div>
        ) : (
          alerts.map((alert) => {
            const riskLevel = (alert.severity || 'HIGH').toUpperCase();
            const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'RED';
            const isHigh = riskLevel === 'HIGH' || riskLevel === 'AMBER';
            const isAssigned = alert.status === 'assigned';
            const isNew = alert.status === 'new';

            const officerName = alert.assigned_officer || 'Unassigned';

            return (
              <div
                key={alert.id}
                className="alert-card"
                style={{ borderLeft: isCritical ? '4px solid #DC2626' : isHigh ? '4px solid #EA580C' : '4px solid #087F5B' }}
              >
                {/* Header */}
                <div className="alert-card-header">
                  <div className="flex items-center gap-2">
                    <span className="alert-card-id">{alert.id}</span>
                    <span
                      className={`risk-badge-pill ${
                        isCritical ? 'risk-crit' : isHigh ? 'risk-hi' : 'risk-med'
                      }`}
                    >
                      {riskLevel} RISK
                    </span>
                  </div>

                  <span
                    className={`status-chip ${
                      isNew ? 'chip-new' : isAssigned ? 'chip-assigned' : 'chip-actioned'
                    }`}
                  >
                    {(alert.status || 'new').toUpperCase()}
                  </span>
                </div>

                {/* Body Details */}
                <div className="alert-card-body">
                  <div className="alert-detail-line">
                    <span className="text-slate-500">Target Case:</span>
                    <span
                      className="text-cyan-700 font-bold font-mono cursor-pointer hover:underline"
                      onClick={() => navigate(`/complaints/${alert.complaint_id}`)}
                    >
                      {alert.complaint_id || 'CMP-2026-9081'}
                    </span>
                  </div>

                  <div className="alert-detail-line" style={{ marginTop: '2px', lineHeight: '1.4' }}>
                    <span className="text-slate-700 text-xs">{alert.message}</span>
                  </div>

                  <div className="alert-detail-line" style={{ marginTop: '4px' }}>
                    <span className="text-slate-500">Assigned Officer:</span>
                    <span className="font-semibold" style={{ color: officerName !== 'Unassigned' ? '#087F5B' : '#94A3B8' }}>
                      {officerName}
                    </span>
                  </div>

                  <div className="alert-timestamp">
                    <Clock size={12} />
                    <span>
                      {alert.created_at
                        ? new Date(alert.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Realtime Intercept'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="alert-card-actions">
                  <button
                    onClick={() => handleViewOnMap(alert)}
                    className="alert-btn-action"
                    title="View on Map"
                  >
                    <MapPin size={14} className="text-cyan-600" />
                    <span>View on map</span>
                  </button>

                  {alert.status === 'new' ? (
                    <button
                      onClick={() => handleOpenAssign(alert.id)}
                      className="alert-btn-assign"
                    >
                      <UserCheck size={14} />
                      <span>Assign Officer</span>
                    </button>
                  ) : (
                    <div className="alert-btn-assigned-status">
                      <UserCheck size={14} className="text-emerald-600 inline mr-1" />
                      <span>{officerName}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Assign Officer */}
      {assignModalAlertId && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-dialog">
            <div className="nexus-modal-header">
              <h3 className="nexus-modal-title">Assign Tactical Officer</h3>
              <button
                onClick={() => setAssignModalAlertId(null)}
                className="nexus-modal-close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="nexus-modal-body">
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
                Assign an investigating officer to dispatch tactical response for Alert <strong>{assignModalAlertId}</strong>:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Inspector Vikram Rao', 'Inspector Rajesh Sharma', 'Sub-Inspector Anjali Verma', 'Inspector Priya Deshmukh'].map((off) => (
                  <button
                    key={off}
                    onClick={() => setOfficerNameInput(off)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: officerNameInput === off ? '#E8F5F0' : '#FFFFFF',
                      border: officerNameInput === off ? '1px solid #087F5B' : '1px solid #E2E8E6',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: officerNameInput === off ? '#087F5B' : '#102A2A',
                    }}
                  >
                    <span>{off}</span>
                    {officerNameInput === off && <Check size={16} color="#087F5B" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="nexus-modal-footer">
              <button
                onClick={() => setAssignModalAlertId(null)}
                className="nexus-btn-outline-action"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={isAssigning}
                className="nexus-btn-assign-officer"
              >
                {isAssigning ? 'Updating Database...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AlertsPage;
