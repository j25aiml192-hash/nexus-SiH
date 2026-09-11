import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Map,
  Bell,
  FileText,
  Cpu,
  LayoutDashboard,
  ListOrdered,
  Share2,
} from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const alerts = useNexusStore((state) => state.alerts);
  const incidents = useNexusStore((state) => state.incidents);
  const newAlertsCount = alerts.filter((a) => a.status === 'new').length;
  const openIncidentsCount = incidents.filter((i) => i.status === 'open').length;

  return (
    <aside className="nexus-sidebar">
      {/* Brand / Logo Top */}
      <div className="nexus-sidebar-top">
        <div
          className="nexus-sidebar-brand"
          onClick={() => navigate('/dashboard')}
          title="NEXUS v4.2.1"
        >
          <div className="nexus-logo-glow">
            <Shield size={20} className="nexus-brand-icon" />
          </div>
          <div className="nexus-sidebar-brand-text">
            <div className="nexus-brand-title">
              NEXUS <span className="nexus-brand-tag">v4.2.1</span>
            </div>
            <div className="nexus-brand-sub">DEFENSE INTEL</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="nexus-sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nexus-sidebar-tab ${isActive ? 'active' : ''}`
          }
          title="Dashboard"
        >
          <div className="nexus-sidebar-icon-wrapper">
            <LayoutDashboard size={20} />
          </div>
          <span className="nexus-sidebar-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/complaints"
          className={({ isActive }) =>
            `nexus-sidebar-tab ${isActive ? 'active' : ''}`
          }
          title="Complaint List"
        >
          <div className="nexus-sidebar-icon-wrapper">
            <ListOrdered size={20} />
          </div>
          <span className="nexus-sidebar-label">Complaint List</span>
        </NavLink>

        <NavLink
          to="/complaints/C1030/network"
          className={({ isActive }) =>
            `nexus-sidebar-tab ${isActive || location.pathname.includes('/network') ? 'active' : ''}`
          }
          title="Network Graph"
        >
          <div className="nexus-sidebar-icon-wrapper">
            <Share2 size={20} />
          </div>
          <span className="nexus-sidebar-label">Network Graph</span>
        </NavLink>

        <NavLink
          to="/prediction/ACC-89214"
          className={({ isActive }) =>
            `nexus-sidebar-tab ${isActive ? 'active' : ''}`
          }
          title="Prediction"
        >
          <div className="nexus-sidebar-icon-wrapper">
            <Cpu size={20} />
          </div>
          <span className="nexus-sidebar-label">Prediction</span>
        </NavLink>

        <NavLink
          to="/map"
          className={({ isActive }) =>
            `nexus-sidebar-tab ${isActive ? 'active' : ''}`
          }
          title="Geospatial Map"
        >
          <div className="nexus-sidebar-icon-wrapper">
            <Map size={20} />
          </div>
          <span className="nexus-sidebar-label">Geospatial Map</span>
        </NavLink>

        <NavLink
          to="/alerts"
          className={({ isActive }) =>
            `nexus-sidebar-tab ${isActive ? 'active' : ''}`
          }
          title="Alerts"
        >
          <div className="nexus-sidebar-icon-wrapper">
            <Bell size={20} />
            {newAlertsCount > 0 && (
              <span className="nexus-badge-alert nexus-badge-collapsed">
                {newAlertsCount}
              </span>
            )}
          </div>
          <span className="nexus-sidebar-label">Alerts</span>
          {newAlertsCount > 0 && (
            <span className="nexus-badge-alert nexus-badge-expanded">
              {newAlertsCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/incidents"
          className={({ isActive }) =>
            `nexus-sidebar-tab ${isActive ? 'active' : ''}`
          }
          title="Incidents"
        >
          <div className="nexus-sidebar-icon-wrapper">
            <FileText size={20} />
            {openIncidentsCount > 0 && (
              <span className="nexus-badge-incident nexus-badge-collapsed">
                {openIncidentsCount}
              </span>
            )}
          </div>
          <span className="nexus-sidebar-label">Incidents</span>
          {openIncidentsCount > 0 && (
            <span className="nexus-badge-incident nexus-badge-expanded">
              {openIncidentsCount}
            </span>
          )}
        </NavLink>
      </nav>

      {/* Footer / Telemetry & Officer Chips */}
      <div className="nexus-sidebar-bottom">



        <div className="nexus-officer-chip" title="DIR / LEA-HQ">
          <span className="nexus-officer-avatar">IN</span>
          <span className="nexus-officer-name nexus-officer-label">DIR / LEA-HQ</span>
        </div>
      </div>
    </aside>
  );
};
