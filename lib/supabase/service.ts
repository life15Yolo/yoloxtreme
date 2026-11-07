import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Server-only. Never import this module from a client component. */
export function createServiceRoleClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase service role client cannot run in the browser');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role is not configured');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
