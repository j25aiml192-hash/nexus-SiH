import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Share2,
  Bell,
  ShieldAlert,
  BarChart3,
  MapPin,
  FileSpreadsheet,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedComplaintId = useNexusStore((state) => state.selectedComplaintId);
  const alerts = useNexusStore((state) => state.alerts);
  const incidents = useNexusStore((state) => state.incidents);
  const isSidebarCollapsed = useNexusStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useNexusStore((state) => state.toggleSidebarCollapsed);
  const newAlertsCount = alerts.filter((a) => a.status === 'new').length;
  const openIncidentsCount = incidents.filter((i) => i.status === 'open').length;

  return (
    <aside className={`nexus-floating-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="nexus-floating-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          <div className="nexus-floating-logo shrink-0">
            <Zap size={18} className="text-white fill-white" />
          </div>
          {!isSidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, overflow: 'hidden', marginLeft: '2px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                NEXUS
              </span>
            </div>
          )}
        </div>
        <button
          className="nexus-floating-toggle-btn shrink-0"
          onClick={toggleSidebarCollapsed}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* Dashed Separator Rule */}
      <div className="nexus-dashed-divider" />

      {/* Nav List */}
      <div className="nexus-floating-nav-list">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <LayoutDashboard size={18} />
          </div>
          <span className="nexus-floating-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/complaints"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <FileText size={18} />
          </div>
          <span className="nexus-floating-label">Complaints</span>
        </NavLink>

        <NavLink
          to={selectedComplaintId ? `/complaints/${selectedComplaintId}/network` : '/complaints/CMP-2026-9081/network'}
          className={({ isActive }) =>
            `nexus-floating-item ${isActive || location.pathname.includes('/network') ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <Share2 size={18} />
          </div>
          <span className="nexus-floating-label">Investigations</span>
        </NavLink>

        <NavLink
          to="/alerts"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <Bell size={18} />
          </div>
          <span className="nexus-floating-label">Alerts</span>
          {newAlertsCount > 0 && (
            <span className="nexus-floating-badge">{newAlertsCount}</span>
          )}
        </NavLink>

        <NavLink
          to="/incidents"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <ShieldAlert size={18} />
          </div>
          <span className="nexus-floating-label">Incidents</span>
          {openIncidentsCount > 0 && (
            <span className="nexus-floating-badge warning">{openIncidentsCount}</span>
          )}
        </NavLink>

        <NavLink
          to={selectedComplaintId ? `/prediction/${selectedComplaintId}` : '/prediction/CMP-2026-9081'}
          className={({ isActive }) =>
            `nexus-floating-item ${isActive || location.pathname.includes('/prediction') ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <BarChart3 size={18} />
          </div>
          <span className="nexus-floating-label">Analytics</span>
        </NavLink>

        <NavLink
          to="/map"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <MapPin size={18} />
          </div>
          <span className="nexus-floating-label">Geospatial Map</span>
        </NavLink>

        <NavLink
          to="/alerts"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive && location.pathname.includes('/reports') ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <FileSpreadsheet size={18} />
          </div>
          <span className="nexus-floating-label">Reports</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive && location.pathname.includes('/settings') ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <Settings size={18} />
          </div>
          <span className="nexus-floating-label">Settings</span>
        </NavLink>
      </div>

      {/* Dashed Separator Rule */}
      <div className="nexus-dashed-divider" />

      {/* Analyst Profile Pill at Bottom of Sidebar */}
      <div style={{ padding: '10px', marginTop: 'auto', borderTop: '1px solid #E2E8F0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: isSidebarCollapsed ? '6px' : '8px 10px',
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.08)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          title={isSidebarCollapsed ? 'Demo Analyst | Analyst Mode' : undefined}
        >
          {/* Avatar Icon Box */}
          <div
            style={{
              position: 'relative',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Shield size={16} />
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                border: '2px solid #FFFFFF'
              }}
            />
          </div>

          {/* User Info (Expanded Only) */}
          {!isSidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0, flex: 1, overflow: 'hidden', gap: '2px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', color: '#0F172A', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Demo Analyst
                </span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '9px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    color: '#1D4ED8',
                    backgroundColor: 'rgba(239, 246, 255, 0.9)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    border: '1px solid rgba(191, 219, 254, 0.8)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}>
                    Analyst Mode
                  </span>
                </div>
              </div>
              <ChevronDown size={14} style={{ color: '#64748B', flexShrink: 0, marginLeft: '4px' }} />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

