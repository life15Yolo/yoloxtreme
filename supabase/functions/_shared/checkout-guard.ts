export type CheckoutDrop = {
  status: string;
  current_qty: number;
  max_qty: number;
};

export type CheckoutDecision =
  | { ok: true }
  | { ok: false; httpStatus: number; error: string };

/**
 * Checkout is allowed only for a live drop that still has stock.
 * pending_review and every other non-live status are refused before payment.
 */
export function evaluateCheckout(drop: CheckoutDrop): CheckoutDecision {
  if (drop.status !== 'live') {
    return {
      ok: false,
      httpStatus: 400,
      error:
        drop.status === 'pending_review'
          ? 'This drop is not open for preorder'
          : 'This drop is no longer live',
    };
  }

  if (drop.current_qty >= drop.max_qty) {
    return { ok: false, httpStatus: 400, error: 'Drop is fully subscribed' };
  }

  return { ok: true };
}
