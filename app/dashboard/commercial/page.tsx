'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { AlertCircle, CheckCircle2, Loader2, Lock, ShieldCheck } from 'lucide-react';

type CommercialStatus = {
  id: string;
  designer_id: string;
  eligible_at: string | null;
  activated_at: string | null;
  status: 'pending' | 'eligible' | 'active';
};

export default function CommercialActivationPage() {
  const { user, designer, loading } = useAuth();
  const [commercial, setCommercial] = useState<CommercialStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    
    const loadStatus = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('commercial_accounts')
          .select('*')
          .eq('designer_id', user.id)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Fetch error:', fetchError);
        }
        
        if (data) {
          setCommercial(data);
        } else {
          // Create commercial account record if it doesn't exist
          const { data: created } = await supabase
            .from('commercial_accounts')
            .insert({ designer_id: user.id, status: 'pending' })
            .select()
            .single();
          
          if (created) {
            setCommercial(created);
          }
        }
      } catch (err) {
        console.error('Error loading commercial status:', err);
      } finally {
        setPageLoading(false);
      }
    };

    loadStatus();
  }, [user, loading]);

  const activate = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    
    try {
      if (!commercial) throw new Error('Commercial account not found');
      if (commercial.status !== 'eligible') throw new Error('Account is not eligible for activation');

      const { error: updateError } = await supabase
        .from('commercial_accounts')
        .update({ status: 'active', activated_at: new Date().toISOString() })
        .eq('id', commercial.id);

      if (updateError) throw updateError;

      setMessage('Commercial profile activated! You can now publish products.');
      setCommercial({ ...commercial, status: 'active', activated_at: new Date().toISOString() });
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink" />
      </div>
    );
  }

  if (!designer?.verified) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 mt-1 text-red-600 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-black text-red-900">Verification Required</h2>
              <p className="mt-2 text-sm text-red-800">Your designer profile must be verified before commercial activation. You can activate this profile once an admin has reviewed and approved your verification application.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusIcon = {
    pending: <Lock className="h-6 w-6 text-ink/40" />,
    eligible: <ShieldCheck className="h-6 w-6 text-lime" />,
    active: <CheckCircle2 className="h-6 w-6 text-lime" />,
  }[commercial?.status || 'pending'];

  const statusLabel = {
    pending: 'Awaiting approval',
    eligible: 'Ready to activate',
    active: 'Active',
  }[commercial?.status || 'pending'];

  const statusDescription = {
    pending: 'Your verification is pending review. Once approved, you&apos;ll be able to activate commercial features.',
    eligible: 'Your profile is verified and eligible for commercial activation. Click below to unlock product publishing.',
    active: 'Your commercial profile is active. You can now publish products and accept preorders.',
  }[commercial?.status || 'pending'];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-3xl border border-ink/10 bg-white p-8">
        <div className="flex items-start gap-4 mb-6">
          {statusIcon}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45">Commercial Profile</p>
            <h2 className="mt-2 font-display text-3xl font-black text-ink">{statusLabel}</h2>
          </div>
        </div>

        <p className="text-ink/65 leading-7 mb-8">{statusDescription}</p>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {message && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime/10 p-4">
            <CheckCircle2 className="h-5 w-5 text-ink" />
            <p className="text-sm text-ink">{message}</p>
          </div>
        )}

        <div className="space-y-4 border-t border-ink/10 pt-6">
          {commercial?.status === 'eligible' && (
            <button
              type="button"
              onClick={activate}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-ink disabled:opacity-50 transition hover:scale-[1.02]"
            >
              {busy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Activate Commercial Profile
                </>
              )}
            </button>
          )}

          {commercial?.status === 'active' && (
            <div className="flex items-center gap-3 rounded-xl bg-lime/10 p-4 border border-lime/30">
              <CheckCircle2 className="h-5 w-5 text-lime shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/60">Activated</p>
                <p className="text-sm text-ink/80">{new Date(commercial.activated_at || '').toLocaleDateString()}</p>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-ink/5 p-4 space-y-3">
            <h3 className="text-sm font-bold text-ink">Marketplace requirements:</h3>
            <ul className="space-y-2 text-sm text-ink/70">
              <li className="flex gap-2">
                <span className="text-lime">✓</span> Identity verified
              </li>
              <li className="flex gap-2">
                <span className="text-lime">✓</span> Brand authorization confirmed
              </li>
              <li className="flex gap-2">
                <span className="text-lime">✓</span> Business information provided
              </li>
              <li className="flex gap-2">
                <span className="text-lime">✓</span> Payout details registered
              </li>
            </ul>
          </div>
        </div>
      </div>

      {commercial?.status === 'pending' && (
        <div className="rounded-2xl bg-ink/5 border border-ink/10 p-6">
          <h3 className="font-semibold text-ink mb-2">What happens next?</h3>
          <ol className="space-y-3 text-sm text-ink/70">
            <li className="flex gap-3">
              <span className="font-bold text-ink/40 min-w-6">1.</span>
              <span>Our team reviews your verification documents</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-ink/40 min-w-6">2.</span>
              <span>We&apos;ll contact you if we need additional information</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-ink/40 min-w-6">3.</span>
              <span>Once approved, you&apos;ll return here to activate</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-ink/40 min-w-6">4.</span>
              <span>Your commercial profile will be live</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
