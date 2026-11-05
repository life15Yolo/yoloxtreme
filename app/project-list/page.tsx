'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { WorkspaceShell } from '@/components/workspace-shell';
import { fetchDesignerDrops } from '@/lib/workspace';
import { formatNaira } from '@/lib/utils';
import type { Drop } from '@/lib/types';
import { Search, PenSquare, ExternalLink, Package, Loader2, PlusCircle } from 'lucide-react';

const statusFilters = ['all', 'live', 'funded', 'producing', 'shipped'] as const;
type StatusFilter = (typeof statusFilters)[number];

export default function ProjectListPage() {
  const { designer } = useAuth();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

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

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return drops.filter((drop) => {
      const matchesStatus = status === 'all' || drop.status === status;
      if (!matchesStatus) return false;
      if (!term) return true;
      return [drop.title, drop.slug, drop.description || '', drop.status]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [drops, query, status]);

  return (
    <WorkspaceShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-2xl font-black tracking-tighter text-white">Project List</h2>
          <p className="text-sm text-white/50 mt-1">
            {drops.length} record{drops.length === 1 ? '' : 's'} in your workspace
          </p>
        </div>
        <Link
          href="/item-editor"
          className="flex w-fit items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
        >
          <PlusCircle className="h-4 w-4" />
          NEW RECORD
        </Link>
      </div>

      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, slug or description..."
            className="w-full rounded-2xl border border-white/15 bg-card py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatus(filter)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                status === filter
                  ? 'bg-lime text-black'
                  : 'border border-white/10 text-white/50 hover:border-lime/30 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-lime animate-spin" />
        </div>
      ) : drops.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <h3 className="font-display text-xl font-black text-white">No records yet</h3>
          <p className="mt-2 mb-5 text-white/40">Create your first drop to fill this list.</p>
          <Link
            href="/item-editor"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
          >
            <PlusCircle className="h-4 w-4" />
            Create a record
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-10 text-center text-white/40">
          No records match “{query}”.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((drop) => {
            const progress =
              drop.max_qty > 0 ? Math.round((drop.current_qty / drop.max_qty) * 100) : 0;
            return (
              <div
                key={drop.id}
                className="rounded-3xl border border-white/10 bg-card p-5 transition-all hover:border-lime/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="truncate font-display text-lg font-black text-white">
                        {drop.title}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          drop.status === 'live' ? 'bg-lime text-black' : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {drop.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
                      <span className="font-semibold text-white">{formatNaira(drop.price)}</span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {drop.current_qty}/{drop.max_qty} preordered
                      </span>
                      <span className="text-white/30">
                        {new Date(drop.created_at).toLocaleDateString('en-NG', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-lime transition-all"
                        style={{ width: `${Math.min(Math.max(progress, 2), 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/item-editor?id=${drop.id}`}
                      className="flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-sm font-bold text-black transition-all hover:scale-105"
                    >
                      <PenSquare className="h-4 w-4" />
                      Edit
                    </Link>
                    <Link
                      href={`/d/${drop.slug}`}
                      className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-lime hover:text-lime"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
}
