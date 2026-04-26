'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, RefreshCw, Search, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import LiveEventCard from '@/components/sports/LiveEventCard';
import type { LiveEvent } from '@/components/sports/types';
import { getEventLiveState, isEventLive } from '@/lib/sportsLobbyData';
import { useSportsSocket } from '@/context/SportsSocketContext';
import { applySocketPayloadToEvent, getSocketPayloadEventIds } from '@/lib/sportsRealtimeOdds';
import { sportsApi } from '@/services/sports';
import { resolveTeamAvatar } from '@/components/sports/teamIconHelpers';

// ─── Sportradar types ─────────────────────────────────────────────────────────
interface SrRunner {
  runnerId: string;
  runnerName: string;
  status: string;
  backPrices: { price: number; size: number }[];
  layPrices:  { price: number; size: number }[];
}
interface SrMarket {
  marketId: string;
  marketName: string;
  status: string;
  runners: SrRunner[];
  category?: string;
}
interface SrEvent {
  eventId: string;
  eventName: string;
  sportId: string;
  sportName: string;
  competitionId: string;
  competitionName: string;
  openDate: number;
  status: string;
  catId?: string;
  homeScore: number;
  awayScore: number;
  winnerBlocked: boolean;
  country?: string;
  markets: {
    matchOdds: SrMarket[];
    premiumMarkets: SrMarket[];
    bookmakers: any[];
    fancyMarkets: any[];
  };
}

// ─── Sport meta ───────────────────────────────────────────────────────────────
const SPORT_META: Record<string, { emoji: string; label: string }> = {
  'sr:sport:1':   { emoji: '⚽', label: 'Soccer' },
  'sr:sport:21':  { emoji: '🏏', label: 'Cricket' },
  'sr:sport:2':   { emoji: '🏀', label: 'Basketball' },
  'sr:sport:5':   { emoji: '🎾', label: 'Tennis' },
  'sr:sport:16':  { emoji: '🏈', label: 'American Football' },
  'sr:sport:3':   { emoji: '⚾', label: 'Baseball' },
  'sr:sport:4':   { emoji: '🏒', label: 'Ice Hockey' },
  'sr:sport:117': { emoji: '🥊', label: 'MMA' },
  'sr:sport:12':  { emoji: '🏉', label: 'Rugby' },
  'sr:sport:20':  { emoji: '🏓', label: 'Table Tennis' },
  'sr:sport:31':  { emoji: '🏸', label: 'Badminton' },
  'sr:sport:23':  { emoji: '🏐', label: 'Volleyball' },
  'sr:sport:19':  { emoji: '🎱', label: 'Snooker' },
  'sr:sport:22':  { emoji: '🎯', label: 'Darts' },
  'sr:sport:29':  { emoji: '⚽', label: 'Futsal' },
  'sr:sport:138': { emoji: '🤸', label: 'Kabaddi' },
};
const DEFAULT_META = { emoji: '🏟️', label: 'Sports' };
const getMeta = (id: string) => SPORT_META[id] ?? DEFAULT_META;

// ─── Backend ──────────────────────────────────────────────────────────────────
const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'https://odd69.com/api').replace(/\/$/, '');

async function fetchUpcomingForSport(sportId: string): Promise<SrEvent[]> {
  const all: SrEvent[] = [];
  let pageNo = 1;
  let totalPages = 1;
  try {
    while (pageNo <= totalPages) {
      const res = await fetch(
        `${BACKEND}/sports/sportradar/upcoming?sportId=${encodeURIComponent(sportId)}&pageNo=${pageNo}`,
        { cache: 'no-store' },
      );
      const body = await res.json();
      const data: SrEvent[] = Array.isArray(body.data) ? body.data : [];
      all.push(...data);
      totalPages = body.pages ?? 1;
      pageNo++;
    }
  } catch { /* ignore */ }
  return all;
}

async function fetchInplay(): Promise<SrEvent[]> {
  try {
    const res = await fetch(`${BACKEND}/sports/sportradar/inplay`, { cache: 'no-store' });
    const body = await res.json();
    return Array.isArray(body.data) ? body.data : [];
  } catch { return []; }
}

