import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "./config";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const config = getConfig();
  _supabase = createClient(config.supabase_url, config.supabase_anon_key, {
    auth: { persistSession: true },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  return _supabase;
}

// Keep backward-compatible default export
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  }
});

export default supabase;
