'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, timeAgo } from '@/lib/utils';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Boxes,
  PlusCircle,
  ArrowRight,
  FolderKanban,
  PencilLine,
  BarChart3,
  User,
} from 'lucide-react';

type Stats = {
  totalRevenue: number;
  activeDrops: number;
  totalProjects: number;
  totalPreorders: number;
  unitsSold: number;
  pendingOrders: number;
};

type RecentDrop = { id: string; title: string; status: string; current_qty: number; max_qty: number };

type RecentOrder = {
  id: string;
  buyer_name: string | null;
  buyer_email: string;
  amount: number;
  status: string;
  created_at: string;
  drop: { title: string } | null;
};

const quickLinks = [
  { href: '/project-list', label: 'Projects', description: 'Browse and search every drop', icon: FolderKanban },
  { href: '/item-editor', label: 'Item Editor', description: 'Create or update a project', icon: PencilLine },
  { href: '/analytics', label: 'Analytics', description: 'Trends and insights', icon: BarChart3 },
  { href: '/profile', label: 'Profile', description: 'Account and payout details', icon: User },
];

export default function DashboardHome() {
  const { designer } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    activeDrops: 0,
    totalProjects: 0,
    totalPreorders: 0,
    unitsSold: 0,
    pendingOrders: 0,
  });
  const [recentDrops, setRecentDrops] = useState<RecentDrop[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!designer) return;
    (async () => {
      const { data: drops } = await supabase
        .from('drops')
        .select('id, title, status, current_qty, max_qty, price')
        .eq('designer_id', designer.id)
        .order('created_at', { ascending: false });

      const dropIds = (drops || []).map((d) => d.id);
      let totalRevenue = 0;
      let totalPreorders = 0;
      let unitsSold = 0;
      let pendingOrders = 0;

      if (dropIds.length > 0) {
        const { data: orders } = await supabase
          .from('preorders')
          .select('id, buyer_name, buyer_email, amount, status, quantity, created_at, drop:drops(title)')
          .in('drop_id', dropIds)
          .order('created_at', { ascending: false });

        totalPreorders = orders?.length || 0;
        totalRevenue = (orders || [])
          .filter((o) => o.status === 'paid')
          .reduce((sum, o) => sum + Number(o.amount), 0);
        unitsSold = (orders || [])
          .filter((o) => o.status === 'paid')
          .reduce((sum, o) => sum + Number(o.quantity || 0), 0);
        pendingOrders = (orders || []).filter((o) => o.status === 'pending').length;
        setRecentOrders(((orders || []).slice(0, 5) as unknown) as RecentOrder[]);
      }

      setStats({
        totalRevenue,
        activeDrops: (drops || []).filter((d) => d.status === 'live').length,
        totalProjects: (drops || []).length,
        totalPreorders,
        unitsSold,
        pendingOrders,
      });
      setRecentDrops((drops || []).slice(0, 5));
      setLoading(false);
    })();
  }, [designer]);

  if (loading) {
    return <div className="rounded-3xl border border-white/10 bg-card p-8 text-white/40">Loading your stats...</div>;
  }

  const statCards = [
    { label: 'Total Revenue', value: formatNaira(stats.totalRevenue), hint: `${stats.unitsSold} units sold`, icon: TrendingUp, color: 'text-lime' },
    { label: 'Total Preorders', value: String(stats.totalPreorders), hint: `${stats.pendingOrders} pending`, icon: ShoppingCart, color: 'text-white' },
    { label: 'Active Drops', value: String(stats.activeDrops), hint: `${stats.totalProjects} projects total`, icon: Package, color: 'text-white' },
    { label: 'Units Sold', value: String(stats.unitsSold), hint: 'paid preorders', icon: Boxes, color: 'text-white' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-white/10 bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div className="font-display text-2xl font-black text-white">{stat.value}</div>
            <div className="text-xs text-white/40 mt-1">{stat.label}</div>
            <div className="text-[11px] text-white/30 mt-2">{stat.hint}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-lime/20 bg-gradient-to-br from-lime/10 to-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-black text-white">Launch a new drop</h3>
            <p className="text-sm text-white/50 mt-1">Set price, quantity, countdown. Go live instantly.</p>
          </div>
          <Link
            href="/dashboard/new-drop"
            className="flex items-center justify-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
          >
            <PlusCircle className="h-4 w-4" />
            NEW DROP
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-2xl border border-white/10 bg-card p-4 transition-all hover:border-lime/40"
          >
            <link.icon className="h-5 w-5 text-lime" />
            <p className="mt-3 text-sm font-bold text-white">{link.label}</p>
            <p className="text-xs text-white/40 mt-1">{link.description}</p>
            <ArrowRight className="mt-3 h-4 w-4 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-lime" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-white/10 bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-black text-white">Recent Drops</h3>
            <Link href="/project-list" className="text-xs font-semibold text-lime">
              View all
            </Link>
          </div>
          {recentDrops.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-white/40 mb-4">No drops yet. Launch your first one.</p>
              <Link href="/dashboard/new-drop" className="inline-flex items-center gap-2 text-sm font-semibold text-lime">
                Create a drop <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDrops.map((drop) => (
                <Link
                  key={drop.id}
                  href={`/item-editor?id=${drop.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-background p-4 transition-all hover:border-lime/30"
                >
                  <div>
                    <p className="font-semibold text-white">{drop.title}</p>
                    <p className="text-xs text-white/40">
                      {drop.current_qty}/{drop.max_qty} preordered
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      drop.status === 'live' ? 'bg-lime text-black' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {drop.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-black text-white">Recent Orders</h3>
            <Link href="/dashboard/orders" className="text-xs font-semibold text-lime">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-white/40 py-6 text-center">No preorders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-background p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{order.buyer_name || order.buyer_email}</p>
                    <p className="text-xs text-white/40 truncate">
                      {order.drop?.title || '—'} · {timeAgo(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-lime">{formatNaira(order.amount)}</p>
                    <p className={`text-[11px] font-bold uppercase ${order.status === 'paid' ? 'text-lime' : 'text-white/40'}`}>
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
