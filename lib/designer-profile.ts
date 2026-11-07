export type DesignerSignupInsert = {
  id: string;
  brand_name: string;
  email: string;
  phone: string | null;
  verified: false;
};

/** Public signup. Bank fields and provider codes are intentionally absent. */
export function buildDesignerSignupInsert(input: {
  id: string;
  brandName: string;
  email: string;
  phone: string;
}): DesignerSignupInsert {
  const phone = input.phone.trim();
  return {
    id: input.id,
    brand_name: input.brandName.trim(),
    email: input.email.trim(),
    phone: phone.length > 0 ? phone : null,
    verified: false,
  };
}

export type PayoutUpdate = {
  bank_name: string | null;
  account_number: string | null;
};

/**
 * Optional payout account. Empty fields clear the saved account.
 * If either field is filled, both must be valid. This never accepts a
 * banking password or a provider account code.
 */
export function buildPayoutUpdate(input: {
  bankName: string;
  accountNumber: string;
}): { ok: true; update: PayoutUpdate } | { ok: false; error: string } {
  const bankName = input.bankName.trim();
  const accountNumber = input.accountNumber.trim();
  if (!bankName && !accountNumber) {
    return { ok: true, update: { bank_name: null, account_number: null } };
  }
  if (bankName.length < 2 || bankName.length > 80) {
    return { ok: false, error: 'Enter the bank name, or leave both payout fields empty.' };
  }
  if (!/^\d{10}$/.test(accountNumber)) {
    return { ok: false, error: 'Account number must be 10 digits, or leave both payout fields empty.' };
  }
  return { ok: true, update: { bank_name: bankName, account_number: accountNumber } };
}
