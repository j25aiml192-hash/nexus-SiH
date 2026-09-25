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
  Loader2,
  X,
  Check,
  ShieldAlert,
  Zap,
  Radio,
  AlertOctagon,
  ArrowUpRight,
  Shield,
  Activity,
  UserPlus
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

  const handleViewOnMap = (alertItem: any) => {
    if (alertItem.complaint_id) {
      setSelectedComplaintId(alertItem.complaint_id);
    }
    setMapFocus({
      cellOrAtmId: alertItem.id,
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

  // Calculate statistics for header KPI cards
  const totalAlertsCount = alerts.length;
  const criticalCount = alerts.filter(
    (a) => (a.severity || '').toUpperCase() === 'CRITICAL' || (a.severity || '').toUpperCase() === 'RED'
  ).length;
  const highCount = alerts.filter(
    (a) => (a.severity || '').toUpperCase() === 'HIGH' || (a.severity || '').toUpperCase() === 'AMBER'
  ).length;
  const unassignedCount = alerts.filter((a) => a.status === 'new' || !a.assigned_officer).length;
  const actionedCount = alerts.filter((a) => a.status === 'actioned' || a.status === 'assigned').length;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F1F5F9',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #E2E8F0 100%)',
      color: '#0F172A',
      padding: '28px 36px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* 1. FLOATING TOP HEADER & COMMAND CENTER BANNER BOX */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '22px',
        padding: '20px 24px',
        marginBottom: '24px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 12px 32px -6px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        transition: 'all 0.25s ease'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#DC2626',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.15)'
            }}>
              <Radio size={20} className="animate-pulse" />
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#0F172A',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Active Intercept Radar
              <span style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                REALTIME RADAR ONLINE
              </span>
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, paddingLeft: '48px' }}>
            Realtime cybercrime intercept notifications prioritized by Dual LightGBM & XGBoost risk vectors.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => refetch()}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
            }}
          >
            <Activity size={15} className={isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span>Refresh Feed</span>
          </button>

          <button
            onClick={handleSimulateInboundAlert}
            disabled={isSimulating}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: '1px solid #3B82F6',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
              opacity: isSimulating ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isSimulating) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(37, 99, 235, 0.45)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(37, 99, 235, 0.35)';
            }}
          >
            {isSimulating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Simulating Intercept...</span>
              </>
            ) : (
              <>
                <Zap size={15} className="text-yellow-300" />
                <span>+ Simulate Inbound Alert</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. FLOATING STATS KPI HEADER ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '18px',
        marginBottom: '24px'
      }}>
        {/* KPI 1: Total Alerts */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '18px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 28px -4px rgba(15, 23, 42, 0.05), 0 2px 8px rgba(15, 23, 42, 0.02)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 16px 36px -6px rgba(15, 23, 42, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 28px -4px rgba(15, 23, 42, 0.05), 0 2px 8px rgba(15, 23, 42, 0.02)';
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Feed Alerts
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', marginTop: '3px', fontFamily: 'monospace' }}>
              {totalAlertsCount}
            </div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)' }}>
            <Bell size={20} />
          </div>
        </div>

        {/* KPI 2: Critical / High Risk */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FECACA',
            borderRadius: '18px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 28px -4px rgba(220, 38, 38, 0.08), 0 2px 8px rgba(220, 38, 38, 0.03)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 16px 36px -6px rgba(220, 38, 38, 0.16)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 28px -4px rgba(220, 38, 38, 0.08), 0 2px 8px rgba(220, 38, 38, 0.03)';
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#DC2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Critical / High Risk
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#DC2626', marginTop: '3px', fontFamily: 'monospace' }}>
              {criticalCount + highCount}
            </div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)' }}>
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* KPI 3: Pending Action */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FDE68A',
            borderRadius: '18px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 28px -4px rgba(217, 119, 6, 0.08), 0 2px 8px rgba(217, 119, 6, 0.03)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 16px 36px -6px rgba(217, 119, 6, 0.16)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 28px -4px rgba(217, 119, 6, 0.08), 0 2px 8px rgba(217, 119, 6, 0.03)';
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#D97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Assignment
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#D97706', marginTop: '3px', fontFamily: 'monospace' }}>
              {unassignedCount}
            </div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)' }}>
            <UserPlus size={20} />
          </div>
        </div>

        {/* KPI 4: Intercept Actioned */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #A7F3D0',
            borderRadius: '18px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 28px -4px rgba(5, 150, 105, 0.08), 0 2px 8px rgba(5, 150, 105, 0.03)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 16px 36px -6px rgba(5, 150, 105, 0.16)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 28px -4px rgba(5, 150, 105, 0.08), 0 2px 8px rgba(5, 150, 105, 0.03)';
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Assigned & Dispatched
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#059669', marginTop: '3px', fontFamily: 'monospace' }}>
              {actionedCount}
            </div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)' }}>
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* 3. FLOATING ASSIGNMENT SUCCESS BANNER BOX */}
      {assignSuccessNotice && (
        <div style={{
          marginBottom: '24px',
          padding: '16px 22px',
          borderRadius: '16px',
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 10px 28px -4px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.2)' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#065F46', fontFamily: 'monospace' }}>
                ALERT {assignSuccessNotice.alertId} ASSIGNED TO {assignSuccessNotice.officer.toUpperCase()}
              </div>
              <div style={{ fontSize: '12.5px', color: '#047857', marginTop: '2px' }}>
                Officer notified & tactical dispatch docket activated in incidents database.
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/incidents')}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              backgroundColor: '#059669',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}
          >
            <span>Open Incidents Docket</span>
            <ExternalLink size={14} />
          </button>
        </div>
      )}

      {/* 4. FLOATING RADAR SEARCH & FILTER BAR BOX */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '18px 22px',
        marginBottom: '26px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 12px 32px -6px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Search Input Floating Box */}
        <div style={{ position: 'relative', flex: '1 1 320px', minWidth: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search by Alert ID, Complaint ID, Officer, or Keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '12px',
              padding: '10px 14px 10px 38px',
              fontSize: '12.5px',
              fontFamily: 'monospace',
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.04)'
            }}
          />
        </div>

        {/* Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginRight: '4px' }}>
            STATUS:
          </span>
          {(['all', 'new', 'assigned', 'actioned'] as const).map((st) => {
            const count = st === 'all' 
              ? alerts.length 
              : alerts.filter((a) => (a.status || 'new') === st).length;

            const isActive = statusFilter === st;

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #2563EB' : '1px solid #E2E8F0',
                  backgroundColor: isActive ? '#2563EB' : '#F8FAFC',
                  color: isActive ? '#FFFFFF' : '#475569',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{st}</span>
                <span style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? '#1D4ED8' : '#CBD5E1',
                  color: '#FFFFFF'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Risk Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginRight: '4px' }}>
            RISK:
          </span>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((rf) => {
            const isActive = riskFilter === rf;
            let activeBg = '#2563EB';
            let activeBorder = '#2563EB';
            let activeColor = '#FFFFFF';
            let activeShadow = 'rgba(37, 99, 235, 0.25)';

            if (rf === 'critical') {
              activeBg = '#DC2626';
              activeBorder = '#DC2626';
              activeShadow = 'rgba(220, 38, 38, 0.25)';
            } else if (rf === 'high') {
              activeBg = '#EA580C';
              activeBorder = '#EA580C';
              activeShadow = 'rgba(234, 88, 12, 0.25)';
            } else if (rf === 'medium') {
              activeBg = '#D97706';
              activeBorder = '#D97706';
              activeShadow = 'rgba(217, 119, 6, 0.25)';
            }

            return (
              <button
                key={rf}
                onClick={() => setRiskFilter(rf)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: isActive ? `1px solid ${activeBorder}` : '1px solid #E2E8F0',
                  backgroundColor: isActive ? activeBg : '#F8FAFC',
                  color: isActive ? activeColor : '#475569',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: isActive ? `0 4px 12px ${activeShadow}` : '0 1px 3px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.15s ease'
                }}
              >
                {rf}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. FLOATING ALERTS GRID DISPLAY */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '22px'
      }}>
        {isLoading && alerts.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '60px 0',
            textAlign: 'center',
            boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.06)'
          }}>
            <Loader2 size={36} style={{ color: '#2563EB', margin: '0 auto 14px auto' }} className="animate-spin" />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>
              STREAMING INTERCEPT RADAR FEED...
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Querying neural risk predictions & live event queue from database...
            </div>
          </div>
        ) : error ? (
          <div style={{
            gridColumn: '1 / -1',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '60px 0',
            textAlign: 'center',
            boxShadow: '0 10px 30px -5px rgba(220, 38, 38, 0.08)'
          }}>
            <AlertOctagon size={42} style={{ color: '#DC2626', margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#DC2626' }}>
              Failed to connect to radar feed
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', fontFamily: 'monospace' }}>
              {error}
            </div>
            <button
              onClick={() => refetch()}
              style={{
                marginTop: '16px',
                padding: '9px 18px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#DC2626',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)'
              }}
            >
              Retry Connection
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '60px 0',
            textAlign: 'center',
            boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.06)'
          }}>
            <Bell size={42} style={{ color: '#94A3B8', margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#334155' }}>
              No matching intercept alerts detected
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Adjust search filters or click "+ Simulate Inbound Alert" to trigger a live cash-out event.
            </div>
          </div>
        ) : (
          alerts.map((alertItem) => {
            const riskLevel = (alertItem.severity || 'HIGH').toUpperCase();
            const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'RED';
            const isHigh = riskLevel === 'HIGH' || riskLevel === 'AMBER';
            const isAssigned = alertItem.status === 'assigned';
            const isNew = alertItem.status === 'new';

            const officerName = alertItem.assigned_officer || 'Unassigned';

            // Card Styling Configuration for Floating Boxes
            let accentGradient = 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%)';
            let cardBorder = '1px solid rgba(226, 232, 240, 0.9)';
            let badgeBg = '#EFF6FF';
            let badgeColor = '#1D4ED8';
            let badgeBorder = '#BFDBFE';
            let floatShadow = '0 12px 32px -6px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.03)';
            let hoverShadow = '0 22px 48px -10px rgba(15, 23, 42, 0.16)';

            if (isCritical) {
              accentGradient = 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)';
              cardBorder = '1px solid #FECACA';
              badgeBg = '#FEF2F2';
              badgeColor = '#DC2626';
              badgeBorder = '#FCA5A5';
              floatShadow = '0 12px 32px -6px rgba(220, 38, 38, 0.12), 0 4px 12px rgba(220, 38, 38, 0.04)';
              hoverShadow = '0 22px 48px -10px rgba(220, 38, 38, 0.22)';
            } else if (isHigh) {
              accentGradient = 'linear-gradient(90deg, #F97316 0%, #EA580C 100%)';
              cardBorder = '1px solid #FED7AA';
              badgeBg = '#FFF7ED';
              badgeColor = '#EA580C';
              badgeBorder = '#FDBA74';
              floatShadow = '0 12px 32px -6px rgba(234, 88, 12, 0.1), 0 4px 12px rgba(234, 88, 12, 0.03)';
              hoverShadow = '0 22px 48px -10px rgba(234, 88, 12, 0.2)';
            }

            return (
              <div
                key={alertItem.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: cardBorder,
                  borderRadius: '20px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: floatShadow,
                  transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = hoverShadow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = floatShadow;
                }}
              >
                {/* Top Glowing Severity Line */}
                <div style={{ height: '4px', background: accentGradient, width: '100%' }} />

                <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                  {/* Header Row: ID + Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        color: '#0F172A',
                        backgroundColor: '#F1F5F9',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                      }}>
                        {alertItem.id}
                      </span>

                      {/* Risk Badge */}
                      <span style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        border: `1px solid ${badgeBorder}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
                      }}>
                        {riskLevel} RISK
                      </span>
                    </div>

                    {/* Status Chip */}
                    <span style={{
                      fontSize: '9.5px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      backgroundColor: isNew ? '#FEF2F2' : isAssigned ? '#FFFBEB' : '#ECFDF5',
                      color: isNew ? '#DC2626' : isAssigned ? '#D97706' : '#059669',
                      border: isNew ? '1px solid #FECACA' : isAssigned ? '1px solid #FDE68A' : '1px solid #A7F3D0',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
                    }}>
                      {(alertItem.status || 'new').toUpperCase()}
                    </span>
                  </div>

                  {/* Target Case Floating Info Box */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#F8FAFC',
                    padding: '9px 14px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
                  }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', fontWeight: 700 }}>
                      TARGET CASE:
                    </span>
                    <span
                      onClick={() => navigate(`/complaints/${alertItem.complaint_id}`)}
                      style={{
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color: '#2563EB',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {alertItem.complaint_id || 'CMP-2026-9081'}
                      <ArrowUpRight size={13} />
                    </span>
                  </div>

                  {/* Alert Message Box */}
                  <div style={{
                    backgroundColor: '#F1F5F9',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12.5px',
                    color: '#1E293B',
                    lineHeight: '1.5',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.03)'
                  }}>
                    {alertItem.message}
                  </div>

                  {/* Details Grid: Officer & Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                    {/* Officer Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={14} style={{ color: '#94A3B8' }} />
                        <span style={{ fontWeight: 600 }}>Assigned Officer:</span>
                      </span>
                      <span style={{
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: officerName !== 'Unassigned' ? '#059669' : '#DC2626',
                        backgroundColor: officerName !== 'Unassigned' ? '#ECFDF5' : '#FEF2F2',
                        border: officerName !== 'Unassigned' ? '1px solid #A7F3D0' : '1px solid #FECACA',
                        padding: '3px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
                      }}>
                        {officerName}
                      </span>
                    </div>

                    {/* Timestamp Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} style={{ color: '#94A3B8' }} />
                        <span style={{ fontWeight: 600 }}>Timestamp:</span>
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                        {alertItem.created_at
                          ? new Date(alertItem.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : 'Realtime Window'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Floating Footer */}
                <div style={{
                  padding: '14px 22px',
                  backgroundColor: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => handleViewOnMap(alertItem)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#2563EB',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.1)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#DBEAFE';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <MapPin size={14} />
                    <span>View on Map</span>
                  </button>

                  {alertItem.status === 'new' ? (
                    <button
                      onClick={() => handleOpenAssign(alertItem.id)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        border: '1px solid #059669',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                      }}
                    >
                      <UserCheck size={14} />
                      <span>Assign Officer</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenAssign(alertItem.id)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#475569',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F1F5F9';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <UserCheck size={14} />
                      <span>Reassign</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. MODAL: ASSIGN OFFICER FLOATING DIALOG */}
      {assignModalAlertId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3), 0 8px 24px rgba(15, 23, 42, 0.1)',
            color: '#0F172A'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '14px', backgroundColor: '#EFF6FF', color: '#2563EB', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)' }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    Assign Tactical Officer
                  </h3>
                  <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#64748B', marginTop: '2px', fontWeight: 700 }}>
                    ALERT TARGET: {assignModalAlertId}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setAssignModalAlertId(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '18px', lineHeight: '1.5' }}>
              Select an investigating officer from active field units to assign rapid intercept dispatch for Alert <strong>{assignModalAlertId}</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                { name: 'Inspector Vikram Rao', badge: 'Special Cell · Delhi', status: 'Active' },
                { name: 'Inspector Rajesh Sharma', badge: 'Cyber Cell · Sector 62', status: 'Available' },
                { name: 'Sub-Inspector Anjali Verma', badge: 'NCRP Tactical Unit', status: 'Available' },
                { name: 'Inspector Priya Deshmukh', badge: 'Mule Intercept Division', status: 'On Field' },
              ].map((off) => {
                const isSelected = officerNameInput === off.name;

                return (
                  <button
                    key={off.name}
                    onClick={() => setOfficerNameInput(off.name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                      border: isSelected ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isSelected ? '0 4px 14px rgba(37, 99, 235, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: isSelected ? '#2563EB' : '#0F172A' }}>
                        {off.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                        {off.badge}
                      </div>
                    </div>
                    {isSelected && <Check size={20} style={{ color: '#2563EB' }} />}
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAssignModalAlertId(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={isAssigning}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: '1px solid #059669',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isAssigning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                }}
              >
                {isAssigning ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Updating Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} />
                    <span>Confirm Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
