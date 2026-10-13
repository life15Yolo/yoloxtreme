import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, Clock, Package } from 'lucide-react';
import type { DropWithDesigner } from '@/lib/types';
import { formatNaira, timeLeft } from '@/lib/utils';

const PLACEHOLDER_IMAGES = [
  'https://images.pexels.com/photos/29600851/pexels-photo-29600851.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/14447677/pexels-photo-14447677.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/35342196/pexels-photo-35342196.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/14241847/pexels-photo-14241847.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/29652516/pexels-photo-29652516.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/18956666/pexels-photo-18956666.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

export function DropCard({ drop, index = 0 }: { drop: DropWithDesigner; index?: number }) {
  const progress = drop.max_qty > 0 ? Math.round((drop.current_qty / drop.max_qty) * 100) : 0;
  const countdown = drop.countdown_end ? timeLeft(drop.countdown_end) : null;
  const imageSrc = drop.images?.[0] || PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  const isLive = drop.status === 'live' && !countdown?.expired;

  return (
    <Link href={`/d/${drop.slug}`} className="group block animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card transition-all duration-300 group-hover:border-lime/40 group-hover:scale-[1.02]">
        <div className="relative aspect-[4/5] overflow-hidden">
          <Image src={imageSrc} alt={drop.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            {isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-xs font-bold text-black"><span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />LIVE</span>
            ) : (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-white backdrop-blur-md">{drop.status}</span>
            )}
          </div>
          {countdown && !countdown.expired && (
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
              <Clock className="h-3 w-3 text-lime" />
              {countdown.days > 0 ? `${countdown.days}d ${countdown.hours}h` : `${countdown.hours}h ${countdown.minutes}m`}
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-xs font-bold uppercase tracking-wider text-lime">{drop.designer?.brand_name || 'Unknown'}</p>
            <h3 className="font-display text-lg font-black tracking-tight text-white line-clamp-1">{drop.title}</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-xl font-black text-white">{formatNaira(drop.price)}</span>
            <span className="flex items-center gap-1 text-xs text-white/50"><Package className="h-3 w-3" />{drop.current_qty}/{drop.max_qty}</span>
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime transition-all duration-500" style={{ width: `${Math.max(progress, 2)}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">{progress}% funded</span>
              <span className="flex items-center gap-1 text-lime"><TrendingUp className="h-3 w-3" />{drop.max_qty - drop.current_qty} left</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export { PLACEHOLDER_IMAGES };
