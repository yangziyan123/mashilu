import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing PUBLIC_SUPABASE_URL. Add it to .env for local builds and GitHub Actions for deploys.");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing PUBLIC_SUPABASE_ANON_KEY. Add it to .env for local builds and GitHub Actions for deploys.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
