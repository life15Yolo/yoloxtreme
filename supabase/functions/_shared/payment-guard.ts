export const MAX_ORDER_QUANTITY = 10;

export type QuantityDecision =
  | { ok: true; quantity: number }
  | { ok: false; error: string };

export type PaymentAccess =
  | { ok: true; mode: 'test' }
  | { ok: false; httpStatus: 403; error: string };

/** Whole numbers from 1 through MAX_ORDER_QUANTITY. Floats, zero, and blanks are refused. */
export function parseOrderQuantity(value: unknown): QuantityDecision {
  if (typeof value === 'boolean' || value == null || value === '') {
    return { ok: false, error: 'Quantity must be a whole number from 1 to 10' };
  }
  const quantity = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_QUANTITY) {
    return { ok: false, error: 'Quantity must be a whole number from 1 to 10' };
  }
  return { ok: true, quantity };
}

export function quantityFitsStock(currentQty: number, maxQty: number, quantity: number): boolean {
  return currentQty + quantity <= maxQty;
}

/**
 * Live checkout is closed even when a real secret is present.
 * The only pass is an explicit test mode plus a Paystack test secret.
 * This function never contacts a payment provider.
 */
export function evaluatePaymentAccess(input: {
  mode: string | undefined;
  secret: string | undefined;
}): PaymentAccess {
  const mode = (input.mode ?? '').trim().toLowerCase();
  const secret = (input.secret ?? '').trim();
  if (secret.startsWith('sk_live_') || mode === 'live' || mode === 'production') {
    return { ok: false, httpStatus: 403, error: 'Live payments are disabled' };
  }
  if (mode !== 'test' || !secret.startsWith('sk_test_')) {
    return {
      ok: false,
      httpStatus: 403,
      error: 'Checkout is closed until a verified delivery-confirmation release exists',
    };
  }
  return { ok: true, mode: 'test' };
}

export function assessVerifiedCharge(input: {
  drop: { status: string; price: number } | null;
  quantity: unknown;
  amount: unknown;
}): { ok: true; quantity: number; amount: number } | { ok: false; error: string } {
  if (!input.drop) return { ok: false, error: 'Drop not found' };
  if (input.drop.status !== 'live' && input.drop.status !== 'funded') {
    return { ok: false, error: 'Drop is not open for a verified payment' };
  }
  const parsed = parseOrderQuantity(input.quantity);
  if (!parsed.ok) return parsed;
  const amount = typeof input.amount === 'number' ? input.amount : Number(input.amount);
  const expected = input.drop.price * parsed.quantity;
  if (!Number.isInteger(amount) || amount !== expected) {
    return { ok: false, error: 'Paid amount does not match the drop total' };
  }
  return { ok: true, quantity: parsed.quantity, amount };
}
