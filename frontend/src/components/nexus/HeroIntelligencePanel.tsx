import React from 'react';
import { Sparkles, MapPin, ExternalLink, ShieldCheck, Cpu, GitFork, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HeroIntelligencePanel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Hero Intelligence Dark Navy Map Panel (~70% Width) */}
      <div 
        className="lg:col-span-8 p-6 sm:p-7 rounded-2xl text-white flex flex-col justify-between shadow-md relative overflow-hidden min-w-0 border border-slate-800"
        style={{ backgroundColor: '#0B192C' }}
      >
        {/* Background Subtle Cyber Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-700/60">
              <Sparkles size={13} className="text-cyan-400" /> AI Intel Forensics
            </span>
            <span className="text-[10px] font-mono font-bold bg-red-950 text-red-400 px-2.5 py-0.5 rounded-full border border-red-700/60 animate-pulse">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Forecasted Risk Score</div>
              <div className="text-sm font-extrabold font-mono text-white flex items-center gap-1">
                <span>88 / 100</span>
                <span className="text-xs text-red-400 font-bold">(HIGH)</span>
              </div>
            </div>
            <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div className="bg-gradient-to-r from-amber-400 to-red-500 h-full rounded-full" style={{ width: '88%' }} />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative z-10 my-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            High Cashout Velocity Detected
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mb-5">
            Dual LightGBM localized 3 high-risk ATM clusters within 4.5h extraction window. Recommended immediate dispatch to spatial corridor.
          </p>

          {/* Interactive Network Map Visualization Card */}
          <div 
            className="rounded-xl border border-slate-800 backdrop-blur-md relative overflow-hidden"
            style={{ backgroundColor: '#020617' }}
          >
            {/* Top Badge Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 text-[10px] font-mono">
              <div className="text-cyan-300 flex items-center gap-1.5 shrink-0">
                <MapPin size={12} className="text-cyan-400 shrink-0" />
                <span>Detected Cashout Corridor · 4.5h extraction window</span>
              </div>
              <div className="text-slate-300 flex items-center gap-1.5 shrink-0">
                <ArrowUpRight size={12} className="text-red-400 shrink-0" />
                <span>Txn Velocity: +142% / 30m</span>
              </div>
            </div>

            {/* SVG Dark Network Map */}
            <div className="relative w-full h-40 sm:h-44 flex items-center justify-center p-2">
              <svg className="w-full h-full" viewBox="0 0 600 180" fill="none">
                {/* Connecting Money Trail Vectors */}
                <path d="M120,90 Q240,30 340,90" stroke="#38BDF8" strokeWidth="2.5" strokeDasharray="6,6" className="animate-pulse" />
                <path d="M340,90 Q440,130 500,70" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="4,4" className="animate-pulse" />
                <path d="M120,90 L500,70" stroke="#2563EB" strokeWidth="1.5" strokeOpacity="0.4" />

                {/* Pulsing Nodes */}
                {/* Ranchi Node */}
                <g transform="translate(120, 90)">
                  <circle r="16" fill="#38BDF8" fillOpacity="0.15" />
                  <circle r="7" fill="#38BDF8" />
                  <circle r="3" fill="#FFFFFF" />
                  <text x="0" y="26" textAnchor="middle" fill="#CBD5E1" fontSize="11" fontFamily="sans-serif" fontWeight="bold">Ranchi</text>
                  <text x="0" y="38" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">₹4.2L Hop 1</text>
                </g>

                {/* Deoghar Corridor Node (Centerpiece) */}
                <g transform="translate(340, 90)">
                  <circle r="22" fill="#EF4444" fillOpacity="0.2" className="animate-ping" />
                  <circle r="12" fill="#EF4444" fillOpacity="0.4" />
                  <circle r="7" fill="#EF4444" />
                  <circle r="3" fill="#FFFFFF" />
                  <text x="0" y="-18" textAnchor="middle" fill="#F87171" fontSize="10" fontFamily="monospace" fontWeight="bold">Deoghar Corridor</text>
                  <text x="0" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontFamily="sans-serif" fontWeight="bold">Deoghar</text>
                  <text x="0" y="38" textAnchor="middle" fill="#FCA5A5" fontSize="9" fontFamily="monospace">4.5h Window</text>
                </g>

                {/* Jamshedpur Node */}
                <g transform="translate(500, 70)">
                  <circle r="14" fill="#2563EB" fillOpacity="0.2" />
                  <circle r="6" fill="#2563EB" />
                  <circle r="3" fill="#FFFFFF" />
                  <text x="0" y="24" textAnchor="middle" fill="#CBD5E1" fontSize="11" fontFamily="sans-serif" fontWeight="bold">Jamshedpur</text>
                  <text x="0" y="36" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">Intercept Active</text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="relative z-10 pt-4 mt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Spatial intercept corridor active</span>
          </div>

          <button
            onClick={() => navigate('/map')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md cursor-pointer shrink-0 whitespace-nowrap ml-auto"
          >
            <span>View on Geospatial Map</span>
            <ExternalLink size={13} className="shrink-0" />
          </button>
        </div>
      </div>

      {/* Right Intelligence Panel Compact Information Cards (~30% Width) */}
      <div className="lg:col-span-4 flex flex-col justify-between gap-3.5 min-w-0">
        {/* Model Engine Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#DCE6F2] shadow-xs flex items-center gap-3.5 hover:border-blue-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Cpu size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              MODEL ENGINE
            </div>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
              Dual LightGBM V3
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              94.2% Spatial-Temporal Accuracy
            </div>
          </div>
        </div>

        {/* Network Graph Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#DCE6F2] shadow-xs flex items-center gap-3.5 hover:border-blue-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <GitFork size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              NETWORK GRAPH
            </div>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
              Cytoscape Mule Trail
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              Multi-hop transaction traversal
            </div>
          </div>
        </div>

        {/* Interception Status Card */}
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-xs flex items-center gap-3.5 hover:border-emerald-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
              INTERCEPTION STATUS
            </div>
            <div className="text-sm font-bold text-emerald-950 truncate mt-0.5">
              Automated Intercept Ready
            </div>
            <div className="text-[11px] text-emerald-700 truncate mt-0.5">
              Section 102 CrPC digital warrant ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
