import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Keep the shared client import safe in previews without Supabase variables.
// Data access is gated by isSupabaseConfigured at the call site.
export const supabase = createClient(
  supabaseUrl ?? 'https://preview-placeholder.supabase.co',
  supabaseAnonKey ?? 'preview-placeholder-anon-key',
);
