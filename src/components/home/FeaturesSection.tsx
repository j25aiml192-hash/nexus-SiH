import {
  Share2,
  FileSpreadsheet,
  Binary,
  Layers,
  FileCheck2,
  Network,
  SearchCheck,
  Fingerprint
} from 'lucide-react';

const capabilities = [
  {
    icon: Binary,
    tag: 'MODULE 01',
    title: 'Universal Extraction & UFDR Normalization',
    description:
      'Ingests heterogeneous UFDR, XRY, Oxygen, and standard physical extractions. Automatically parses contacts, call detail records (CDR), SMS logs, messaging dumps, and device metadata into a unified investigative schema.',
  },
  {
    icon: Fingerprint,
    tag: 'MODULE 02',
    title: 'Cross-Case Entity Resolution',
    description:
      'Autonomous probabilistic entity resolution that matches phone numbers, IMEI clusters, burner device associations, UPI IDs, and cryptocurrency transaction outputs across geographically segregated FIRs.',
  },
  {
    icon: Network,
    tag: 'MODULE 03',
    title: 'Multi-Hop Syndicate Link Topology',
    description:
      'Visualizes complex money-mule layering, burner telephone trees, and syndicate command nodes. Enables multi-hop graph traversals with sub-second pathfinding to uncover hidden masterminds.',
  },
  {
    icon: FileCheck2,
    tag: 'MODULE 04',
    title: 'Evidentiary Chain-of-Custody & Dossiers',
    description:
      'Generates Section 65B Indian Evidence Act compliant prosecution briefs. Provides cryptographic verification hashes for every graph edge and extracted artifact to withstand court scrutiny.',
  },
];

const secondaryFeatures = [
  {
    icon: SearchCheck,
    title: 'Fuzzy Identifier Disambiguation',
    description: 'Handles corrupted or masked identifiers with typo-tolerant phonetic and cryptographic distance algorithms.',
  },
  {
    icon: Layers,
    title: 'Multi-Agency Role Segregation',
    description: 'Cryptographically partitioned access controls ensuring strict jurisdictional isolation between I4C, State LEAs, and Banks.',
  },
  {
    icon: Share2,
    title: 'Real-Time Nodal Alert Dissemination',
    description: 'Instant dissemination of actionable strike alerts to ground field units and banking fraud control desks.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Automated FIR & Brief Assembly',
    description: 'Synthesizes complex graph trails into structured executive case briefs and court-ready exhibits in one click.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="capabilities" className="w-full bg-white text-black py-24 sm:py-32 border-b border-neutral-200">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-mono tracking-wider text-neutral-800 mb-4">
            <span>CORE ARCHITECTURAL PILLARS</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-black">
            Forensic Intelligence Capabilities
          </h2>
          <p className="mt-4 text-base sm:text-lg text-neutral-600 font-normal">
            A comprehensive graph intelligence stack designed to eliminate investigative silos and de-anonymize organized digital crime networks.
          </p>
        </div>

        {/* Primary 4-Card Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-8 transition-all duration-200 hover:border-black hover:bg-white hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex p-3 rounded-lg bg-black text-white">
                      <Icon size={22} />
                    </div>
                    <span className="font-mono text-xs font-bold text-neutral-400">
                      {cap.tag}
                    </span>
                  </div>

                  <h3 className="mt-6 text-xl font-bold tracking-tight text-black">
                    {cap.title}
                  </h3>

                  <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
                    {cap.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-neutral-200 flex items-center justify-between text-xs font-mono text-neutral-500">
                  <span>STATUS: CERTIFIED</span>
                  <span className="text-black font-semibold">SECTION 65B READY</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Secondary Capabilities List */}
        <div className="mt-20 pt-16 border-t border-neutral-200">
          <div className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-8">
            Specialized Forensic Tooling
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {secondaryFeatures.map((sec, idx) => {
              const Icon = sec.icon;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-neutral-200 p-5 bg-white transition-colors hover:border-neutral-400"
                >
                  <Icon size={18} className="text-black mb-3" />
                  <h4 className="text-sm font-bold text-black tracking-tight">
                    {sec.title}
                  </h4>
                  <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
                    {sec.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
