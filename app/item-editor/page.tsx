'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { WorkspaceShell } from '@/components/workspace-shell';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, slugify } from '@/lib/utils';
import { AlertCircle, Check, Loader2, Save } from 'lucide-react';

const statusOptions = ['live', 'funded', 'producing', 'shipped'] as const;

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function ItemEditorForm() {
  const { designer } = useAuth();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [loadingRecord, setLoadingRecord] = useState(Boolean(editId));
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    maxQty: '100',
    status: 'live',
    countdownDate: '',
    sizes: 'S, M, L, XL',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!editId || !designer) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('drops')
        .select('*')
        .eq('id', editId)
        .eq('designer_id', designer.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setForm({
          title: data.title ?? '',
          description: data.description ?? '',
          price: String(Number(data.price) / 100),
          maxQty: String(data.max_qty ?? 100),
          status: data.status ?? 'live',
          countdownDate: data.countdown_end ? toLocalInput(data.countdown_end) : '',
          sizes: (data.sizes || []).join(', '),
        });
      } else {
        setError('That record could not be found in your workspace.');
      }
      setLoadingRecord(false);
    })();
    return () => {
      active = false;
    };
  }, [editId, designer]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!designer) {
      setError('Designer profile not found');
      return;
    }
    if (!form.title.trim() || !form.price) {
      setError('Title and price are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Math.round(parseFloat(form.price) * 100),
        max_qty: parseInt(form.maxQty, 10) || 100,
        status: form.status,
        countdown_end: form.countdownDate ? new Date(form.countdownDate).toISOString() : null,
        sizes: form.sizes
          .split(',')
          .map((size) => size.trim())
          .filter(Boolean),
      };

      if (editId) {
        const { error: updateError } = await supabase
          .from('drops')
          .update(payload)
          .eq('id', editId)
          .eq('designer_id', designer.id);
        if (updateError) throw updateError;
        const { data } = await supabase.from('drops').select('slug').eq('id', editId).maybeSingle();
        setSavedSlug(data?.slug ?? null);
      } else {
        const baseSlug = slugify(form.title);
        const { data: existing } = await supabase
          .from('drops')
          .select('id')
          .eq('slug', baseSlug)
          .maybeSingle();
        const finalSlug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
        const { error: insertError } = await supabase.from('drops').insert({
          designer_id: designer.id,
          slug: finalSlug,
          ...payload,
          current_qty: 0,
          images: [],
        });
        if (insertError) throw insertError;
        setSavedSlug(finalSlug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  if (loadingRecord) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-lime animate-spin" />
      </div>
    );
  }

  if (savedSlug) {
    return (
      <div className="rounded-3xl border border-lime/30 bg-lime/10 p-8 text-center animate-scale-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime">
          <Check className="h-8 w-8 text-black" strokeWidth={3} />
        </div>
        <h3 className="mt-4 font-display text-2xl font-black text-white">
          {editId ? 'RECORD UPDATED' : 'RECORD CREATED'}
        </h3>
        <p className="mt-2 text-white/60">Your changes are saved.</p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/project-list"
            className="rounded-full bg-lime px-5 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
          >
            Back to project list
          </Link>
          <Link
            href={`/d/${savedSlug}`}
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-lime hover:text-lime"
          >
            View record
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">
          {editId ? 'Edit Record' : 'New Record'}
        </h2>
        <p className="text-sm text-white/50 mt-1">
          {editId
            ? 'Update this project record and save your changes.'
            : 'Add a new project record to your workspace.'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. ASH HOODIE VOL.1"
            className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
            required
          />
          {!editId && form.title && (
            <p className="mt-2 text-xs text-white/40">URL: /d/{slugify(form.title)}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Price (₦)
            </label>
            <input
              type="number"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              placeholder="25000"
              min="100"
              className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
              required
            />
            {form.price && (
              <p className="mt-2 text-xs text-lime">{formatNaira(parseFloat(form.price) * 100)}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Max Quantity
            </label>
            <input
              type="number"
              value={form.maxQty}
              onChange={(event) => setForm({ ...form, maxQty: event.target.value })}
              min="1"
              className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Status
            </label>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Deadline
            </label>
            <input
              type="datetime-local"
              value={form.countdownDate}
              onChange={(event) => setForm({ ...form, countdownDate: event.target.value })}
              className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20 [color-scheme:dark]"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Describe the product. Fabric, fit, story..."
            rows={4}
            className="w-full resize-none rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
            Available Sizes (comma-separated)
          </label>
          <input
            type="text"
            value={form.sizes}
            onChange={(event) => setForm({ ...form, sizes: event.target.value })}
            placeholder="S, M, L, XL"
            className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] glow-lime disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                SAVING...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {editId ? 'SAVE CHANGES' : 'CREATE RECORD'}
              </>
            )}
          </button>
          <Link
            href="/project-list"
            className="flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-4 text-sm font-semibold text-white/70 transition-all hover:border-lime hover:text-lime"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ItemEditorPage() {
  return (
    <WorkspaceShell>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-lime animate-spin" />
          </div>
        }
      >
        <ItemEditorForm />
      </Suspense>
    </WorkspaceShell>
  );
}
