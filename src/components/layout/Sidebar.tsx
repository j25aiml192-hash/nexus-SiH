import { BarChart3, BellRing, BriefcaseBusiness, FileText, History, LayoutDashboard, LogOut, Map, Radar, Shield, WalletCards } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useNexusStore } from '@/store/nexusStore';
import { ROLES } from '@/lib/constants';
import SystemLogWidget from '@/components/shared/SystemLogWidget';

const navigation: Record<string, { label: string; to: string; icon: typeof LayoutDashboard }[]> = {
  [ROLES.I4C_NATIONAL]: [
    { label: 'Command Center', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Sentinel', to: '/sentinel', icon: Shield },
    { label: 'Complaints', to: '/complaints', icon: FileText },
    { label: 'National Heatmap', to: '/heatmap', icon: Map },
    { label: 'Reports', to: '/reports', icon: BarChart3 },
    { label: 'Daily Brief', to: '/brief', icon: Radar },
  ],
  [ROLES.STATE_LEA]: [
    { label: 'State Dashboard', to: '/lea/dashboard', icon: LayoutDashboard },
    { label: 'Active Alerts', to: '/lea/alerts', icon: BellRing },
    { label: 'Case History', to: '/lea/history', icon: History },
  ],
  [ROLES.BANK_OFFICER]: [
    { label: 'Alert Feed', to: '/bank/alerts', icon: BellRing },
    { label: 'Flagged Accounts', to: '/bank/accounts', icon: WalletCards },
  ],
  [ROLES.FIELD_OFFICER]: [
    { label: 'My Assignment', to: '/field', icon: BriefcaseBusiness },
    { label: 'File Report', to: '/field/report', icon: FileText },
  ],
};

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const user = useNexusStore((s) => s.user);
  const links = navigation[user?.role || ROLES.I4C_NATIONAL] || navigation[ROLES.I4C_NATIONAL];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#243049] bg-[#1A2035] lg:flex">
      <div className="border-b border-[#243049] px-6 py-6">
        <div className="font-mono text-3xl font-extrabold tracking-tight text-white">NX</div>
        <div className="mt-1 text-[11px] font-bold tracking-[0.34em] text-white">NEXUS</div>
        <p className="mt-3 text-xs leading-5 text-[#A8B4CC]">
          Follow the money.<br />Before it moves.
        </p>
      </div>

      <div className="flex-1 px-3 py-6">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#64748B]">Operations</p>
        <nav className="space-y-1">
          {links.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'border-l-[3px] border-[#1E40AF] bg-[#243049] text-white'
                    : 'border-l-[3px] border-transparent text-[#A8B4CC] hover:bg-[#243049]/50 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="px-1 py-1">
        <SystemLogWidget />
      </div>

      <div className="border-t border-[#243049] p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-[#243049]/40 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#243049] text-xs font-bold text-white">
            {user?.name?.slice(0, 2).toUpperCase() || 'NX'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{user?.name || 'NEXUS Operator'}</p>
            <p className="truncate text-[10px] text-[#A8B4CC]">{user?.role?.replace(/_/g, ' ') || 'operator'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-[#A8B4CC] transition hover:bg-[#243049] hover:text-white"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
