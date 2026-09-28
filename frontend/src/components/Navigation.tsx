import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ShieldAlert,
  BarChart3,
  MapPin,
  Settings,
  Network,
  FileCheck2,
  Zap,
} from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const incidents = useNexusStore((state) => state.incidents);
  const selectedComplaintId = useNexusStore((state) => state.selectedComplaintId);
  const isSidebarCollapsed = useNexusStore((state) => state.isSidebarCollapsed);
  const isSidebarHovered = useNexusStore((state) => state.isSidebarHovered);
  const setIsSidebarHovered = useNexusStore((state) => state.setIsSidebarHovered);

  const openIncidentsCount = incidents.filter((i) => i.status === 'open').length;

  // When isSidebarCollapsed is true (hover mode), sidebar is visually collapsed UNLESS hovered.
  // When isSidebarCollapsed is false (pinned open mode), sidebar is always visually expanded.
  const isVisuallyCollapsed = isSidebarCollapsed && !isSidebarHovered;

  return (
    <aside
      className={`nexus-floating-sidebar ${isVisuallyCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => {
        setIsSidebarHovered(false);
      }}
    >
      {/* Sidebar Header */}
      <div className="nexus-floating-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="nexus-floating-logo shrink-0" style={{ backgroundColor: 'transparent', boxShadow: 'none', padding: 0 }}>
            <img src="/nexus_logo.png" alt="NEXUS" style={{ height: '24px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }} />
          </div>
          {!isVisuallyCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, overflow: 'hidden', marginLeft: '2px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                NEXUS
              </span>
            </div>
          )}
        </div>
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
          to="/syndicates"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <Network size={18} />
          </div>
          <span className="nexus-floating-label">Syndicate Intelligence</span>
        </NavLink>

        <NavLink
          to="/evidence"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <FileCheck2 size={18} />
          </div>
          <span className="nexus-floating-label">Evidence Intelligence</span>
        </NavLink>

        <NavLink
          to="/actions"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="nexus-squircle-box">
            <Zap size={18} />
          </div>
          <span className="nexus-floating-label">Action Center</span>
        </NavLink>

        <NavLink
          to={selectedComplaintId ? `/prediction/${selectedComplaintId}` : "/complaints"}
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
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
          to="/settings"
          className={({ isActive }) =>
            `nexus-floating-item ${isActive ? 'active' : ''}`
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
