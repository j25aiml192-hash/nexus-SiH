import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ShieldAlert,
  BarChart3,
  MapPin,
  Settings,
  Zap,
  Shield,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const incidents = useNexusStore((state) => state.incidents);
  const isSidebarCollapsed = useNexusStore((state) => state.isSidebarCollapsed);
  const isSidebarHovered = useNexusStore((state) => state.isSidebarHovered);
  const setIsSidebarHovered = useNexusStore((state) => state.setIsSidebarHovered);

  const [roleMode, setRoleMode] = useState<'Analyst' | 'Officer'>('Analyst');
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
          <div className="nexus-floating-logo shrink-0">
            <Zap size={18} className="text-white fill-white" />
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
          to="/prediction/CMP-2026-9081"
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
              background: 'linear-gradient(135deg, #0B2238 0%, #102F4A 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 4px 14px rgba(11, 34, 56, 0.25)',
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
                background: roleMode === 'Analyst' 
                  ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                  : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                flexShrink: 0
              }}
            >
              <Shield size={17} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.2px' }}>
                Demo {roleMode}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8', lineHeight: 1.2, marginTop: '2px' }}>
                {roleMode} Mode
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

          {/* Dropdown Menu for Role Switcher */}
          {isRoleDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                backgroundColor: '#0F2740',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '12px',
                padding: '4px',
                boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(16px)',
                zIndex: 110,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setRoleMode('Analyst');
                  setIsRoleDropdownOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: roleMode === 'Analyst' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: roleMode === 'Analyst' ? '#FFFFFF' : '#CBD5E1',
                  fontSize: '12px',
                  fontWeight: roleMode === 'Analyst' ? 700 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Analyst Mode</span>
                {roleMode === 'Analyst' && <Check size={13} style={{ color: '#818CF8' }} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRoleMode('Officer');
                  setIsRoleDropdownOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: roleMode === 'Officer' ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                  color: roleMode === 'Officer' ? '#FFFFFF' : '#CBD5E1',
                  fontSize: '12px',
                  fontWeight: roleMode === 'Officer' ? 700 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Officer Mode</span>
                {roleMode === 'Officer' && <Check size={13} style={{ color: '#60A5FA' }} />}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          title={`Demo ${roleMode} (${roleMode} Mode)`}
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
              background: roleMode === 'Analyst'
                ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
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
