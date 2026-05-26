/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_FALLBACK_TO_MARKDOWN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
