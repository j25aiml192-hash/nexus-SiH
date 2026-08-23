import { Shield, Zap, Database, GitMerge } from 'lucide-react';

const stats = [
  {
    icon: Database,
    value: '10M+',
    label: 'Forensic Entities Indexed',
    detail: 'IMEIs, SIM IMSIs, Crypto Wallets & Bank Coordinates',
  },
  {
    icon: Zap,
    value: '< 180ms',
    label: 'Multi-Hop Query Latency',
    detail: 'Real-time graph traversal across 15+ relational layers',
  },
  {
    icon: GitMerge,
    value: '99.4%',
    label: 'Cross-Case Entity Precision',
    detail: 'Probabilistic record linkage with deterministic verification',
  },
  {
    icon: Shield,
    value: '100%',
    label: 'Evidentiary Chain-of-Custody',
    detail: 'SHA-256 integrity hashing & Section 65B compliance',
  },
];

export default function StatsSection() {
  return (
    <section id="metrics" className="w-full bg-black text-white py-20 lg:py-28 border-b border-neutral-800">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-12 border-b border-neutral-800 gap-6">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
              Operational Benchmarks
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Forensic Scale & Precision
            </h2>
          </div>
          <p className="text-sm font-mono text-neutral-400 max-w-md">
            Engineered for high-stress law enforcement environments requiring immediate cross-jurisdictional intelligence synthesis.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between border border-neutral-800 bg-neutral-950 p-6 rounded-xl transition-all duration-200 hover:border-neutral-600"
              >
                <div>
                  <div className="mb-4 inline-flex p-2.5 rounded-lg border border-neutral-800 bg-neutral-900 text-white group-hover:bg-white group-hover:text-black transition-colors">
                    <Icon size={20} />
                  </div>
                  <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
                    {item.value}
                  </div>
                  <div className="mt-3 text-sm font-bold uppercase tracking-wider text-neutral-200">
                    {item.label}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-900 text-xs font-mono text-neutral-400">
                  {item.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