// ─── Converter ────────────────────────────────────────────────────────────────
function srToLive(ev: SrEvent, teamIcons: Record<string, string> = {}): LiveEvent {
  const liveState = getEventLiveState(ev);
  const isInPlay = liveState === 'IN_PLAY';
  const isLive = liveState === 'LIVE' || isInPlay;
  const market  = ev.markets?.matchOdds?.[0] ?? ev.markets?.premiumMarkets?.[0];
  const runners = market?.runners ?? [];

  const vsSplit  = ev.eventName.split(/ vs\.? /i);
  const homeName = vsSplit[0]?.trim() || runners[0]?.runnerName || 'Home';
  const awayName = vsSplit[1]?.trim() || runners[runners.length - 1]?.runnerName || 'Away';

  const hasScore  = isLive && (ev.homeScore > 0 || ev.awayScore > 0);
  const homeScore = hasScore ? String(ev.homeScore) : '';
  const awayScore = hasScore ? String(ev.awayScore) : '';

  const dt      = new Date(ev.openDate);
  const today   = new Date();
  const isToday = dt.toDateString() === today.toDateString();
  const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = isToday ? 'Today' : dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const status  = ev.status === 'CLOSED' ? 'Finished' : isInPlay ? 'IN PLAY' : isLive ? 'LIVE' : `${dateStr} ${timeStr}`;

  const odds: { label: string; value: string }[] = [];
  runners.forEach((r, i) => {
    const price = r.backPrices?.[0]?.price;
    if (!price) return;
    let label = r.runnerName;
    if (r.runnerName.toLowerCase() === 'draw') label = 'X';
    else if (runners.length === 3 && i === 0) label = '1';
    else if (runners.length === 3 && i === 2) label = '2';
    else if (runners.length === 2 && i === 0) label = '1';
    else if (runners.length === 2 && i === 1) label = '2';
    odds.push({ label, value: price.toFixed(2) });
  });

  const totalMarkets =
    (ev.markets?.matchOdds?.length ?? 0) +
    (ev.markets?.premiumMarkets?.length ?? 0) +
    (ev.markets?.bookmakers?.length ?? 0) +
    (ev.markets?.fancyMarkets?.length ?? 0);

  const homeAvatar = resolveTeamAvatar(homeName, teamIcons, ev.country);
  const awayAvatar = resolveTeamAvatar(awayName, teamIcons, ev.country);

  return {
    matchId:     ev.eventId,
    competition: ev.competitionName,
    sport:       getMeta(ev.sportId).label,
    isInPlay,
    isLive,
    status,
    hasTv:       false,
    teams: [
      { name: homeName, detail: homeScore, pill: homeScore, ...homeAvatar },
      { name: awayName, detail: awayScore, pill: awayScore, ...awayAvatar },
    ],
    odds,
    extra: totalMarkets > 1 ? `+${totalMarkets - 1}` : '',
  };
}

