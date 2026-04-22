'use client';

// ─────────────────────────────────────────────────────────────
// SportsbookOddsContent — per-sport odds listing page
// Route: /sportsbook/[sport]
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, RefreshCw, SlidersHorizontal, Globe } from 'lucide-react';
import Link from 'next/link';
import OddsCompareCard from './OddsCompareCard';
import type { OddsEvent, OddsFormat, OddsMarketKey, OddsRegion } from './types';

interface SportsbookOddsContentProps {
  sportKey: string;
  sportTitle: string;
}

const MARKETS: { key: OddsMarketKey; label: string }[] = [
  { key: 'h2h', label: 'Match Winner' },
  { key: 'spreads', label: 'Handicap' },
  { key: 'totals', label: 'Over/Under' },
];

const REGIONS: { key: OddsRegion; label: string; flag: string }[] = [
  { key: 'eu', label: 'Europe', flag: '🇪🇺' },
  { key: 'uk', label: 'UK', flag: '🇬🇧' },
  { key: 'us', label: 'United States', flag: '🇺🇸' },
  { key: 'au', label: 'Australia', flag: '🇦🇺' },
];

// Popular bookmaker display order
const BOOKMAKER_PRIORITY = [
  'betfair', 'bet365', 'williamhill', 'unibet', 'betway', 'bwin',
  'draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbetus',
  'bovada', 'betonlineag', 'pinnacle', 'matchbook',
];

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03]">
      <div className="animate-pulse h-10 w-full rounded-none border-b border-white/[0.05] bg-white/[0.04]" />
      <div className="px-4 py-3">
        <div className="animate-pulse h-4 w-2/3 rounded-lg mb-2 bg-white/[0.05]" />
        <div className="animate-pulse h-4 w-1/2 rounded-lg bg-white/[0.05]" />
      </div>
      <div className="px-4 pb-4 flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-10 flex-1 rounded-lg bg-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}

export default function SportsbookOddsContent({ sportKey, sportTitle }: SportsbookOddsContentProps) {
  const [events, setEvents] = useState<OddsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [market, setMarket] = useState<OddsMarketKey>('h2h');
  const [region, setRegion] = useState<OddsRegion>('eu');
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('decimal');
  const [showFilters, setShowFilters] = useState(false);

  const fetchOdds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/odds-events?sport=${encodeURIComponent(sportKey)}&region=${region}&market=${market}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: OddsEvent[] = await res.json();
      setEvents(data);
      setIsDemoMode(res.headers.get('X-Demo-Mode') === 'true');
      setLastUpdate(new Date());
    } catch (e) {
      setError('Unable to load odds. Please try again.');
      console.error('[SportsbookOddsContent]', e);
    } finally {
      setLoading(false);
    }
  }, [sportKey, region, market]);

  useEffect(() => {
    fetchOdds();
  }, [fetchOdds]);

  // Collect all bookmakers appearing across events, sorted by priority
  const allBookmakers = useMemo(() => {
    const bmSet = new Set<string>();
    for (const event of events) {
      for (const bm of event.bookmakers) bmSet.add(bm.key);
    }
    const sorted = [...bmSet].sort((a, b) => {
      const ai = BOOKMAKER_PRIORITY.indexOf(a);
      const bi = BOOKMAKER_PRIORITY.indexOf(b);
      const av = ai === -1 ? 999 : ai;
      const bv = bi === -1 ? 999 : bi;
      return av - bv;
    });
    // Show max 5 bookmakers by default to avoid overflow
    return sorted.slice(0, 5);
  }, [events]);

  const handleOddsClick = (event: OddsEvent, outcomeName: string, price: number, bookmaker: string) => {
    console.log('[Bet intent]', { event, outcomeName, price, bookmaker });
    // TODO: integrate with your existing betslip / RightSidebar
  };

  return (
    <main className="min-h-full bg-[#06080c] text-white">
      <div className="mx-auto flex w-full max-w-[1820px] flex-col gap-4 px-3 py-3 pb-[calc(var(--mobile-nav-height,0px)+20px)] md:px-5 md:py-4 md:pb-8 xl:px-6">

        {/* ── Breadcrumb + back ── */}
        <div className="flex items-center gap-2">
          <Link
            href="/sportsbook"
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-3 py-1.5 text-[12px] font-black text-white/70 transition hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            <ChevronLeft size={14} />
            Sportsbook
          </Link>
          <span className="text-white/25 text-[12px]">/</span>
          <span className="text-[12px] font-black text-white">{sportTitle}</span>

          {isDemoMode && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-400">
              Demo Data — Add API Key for Live Odds
            </span>
          )}
        </div>

        {/* ── Page header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-black text-[22px] leading-tight text-white md:text-[28px]">
              {sportTitle}
            </h1>
            {lastUpdate && (
              <p className="text-[11px] text-white/50">
                Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Odds format toggle */}
            <div className="flex items-center rounded-xl bg-white/[0.05] p-1 gap-1">
              {(['decimal', 'fractional'] as OddsFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setOddsFormat(f)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-all ${
                    oddsFormat === f
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] shadow-[0_2px_8px_rgba(245,158,11,0.3)]'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {f === 'decimal' ? 'Dec' : 'Frac'}
                </button>
              ))}
            </div>

            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((c) => !c)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black transition-all ${
                showFilters
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208]'
                  : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <SlidersHorizontal size={13} />
              Filters
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchOdds}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-white/70 transition hover:bg-white/[0.08] hover:text-white active:scale-90 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Filters panel ── */}
        {showFilters && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-4">
            {/* Market selector */}
            <div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-2">Market</p>
              <div className="flex flex-wrap gap-2">
                {MARKETS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMarket(m.key)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-black transition-all active:scale-95 ${
                      market === m.key
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] shadow-[0_4px_14px_rgba(245,158,11,0.3)]'
                        : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Region selector */}
            <div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Globe size={10} />
                Region / Bookmakers
              </p>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRegion(r.key)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-black transition-all active:scale-95 ${
                      region === r.key
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] shadow-[0_4px_14px_rgba(245,158,11,0.3)]'
                        : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {r.flag} {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Events list ── */}
        {error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <RefreshCw size={28} />
            </div>
            <p className="text-white/70 text-center max-w-xs">{error}</p>
            <button
              type="button"
              onClick={fetchOdds}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-[13px] font-black text-[#1a1208] transition hover:brightness-110 active:scale-95"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] text-white/50">
              <Globe size={28} />
            </div>
            <div className="text-center">
              <p className="font-black text-white text-lg">No Events Found</p>
              <p className="text-white/50 text-sm mt-1">
                No upcoming events available for {sportTitle}. Try a different region.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-white/50">
              {events.length} upcoming event{events.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {events.map((event) => (
                <OddsCompareCard
                  key={event.id}
                  event={event}
                  format={oddsFormat}
                  visibleBookmakers={allBookmakers}
                  onOddsClick={handleOddsClick}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
