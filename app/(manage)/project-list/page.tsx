'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/utils';
import type { Drop } from '@/lib/types';
import { Search, PencilLine, Eye, PlusCircle, Loader2, Package, X } from 'lucide-react';

const statuses = ['all', 'live', 'funded', 'producing', 'shipped'];

export default function ProjectListPage() {
  const { designer } = useAuth();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    if (!designer) return;
    (async () => {
      const { data } = await supabase
        .from('drops')
        .select('*')
        .eq('designer_id', designer.id)
        .order('created_at', { ascending: false });
      setDrops((data || []) as Drop[]);
      setLoading(false);
    })();
  }, [designer]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drops.filter((drop) => {
      const matchesStatus = status === 'all' || drop.status === status;
      const matchesQuery =
        q.length === 0 ||
        drop.title.toLowerCase().includes(q) ||
        drop.slug.toLowerCase().includes(q) ||
        (drop.description || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [drops, query, status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-lime animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black tracking-tighter text-white">Project List</h2>
          <p className="text-sm text-white/40 mt-1">
            {filtered.length} of {drops.length} {drops.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Link
          href="/item-editor"
          className="flex items-center justify-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
        >
          <PlusCircle className="h-4 w-4" />
          NEW PROJECT
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, slug, or description..."
            className="w-full rounded-2xl border border-white/15 bg-card pl-11 pr-10 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {statuses.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                status === value
                  ? 'bg-lime text-black'
                  : 'border border-white/10 text-white/50 hover:border-lime/30 hover:text-white'
              }`}
            >
              {value === 'all' ? 'All' : value}
            </button>
          ))}
        </div>
      </div>

      {drops.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-12 text-center">
          <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="font-display text-xl font-black text-white">No projects yet</h3>
          <p className="text-white/40 mt-2 mb-4">Create your first project to see it here.</p>
          <Link
            href="/item-editor"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"
          >
            <PlusCircle className="h-4 w-4" />
            Create a Project
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-10 text-center">
          <p className="text-white/50">No projects match your search.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatus('all');
            }}
            className="mt-3 text-sm font-semibold text-lime"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_110px_140px] gap-4 px-5 py-3 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-white/40">
            <span>Project</span>
            <span>Price</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-white/5">
            {filtered.map((drop) => {
              const progress = drop.max_qty > 0 ? Math.min(100, Math.round((drop.current_qty / drop.max_qty) * 100)) : 0;
              return (
                <div
                  key={drop.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_120px_110px_140px] gap-3 md:gap-4 px-5 py-4 items-center hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{drop.title}</p>
                    <p className="text-xs text-white/40 truncate">/d/{drop.slug}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 max-w-[220px] overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-lime" style={{ width: `${Math.max(progress, 2)}%` }} />
                      </div>
                      <span className="text-[11px] text-white/40 whitespace-nowrap">
                        {drop.current_qty}/{drop.max_qty}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-white">{formatNaira(drop.price)}</div>
                  <div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        drop.status === 'live' ? 'bg-lime text-black' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {drop.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <Link
                      href={`/item-editor?id=${drop.id}`}
                      className="flex items-center gap-1.5 rounded-full bg-lime px-3 py-2 text-xs font-bold text-black transition-all hover:scale-105"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <Link
                      href={`/d/${drop.slug}`}
                      className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white transition-all hover:border-lime hover:text-lime"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
