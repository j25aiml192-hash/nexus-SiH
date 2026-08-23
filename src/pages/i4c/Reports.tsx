import { BarChart3, Download, FileText, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'UPI', value: 42 },
  { name: 'Vishing', value: 24 },
  { name: 'Investment', value: 18 },
  { name: 'Digital arrest', value: 11 },
  { name: 'Other', value: 5 },
];

export default function Reports() {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Analyst workspace</p>
          <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Intelligence reports</h1>
          <p className="mt-0.5 text-xs text-[#64748B]">Pattern summaries from the autonomous monitoring layer.</p>
        </div>
        <button className="nexus-btn-secondary hidden items-center gap-2 text-xs sm:flex">
          <Download size={15} /> Export brief
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#EFF6FF] p-2 text-[#1E40AF]">
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#0F1B2D]">Fraud type distribution</h2>
              <p className="text-xs text-[#64748B]">Share of today's complaints</p>
            </div>
          </div>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: -20, right: 10 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#0F1B2D',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#1E40AF' : '#94A3B8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-[#1E40AF]" />
              <div>
                <p className="text-sm font-semibold text-[#0F1B2D]">Daily national brief</p>
                <p className="mt-0.5 text-xs text-[#64748B]">Generated today · 08:00 IST</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[#0F1B2D]">
              Jharkhand and Haryana continue to show the highest concentration of active cash-out predictions. UPI fraud accounts for 42% of reported incidents, with mule chains averaging 3.2 hops.
            </p>
            <button className="mt-4 text-xs font-semibold text-[#1E40AF] hover:underline">
              Open full brief →
            </button>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <PieChart size={20} className="text-[#D97706]" />
              <div>
                <p className="text-sm font-semibold text-[#0F1B2D]">Recovery performance</p>
                <p className="mt-0.5 text-xs text-[#64748B]">Last 30 days</p>
              </div>
            </div>
            <div className="mt-4 flex items-end gap-4">
              <p className="font-mono text-4xl font-bold text-[#16A34A]">68%</p>
              <p className="pb-1 text-xs text-[#64748B]">
                of flagged funds<br />intercepted or frozen
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
