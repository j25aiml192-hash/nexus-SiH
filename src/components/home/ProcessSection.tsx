import { ArrowRight, HardDriveDownload, Cpu, Network, ShieldAlert } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: HardDriveDownload,
    name: 'Extraction Ingestion',
    summary: 'Direct intake of UFDR, XRY, CDR, and raw device extractions.',
    details: 'Cryptographic SHA-256 baseline hashing on ingestion. Automatic schema mapping parses fragmented chat logs, IMEI records, and financial artifacts into canonical entities.',
  },
  {
    step: '02',
    icon: Cpu,
    name: 'Entity Resolution & Synthesis',
    summary: 'Deterministic and probabilistic identifier matching.',
    details: 'Advanced algorithms correlate IMEI/IMSI pairs, phone aliases, mule bank accounts, and crypto addresses across thousands of independent state police FIRs.',
  },
  {
    step: '03',
    icon: Network,
    name: 'Graph Topology Reconstruction',
    summary: 'Sub-second multi-hop syndicate pathfinding.',
    details: 'Maps complex hierarchy clusters, identifies kingpins orchestrating mule layers, and highlights cross-border financial and communication links.',
  },
  {
    step: '04',
    icon: ShieldAlert,
    name: 'Disruption & Evidentiary Dossier',
    summary: 'Real-time strike action and court-ready exhibits.',
    details: 'Dispatches high-priority field strike targets to State LEAs and freezes mule accounts via nodal banking APIs, accompanied by Section 65B certified dossiers.',
  },
];

export default function ProcessSection() {
  return (
    <section id="workflow" className="w-full bg-neutral-950 text-white py-24 sm:py-32 border-b border-neutral-800">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-12 border-b border-neutral-800 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-mono tracking-wider text-neutral-300 mb-4">
              <span>END-TO-END INVESTIGATIVE PIPELINE</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
              How Nexus Operates
            </h2>
          </div>
          <p className="text-sm font-mono text-neutral-400 max-w-md">
            From raw, unorganized extraction dumps to instant cross-state tactical intervention in minutes.
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative flex flex-col justify-between border border-neutral-800 bg-black p-6 rounded-xl transition-all duration-200 hover:border-neutral-500 group"
              >
                <div>
                  {/* Step Number & Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-3xl font-extrabold text-neutral-600 group-hover:text-white transition-colors">
                      {item.step}
                    </span>
                    <div className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900 text-white group-hover:bg-white group-hover:text-black transition-colors">
                      <Icon size={18} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {item.name}
                  </h3>

                  <p className="mt-2 text-xs font-semibold text-neutral-300 font-mono">
                    {item.summary}
                  </p>

                  <p className="mt-4 text-xs text-neutral-400 leading-relaxed font-sans">
                    {item.details}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span>STAGE {item.step}</span>
                  <ArrowRight size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
