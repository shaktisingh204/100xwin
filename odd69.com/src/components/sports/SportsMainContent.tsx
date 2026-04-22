'use client';

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type RefObject,
} from 'react';
import {
  ChevronLeft, ChevronRight,
  Pin, PinOff, Search, TrendingUp, Star,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import LeagueBadge  from './LeagueBadge';
import LeagueCard   from './LeagueCard';
import LiveEventCard from './LiveEventCard';
import type { FeaturedLeague, LiveEvent } from './types';
import { useSportsSocket } from '@/context/SportsSocketContext';
import {
  getAdminPinnedMatchIds,
  toggleAdminPinnedMatch,
} from '@/lib/actions/pinnedMatches';
import { getLeagueImageMap } from '@/lib/actions/leagueImages';
import {
  fetchAllPagesForSport,
  fetchEventsCount,
  fetchInplayEvents,
  getEventLiveState,
  isEventLive,
  fetchActiveSports,
  type ActiveSportConfig,
  type SportsLobbyInitialData,
} from '@/lib/sportsLobbyData';
import {
  applySocketPayloadToEvent,
  getSocketPayloadEventIds,
} from '@/lib/sportsRealtimeOdds';
import DynamicHeroSlider from '@/components/shared/DynamicHeroSlider';
import { sportsApi } from '@/services/sports';
import { resolveTeamAvatar } from './teamIconHelpers';


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
  marketType: string;
  status: string;
  runners: SrRunner[];
  category?: string;
  limits: { minBetValue: number; maxBetValue: number; currency: string };
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
  catId: string;
  catName: string;
  homeScore: number;
  awayScore: number;
  country: string;
  venue: string;
  winnerBlocked: boolean;
  isFavourite: boolean;
  premiumEnabled: boolean;
  thumbnail: string;
  team1Image: string;
  team2Image: string;
  markets: {
    matchOdds: SrMarket[];
    bookmakers: any[];
    fancyMarkets: any[];
    premiumMarkets: any[];
    premiumTopic: string;
    premiumBaseUrl: string;
    matchOddsBaseUrl: string;
  };
}

// ─── Sport meta ───────────────────────────────────────────────────────────────
const SPORT_META: Record<string, { emoji: string; label: string; color: string; badgeClass: string; ringClass: string }> = {
  'sr:sport:1':   { emoji: '⚽', label: 'Soccer',       color: '#10b981', badgeClass: 'from-emerald-700 to-emerald-500 text-white',  ringClass: 'from-emerald-600 via-emerald-700 to-emerald-900' },
  'sr:sport:21':  { emoji: '🏏', label: 'Cricket',      color: '#6366f1', badgeClass: 'from-indigo-700 to-indigo-500 text-white',    ringClass: 'from-indigo-600 via-indigo-700 to-indigo-900' },
  'sr:sport:2':   { emoji: '🏀', label: 'Basketball',   color: '#f97316', badgeClass: 'from-orange-700 to-orange-500 text-white',    ringClass: 'from-orange-600 via-orange-800 to-orange-900' },
  'sr:sport:5':   { emoji: '🎾', label: 'Tennis',       color: '#84cc16', badgeClass: 'from-lime-700 to-lime-500 text-white',        ringClass: 'from-lime-600 via-lime-700 to-lime-900' },
  'sr:sport:16':  { emoji: '🏈', label: 'Am. Football', color: '#ef4444', badgeClass: 'from-red-700 to-red-500 text-white',          ringClass: 'from-red-600 via-red-800 to-red-900' },
  'sr:sport:3':   { emoji: '⚾', label: 'Baseball',     color: '#0ea5e9', badgeClass: 'from-sky-700 to-sky-500 text-white',          ringClass: 'from-sky-600 via-sky-800 to-sky-900' },
  'sr:sport:4':   { emoji: '🏒', label: 'Ice Hockey',   color: '#06b6d4', badgeClass: 'from-cyan-700 to-cyan-500 text-white',        ringClass: 'from-cyan-600 via-cyan-800 to-cyan-900' },
  'sr:sport:117': { emoji: '🥊', label: 'MMA',          color: '#f43f5e', badgeClass: 'from-rose-700 to-rose-500 text-white',        ringClass: 'from-rose-600 via-rose-800 to-rose-900' },
  'sr:sport:12':  { emoji: '🏉', label: 'Rugby',        color: '#f59e0b', badgeClass: 'from-amber-700 to-amber-500 text-white',      ringClass: 'from-amber-600 via-amber-800 to-amber-900' },
  'sr:sport:20':  { emoji: '🏓', label: 'Table Tennis', color: '#22c55e', badgeClass: 'from-green-700 to-green-500 text-white',      ringClass: 'from-green-600 via-green-800 to-green-900' },
  'sr:sport:31':  { emoji: '🏸', label: 'Badminton',    color: '#a855f7', badgeClass: 'from-purple-700 to-purple-500 text-white',    ringClass: 'from-purple-600 via-purple-800 to-purple-900' },
  'sr:sport:23':  { emoji: '🏐', label: 'Volleyball',   color: '#3b82f6', badgeClass: 'from-blue-700 to-blue-500 text-white',        ringClass: 'from-blue-600 via-blue-800 to-blue-900' },
  'sr:sport:19':  { emoji: '🎱', label: 'Snooker',      color: '#065f46', badgeClass: 'from-emerald-900 to-emerald-700 text-white',  ringClass: 'from-emerald-900 via-emerald-800 to-green-900' },
  'sr:sport:22':  { emoji: '🎯', label: 'Darts',        color: '#dc2626', badgeClass: 'from-red-800 to-red-600 text-white',          ringClass: 'from-red-800 via-red-700 to-red-900' },
  'sr:sport:29':  { emoji: '⚽', label: 'Futsal',       color: '#059669', badgeClass: 'from-emerald-800 to-emerald-600 text-white',  ringClass: 'from-emerald-800 via-emerald-700 to-emerald-900' },
  'sr:sport:138': { emoji: '🤸', label: 'Kabaddi',      color: '#b45309', badgeClass: 'from-amber-800 to-amber-600 text-white',      ringClass: 'from-amber-800 via-amber-700 to-amber-900' },
};
const DEFAULT_META = { emoji: '🏟️', label: 'Sports', color: '#f59e0b',
  badgeClass: 'from-amber-700 to-amber-500 text-[#1a1208]',
  ringClass:  'from-amber-700 via-amber-800 to-amber-900' };
