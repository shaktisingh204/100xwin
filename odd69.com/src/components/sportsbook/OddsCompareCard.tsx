'use client';

// ─────────────────────────────────────────────────────────────
// OddsCompareCard – one event row with multi-bookmaker odds comparison
// ─────────────────────────────────────────────────────────────

import { Clock, TrendingUp } from 'lucide-react';
import type { OddsEvent, OddsFormat, BestOddsMap } from './types';

interface OddsCompareCardProps {
  event: OddsEvent;
  format: OddsFormat;
  visibleBookmakers: string[];
  onOddsClick?: (event: OddsEvent, outcomeName: string, price: number, bookmaker: string) => void;
}

// Convert decimal odds to fractional string (e.g. 2.5 → "3/2")
function toFractional(decimal: number): string {
  const fraction = decimal - 1;
  for (let d = 1; d <= 100; d++) {
    const n = Math.round(fraction * d);
    if (Math.abs(n / d - fraction) < 0.005) {
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const g = gcd(n, d);
      return `${n / g}/${d / g}`;
    }
  }
  return `${fraction.toFixed(2)}/1`;
}

function formatOdds(price: number, format: OddsFormat): string {
  if (format === 'fractional') return toFractional(price);
  return price.toFixed(2);
}

function formatMatchTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = diffMs / 3600000;

  if (diffH < 0) return 'Live';
  if (diffH < 1) return `${Math.round(diffH * 60)}m`;
  if (diffH < 24) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function isLive(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export default function OddsCompareCard({ event, format, visibleBookmakers, onOddsClick }: OddsCompareCardProps) {
  // Get all outcomes from first bookmaker available (they all have the same teams)
  const allOutcomes = event.bookmakers[0]?.markets[0]?.outcomes ?? [];

  // Build best-odds map across all bookmakers
  const bestOddsMap: BestOddsMap = {};
  for (const bm of event.bookmakers) {
    const market = bm.markets[0];
    if (!market) continue;
    for (const outcome of market.outcomes) {
      const current = bestOddsMap[outcome.name];
      if (!current || outcome.price > current.price) {
        bestOddsMap[outcome.name] = { bookmaker: bm.key, price: outcome.price };
      }
    }
  }

  const live = isLive(event.commence_time);

  const getOdds = (bmKey: string, outcomeName: string): number | null => {
    const bm = event.bookmakers.find((b) => b.key === bmKey);
    if (!bm) return null;
    const market = bm.markets[0];
    if (!market) return null;
    const outcome = market.outcomes.find((o) => o.name === outcomeName);
    return outcome?.price ?? null;
  };

  const isBest = (bmKey: string, outcomeName: string, price: number): boolean => {
    return bestOddsMap[outcomeName]?.bookmaker === bmKey && price === bestOddsMap[outcomeName]?.price;
  };

  return (
    <article className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all hover:border-amber-500/20 hover:shadow-[0_8px_28px_rgba(0,0,0,0.4)]">
      {/* Event header */}
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-black text-amber-400">LIVE</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
              <Clock size={10} className="shrink-0" />
              {formatMatchTime(event.commence_time)}
            </span>
          )}
          <span className="text-[11px] text-white/50 truncate">{event.sport_title}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-white/25 shrink-0">
          <TrendingUp size={10} />
          {event.bookmakers.length} bookmakers
        </span>
      </div>

      {/* Teams row */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-white truncate">{event.home_team}</p>
          </div>
          <div className="shrink-0 text-[11px] font-black text-white/50 bg-white/[0.05] px-2 py-1 rounded-lg">
            vs
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[13px] font-black text-white truncate">{event.away_team}</p>
          </div>
        </div>
      </div>

      {/* Odds grid */}
      {visibleBookmakers.length > 0 && allOutcomes.length > 0 && (
        <div className="border-t border-white/[0.04] px-3 pb-3 pt-2">
          {/* Header row: bookmaker names */}
          <div
            className="grid gap-1.5 mb-1.5"
            style={{ gridTemplateColumns: `140px repeat(${visibleBookmakers.length}, 1fr)` }}
          >
            <div />
            {visibleBookmakers.map((bmKey) => {
              const bm = event.bookmakers.find((b) => b.key === bmKey);
              return (
                <div key={bmKey} className="text-center">
                  <span className="text-[9px] font-black text-white/25 uppercase tracking-wider">
                    {bm?.title ?? bmKey}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Outcome rows */}
          {allOutcomes.map((outcome, rowIdx) => (
            <div
              key={outcome.name}
              className={`grid gap-1.5 mb-1 rounded-lg px-1 py-0.5 ${
                rowIdx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.03]'
              }`}
              style={{ gridTemplateColumns: `140px repeat(${visibleBookmakers.length}, 1fr)` }}
            >
              {/* Outcome name */}
              <div className="flex items-center">
                <span className="text-[11px] font-black text-white/70 truncate pr-2">
                  {outcome.name}
                </span>
              </div>

              {/* Odds chips per bookmaker */}
              {visibleBookmakers.map((bmKey) => {
                const price = getOdds(bmKey, outcome.name);
                if (price === null) {
                  return (
                    <div key={bmKey} className="flex items-center justify-center rounded-lg bg-white/[0.03] py-1.5">
                      <span className="text-[10px] text-white/25">—</span>
                    </div>
                  );
                }

                const best = isBest(bmKey, outcome.name, price);
                return (
                  <button
                    key={bmKey}
                    type="button"
                    onClick={() => onOddsClick?.(event, outcome.name, price, bmKey)}
                    className={`relative flex items-center justify-center rounded-lg border py-1.5 px-1 transition-all active:scale-95 ${
                      best
                        ? 'border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:bg-emerald-400/20'
                        : 'border-white/[0.06] bg-white/[0.04] hover:border-amber-500/30 hover:bg-white/[0.06]'
                    }`}
                  >
                    {best && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-1.5 py-px text-[7px] font-black text-[#062312] leading-none">
                        BEST
                      </span>
                    )}
                    <span className={`text-[12px] ${best ? 'text-emerald-400 font-black' : 'text-white font-black'}`}>
                      {formatOdds(price, format)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
