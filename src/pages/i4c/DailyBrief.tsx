import { useEffect, useState } from 'react';
import { CalendarDays, Loader2, Printer } from 'lucide-react';
import { getTodayBrief, generateBrief } from '@/lib/api';
import LoadingPulse from '@/components/shared/LoadingPulse';

interface BriefData {
  id?: string;
  brief_date?: string;
  html_content?: string | null;
  summary?: string;
}

export default function DailyBrief() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchBrief = async () => {
    setLoading(true);
    try {
      const res = await getTodayBrief();
      if (res.data && res.data.html_content) {
        setBrief(res.data);
      } else {
        setBrief(null);
      }
    } catch {
      setBrief(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateBrief();
      if (res.data && res.data.html_content) {
        setBrief(res.data);
      } else {
        await fetchBrief();
      }
    } catch {
      // Ignore generation error
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <LoadingPulse />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">National intelligence bureau</p>
          <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Daily intelligence brief</h1>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-[#64748B]">
            <CalendarDays size={14} /> {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · 06:00 IST
          </div>
        </div>
        <button onClick={() => window.print()} className="nexus-btn-secondary flex items-center gap-2 text-xs py-2 px-3">
          <Printer size={15} /> Print
        </button>
      </div>

      {brief && brief.html_content ? (
        <article className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
          <div dangerouslySetInnerHTML={{ __html: brief.html_content }} />
        </article>
      ) : (
        <div className="rounded-xl border border-slate-700/60 bg-[#1A2035] p-8 text-center text-white shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white">Daily Intelligence Brief</h2>
          <p className="mx-auto max-w-lg text-xs leading-relaxed text-[#A8B4CC]">
            No brief available yet. Briefs are auto-generated at 6:00 AM daily by the NEXUS engine.
          </p>
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="nexus-btn mx-auto inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold"
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating Brief...
                </>
              ) : (
                'Generate Now'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
