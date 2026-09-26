import React, { useState } from 'react';
import { PieChart, ChevronDown, ChevronUp } from 'lucide-react';

interface RiskBreakdownCardProps {
  data?: {
    totalActiveCases: number;
    breakdown: Array<{
      level: string;
      count: number;
      percentage: number;
      color: string;
    }>;
  };
  defaultExpanded?: boolean;
}

export const RiskBreakdownCard: React.FC<RiskBreakdownCardProps> = ({ data, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const totalActiveCases = data?.totalActiveCases ?? 0;
  const rawBreakdown = data?.breakdown ?? [];

  // Filter out categories with 0 count as per redesign principles
  const activeBreakdown = rawBreakdown.filter((item) => item.count > 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0B192C] text-slate-100 p-5 shadow-lg min-w-0 transition-all">
      {/* Header with Progressive Disclosure Toggle */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-700/50 text-purple-400 flex items-center justify-center shrink-0">
            <PieChart size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">Risk Level Breakdown</h3>
            <p className="text-xs text-slate-400">Filtered spectrum (non-zero categories only)</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer shrink-0"
        >
          <span>{isExpanded ? 'Hide' : `Expand (${activeBreakdown.length})`}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Summary Box */}
      <div className="p-3.5 rounded-xl bg-[#020617] border border-slate-800 my-3 flex items-center justify-between">
        <div>
          <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
            {totalActiveCases}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total Active Cybercrime Cases</div>
        </div>
        <div className="px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 font-mono font-bold text-xs shrink-0">
          {activeBreakdown.length} Active Tiers
        </div>
      </div>

      {/* Progressive Collapsible Body */}
      {isExpanded && (
        <div className="space-y-3.5 pt-2 animate-fadeIn">
          {activeBreakdown.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
              No active risk categories recorded.
            </div>
          ) : (
            activeBreakdown.map((item) => (
              <div key={item.level} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold tracking-wide text-slate-200">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shadow-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.level}</span>
                  </div>
                  <div className="font-mono text-slate-300">
                    <span className="font-bold text-sm text-white">{item.count}</span>{' '}
                    <span className="text-slate-400 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-semibold ml-1">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(item.percentage, 4)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

