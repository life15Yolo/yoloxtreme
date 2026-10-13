'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Navbar } from '@/components/navbar';
import { ArrowRight, Check, Loader2, AlertCircle } from 'lucide-react';

export default function OnboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'creating' | 'done'>('form');

  const [form, setForm] = useState({
    brandName: '',
    email: '',
    password: '',
    phone: '',
    bankName: '',
    accountNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.brandName || !form.email || !form.password || !form.bankName || !form.accountNumber) {
      setError('All fields are required');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setStep('creating');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Failed to create account');

      let subaccountCode: string | null = null;
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const response = await fetch(`${supabaseUrl}/functions/v1/create-subaccount`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            brand_name: form.brandName,
            email: form.email,
            bank_name: form.bankName,
            account_number: form.accountNumber,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          subaccountCode = data.subaccount_code || null;
        }
      } catch {
        // Non-blocking
      }

      const { error: designerError } = await supabase.from('designers').insert({
        id: authData.user.id,
        brand_name: form.brandName,
        email: form.email,
        phone: form.phone,
        bank_name: form.bankName,
        account_number: form.accountNumber,
        paystack_subaccount_code: subaccountCode,
        verified: false,
      });

      if (designerError) throw new Error(designerError.message);

      setStep('done');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center animate-scale-in">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-lime animate-pulse-lime">
            <Check className="h-10 w-10 text-black" strokeWidth={3} />
          </div>
          <h1 className="mt-6 font-display text-3xl font-black tracking-tighter text-white">
            WELCOME TO THE FACTORY
          </h1>
          <p className="mt-2 text-white/60">Your designer account is ready. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="pt-32 pb-16 mx-auto max-w-2xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter text-white">
            LAUNCH YOUR<br /><span className="text-lime">BRAND.</span>
          </h1>
          <p className="mt-3 text-white/60">Join 100+ designers. No inventory risk. Get 90% of every sale.</p>
        </div>
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Brand Name</label>
            <input type="text" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} placeholder="e.g. OBSIDIAN" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@brand.com" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 800 000 0000" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-card/50 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-lime">Payout Details — 90% to you</p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Bank Name</label>
              <input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. GTBank" className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Account Number</label>
              <input type="text" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="0123456789" maxLength={10} className="w-full rounded-2xl border border-white/15 bg-background px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] glow-lime disabled:opacity-50 disabled:hover:scale-100">
            {loading ? (<><Loader2 className="h-5 w-5 animate-spin" />CREATING YOUR ACCOUNT...</>) : (<>JOIN YOLOXTREME<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></>)}
          </button>
          <p className="text-center text-xs text-white/40">Already have an account? <Link href="/dashboard" className="text-lime font-semibold underline">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
