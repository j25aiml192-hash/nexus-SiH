import { ArrowDown, ArrowUp, LucideIcon } from 'lucide-react';

export default function KPICard({
  title,
  value,
  subtitle,
  iconColor = '#1E40AF',
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  color?: string;
  iconColor?: string;
  icon: LucideIcon;
  trend?: number;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-[#64748B]">{title}</p>
          <p className="mt-2 text-[28px] font-bold leading-tight text-[#0F1B2D]">{value}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">{subtitle}</p>
        </div>
        <div className="rounded-lg bg-[#F8FAFC] p-2.5" style={{ color: iconColor }}>
          <Icon size={20} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium">
          {trend >= 0 ? (
            <span className="flex items-center gap-0.5 text-[#16A34A]">
              <ArrowUp size={14} /> +{Math.abs(trend)}%
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[#DC2626]">
              <ArrowDown size={14} /> -{Math.abs(trend)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
