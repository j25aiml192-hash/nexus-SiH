import { useState } from 'react';
import {
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  History,
  Home,
  LogOut,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Search,
  Shield,
  WalletCards,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useNexusStore } from '@/store/nexusStore';
import { ROLES } from '@/lib/constants';
import NexusLogo from '@/components/shared/NexusLogo';

interface NavItem {
  label: string;
  to: string;
  icon: typeof Home;
  badge?: string | number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const user = useNexusStore((s) => s.user);
  const collapsed = useNexusStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useNexusStore((s) => s.toggleSidebar);
  const mobileOpen = useNexusStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useNexusStore((s) => s.setMobileSidebarOpen);

  const [filterQuery, setFilterQuery] = useState('');

  // Navigation structure based on role
  const getNavGroups = (): NavGroup[] => {
    const role = user?.role || ROLES.I4C_NATIONAL;

    if (role === ROLES.STATE_LEA) {
      return [
        {
          title: 'GOVERNANCE COMMAND',
          items: [
            { label: 'State Dashboard', to: '/lea/dashboard', icon: Home },
            { label: 'Active Alerts', to: '/lea/alerts', icon: BellRing, badge: '12' },
            { label: 'Case History', to: '/lea/history', icon: History },
          ],
        },
        {
          title: 'TACTICAL INTELLIGENCE',
          items: [
            { label: 'National Heatmap', to: '/heatmap', icon: MapPin },
            { label: 'Intelligence Reports', to: '/reports', icon: BarChart3 },
          ],
        },
      ];
    }

    if (role === ROLES.BANK_OFFICER) {
      return [
        {
          title: 'BANK OPERATIONS',
          items: [
            { label: 'Alert Feed', to: '/bank/alerts', icon: BellRing, badge: '8' },
            { label: 'Flagged Accounts', to: '/bank/accounts', icon: WalletCards },
          ],
        },
        {
          title: 'NETWORK INTELLIGENCE',
          items: [
            { label: 'Sentinel Scores', to: '/sentinel', icon: Shield },
            { label: 'Daily Brief', to: '/brief', icon: Radar },
          ],
        },
      ];
    }

    if (role === ROLES.FIELD_OFFICER) {
      return [
        {
          title: 'FIELD COMMAND',
          items: [
            { label: 'My Assignment', to: '/field', icon: BriefcaseBusiness },
            { label: 'File Incident Report', to: '/field/report', icon: FileText },
          ],
        },
        {
          title: 'LOCAL WATCH',
          items: [
            { label: 'National Heatmap', to: '/heatmap', icon: MapPin },
          ],
        },
      ];
    }

    // Default: I4C National
    return [
      {
        title: 'GOVERNANCE COMMAND',
        items: [
          { label: 'Command Center', to: '/dashboard', icon: Home },
          { label: 'Complaints Registry', to: '/complaints', icon: ClipboardList, badge: '80' },
          { label: 'Sentinel Defense', to: '/sentinel', icon: Shield },
          { label: 'National Heatmap', to: '/heatmap', icon: MapPin },
          { label: 'Reports & Export', to: '/reports', icon: BarChart3 },
          { label: 'Daily Intelligence', to: '/brief', icon: Radar },
        ],
      },
      {
        title: 'TACTICAL MONITOR',
        items: [
          { label: 'State Operations', to: '/lea/dashboard', icon: BellRing },
          { label: 'Bank Alert Watch', to: '/bank/alerts', icon: WalletCards },
          { label: 'Field Assignments', to: '/field', icon: BriefcaseBusiness },
        ],
      },
    ];
  };

  const navGroups = getNavGroups();

