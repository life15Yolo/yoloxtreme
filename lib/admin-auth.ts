import { createClient } from '@supabase/supabase-js';
import { authorizeAdmin, readBearerToken, type AdminDecision, type AdminIdentity } from '@/lib/admin-allowlist';

/**
 * Confirms the bearer token with Supabase Auth. The email and user id come from
 * that auth user record, not from the request body or designer.verified.
 */
export async function verifyAccessToken(token: string): Promise<AdminIdentity | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function requireAdminFromRequest(request: Request): Promise<AdminDecision> {
  const token = readBearerToken(request.headers.get('authorization'));
  const identity = token ? await verifyAccessToken(token) : null;
  return authorizeAdmin(identity, process.env.ADMIN_EMAIL_ALLOWLIST);
}
