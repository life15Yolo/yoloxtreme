'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, timeLeft } from '@/lib/utils';
import type { Drop } from '@/lib/types';
import { Package, Clock, Eye, Loader2 } from 'lucide-react';

export default function MyDropsPage() {
  const { designer } = useAuth();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!designer) return;
    (async () => {
      const { data } = await supabase.from('drops').select('*').eq('designer_id', designer.id).order('created_at', { ascending: false });
      setDrops((data || []) as Drop[]);
      setLoading(false);
    })();
  }, [designer]);
  if (loading) return (<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-lime animate-spin" /></div>);
  if (drops.length === 0) return (<div className="rounded-3xl border border-white/10 bg-card p-12 text-center"><Package className="h-12 w-12 text-white/20 mx-auto mb-4" /><h3 className="font-display text-xl font-black text-white">No drops yet</h3><p className="text-white/40 mt-2 mb-4">Launch your first drop to get started.</p><Link href="/dashboard/new-drop" className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime">Create a Drop</Link></div>);
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-black tracking-tighter text-white">My Drops</h2>
      <div className="space-y-3">
        {drops.map((drop) => {
          const progress = drop.max_qty > 0 ? Math.round((drop.current_qty / drop.max_qty) * 100) : 0;
          const countdown = drop.countdown_end ? timeLeft(drop.countdown_end) : null;
          return (
            <div key={drop.id} className="rounded-3xl border border-white/10 bg-card p-5 transition-all hover:border-lime/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-lg font-black text-white truncate">{drop.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${drop.status === 'live' ? 'bg-lime text-black' : 'bg-white/10 text-white/60'}`}>{drop.status}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
                    <span className="font-semibold text-white">{formatNaira(drop.price)}</span>
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" />{drop.current_qty}/{drop.max_qty} preordered</span>
                    {countdown && !countdown.expired && (<span className="flex items-center gap-1 text-lime"><Clock className="h-3 w-3" />{countdown.days}d {countdown.hours}h left</span>)}
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime transition-all" style={{ width: `${Math.max(progress, 2)}%` }} /></div>
                </div>
                <Link href={`/d/${drop.slug}`} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-lime hover:text-lime whitespace-nowrap"><Eye className="h-4 w-4" />View</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
