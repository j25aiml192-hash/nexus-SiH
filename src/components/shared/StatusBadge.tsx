const styles: Record<string, string> = {
  RED: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
  high: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
  AMBER: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
  medium: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
  GREEN: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
  low: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
  active: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
  pending: 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]',
  intercepted: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
  acknowledged: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
  closed: 'bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0]',
  escalated: 'bg-[#FDF4FF] text-[#7C3AED] border-[#E9D5FF]',
};

export default function StatusBadge({ status }: { status?: string | null }) {
  const label = status || 'unknown';
  const key = Object.keys(styles).find((item) => item.toLowerCase() === label.toLowerCase()) || 'pending';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${styles[key]}`}>
      {label}
    </span>
  );
}
