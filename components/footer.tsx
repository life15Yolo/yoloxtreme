import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime text-black"><Zap className="h-5 w-5" fill="black" /></span>
              <span className="font-display text-xl font-black tracking-tighter text-white">YOLO<span className="text-lime">XTREME</span></span>
            </div>
            <p className="text-sm text-white/50 max-w-xs">The preorder factory. Multiple designers, zero inventory risk. Preorder, produce, ship.</p>
          </div>
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white/70 mb-4">How It Works</h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-white/60"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-black">1</span>Designers launch their drops</li>
              <li className="flex items-start gap-3 text-sm text-white/60"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-black">2</span>Buyers preorder before the countdown ends</li>
              <li className="flex items-start gap-3 text-sm text-white/60"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-black">3</span>Factory produces and ships to buyers</li>
            </ol>
          </div>
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white/70 mb-4">Get Started</h3>
            <div className="flex flex-col gap-3">
              <Link href="/onboard" className="group flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-lime">Launch your drop<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              <Link href="/" className="group flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-lime">Browse all drops<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} YOLOXTREME. The Preorder Factory.</p>
          <p className="text-xs text-white/40">Built for designers. Powered by preorders.</p>
        </div>
      </div>
    </footer>
  );
}
