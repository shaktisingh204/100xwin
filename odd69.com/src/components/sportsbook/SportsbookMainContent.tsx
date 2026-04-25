'use client';

// ─────────────────────────────────────────────────────────────
// SportsbookMainContent — The Odds API Sportsbook home page
// Route: /sportsbook
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Globe, Search, ChevronRight, Zap, TrendingUp, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SportInfo, SportGroup } from './types';

// ─── Sport group → emoji ────────────────────────────────────
const GROUP_ICONS: Record<string, string> = {
  'Soccer': '⚽',
  'Cricket': '🏏',
  'Basketball': '🏀',
  'Tennis': '🎾',
  'American Football': '🏈',
  'Baseball': '⚾',
  'Ice Hockey': '🏒',
  'Rugby League': '🏉',
  'Rugby Union': '🏉',
  'Mixed Martial Arts': '🥊',
  'Boxing': '🥊',
  'Golf': '⛳',
  'Aussie Rules': '🏟️',
  'Motor Sport': '🏎️',
  'Esports': '🎮',
};

const getGroupIcon = (group: string): string => GROUP_ICONS[group] ?? '🏟️';

// ─── Sport group → gradient ──────────────────────────────────
const GROUP_GRADIENT: Record<string, string> = {
  'Soccer': 'from-emerald-600/70 via-emerald-800/50 to-[#06080c]',
  'Cricket': 'from-blue-600/70 via-blue-800/50 to-[#06080c]',
  'Basketball': 'from-orange-600/70 via-orange-800/50 to-[#06080c]',
  'Tennis': 'from-lime-600/70 via-lime-800/50 to-[#06080c]',
  'American Football': 'from-red-600/70 via-red-800/50 to-[#06080c]',
  'Baseball': 'from-sky-600/70 via-sky-800/50 to-[#06080c]',
  'Ice Hockey': 'from-cyan-600/70 via-cyan-800/50 to-[#06080c]',
  'Mixed Martial Arts': 'from-rose-600/70 via-rose-800/50 to-[#06080c]',
  'Boxing': 'from-rose-600/70 via-rose-800/50 to-[#06080c]',
  'Golf': 'from-green-600/70 via-green-800/50 to-[#06080c]',
  'Rugby League': 'from-amber-600/70 via-amber-800/50 to-[#06080c]',
};

const getGroupGradient = (group: string): string =>
  GROUP_GRADIENT[group] ?? 'from-amber-600/60 via-orange-800/50 to-[#06080c]';

// ─── Skeleton cards ──────────────────────────────────────────
function SportCardSkeleton() {
  return (
    <div className="h-20 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] animate-pulse" />
  );
}

