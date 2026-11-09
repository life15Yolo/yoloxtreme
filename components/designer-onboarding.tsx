'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ArrowRight, Check, ChevronLeft, Loader2, ShieldCheck } from 'lucide-react';

const steps = ['Account', 'Profile', 'Verification', 'Review', 'Activation'];

type FormState = {
  fullName: string;
  email: string;
  password: string;
  country: string;
  accountType: 'Independent designer' | 'Fashion brand';
  brandName: string;
  description: string;
  category: string;
  location: string;
  portfolio: string;
  website: string;
  identityDocument: string;
  brandAuthorization: string;
  businessInfo: string;
};

const initialForm: FormState = {
  fullName: '', email: '', password: '', country: '', accountType: 'Independent designer',
  brandName: '', description: '', category: '', location: '', portfolio: '', website: '',
  identityDocument: '', brandAuthorization: '', businessInfo: '',
};

export function DesignerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (step < 2) { setStep(step + 1); return; }
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          data: { full_name: form.fullName, country: form.country, account_type: form.accountType },
        },
      });
      if (authError) throw new Error(authError.message);
      if (!auth.user) throw new Error('Unable to create account');
      const { error: designerError } = await supabase.from('designers').insert({ id: auth.user.id, brand_name: form.brandName, email: form.email, verified: false });
      if (designerError && !designerError.message.includes('already exists')) throw designerError;
      const { error: profileError } = await supabase.from('designer_profiles').upsert({
        id: auth.user.id, fashion_category: form.category, location: form.location,
        bio: form.description, portfolio_images: form.portfolio.split(',').map((item) => item.trim()).filter(Boolean),
        social_links: { website: form.website },
      });
      if (profileError && !profileError.message.includes('schema cache')) throw profileError;
      const { data: application, error: applicationError } = await supabase.from('verification_applications').upsert({
        designer_id: auth.user.id, status: 'submitted', identity_document_url: form.identityDocument,
        brand_authorization_url: form.brandAuthorization, business_info: form.businessInfo,
        submitted_at: new Date().toISOString(), submission_reference: `YX-${Date.now().toString(36).toUpperCase()}`,
      }).select('submission_reference').single();
      if (applicationError && !applicationError.message.includes('schema cache')) throw applicationError;
      setReference(application?.submission_reference ?? `YX-${Date.now().toString(36).toUpperCase()}`);
      setStep(3);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  const field = (key: keyof FormState, label: string, placeholder: string, type = 'text') => (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/55">{label}</span>
      <input type={type} value={form[key] as string} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} required className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3.5 text-base text-ink outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/20" />
    </label>
  );

  return (
    <main className="min-h-screen bg-ivory px-4 py-8 text-ink sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-start justify-between gap-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45">YoloXtreme / Designer onboarding</p><h1 className="mt-3 max-w-xl font-display text-4xl font-black leading-[0.94] tracking-[-0.06em] sm:text-6xl">Build the label they remember.</h1></div>
          <div className="hidden text-right sm:block"><p className="text-xs uppercase tracking-[0.2em] text-ink/45">Free to join</p><p className="mt-1 text-sm font-semibold">No listing fees</p></div>
        </header>
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Onboarding progress" className="flex gap-3 overflow-x-auto pb-2 lg:block lg:space-y-5 lg:pb-0">
            {steps.map((label, index) => <div key={label} className={`flex shrink-0 items-center gap-3 text-sm ${index === step ? 'font-bold text-ink' : 'text-ink/40'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${index < step ? 'border-lime bg-lime text-ink' : index === step ? 'border-ink bg-ink text-ivory' : 'border-ink/15'}`}>{index < step ? <Check className="h-4 w-4" /> : `0${index + 1}`}</span>{label}</div>)}
          </nav>
          <section className="max-w-2xl">
            {step === 3 ? <div className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-10"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-lime"><Check className="h-7 w-7" /></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-ink/45">Application submitted</p><h2 className="mt-3 font-display text-4xl font-black tracking-[-0.05em]">You&apos;re in review.</h2><p className="mt-4 leading-7 text-ink/65">Our team will review your identity and brand information. We&apos;ll contact you if anything else is needed.</p><div className="mt-8 grid grid-cols-2 gap-4 border-y border-ink/10 py-5 text-sm"><div><p className="text-ink/45">Reference</p><p className="mt-1 font-bold">{reference}</p></div><div><p className="text-ink/45">Status</p><p className="mt-1 font-bold text-ink">Pending review</p></div></div><button onClick={() => router.push('/dashboard')} className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-ivory">Return to dashboard <ArrowRight className="h-4 w-4" /></button></div> : <form onSubmit={submit} className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-10">
              {step === 0 && <><p className="eyebrow">01 / Account</p><h2 className="section-title">Start with your details.</h2><div className="mt-8 space-y-5">{field('fullName', 'Full name', 'Your name')}{field('email', 'Email address', 'you@yourbrand.com', 'email')}{field('password', 'Password', 'At least 6 characters', 'password')}<div className="grid gap-5 sm:grid-cols-2">{field('country', 'Country', 'Nigeria')}{field('accountType', 'Account type', 'Independent designer')}</div></div></>}
              {step === 1 && <><p className="eyebrow">02 / Profile</p><h2 className="section-title">Give the label a point of view.</h2><div className="mt-8 space-y-5">{field('brandName', 'Brand name', 'Your public brand name')}<label className="block space-y-2"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/55">Brand description</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="What does your label stand for?" required className="min-h-28 w-full rounded-xl border border-ink/15 bg-white px-4 py-3.5 text-base outline-none focus:border-lime" /></label><div className="grid gap-5 sm:grid-cols-2">{field('category', 'Fashion category', 'Ready-to-wear')}{field('location', 'Location', 'Lagos, Nigeria')}</div>{field('portfolio', 'Portfolio image URLs', 'Paste URLs separated by commas')}{field('website', 'Website or social link', 'https://instagram.com/yourbrand')}</div></>}
              {step === 2 && <><p className="eyebrow">03 / Verification</p><h2 className="section-title">A little proof. A lot more access.</h2><p className="mt-4 leading-7 text-ink/60">Verification keeps the marketplace trusted. Your documents are private and only accessible to authorised reviewers.</p><div className="mt-8 space-y-5">{field('identityDocument', 'Identity verification URL', 'Secure document link')}{field('brandAuthorization', 'Brand ownership or authorisation', 'Trademark or authorisation link')}{field('businessInfo', 'Business information', 'Registration number or a short note')}</div><div className="mt-6 flex gap-3 rounded-2xl bg-ink/5 p-4 text-sm text-ink/65"><ShieldCheck className="h-5 w-5 shrink-0 text-ink" />Submit only documents you have permission to share.</div></>}
              <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">{step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-bold"><ChevronLeft className="h-4 w-4" /> Back</button>}<button type="submit" disabled={busy} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-lime px-5 text-sm font-bold disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : step === 2 ? 'Submit for review' : 'Continue'} {!busy && <ArrowRight className="h-4 w-4" />}</button></div>
              {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </form>}
          </section>
        </div>
      </div>
    </main>
  );
}
