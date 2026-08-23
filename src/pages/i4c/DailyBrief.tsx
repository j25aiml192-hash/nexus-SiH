import { CalendarDays, Printer, ShieldAlert, TrendingUp } from 'lucide-react';

export default function DailyBrief() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">National intelligence bureau</p>
          <h1 className="mt-1 text-xl font-bold text-[#0F1B2D]">Daily intelligence brief</h1>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-[#64748B]">
            <CalendarDays size={14} /> 22 August 2026 · 08:00 IST
          </div>
        </div>
        <button className="nexus-btn-secondary flex items-center gap-2 text-xs py-2 px-3">
          <Printer size={15} /> Print
        </button>
      </div>

      <article className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
        <div className="border-b border-[#E2E8F0] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1E40AF]">Executive summary</p>
          <h2 className="mt-2 text-lg font-bold text-[#0F1B2D]">Cybercrime activity remains concentrated across five corridors</h2>
          <p className="mt-3 text-sm leading-[1.7] text-[#0F1B2D]">
            The autonomous engine processed 1,284 new complaints in the last 24 hours and generated 47 actionable alerts. Jharkhand's Deoghar–Giridih corridor continues to lead in predicted cash-out activity, with Nuh and Mathura following.
          </p>
        </div>

        <div className="grid gap-4 py-6 sm:grid-cols-3">
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <TrendingUp size={18} className="text-[#1E40AF]" />
            <p className="mt-2 font-mono text-2xl font-bold text-[#0F1B2D]">1,284</p>
            <p className="mt-1 text-xs text-[#64748B]">complaints processed</p>
          </div>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <ShieldAlert size={18} className="text-[#DC2626]" />
            <p className="mt-2 font-mono text-2xl font-bold text-[#0F1B2D]">8</p>
            <p className="mt-1 text-xs text-[#64748B]">active high-risk predictions</p>
          </div>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <TrendingUp size={18} className="text-[#16A34A]" />
            <p className="mt-2 font-mono text-2xl font-bold text-[#0F1B2D]">68%</p>
            <p className="mt-1 text-xs text-[#64748B]">recovery success rate</p>
          </div>
        </div>

        <div className="space-y-5 border-t border-[#E2E8F0] pt-6">
          <section>
            <h3 className="text-sm font-semibold text-[#0F1B2D]">Priority corridors</h3>
            <p className="mt-2 text-sm leading-[1.7] text-[#64748B]">
              Deoghar, Giridih, and Nuh account for 61% of current recovery-window alerts. Field units should prioritize ATM clusters near Tower Chowk, Nuh Town Center, and the NH-19 Mathura corridor.
            </p>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-[#0F1B2D]">Operational recommendation</h3>
            <p className="mt-2 text-sm leading-[1.7] text-[#64748B]">
              Maintain rapid acknowledgement targets below 5 minutes for RED alerts. Banks should apply enhanced monitoring to mule accounts showing transaction velocity above 15 events per hour.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
