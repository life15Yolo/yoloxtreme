import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import type { DropWithDesigner } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { DropCard } from '@/components/drop-card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 30;

export default async function Home() {
  const result = isSupabaseConfigured
    ? await supabase
        .from('drops')
        .select('id, designer_id, slug, title, description, price, max_qty, current_qty, status, countdown_end, images, sizes, created_at')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: null, error: null };

  const rows = (result.data || []) as Array<DropWithDesigner>;
  const designerIds = Array.from(new Set(rows.map((drop) => drop.designer_id)));
  const designers = isSupabaseConfigured && designerIds.length > 0
    ? await supabase
        .from('designers_public')
        .select('id, brand_name, verified, created_at')
        .in('id', designerIds)
    : { data: [], error: null };
  const byId = new Map((designers.data || []).map((designer) => [designer.id, designer]));
  const liveDrops = rows.map((drop) => {
    const profile = byId.get(drop.designer_id);
    return {
      ...drop,
      designer: profile
        ? {
            id: profile.id,
            brand_name: profile.brand_name,
            email: '',
            phone: null,
            bank_name: null,
            account_number: null,
            paystack_subaccount_code: null,
            verified: profile.verified,
            created_at: profile.created_at,
          }
        : undefined,
    };
  }) as DropWithDesigner[];
  const catalogError = isSupabaseConfigured && (result.error || designers.error);

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-ink/10">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-8">
            <div>
              <div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-ink/50">
                <span className="size-2 rounded-full bg-lime" aria-hidden="true" /> Independent fashion, on demand
              </div>
              <h1 className="max-w-5xl font-display text-[clamp(3.8rem,12vw,9.5rem)] font-black leading-[0.82] tracking-[-0.07em] text-ink">
                THE<br /><span className="text-ink/35">PREORDER</span><br />FACTORY
              </h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-ink/70 sm:text-lg">
                A focused home for independent designers to turn a strong idea into a real product — with demand validated before production begins.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="#feed" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5">
                  Explore live drops <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/onboard" className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/20 px-6 py-3 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-ivory">
                  Launch your idea
                </Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.75rem] bg-ink p-6 text-ivory sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ivory/45">The model</p>
                <p className="mt-10 font-display text-3xl font-black leading-none tracking-tight">Demand first.<br />Waste less.</p>
                <p className="mt-5 text-sm leading-6 text-ivory/65">Every live drop has a clear target, price, and production path.</p>
              </div>
              <div className="rounded-[1.75rem] border border-ink/10 bg-white p-6 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">For everyone</p>
                <p className="mt-10 font-display text-3xl font-black leading-none tracking-tight">Make it.<br />Wear it.</p>
                <p className="mt-5 text-sm leading-6 text-ink/60">Discover original work and support the people making it.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-ink/10">
          <div className="mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-3">
            {[
              ['01', 'Submit', 'A designer sends a drop for review.'],
              ['02', 'Approve', 'An admin publishes it. The owner cannot publish it themselves.'],
              ['03', 'Preorder', 'Buyers can order only while the drop is live.'],
            ].map(([number, title, body]) => (
              <div key={number} className="border-ink/10 px-5 py-8 sm:px-8 sm:[&:not(:last-child)]:border-r">
                <p className="text-xs font-bold text-ink/40">{number}</p>
                <h2 className="mt-4 font-display text-3xl font-black tracking-tighter">{title}</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-ink/70">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="feed" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink">Live</p>
              <h2 className="font-display text-4xl font-black tracking-tighter">Drops</h2>
            </div>
            {isSupabaseConfigured && !catalogError && <p className="text-sm text-ink/60">{liveDrops.length} live</p>}
          </div>

          {!isSupabaseConfigured ? (
            <div className="rounded-[1.75rem] border border-ink/10 bg-white p-8">
              <h3 className="font-display text-2xl font-black">Catalog not connected</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-ink/70">This preview has no Supabase project configured, so there are no live drops to show.</p>
            </div>
          ) : catalogError ? (
            <div className="rounded-[1.75rem] border border-ink/10 bg-white p-8">
              <h3 className="font-display text-2xl font-black">Catalog unavailable</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-ink/70">The live drop list could not be loaded. Nothing here is a sample campaign.</p>
            </div>
          ) : liveDrops.length === 0 ? (
            <div className="rounded-[1.75rem] border border-ink/10 bg-white p-8">
              <h3 className="font-display text-2xl font-black">No live drops yet</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-ink/70">Approved campaigns appear here. A new drop stays closed until an admin publishes it.</p>
              <Link href="/onboard" className="mt-6 inline-flex rounded-full bg-lime px-5 py-3 text-sm font-bold text-ink">Launch drop</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {liveDrops.map((drop) => <DropCard key={drop.id} drop={drop} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
