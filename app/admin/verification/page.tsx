'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Navbar } from '@/components/navbar';
import { formatNaira } from '@/lib/utils';
import { AlertCircle, Check, Loader2, Shield, ChevronDown, File } from 'lucide-react';

type Application = {
  id: string;
  designer_id: string;
  status: string;
  submission_reference: string;
  submitted_at: string;
  identity_document_url: string;
  brand_authorization_url: string;
  business_info: string;
  business_registration_url: string;
  designer: { brand_name: string; email: string; phone: string } | null;
};

export default function VerificationReviewPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ action: 'approve', reason: '' });

  const loadQueue = useCallback(async () => {
    setError(null);
    setMessage(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setApplications([]);
      setError('Authentication required');
      return;
    }
    const response = await fetch('/api/admin/verification', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const body = await response.json();
    if (!response.ok) {
      setApplications([]);
      setError(body.error || 'Could not load applications');
      return;
    }
    setApplications((body.applications || []) as Application[]);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionEmail(data.session?.user.email ?? null);
      setReady(true);
      if (data.session) void loadQueue();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
      if (!session) setApplications([]);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadQueue]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    await loadQueue();
  };

  const submitReview = async (applicationId: string) => {
    setError(null);
    setMessage(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError('Authentication required');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/admin/verification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, action: reviewForm.action, reason: reviewForm.reason }),
    });
    const body = await response.json();
    setBusy(false);
    setActiveId(null);
    if (!response.ok) {
      setError(body.error || 'Review submission failed');
      return;
    }
    setMessage(`Application ${reviewForm.action}d successfully.`);
    setReviewForm({ action: 'approve', reason: '' });
    await loadQueue();
  };

  if (!ready) return (<div className="min-h-screen bg-ivory flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-ink" /></div>);

  if (!sessionEmail) return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-16">
        <div className="mb-8 flex items-start gap-3">
          <Shield className="mt-1 h-6 w-6 text-ink" />
          <div>
            <h1 className="font-display text-3xl font-black tracking-tighter text-ink">Verification review</h1>
            <p className="mt-2 text-sm text-ink/60">The server checks the signed-in Supabase user against ADMIN_EMAIL_ALLOWLIST.</p>
          </div>
        </div>
        <form onSubmit={signIn} className="rounded-3xl border border-ink/10 bg-white p-6 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/70">Email</label>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-ink/15 bg-ivory px-5 py-3.5 text-ink outline-none focus:border-lime" required />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/70">Password</label>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-ink/15 bg-ivory px-5 py-3.5 text-ink outline-none focus:border-lime" required />
          </div>
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-ink disabled:opacity-50">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-28 sm:px-6">
        <div className="mb-8 flex items-start justify-between gap-4 sm:items-center">
          <div className="flex items-start gap-3">
            <Shield className="mt-1 h-6 w-6 text-ink" />
            <div>
              <h1 className="font-display text-3xl font-black tracking-tighter text-ink">Verification review</h1>
              <p className="mt-2 text-sm text-ink/60">Review designer identity, brand ownership and business information.</p>
            </div>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); setApplications([]); }} className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink/80">Sign out</button>
        </div>

        {error && <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4"><AlertCircle className="h-5 w-5 shrink-0 text-red-500" /><p className="text-sm text-red-800">{error}</p></div>}
        {message && <div className="mb-4 flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime/10 p-4"><Check className="h-5 w-5 shrink-0 text-ink" /><p className="text-sm text-ink">{message}</p></div>}

        {applications.length === 0 ? (
          <div className="rounded-3xl border border-ink/10 bg-white p-8 text-center text-ink/60">
            {applications.length === 0 ? 'No applications are waiting for review.' : 'Loading...'}
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <article key={app.id} className="rounded-2xl border border-ink/10 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActiveId(activeId === app.id ? null : app.id)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-ivory/50 transition"
                >
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink/60">{app.designer?.brand_name}</p>
                    <h3 className="mt-1 font-display text-lg font-black text-ink">Verification {app.status}</h3>
                    <p className="mt-2 text-xs text-ink/40">Ref: {app.submission_reference} · {new Date(app.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-ink/40 transition ${activeId === app.id ? 'rotate-180' : ''}`} />
                </button>

                {activeId === app.id && (
                  <div className="border-t border-ink/10 p-5 sm:p-6 space-y-6">
                    <div className="grid gap-6 sm:grid-cols-3">
                      {[{ label: 'Identity', url: app.identity_document_url }, { label: 'Brand Auth', url: app.brand_authorization_url }, { label: 'Business', url: app.business_registration_url }].map(({ label, url }) => (
                        <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-lg border border-ink/10 p-3 hover:border-ink/30 transition">
                          <File className="h-4 w-4 mt-1 text-ink/60" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase text-ink/60">{label}</p>
                            <p className="text-xs text-ink/40 truncate">{url}</p>
                          </div>
                        </a>
                      ))}
                    </div>

                    {app.business_info && (
                      <div className="rounded-lg bg-ivory p-4">
                        <p className="text-xs font-bold uppercase text-ink/60 mb-2">Business information</p>
                        <p className="text-sm text-ink">{app.business_info}</p>
                      </div>
                    )}

                    <div className="border-t border-ink/10 pt-6 space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-ink/60 mb-2">Action</label>
                        <select value={reviewForm.action} onChange={(e) => setReviewForm({ ...reviewForm, action: e.target.value })} className="w-full rounded-lg border border-ink/15 px-3 py-2 bg-white text-sm outline-none focus:border-lime">
                          <option value="approve">Approve</option>
                          <option value="request_info">Request more info</option>
                          <option value="reject">Reject</option>
                        </select>
                      </div>
                      {reviewForm.action !== 'approve' && (
                        <div>
                          <label className="block text-xs font-bold uppercase text-ink/60 mb-2">Reason</label>
                          <textarea value={reviewForm.reason} onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })} placeholder="Explain your decision..." required className="w-full rounded-lg border border-ink/15 px-3 py-2 bg-white text-sm outline-none focus:border-lime" />
                        </div>
                      )}
                      <button type="button" onClick={() => submitReview(app.id)} disabled={busy} className="w-full flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-ivory disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit review'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
