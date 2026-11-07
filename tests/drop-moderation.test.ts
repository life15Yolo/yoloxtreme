import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { approvalCommand, authorizeAdmin, parseAdminAllowlist, readBearerToken } from '../lib/admin-allowlist.ts';
import { evaluateCheckout } from '../lib/checkout-guard.ts';
import { buildDropInsert, NEW_DROP_STATUS } from '../lib/new-drop.ts';

const root = new URL('..', import.meta.url);

function source(path: string): string {
  return readFileSync(new URL(path, root), 'utf8');
}

test('unit: new drops are inserted as pending_review with no approval metadata', () => {
  const row = buildDropInsert({
    designer_id: 'designer-1',
    slug: 'ash-hoodie',
    title: 'ASH HOODIE',
    description: 'Heavyweight loopback',
    price: 2500000,
    max_qty: 100,
    countdown_end: null,
    images: [],
    sizes: ['S', 'M'],
  });

  assert.equal(row.status, NEW_DROP_STATUS);
  assert.equal(row.status, 'pending_review');
  assert.equal(row.current_qty, 0);
  assert.equal(Object.hasOwn(row, 'approved_by'), false);
  assert.equal(Object.hasOwn(row, 'approved_at'), false);
});

test('unit: direct checkout is denied for pending and every other non-live status', () => {
  for (const status of ['pending_review', 'funded', 'producing', 'shipped', 'draft']) {
    const decision = evaluateCheckout({ status, current_qty: 0, max_qty: 10 });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.httpStatus, 400);
  }

  const pending = evaluateCheckout({ status: 'pending_review', current_qty: 0, max_qty: 10 });
  assert.equal(pending.ok, false);
  if (!pending.ok) assert.equal(pending.error, 'This drop is not open for preorder');
});

test('unit: live checkout still requires stock and otherwise proceeds', () => {
  assert.deepEqual(evaluateCheckout({ status: 'live', current_qty: 3, max_qty: 10 }), { ok: true });

  const soldOut = evaluateCheckout({ status: 'live', current_qty: 10, max_qty: 10 });
  assert.equal(soldOut.ok, false);
  if (!soldOut.ok) assert.equal(soldOut.error, 'Drop is fully subscribed');
});

test('unit: missing auth and non-admins are denied, and an empty allowlist fails closed', () => {
  const admin = { id: 'admin-user', email: 'Founder@Example.com' };

  assert.deepEqual(parseAdminAllowlist(undefined), []);
  assert.deepEqual(parseAdminAllowlist('   '), []);
  assert.equal(authorizeAdmin(admin, undefined).ok, false);
  const unset = authorizeAdmin(admin, '  ,  ');
  assert.equal(unset.ok, false);
  if (!unset.ok) assert.equal(unset.status, 503);

  const unauth = authorizeAdmin(null, 'founder@example.com');
  assert.equal(unauth.ok, false);
  if (!unauth.ok) assert.equal(unauth.status, 401);

  const outsider = authorizeAdmin(
    { id: 'designer-user', email: 'designer@example.com' },
    'founder@example.com',
  );
  assert.equal(outsider.ok, false);
  if (!outsider.ok) assert.equal(outsider.status, 403);

  const allowed = authorizeAdmin(admin, ' founder@example.com , ops@example.com ');
  assert.deepEqual(allowed, { ok: true, userId: 'admin-user', email: 'founder@example.com' });
});

test('unit: client flags and a caller-supplied approver cannot grant or redirect approval', () => {
  const outsider = authorizeAdmin(
    { id: 'designer-user', email: 'designer@example.com' },
    'founder@example.com',
  );
  const denied = approvalCommand(outsider, '11111111-1111-4111-8111-111111111111', {
    verified: true,
    isAdmin: true,
    approver_id: '33333333-3333-4333-8333-333333333333',
  });
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.status, 403);

  const admin = authorizeAdmin({ id: 'admin-user', email: 'founder@example.com' }, 'founder@example.com');
  const command = approvalCommand(admin, '11111111-1111-4111-8111-111111111111', {
    approver_id: '33333333-3333-4333-8333-333333333333',
    verified: true,
  });
  assert.deepEqual(command, {
    ok: true,
    rpc: {
      target_drop_id: '11111111-1111-4111-8111-111111111111',
      approver_id: 'admin-user',
    },
  });
  assert.equal(readBearerToken(null), null);
  assert.equal(readBearerToken('Basic abc'), null);
  assert.equal(readBearerToken('Bearer session-token'), 'session-token');
});

test('static: app, pay function, and migration keep the review boundary', () => {
  const newDrop = source('app/dashboard/new-drop/page.tsx');
  const pay = source('supabase/functions/pay/index.ts');
  const migration = source('supabase/migrations/20261106234800_drop_pending_review.sql');
  const queue = source('app/api/admin/drops/route.ts');
  const approve = source('app/api/admin/drops/[id]/approve/route.ts');
  const adminPage = source('app/admin/page.tsx');
  const onboard = source('app/onboard/page.tsx');
  const guard = source('lib/checkout-guard.ts');
  const edgeGuard = source('supabase/functions/_shared/checkout-guard.ts');

  assert.equal(guard, edgeGuard);
  assert.match(newDrop, /buildDropInsert/);
  assert.doesNotMatch(newDrop, /status:\s*'live'/);
  assert.match(source('lib/designer-profile.ts'), /verified:\s*false/);
  assert.match(onboard, /buildDesignerSignupInsert/);

  const paystackAt = pay.indexOf('api.paystack.co');
  const guardAt = pay.indexOf('evaluateCheckout');
  const paymentGuardAt = pay.indexOf('evaluatePaymentAccess');
  assert.ok(guardAt > -1 && paymentGuardAt > guardAt && paystackAt > paymentGuardAt);
  assert.doesNotMatch(pay, /transaction_charge|payload\.subaccount/);
  assert.match(source('app/d/[slug]/page.tsx'), /CHECKOUT CLOSED/);
  assert.doesNotMatch(source('app/d/[slug]/page.tsx'), /functions\/v1\/pay/);

  assert.match(migration, /does not change existing drop rows/);
  assert.doesNotMatch(migration, /SET status = 'pending_review'/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.approve_drop\(uuid, uuid\) TO service_role/);

  for (const file of [queue, approve]) {
    assert.match(file, /requireAdminFromRequest/);
    assert.doesNotMatch(file, /designer\.verified|SUPABASE_SERVICE_ROLE_KEY/);
  }
  assert.doesNotMatch(adminPage, /designer\.verified|service_role|SERVICE_ROLE/);
  assert.match(queue, /createServiceRoleClient/);
  assert.match(approve, /approve_drop/);
});