// ─── Featured sport quick-link card ─────────────────────────
function FeaturedSportCard({ sport, onClick }: { sport: SportInfo; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-w-[140px] shrink-0 snap-start overflow-hidden rounded-xl border border-white/[0.07] shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-200 hover:border-amber-500/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:scale-[0.97]"
      style={{ height: 90 }}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${getGroupGradient(sport.group)}`}
      />
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-1 px-2">
        <span className="text-2xl leading-none drop-shadow-md">
          {getGroupIcon(sport.group)}
        </span>
        <span className="text-[11px] font-black text-white drop-shadow-sm text-center leading-tight line-clamp-2">
          {sport.title}
        </span>
      </div>
    </button>
  );
}

// ─── Sport group card ────────────────────────────────────────
function SportGroupCard({ group, onClick }: { group: SportGroup; onClick: (sport: SportInfo) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
      {/* Group header */}
      <div className={`flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r ${getGroupGradient(group.group)}`}>
        <span className="text-xl">{getGroupIcon(group.group)}</span>
        <span className="font-black text-[14px] text-white">{group.group}</span>
        <span className="ml-auto text-[10px] text-white/60">
          {group.sports.length} competition{group.sports.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Sports in this group */}
      <div className="divide-y divide-white/[0.04]">
        {group.sports.map((sport) => (
          <button
            key={sport.key}
            type="button"
            onClick={() => onClick(sport)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.05] active:bg-white/[0.08] group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-[13px] group-hover:bg-amber-500/20 transition-colors">
              {getGroupIcon(sport.group)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-white truncate group-hover:text-amber-400 transition-colors">
                {sport.title}
              </p>
              {sport.description && (
                <p className="text-[10px] text-white/50 truncate">{sport.description}</p>
              )}
            </div>
            <ChevronRight size={13} className="shrink-0 text-white/25 group-hover:text-amber-400 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────
export default function SportsbookMainContent() {
  const router = useRouter();
  const [sports, setSports] = useState<SportInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    fetch('/api/odds-sports')
      .then(async (res) => {
        setIsDemoMode(res.headers.get('X-Demo-Mode') === 'true');
        return res.json();
      })
      .then((data: SportInfo[]) => setSports(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredSports = useMemo(() => {
    if (!search.trim()) return sports;
    const q = search.toLowerCase();
    return sports.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [sports, search]);

  // Group sports by category
  const sportGroups = useMemo((): SportGroup[] => {
    const map = new Map<string, SportInfo[]>();
    for (const sport of filteredSports) {
      if (!map.has(sport.group)) map.set(sport.group, []);
      map.get(sport.group)!.push(sport);
    }
    return Array.from(map.entries()).map(([group, sp]) => ({ group, sports: sp }));
  }, [filteredSports]);

  // Featured sports (first 10 for the horizontal rail)
  const featuredSports = useMemo(() => {
    const priority = ['soccer_epl', 'cricket_ipl', 'basketball_nba', 'americanfootball_nfl', 'cricket_test_match', 'soccer_uefa_champs_league', 'tennis_atp_french_open', 'icehockey_nhl', 'mma_mixed_martial_arts', 'baseball_mlb'];
    const prioritized = priority.map((k) => sports.find((s) => s.key === k)).filter(Boolean) as SportInfo[];
    const rest = sports.filter((s) => !priority.includes(s.key));
    return [...prioritized, ...rest].slice(0, 12);
  }, [sports]);

  const goToSport = (sport: SportInfo) => {
    router.push(`/sportsbook/${sport.key}?title=${encodeURIComponent(sport.title)}`);
  };

  return (
    <main className="min-h-full bg-[#06080c] text-white">
      <div className="mx-auto flex w-full max-w-[1820px] flex-col gap-5 px-3 py-3 pb-[calc(var(--mobile-nav-height,0px)+20px)] md:px-5 md:py-4 md:pb-8 xl:px-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Globe size={18} />
            </div>
            <div>
              <h1 className="font-black text-[20px] leading-tight text-white">Sportsbook</h1>
              <p className="text-[10px] text-white/50">International odds from 40+ bookmakers</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen((c) => !c)}
            aria-label="Search sports"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-white/50 transition hover:bg-white/[0.08] hover:text-white active:scale-90"
          >
            <Search size={18} />
          </button>
        </div>

        {/* ── Search bar ── */}
        {searchOpen && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search sports, leagues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-9 pr-4 text-[13px] text-white placeholder:text-white/50 outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        )}

        {/* ── Demo mode notice ── */}
        {isDemoMode && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <Zap size={15} className="text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-amber-400">Demo Mode — Sample Sports Listed</p>
              <p className="text-[11px] text-white/50 mt-0.5">
                Add <code className="bg-white/[0.05] px-1 rounded text-amber-400">THE_ODDS_API_KEY</code> to <code className="bg-white/[0.05] px-1 rounded text-amber-400">.env.local</code> for live data from 40+ bookmakers.
              </p>
            </div>
          </div>
        )}

        {/* ── Hero banner ── */}
        <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0d0a1a_0%,#06080c_50%,#1a1208_100%)] border border-white/[0.06] px-5 py-6 shadow-[0_20px_48px_rgba(0,0,0,0.5)]">
          {/* Decoration orbs */}
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid gap-4 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.05] px-2.5 py-1">
                <Activity size={10} className="text-emerald-400" />
                <span className="text-[10px] font-black text-white/70">Live Odds Aggregator</span>
              </div>
              <h2 className="font-black text-[24px] leading-tight text-white md:text-[32px]">
                Compare odds from<br />
                <span className="text-amber-400">40+ bookmakers</span>
              </h2>
              <p className="mt-2 text-[13px] text-white/70 max-w-sm">
                Always get the best price. We show you real-time odds from Betfair, Bet365, William Hill, DraftKings, and more.
              </p>
            </div>

            <div className="hidden lg:flex flex-col items-end justify-center gap-3">
              {[
                { label: 'Betfair', odds: '2.60', best: true },
                { label: 'Bet365', odds: '2.55', best: false },
                { label: 'William Hill', odds: '2.62', best: true },
              ].map(({ label, odds, best }) => (
                <div key={label} className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${best ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/[0.06] bg-white/[0.04]'}`}>
                  <span className="text-[11px] font-black text-white/70 w-24 text-right">{label}</span>
                  <span className={`text-[14px] font-black ${best ? 'text-emerald-400' : 'text-white/70'}`}>{odds}</span>
                  {best && <span className="text-[8px] font-black bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] px-1.5 py-0.5 rounded">BEST</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured sports rail ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05]">
              <TrendingUp size={14} className="text-amber-400" />
            </div>
            <h2 className="font-black text-[16px] text-white">Popular Sports</h2>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-x-auto py-1 no-scrollbar snap-x snap-mandatory">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="min-w-[140px] shrink-0 snap-start h-[90px] rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 py-1 no-scrollbar snap-x snap-mandatory">
              {featuredSports.map((sport) => (
                <FeaturedSportCard
                  key={sport.key}
                  sport={sport}
                  onClick={() => goToSport(sport)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── All sports by group ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05]">
              <Globe size={14} className="text-amber-400" />
            </div>
            <h2 className="font-black text-[16px] text-white">All Sports</h2>
            {!loading && (
              <span className="ml-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-black text-white/50">
                {sports.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SportCardSkeleton key={i} />
              ))}
            </div>
          ) : sportGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Search size={28} className="text-white/25" />
              <p className="text-white/50 text-sm">No sports matching &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sportGroups.map((group) => (
                <SportGroupCard
                  key={group.group}
                  group={group}
                  onClick={goToSport}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
