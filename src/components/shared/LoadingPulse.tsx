export default function LoadingPulse() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#1E40AF] border-t-transparent" />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">NEXUS ENGINE PROCESSING...</p>
    </div>
  );
}
