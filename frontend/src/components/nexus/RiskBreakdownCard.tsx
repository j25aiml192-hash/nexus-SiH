import React from 'react';
import { RISK_LEVEL_BREAKDOWN } from '../../data/nexus-data';

export const RiskBreakdownCard: React.FC = () => {
  const { totalActiveCases, breakdown } = RISK_LEVEL_BREAKDOWN;

  return (
    <div className="nexus-box-card">
      <div className="nexus-box-card-header">
        <h3 className="nexus-box-title">Risk Level Breakdown</h3>
        <span className="text-[11px] font-mono text-[#64748B] tracking-wider uppercase font-semibold">
          ACTIVE CASES
        </span>
      </div>

      <div className="nexus-risk-summary mt-2 mb-4">
        <div className="text-3xl font-extrabold text-[#102A2A] font-sans tracking-tight">
          {totalActiveCases}
        </div>
        <div className="text-xs text-[#64748B]">Total active cases under assessment</div>
      </div>

      <div className="nexus-risk-bars space-y-4">
        {breakdown.map((item) => (
          <div key={item.level} className="nexus-risk-bar-group">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <div className="flex items-center gap-1.5 font-bold tracking-wide text-[#102A2A]">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span>{item.level}</span>
              </div>
              <div className="font-mono text-[#102A2A]">
                <span className="font-bold">{item.count}</span>{' '}
                <span className="text-[#94A3B8] text-[11px]">{item.percentage}%</span>
              </div>
            </div>

            <div className="w-full bg-[#EDF2F0] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color,
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
