import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  UserCheck,
  ExternalLink,
  Plus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { useAlerts, useAssignOfficer } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';
import { dataSource } from '../services/dataSource';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    alerts,
    isLoading,
    error,
    refetch,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
  } = useAlerts();

  const { assign, isAssigning } = useAssignOfficer();
  const setSelectedComplaintId = useNexusStore((state) => state.setSelectedComplaintId);

  const [assignModalAlertId, setAssignModalAlertId] = useState<string | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState('Insp. R. Sharma');
  const [isSimulating, setIsSimulating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleViewOnMap = (alert: any) => {
    if (alert.complaintId || alert.complaint_id) {
      setSelectedComplaintId(alert.complaintId || alert.complaint_id);
    }
    navigate('/map');
  };

  const handleOpenAssign = (alertId: string) => {
    setAssignModalAlertId(alertId);
    setSelectedOfficer('Insp. R. Sharma');
  };

  const handleConfirmAssign = async () => {
    if (!assignModalAlertId || !selectedOfficer.trim()) return;
    try {
      await assign(assignModalAlertId, selectedOfficer.trim());
      setSuccessToast(`Alert ${assignModalAlertId} successfully assigned to ${selectedOfficer}. Persisted in database.`);
      setAssignModalAlertId(null);
      refetch();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to assign officer.');
    }
  };

  const handleSimulateInboundAlert = async () => {
    setIsSimulating(true);
    try {
      const res = await dataSource.simulateAlert();
      setSuccessToast(`Authentic simulation alert ${res.id} inserted into database.`);
      refetch();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Simulation failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-wide">
              Active Alerts Feed
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
              {alerts.length} OPERATIONAL ALERTS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Realtime high-priority alerts prioritized by XGBoost risk level and chronological intake.
          </p>
        </div>

        <button
          onClick={handleSimulateInboundAlert}
          disabled={isSimulating}
          className="px-3.5 py-2 bg-[#087F5B] hover:bg-[#076D4E] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {isSimulating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
          <span>Simulate Live Inbound Alert</span>
        </button>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-medium">
          <CheckCircle size={16} className="text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => refetch()} className="ml-auto underline font-semibold text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 border border-[#E2E8E6] rounded-xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Alert ID, case reference, or assigned officer..."
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
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="actioned">Actioned</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 text-xs flex justify-center items-center gap-2">
            <Loader2 size={18} className="animate-spin text-emerald-600" />
            Loading real alerts from NEXUS feed...
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            No active alerts matching your search criteria.
          </div>
        ) : (
          alerts.map((alert) => {
            const isCrit = (alert.severity || '').toUpperCase().includes('CRIT') || alert.derivedRisk === 'critical';
            return (
              <div
                key={alert.id}
                className="bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#087F5B]">{alert.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isCrit ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {alert.severity || 'HIGH'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Case: <span className="font-bold text-slate-800">{alert.complaintId || alert.complaint_id}</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600 capitalize">
                      {alert.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">
                    {alert.message}
                  </p>

                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span>Officer: <strong className="text-slate-800">{alert.assigned_officer || alert.assignedOfficerId || 'Unassigned'}</strong></span>
                    <span>Intake: {alert.createdAt || 'Recent'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleViewOnMap(alert)}
                    className="px-3 py-1.5 bg-white border border-[#E2E8E6] text-xs font-semibold rounded hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <MapPin size={13} className="text-[#087F5B]" /> View on Map
                  </button>

                  {alert.status !== 'assigned' && alert.status !== 'actioned' ? (
                    <button
                      onClick={() => handleOpenAssign(alert.id)}
                      className="px-3 py-1.5 bg-[#087F5B] hover:bg-[#076D4E] text-white text-xs font-semibold rounded flex items-center gap-1.5"
                    >
                      <UserCheck size={13} /> Assign Officer
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <Check size={14} /> Assigned
                    </span>
                  )}

                  <button
                    onClick={() => navigate(`/prediction/${alert.complaintId || alert.complaint_id}`)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded flex items-center gap-1"
                  >
                    Prediction <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assign Modal */}
      {assignModalAlertId && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-container max-w-sm w-full">
            <div className="nexus-modal-header flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-[#102A2A]">Assign Dispatch Officer</h3>
              <button onClick={() => setAssignModalAlertId(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {['Insp. R. Sharma', 'Insp. V. Rathore', 'SI A. Verma', 'SI P. Deshmukh'].map((off) => (
                <button
                  key={off}
                  onClick={() => setSelectedOfficer(off)}
                  className={`w-full text-left p-2.5 rounded-md text-xs font-semibold flex items-center justify-between border ${selectedOfficer === off ? 'border-[#087F5B] bg-[#E8F5EE] text-[#087F5B]' : 'border-[#E2E8E6] text-slate-800'}`}
                >
                  <span>{off}</span>
                  {selectedOfficer === off && <Check size={14} />}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAssignModalAlertId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={isAssigning}
                className="px-3 py-1.5 text-xs text-white bg-[#087F5B] rounded font-semibold flex items-center gap-1"
              >
                {isAssigning ? <Loader2 size={13} className="animate-spin" /> : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
