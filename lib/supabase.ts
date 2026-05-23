import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfigError() {
  if (!supabaseUrl) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local or your deployment environment variables.";
  }

  if (!supabaseAnonKey) {
    return "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to .env.local or your deployment environment variables.";
  }

  return null;
}

export function getSupabaseClient() {
  const configError = getSupabaseConfigError();
  const configuredSupabaseUrl = supabaseUrl;
  const configuredSupabaseAnonKey = supabaseAnonKey;

  if (configError || !configuredSupabaseUrl || !configuredSupabaseAnonKey) {
    throw new Error(configError ?? "Missing Supabase configuration.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      configuredSupabaseUrl,
      configuredSupabaseAnonKey,
      {
        auth: {
          detectSessionInUrl: false,
          flowType: "pkce"
        }
      }
    );
  }

  return supabaseClient;
}
