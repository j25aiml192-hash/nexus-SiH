import { Check } from 'lucide-react';

export default function RecoveryRing({
  cashoutWindowHours,
  createdAt,
  status,
  size = 126,
}: {
  cashoutWindowHours: number;
  createdAt: string;
  status: string;
  size?: number;
}) {
  const intercepted = status === 'intercepted';
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 36e5;
  const remaining = Math.max(0, 1 - elapsed / cashoutWindowHours);
  const hours = Math.floor(remaining * cashoutWindowHours);
  const mins = Math.floor((remaining * cashoutWindowHours - hours) * 60);
  const color = intercepted ? '#1E40AF' : remaining > 0.6 ? '#16A34A' : remaining > 0.3 ? '#D97706' : '#DC2626';
  const stroke = 2 * Math.PI * 45;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#E2E8F0" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={stroke}
            strokeDashoffset={intercepted ? 0 : stroke * (1 - remaining)}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {intercepted ? (
            <Check size={25} className="text-[#16A34A]" />
          ) : (
            <>
              <span className="font-mono text-lg font-bold text-[#0F1B2D]">
                {hours}h {mins}m
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-wider text-[#64748B]">remaining</span>
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
        {intercepted ? 'INTERCEPTED' : 'Recovery Window'}
      </p>
    </div>
  );
}
