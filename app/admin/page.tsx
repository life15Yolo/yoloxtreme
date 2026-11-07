'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Navbar } from '@/components/navbar';
import { formatNaira } from '@/lib/utils';
import { dropStatusLabel } from '@/lib/drop-status';
import { AlertCircle, Check, Loader2, Shield } from 'lucide-react';

type QueueDrop = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  max_qty: number;
  current_qty: number;
  status: string;
  created_at: string;
  designer: { id: string; brand_name: string } | { id: string; brand_name: string }[] | null;
};

function brandName(drop: QueueDrop): string {
  const designer = Array.isArray(drop.designer) ? drop.designer[0] : drop.designer;
  return designer?.brand_name || 'Unknown brand';
}

export default function AdminReviewPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [drops, setDrops] = useState<QueueDrop[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setError(null);
    setMessage(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setDrops([]);
      setError('Authentication required');
      return;
    }

    const response = await fetch('/api/admin/drops', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const body = await response.json();
    if (!response.ok) {
      setDrops([]);
      setError(body.error || 'Could not load the review queue');
      return;
    }
    setDrops((body.drops || []) as QueueDrop[]);
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
      if (!session) setDrops([]);
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

  const approve = async (id: string) => {
    setApprovingId(id);
    setError(null);
    setMessage(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setApprovingId(null);
      setError('Authentication required');
      return;
    }

    const response = await fetch(`/api/admin/drops/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();
    setApprovingId(null);
    if (!response.ok) {
      setError(body.error || 'Approval failed');
      return;
    }
    setMessage('Drop approved and published.');
    await loadQueue();
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <div className="mb-8 flex items-start gap-3">
          <Shield className="mt-1 h-6 w-6 text-ink" />
          <div>
            <h1 className="font-display text-3xl font-black tracking-tighter text-ink">Drop review</h1>
            <p className="mt-2 text-sm text-ink/60">
              The server checks the signed-in Supabase user against ADMIN_EMAIL_ALLOWLIST. Designer verification does not grant access.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {message && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime/10 p-4">
            <Check className="h-5 w-5 shrink-0 text-ink" />
            <p className="text-sm text-ink">{message}</p>
          </div>
        )}

        {!ready ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink" /></div>
        ) : !sessionEmail ? (
          <form onSubmit={signIn} className="space-y-4 rounded-3xl border border-ink/10 bg-white p-6">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/70">Email</label>
              <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-ink/15 bg-ivory px-5 py-3.5 text-ink outline-none focus:border-lime" required />
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/70">Password</label>
              <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-ink/15 bg-ivory px-5 py-3.5 text-ink outline-none focus:border-lime" required />
            </div>
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-ink disabled:opacity-50">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink/70">Signed in as {sessionEmail}</p>
              <button
                type="button"
                onClick={async () => { await supabase.auth.signOut(); setDrops([]); }}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink/80"
              >
                Sign out
              </button>
            </div>
            {drops.length === 0 ? (
              <div className="rounded-3xl border border-ink/10 bg-white p-8 text-center text-ink/60">No drops are waiting for review.</div>
            ) : (
              drops.map((drop) => (
                <article key={drop.id} className="rounded-3xl border border-ink/10 bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink">{brandName(drop)}</p>
                      <h2 className="mt-1 font-display text-2xl font-black text-ink">{drop.title}</h2>
                      <p className="mt-2 text-sm text-ink/60">{dropStatusLabel(drop.status)} · {formatNaira(drop.price)} · max {drop.max_qty}</p>
                      {drop.description && <p className="mt-3 text-sm text-ink/80">{drop.description}</p>}
                      <p className="mt-2 text-xs text-ink/40">/d/{drop.slug}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => approve(drop.id)}
                      disabled={approvingId === drop.id}
                      className="rounded-full bg-lime px-5 py-3 text-sm font-bold text-ink disabled:opacity-50"
                    >
                      {approvingId === drop.id ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
