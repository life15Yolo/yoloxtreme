import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  assessVerifiedCharge,
  evaluatePaymentAccess,
  parseOrderQuantity,
  quantityFitsStock,
} from '../lib/payment-guard.ts';

test('unit: quantity is a positive whole number at most 10', () => {
  assert.deepEqual(parseOrderQuantity(1), { ok: true, quantity: 1 });
  assert.deepEqual(parseOrderQuantity('10'), { ok: true, quantity: 10 });
  for (const value of [0, -1, 1.5, 11, '0', '', null, true, 'nope']) {
    const decision = parseOrderQuantity(value);
    assert.equal(decision.ok, false);
  }
});

test('unit: quantity cannot exceed remaining stock', () => {
  assert.equal(quantityFitsStock(8, 10, 2), true);
  assert.equal(quantityFitsStock(8, 10, 3), false);
});

test('unit: live payments fail closed even when a live secret exists', () => {
  assert.equal(evaluatePaymentAccess({ mode: undefined, secret: 'sk_live_real' }).ok, false);
  assert.equal(evaluatePaymentAccess({ mode: 'test', secret: 'sk_live_real' }).ok, false);
  assert.equal(evaluatePaymentAccess({ mode: 'live', secret: 'sk_test_demo' }).ok, false);
  assert.equal(evaluatePaymentAccess({ mode: 'production', secret: undefined }).ok, false);
  assert.equal(evaluatePaymentAccess({ mode: '', secret: 'sk_test_demo' }).ok, false);
  assert.equal(evaluatePaymentAccess({ mode: 'test', secret: undefined }).ok, false);
  assert.deepEqual(evaluatePaymentAccess({ mode: 'test', secret: 'sk_test_demo' }), { ok: true, mode: 'test' });
});

test('unit: webhook charge must match a bounded quantity and the drop price', () => {
  const drop = { status: 'live', price: 2500000 };
  assert.deepEqual(assessVerifiedCharge({ drop, quantity: 2, amount: 5000000 }), {
    ok: true,
    quantity: 2,
    amount: 5000000,
  });
  assert.equal(assessVerifiedCharge({ drop, quantity: 2, amount: 2500000 }).ok, false);
  assert.equal(assessVerifiedCharge({ drop, quantity: 99, amount: 2500000 * 99 }).ok, false);
  assert.equal(assessVerifiedCharge({ drop: { status: 'pending_review', price: 2500000 }, quantity: 1, amount: 2500000 }).ok, false);
  assert.equal(assessVerifiedCharge({ drop: null, quantity: 1, amount: 2500000 }).ok, false);
  assert.equal(assessVerifiedCharge({ drop: { status: 'funded', price: 1000 }, quantity: 1, amount: 1000 }).ok, true);
});

test('static: pay and webhook guards stay ahead of provider calls and the copies match', () => {
  const pay = readFileSync(new URL('../supabase/functions/pay/index.ts', import.meta.url), 'utf8');
  const webhook = readFileSync(new URL('../supabase/functions/paystack-webhook/index.ts', import.meta.url), 'utf8');
  const lib = readFileSync(new URL('../lib/payment-guard.ts', import.meta.url), 'utf8');
  const edge = readFileSync(new URL('../supabase/functions/_shared/payment-guard.ts', import.meta.url), 'utf8');
  assert.equal(lib, edge);
  assert.ok(pay.indexOf('evaluatePaymentAccess') < pay.indexOf('api.paystack.co'));
  assert.match(webhook, /assessVerifiedCharge/);
  assert.match(webhook, /Already processed/);
  assert.match(webhook, /x-paystack-signature/);
  assert.doesNotMatch(pay, /transaction_charge|payload\.subaccount/);
});
