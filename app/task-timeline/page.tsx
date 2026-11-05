'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { WorkspaceShell } from '@/components/workspace-shell';
import { fetchDesignerDrops } from '@/lib/workspace';
import { formatNaira } from '@/lib/utils';
import type { Drop } from '@/lib/types';
import { CalendarClock, Clock, Loader2, Rocket, PenSquare } from 'lucide-react';

const stages = ['live', 'funded', 'producing', 'shipped'] as const;

type Milestone = {
  id: string;
  drop: Drop;
  date: string;
  label: string;
};

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const { drop, date, label } = milestone;
  const days = daysUntil(date);
  const upcoming = days >= 0;
  const currentStage = stages.indexOf(drop.status as (typeof stages)[number]);

  return (
    <div className="rounded-3xl border border-white/10 bg-card p-5 transition-all hover:border-lime/30">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border ${
              upcoming ? 'border-lime/40 bg-lime/10 text-lime' : 'border-white/10 bg-white/5 text-white/40'
            }`}
          >
            <span className="font-display text-lg font-black leading-none">
              {new Date(date).getDate()}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {new Date(date).toLocaleDateString('en-NG', { month: 'short' })}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">{label}</p>
            <h3 className="truncate font-display text-lg font-black text-white">{drop.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/50">
              <span className={upcoming ? 'text-lime' : 'text-white/40'}>
                {upcoming ? `${days} day${days === 1 ? '' : 's'} left` : `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(date).toLocaleString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <span className="font-semibold text-white">{formatNaira(drop.price)}</span>
            </div>
          </div>
        </div>
        <Link
          href={`/item-editor?id=${drop.id}`}
          className="flex w-fit items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-lime hover:text-lime"
        >
          <PenSquare className="h-4 w-4" />
          Edit
        </Link>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        {stages.map((stage, index) => (
          <div key={stage} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                index <= currentStage ? 'bg-lime' : 'bg-white/10'
              }`}
            />
            <p
              className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider ${
                index <= currentStage ? 'text-lime' : 'text-white/30'
              }`}
            >
              {stage}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TaskTimelinePage() {
  const { designer } = useAuth();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!designer) return;
    let active = true;
    (async () => {
      const data = await fetchDesignerDrops(designer.id);
      if (!active) return;
      setDrops(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [designer]);

  const { upcoming, past, launched } = useMemo(() => {
    const deadlines: Milestone[] = drops
      .filter((drop) => Boolean(drop.countdown_end))
      .map((drop) => ({
        id: `deadline-${drop.id}`,
        drop,
        date: drop.countdown_end as string,
        label: 'Preorder deadline',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const launches: Milestone[] = drops
      .map((drop) => ({
        id: `launch-${drop.id}`,
        drop,
        date: drop.created_at,
        label: 'Drop launched',
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      upcoming: deadlines.filter((item) => new Date(item.date).getTime() >= Date.now()),
      past: deadlines.filter((item) => new Date(item.date).getTime() < Date.now()).reverse(),
      launched: launches,
    };
  }, [drops]);

  return (
    <WorkspaceShell>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">Task Timeline</h2>
        <p className="mt-1 text-sm text-white/50">
          Every drop deadline and launch, at a glance.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-lime animate-spin" />
        </div>
      ) : drops.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-12 text-center">
          <CalendarClock className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <h3 className="font-display text-xl font-black text-white">Nothing scheduled</h3>
          <p className="mt-2 mb-5 text-white/40">Create a drop with a deadline to see it here.</p>
          <Link
            href="/item-editor"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
          >
            Create a record
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-lime" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
                Upcoming deadlines
              </h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/60">
                {upcoming.length}
              </span>
            </div>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/40">
                No upcoming deadlines.
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-white/40" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Past deadlines
                </h3>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/60">
                  {past.length}
                </span>
              </div>
              <div className="space-y-3 opacity-70">
                {past.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-white/40" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
                Recent launches
              </h3>
            </div>
            <div className="space-y-3 opacity-70">
              {launched.slice(0, 8).map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}
            </div>
          </section>
        </div>
      )}
    </WorkspaceShell>
  );
}
