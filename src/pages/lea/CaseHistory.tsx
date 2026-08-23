import { usePredictions } from '@/hooks/usePredictions';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';

export default function CaseHistory() {
  const predictions = usePredictions();
  const rows = predictions as unknown as Record<string, unknown>[];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Investigations</p>
        <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Case history</h1>
        <p className="mt-0.5 text-xs text-[#64748B]">Historical predictions and response outcomes.</p>
      </div>

      <DataTable
        data={rows}
        columns={[
          {
            key: 'complaint_id',
            label: 'Case',
            render: (r) => <span className="font-mono text-xs font-semibold text-[#1E40AF]">{String(r.complaint_id)}</span>,
          },
          { key: 'alert_level', label: 'Risk', render: (r) => <StatusBadge status={String(r.alert_level)} /> },
          {
            key: 'risk_score',
            label: 'Confidence',
            render: (r) => <span className="font-mono text-xs text-[#0F1B2D]">{Math.round(Number(r.risk_score) * 100)}%</span>,
          },
          { key: 'status', label: 'Outcome', render: (r) => <StatusBadge status={String(r.status)} /> },
          {
            key: 'updated_at',
            label: 'Updated',
            render: (r) => <span className="text-xs text-[#64748B]">{new Date(String(r.updated_at)).toLocaleDateString()}</span>,
          },
        ]}
      />
    </div>
  );
}
