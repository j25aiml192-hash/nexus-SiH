import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  MapPin, 
  ArrowRight,
  ShieldAlert,
  Shield,
  Zap,
  Clock,
  ChevronRight,
  Building2,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TelemetryChartCard } from '../components/nexus/TelemetryChartCard';
import { NewComplaintModal } from '../components/nexus/NewComplaintModal';
import { useDashboardStats } from '../hooks/useNexusData';
import type { Complaint } from '../types/nexus';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [showNewComplaintModal, setShowNewComplaintModal] = useState(false);
  const [telemetryTab, setTelemetryTab] = useState<'flow' | 'volume' | 'risk'>('flow');

  // Fetch stats from backend API
  const { stats, isLoading, error, refetch } = useDashboardStats('24h');

  const handleNewComplaint = (_createdComp: Complaint) => {
    refetch();
  };

  const floatingCardBaseStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    borderRadius: '16px',
    boxShadow: '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  };

  return (
    <div style={{
      backgroundColor: '#F8FAFC',
      minHeight: 'calc(100vh - 76px)',
      color: '#0F172A',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '28px 36px 56px 36px'
    }}>
      
      {/* 1. DASHBOARD HEADER & TITLE BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
              Cybercrime Intelligence Dashboard
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#059669',
              fontSize: '11.5px',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
              System Online
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#64748B',
              fontWeight: 500
            }}>
              <Shield size={14} style={{ color: '#475569' }} />
              3 Hotspot Corridors Active
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
            Live cybercrime defense telemetry, money trail analytics & predictive cashout window monitoring.
          </p>
        </div>

        {/* Primary Header Action */}
        <button
          onClick={() => setShowNewComplaintModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: '#0B2238',
            backgroundImage: 'linear-gradient(135deg, #0B2238 0%, #102F4A 100%)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(79, 70, 229, 0.35)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 24px rgba(79, 70, 229, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(79, 70, 229, 0.35)';
          }}
        >
          <Plus size={16} />
          <span>New Intel</span>
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          color: '#B91C1C',
          fontSize: '12.5px',
          fontFamily: 'monospace',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.1)'
        }}>
          <span>⚠️ API Telemetry Error: {error}</span>
          <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: '#991B1B', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}>
            Retry Sync
          </button>
        </div>
      )}

      {/* 2. PRIMARY KPI GRID (4 FLOATING CARDS) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        
        {/* CARD 1: OPEN COMPLAINTS */}
        <div
          style={{ ...floatingCardBaseStyle, padding: '20px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 18px 36px -6px rgba(15, 23, 42, 0.1), 0 8px 16px -4px rgba(15, 23, 42, 0.05)';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              OPEN COMPLAINTS
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#16A34A' }}>
              ⚡ live DB
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'monospace', color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '6px' }}>
            {isLoading ? '...' : (stats?.openComplaints ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
            Currently under active investigation
          </div>
        </div>

        {/* CARD 2: ACTIVE ALERTS */}
        <div
          style={{ ...floatingCardBaseStyle, padding: '20px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 18px 36px -6px rgba(220, 38, 38, 0.1), 0 8px 16px -4px rgba(15, 23, 42, 0.05)';
            e.currentTarget.style.borderColor = '#FECACA';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ACTIVE ALERTS
            </span>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, color: '#DC2626', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', backgroundColor: '#FEF2F2' }}>
              {stats?.highestAlertRisk || 'CRITICAL'}
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'monospace', color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '6px' }}>
            {isLoading ? '...' : (stats?.activeAlerts ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
            Highest risk: {stats?.highestAlertRisk || 'None'}
          </div>
        </div>

        {/* CARD 3: INCIDENTS */}
        <div
          style={{ ...floatingCardBaseStyle, padding: '20px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 18px 36px -6px rgba(15, 23, 42, 0.1), 0 8px 16px -4px rgba(15, 23, 42, 0.05)';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
            INCIDENTS
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '6px' }}>
            <div>
              <span style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'monospace', color: '#0F172A', letterSpacing: '-0.04em' }}>
                {isLoading ? '...' : (stats?.incidentsInProgress ?? 0)}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px', fontWeight: 500 }}>In progress</span>
            </div>
            <div>
              <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'monospace', color: '#64748B', letterSpacing: '-0.04em' }}>
                {isLoading ? '...' : (stats?.incidentsClosedToday ?? 0)}
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '4px', fontWeight: 500 }}>Closed/Auth</span>
            </div>
          </div>
        </div>

        {/* CARD 4: FUNDS AT RISK */}
        <div
          style={{ ...floatingCardBaseStyle, padding: '20px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 18px 36px -6px rgba(220, 38, 38, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.05)';
            e.currentTarget.style.borderColor = '#FECACA';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
            FUNDS AT RISK
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'monospace', color: '#DC2626', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '6px' }}>
            {isLoading ? '...' : (stats?.totalFundsAtRisk ?? '₹0')}
          </div>
          <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
            {isLoading ? '...' : (stats?.totalFundsFrozen ?? '₹0 secured / frozen')}
          </div>
        </div>

      </div>

      {/* 4. MIDDLE 2-COLUMN SECTION: PRIORITY ALERTS & RISK BREAKDOWN / QUICK ACTIONS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: '24px',
        marginBottom: '28px'
      }}>
        
        {/* LEFT COLUMN: PRIORITY ALERTS (FLOATING CARD) */}
        <div
          style={{ ...floatingCardBaseStyle, padding: '24px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 20px 40px -6px rgba(15, 23, 42, 0.09)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>ℹ️</span>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                Priority Alerts
              </h2>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              style={{ fontSize: '12.5px', fontWeight: 700, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View all</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>
            Highest-risk accounts inside an open cash-out window
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* ALERT CARD 1: AIRTEL PAYMENTS BANK */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.07)';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }}>
                  HIGH
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={15} style={{ color: '#475569' }} />
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>Airtel Payments Bank</span>
                    <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#94A3B8' }}>CMP-2026-9081</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                    NEXUS CRITICAL: Rs 8,45,000 digital arrest fraud. Cash-out corridor detected in Deoghar, Jharkhand within 4h window.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#DC2626', fontFamily: 'monospace' }}>94% RISK</div>
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <Clock size={11} /> 4h Window
                  </div>
                </div>
                <button
                  onClick={() => navigate('/prediction/CMP-2026-9081')}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* ALERT CARD 2: PAYTM PAYMENTS BANK */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.07)';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }}>
                  HIGH
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={15} style={{ color: '#475569' }} />
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>Paytm Payments Bank</span>
                    <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#94A3B8' }}>CMP-2026-9082</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                    NEXUS ALERT: Rs 1,20,000 UPI fraud moving towards Nuh Mewat ATM cluster.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#DC2626', fontFamily: 'monospace' }}>89% RISK</div>
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <Clock size={11} /> 6h Window
                  </div>
                </div>
                <button
                  onClick={() => navigate('/prediction/CMP-2026-9082')}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* ALERT CARD 3: HDFC BANK */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.07)';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }}>
                  HIGH
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={15} style={{ color: '#475569' }} />
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>HDFC Bank</span>
                    <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#94A3B8' }}>CMP-2026-9083</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                    NEXUS WARNING: Rs 15,00,000 investment fraud. Predicted withdrawal cluster near Giridih Market Branch.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#DC2626', fontFamily: 'monospace' }}>80% RISK</div>
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <Clock size={11} /> 12h Window
                  </div>
                </div>
                <button
                  onClick={() => navigate('/prediction/CMP-2026-9083')}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* ALERT CARD 4: SBI */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.07)';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }}>
                  HIGH
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={15} style={{ color: '#475569' }} />
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>SBI</span>
                    <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#94A3B8' }}>CMP-2026-9084</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                    NEXUS ALERT: Rs 65,000 vishing cash-out risk near Mathura Krishna Nagar.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#DC2626', fontFamily: 'monospace' }}>71% RISK</div>
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <Clock size={11} /> 8h Window
                  </div>
                </div>
                <button
                  onClick={() => navigate('/prediction/CMP-2026-9084')}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: RISK LEVEL BREAKDOWN & QUICK ACTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* RISK LEVEL BREAKDOWN CARD (FLOATING CARD) */}
          <div
            style={{ ...floatingCardBaseStyle, padding: '24px' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 20px 40px -6px rgba(15, 23, 42, 0.09)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} style={{ color: '#475569' }} />
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Risk Level Breakdown
                </h2>
              </div>
              <span style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 800, color: '#4F46E5', textTransform: 'uppercase' }}>
                ACTIVE
              </span>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
              Active case assessment spectrum
            </p>

            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'monospace', color: '#0F172A' }}>5</span>
              <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '8px' }}>Total active operational cases</span>
              <span style={{ float: 'right', fontSize: '12px', fontFamily: 'monospace', color: '#94A3B8' }}>100%</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* CRITICAL */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>CRITICAL</span>
                  <span><span style={{ color: '#DC2626', fontWeight: 800 }}>2</span> <span style={{ color: '#94A3B8', fontWeight: 500 }}>40%</span></span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '40%', height: '100%', backgroundColor: '#DC2626', borderRadius: '3px' }} />
                </div>
              </div>

              {/* HIGH */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>HIGH</span>
                  <span><span style={{ color: '#EA580C', fontWeight: 800 }}>3</span> <span style={{ color: '#94A3B8', fontWeight: 500 }}>60%</span></span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', backgroundColor: '#EA580C', borderRadius: '3px' }} />
                </div>
              </div>

              {/* MEDIUM */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>MEDIUM</span>
                  <span><span style={{ color: '#0F172A', fontWeight: 800 }}>0</span> <span style={{ color: '#94A3B8', fontWeight: 500 }}>0%</span></span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '0%', height: '100%', backgroundColor: '#D97706', borderRadius: '3px' }} />
                </div>
              </div>

              {/* LOW */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>LOW</span>
                  <span><span style={{ color: '#16A34A', fontWeight: 800 }}>0</span> <span style={{ color: '#94A3B8', fontWeight: 500 }}>0%</span></span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '0%', height: '100%', backgroundColor: '#16A34A', borderRadius: '3px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS LAUNCHER CARD (FLOATING CARD) */}
          <div
            style={{ ...floatingCardBaseStyle, padding: '24px' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 20px 40px -6px rgba(15, 23, 42, 0.09)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Zap size={16} style={{ color: '#0F172A' }} />
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Quick Actions
              </h2>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
              Shift duty operational shortcuts
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => setShowNewComplaintModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#0B2238',
                  backgroundImage: 'linear-gradient(135deg, #0B2238 0%, #102F4A 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 18px rgba(79, 70, 229, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.25)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} />
                  <span>New Complaint Intake</span>
                </div>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                  +N
                </span>
              </button>

              <button
                onClick={() => navigate('/alerts')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} style={{ color: '#475569' }} />
                  <span>Priority Alerts Feed</span>
                </div>
                <ArrowRight size={14} style={{ color: '#64748B' }} />
              </button>

              <button
                onClick={() => navigate('/map')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: '#475569' }} />
                  <span>Geospatial Hotspot Map</span>
                </div>
                <ArrowRight size={14} style={{ color: '#64748B' }} />
              </button>

              <button
                onClick={() => navigate('/incidents')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={16} style={{ color: '#475569' }} />
                  <span>Field Incident Workflow</span>
                </div>
                <ArrowRight size={14} style={{ color: '#64748B' }} />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 5. BOTTOM TELEMETRY CARD (FLOATING CARD) */}
      <div
        style={{ ...floatingCardBaseStyle, padding: '24px' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 20px 40px -6px rgba(15, 23, 42, 0.09)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: '#0F172A' }} />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                Live Operational Telemetry
              </h2>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
              Real-time telemetry stream & money trail analytics
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setTelemetryTab('flow')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: telemetryTab === 'flow' ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                backgroundColor: telemetryTab === 'flow' ? '#EFF6FF' : '#F8FAFC',
                color: telemetryTab === 'flow' ? '#2563EB' : '#64748B',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Transaction Flow
            </button>
            <button
              onClick={() => setTelemetryTab('volume')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: telemetryTab === 'volume' ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                backgroundColor: telemetryTab === 'volume' ? '#EFF6FF' : '#F8FAFC',
                color: telemetryTab === 'volume' ? '#2563EB' : '#64748B',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Complaint Volume
            </button>
            <button
              onClick={() => setTelemetryTab('risk')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: telemetryTab === 'risk' ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                backgroundColor: telemetryTab === 'risk' ? '#EFF6FF' : '#F8FAFC',
                color: telemetryTab === 'risk' ? '#2563EB' : '#64748B',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Risk Score Trend
            </button>
          </div>
        </div>

        {/* Telemetry Chart Component */}
        <TelemetryChartCard />

        {/* Bottom 4 Metric Pillars */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #F1F5F9',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>LIVE TXNS</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>72 Live Transactions</div>
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>HOTSPOTS</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>3 Hotspot Corridors</div>
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>EXPOSURE</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>₹12.4 L Exposure</div>
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>CONFIDENCE</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>94% Confidence</div>
          </div>
        </div>
      </div>

      {/* New Complaint Intake Modal */}
      <NewComplaintModal
        isOpen={showNewComplaintModal}
        onClose={() => setShowNewComplaintModal(false)}
        onComplaintCreated={handleNewComplaint}
      />
    </div>
  );
};

export default DashboardPage;
