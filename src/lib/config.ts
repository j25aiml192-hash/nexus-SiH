const CONFIG_URL = "http://localhost:8000/config";

interface AppConfig {
  supabase_url: string;
  supabase_anon_key: string;
  ntfy_topic: string;
}

let resolvedConfig: AppConfig | null = null;

export async function loadConfig(): Promise<AppConfig> {
  if (resolvedConfig) return resolvedConfig;
  try {
    const res = await fetch(CONFIG_URL);
    if (!res.ok) throw new Error("Config fetch failed");
    resolvedConfig = await res.json();
    return resolvedConfig!;
  } catch {
    // Fallback to .env if backend is not running
    resolvedConfig = {
      supabase_url: import.meta.env.VITE_SUPABASE_URL ?? "",
      supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
      ntfy_topic: "nexus-alerts-sih2025"
    };
    return resolvedConfig;
  }
}

export function getConfig(): AppConfig {
  if (!resolvedConfig) {
    return {
      supabase_url: import.meta.env.VITE_SUPABASE_URL ?? "",
      supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
      ntfy_topic: "nexus-alerts-sih2025"
    };
  }
  return resolvedConfig;
}
