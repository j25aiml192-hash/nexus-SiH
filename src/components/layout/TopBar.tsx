import { Bell, Plus, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useNexusStore } from '@/store/nexusStore';
import { ROLES } from '@/lib/constants';

const titles: Record<string, string> = {
  '/dashboard': 'National Command Center',
  '/complaints': 'Complaint Intake',
  '/heatmap': 'National Heatmap',
  '/reports': 'Intelligence Reports',
  '/brief': 'Daily Intelligence Brief',
  '/lea/dashboard': 'State Operations Dashboard',
  '/lea/alerts': 'Active Alert Response',
  '/lea/history': 'Case History',
  '/bank/alerts': 'Bank Alert Feed',
  '/bank/accounts': 'Flagged Accounts',
  '/field': 'Field Assignment',
  '/field/report': 'Incident Report',
};

const roleBadges: Record<string, { bg: string; text: string; border: string }> = {
  [ROLES.I4C_NATIONAL]: { bg: 'bg-[#EFF6FF]', text: 'text-[#1E40AF]', border: 'border-[#BFDBFE]' },
  [ROLES.STATE_LEA]: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', border: 'border-[#BBF7D0]' },
  [ROLES.BANK_OFFICER]: { bg: 'bg-[#FDF4FF]', text: 'text-[#7C3AED]', border: 'border-[#E9D5FF]' },
  [ROLES.FIELD_OFFICER]: { bg: 'bg-[#FFF7ED]', text: 'text-[#D97706]', border: 'border-[#FED7AA]' },
};

export default function TopBar({ onNewComplaint }: { onNewComplaint: () => void }) {
  const location = useLocation();
  const user = useNexusStore((s) => s.user);
  const last = useNexusStore((s) => s.lastLoopRun);
  const diff = last ? Math.max(0, Math.floor((Date.now() - new Date(last).getTime()) / 60000)) : 2;

  const roleStyle = roleBadges[user?.role || ROLES.I4C_NATIONAL] || roleBadges[ROLES.I4C_NATIONAL];

  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-[56px] items-center justify-between border-b border-[#E2E8F0] bg-white px-5 lg:left-60">
      <div>
        <h1 className="text-base font-semibold text-[#0F1B2D]">{titles[location.pathname] || 'NEXUS Operations'}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onNewComplaint}
          className="hidden items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1E3A8A] sm:flex"
        >
          <Plus size={15} /> New complaint
        </button>

        <div className="hidden items-center gap-2 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1 md:flex">
          <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
          <span className="text-xs font-medium text-[#16A34A]">ENGINE ACTIVE</span>
        </div>

        <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-[#0F1B2D]">{user?.name || 'Operator'}</p>
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
            >
              {user?.role || 'operator'}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 text-xs text-[#64748B] xl:flex">
          <RefreshCw size={13} className="text-[#64748B]" /> Last sync: {diff} min ago
        </div>

        <button className="text-[#64748B] transition hover:text-[#0F1B2D]">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
