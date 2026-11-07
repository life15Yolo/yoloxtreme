'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Calendar, Menu, X } from 'lucide-react';

const links = [
  { href: '/#feed', label: 'Drops' },
  { href: '/onboard', label: 'Launch drop' },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-ivory">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-xl font-black tracking-tighter text-ink sm:text-2xl">YOLOXTREME</Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/onboard" className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-3 py-2 text-xs font-bold text-ink sm:px-4 sm:text-sm">
            <Calendar className="h-4 w-4" />
            Launch drop
          </Link>
          {!signedIn && <Link href="/onboard#sign-in" className="hidden rounded-full px-3 py-2 text-sm font-bold text-ink sm:inline">Log in</Link>}
          {signedIn && <Link href="/dashboard" className="hidden rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink sm:inline">Dashboard</Link>}
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink" aria-expanded={menuOpen} aria-controls="site-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div id="site-menu" className="fixed inset-x-0 bottom-0 top-16 z-[60] overflow-y-auto bg-ivory">
          <div className="mx-auto flex min-h-full max-w-7xl flex-col justify-between px-6 py-10">
            <div className="space-y-6">
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block font-display text-5xl font-black tracking-tighter text-ink sm:text-7xl">{link.label}</Link>
              ))}
              <Link href={signedIn ? '/dashboard' : '/onboard#sign-in'} onClick={() => setMenuOpen(false)} className="block font-display text-5xl font-black tracking-tighter text-ink sm:text-7xl">{signedIn ? 'Dashboard' : 'Log in'}</Link>
            </div>
            <p className="pt-16 text-sm text-ink/60">You only live once. Launch the drop. Live the potential.</p>
          </div>
        </div>
      )}
    </header>
  );
}
