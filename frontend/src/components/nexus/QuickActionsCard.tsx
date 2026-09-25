import React, { useState } from 'react';
import { FilePlus, Bell, MapPin, ShieldAlert, Zap, ArrowRight, X, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickActionsCardProps {
  onNewComplaint?: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ onNewComplaint }) => {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return (
      <div className="p-3 rounded-xl border border-slate-800 bg-[#0B192C] text-slate-400 flex items-center justify-between text-xs">
        <span className="flex items-center gap-2">
          <Zap size={14} className="text-amber-400" /> Quick Actions Bar (Dismissed)
        </span>
        <button
          onClick={() => setIsDismissed(false)}
          className="flex items-center gap-1 text-cyan-400 hover:underline font-semibold cursor-pointer"
        >
          <RotateCcw size={12} /> Restore
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0B192C] text-slate-100 p-5 shadow-lg min-w-0">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-700/50 text-amber-400 flex items-center justify-center shrink-0">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Quick Actions</h3>
            <p className="text-xs text-slate-400">Shift duty shortcuts</p>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          title="Dismiss Quick Actions"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-2 mt-3">
        <button
          onClick={() => {
            if (onNewComplaint) onNewComplaint();
            else navigate('/complaints?action=new');
          }}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md cursor-pointer border border-blue-500/50"
        >
          <div className="flex items-center gap-2">
            <FilePlus size={16} />
            <span>New Complaint Intake</span>
          </div>
          <span className="text-[10px] font-mono bg-blue-700 px-2 py-0.5 rounded text-white">+N</span>
        </button>

        <button
          onClick={() => navigate('/alerts')}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            <span>Priority Alerts Feed</span>
          </div>
          <ArrowRight size={14} className="text-slate-400" />
        </button>

        <button
          onClick={() => navigate('/map')}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-cyan-400" />
            <span>Geospatial Hotspot Map</span>
          </div>
          <ArrowRight size={14} className="text-slate-400" />
        </button>

        <button
          onClick={() => navigate('/incidents')}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-emerald-400" />
            <span>Field Incident Workflow</span>
          </div>
          <ArrowRight size={14} className="text-slate-400" />
        </button>
      </div>
    </div>
  );
};