const getMeta = (id: string) => SPORT_META[id] ?? DEFAULT_META;

// ─── Live update intervals ────────────────────────────────────────────────────
const INPLAY_POLL_MS   = 5_000;
const UPCOMING_POLL_MS = 30_000;

// ─── Events-count API ─────────────────────────────────────────────────────────
export interface SportCount {
  sportId: string;
  sportName: string;
  upcoming: number;
  inplay: number;
  total: number;
}

// ─── Event → LiveEvent converter ──────────────────────────────────────────────
function srEventToLiveEvent(
  ev: SrEvent,
  teamIcons: Record<string, string> = {},
): LiveEvent {
  const liveState = getEventLiveState(ev);
  const isInPlay = liveState === 'IN_PLAY';
  const isLive   = liveState === 'LIVE' || isInPlay;
  const isClosed = ev.status === 'CLOSED';

  const matchOdds = ev.markets?.matchOdds?.[0] ?? ev.markets?.premiumMarkets?.[0];
  const runners   = matchOdds?.runners ?? [];

  const vsSplit  = ev.eventName.split(/ vs\.? /i);
  const homeName = vsSplit[0]?.trim() || runners[0]?.runnerName || 'Home';
  const awayName = vsSplit[1]?.trim() || runners[runners.length - 1]?.runnerName || 'Away';

  const hasScore  = isLive && (ev.homeScore > 0 || ev.awayScore > 0);
  const homeScore = hasScore ? String(ev.homeScore) : '';
  const awayScore = hasScore ? String(ev.awayScore) : '';

  const dt = new Date(ev.openDate);
  const today = new Date();
  const isToday  = dt.toDateString() === today.toDateString();
  const timeStr  = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr  = isToday ? 'Today' : dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const statusStr = isClosed ? 'Finished' : isInPlay ? 'IN PLAY' : isLive ? 'LIVE' : `${dateStr} ${timeStr}`;

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
    (ev.markets?.bookmakers?.length ?? 0) +
    (ev.markets?.fancyMarkets?.length ?? 0) +
    (ev.markets?.premiumMarkets?.length ?? 0);

  const homeAvatar = resolveTeamAvatar(homeName, teamIcons, ev.country);
  const awayAvatar = resolveTeamAvatar(awayName, teamIcons, ev.country);

  return {
    matchId:     ev.eventId,
    competition: ev.competitionName,
    sport:       getMeta(ev.sportId).label,
    isInPlay,
    isLive,
    status:      statusStr,
    hasTv:       false,
    teams: [
      { name: homeName, detail: homeScore, pill: homeScore, ...homeAvatar },
      { name: awayName, detail: awayScore, pill: awayScore, ...awayAvatar },
    ],
    odds,
    extra: totalMarkets > 1 ? `+${totalMarkets - 1}` : '',
    thumbnail: ev.thumbnail || undefined,
    team1Image: ev.team1Image || undefined,
    team2Image: ev.team2Image || undefined,
    country: ev.country || undefined,
  };
}

