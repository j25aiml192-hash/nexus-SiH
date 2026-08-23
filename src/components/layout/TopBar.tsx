import { Menu, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useNexusStore } from '@/store/nexusStore';
import NotificationBell from './NotificationBell';

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

export default function TopBar({ onNewComplaint }: { onNewComplaint: () => void }) {
  const location = useLocation();
  const collapsed = useNexusStore((s) => s.sidebarCollapsed);
  const toggleMobileSidebar = useNexusStore((s) => s.toggleMobileSidebar);

  return (
    <header
      className={`fixed right-0 top-0 z-[1000] flex h-[56px] items-center justify-between border-b border-[#EAECF0] bg-white px-4 transition-all duration-300 ease-in-out sm:px-5 ${
        collapsed ? 'left-0 lg:left-[72px]' : 'left-0 lg:left-64'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobileSidebar}
          className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition lg:hidden"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        <h1 className="text-sm font-semibold text-[#0F1B2D] sm:text-base">
          {titles[location.pathname] || 'NEXUS Operations'}
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onNewComplaint}
          className="flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1E3A8A] transition"
        >
          <Plus size={15} /> New complaint
        </button>

        {/* Responsive Circular Notification Bell with Badge & Popover */}
        <NotificationBell />
      </div>
    </header>
  );
}
