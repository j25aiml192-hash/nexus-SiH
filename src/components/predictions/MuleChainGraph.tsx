import { ArrowRight, CircleDollarSign, Flag, Landmark, UserRound } from 'lucide-react';

type Node = {
  id: string;
  node_index: number;
  account_hash: string;
  bank: string;
  state: string;
  transaction_velocity: number;
  is_flagged: boolean;
};

export default function MuleChainGraph({ nodes = [] }: { nodes?: Node[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-[#1A2035] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-white">Mule Chain Trace</h3>
        <span className="font-mono text-[11px] text-[#A8B4CC]">{nodes.length} HOPS DETECTED</span>
      </div>
      <div className="flex min-w-max items-center gap-2 py-2">
        {nodes.slice(0, 6).map((node, index) => (
          <div key={node.id} className="flex items-center gap-2">
            {index > 0 && <ArrowRight size={18} className="text-[#94A3B8]" />}
            <div
              className={`relative w-36 rounded-lg border p-3 ${
                index === 0
                  ? 'border-[#1E40AF] bg-[#1E40AF]/20'
                  : index === nodes.length - 1
                  ? 'border-[#DC2626] bg-[#DC2626]/20'
                  : 'border-[#D97706] bg-[#D97706]/20'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-[#A8B4CC]">
                  {index === 0 ? 'Victim' : index === nodes.length - 1 ? 'Cash-out' : `Mule hop ${index}`}
                </span>
                {index === 0 ? (
                  <UserRound size={14} className="text-[#38BDF8]" />
                ) : index === nodes.length - 1 ? (
                  <CircleDollarSign size={14} className="text-[#F87171]" />
                ) : (
                  <Landmark size={14} className="text-[#FBBF24]" />
                )}
              </div>
              <p className="font-mono text-[11px] font-medium text-white">{node.account_hash}</p>
              <p className="mt-1 text-[10px] text-[#A8B4CC]">
                {node.bank} · {node.state}
              </p>
              {node.is_flagged && <Flag size={12} className="absolute right-2 top-2 text-[#F87171]" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