  // Filter groups based on search
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(filterQuery.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  const getInitials = (name?: string) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const renderContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex h-full flex-col justify-between bg-white text-[#0F172A]">
        {/* TOP SECTION: Header, Search, Status */}
        <div>
          {/* Header Bar */}
          <div
            className={`flex h-16 items-center border-b border-[#EAECF0] px-4 ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* App Icon (Black geometric logo) */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1.5 shadow-xs transition-transform hover:scale-105">
                <NexusLogo className="h-full w-full" color="#000000" />
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold tracking-tight text-[#0F172A]">
                      NEXUS
                    </h2>
                  </div>
                  <p className="text-[10px] font-medium text-[#64748B]">
                    राष्ट्रीय साइबर सुरक्षा
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Collapse / Mobile Close Button */}
            {isMobile ? (
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition"
                title="Close sidebar"
              >
                <X size={18} />
              </button>
            ) : (
              <button
                onClick={toggleSidebar}
                className={`rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition ${
                  isCollapsed ? 'hidden' : 'block'
                }`}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </div>

          {/* Collapsed Toggle Button below logo */}
          {isCollapsed && !isMobile && (
            <div className="flex justify-center border-b border-[#EAECF0] py-2">
              <button
                onClick={toggleSidebar}
                className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition"
                title="Expand sidebar"
              >
                <PanelLeftOpen size={18} />
              </button>
            </div>
          )}

          {/* Filter / Search Input (Expanded only) */}
          {!isCollapsed && (
            <div className="border-b border-[#EAECF0] p-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs text-[#0F172A] transition focus-within:border-[#3B82F6] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3B82F6]/10">
                <Search size={14} className="shrink-0 text-[#94A3B8]" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter..."
                  className="w-full bg-transparent text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none"
                />
                {filterQuery && (
                  <button
                    onClick={() => setFilterQuery('')}
                    className="text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Live Status Indicator */}
          <div
            className={`flex items-center py-2.5 ${
              isCollapsed ? 'justify-center' : 'gap-2 px-4'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            {!isCollapsed && (
              <span className="text-[11px] font-medium text-[#64748B]">
                Live · just now
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4 px-2 py-1">
            {filteredGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    {group.title}
                  </p>
                )}

                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => isMobile && setMobileOpen(false)}
                      className={({ isActive }) =>
                        `group relative flex items-center rounded-xl text-xs font-medium transition-all duration-150 ${
                          isCollapsed
                            ? 'mx-auto h-11 w-11 justify-center'
                            : 'gap-3 px-3 py-2.5'
                        } ${
                          isActive
                            ? 'bg-[#E8F0FE] font-semibold text-[#1E40AF]'
                            : 'text-[#475467] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={18}
                            className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                              isActive ? 'text-[#1E40AF]' : 'text-[#64748B]'
                            }`}
                          />

                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}

                          {!isCollapsed && item.badge && (
                            <span className="ml-auto rounded-md bg-[#E2E8F0]/70 px-2 py-0.5 text-[10px] font-bold text-[#1E293B]">
                              {item.badge}
                            </span>
                          )}

                          {/* Tooltip on Collapsed Desktop View */}
                          {isCollapsed && (
                            <div className="pointer-events-none fixed left-[78px] z-[1200] hidden whitespace-nowrap rounded-lg bg-[#0F172A] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block">
                              <div className="flex items-center gap-2">
                                <span>{item.label}</span>
                                {item.badge && (
                                  <span className="rounded bg-blue-600 px-1.5 py-0.2 text-[10px]">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* BOTTOM SECTION: User Profile & Logout */}
        <div className="border-t border-[#EAECF0] p-3">
          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between gap-2'
            }`}
          >
            {/* Avatar with live badge */}
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#2563EB] to-[#4F46E5] text-xs font-bold text-white shadow-sm">
                {getInitials(user?.name)}
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1 pl-1">
                <p className="truncate text-xs font-bold text-[#0F172A]">
                  {user?.name || 'admin'}
                </p>
                <p className="truncate text-[10px] text-[#64748B]">
                  {user?.role ? user.role.replace(/_/g, ' ') : 'Office Staff'}
                </p>
              </div>
            )}

            {!isCollapsed && (
              <button
                onClick={onLogout}
                className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-red-50 hover:text-[#EF4444] transition"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* DESKTOP ASIDE */}
      <aside
        className={`fixed inset-y-0 left-0 z-[1000] hidden border-r border-[#EAECF0] bg-white shadow-[1px_0_4px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out lg:flex ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderContent(false)}
      </aside>

      {/* MOBILE DRAWER BACKDROP */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[1050] bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* MOBILE DRAWER */}
      <aside
        className={`fixed inset-y-0 left-0 z-[1100] w-64 border-r border-[#EAECF0] bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderContent(true)}
      </aside>
    </>
  );
}
