'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, ShoppingCart, Boxes, Percent, Loader2, BarChart3 } from 'lucide-react';

type DropRow = { id: string; title: string; max_qty: number; current_qty: number; status: string };
type OrderRow = { drop_id: string; amount: number; quantity: number; status: string; created_at: string };

const COLORS = ['hsl(73 100% 50%)', '#2dd4bf', '#f59e0b', '#a78bfa'];
const tooltipStyle = {
  background: 'hsl(0 0% 7%)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 16,
  color: '#fff',
  fontSize: 12,
};
const axisProps = { stroke: 'rgba(255,255,255,0.35)', fontSize: 11 };

export default function AnalyticsPage() {
  const { designer } = useAuth();
  const [drops, setDrops] = useState<DropRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!designer) return;
    (async () => {
      const { data: dropsData } = await supabase
        .from('drops')
        .select('id, title, max_qty, current_qty, status')
        .eq('designer_id', designer.id);

      const dropRows = (dropsData || []) as DropRow[];
      setDrops(dropRows);

      const dropIds = dropRows.map((d) => d.id);
      if (dropIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('preorders')
          .select('drop_id, amount, quantity, status, created_at')
          .in('drop_id', dropIds);
        setOrders((ordersData || []) as OrderRow[]);
      }
      setLoading(false);
    })();
  }, [designer]);

  const analytics = useMemo(() => {
    const paid = orders.filter((o) => o.status === 'paid');
    const revenue = paid.reduce((sum, o) => sum + Number(o.amount), 0);
    const units = paid.reduce((sum, o) => sum + Number(o.quantity || 0), 0);
    const capacity = drops.reduce((sum, d) => sum + Number(d.max_qty || 0), 0);
    const avgOrder = paid.length > 0 ? revenue / paid.length : 0;

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('en-NG', { month: 'short' }),
        revenue: 0,
        preorders: 0,
      };
    });
    const byMonth = new Map(months.map((m) => [m.key, m]));
    for (const order of orders) {
      const date = new Date(order.created_at);
      const bucket = byMonth.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (!bucket) continue;
      bucket.preorders += 1;
      if (order.status === 'paid') bucket.revenue += Number(order.amount) / 100;
    }

    const perDrop = drops
      .map((drop) => {
        const dropOrders = orders.filter((o) => o.drop_id === drop.id);
        return {
          name: drop.title.length > 16 ? `${drop.title.slice(0, 15)}…` : drop.title,
          preorders: dropOrders.length,
          revenue: dropOrders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + Number(o.amount) / 100, 0),
        };
      })
      .sort((a, b) => b.preorders - a.preorders)
      .slice(0, 6);

    const statusSplit = ['paid', 'pending', 'shipped'].map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: orders.filter((o) => o.status === status).length,
    }));

    return {
      revenue,
      units,
      avgOrder,
      sellThrough: capacity > 0 ? Math.round((units / capacity) * 100) : 0,
      trend: months,
      perDrop,
      statusSplit: statusSplit.filter((s) => s.value > 0),
    };
  }, [drops, orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-lime animate-spin" />
      </div>
    );
  }

  const kpis = [
    { label: 'Revenue', value: formatNaira(analytics.revenue), icon: TrendingUp },
    { label: 'Preorders', value: String(orders.length), icon: ShoppingCart },
    { label: 'Avg. Order Value', value: formatNaira(analytics.avgOrder), icon: Boxes },
    { label: 'Sell-through', value: `${analytics.sellThrough}%`, icon: Percent },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">Analytics</h2>
        <p className="text-sm text-white/40 mt-1">Trends and insights across your drops and preorders.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-3xl border border-white/10 bg-card p-5">
            <kpi.icon className="h-5 w-5 text-lime mb-3" />
            <div className="font-display text-2xl font-black text-white">{kpi.value}</div>
            <div className="text-xs text-white/40 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {drops.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="font-display text-xl font-black text-white">Nothing to analyse yet</h3>
          <p className="text-white/40 mt-2 mb-4">Create a project and start taking preorders to see trends here.</p>
          <Link
            href="/item-editor"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
          >
            Create a Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-white/10 bg-card p-5">
            <h3 className="font-display text-lg font-black text-white mb-1">Revenue Trend</h3>
            <p className="text-xs text-white/40 mb-4">Paid preorders over the last 6 months (₦)</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} {...axisProps} />
                  <YAxis tickLine={false} axisLine={false} {...axisProps} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    formatter={(value) => [formatNaira(Number(value) * 100), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="hsl(73 100% 50%)" radius={[8, 8, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-card p-5">
            <h3 className="font-display text-lg font-black text-white mb-1">Preorders per Project</h3>
            <p className="text-xs text-white/40 mb-4">Top projects by number of preorders</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.perDrop} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} {...axisProps} />
                  <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="preorders" fill="#2dd4bf" radius={[0, 8, 8, 0]} name="Preorders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-card p-5">
            <h3 className="font-display text-lg font-black text-white mb-1">Order Status</h3>
            <p className="text-xs text-white/40 mb-4">Share of preorders by status</p>
            {analytics.statusSplit.length === 0 ? (
              <p className="text-sm text-white/40 py-16 text-center">No preorders yet.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusSplit}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {analytics.statusSplit.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-card p-5">
            <h3 className="font-display text-lg font-black text-white mb-1">Monthly Preorders</h3>
            <p className="text-xs text-white/40 mb-4">Volume of orders over the last 6 months</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} {...axisProps} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="preorders" fill="#a78bfa" radius={[8, 8, 0, 0]} name="Preorders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
