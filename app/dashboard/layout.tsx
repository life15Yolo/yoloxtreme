'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Navbar } from '@/components/navbar';
import { LayoutDashboard, PlusCircle, Package, ShoppingCart, LogOut, Loader2 } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/new-drop', label: 'New Drop', icon: PlusCircle },
  { href: '/dashboard/drops', label: 'My Drops', icon: Package },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, designer, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { if (!loading && !user) router.replace('/onboard'); }, [loading, user, router]);
  if (loading) return (<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-8 w-8 text-lime animate-spin" /></div>);
  if (!user) return null;
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="pt-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lime">{designer?.verified ? 'Verified Designer' : 'Designer'}</p>
            <h1 className="font-display text-3xl font-black tracking-tighter text-white">{designer?.brand_name || 'Dashboard'}</h1>
          </div>
          <button onClick={async () => { await signOut(); router.push('/'); }} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 transition-all hover:border-red-500/50 hover:text-red-400"><LogOut className="h-4 w-4" />Sign Out</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          <aside className="lg:sticky lg:top-24 h-fit">
            <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (<Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${isActive ? 'bg-lime text-black' : 'border border-white/10 text-white/60 hover:border-lime/30 hover:text-white'}`}><item.icon className="h-4 w-4 shrink-0" />{item.label}</Link>);
              })}
            </nav>
          </aside>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
