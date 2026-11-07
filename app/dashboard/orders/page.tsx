'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, timeAgo } from '@/lib/utils';
import { ShoppingCart, Loader2, CheckCircle, Clock } from 'lucide-react';

type OrderWithDrop = { id: string; drop_id: string; buyer_email: string; buyer_name: string | null; size: string | null; quantity: number; amount: number; paystack_ref: string | null; status: string; created_at: string; drop: { title: string; slug: string } | null };

export default function OrdersPage() {
  const { designer } = useAuth();
  const [orders, setOrders] = useState<OrderWithDrop[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!designer) return;
    (async () => {
      const { data: drops } = await supabase.from('drops').select('id').eq('designer_id', designer.id);
      const dropIds = (drops || []).map((d) => d.id);
      if (dropIds.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from('preorders').select(`*, drop:drops(title, slug)`).in('drop_id', dropIds).order('created_at', { ascending: false });
      setOrders((data || []) as unknown as OrderWithDrop[]);
      setLoading(false);
    })();
  }, [designer]);
  if (loading) return (<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-ink animate-spin" /></div>);
  if (orders.length === 0) return (<div className="rounded-3xl border border-ink/10 bg-white p-12 text-center"><ShoppingCart className="h-12 w-12 text-ink/20 mx-auto mb-4" /><h3 className="font-display text-xl font-black text-ink">No orders yet</h3><p className="text-ink/50 mt-2">Orders will appear here once buyers start preordering.</p></div>);
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-black tracking-tighter text-ink">Orders</h2>
      <div className="hidden sm:block rounded-3xl border border-ink/10 bg-white overflow-hidden"><table className="w-full"><thead><tr className="border-b border-ink/10 text-xs font-bold uppercase tracking-wider text-ink/50"><th className="px-5 py-3 text-left">Buyer</th><th className="px-5 py-3 text-left">Drop</th><th className="px-5 py-3 text-left">Size</th><th className="px-5 py-3 text-left">Qty</th><th className="px-5 py-3 text-left">Amount</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Date</th></tr></thead><tbody>{orders.map((order) => (<tr key={order.id} className="border-b border-ink/10 text-sm hover:bg-ink/5"><td className="px-5 py-3"><div className="font-semibold text-ink">{order.buyer_name || order.buyer_email}</div><div className="text-xs text-ink/50">{order.buyer_email}</div></td><td className="px-5 py-3 text-ink/80">{order.drop?.title || '—'}</td><td className="px-5 py-3 text-ink/80">{order.size || '—'}</td><td className="px-5 py-3 text-ink/80">{order.quantity}</td><td className="px-5 py-3 font-semibold text-ink">{formatNaira(order.amount)}</td><td className="px-5 py-3"><span className={`flex items-center gap-1.5 text-xs font-bold ${order.status === 'paid' ? 'text-ink' : order.status === 'shipped' ? 'text-blue-400' : 'text-ink/50'}`}>{order.status === 'paid' && <CheckCircle className="h-3 w-3" />}{order.status === 'pending' && <Clock className="h-3 w-3" />}{order.status.toUpperCase()}</span></td><td className="px-5 py-3 text-xs text-ink/50">{timeAgo(order.created_at)}</td></tr>))}</tbody></table></div>
      <div className="sm:hidden space-y-3">{orders.map((order) => (<div key={order.id} className="rounded-2xl border border-ink/10 bg-white p-4"><div className="flex items-center justify-between mb-2"><span className="font-semibold text-ink">{order.buyer_name || order.buyer_email}</span><span className={`text-xs font-bold ${order.status === 'paid' ? 'text-ink' : 'text-ink/50'}`}>{order.status.toUpperCase()}</span></div><div className="text-sm text-ink/70">{order.drop?.title || '—'}</div><div className="flex items-center justify-between mt-2 text-xs"><span className="text-ink/50">{order.size || 'N/A'} · Qty {order.quantity}</span><span className="font-semibold text-ink">{formatNaira(order.amount)}</span></div></div>))}</div>
    </div>
  );
}
