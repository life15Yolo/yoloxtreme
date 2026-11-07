import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import type { DropWithDesigner, Designer } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { DropCard } from '@/components/drop-card';

export const revalidate = 30;

export default async function DesignerPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-ivory text-ink">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-24">
          <h1 className="font-display text-4xl font-black tracking-tighter">Designer profile unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">This preview has no project connection, so designer profiles cannot be loaded.</p>
        </main>
      </div>
    );
  }

  const { data: designer } = await supabase
    .from('designers_public')
    .select('id, brand_name, verified, created_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!designer) notFound();

  const profile = designer as Pick<Designer, 'id' | 'brand_name' | 'verified' | 'created_at'>;
  const { data: drops } = await supabase
    .from('drops')
    .select('id, designer_id, slug, title, description, price, max_qty, current_qty, status, countdown_end, images, sizes, created_at')
    .eq('designer_id', profile.id)
    .eq('status', 'live')
    .order('created_at', { ascending: false });

  const liveDrops = ((drops || []) as DropWithDesigner[]).map((drop) => ({
    ...drop,
    designer: {
      id: profile.id,
      brand_name: profile.brand_name,
      email: '',
      phone: null,
      bank_name: null,
      account_number: null,
      paystack_subaccount_code: null,
      verified: profile.verified,
      created_at: profile.created_at,
    },
  }));

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/#feed" className="text-sm font-semibold text-ink underline">All drops</Link>
        <h1 className="mt-4 font-display text-5xl font-black tracking-tighter sm:text-7xl">{profile.brand_name}</h1>
        {profile.verified && <p className="mt-4 inline-flex rounded-full bg-lime px-3 py-1 text-xs font-bold">Verified designer</p>}
        <section className="mt-12">
          <h2 className="font-display text-3xl font-black tracking-tighter">Live drops</h2>
          {liveDrops.length === 0 ? (
            <p className="mt-4 max-w-lg text-sm leading-6 text-ink/70">No live drops from this designer. Pending campaigns stay off this page.</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {liveDrops.map((drop) => <DropCard key={drop.id} drop={drop} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
