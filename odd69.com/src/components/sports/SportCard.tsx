'use client';

// ─────────────────────────────────────────────────────────────
// SportCard — upcoming/featured sport match card with market odds
// ─────────────────────────────────────────────────────────────

import OddsChip from './OddsChip';
import type { TopSport } from './types';

interface SportCardProps {
  sport: TopSport;
  onCardClick?: (matchId: string) => void;
  onOddsClick?: (matchId: string, label: string, value: string) => void;
}

export default function SportCard({
  sport,
  onCardClick,
  onOddsClick,
}: SportCardProps) {
  return (
    <article
      onClick={() => onCardClick?.(sport.matchId)}
      className="min-w-[200px] shrink-0 snap-start rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.4)] sm:min-w-[240px] md:min-w-[260px] md:p-3.5 cursor-pointer hover:border-amber-500/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:scale-[0.98] transition-all duration-150"
    >

      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-[#1a1208] text-[14px] shadow-[0_4px_10px_rgba(245,158,11,0.25)] flex-shrink-0">
          {sport.icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-[12px] font-black leading-tight text-white line-clamp-2">
            {sport.competition}
          </h3>
          <p className="mt-0.5 text-[10px] text-white/50">{sport.sport}</p>
        </div>
      </div>

      {/* Market */}
      <div className="mt-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 md:p-3">
        <div className="flex items-center justify-between text-[10px] text-white/50">
          <span>Popular market</span>
          <span>Winner</span>
        </div>

        <div
          className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <OddsChip
            label={sport.marketA.label}
            value={sport.marketA.value}
            onClick={() => onOddsClick?.(sport.matchId, sport.marketA.label, sport.marketA.value)}
          />
          <OddsChip
            label={sport.marketB.label}
            value={sport.marketB.value}
            onClick={() => onOddsClick?.(sport.matchId, sport.marketB.label, sport.marketB.value)}
          />
          <button
            type="button"
            onClick={() => onCardClick?.(sport.matchId)}
            className="flex items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[14px] font-black text-amber-300 transition-all hover:border-amber-500/40 hover:bg-amber-500/20 active:scale-95"
          >
            {sport.extra}
          </button>
        </div>
      </div>
    </article>
  );
}
