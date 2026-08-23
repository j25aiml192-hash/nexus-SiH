import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SystemLog {
  id?: string;
  loop_count?: number;
  complaints_processed?: number;
  predictions_generated?: number;
  alerts_fired?: number;
  execution_time_ms?: number;
  created_at?: string;
}

export default function SystemLogWidget() {
  const [latestLog, setLatestLog] = useState<SystemLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestLog() {
      try {
        const { data, error } = await supabase
          .from('system_logs')
          .select('*')
          .order('created_at', { ascending: false, nullsFirst: false })
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          setLatestLog(data[0]);
        } else {
          setLatestLog(null);
        }
      } catch {
        setLatestLog(null);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestLog();

    // Subscribe to realtime changes on system_logs table
    const channel = supabase
      .channel('system_logs_widget')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_logs' },
        (payload) => {
          if (payload.new) {
            setLatestLog(payload.new as SystemLog);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'Just now';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    return `${diffMins} mins ago`;
  };

  return (
    <div className="mx-3 my-2 rounded-lg bg-[#243049] p-3 text-xs">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              latestLog ? 'bg-[#16A34A]' : 'bg-[#F87171]'
            }`}
          />
          <span className="font-semibold uppercase tracking-wider text-[#A8B4CC] text-[10px]">
            ENGINE
          </span>
        </div>
        {latestLog && (
          <span className="font-mono text-[10px] text-[#A8B4CC]">
            Loop #{latestLog.loop_count ?? 1}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-2 text-[11px] text-[#A8B4CC]">Initializing...</div>
      ) : latestLog ? (
        <div className="mt-2 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[#A8B4CC]">Processed:</span>
            <span className="font-mono font-medium text-white">
              {latestLog.complaints_processed ?? 0} complaints
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A8B4CC]">Generated:</span>
            <span className="font-mono font-medium text-[#60A5FA]">
              {latestLog.predictions_generated ?? 0} predictions
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A8B4CC]">Fired:</span>
            <span className="font-mono font-medium text-[#FCD34D]">
              {latestLog.alerts_fired ?? 0} alerts
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-700/60 pt-1.5 text-[10px] text-[#A8B4CC]">
            <span>{latestLog.execution_time_ms ?? 120}ms</span>
            <span>{getRelativeTime(latestLog.created_at)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#F87171]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F87171]" />
          <span>Backend starting — run uvicorn</span>
        </div>
      )}
    </div>
  );
}
