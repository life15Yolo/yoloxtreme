export type AdminIdentity = {
  id: string;
  email: string | null;
};

export type AdminDecision =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: 401 | 403 | 503; error: string };

/**
 * Comma-separated Supabase Auth emails. Empty or unset fails closed.
 * designer.verified and any client-supplied admin flag are not inputs.
 */
export function parseAdminAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  const emails = raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
  return Array.from(new Set(emails));
}

export function authorizeAdmin(
  identity: AdminIdentity | null,
  allowlistRaw: string | undefined,
): AdminDecision {
  const allowlist = parseAdminAllowlist(allowlistRaw);
  if (allowlist.length === 0) {
    return { ok: false, status: 503, error: 'Admin allowlist is not configured' };
  }
  if (!identity?.id) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }
  const email = identity.email?.trim().toLowerCase() ?? '';
  if (!email || !allowlist.includes(email)) {
    return { ok: false, status: 403, error: 'Not an admin' };
  }
  return { ok: true, userId: identity.id, email };
}

export function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Queue reads and approvals both use authorizeAdmin on the verified auth user.
 * Request body fields such as approver id, isAdmin, or verified are ignored.
 */
export function approvalCommand(
  decision: AdminDecision,
  dropId: string,
  body: unknown,
):
  | { ok: true; rpc: { target_drop_id: string; approver_id: string } }
  | { ok: false; status: number; error: string } {
  void body;
  if (!decision.ok) return decision;
  if (!UUID_RE.test(dropId)) {
    return { ok: false, status: 400, error: 'Missing drop id' };
  }
  return {
    ok: true,
    rpc: { target_drop_id: dropId, approver_id: decision.userId },
  };
}