// ─── Merge inplay into grouped upcoming ──────────────────────────────────────
function mergeInplayIntoGrouped(
  upcoming: Record<string, SrEvent[]>,
  inplay: SrEvent[],
  activeSportsOrder: string[]
): Record<string, SrEvent[]> {
  if (inplay.length === 0) return upcoming;

  const inplayMap = new Map(inplay.map((e) => [e.eventId, e]));

  const inplayBySport: Record<string, SrEvent[]> = {};
  inplay.forEach((e) => {
    if (!inplayBySport[e.sportId]) inplayBySport[e.sportId] = [];
    inplayBySport[e.sportId].push(e);
  });

  const merged: Record<string, SrEvent[]> = {};

  activeSportsOrder.forEach((sportId) => {
    const upcomingList = (upcoming[sportId] ?? []).filter((e) => !inplayMap.has(e.eventId));
    const liveList    = inplayBySport[sportId] ?? [];
    const startedLiveList = upcomingList.filter((event) => isEventLive(event));
    const futureList = upcomingList.filter((event) => !isEventLive(event));
    const combined = [...liveList, ...startedLiveList, ...futureList];
    if (combined.length > 0) merged[sportId] = combined;
  });

  return merged;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
type RailRef = RefObject<HTMLDivElement | null>;
const scrollRail = (ref: RailRef, dir: 'left' | 'right', n = 340) =>
  ref.current?.scrollBy({ left: dir === 'left' ? -n : n, behavior: 'smooth' });

function RailArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button type="button" onClick={onClick} aria-label={`Scroll ${direction}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70 transition hover:bg-white/[0.08] hover:text-white active:scale-90">
      <Icon size={14} />
    </button>
  );
}

function BadgeSkeleton() {
  return <div className="h-[76px] w-[76px] shrink-0 rounded-2xl bg-white/[0.04] animate-pulse" />;
}

function CardSkeleton() {
  return (
    <div className="min-w-[308px] shrink-0 snap-start overflow-hidden rounded-[10px] border border-white/[0.08] bg-white/[0.03]">
      <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3.5">
        <div className="h-11 w-11 shrink-0 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-40 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-2.5 w-24 rounded bg-white/[0.04] animate-pulse" />
        </div>
      </div>
      <div className="px-4 py-3.5 space-y-4">
        <div className="flex justify-between gap-4">
          <div className="space-y-2.5 flex-1">
            <div className="h-4 w-36 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-28 rounded bg-white/[0.04] animate-pulse" />
          </div>
          <div className="space-y-2.5">
            <div className="h-6 w-12 rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="h-6 w-12 rounded-xl bg-white/[0.04] animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 rounded-[18px] bg-white/[0.04] animate-pulse" />
          <div className="h-10 rounded-[18px] bg-white/[0.04] animate-pulse" />
          <div className="h-10 rounded-[18px] bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Live pulse indicator ─────────────────────────────────────────────────────
function LivePulse() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
    </span>
  );
}

// ─── Sport group section ──────────────────────────────────────────────────────
function SportGroupSection({
  sportId, events, onGoTo, teamIcons,
  userPinnedIds, onUserPinToggle, adminPinnedIds, onAdminPinToggle, isAdmin,
}: {
  sportId: string;
  events: SrEvent[];
  onGoTo: (id: string) => void;
  inplayIds: Set<string>;
  teamIcons: Record<string, string>;
  userPinnedIds: Set<string>;
  onUserPinToggle: (id: string) => void;
  adminPinnedIds: Set<string>;
  onAdminPinToggle: (id: string) => void;
  isAdmin: boolean;
}) {
  const meta    = getMeta(sportId);
  const railRef = useRef<HTMLDivElement>(null);

  const cards = useMemo(
    () => events.slice(0, 10).map((e) => srEventToLiveEvent(e, teamIcons)),
    [events, teamIcons],
  );

  if (cards.length === 0) return null;

  const liveCount = events.filter((e) => isEventLive(e)).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
            <span className="text-[16px] leading-none">{meta.emoji}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-[16px] leading-none text-white">
                {meta.label}
              </h2>
              {liveCount > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[9px] font-black text-red-400">
                  <LivePulse />
                  {liveCount} Live
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/50 mt-0.5">{events.length} events</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/sports/league/${encodeURIComponent(sportId)}`}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70 transition hover:border-amber-500/40 hover:text-amber-300 active:scale-95"
          >
            View all
          </Link>
          <RailArrow direction="left"  onClick={() => scrollRail(railRef, 'left')}  />
          <RailArrow direction="right" onClick={() => scrollRail(railRef, 'right')} />
        </div>
      </div>
      <div ref={railRef} className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 py-1.5 scrollbar-none">
        {cards.map((e) => {
          const isUserPinned  = userPinnedIds.has(e.matchId);
          const isAdminPinned = adminPinnedIds.has(e.matchId);
          return (
            <div key={e.matchId} className="relative shrink-0">
              <LiveEventCard event={e} onCardClick={onGoTo} onOddsClick={onGoTo} />
              <div className="absolute top-2 right-2 z-20 flex gap-1">
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); onUserPinToggle(e.matchId); }}
                  title={isUserPinned ? 'Remove from my pins' : 'Pin this match'}
                  className={`flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${
                    isUserPinned
                      ? 'bg-amber-500/90 text-[#1a1208]'
                      : 'bg-black/50 text-white/70 hover:bg-amber-500/80 hover:text-[#1a1208]'
                  }`}
                >
                  {isUserPinned ? <PinOff size={10} /> : <Pin size={10} />}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); onAdminPinToggle(e.matchId); }}
                    title={isAdminPinned ? 'Unpin for all users' : 'Feature for all users'}
                    className={`flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${
                      isAdminPinned
                        ? 'bg-rose-500/90 text-white'
                        : 'bg-black/50 text-white/70 hover:bg-rose-500/80 hover:text-white'
                    }`}
                  >
                    <Star size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Hero slides ──────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  { title: 'Win Big.\nBet Smarter.',   subtitle: 'odd69 brings you razor-sharp odds across every sport — always the best price, always in real time.', eyebrow: '🔥 odd69 — Where Winners Play' },
  { title: 'Your Edge.\nEvery Match.', subtitle: 'Live odds refresh every 10 seconds. Stack your bets with confidence and cash out at the perfect moment.', eyebrow: '⚡ Live Odds • Instant Payouts • Zero Limits' },
];

// ─── localStorage helpers for user-pinned matches ────────────────────────────
const USER_PINS_KEY = 'sports:user-pinned-matches';
function loadUserPins(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(USER_PINS_KEY) ?? '[]'); } catch { return []; }
}
function saveUserPins(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_PINS_KEY, JSON.stringify([...new Set(ids)]));
}

