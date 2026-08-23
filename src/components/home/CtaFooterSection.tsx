import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, Terminal, Lock } from 'lucide-react';

export default function CtaFooterSection() {
  const navigate = useNavigate();

  return (
    <footer id="architecture" className="w-full bg-black text-white border-t border-neutral-800">
      {/* High-Impact Closing CTA Block */}
      <div className="border-b border-neutral-800 py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1 text-xs font-mono tracking-wider text-neutral-300 mb-6">
            <Lock size={12} className="text-white" />
            <span>RESTRICTED LAW ENFORCEMENT ACCESS</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white max-w-3xl leading-tight">
            Accelerate Complex Crime Network Investigations
          </h2>

          <p className="mt-6 text-base sm:text-lg text-neutral-400 max-w-2xl font-normal">
            Equip your agency with automated cross-case correlation, high-density entity graph intelligence, and instant Section 65B compliant dossiers.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-4 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-neutral-200 active:scale-[0.98]"
            >
              <span>Access Operator Console</span>
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Structured Minimal Editorial Footer */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-neutral-900">
          {/* Col 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-white text-black font-mono text-xs font-bold">
                NX
              </div>
              <span className="font-bold tracking-tight text-white text-sm">NEXUS UFDR</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Forensic Graph Intelligence & Cross-Case Entity Resolution Platform for digital forensics and cybercrime syndicates.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
              <ShieldCheck size={13} className="text-neutral-300" />
              <span>I4C & MHA Guidelines Compliant</span>
            </div>
          </div>

          {/* Col 2: Modules */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-4">
              Intelligence Modules
            </h3>
            <ul className="space-y-2 text-xs text-neutral-400 font-mono">
              <li><a href="#capabilities" className="hover:text-white transition-colors">UFDR Extraction Parser</a></li>
              <li><a href="#capabilities" className="hover:text-white transition-colors">Entity Resolution Matrix</a></li>
              <li><a href="#capabilities" className="hover:text-white transition-colors">Multi-Hop Link Analysis</a></li>
              <li><a href="#capabilities" className="hover:text-white transition-colors">Section 65B Dossiers</a></li>
            </ul>
          </div>

          {/* Col 3: Agency Portals */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-4">
              Agency Operations
            </h3>
            <ul className="space-y-2 text-xs text-neutral-400 font-mono">
              <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors text-left">National I4C Center</button></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors text-left">State LEA Command</button></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors text-left">Bank Nodal Fraud Desk</button></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors text-left">Field Strike Unit</button></li>
            </ul>
          </div>

          {/* Col 4: System Status */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-4">
              System Telemetry
            </h3>
            <div className="space-y-2 text-xs font-mono text-neutral-400">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                <span>GRAPH ENGINE</span>
                <span className="text-white">ONLINE</span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                <span>HASH ENGINE</span>
                <span className="text-white">SHA-256</span>
              </div>
              <div className="flex items-center justify-between">
                <span>INGESTION PROTOCOL</span>
                <span className="text-white">v4.1.8-SEC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <p>© {new Date().getFullYear()} NEXUS SIH // UFDR Graph Intelligence Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Terminal size={12} />
              <span>CLASSIFIED / LAW ENFORCEMENT SENSITIVE</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
