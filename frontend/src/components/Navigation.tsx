import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ShieldAlert,
  BarChart3,
  MapPin,
  Settings,
  Shield,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const incidents = useNexusStore((state) => state.incidents);
  const selectedComplaintId = useNexusStore((state) => state.selectedComplaintId);
  const isSidebarCollapsed = useNexusStore((state) => state.isSidebarCollapsed);
  const isSidebarHovered = useNexusStore((state) => state.isSidebarHovered);
  const setIsSidebarHovered = useNexusStore((state) => state.setIsSidebarHovered);
  const user = useNexusStore((state) => state.user);
  const logout = useNexusStore((state) => state.logout);

  const roleMode = useNexusStore((state) => state.activeRoleMode);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

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
        setIsRoleDropdownOpen(false);
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
          to="/dashboard"
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

      {/* Bottom Profile / Role Switcher Card */}
      {!isVisuallyCollapsed ? (
        <div style={{ marginTop: 'auto', paddingTop: '12px', width: '100%', position: 'relative' }}>
          <div
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '14px',
              background: '#000000',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              cursor: 'pointer',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'all 0.15s ease',
              userSelect: 'none'
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                minWidth: '34px',
                borderRadius: '10px',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                flexShrink: 0
              }}
            >
              <Shield size={17} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name ? user.name.replace(/\s*\(NEXUS Command\)/gi, '') : `Demo ${roleMode}`}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#38BDF8', lineHeight: 1.2, marginTop: '2px', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.badgeId ? `Officer ID: ${user.badgeId}` : `${roleMode} Mode`}
              </span>
            </div>

            <ChevronDown
              size={14}
              style={{
                color: '#94A3B8',
                flexShrink: 0,
                transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>

          {/* Detailed Popover Menu for Logged-In Officer */}
          {isRoleDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                backgroundColor: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '16px',
                padding: '14px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                zIndex: 110,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Header Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#1E293B',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38BDF8',
                    flexShrink: 0
                  }}
                >
                  <Shield size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.name || 'Authorized Officer'}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>
                    ID: {user?.badgeId || 'NEX-8821'}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              {/* Metadata details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8' }}>
                  <span>Agency:</span>
                  <span style={{ color: '#E2E8F0', fontWeight: 600, textAlign: 'right', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.agency || 'I4C Command Center'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8' }}>
                  <span>Role:</span>
                  <span style={{ color: '#34D399', fontWeight: 700 }}>
                    {user?.role || roleMode}
                  </span>
                </div>

                {user?.email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8' }}>
                    <span>Email:</span>
                    <span style={{ color: '#CBD5E1', fontWeight: 500, fontSize: '10.5px', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

              {/* Sign Out Action */}
              <button
                type="button"
                onClick={() => {
                  setIsRoleDropdownOpen(false);
                  logout();
                  window.location.href = '/';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.14)',
                  border: '1px solid rgba(239, 68, 68, 0.28)',
                  color: '#F87171',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EF4444';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.14)';
                  e.currentTarget.style.color = '#F87171';
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          title={`${user?.name || 'Officer'} (${user?.badgeId || 'NEX-8821'})`}
          onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
              boxShadow: '0 4px 12px rgba(11, 34, 56, 0.3)',
              cursor: 'pointer'
            }}
          >
            <Shield size={18} />
          </div>
        </div>
      )}
    </aside>
  );
};
