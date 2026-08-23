import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

export default function SHAPChart({ shapFeatures }: { shapFeatures?: Record<string, number> }) {
  const data = Object.entries(shapFeatures || {})
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#0F1B2D]">
        Why NEXUS flagged this complaint
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 6, right: 32, top: 4, bottom: 4 }}>
            <CartesianGrid stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                color: '#0F1B2D',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              }}
              formatter={(value: unknown) => [Number(value ?? 0).toFixed(2), 'weight']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="value"
                position="right"
                fill="#64748B"
                fontSize={11}
                formatter={(value: unknown) => Number(value ?? 0).toFixed(2)}
              />
              {data.map((item) => (
                <Cell key={item.name} fill={item.value >= 0 ? '#1E40AF' : '#DC2626'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
