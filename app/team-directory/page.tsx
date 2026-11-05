'use client';

import { useEffect, useMemo, useState } from 'react';
import { WorkspaceShell } from '@/components/workspace-shell';
import { supabase } from '@/lib/supabase/client';
import type { Designer } from '@/lib/types';
import { BadgeCheck, Loader2, Mail, Phone, Search, Users } from 'lucide-react';

export default function TeamDirectoryPage() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('designers')
        .select('*')
        .order('brand_name', { ascending: true });
      if (!active) return;
      setDesigners((data || []) as Designer[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return designers;
    return designers.filter((designer) =>
      [designer.brand_name, designer.email, designer.phone || '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [designers, query]);

  return (
    <WorkspaceShell>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">Team Directory</h2>
        <p className="mt-1 text-sm text-white/50">
          {designers.length} brand{designers.length === 1 ? '' : 's'} building on the factory.
        </p>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by brand, email or phone..."
          className="w-full rounded-2xl border border-white/15 bg-card py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-lime animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <h3 className="font-display text-xl font-black text-white">No team members found</h3>
          <p className="mt-2 text-white/40">
            {query ? `Nothing matches “${query}”.` : 'Designers will appear here as they join.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((designer) => (
            <div key={designer.id} className="rounded-3xl border border-white/10 bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime text-lg font-black text-black">
                  {designer.brand_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-black text-white">
                    {designer.brand_name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${
                      designer.verified ? 'text-lime' : 'text-white/40'
                    }`}
                  >
                    {designer.verified && <BadgeCheck className="h-3.5 w-3.5" />}
                    {designer.verified ? 'Verified Designer' : 'Designer'}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                <a
                  href={`mailto:${designer.email}`}
                  className="flex items-center gap-2 text-white/60 transition-colors hover:text-lime"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{designer.email}</span>
                </a>
                {designer.phone ? (
                  <a
                    href={`tel:${designer.phone}`}
                    className="flex items-center gap-2 text-white/60 transition-colors hover:text-lime"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    {designer.phone}
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-white/30">
                    <Phone className="h-4 w-4 shrink-0" />
                    No phone on file
                  </p>
                )}
              </div>
              <p className="mt-3 text-xs text-white/30">
                Joined{' '}
                {new Date(designer.created_at).toLocaleDateString('en-NG', {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