// ─── Pinned matches rail ──────────────────────────────────────────────────────
function PinnedMatchesRail({
  events,
  adminPinnedIds,
  userPinnedIds,
  onGoTo,
  onAdminPinToggle,
  onUserPinToggle,
  isAdmin,
  loading,
  teamIcons,
}: {
  events:           SrEvent[];
  adminPinnedIds:   Set<string>;
  userPinnedIds:    Set<string>;
  onGoTo:           (id: string) => void;
  onAdminPinToggle: (id: string) => void;
  onUserPinToggle:  (id: string) => void;
  isAdmin:          boolean;
  inplayIds:        Set<string>;
  loading:          boolean;
  teamIcons:        Record<string, string>;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  const pinnedEvents = useMemo(() => {
    const adminList = events.filter((e) => adminPinnedIds.has(e.eventId));
    const userList  = events.filter((e) => userPinnedIds.has(e.eventId) && !adminPinnedIds.has(e.eventId));
    return [...adminList, ...userList];
  }, [events, adminPinnedIds, userPinnedIds]);

  if (!loading && pinnedEvents.length === 0) return null;

  const cards = pinnedEvents.map((e) => srEventToLiveEvent(e, teamIcons));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Star size={14} className="text-amber-400 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-[16px] text-white">Pinned Matches</span>
              {isAdmin && (
                <span className="rounded-full bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 text-[10px] text-white/50">Admin</span>
              )}
            </div>
            {!loading && (
              <p className="text-[10px] text-white/50 mt-0.5">{pinnedEvents.length} pinned</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <RailArrow direction="left"  onClick={() => scrollRail(railRef, 'left')}  />
          <RailArrow direction="right" onClick={() => scrollRail(railRef, 'right')} />
        </div>
      </div>

      <div
        ref={railRef}
        className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 py-1.5 scrollbar-none"
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : cards.map((card, idx) => {
              const ev = pinnedEvents[idx];
              const isAdminPinned = adminPinnedIds.has(ev.eventId);
              const isUserPinned  = userPinnedIds.has(ev.eventId);
              return (
                <div key={card.matchId} className="relative shrink-0">
                  <LiveEventCard event={card} onCardClick={onGoTo} onOddsClick={onGoTo} />

                  <div className="absolute top-2 right-2 z-20 flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onUserPinToggle(ev.eventId); }}
                      title={isUserPinned ? 'Remove from my pins' : 'Add to my pins'}
                      className={`flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${
                        isUserPinned
                          ? 'bg-amber-500/90 text-[#1a1208]'
                          : 'bg-black/50 text-white/70 hover:bg-amber-500/80 hover:text-[#1a1208]'
                      }`}
                    >
                      {isUserPinned ? <PinOff size={10} /> : <Pin size={10} />}
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAdminPinToggle(ev.eventId); }}
                        title={isAdminPinned ? 'Unpin for all users' : 'Pin for all users'}
                        className={`flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${
                          isAdminPinned
                            ? 'bg-rose-500/90 text-white'
                            : 'bg-black/50 text-white/70 hover:bg-rose-500/80 hover:text-white'
                        }`}
                      >
                        <Star size={10} />
                      </button>
                    )}
                  </div>

                  {isAdminPinned && (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[8px] font-black text-[#1a1208]">
                      <Star size={7} className="fill-[#1a1208]" />
                      Featured
                    </div>
                  )}
                  {!isAdminPinned && isUserPinned && (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 text-[8px] font-black text-white/70 backdrop-blur-md">
                      <Pin size={7} />
                      My Pick
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function SportsMainContent({
  initialData,
}: {
  initialData?: SportsLobbyInitialData;
}) {
  const router    = useRouter();
  const [heroIndex, setHeroIndex] = useState(0);
  const leaguesRef = useRef<HTMLDivElement>(null);
  const liveRef    = useRef<HTMLDivElement>(null);
  const leagueRef  = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  const [eventsFilter, setEventsFilter] = useState<'all' | 'live' | 'upcoming'>('all');

  const [leagueImageMap, setLeagueImageMap] = useState<Record<string, string>>({});

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [adminPinnedIds, setAdminPinnedIds] = useState<Set<string>>(new Set());
  const [userPinnedIds,  setUserPinnedIds]  = useState<Set<string>>(new Set());
  const [fetchedPinnedEvents, setFetchedPinnedEvents] = useState<SrEvent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const toggleSearch = () => {
    setSearchOpen((v) => {
      if (!v) setTimeout(() => searchRef.current?.focus(), 50);
      else setSearchQuery('');
      return !v;
    });
  };

  const hasInitialServerData = Boolean(initialData);

  const [activeSportConfigs, setActiveSportConfigs] = useState<ActiveSportConfig[]>(
    initialData?.activeSports ?? []
  );
  const activeSportIds = useMemo(
    () => activeSportConfigs.map((s) => s.sport_id),
    [activeSportConfigs]
  );

  const [upcomingBySport, setUpcomingBySport] = useState<Record<string, SrEvent[]>>(
    initialData?.upcomingBySport ?? {},
  );
  const [sportLoadedMap, setSportLoadedMap]   = useState<Record<string, boolean>>(
    hasInitialServerData
      ? Object.fromEntries((initialData?.activeSports ?? []).map((s) => [s.sport_id, true]))
      : {},
  );
  const [inplayEvents, setInplayEvents]       = useState<SrEvent[]>(initialData?.inplayEvents ?? []);
  const [loading, setLoading]                 = useState(!hasInitialServerData);
  const [, setEventCounts]                     = useState<SportCount[]>(initialData?.eventCounts ?? []);
  const [, setCountLoading]                    = useState(!hasInitialServerData);
  const [teamIcons, setTeamIcons]             = useState<Record<string, string>>({});

  useEffect(() => {
    fetchActiveSports().then((configs) => {
      if (configs.length > 0) setActiveSportConfigs(configs);
    });

    if (!hasInitialServerData) {
      Promise.all([fetchInplayEvents(), fetchEventsCount()]).then(([inplay, counts]) => {
        setInplayEvents(inplay);
        setEventCounts(counts.sports);
        setCountLoading(false);
        setLoading(false);
      });

      fetchActiveSports().then((configs) => {
        configs.forEach(({ sport_id: sportId }) => {
          fetchAllPagesForSport(sportId)
            .then((evs) => {
              if (evs.length > 0) {
                setUpcomingBySport((prev) => ({ ...prev, [sportId]: evs }));
              }
              setSportLoadedMap((prev) => ({ ...prev, [sportId]: true }));
            })
            .catch(() => {
              setSportLoadedMap((prev) => ({ ...prev, [sportId]: true }));
            });
        });
      });
    }

    getAdminPinnedMatchIds().then((ids) => setAdminPinnedIds(new Set(ids)));

    setUserPinnedIds(new Set(loadUserPins()));

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
      if (token) {
        const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
        if (b64) {
          const payload = JSON.parse(atob(b64));
          const role = payload?.role as string | undefined;
          if (role && ['ADMIN', 'admin', 'SUPER_ADMIN'].includes(role)) setIsAdmin(true);
        }
      }
    } catch { /* ignore */ }

    getLeagueImageMap().then((map) => setLeagueImageMap(map)).catch(() => {});

    sportsApi.getTeamIcons().then((map) => setTeamIcons(map)).catch(() => {});
  }, [hasInitialServerData]);

  const handleAdminPinToggle = useCallback(async (matchId: string) => {
    const token = localStorage.getItem('token') ?? '';
    const res   = await toggleAdminPinnedMatch(token, matchId);
    if (res.ok) {
      setAdminPinnedIds((prev) => {
        const next = new Set(prev);
        if (res.pinned) next.add(matchId); else next.delete(matchId);
        return next;
      });
    }
  }, []);

  const handleUserPinToggle = useCallback((matchId: string) => {
    setUserPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId); else next.add(matchId);
      saveUserPins([...next]);
      return next;
    });
  }, []);

  const pollInplay = useCallback(async () => {
    const fresh = await fetchInplayEvents();
    setInplayEvents(fresh);
  }, []);


  const { socket, connectionStatus, joinSportsLobby, leaveSportsLobby } = useSportsSocket();

  useEffect(() => {
    if (connectionStatus === 'connected') return;
    const t = setInterval(pollInplay, INPLAY_POLL_MS);
    return () => clearInterval(t);
  }, [pollInplay, connectionStatus]);

  useEffect(() => {
    if (connectionStatus === 'connected') return;
    const t = setInterval(() => {
      activeSportIds.forEach((sportId) => {
        fetchAllPagesForSport(sportId).then((evs) => {
          setUpcomingBySport((prev) => {
            if (evs.length === 0 && (!prev[sportId] || prev[sportId].length === 0)) return prev;
            return { ...prev, [sportId]: evs };
          });
        });
      });
      fetchEventsCount().then((c) => setEventCounts(c.sports));
    }, UPCOMING_POLL_MS);
    return () => clearInterval(t);
  }, [connectionStatus, activeSportIds]);


  useEffect(() => {
    joinSportsLobby();
    return () => {
      leaveSportsLobby();
    };
  }, [joinSportsLobby, leaveSportsLobby]);

  useEffect(() => {
    const handler = (data: any) => {
      if (!data) return;

      const targetEventIds = new Set(getSocketPayloadEventIds(data));
      if (targetEventIds.size === 0) return;

      setInplayEvents((prev) => {
        let didChange = false;
        const next = prev.map((event) => {
          if (!targetEventIds.has(event.eventId)) return event;
          const patched = applySocketPayloadToEvent(event, data, event.eventId);
          if (patched !== event) didChange = true;
          return patched;
        });
        return didChange ? next : prev;
      });

      setUpcomingBySport((prev) => {
        let didChange = false;
        const next: Record<string, SrEvent[]> = {};

        Object.entries(prev).forEach(([sportId, events]) => {
          let sportChanged = false;
          const patchedEvents = events.map((event) => {
            if (!targetEventIds.has(event.eventId)) return event;
            const patched = applySocketPayloadToEvent(event, data, event.eventId);
            if (patched !== event) {
              didChange = true;
              sportChanged = true;
            }
            return patched;
          });
          next[sportId] = sportChanged ? patchedEvents : events;
        });

        return didChange ? next : prev;
      });
    };

    socket?.on('sports-lobby-data', handler);

    return () => {
      socket?.off('sports-lobby-data', handler);
    };
  }, [socket]);

  useEffect(() => {
    const t = setInterval(() => setHeroIndex((c) => (c + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const inplayIds = useMemo(() => new Set(inplayEvents.map((e) => e.eventId)), [inplayEvents]);

  const mergedBySport = useMemo(
    () => mergeInplayIntoGrouped(upcomingBySport, inplayEvents, activeSportIds),
    [upcomingBySport, inplayEvents, activeSportIds],
  );

  const allPinnedIds = useMemo(() => {
    const ids = new Set<string>();
    adminPinnedIds.forEach((id) => ids.add(id));
    userPinnedIds.forEach((id) => ids.add(id));
    return ids;
  }, [adminPinnedIds, userPinnedIds]);

  useEffect(() => {
    if (allPinnedIds.size === 0) return;
    const allLoadedIds = new Set(Object.values(mergedBySport).flat().map((e) => e.eventId));
    const missingIds = [...allPinnedIds].filter((id) => !allLoadedIds.has(id));
    if (missingIds.length === 0) {
      if (fetchedPinnedEvents.length > 0) setFetchedPinnedEvents([]);
      return;
    }
    const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'https://odd69.com/api').replace(/\/$/, '');
    Promise.all(
      missingIds.map((id) =>
        fetch(`${BACKEND}/sports/sportradar/event?eventId=${encodeURIComponent(id)}`, { cache: 'no-store' })
          .then((r) => r.json())
          .then((body) => (body.success && body.data ? body.data as SrEvent : null))
          .catch(() => null),
      ),
    ).then((results) => {
      const valid = results.filter(Boolean) as SrEvent[];
      if (valid.length > 0) setFetchedPinnedEvents(valid);
    });
  }, [allPinnedIds, mergedBySport, fetchedPinnedEvents.length]);

  const startedLiveEvents = useMemo(
    () =>
      Object.values(upcomingBySport)
        .flat()
        .filter((event) => !inplayIds.has(event.eventId) && isEventLive(event) && event.status !== 'CLOSED')
        .sort((a, b) => a.openDate - b.openDate),
    [inplayIds, upcomingBySport],
  );

  const futureUpcomingEvents = useMemo(
    () =>
      Object.values(upcomingBySport)
        .flat()
        .filter((event) => !inplayIds.has(event.eventId) && !isEventLive(event) && event.status !== 'CLOSED')
        .sort((a, b) => a.openDate - b.openDate),
    [inplayIds, upcomingBySport],
  );

  const topEvents = useMemo(() => {
    let base: SrEvent[];
    if (eventsFilter === 'live') {
      base = [...inplayEvents, ...startedLiveEvents];
    } else if (eventsFilter === 'upcoming') {
      base = futureUpcomingEvents;
    } else {
      base = [...inplayEvents, ...startedLiveEvents, ...futureUpcomingEvents];
    }
    return base.slice(0, 12).map((e) => srEventToLiveEvent(e, teamIcons));
  }, [eventsFilter, futureUpcomingEvents, inplayEvents, startedLiveEvents, teamIcons]);

  const topLeagues = useMemo(() => {
    const compMap = new Map<string, {
      competitionId: string;
      competitionName: string;
      sportId: string;
      eventCount: number;
      liveCount: number;
    }>();
    const allEvents = [
      ...inplayEvents,
      ...Object.values(upcomingBySport).flat(),
    ];
    for (const ev of allEvents) {
      if (!ev.competitionId) continue;
      const existing = compMap.get(ev.competitionId);
      const isLive = isEventLive(ev);
      if (existing) {
        existing.eventCount++;
        if (isLive) existing.liveCount++;
      } else {
        compMap.set(ev.competitionId, {
          competitionId: ev.competitionId,
          competitionName: ev.competitionName,
          sportId: ev.sportId,
          eventCount: 1,
          liveCount: isLive ? 1 : 0,
        });
      }
    }
    const PRIORITY_LEAGUES = [
      'indian premier league', 'ipl',
      'premier league',
      'champions league', 'uefa champions league',
      'la liga',
      'serie a',
      'bundesliga',
      'ligue 1',
    ];

    function getPriority(name: string): number {
      const lower = name.toLowerCase();
      for (let i = 0; i < PRIORITY_LEAGUES.length; i++) {
        if (lower.includes(PRIORITY_LEAGUES[i])) return i;
      }
      return PRIORITY_LEAGUES.length;
    }

    return [...compMap.values()]
      .sort((a, b) => {
        const pa = getPriority(a.competitionName);
        const pb = getPriority(b.competitionName);
        if (pa !== pb) return pa - pb;
        return b.liveCount - a.liveCount || b.eventCount - a.eventCount;
      })
      .slice(0, 30);
  }, [inplayEvents, upcomingBySport]);

  const sportBadges = useMemo<FeaturedLeague[]>(() => {
    return activeSportIds
      .filter((id: string) => (mergedBySport[id]?.length ?? 0) > 0)
      .map((id: string) => {
        const meta  = getMeta(id);
        const sportEvents = mergedBySport[id] ?? [];
        return {
          title:         meta.label,
          badge:         meta.emoji,
          href:          `/sports/league/${encodeURIComponent(id)}`,
          badgeClass:    meta.badgeClass,
          ringClass:     meta.ringClass,
          liveCount:     sportEvents.filter((event) => isEventLive(event)).length,
          upcomingCount: sportEvents.filter((event) => !isEventLive(event) && event.status !== 'CLOSED').length,
        };
      });
  }, [mergedBySport, activeSportIds]);

  const filteredSportIds = useMemo(() => {
    const base = activeSportIds.filter((id: string) => (mergedBySport[id]?.length ?? 0) > 0);
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter((id: string) => {
      const meta = getMeta(id);
      if (meta.label.toLowerCase().includes(q)) return true;
      return (mergedBySport[id] ?? []).some((e) =>
        e.eventName.toLowerCase().includes(q) ||
        e.competitionName.toLowerCase().includes(q)
      );
    });
  }, [mergedBySport, searchQuery, activeSportIds]);

  const totalLive = useMemo(
    () =>
      Object.values(mergedBySport)
        .flat()
        .filter((event) => isEventLive(event)).length,
    [mergedBySport],
  );
  const goToMatch  = (id: string) => router.push(`/sports/match/${id}`);

  return (
    <main className="min-h-full bg-[#06080c] text-white">
      <div className="mx-auto flex w-full max-w-[1820px] flex-col gap-5 px-3 py-3 pb-[calc(var(--mobile-nav-height)+20px)] md:px-5 md:py-4 md:pb-8 xl:px-6">

        {/* ── Header bar ── */}
        <div className="flex items-center gap-2">
          {totalLive > 0 && !loading && (
            <div className="flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[10px] font-black text-red-400">
              <LivePulse />
              {totalLive} Live
            </div>
          )}

          <div className={`flex-1 transition-all duration-200 ${searchOpen ? 'max-w-full' : 'max-w-0 overflow-hidden'}`}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sports, teams, competitions…"
                className="w-full bg-white/[0.04] text-[13px] text-white pl-9 pr-3 py-2 rounded-xl border border-white/[0.08] focus:border-amber-500/40 outline-none placeholder:text-white/25 transition"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button type="button" aria-label={searchOpen ? 'Close search' : 'Search'}
              onClick={toggleSearch}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/[0.08] active:scale-90 ${
                searchOpen ? 'bg-amber-500/15 text-amber-300' : 'bg-white/[0.04] text-white/70 hover:text-white'
              }`}>
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* ── Hero ── */}
        {!searchQuery && (
          <DynamicHeroSlider
            page="SPORTS"
            className="w-full"
            fallback={
              <section className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-[linear-gradient(135deg,#2a1a0a_0%,#06080c_40%,#3d2710_100%)] px-4 py-5 shadow-[0_20px_48px_rgba(0,0,0,0.4)] md:px-6 md:py-7">
                <div className="relative z-10 max-w-[560px]">
                  <div className="mb-2 inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1">
                    <span className="text-[11px] font-black text-amber-300">{HERO_SLIDES[heroIndex].eyebrow}</span>
                  </div>
                  <h1 className="font-black text-[24px] leading-[0.96] tracking-[-0.04em] text-white sm:text-[32px] md:text-[40px]" style={{ whiteSpace: 'pre-line' }}>
                    {HERO_SLIDES[heroIndex].title}
                  </h1>
                  <p className="mt-2 max-w-[440px] text-[13px] leading-snug text-white/70 md:text-[14px]">
                    {HERO_SLIDES[heroIndex].subtitle}
                  </p>
                </div>
                <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                  <button type="button" onClick={() => setHeroIndex((c) => (c - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} aria-label="Previous"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/30 text-white/70 backdrop-blur transition hover:bg-black/50 active:scale-90">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" onClick={() => setHeroIndex((c) => (c + 1) % HERO_SLIDES.length)} aria-label="Next"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-90">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </section>
            }
          />
        )}


        {/* ── Sports categories badge rail ── */}
        {!searchQuery && (loading || sportBadges.length > 0) && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <TrendingUp size={15} className="text-amber-400" />
              </div>
              <div>
                <span className="font-black text-[16px] text-white">Sports Categories</span>
                {!loading && (
                  <p className="text-[10px] text-white/50 mt-0.5">{sportBadges.length} sports available</p>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <RailArrow direction="left"  onClick={() => scrollRail(leaguesRef, 'left',  380)} />
              <RailArrow direction="right" onClick={() => scrollRail(leaguesRef, 'right', 380)} />
            </div>
          </div>

          <div className="relative">
            <div
              ref={leaguesRef}
              className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-1 scrollbar-none"
            >
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <BadgeSkeleton key={i} />)
                : sportBadges.map((league) => (
                    <LeagueBadge key={league.title} league={league}
                      onClick={() => router.push(league.href)} />
                  ))
              }
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#06080c] to-transparent sm:hidden" />
          </div>
        </section>
        )}

        {/* ── Leagues slider ── */}
        {!searchQuery && topLeagues.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <span className="text-[15px] leading-none">🏆</span>
              </div>
              <div>
                <span className="font-black text-[16px] text-white">Popular Leagues</span>
                <p className="text-[10px] text-white/50 mt-0.5">{topLeagues.length} competitions</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <RailArrow direction="left"  onClick={() => scrollRail(leagueRef, 'left',  340)} />
              <RailArrow direction="right" onClick={() => scrollRail(leagueRef, 'right', 340)} />
            </div>
          </div>

          <div className="relative">
            <div
              ref={leagueRef}
              className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-1 scrollbar-none"
            >
              {topLeagues.map((league) => (
                <LeagueCard
                  key={league.competitionId}
                  competitionId={league.competitionId}
                  competitionName={league.competitionName}
                  sportEmoji={getMeta(league.sportId).emoji}
                  sportLabel={getMeta(league.sportId).label}
                  imageUrl={leagueImageMap[league.competitionId]}
                  eventCount={league.eventCount}
                  liveCount={league.liveCount}
                  onClick={() => router.push(`/sports/competition/${encodeURIComponent(league.competitionId)}?name=${encodeURIComponent(league.competitionName)}&sportId=${encodeURIComponent(league.sportId)}`)}
                />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#06080c] to-transparent sm:hidden" />
          </div>
        </section>
        )}

        {/* ── Pinned matches rail ── */}
        {!searchQuery && (
          <PinnedMatchesRail
            events={[...Object.values(mergedBySport).flat(), ...fetchedPinnedEvents]}
            adminPinnedIds={adminPinnedIds}
            userPinnedIds={userPinnedIds}
            onGoTo={goToMatch}
            onAdminPinToggle={handleAdminPinToggle}
            onUserPinToggle={handleUserPinToggle}
            isAdmin={isAdmin}
            inplayIds={inplayIds}
            loading={loading}
            teamIcons={teamIcons}
          />
        )}

        {/* ── Top matches with toggle ── */}
        {!searchQuery && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                <span className="text-[15px] leading-none">🔥</span>
              </div>
              <div>
                <span className="font-black text-[16px] text-white">Top Matches</span>
                {!loading && (
                  <p className="text-[10px] text-white/50 mt-0.5">{topEvents.length} matches</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5">
              {(['all', 'live', 'upcoming'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setEventsFilter(f)}
                  className={`rounded-full px-3 py-1 text-[10px] font-black capitalize transition-all duration-150 ${
                    eventsFilter === f
                      ? f === 'live'
                        ? 'bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)]'
                        : f === 'upcoming'
                          ? 'bg-amber-500 text-[#1a1208] shadow-[0_2px_8px_rgba(245,158,11,0.2)]'
                          : 'bg-white/[0.12] text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  {f === 'live' ? '🔴 Live' : f === 'upcoming' ? '📅 Upcoming' : 'All'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <RailArrow direction="left"  onClick={() => scrollRail(liveRef, 'left')}  />
              <RailArrow direction="right" onClick={() => scrollRail(liveRef, 'right')} />
            </div>
          </div>

          <div ref={liveRef} className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 py-1.5 scrollbar-none">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
              : topEvents.length > 0
                ? topEvents.map((e) => {
                    const isUserPinned  = userPinnedIds.has(e.matchId);
                    const isAdminPinned = adminPinnedIds.has(e.matchId);
                    return (
                      <div key={e.matchId} className="relative shrink-0">
                        <LiveEventCard event={e} onCardClick={goToMatch} onOddsClick={goToMatch} />

                        <div className="absolute top-2 right-2 z-20 flex gap-1">
                          <button
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); handleUserPinToggle(e.matchId); }}
                            title={isUserPinned ? 'Remove from my pins' : 'Pin this match'}
                            className={`flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${
                              isUserPinned
                                ? 'bg-amber-500/90 text-[#1a1208]'
                                : 'bg-black/50 text-white/70 hover:bg-amber-500/80 hover:text-[#1a1208]'
                            }`}
                          >
                            {isUserPinned ? <PinOff size={10} /> : <Pin size={10} />}
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(ev) => { ev.stopPropagation(); handleAdminPinToggle(e.matchId); }}
                              title={isAdminPinned ? 'Unpin for all users' : 'Feature for all users'}
                              className={`flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${
                                isAdminPinned
                                  ? 'bg-rose-500/90 text-white'
                                  : 'bg-black/50 text-white/70 hover:bg-rose-500/80 hover:text-white'
                              }`}
                            >
                              <Star size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                : (
                  <div className="flex min-h-[100px] min-w-[260px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-6">
                    <div className="text-center space-y-1">
                      <span className="text-xl text-white/25">🏟️</span>
                      <p className="text-[12px] text-white/50">No matches available</p>
                    </div>
                  </div>
                )
            }
          </div>
        </section>
        )}

        {/* ── Sport group sections ── */}
        {searchQuery && filteredSportIds.length === 0 && !loading && (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <span className="text-2xl">🔍</span>
            <p className="text-[13px] text-white/50">No matches for &quot;{searchQuery}&quot;</p>
            <button type="button" onClick={() => { setSearchQuery(''); }}
              className="rounded-full bg-white/[0.04] px-4 py-1.5 text-[12px] text-amber-300 hover:bg-white/[0.08] transition">
              Clear search
            </button>
          </div>
        )}

        {activeSportIds.map((sportId: string) => {
          const isLoaded = sportLoadedMap[sportId] ?? false;
          const events   = mergedBySport[sportId] ?? [];
          const meta     = getMeta(sportId);

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const sportMatchesSearch =
              meta.label.toLowerCase().includes(q) ||
              events.some((e) =>
                e.eventName.toLowerCase().includes(q) ||
                e.competitionName.toLowerCase().includes(q),
              );
            if (!sportMatchesSearch) return null;
          } else {
            if (events.length === 0 && !isLoaded) {
              return (
                <section key={sportId} className="space-y-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-white/[0.04]" />
                    <div className="h-4 w-28 rounded bg-white/[0.04]" />
                    <div className="h-3.5 w-14 rounded-full bg-white/[0.04]" />
                  </div>
                  <div className="flex gap-2.5 overflow-hidden -mx-1 px-1">
                    {[0, 1, 2].map((j) => <CardSkeleton key={j} />)}
                  </div>
                </section>
              );
            }
            if (events.length === 0) return null;
          }

          const filteredEvents = searchQuery.trim()
            ? events.filter((e) => {
                const q = searchQuery.toLowerCase();
                return e.eventName.toLowerCase().includes(q) ||
                       e.competitionName.toLowerCase().includes(q);
              })
            : events;

          if (filteredEvents.length === 0) return null;

          return (
            <div
              key={sportId}
              style={{
                opacity: isLoaded ? 1 : 0,
                transform: isLoaded ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
              }}
            >
              <SportGroupSection
                sportId={sportId}
                events={filteredEvents}
                onGoTo={goToMatch}
                inplayIds={inplayIds}
                teamIcons={teamIcons}
                userPinnedIds={userPinnedIds}
                onUserPinToggle={handleUserPinToggle}
                adminPinnedIds={adminPinnedIds}
                onAdminPinToggle={handleAdminPinToggle}
                isAdmin={isAdmin}
              />
            </div>
          );
        })}

      </div>
    </main>
  );
}
