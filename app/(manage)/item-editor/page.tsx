'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { slugify, formatNaira } from '@/lib/utils';
import { DropImageUploader } from '@/components/drop-image-uploader';
import { Loader2, AlertCircle, Save, ArrowLeft, PlusCircle } from 'lucide-react';

type FormState = {
  title: string;
  description: string;
  price: string;
  maxQty: string;
  status: string;
  countdownDate: string;
  sizes: string;
};

const emptyForm: FormState = {
  title: '',
  description: '',
  price: '',
  maxQty: '100',
  status: 'live',
  countdownDate: '',
  sizes: 'S, M, L, XL',
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function ItemEditorForm() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const router = useRouter();
  const { designer } = useAuth();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!designer || !editId) return;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('drops')
        .select('*')
        .eq('id', editId)
        .eq('designer_id', designer.id)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Project not found, or you do not have access to it.');
        setLoading(false);
        return;
      }

      setForm({
        title: data.title || '',
        description: data.description || '',
        price: data.price ? String(Number(data.price) / 100) : '',
        maxQty: String(data.max_qty ?? 100),
        status: data.status || 'live',
        countdownDate: toLocalInput(data.countdown_end),
        sizes: (data.sizes || []).join(', '),
      });
      setImages(data.images || []);
      setLoading(false);
    })();
  }, [designer, editId]);

  const update = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designer) return;
    setError(null);
    setSaved(false);

    if (!form.title.trim() || !form.price) {
      setError('Title and price are required');
      return;
    }

    const priceKobo = Math.round(parseFloat(form.price) * 100);
    if (!Number.isFinite(priceKobo) || priceKobo <= 0) {
      setError('Enter a valid price');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        price: priceKobo,
        max_qty: parseInt(form.maxQty, 10) || 100,
        status: form.status,
        countdown_end: form.countdownDate ? new Date(form.countdownDate).toISOString() : null,
        images,
        sizes: form.sizes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (editId) {
        const { error: updateError } = await supabase
          .from('drops')
          .update(payload)
          .eq('id', editId)
          .eq('designer_id', designer.id);
        if (updateError) throw updateError;
      } else {
        const slug = slugify(payload.title) || `drop-${Date.now().toString(36)}`;
        const { data: existing } = await supabase.from('drops').select('id').eq('slug', slug).maybeSingle();
        const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;
        const { error: insertError } = await supabase.from('drops').insert({
          ...payload,
          designer_id: designer.id,
          slug: finalSlug,
          current_qty: 0,
        });
        if (insertError) throw insertError;
      }

      setSaved(true);
      router.push('/project-list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-lime animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/project-list" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-lime">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to projects
        </Link>
        <h2 className="mt-2 font-display text-2xl font-black tracking-tighter text-white">
          {editId ? 'Edit Project' : 'New Project'}
        </h2>
        <p className="text-sm text-white/40 mt-1">
          {editId ? 'Update this project record and save your changes.' : 'Add a new project record to your store.'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {saved && (
        <div className="rounded-2xl border border-lime/30 bg-lime/10 p-4 text-sm font-semibold text-lime">
          Project saved. Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Project Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. ASH HOODIE VOL.1"
            className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
            required
          />
          {form.title && !editId && <p className="mt-2 text-xs text-white/40">URL: /d/{slugify(form.title)}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Price (₦)</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              placeholder="25000"
              min="1"
              className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
              required
            />
            {form.price && <p className="mt-2 text-xs text-lime">{formatNaira(parseFloat(form.price) * 100)}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Max Quantity</label>
            <input
              type="number"
              value={form.maxQty}
              onChange={(e) => update('maxQty', e.target.value)}
              min="1"
              className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Describe your product. Fabric, fit, story..."
            rows={4}
            className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Status</label>
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
            >
              <option value="live">Live</option>
              <option value="funded">Funded</option>
              <option value="producing">Producing</option>
              <option value="shipped">Shipped</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Countdown End Date</label>
            <input
              type="datetime-local"
              value={form.countdownDate}
              onChange={(e) => update('countdownDate', e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20 [color-scheme:dark]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
            Available Sizes (comma-separated)
          </label>
          <input
            type="text"
            value={form.sizes}
            onChange={(e) => update('sizes', e.target.value)}
            placeholder="S, M, L, XL"
            className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Images (up to 3)</label>
          <DropImageUploader designerId={designer?.id || ''} images={images} onChange={setImages} onError={setError} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={saving || !designer}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] glow-lime disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                SAVING...
              </>
            ) : editId ? (
              <>
                <Save className="h-5 w-5" />
                SAVE CHANGES
              </>
            ) : (
              <>
                <PlusCircle className="h-5 w-5" />
                CREATE PROJECT
              </>
            )}
          </button>
          <Link
            href="/project-list"
            className="flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-sm font-semibold text-white/70 transition-all hover:border-lime hover:text-lime"
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-lime animate-spin" />
        </div>
      }
    >
      <ItemEditorForm />
    </Suspense>
  );
}
