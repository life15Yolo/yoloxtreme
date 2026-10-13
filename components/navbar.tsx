'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Zap, LayoutDashboard, Menu, X } from 'lucide-react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => { window.removeEventListener('scroll', onScroll); listener.subscription.unsubscribe(); };
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent border-b border-transparent'}`}>
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime text-black transition-transform group-hover:scale-110"><Zap className="h-5 w-5" fill="black" /></span>
            <span className="font-display text-xl font-black tracking-tighter text-white">YOLO<span className="text-lime">XTREME</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <Link href="/onboard" className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white transition-all hover:border-lime hover:text-lime">LAUNCH DROP</Link>
            {signedIn ? (
              <Link href="/dashboard" className="flex items-center gap-2 rounded-full bg-lime px-5 py-2 text-sm font-bold text-black transition-all hover:scale-105 glow-lime"><LayoutDashboard className="h-4 w-4" />DASHBOARD</Link>
            ) : (
              <Link href="/onboard" className="flex items-center gap-2 rounded-full bg-lime px-5 py-2 text-sm font-bold text-black transition-all hover:scale-105 glow-lime">JOIN</Link>
            )}
          </div>
          <button className="md:hidden text-white p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">{menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
        </div>
        {menuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-2 animate-fade-in">
            <Link href="/onboard" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white text-center" onClick={() => setMenuOpen(false)}>LAUNCH DROP</Link>
            <Link href={signedIn ? '/dashboard' : '/onboard'} className="rounded-xl bg-lime px-5 py-3 text-sm font-bold text-black text-center" onClick={() => setMenuOpen(false)}>{signedIn ? 'DASHBOARD' : 'JOIN'}</Link>
          </div>
        )}
      </nav>
    </header>
  );
}
