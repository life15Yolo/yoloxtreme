'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { WorkspaceShell } from '@/components/workspace-shell';
import { supabase } from '@/lib/supabase/client';
import { AlertCircle, BadgeCheck, Check, Loader2, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, designer } = useAuth();
  const [form, setForm] = useState({
    brand_name: '',
    email: '',
    phone: '',
    bank_name: '',
    account_number: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!designer) return;
    setForm({
      brand_name: designer.brand_name,
      email: designer.email,
      phone: designer.phone || '',
      bank_name: designer.bank_name || '',
      account_number: designer.account_number || '',
    });
  }, [designer]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (!designer) {
      setError('Designer profile not found');
      return;
    }
    if (!form.brand_name.trim() || !form.email.trim()) {
      setError('Brand name and email are required');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('designers')
        .update({
          brand_name: form.brand_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          bank_name: form.bank_name.trim() || null,
          account_number: form.account_number.trim() || null,
        })
        .eq('id', designer.id);
      if (updateError) throw updateError;
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceShell>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">Profile</h2>
        <p className="mt-1 text-sm text-white/50">Your account details and personal settings.</p>
      </div>

      <div className="mb-5 flex items-center gap-4 rounded-3xl border border-white/10 bg-card p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime text-xl font-black text-black">
          {(designer?.brand_name || user?.email || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-black text-white">
            {designer?.brand_name || 'Designer'}
          </p>
          <p className="truncate text-sm text-white/50">{user?.email}</p>
          <span
            className={`mt-1 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${
              designer?.verified ? 'text-lime' : 'text-white/40'
            }`}
          >
            {designer?.verified && <BadgeCheck className="h-3.5 w-3.5" />}
            {designer?.verified ? 'Verified account' : 'Standard account'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}
      {saved && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime/10 p-4">
          <Check className="h-5 w-5 shrink-0 text-lime" />
          <p className="text-sm text-lime">Profile updated.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-lime">Brand details</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
                Brand Name
              </label>
              <input
                type="text"
                value={form.brand_name}
                onChange={(event) => setForm({ ...form, brand_name: event.target.value })}
                className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
                Contact Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="+234 800 000 0000"
              className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-card p-5 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lime">Payout details</p>
            <p className="mt-1 text-xs text-white/40">
              Where your 90% share of every preorder is sent.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
                Bank Name
              </label>
              <input
                type="text"
                value={form.bank_name}
                onChange={(event) => setForm({ ...form, bank_name: event.target.value })}
                placeholder="e.g. GTBank"
                className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
                Account Number
              </label>
              <input
                type="text"
                value={form.account_number}
                onChange={(event) => setForm({ ...form, account_number: event.target.value })}
                placeholder="0123456789"
                maxLength={10}
                className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] glow-lime disabled:opacity-50 disabled:hover:scale-100 sm:w-auto sm:px-8"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              SAVING...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              SAVE SETTINGS
            </>
          )}
        </button>
      </form>
    </WorkspaceShell>
  );
}
