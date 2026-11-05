import { supabase } from '@/lib/supabase/client';
import type { Drop, Preorder } from '@/lib/types';

export type Invoice = Preorder & {
  drop: { title: string; slug: string } | null;
};

export type ActivityEvent = {
  id: string;
  kind: 'drop' | 'order' | 'post';
  title: string;
  detail: string;
  created_at: string;
};

export async function fetchDesignerDrops(designerId: string): Promise<Drop[]> {
  const { data } = await supabase
    .from('drops')
    .select('*')
    .eq('designer_id', designerId)
    .order('created_at', { ascending: false });
  return (data || []) as Drop[];
}

export async function fetchDesignerInvoices(designerId: string): Promise<Invoice[]> {
  const { data: drops } = await supabase
    .from('drops')
    .select('id')
    .eq('designer_id', designerId);
  const dropIds = (drops || []).map((drop) => drop.id as string);
  if (dropIds.length === 0) return [];

  const { data } = await supabase
    .from('preorders')
    .select('*, drop:drops(title, slug)')
    .in('drop_id', dropIds)
    .order('created_at', { ascending: false });
  return (data || []) as unknown as Invoice[];
}

export async function fetchDesignerActivity(designerId: string): Promise<ActivityEvent[]> {
  const drops = await fetchDesignerDrops(designerId);
  const invoices = await fetchDesignerInvoices(designerId);
  const events: ActivityEvent[] = [];

  drops.forEach((drop) => {
    events.push({
      id: `drop-${drop.id}`,
      kind: 'drop',
      title: `Drop published: ${drop.title}`,
      detail: `Status ${drop.status} · ${drop.current_qty}/${drop.max_qty} preordered`,
      created_at: drop.created_at,
    });
  });

  invoices.forEach((order) => {
    events.push({
      id: `order-${order.id}`,
      kind: 'order',
      title: `Preorder ${order.status}: ${order.buyer_name || order.buyer_email}`,
      detail: order.drop?.title ? `${order.drop.title} · qty ${order.quantity}` : `Qty ${order.quantity}`,
      created_at: order.created_at,
    });
  });

  const dropIds = drops.map((drop) => drop.id);
  if (dropIds.length > 0) {
    const { data: posts } = await supabase
      .from('room_posts')
      .select('id, content, type, created_at, drop:drops(title)')
      .in('drop_id', dropIds)
      .order('created_at', { ascending: false })
      .limit(25);
    (posts || []).forEach((post) => {
      const postDrop = post.drop as unknown as { title: string } | null;
      events.push({
        id: `post-${post.id}`,
        kind: 'post',
        title: `New ${post.type} in ${postDrop?.title || 'a drop room'}`,
        detail: post.content,
        created_at: post.created_at,
      });
    });
  }

  return events
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 60);
}
