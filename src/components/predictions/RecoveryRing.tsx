import { useState, useEffect } from 'react';
import { Check, Clock, AlertTriangle } from 'lucide-react';

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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const intercepted = status === 'intercepted';
  const createdDate = new Date(createdAt || Date.now());
  const expiresAt = new Date(
    createdDate.getTime() + (cashoutWindowHours || 4) * 60 * 60 * 1000
  ).getTime();

  const remainingMs = expiresAt - now;
  const isExpired = remainingMs <= 0;

  const totalWindowMs = (cashoutWindowHours || 4) * 60 * 60 * 1000;
  const fractionRemaining = Math.max(0, Math.min(1, remainingMs / totalWindowMs));

  const hours = Math.max(0, Math.floor(remainingMs / 3600000));
  const minutes = Math.max(0, Math.floor((remainingMs % 3600000) / 60000));
  const seconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000));

  const color = intercepted
    ? '#1E40AF'
    : isExpired
    ? '#DC2626'
    : fractionRemaining > 0.5
    ? '#16A34A'
    : fractionRemaining > 0.25
    ? '#D97706'
    : '#DC2626';

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
            strokeDashoffset={
              intercepted
                ? 0
                : isExpired
                ? stroke
                : stroke * (1 - fractionRemaining)
            }
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {intercepted ? (
            <div className="flex flex-col items-center">
              <Check size={26} className="text-[#1E40AF]" />
              <span className="mt-1 font-mono text-[10px] font-bold text-[#1E40AF]">
                SECURED
              </span>
            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center">
              <AlertTriangle size={20} className="text-[#DC2626]" />
              <span className="mt-0.5 font-mono text-xs font-extrabold text-[#DC2626]">
                EXPIRED
              </span>
            </div>
          ) : (
            <>
              <span className="font-mono text-base font-bold text-[#0F1B2D]">
                {hours}h {minutes}m
              </span>
              <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                {seconds}s left
              </span>
            </>
          )}
        </div>
      </div>
      <p
        className="mt-2.5 text-[11px] font-bold uppercase tracking-wider"
        style={{ color }}
      >
        {intercepted ? 'INTERCEPTED' : isExpired ? 'WINDOW EXPIRED' : 'CASH-OUT WINDOW'}
      </p>
    </div>
  );
}
