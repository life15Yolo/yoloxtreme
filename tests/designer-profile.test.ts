import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildDesignerSignupInsert, buildPayoutUpdate } from '../lib/designer-profile.ts';

test('unit: public signup insert has no payout or provider fields', () => {
  const row = buildDesignerSignupInsert({
    id: 'user-1',
    brandName: ' Obsidian ',
    email: 'you@brand.com',
    phone: '  ',
  });
  assert.deepEqual(row, {
    id: 'user-1',
    brand_name: 'Obsidian',
    email: 'you@brand.com',
    phone: null,
    verified: false,
  });
  assert.equal(Object.hasOwn(row, 'bank_name'), false);
  assert.equal(Object.hasOwn(row, 'account_number'), false);
  assert.equal(Object.hasOwn(row, 'paystack_subaccount_code'), false);
  assert.equal(Object.hasOwn(row, 'password'), false);
});

test('unit: payout update is optional and only stores bank name plus account number', () => {
  assert.deepEqual(buildPayoutUpdate({ bankName: '  ', accountNumber: '' }), {
    ok: true,
    update: { bank_name: null, account_number: null },
  });
  assert.deepEqual(buildPayoutUpdate({ bankName: 'GTBank', accountNumber: '0123456789' }), {
    ok: true,
    update: { bank_name: 'GTBank', account_number: '0123456789' },
  });
  assert.equal(buildPayoutUpdate({ bankName: 'GT', accountNumber: '123' }).ok, false);
  assert.equal(buildPayoutUpdate({ bankName: '', accountNumber: '0123456789' }).ok, false);
  const saved = buildPayoutUpdate({ bankName: 'GTBank', accountNumber: '0123456789' });
  assert.equal(saved.ok, true);
  if (saved.ok) {
    assert.equal(Object.hasOwn(saved.update, 'paystack_subaccount_code'), false);
    assert.equal(Object.hasOwn(saved.update, 'password'), false);
  }
});

test('static: signup does not collect bank details and payout setup stays private', () => {
  const onboard = readFileSync(new URL('../app/onboard/page.tsx', import.meta.url), 'utf8');
  const payout = readFileSync(new URL('../app/dashboard/payout/page.tsx', import.meta.url), 'utf8');
  const subaccount = readFileSync(new URL('../supabase/functions/create-subaccount/index.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(onboard, /bank_name|account_number|accountNumber|bankName|create-subaccount|password.*bank/i);
  assert.match(onboard, /buildDesignerSignupInsert/);
  assert.match(payout, /buildPayoutUpdate/);
  assert.doesNotMatch(payout, /create-subaccount|api\.paystack\.co|localStorage|type="password"/);
  assert.doesNotMatch(subaccount, /api\.paystack\.co/);
  assert.match(subaccount, /not available in this build/);
});
