import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://vfeovpahgmmowxvumlkh.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZW92cGFoZ21tb3d4dnVtbGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTY4NTgsImV4cCI6MjEwMjk5Mjg1OH0.Pi3XdecW7owWg-aIkjf_hLsXKsCLzLpx-KC-hbijqEU';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
