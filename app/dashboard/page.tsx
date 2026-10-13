'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/utils';
import { TrendingUp, Package, ShoppingCart, PlusCircle, ArrowRight } from 'lucide-react';

type Stats = { totalRevenue: number; activeDrops: number; totalPreorders: number };

export default function DashboardHome() {
  const { designer } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, activeDrops: 0, totalPreorders: 0 });
  const [recentDrops, setRecentDrops] = useState<Array<{ id: string; title: string; status: string; current_qty: number; max_qty: number }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!designer) return;
    (async () => {
      const { data: drops } = await supabase.from('drops').select('id, title, status, current_qty, max_qty, price').eq('designer_id', designer.id).order('created_at', { ascending: false });
      const dropIds = (drops || []).map((d) => d.id);
      let totalRevenue = 0; let totalPreorders = 0;
      if (dropIds.length > 0) {
        const { data: orders } = await supabase.from('preorders').select('amount, status').in('drop_id', dropIds);
        totalPreorders = orders?.length || 0;
        totalRevenue = (orders || []).filter((o) => o.status === 'paid').reduce((sum, o) => sum + Number(o.amount), 0);
      }
      setStats({ totalRevenue, activeDrops: (drops || []).filter((d) => d.status === 'live').length, totalPreorders });
      setRecentDrops((drops || []).slice(0, 5));
      setLoading(false);
    })();
  }, [designer]);
  if (loading) return (<div className="rounded-3xl border border-white/10 bg-card p-8 text-white/40">Loading your stats...</div>);
  const statCards = [
    { label: 'Total Revenue', value: formatNaira(stats.totalRevenue), icon: TrendingUp, color: 'text-lime' },
    { label: 'Active Drops', value: String(stats.activeDrops), icon: Package, color: 'text-white' },
    { label: 'Total Preorders', value: String(stats.totalPreorders), icon: ShoppingCart, color: 'text-white' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat) => (<div key={stat.label} className="rounded-3xl border border-white/10 bg-card p-5"><div className="flex items-center justify-between mb-3"><stat.icon className={`h-5 w-5 ${stat.color}`} /></div><div className="font-display text-2xl font-black text-white">{stat.value}</div><div className="text-xs text-white/40 mt-1">{stat.label}</div></div>))}
      </div>
      <div className="rounded-3xl border border-lime/20 bg-gradient-to-br from-lime/10 to-card p-6">
        <div className="flex items-center justify-between"><div><h3 className="font-display text-xl font-black text-white">Launch a new drop</h3><p className="text-sm text-white/50 mt-1">Set price, quantity, countdown. Go live instantly.</p></div><Link href="/dashboard/new-drop" className="flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"><PlusCircle className="h-4 w-4" />NEW DROP</Link></div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-card p-6">
        <h3 className="font-display text-lg font-black text-white mb-4">Recent Drops</h3>
        {recentDrops.length === 0 ? (<div className="text-center py-8"><p className="text-white/40 mb-4">No drops yet. Launch your first one.</p><Link href="/dashboard/new-drop" className="inline-flex items-center gap-2 text-sm font-semibold text-lime">Create a drop <ArrowRight className="h-4 w-4" /></Link></div>) : (<div className="space-y-3">{recentDrops.map((drop) => (<Link key={drop.id} href={`/dashboard/drops`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-background p-4 transition-all hover:border-lime/30"><div><p className="font-semibold text-white">{drop.title}</p><p className="text-xs text-white/40">{drop.current_qty}/{drop.max_qty} preordered</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${drop.status === 'live' ? 'bg-lime text-black' : 'bg-white/10 text-white/60'}`}>{drop.status}</span></Link>))}</div>)}
      </div>
    </div>
  );
}
