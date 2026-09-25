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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
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
    </aside>
  );
};

