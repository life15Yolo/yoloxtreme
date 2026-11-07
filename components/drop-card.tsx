import Link from 'next/link';
import Image from 'next/image';
import type { DropWithDesigner } from '@/lib/types';
import { formatNaira } from '@/lib/utils';

export function DropCard({ drop }: { drop: DropWithDesigner; index?: number }) {
  const progress = drop.max_qty > 0 ? Math.min(100, Math.round((drop.current_qty / drop.max_qty) * 100)) : 0;
  const imageSrc = drop.images?.[0];
  const isLive = drop.status === 'live';

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white">
      <Link href={`/d/${drop.slug}`} className="block">
        <div className="relative aspect-[4/5] bg-ivory">
          {imageSrc ? (
            <Image src={imageSrc} alt={drop.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px" />
          ) : (
            <div className="flex h-full items-end p-5 font-display text-3xl font-black tracking-tighter text-ink/25">{drop.title}</div>
          )}
          {isLive && <span className="absolute left-3 top-3 rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink">LIVE</span>}
        </div>
      </Link>
      <div className="space-y-3 p-4">
        {drop.designer?.id ? (
          <Link href={`/designer/${drop.designer.id}`} className="text-xs font-bold uppercase tracking-wider text-ink underline decoration-lime decoration-2 underline-offset-4">{drop.designer.brand_name}</Link>
        ) : (
          <p className="text-xs font-bold uppercase tracking-wider text-ink">Designer</p>
        )}
        <Link href={`/d/${drop.slug}`} className="block font-display text-2xl font-black tracking-tighter text-ink">{drop.title}</Link>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-ink">{formatNaira(drop.price)}</span>
          <span className="text-ink/60">{drop.current_qty}/{drop.max_qty} preordered</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-lime" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </article>
  );
}

export const PLACEHOLDER_IMAGES: string[] = [];
