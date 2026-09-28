import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  MapPin,
  ExternalLink,
  Clock,
  CheckCircle2,
  Loader2,
  X,
  ShieldAlert,
  Zap,
  AlertOctagon,
  ArrowUpRight,
  Shield,
  Activity,
  UserPlus,
  Download,
  Grid,
  List,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
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

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [assignModalAlertId, setAssignModalAlertId] = useState<string | null>(null);
  const [officerNameInput, setOfficerNameInput] = useState('Inspector Rajesh Sharma');
  const [isAssigning, setIsAssigning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [assignSuccessNotice, setAssignSuccessNotice] = useState<{
    alertId: string;
    officer: string;
  } | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);

  const handleViewOnMap = (alertItem: any) => {
    if (alertItem.complaint_id || alertItem.complaintId) {
      setSelectedComplaintId(alertItem.complaint_id || alertItem.complaintId);
    }
    setMapFocus({
      cellOrAtmId: alertItem.id || alertItem.alert_id,
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

  const handleCopyId = (e: React.MouseEvent, idStr: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(idStr);
    setCopiedId(idStr);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Alert ID', 'Complaint ID', 'Severity Risk', 'Status', 'Assigned Officer', 'Message', 'Created At'];
    const rows = alerts.map((a) => [
      a.id || a.alert_id,
      a.complaint_id || a.complaintId || '',
      a.severity || 'HIGH',
      a.status || 'new',
      a.assigned_officer || 'Unassigned',
      a.message || '',
      a.created_at || a.createdAt || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NEXUS_Alerts_Radar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Paginated Alerts
  const totalPages = Math.ceil(alerts.length / pageSize) || 1;
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return alerts.slice(start, start + pageSize);
  }, [alerts, currentPage, pageSize]);

  // Statistics for Header KPI Cards
  const totalAlertsCount = alerts.length;
  const criticalCount = alerts.filter(
    (a) => (a.severity || '').toUpperCase() === 'CRITICAL' || (a.severity || '').toUpperCase() === 'RED'
  ).length;
  const highCount = alerts.filter(
    (a) => (a.severity || '').toUpperCase() === 'HIGH' || (a.severity || '').toUpperCase() === 'AMBER'
  ).length;
  const unassignedCount = alerts.filter((a) => a.status === 'new' || !a.assigned_officer).length;
  const actionedCount = alerts.filter((a) => a.status === 'actioned' || a.status === 'assigned').length;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Just now';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div style={{ padding: '24px 32px 60px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. Header Banner & Command Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              Realtime Intercept Radar & Alerts
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              RADAR ONLINE
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Realtime cash-out predictions and high-velocity mule account alerts prioritized by XGBoost risk vectors.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => refetch()}
            title="Refresh Feed"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            <Activity size={16} className={isLoading ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateInboundAlert}
            disabled={isSimulating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
              opacity: isSimulating ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isSimulating) {
                e.currentTarget.style.backgroundColor = '#1E293B';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000000';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isSimulating ? (
              <>
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Zap size={16} style={{ color: '#FBBF24' }} />
                <span>+ Simulate Inbound Alert</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* KPI 1: Total Alerts */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Bell size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Feed Alerts
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {isLoading ? '...' : totalAlertsCount}
            </div>
            <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600, marginTop: '2px' }}>
              Radar stream active
            </div>
          </div>
        </div>

        {/* KPI 2: Critical & High Risk */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FE8989',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(239, 68, 68, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Critical / High Risk
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {isLoading ? '...' : criticalCount + highCount}
            </div>
            <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '2px' }}>
              High-velocity cashouts
            </div>
          </div>
        </div>

        {/* KPI 3: Unassigned */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#FFFBEB',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <UserPlus size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Assignment
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#D97706', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {isLoading ? '...' : unassignedCount}
            </div>
            <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 600, marginTop: '2px' }}>
              Awaiting officer dispatch
            </div>
          </div>
        </div>

        {/* KPI 4: Dispatched & Actioned */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#F0FDF4',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Assigned & Dispatched
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#16A34A', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {isLoading ? '...' : actionedCount}
            </div>
            <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600, marginTop: '2px' }}>
              Incident dockets active
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Success Banner */}
      {assignSuccessNotice && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 20px',
            borderRadius: '12px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} color="#16A34A" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#15803D', fontFamily: "'JetBrains Mono', monospace" }}>
                ALERT {assignSuccessNotice.alertId} ASSIGNED TO {assignSuccessNotice.officer.toUpperCase()}
              </div>
              <div style={{ fontSize: '12px', color: '#166534' }}>
                Officer notified & tactical dispatch docket created.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/incidents')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              backgroundColor: '#16A34A',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Open Incidents Docket</span>
            <ExternalLink size={14} />
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '14px 18px',
            marginBottom: '20px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px'
          }}
        >
          <AlertOctagon size={18} color="#DC2626" />
          <span style={{ fontWeight: 600 }}>{error}</span>
          <button
            onClick={() => refetch()}
            style={{
              marginLeft: 'auto',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 3. Filter Command Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div
            style={{
              flex: 1,
              minWidth: '280px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '8px 14px'
            }}
          >
            <Search size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search alert ID, complaint ID, officer, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              STATUS:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#0F172A',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="new">New (Unassigned)</option>
              <option value="assigned">Assigned</option>
              <option value="actioned">Dispatched / Actioned</option>
            </select>
          </div>

          {/* Risk Filter Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              RISK:
            </span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#0F172A',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical (Red)</option>
              <option value="high">High (Amber)</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '10px', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'table' ? '#0F172A' : '#64748B',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <List size={15} />
              <span>Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'cards' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'cards' ? '#0F172A' : '#64748B',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'cards' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Grid size={15} />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. VIEW MODE A: TABLE VIEW */}
      {viewMode === 'table' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ALERT ID & COMPLAINT REF
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    SEVERITY RISK
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ATM / HOTSPOT TARGET
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ASSIGNED OFFICER
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TIMESTAMP
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && alerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: '#64748B', fontSize: '13px', fontWeight: 600 }}>
                        <Loader2 size={18} className="animate-spin text-blue-600" />
                        <span>Streaming realtime radar alerts feed...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      No alerts found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedAlerts.map((alertItem) => {
                    const alertId = alertItem.id || alertItem.alert_id || '';
                    const complaintId = alertItem.complaint_id || alertItem.complaintId || 'CMP-1030';
                    const riskLevel = (alertItem.severity || 'HIGH').toUpperCase();
                    const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'RED';
                    const isHigh = riskLevel === 'HIGH' || riskLevel === 'AMBER';
                    const statusStr = (alertItem.status || 'new').toLowerCase();
                    const officerName = alertItem.assigned_officer || alertItem.assignedOfficerId;

                    return (
                      <tr
                        key={alertId}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Alert ID */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                              {alertId}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(e, alertId)}
                              title="Copy ID"
                              style={{ border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                            >
                              {copiedId === alertId ? <CheckCircle2 size={13} color="#16A34A" /> : <Copy size={13} />}
                            </button>
                          </div>
                          {complaintId && (
                            <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#0284C7', fontWeight: 600, marginTop: '2px' }}>
                              Case: {complaintId}
                            </div>
                          )}
                        </td>

                        {/* Severity */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              fontFamily: "'JetBrains Mono', monospace",
                              backgroundColor: isCritical ? '#FEF2F2' : isHigh ? '#FFF7ED' : '#F0FDF4',
                              color: isCritical ? '#DC2626' : isHigh ? '#EA580C' : '#16A34A',
                              border: isCritical ? '1px solid #FECACA' : isHigh ? '1px solid #FFEDD5' : '1px solid #BBF7D0'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isCritical ? '#DC2626' : isHigh ? '#EA580C' : '#16A34A' }} />
                            {riskLevel}
                          </span>
                        </td>

                        {/* Location */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                            <MapPin size={13} style={{ color: '#0284C7' }} />
                            <span>{alertItem.h3Cell || alertItem.atmId || 'Deoghar Market Cell'}</span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                            {alertItem.message || 'Suspicious high-velocity ATM cashout predicted'}
                          </div>
                        </td>

                        {/* Assigned Officer */}
                        <td style={{ padding: '14px 18px' }}>
                          {officerName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Shield size={14} style={{ color: '#059669' }} />
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{officerName}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAssign(alertId)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                color: '#2563EB',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <UserPlus size={13} />
                              <span>Assign Officer</span>
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              backgroundColor: statusStr === 'actioned' ? '#ECFDF5' : statusStr === 'assigned' ? '#EFF6FF' : '#FFFBEB',
                              color: statusStr === 'actioned' ? '#059669' : statusStr === 'assigned' ? '#1D4ED8' : '#D97706'
                            }}
                          >
                            {statusStr}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                            <Clock size={12} />
                            <span>{formatDate(alertItem.createdAt || alertItem.created_at)}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleViewOnMap(alertItem)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                color: '#334155',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <MapPin size={13} style={{ color: '#0284C7' }} />
                              <span>Map</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (complaintId) {
                                  setSelectedComplaintId(complaintId);
                                  navigate(`/complaints/${complaintId}`);
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#000000',
                                color: '#FFFFFF',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>Case</span>
                              <ArrowUpRight size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. VIEW MODE B: CARDS GRID VIEW */}
      {viewMode === 'cards' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}
        >
          {isLoading && alerts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748B' }}>
              <Loader2 size={24} className="animate-spin text-blue-600 inline-block mb-2" />
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Streaming radar feed...</div>
            </div>
          ) : paginatedAlerts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748B' }}>
              No intercept alerts match current filter criteria.
            </div>
          ) : (
            paginatedAlerts.map((alertItem) => {
              const alertId = alertItem.id || alertItem.alert_id || '';
              const complaintId = alertItem.complaint_id || alertItem.complaintId || 'CMP-1030';
              const riskLevel = (alertItem.severity || 'HIGH').toUpperCase();
              const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'RED';
              const isHigh = riskLevel === 'HIGH' || riskLevel === 'AMBER';
              const officerName = alertItem.assigned_officer || alertItem.assignedOfficerId;

              const accentColor = isCritical ? '#DC2626' : isHigh ? '#EA580C' : '#16A34A';

              return (
                <div
                  key={alertId}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${isCritical ? '#FECACA' : isHigh ? '#FFEDD5' : '#E2E8F0'}`,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.02)';
                  }}
                >
                  {/* Top Severity Glow Bar */}
                  <div style={{ height: '4px', backgroundColor: accentColor, width: '100%' }} />

                  <div style={{ padding: '20px' }}>
                    {/* Top Row: ID + Severity Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                        {alertId}
                      </span>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 800,
                          fontFamily: "'JetBrains Mono', monospace",
                          backgroundColor: isCritical ? '#FEF2F2' : isHigh ? '#FFF7ED' : '#F0FDF4',
                          color: accentColor,
                          border: `1px solid ${isCritical ? '#FCA5A5' : isHigh ? '#FDBA74' : '#BBF7D0'}`
                        }}
                      >
                        {riskLevel}
                      </span>
                    </div>

                    {/* Alert Description / Location */}
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px', lineHeight: 1.35 }}>
                      {alertItem.message || 'High-velocity cashout corridor alert'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
                      <MapPin size={13} style={{ color: '#0284C7' }} />
                      <span>{alertItem.h3Cell || alertItem.atmId || 'Deoghar ATM Corridor'}</span>
                    </div>

                    {/* Metadata Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '10px', fontSize: '11.5px' }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Officer: </span>
                        <span style={{ fontWeight: 700, color: officerName ? '#0F172A' : '#D97706' }}>
                          {officerName || 'Unassigned'}
                        </span>
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#64748B', fontSize: '11px' }}>
                        {formatDate(alertItem.createdAt || alertItem.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div style={{ padding: '14px 20px', backgroundColor: '#FFFFFF', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleViewOnMap(alertItem)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#334155',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <MapPin size={13} style={{ color: '#0284C7' }} />
                        <span>Map</span>
                      </button>

                      {!officerName && (
                        <button
                          type="button"
                          onClick={() => handleOpenAssign(alertId)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#2563EB',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <UserPlus size={13} />
                          <span>Assign</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (complaintId) {
                          setSelectedComplaintId(complaintId);
                          navigate(`/complaints/${complaintId}`);
                        }
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#000000',
                        color: '#FFFFFF',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>View Case</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Pagination Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #E2E8F0'
        }}
      >
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
          Showing <strong>{paginatedAlerts.length}</strong> of <strong>{alerts.length}</strong> radar alerts
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Per Page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                color: '#0F172A',
                outline: 'none'
              }}
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.4 : 1
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", padding: '0 4px' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.4 : 1
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 7. OFFICER ASSIGNMENT MODAL PORTAL */}
      {assignModalAlertId && createPortal(
        <div
          onClick={() => setAssignModalAlertId(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '420px',
              maxWidth: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px 0' }}>
                  Assign Intercept Officer
                </h3>
                <div style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: '#0284C7', fontWeight: 700 }}>
                  Alert Docket: {assignModalAlertId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalAlertId(null)}
                style={{ border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Officer Name / Badge ID
              </label>
              <input
                type="text"
                value={officerNameInput}
                onChange={(e) => setOfficerNameInput(e.target.value)}
                placeholder="e.g. Inspector Rajesh Sharma"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Quick Officer Selector Buttons */}
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
                Preset Active Duty Dispatch Officers:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Inspector Rajesh Sharma', 'Inspector Priya Nair', 'Officer Vikram Singh', 'Sub-Inspector Amit Verma'].map((off) => (
                  <button
                    key={off}
                    type="button"
                    onClick={() => setOfficerNameInput(off)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: officerNameInput === off ? '1px solid #000000' : '1px solid #E2E8F0',
                      backgroundColor: officerNameInput === off ? '#000000' : '#F8FAFC',
                      color: officerNameInput === off ? '#FFFFFF' : '#334155',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {off}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setAssignModalAlertId(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAssign}
                disabled={isAssigning || !officerNameInput.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isAssigning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isAssigning ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>Confirm Dispatch</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AlertsPage;
