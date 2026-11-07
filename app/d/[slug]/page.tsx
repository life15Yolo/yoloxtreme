'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import type { DropWithDesigner } from '@/lib/types';
import { formatNaira, timeLeft } from '@/lib/utils';
import { Navbar } from '@/components/navbar';
import { Clock, TrendingUp, Package, Check, Loader2, MessageCircle, ArrowLeft } from 'lucide-react';

export default function DropPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [drop, setDrop] = useState<DropWithDesigner | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [countdown, setCountdown] = useState(timeLeft(new Date(Date.now() + 86400000).toISOString()));

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from('drops').select('id, designer_id, slug, title, description, price, max_qty, current_qty, status, countdown_end, images, sizes, created_at').eq('slug', slug).maybeSingle();
      if (data) {
        const { data: profile } = await supabase.from('designers_public').select('id, brand_name, verified, created_at').eq('id', data.designer_id).maybeSingle();
        const dropData = {
          ...(data as unknown as DropWithDesigner),
          designer: profile
            ? { id: profile.id, brand_name: profile.brand_name, email: '', phone: null, bank_name: null, account_number: null, paystack_subaccount_code: null, verified: profile.verified, created_at: profile.created_at }
            : undefined,
        } as DropWithDesigner;
        setDrop(dropData);
      }
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!drop?.countdown_end) return;
    const timer = setInterval(() => { setCountdown(timeLeft(drop.countdown_end!)); }, 1000);
    return () => clearInterval(timer);
  }, [drop?.countdown_end]);

  if (!isSupabaseConfigured) return (<div className="min-h-screen bg-ivory"><Navbar /><main className="mx-auto max-w-3xl px-4 py-24"><h1 className="font-display text-4xl font-black tracking-tighter text-ink">Drop unavailable</h1><p className="mt-3 text-sm leading-6 text-ink/70">This preview has no project connection, so this drop cannot be loaded.</p><Link href="/" className="mt-6 inline-flex text-sm font-semibold text-ink underline">Back to drops</Link></main></div>);
  if (loading) return (<div className="min-h-screen bg-ivory flex items-center justify-center"><Loader2 className="h-8 w-8 text-ink animate-spin" /></div>);
  if (!drop) return (<div className="min-h-screen bg-ivory flex items-center justify-center px-4"><div className="text-center"><h1 className="font-display text-3xl font-black text-ink">DROP NOT FOUND</h1><p className="text-ink/60 mt-2">This drop may have been removed.</p><Link href="/" className="mt-4 inline-flex items-center gap-2 text-ink font-semibold"><ArrowLeft className="h-4 w-4" /> Back to feed</Link></div></div>);

  const progress = drop.max_qty > 0 ? Math.round((drop.current_qty / drop.max_qty) * 100) : 0;
  const images = drop.images?.length > 0 ? drop.images : [];
  const isLive = drop.status === 'live' && !countdown.expired;

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors mb-6"><ArrowLeft className="h-4 w-4" />Back to feed</Link>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden border border-ink/10 bg-white">
              {images.length > 0 ? <Image src={images[selectedImage] || images[0]} alt={drop.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority /> : <div className="flex h-full items-center justify-center px-6 text-center font-display text-3xl font-black text-ink/30">{drop.title}</div>}
              {isLive && (<div className="absolute top-4 left-4"><span className="flex items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink"><span className="h-1.5 w-1.5 rounded-full bg-ivory animate-pulse" />LIVE</span></div>)}
            </div>
            {images.length > 1 && (<div className="grid grid-cols-3 gap-3">{images.slice(0, 3).map((img, i) => (<button key={i} onClick={() => setSelectedImage(i)} className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-lime' : 'border-ink/10'}`}><Image src={img} alt={`View ${i + 1}`} fill className="object-cover" sizes="120px" /></button>))}</div>)}
          </div>
          <div className="space-y-6">
            <div>
              {drop.designer?.id ? <Link href={`/designer/${drop.designer.id}`} className="text-sm font-bold uppercase tracking-wider text-ink underline decoration-lime decoration-2 underline-offset-4">{drop.designer.brand_name}</Link> : <p className="text-sm font-bold uppercase tracking-wider text-ink">{drop.designer?.brand_name}</p>}
              <h1 className="mt-1 font-display text-4xl sm:text-5xl font-black tracking-tighter text-ink">{drop.title}</h1>
              {drop.designer?.verified && (<div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1 text-xs text-ink/70"><Check className="h-3 w-3 text-ink" />Verified Designer</div>)}
              {drop.status === 'pending_review' && (<div className="mt-4 rounded-2xl border border-amber-700/30 bg-amber-100 p-4 text-sm text-ink">This drop is awaiting review. Preorders are closed until it is approved.</div>)}
            </div>
            <div className="font-display text-3xl font-black text-ink">{formatNaira(drop.price)}</div>
            {drop.countdown_end && !countdown.expired && (
              <div className="rounded-2xl border border-lime/20 bg-lime/5 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink mb-3"><Clock className="h-4 w-4" />Preorder ends in</div>
                <div className="grid grid-cols-4 gap-2">
                  {[{ label: 'Days', value: countdown.days }, { label: 'Hours', value: countdown.hours }, { label: 'Min', value: countdown.minutes }, { label: 'Sec', value: countdown.seconds }].map((unit) => (
                    <div key={unit.label} className="rounded-xl bg-ivory p-3 text-center"><div className="font-display text-2xl font-black text-ink tabular-nums">{String(unit.value).padStart(2, '0')}</div><div className="text-xs text-ink/50 mt-1">{unit.label}</div></div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink/70"><TrendingUp className="h-4 w-4" />{progress}% preordered</span>
                <span className="flex items-center gap-2 text-ink/70"><Package className="h-4 w-4" />{drop.max_qty - drop.current_qty} left of {drop.max_qty}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-lime transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            </div>
            {drop.description && (<div className="rounded-2xl border border-ink/10 bg-white p-5"><p className="text-sm text-ink/80 leading-relaxed">{drop.description}</p></div>)}
            {drop.sizes?.length > 0 && (
              <div><p className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-3">Sizes</p><div className="flex flex-wrap gap-2">{drop.sizes.map((size) => (<span key={size} className="min-w-[3rem] rounded-full border border-ink/15 px-4 py-2 text-sm font-bold text-ink">{size}</span>))}</div></div>
            )}
            <div className="rounded-[1.75rem] border border-ink/10 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-ink/50">Checkout closed</p>
              <h2 className="mt-2 font-display text-2xl font-black tracking-tighter">No payment is taken</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">Real checkout is closed, including when live payment credentials exist. There is no automatic Paystack split. The target, after a verified release exists, is 90% to the designer and 10% to the platform once the buyer confirms compliant delivery. The buyer would pay the processing fee on top. That release is not built, so this screen cannot complete an order.</p>
              <button type="button" disabled className="mt-5 flex w-full cursor-not-allowed items-center justify-center rounded-full bg-ink/10 px-6 py-4 text-sm font-bold text-ink/50">CHECKOUT CLOSED</button>
            </div>
            <Link href={`/d/${drop.slug}/room`} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-4 transition-all hover:border-lime/30"><div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-ink" /><div><p className="font-semibold text-ink">Join the Room</p><p className="text-xs text-ink/50">Discuss, review, ask questions</p></div></div><span className="text-ink font-bold">→</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
