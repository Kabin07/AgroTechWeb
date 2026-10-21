// All runtime configuration comes from environment variables (see .env.example).
// CRA only exposes variables prefixed with REACT_APP_ to the browser.

export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
// Either the legacy "anon" key or the new "publishable" key works here.
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

// Optional: lets demo mode (no Supabase) fetch live mandi prices directly.
// In Supabase mode the key lives server-side in the market-prices Edge Function.
export const DATA_GOV_API_KEY = process.env.REACT_APP_DATA_GOV_API_KEY || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
