import { Flag, Search } from 'lucide-react';
import DataTable from '@/components/shared/DataTable';

const rows = [
  { id: 1, account: 'MULE-b82c', bank: 'HDFC Bank', state: 'Jharkhand', velocity: 12, score: '94%' },
  { id: 2, account: 'MULE-3f8a', bank: 'Axis Bank', state: 'Haryana', velocity: 18, score: '89%' },
  { id: 3, account: 'MULE-c91d', bank: 'ICICI Bank', state: 'Jharkhand', velocity: 8, score: '86%' },
  { id: 4, account: 'MULE-5d9e', bank: 'ICICI Bank', state: 'Rajasthan', velocity: 6, score: '78%' },
];

export default function FlaggedAccounts() {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Account intelligence</p>
          <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Flagged accounts</h1>
          <p className="mt-0.5 text-xs text-[#64748B]">Accounts showing mule-network behavior.</p>
        </div>
        <Search className="text-[#94A3B8]" size={18} />
      </div>

      <DataTable
        data={rows}
        columns={[
          {
            key: 'account',
            label: 'Account hash',
            render: (r) => (
              <span className="flex items-center gap-2 font-mono text-xs font-semibold text-[#1E40AF]">
                <Flag size={13} className="text-[#DC2626]" />
                {r.account}
              </span>
            ),
          },
          { key: 'bank', label: 'Bank' },
          { key: 'state', label: 'State' },
          {
            key: 'velocity',
            label: 'Velocity / hr',
            render: (r) => <span className="font-mono text-xs font-medium text-[#D97706]">{r.velocity}</span>,
          },
          {
            key: 'score',
            label: 'Risk',
            render: (r) => <span className="font-mono text-xs font-bold text-[#DC2626]">{r.score}</span>,
          },
        ]}
      />
    </div>
  );
}
