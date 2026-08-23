import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

type Column<T> = { key: string; label: string; render?: (row: T) => ReactNode };

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
}: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <table className="w-full text-left border-collapse">
        <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text.xs font-semibold uppercase tracking-wider text-[#64748B]">
                {col.label}
              </th>
            ))}
            {onRowClick && <th className="w-8 px-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9]">
          {data.length ? (
            data.map((row, index) => (
              <tr
                key={String(row.id || index)}
                onClick={() => onRowClick?.(row)}
                className={`${onRowClick ? 'cursor-pointer hover:bg-[#F8FAFC]' : ''} transition-colors duration-150`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5 text-sm text-[#0F1B2D]">
                    {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
                {onRowClick && (
                  <td className="px-2 text-[#94A3B8]">
                    <ChevronRight size={16} />
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + (onRowClick ? 1 : 0)} className="px-4 py-12 text-center text-sm text-[#64748B]">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
