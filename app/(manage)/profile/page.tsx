'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Loader2, AlertCircle, Check, Save, ShieldCheck, ShieldAlert, CalendarDays, Mail, Landmark } from 'lucide-react';

type ProfileForm = {
  brandName: string;
  email: string;
  phone: string;
  bankName: string;
  accountNumber: string;
};

const emptyForm: ProfileForm = {
  brandName: '',
  email: '',
  phone: '',
  bankName: '',
  accountNumber: '',
};

export default function ProfilePage() {
  const { user, designer, refreshDesigner } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!designer) return;
    setForm({
      brandName: designer.brand_name || '',
      email: designer.email || '',
      phone: designer.phone || '',
      bankName: designer.bank_name || '',
      accountNumber: designer.account_number || '',
    });
  }, [designer]);

  const update = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designer) return;
    setError(null);
    setSaved(false);

    if (!form.brandName.trim() || !form.email.trim()) {
      setError('Brand name and contact email are required');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('designers')
        .update({
          brand_name: form.brandName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          bank_name: form.bankName.trim() || null,
          account_number: form.accountNumber.trim() || null,
        })
        .eq('id', designer.id);

      if (updateError) throw updateError;
      await refreshDesigner();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!designer) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-lime animate-spin" />
      </div>
    );
  }

  const memberSince = new Date(designer.created_at).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">Profile</h2>
        <p className="text-sm text-white/40 mt-1">View your account details and update your personal settings.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime/10 p-4">
          <Check className="h-5 w-5 text-lime shrink-0" />
          <p className="text-sm font-semibold text-lime">Profile updated.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-card p-6 space-y-5">
          <h3 className="font-display text-lg font-black text-white">Personal Settings</h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Brand Name</label>
            <input
              type="text"
              value={form.brandName}
              onChange={(e) => update('brandName', e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Contact Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <h4 className="font-display text-sm font-black uppercase tracking-wider text-white/60 mb-4">Payout Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => update('bankName', e.target.value)}
                  placeholder="e.g. GTBank"
                  className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Account Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.accountNumber}
                  onChange={(e) => update('accountNumber', e.target.value)}
                  placeholder="0123456789"
                  className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] glow-lime disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                SAVING...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                SAVE CHANGES
              </>
            )}
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-card p-5">
            <h3 className="font-display text-lg font-black text-white mb-4">Account</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-white/30 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-white/40">Login email</p>
                  <p className="text-white truncate">{user?.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="h-4 w-4 text-white/30 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40">Member since</p>
                  <p className="text-white">{memberSince}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {designer.verified ? (
                  <ShieldCheck className="h-4 w-4 text-lime mt-0.5" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-white/30 mt-0.5" />
                )}
                <div>
                  <p className="text-xs text-white/40">Verification</p>
                  <p className={designer.verified ? 'text-lime font-semibold' : 'text-white'}>
                    {designer.verified ? 'Verified designer' : 'Not verified yet'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Landmark className="h-4 w-4 text-white/30 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40">Payout account</p>
                  <p className="text-white">{designer.paystack_subaccount_code ? 'Connected' : 'Not connected'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
