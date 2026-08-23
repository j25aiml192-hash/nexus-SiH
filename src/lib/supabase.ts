import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

const defaultUrl = 'https://vfeovpahgmmowxvumlkh.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZW92cGFoZ21tb3d4dnVtbGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTY4NTgsImV4cCI6MjEwMjk5Mjg1OH0.Pi3XdecW7owWg-aIkjf_hLsXKsCLzLpx-KC-hbijqEU';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  let url = defaultUrl;
  let anonKey = defaultKey;

  try {
    const config = getConfig();
    if (config?.supabase_url) url = config.supabase_url;
    if (config?.supabase_anon_key) anonKey = config.supabase_anon_key;
  } catch {
    url = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
    anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey;
  }

  _supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

  return _supabase;
}

// Keep backward-compatible proxy export
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export default supabase;