// ─── Card skeleton ────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3.5">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/[0.05] animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-40 rounded bg-white/[0.05] animate-pulse" />
          <div className="h-2.5 w-24 rounded bg-white/[0.05] animate-pulse" />
        </div>
      </div>
      <div className="px-4 py-3.5 space-y-3">
        <div className="space-y-2.5">
          <div className="h-4 w-36 rounded bg-white/[0.05] animate-pulse" />
          <div className="h-4 w-28 rounded bg-white/[0.05] animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 rounded-[18px] bg-white/[0.05] animate-pulse" />
          <div className="h-10 rounded-[18px] bg-white/[0.05] animate-pulse" />
          <div className="h-10 rounded-[18px] bg-white/[0.05] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function CompetitionPageContent() {
  const params          = useParams<{ competitionId: string }>();
  const searchParams    = useSearchParams();
  const router          = useRouter();
  const competitionId   = decodeURIComponent(params.competitionId ?? '');
  const competitionName = searchParams.get('name') ?? '';
  const sportId         = searchParams.get('sportId') ?? '';
  const meta            = getMeta(sportId);

  const [events,     setEvents]     = useState<SrEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<'all' | 'live' | 'upcoming'>('all');
  const [teamIcons,  setTeamIcons]  = useState<Record<string, string>>({});

  useEffect(() => {
    sportsApi.getTeamIcons().then(setTeamIcons).catch(() => {});
  }, []);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [upcoming, inplay] = await Promise.all([
        sportId ? fetchUpcomingForSport(sportId) : Promise.resolve([]),
        fetchInplay(),
      ]);
      // Filter to only events in this competition
      const inplayFiltered = inplay.filter(e => e.competitionId === competitionId);
      const upcomingFiltered = upcoming.filter(e => e.competitionId === competitionId);
      // Dedupe: inplay takes priority
      const inplayIds = new Set(inplayFiltered.map(e => e.eventId));
      const merged = [...inplayFiltered, ...upcomingFiltered.filter(e => !inplayIds.has(e.eventId))];
      setEvents(merged);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [competitionId, sportId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // ── Socket.IO for live updates ──
  const { socket, connectionStatus, joinSportsLobby, leaveSportsLobby } = useSportsSocket();

  useEffect(() => {
    joinSportsLobby();
    return () => leaveSportsLobby();
  }, [joinSportsLobby, leaveSportsLobby]);

  useEffect(() => {
    const handler = (data: any) => {
      if (!data) return;
      const targetEventIds = new Set(getSocketPayloadEventIds(data));
      if (targetEventIds.size === 0) return;
      setEvents(prev => {
        let didChange = false;
        const next = prev.map(event => {
          if (!targetEventIds.has(event.eventId)) return event;
          const patched = applySocketPayloadToEvent(event, data, event.eventId);
          if (patched !== event) didChange = true;
          return patched;
        });
        return didChange ? next : prev;
      });
    };
    socket?.on('sports-lobby-data', handler);
    return () => { socket?.off('sports-lobby-data', handler); };
  }, [socket]);

  // Poll inplay every 10s when socket not connected
  useEffect(() => {
    if (connectionStatus === 'connected') return;
    const t = setInterval(async () => {
      const inplay = await fetchInplay();
      const filtered = inplay.filter(e => e.competitionId === competitionId);
      if (filtered.length > 0) {
        setEvents(prev => {
          const inplayIds = new Set(filtered.map(e => e.eventId));
          const rest = prev.filter(e => !inplayIds.has(e.eventId) && !isEventLive(e));
          return [...filtered, ...rest];
        });
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [competitionId, connectionStatus]);

  // Filter + search
  const displayed = useMemo(() => {
    let list = events;
    if (filter === 'live')     list = list.filter(e => isEventLive(e));
    if (filter === 'upcoming') list = list.filter(e => !isEventLive(e) && e.status === 'UPCOMING');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.eventName.toLowerCase().includes(q));
    }
    return list;
  }, [events, filter, search]);

  const cards = useMemo(
    () => displayed.map(e => srToLive(e, teamIcons)),
    [displayed, teamIcons],
  );

  const liveCount = events.filter(e => isEventLive(e)).length;
  const displayName = competitionName || events[0]?.competitionName || 'League';

  return (
    <div className="min-h-screen bg-[#06080c] text-white">
      <div className="mx-auto max-w-[1820px] px-3 py-3 md:px-5 md:py-5 pb-[calc(var(--mobile-nav-height,80px)+20px)] md:pb-10">

        {/* Back + title */}
        <div className="mb-5 flex items-start gap-3">
          <button type="button" onClick={() => router.back()}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-white/70 border border-white/[0.06] transition hover:bg-white/[0.08] hover:text-white active:scale-90">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl leading-none">{meta.emoji}</span>
              <h1 className="font-black text-[22px] leading-tight text-white md:text-[28px]">
                {displayName}
              </h1>
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/20 px-2.5 py-1 text-[11px] font-black text-red-300 animate-pulse">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" /></span>
                  {liveCount} Live
                </span>
              )}
              {!loading && (
                <span className="rounded-full bg-white/[0.05] border border-white/[0.06] px-2.5 py-1 text-[11px] text-white/70">
                  {events.length} events
                </span>
              )}
            </div>
            {sportId && (
              <p className="mt-1 text-[12px] text-white/50">
                {meta.emoji} {meta.label}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-[320px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams…"
              className="w-full bg-white/[0.05] text-[13px] text-white pl-8 pr-3 py-2 rounded-xl border border-white/[0.06] focus:border-amber-500/40 outline-none placeholder:text-white/25 transition" />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-white/[0.05] border border-white/[0.06] p-1">
            {(['all', 'live', 'upcoming'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-black capitalize transition active:scale-95
                  ${filter === f
                    ? 'bg-gradient-to-b from-amber-500 to-orange-600 text-[#1a1208] shadow-[0_2px_8px_rgba(245,158,11,0.25)]'
                    : 'text-white/70 hover:text-white'}`}>
                {f === 'all' ? 'All' : f === 'live' ? 'Live' : 'Upcoming'}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!loading && (
              <span className="rounded-full bg-white/[0.05] border border-white/[0.06] px-3 py-1.5 text-[11px] text-white/70">
                {displayed.length} event{displayed.length !== 1 ? 's' : ''}
              </span>
            )}
            <button type="button" onClick={() => load(true)} disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.06] text-white/70 transition hover:bg-white/[0.08] hover:text-white active:scale-90 disabled:opacity-40">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <Clock size={36} className="text-white/25" />
            <p className="font-black text-[16px] text-white">{displayName}</p>
            <p className="text-[13px] text-white/50">
              {search ? `No matches found for "${search}"` : 'No events scheduled for this league'}
            </p>
            {search && (
              <button type="button" onClick={() => setSearch('')}
                className="rounded-full bg-white/[0.05] border border-white/[0.06] px-4 py-1.5 text-[12px] text-amber-400 transition hover:bg-white/[0.08]">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((event) => (
              <div key={event.matchId} className="min-w-0">
                <LiveEventCard
                  event={event}
                  variant="grid"
                  onCardClick={(id) => router.push(`/sports/match/${id}`)}
                  onOddsClick={(id) => router.push(`/sports/match/${id}`)}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default function CompetitionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#06080c]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/[0.06] border-t-amber-500" />
        </div>
      }
    >
      <CompetitionPageContent />
    </Suspense>
  );
}
