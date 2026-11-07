'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { buildPayoutUpdate } from '@/lib/designer-profile';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function PayoutSettingsPage() {
  const { user, designer, loading } = useAuth();
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !designer) return;
    setBankName(designer.bank_name ?? '');
    setAccountNumber(designer.account_number ?? '');
    setReady(true);
  }, [loading, designer]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!user) {
      setError('Sign in to edit payout details.');
      return;
    }
    const decision = buildPayoutUpdate({ bankName, accountNumber });
    if (!decision.ok) {
      setError(decision.error);
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase
      .from('designers')
      .update(decision.update)
      .eq('id', user.id);
    setSaving(false);
    if (updateError) {
      setError('Could not save payout details.');
      return;
    }
    setNotice(decision.update.bank_name ? 'Saved on your account. Not sent to a payment provider.' : 'Payout details cleared on your account.');
  };

  if (loading || (designer && !ready)) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink" /></div>;
  }

  if (!designer) {
    return <p className="text-sm text-ink/70">This signed-in account has no designer profile yet, so there is nowhere to save payout details.</p>;
  }

  const configured = Boolean(designer?.bank_name && designer?.account_number);

  return (
    <section className="max-w-xl space-y-5">
      <div>
        <h2 className="font-display text-2xl font-black tracking-tighter text-ink">Payout details</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Optional. Only you can see and edit the bank name and account number on this account.
          This screen does not ask for an online-banking password, does not contact a payment provider, and does not turn checkout on.
        </p>
      </div>
      <p className="text-sm font-semibold text-ink">{configured ? 'A payout account is saved.' : 'No payout account is saved.'}</p>
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-700" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {notice && <p className="rounded-2xl border border-ink/10 bg-white p-4 text-sm text-ink">{notice}</p>}
      <form onSubmit={save} className="space-y-4 rounded-[1.75rem] border border-ink/10 bg-white p-5" autoComplete="off">
        <div>
          <label htmlFor="payout-bank" className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/70">Bank name</label>
          <input id="payout-bank" name="payout-bank" type="text" value={bankName} onChange={(event) => setBankName(event.target.value)} autoComplete="off" className="w-full rounded-2xl border border-ink/15 bg-ivory px-5 py-3.5 text-ink outline-none focus:border-lime" />
        </div>
        <div>
          <label htmlFor="payout-account" className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/70">Account number</label>
          <input id="payout-account" name="payout-account" type="text" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} autoComplete="off" maxLength={10} className="w-full rounded-2xl border border-ink/15 bg-ivory px-5 py-3.5 text-ink outline-none focus:border-lime" />
        </div>
        <button type="submit" disabled={saving} className="rounded-full bg-lime px-5 py-3 text-sm font-bold text-ink disabled:opacity-50">
          {saving ? 'Saving...' : 'Save payout details'}
        </button>
      </form>
    </section>
  );
}
