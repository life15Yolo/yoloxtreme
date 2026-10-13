'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { DropWithDesigner } from '@/lib/types';
import { formatNaira, timeLeft } from '@/lib/utils';
import { Navbar } from '@/components/navbar';
import { PLACEHOLDER_IMAGES } from '@/components/drop-card';
import { Clock, TrendingUp, Package, Check, Loader2, AlertCircle, MessageCircle, ArrowLeft, Zap } from 'lucide-react';

export default function DropPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [drop, setDrop] = useState<DropWithDesigner | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(timeLeft(new Date(Date.now() + 86400000).toISOString()));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('drops').select(`*, designer:designers(*)`).eq('slug', slug).maybeSingle();
      if (data) {
        const dropData = data as unknown as DropWithDesigner;
        setDrop(dropData);
        if (dropData.sizes?.length > 0) setSelectedSize(dropData.sizes[0]);
      }
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!drop?.countdown_end) return;
    const timer = setInterval(() => { setCountdown(timeLeft(drop.countdown_end!)); }, 1000);
    return () => clearInterval(timer);
  }, [drop?.countdown_end]);

  const handlePreorder = async () => {
    setError(null);
    if (!drop) return;
    if (!buyerEmail) { setError('Enter your email to continue'); return; }
    if (drop.sizes?.length > 0 && !selectedSize) { setError('Select a size'); return; }
    setPaying(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const response = await fetch(`${supabaseUrl}/functions/v1/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ drop_id: drop.id, email: buyerEmail, name: buyerName, phone: buyerPhone, size: selectedSize, quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payment initialization failed');
      window.location.href = data.authorization_url;
    } catch (err) { setError(err instanceof Error ? err.message : 'Payment failed'); setPaying(false); }
  };

  if (loading) return (<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-8 w-8 text-lime animate-spin" /></div>);
  if (!drop) return (<div className="min-h-screen bg-black flex items-center justify-center px-4"><div className="text-center"><h1 className="font-display text-3xl font-black text-white">DROP NOT FOUND</h1><p className="text-white/50 mt-2">This drop may have been removed.</p><Link href="/" className="mt-4 inline-flex items-center gap-2 text-lime font-semibold"><ArrowLeft className="h-4 w-4" /> Back to feed</Link></div></div>);

  const progress = drop.max_qty > 0 ? Math.round((drop.current_qty / drop.max_qty) * 100) : 0;
  const images = drop.images?.length > 0 ? drop.images : [PLACEHOLDER_IMAGES[0]];
  const isLive = drop.status === 'live' && !countdown.expired;
  const soldOut = drop.current_qty >= drop.max_qty;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="pt-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-lime transition-colors mb-6"><ArrowLeft className="h-4 w-4" />Back to feed</Link>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10">
              <Image src={images[selectedImage] || images[0]} alt={drop.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
              {isLive && (<div className="absolute top-4 left-4"><span className="flex items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-xs font-bold text-black"><span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />LIVE</span></div>)}
            </div>
            {images.length > 1 && (<div className="grid grid-cols-3 gap-3">{images.slice(0, 3).map((img, i) => (<button key={i} onClick={() => setSelectedImage(i)} className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-lime' : 'border-white/10'}`}><Image src={img} alt={`View ${i + 1}`} fill className="object-cover" sizes="120px" /></button>))}</div>)}
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-lime">{drop.designer?.brand_name}</p>
              <h1 className="mt-1 font-display text-4xl sm:text-5xl font-black tracking-tighter text-white">{drop.title}</h1>
              {drop.designer?.verified && (<div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-white/60"><Check className="h-3 w-3 text-lime" />Verified Designer</div>)}
            </div>
            <div className="font-display text-3xl font-black text-white">{formatNaira(drop.price)}</div>
            {drop.countdown_end && !countdown.expired && (
              <div className="rounded-2xl border border-lime/20 bg-lime/5 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lime mb-3"><Clock className="h-4 w-4" />Preorder ends in</div>
                <div className="grid grid-cols-4 gap-2">
                  {[{ label: 'Days', value: countdown.days }, { label: 'Hours', value: countdown.hours }, { label: 'Min', value: countdown.minutes }, { label: 'Sec', value: countdown.seconds }].map((unit) => (
                    <div key={unit.label} className="rounded-xl bg-black/40 p-3 text-center"><div className="font-display text-2xl font-black text-white tabular-nums">{String(unit.value).padStart(2, '0')}</div><div className="text-xs text-white/40 mt-1">{unit.label}</div></div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-white/60"><TrendingUp className="h-4 w-4 text-lime" />{progress}% funded</span>
                <span className="flex items-center gap-2 text-white/60"><Package className="h-4 w-4" />{drop.max_qty - drop.current_qty} left of {drop.max_qty}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime transition-all duration-500" style={{ width: `${Math.max(progress, 2)}%` }} /></div>
            </div>
            {drop.description && (<div className="rounded-2xl border border-white/10 bg-card p-5"><p className="text-sm text-white/70 leading-relaxed">{drop.description}</p></div>)}
            {drop.sizes?.length > 0 && (
              <div><label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-3">Select Size</label><div className="flex flex-wrap gap-2">{drop.sizes.map((size) => (<button key={size} onClick={() => setSelectedSize(size)} className={`min-w-[3rem] rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${selectedSize === size ? 'border-lime bg-lime text-black' : 'border-white/15 text-white/70 hover:border-lime/40'}`}>{size}</button>))}</div></div>
            )}
            <div><label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-3">Quantity</label><div className="flex items-center gap-3"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white text-lg font-bold hover:border-lime/40">–</button><span className="font-display text-xl font-black text-white w-12 text-center">{quantity}</span><button onClick={() => setQuantity(Math.min(10, quantity + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white text-lg font-bold hover:border-lime/40">+</button></div></div>
            <div className="space-y-3">
              <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Your name" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" />
              <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="your@email.com" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" />
              <input type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="Phone (for delivery)" className="w-full rounded-2xl border border-white/15 bg-card px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20" />
            </div>
            {error && (<div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4"><AlertCircle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm text-red-200">{error}</p></div>)}
            <button onClick={handlePreorder} disabled={paying || soldOut || !isLive} className="group flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-base font-bold text-black transition-all hover:scale-[1.02] glow-lime disabled:opacity-40 disabled:hover:scale-100">{paying ? (<><Loader2 className="h-5 w-5 animate-spin" />INITIALIZING PAYMENT...</>) : soldOut ? ('SOLD OUT') : !isLive ? ('DROP ENDED') : (<><Zap className="h-5 w-5" fill="black" />PREORDER NOW · {formatNaira(drop.price * quantity)}</>)}</button>
            <Link href={`/d/${drop.slug}/room`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-card p-4 transition-all hover:border-lime/30"><div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-lime" /><div><p className="font-semibold text-white">Join the Room</p><p className="text-xs text-white/40">Discuss, review, ask questions</p></div></div><span className="text-lime font-bold">→</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
