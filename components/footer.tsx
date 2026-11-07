import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ivory">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <p className="font-display text-2xl font-black tracking-tighter text-ink">YOLOXTREME</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink/70">Preorder campaigns for independent designers. A drop can be ordered only after it is approved and live.</p>
        </div>
        <div className="flex flex-col gap-3 text-sm font-semibold text-ink">
          <Link href="/#feed" className="underline decoration-lime decoration-2 underline-offset-4">Drops</Link>
          <Link href="/onboard" className="underline decoration-lime decoration-2 underline-offset-4">Launch drop</Link>
          <Link href="/onboard#sign-in" className="underline decoration-lime decoration-2 underline-offset-4">Log in</Link>
        </div>
      </div>
      <div className="border-t border-ink/10 px-4 py-4 text-xs text-ink/50 sm:px-6 lg:px-8">© {new Date().getFullYear()} YOLOXTREME</div>
    </footer>
  );
}
