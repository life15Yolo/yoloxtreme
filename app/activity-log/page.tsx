'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { WorkspaceShell } from '@/components/workspace-shell';
import { fetchDesignerActivity, type ActivityEvent } from '@/lib/workspace';
import { timeAgo } from '@/lib/utils';
import { History, Loader2, MessageCircle, Package, ShoppingCart } from 'lucide-react';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'drop', label: 'Drops' },
  { key: 'order', label: 'Orders' },
  { key: 'post', label: 'Rooms' },
] as const;

const eventStyle: Record<ActivityEvent['kind'], { icon: typeof Package; className: string }> = {
  drop: { icon: Package, className: 'bg-lime/15 text-lime' },
  order: { icon: ShoppingCart, className: 'bg-blue-500/15 text-blue-400' },
  post: { icon: MessageCircle, className: 'bg-purple-500/15 text-purple-400' },
};

export default function ActivityLogPage() {
  const { designer } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('all');

  useEffect(() => {
    if (!designer) return;
    let active = true;
    (async () => {
      const data = await fetchDesignerActivity(designer.id);
      if (!active) return;
      setEvents(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [designer]);

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((event) => event.kind === filter)),
    [events, filter],
  );

  return (
    <WorkspaceShell>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">Activity Log</h2>
        <p className="mt-1 text-sm text-white/50">
          A chronological history of drops, orders and room conversations.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              filter === item.key
                ? 'bg-lime text-black'
                : 'border border-white/10 text-white/50 hover:border-lime/30 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-lime animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-12 text-center">
          <History className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <h3 className="font-display text-xl font-black text-white">No activity yet</h3>
          <p className="mt-2 text-white/40">
            Updates to your drops, orders and rooms will show up here.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-card p-2 sm:p-3">
          <ol className="relative">
            {filtered.map((event, index) => {
              const style = eventStyle[event.kind];
              const Icon = style.icon;
              return (
                <li key={event.id} className="relative flex gap-4 px-3 py-3 sm:px-4">
                  {index < filtered.length - 1 && (
                    <span className="absolute left-[35px] top-14 bottom-0 w-px bg-white/10 sm:left-[39px]" />
                  )}
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{event.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-white/40">{event.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-white/60">{timeAgo(event.created_at)}</p>
                    <p className="mt-0.5 text-[11px] text-white/30">
                      {new Date(event.created_at).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </WorkspaceShell>
  );
}
