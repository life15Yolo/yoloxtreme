'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { slugify, formatNaira } from '@/lib/utils';
import { Loader2, Check, AlertCircle, Plus, X, Image as ImageIcon } from 'lucide-react';

export default function NewDropPage() {
  const router = useRouter();
  const { designer } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ title: '', price: '', maxQty: '100', description: '', countdownDate: '', sizes: 'S, M, L, XL' });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !designer) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      for (const file of Array.from(files)) {
        if (imageUrls.length + newUrls.length >= 3) break;
        if (file.size > MAX_FILE_SIZE) { setError(`${file.name} is too large. Max 5MB per image.`); continue; }
        const ext = file.name.split('.').pop();
        const fileName = `${designer.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('drop-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('drop-images').getPublicUrl(fileName);
        newUrls.push(data.publicUrl);
      }
      setImageUrls([...imageUrls, ...newUrls]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed'); } finally { setUploading(false); }
  };

  const removeImage = (index: number) => setImageUrls(imageUrls.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!designer) { setError('Designer profile not found'); return; }
    if (!form.title || !form.price) { setError('Title and price are required'); return; }
    setLoading(true);
    try {
      const slug = slugify(form.title);
      const { data: existing } = await supabase.from('drops').select('id').eq('slug', slug).maybeSingle();
      const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;
      const priceKobo = Math.round(parseFloat(form.price) * 100);
      const { data: drop, error: insertError } = await supabase.from('drops').insert({ designer_id: designer.id, slug: finalSlug, title: form.title, description: form.description, price: priceKobo, max_qty: parseInt(form.maxQty) || 100, current_qty: 0, status: 'live', countdown_end: form.countdownDate ? new Date(form.countdownDate).toISOString() : null, images: imageUrls, sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean) }).select().single();
      if (insertError) throw insertError;
      setSuccess(true);
      setTimeout(() => router.push(`/d/${finalSlug}`), 1500);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create drop'); } finally { setLoading(false); }
  };

  if (success) return (<div className="rounded-3xl border border-lime/30 bg-lime/10 p-8 text-center animate-scale-in"><div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-lime"><Check className="h-8 w-8 text-black" strokeWidth={3} /></div><h3 className="mt-4 font-display text-2xl font-black text-white">DROP IS LIVE!</h3><p className="mt-2 text-white/60">Redirecting to your drop page...</p></div>);

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-black tracking-tighter text-white">Create New Drop</h2>
      {error && (<div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4"><AlertCircle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm text-red-200">{error}</p></div>)}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div><label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Drop Title</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. ASH HOODIE VOL.1" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" required />{form.title && (<p className="mt-2 text-xs text-white/40">URL: /d/{slugify(form.title)}</p>)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Price (₦)</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="25000" min="100" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" required />{form.price && (<p className="mt-2 text-xs text-lime">{formatNaira(parseFloat(form.price) * 100)}</p>)}</div>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Max Quantity</label><input type="number" value={form.maxQty} onChange={(e) => setForm({ ...form, maxQty: e.target.value })} min="1" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" /></div>
        </div>
        <div><label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your product. Fabric, fit, story..." rows={4} className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20 resize-none" /></div>
        <div><label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Available Sizes (comma-separated)</label><input type="text" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="S, M, L, XL" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" /></div>
        <div><label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Countdown End Date</label><input type="datetime-local" value={form.countdownDate} onChange={(e) => setForm({ ...form, countdownDate: e.target.value })} className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20 [color-scheme:dark]" /></div>
        <div><label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Drop Images (up to 3)</label><div className="grid grid-cols-3 gap-3">{imageUrls.map((url, i) => (<div key={i} className="relative aspect-square rounded-2xl border border-white/15 overflow-hidden group"><img src={url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-4 w-4" /></button></div>))}{imageUrls.length < 3 && (<label className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-card transition-all hover:border-lime/40"><div className="text-center">{uploading ? (<Loader2 className="h-6 w-6 text-lime animate-spin mx-auto" />) : (<><ImageIcon className="h-6 w-6 text-white/30 mx-auto mb-1" /><span className="text-xs text-white/30">Upload</span></>)}</div><input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} /></label>)}</div></div>
        <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] glow-lime disabled:opacity-50">{loading ? (<><Loader2 className="h-5 w-5 animate-spin" />LAUNCHING DROP...</>) : (<><Plus className="h-5 w-5" />LAUNCH DROP</>)}</button>
      </form>
    </div>
  );
}
