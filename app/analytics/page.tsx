'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { WorkspaceShell } from '@/components/workspace-shell';
import { fetchDesignerDrops, fetchDesignerInvoices, type Invoice } from '@/lib/workspace';
import { formatNaira } from '@/lib/utils';
import type { Drop } from '@/lib/types';
import { Loader2, TrendingUp, ShoppingCart, Wallet, BarChart3 } from 'lucide-react';
import {
  Area,
  AreaChart,
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

const LIME = '#c8ff00';
const PIE_COLORS = [LIME, '#38bdf8', 'rgba(255,255,255,0.35)'];

const tooltipStyle = {
  background: '#0b0b0b',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
};

const axisTick = { fill: 'rgba(255,255,255,0.4)', fontSize: 11 };
const nairaTick = (value: number) => {
  const naira = Number(value) / 100;
  if (naira >= 1000000) return `₦${(naira / 1000000).toFixed(1)}m`;
  if (naira >= 1000) return `₦${Math.round(naira / 1000)}k`;
  return `₦${Math.round(naira)}`;
};

function buildWeeklySeries(invoices: Invoice[]) {
  const weeks = 8;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - mondayOffset);

  const buckets = Array.from({ length: weeks }).map((_, index) => {
    const start = new Date(currentWeekStart);
    start.setDate(currentWeekStart.getDate() - (weeks - 1 - index) * 7);
    return {
      label: start.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
      start: start.getTime(),
      orders: 0,
      revenue: 0,
    };
  });

  invoices.forEach((order) => {
    const time = new Date(order.created_at).getTime();
    const bucket = buckets.find(
      (item) => time >= item.start && time < item.start + 7 * 24 * 60 * 60 * 1000,
    );
    if (!bucket) return;
    bucket.orders += 1;
    if (order.status === 'paid' || order.status === 'shipped') {
      bucket.revenue += Number(order.amount);
    }
  });

  return buckets;
}

function buildRevenueByDrop(invoices: Invoice[]) {
  const totals = new Map<string, number>();
  invoices.forEach((order) => {
    if (order.status !== 'paid' && order.status !== 'shipped') return;
    const key = order.drop?.title || 'Unknown drop';
    totals.set(key, (totals.get(key) || 0) + Number(order.amount));
  });
  return Array.from(totals.entries())
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

export default function AnalyticsPage() {
  const { designer } = useAuth();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!designer) return;
    let active = true;
    (async () => {
      const [dropData, invoiceData] = await Promise.all([
        fetchDesignerDrops(designer.id),
        fetchDesignerInvoices(designer.id),
      ]);
      if (!active) return;
      setDrops(dropData);
      setInvoices(invoiceData);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [designer]);

  const weekly = useMemo(() => buildWeeklySeries(invoices), [invoices]);
  const revenueByDrop = useMemo(() => buildRevenueByDrop(invoices), [invoices]);
  const statusSplit = useMemo(() => {
    const counts = [
      { name: 'Paid', value: 0 },
      { name: 'Shipped', value: 0 },
      { name: 'Pending', value: 0 },
    ];
    invoices.forEach((order) => {
      if (order.status === 'paid') counts[0].value += 1;
      else if (order.status === 'shipped') counts[1].value += 1;
      else counts[2].value += 1;
    });
    return counts.filter((entry) => entry.value > 0);
  }, [invoices]);

  const revenue = invoices
    .filter((order) => order.status === 'paid' || order.status === 'shipped')
    .reduce((sum, order) => sum + Number(order.amount), 0);
  const paidOrders = invoices.filter(
    (order) => order.status === 'paid' || order.status === 'shipped',
  ).length;
  const averageOrder = paidOrders > 0 ? Math.round(revenue / paidOrders) : 0;

  const statCards = [
    { label: 'Revenue', value: formatNaira(revenue), icon: TrendingUp, color: 'text-lime' },
    { label: 'Paid Orders', value: String(paidOrders), icon: ShoppingCart, color: 'text-white' },
    { label: 'Avg Order', value: formatNaira(averageOrder), icon: Wallet, color: 'text-white' },
    {
      label: 'Active Drops',
      value: String(drops.filter((drop) => drop.status === 'live').length),
      icon: BarChart3,
      color: 'text-white',
    },
  ];

  return (
    <WorkspaceShell>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">Analytics</h2>
        <p className="mt-1 text-sm text-white/50">Trends and insights across your drops and orders.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-lime animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/10 bg-card p-5">
                <stat.icon className={`mb-3 h-5 w-5 ${stat.color}`} />
                <div className="font-display text-2xl font-black text-white">{stat.value}</div>
                <div className="mt-1 text-xs text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>

          {invoices.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-card p-12 text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-white/20" />
              <h3 className="font-display text-xl font-black text-white">No data to chart yet</h3>
              <p className="mt-2 text-white/40">
                Analytics fill in as buyers start preordering your drops.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-white/10 bg-card p-5 sm:p-6">
                <h3 className="font-display text-lg font-black text-white">Preorders · last 8 weeks</h3>
                <p className="mb-4 text-xs text-white/40">Order volume per week</p>
                <div className="h-60 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weekly} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={LIME} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={LIME} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="orders"
                          name="Orders"
                          stroke={LIME}
                          strokeWidth={2}
                          fill="url(#ordersGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-card p-5 sm:p-6">
                  <h3 className="font-display text-lg font-black text-white">Revenue by drop</h3>
                  <p className="mb-4 text-xs text-white/40">Top drops by paid revenue</p>
                  <div className="h-60 w-full">
                    {mounted && revenueByDrop.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={revenueByDrop}
                          layout="vertical"
                          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={axisTick}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={nairaTick}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={92}
                            tick={axisTick}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                            formatter={(value) => [formatNaira(Number(value)), 'Revenue'] as [string, string]}
                          />
                          <Bar dataKey="revenue" name="Revenue" fill={LIME} radius={[0, 8, 8, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-white/40">
                        No paid revenue yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-card p-5 sm:p-6">
                  <h3 className="font-display text-lg font-black text-white">Order status</h3>
                  <p className="mb-4 text-xs text-white/40">Where your invoices stand</p>
                  <div className="h-60 w-full">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusSplit}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {statusSplit.map((entry, index) => (
                              <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyle}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </WorkspaceShell>
  );
}
