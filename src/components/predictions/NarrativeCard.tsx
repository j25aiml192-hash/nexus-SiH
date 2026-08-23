import { BrainCircuit } from 'lucide-react';

export default function NarrativeCard({ narrative, isLoading }: { narrative?: string; isLoading?: boolean }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] border-l-[3px] border-l-[#1E40AF] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1E40AF]">
        <BrainCircuit size={15} /> NEXUS ANALYSIS
      </div>
      {isLoading ? (
        <div className="space-y-2.5">
          <div className="skeleton-line h-3.5 w-full" />
          <div className="skeleton-line h-3.5 w-11/12" />
          <div className="skeleton-line h-3.5 w-8/12" />
        </div>
      ) : (
        <p className="text-sm text-[#0F1B2D] leading-[1.7]">
          {narrative || 'Analysis will appear when the prediction engine returns a result.'}
        </p>
      )}
    </div>
  );
}
