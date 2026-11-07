import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import type { DropWithDesigner } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { DropCard, PLACEHOLDER_IMAGES } from '@/components/drop-card';
import { Zap, ArrowRight, Factory, Users, Rocket } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 30;

export default async function Home() {
  const { data: drops } = isSupabaseConfigured
    ? await supabase
        .from('drops')
        .select(`
          *,
          designer:designers(*)
        `)
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: null };

  const liveDrops = (drops || []) as unknown as DropWithDesigner[];

  // Demo drops for empty state
  const demoDrops: DropWithDesigner[] = Array.from({ length: 6 }).map((_, i) => ({
    id: `demo-${i}`,
    designer_id: `demo-designer-${i}`,
    slug: `demo-drop-${i}`,
    title: ['ASH HOODIE', 'NOIR TEE', 'CHROME VEST', 'STATIC CARGO', 'VOID JACKET', 'PULSE CAP'][i],
    description: 'A premium preorder drop',
    price: [2500000, 1500000, 3200000, 4000000, 5500000, 800000][i],
    max_qty: 100,
    current_qty: [34, 12, 67, 8, 45, 23][i],
    status: 'live',
    countdown_end: new Date(Date.now() + (i + 3) * 86400000).toISOString(),
    images: [PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length]],
    sizes: ['S', 'M', 'L', 'XL'],
    created_at: new Date().toISOString(),
    designer: {
      id: `demo-designer-${i}`,
      brand_name: ['OBSIDIAN', 'MONOCHROME', 'PHANTM', 'GREYAREA', 'BLACKBOX', 'NIGHTSHIFT'][i],
      email: '',
      phone: null,
      bank_name: null,
      account_number: null,
      paystack_subaccount_code: null,
      verified: i % 2 === 0,
      created_at: new Date().toISOString(),
    },
  }));

  const showDemos = liveDrops.length === 0;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-lime/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-lime/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-4 py-1.5 mb-6 animate-fade-in">
              <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
              <span className="text-xs font-semibold text-lime">PREORDER FACTORY IS LIVE</span>
            </div>

            <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-white/40 animate-fade-in">Made in Africa. Worn everywhere.</p>
            <h1 className="max-w-4xl font-display text-[3.75rem] leading-[0.88] sm:text-7xl md:text-8xl font-black tracking-tighter text-white animate-fade-in" style={{ animationDelay: '100ms' }}>
              WEAR WHAT&apos;S<br />
              <span className="text-lime">NEXT.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/60 animate-fade-in" style={{ animationDelay: '200ms' }}>
              Discover limited drops from Africa&apos;s most original designers.
              Every order funds the next piece.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Link
                href="#feed"
                className="group flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
              >
                BROWSE DROPS
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/onboard"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white transition-all hover:border-lime hover:text-lime"
              >
                LAUNCH YOUR BRAND
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '400ms' }}>
            {[
              { icon: Users, label: 'DESIGNERS', value: '100+' },
              { icon: Rocket, label: 'LIVE DROPS', value: `${showDemos ? '6' : liveDrops.length}` },
              { icon: Factory, label: 'PRODUCED', value: '∞' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-card/50 p-4 text-center backdrop-blur-sm">
                <stat.icon className="h-5 w-5 text-lime mx-auto mb-2" />
                <div className="font-display text-2xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-px border-y border-white/10 bg-white/10 sm:grid-cols-3">
        {[['01', 'Discover', 'Original drops from independent designers.'], ['02', 'Preorder', 'Your order unlocks the production run.'], ['03', 'Receive', 'Tracked delivery from studio to doorstep.']].map(([number, title, body]) => (
          <div key={number} className="bg-black px-5 py-6 sm:px-8">
            <div className="mb-5 flex items-center justify-between text-xs font-bold text-white/35"><span>{number}</span><span className="h-px w-10 bg-lime/60" /></div>
            <h2 className="font-display text-xl text-white">{title}</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-white/45">{body}</p>
          </div>
        ))}
      </section>

      {/* Marquee */}
      <div className="relative overflow-hidden border-y border-white/10 bg-card/30 py-3">
        <div className="flex whitespace-nowrap marquee">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex items-center gap-8 px-4">
              {['PREORDER', 'PRODUCE', 'SHIP', 'ZERO INVENTORY', 'MULTI-DESIGNER', 'SPLIT PAYMENTS', 'LIVE DROPS', 'NO RISK'].map((word, i) => (
                <span key={`${dup}-${i}`} className="flex items-center gap-8">
                  <span className="font-display text-sm font-bold uppercase tracking-widest text-white/30">{word}</span>
                  <Zap className="h-4 w-4 text-lime/50" fill="currentColor" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Feed */}
      <section id="feed" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-lime">The edit</p>
            <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tighter text-white">
              LIVE DROPS
            </h2>
            <p className="mt-1 text-sm text-white/50">
              {showDemos ? 'Small-batch pieces, made when you order.' : `${liveDrops.length} drops live right now`}
            </p>
          </div>
          <div className="scrollbar-hide flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Drop categories">
            {['ALL DROPS', 'CLOTHING', 'ACCESSORIES'].map((filter, index) => (
              <button key={filter} className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-bold transition-colors ${index === 0 ? 'bg-white text-black' : 'border border-white/15 text-white/60 hover:border-lime hover:text-lime'}`}>
                {filter}
              </button>
            ))}
          </div>
        </div>

        {showDemos ? (
          <>
            <div className="rounded-2xl border border-lime/20 bg-lime/5 p-4 mb-6 text-center">
              <p className="text-sm text-white/70">
                No live drops yet. These are demos — <Link href="/onboard" className="text-lime font-semibold underline">launch the first real drop</Link>.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {demoDrops.map((drop, i) => (
                <DropCard key={drop.id} drop={drop} index={i} />
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveDrops.map((drop, i) => (
              <DropCard key={drop.id} drop={drop} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-lime/20 bg-gradient-to-br from-lime/10 via-card to-card p-8 sm:p-12 text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lime/10 rounded-full blur-3xl pointer-events-none" />
          <h2 className="relative font-display text-3xl sm:text-5xl font-black tracking-tighter text-white">
            ARE YOU A<br /><span className="text-lime">DESIGNER?</span>
          </h2>
          <p className="relative mt-4 max-w-lg mx-auto text-white/60">
            Launch your drop in minutes. No inventory, no upfront costs.
            Get 90% of every sale. We handle production.
          </p>
          <Link
            href="/onboard"
            className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
          >
            LAUNCH YOUR DROP
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
