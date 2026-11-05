'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { WorkspaceShell } from '@/components/workspace-shell';
import { supabase } from '@/lib/supabase/client';
import type { Feedback } from '@/lib/types';
import { AlertCircle, Bug, Check, Loader2, MessageSquarePlus, Send, Sparkles } from 'lucide-react';

const requestTypes = [
  { key: 'feature', label: 'Feature request', icon: Sparkles },
  { key: 'bug', label: 'Bug report', icon: Bug },
] as const;

export default function FeedbackPortalPage() {
  const { designer } = useAuth();
  const [type, setType] = useState<(typeof requestTypes)[number]['key']>('feature');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [previous, setPrevious] = useState<Feedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async (designerId: string) => {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .eq('designer_id', designerId)
      .order('created_at', { ascending: false })
      .limit(10);
    setPrevious((data || []) as Feedback[]);
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (!designer) return;
    loadHistory(designer.id);
  }, [designer]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitted(false);
    if (!designer) {
      setError('Designer profile not found');
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setError('Add a subject and a description');
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('feedback').insert({
        designer_id: designer.id,
        type,
        subject: subject.trim(),
        message: message.trim(),
      });
      if (insertError) throw insertError;
      setSubmitted(true);
      setSubject('');
      setMessage('');
      await loadHistory(designer.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkspaceShell>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">Feedback Portal</h2>
        <p className="mt-1 text-sm text-white/50">
          Request a feature or report a bug — straight to the factory floor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          {submitted && (
            <div className="flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime/10 p-4">
              <Check className="h-5 w-5 shrink-0 text-lime" />
              <p className="text-sm text-lime">Thanks — your feedback is in.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {requestTypes.map((request) => (
              <button
                key={request.key}
                type="button"
                onClick={() => setType(request.key)}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-bold transition-all ${
                  type === request.key
                    ? 'border-lime bg-lime text-black'
                    : 'border-white/10 bg-card text-white/60 hover:border-lime/30 hover:text-white'
                }`}
              >
                <request.icon className="h-4 w-4" />
                {request.label}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Short summary of your request"
              className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Details
            </label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                type === 'bug'
                  ? 'What happened, what you expected, and where...'
                  : 'What would you like to see and why...'
              }
              rows={6}
              className="w-full resize-none rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] glow-lime disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                SENDING...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                SUBMIT FEEDBACK
              </>
            )}
          </button>
        </form>

        <aside className="rounded-3xl border border-white/10 bg-card p-5 h-fit">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-lime" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
              Your submissions
            </h3>
          </div>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 text-lime animate-spin" />
            </div>
          ) : previous.length === 0 ? (
            <p className="text-sm text-white/40">Nothing submitted yet.</p>
          ) : (
            <ul className="space-y-3">
              {previous.map((item) => (
                <li key={item.id} className="rounded-2xl border border-white/10 bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                      {item.type === 'bug' ? 'Bug report' : 'Feature request'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-lime">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{item.subject}</p>
                  <p className="mt-0.5 text-xs text-white/30">
                    {new Date(item.created_at).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </WorkspaceShell>
  );
}
