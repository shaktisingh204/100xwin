'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { sportsbookApi, Event } from '@/services/sports';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Tab {
    id: string;
    label: string;
    icon?: string;
}

interface SportFilter {
    id: string | null;
    name: string;
    emoji: string;
    color: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const TABS: Tab[] = [
    { id: 'highlights', label: 'HIGHLIGHTS' },
    { id: 'event-builder', label: 'EVENT BUILDER' },
    { id: 'bets-feed', label: 'BETS FEED' },
];

const SPORT_FILTERS: SportFilter[] = [
    { id: null,            name: 'Basketball',      emoji: '🏀', color: '#ec4899' },
    { id: 'sr:sport:20',   name: 'Baseball',        emoji: '⚾', color: '#f97316' },
    { id: 'sr:sport:4',    name: 'Ice Hockey',      emoji: '🏒', color: '#38bdf8' },
    { id: 'sr:sport:2',    name: 'Tennis',          emoji: '🎾', color: '#facc15' },
    { id: 'sr:sport:20',   name: 'Soccer',          emoji: '⚽', color: '#4ade80' },
    { id: 'sr:sport:22',   name: 'Counter-Strike',  emoji: '🎮', color: '#f97316' },
    { id: 'sr:sport:29',   name: 'Dota 2',          emoji: '⚔️', color: '#a78bfa' },
    { id: 'sr:sport:9',    name: 'Boxing',          emoji: '🥊', color: '#ef4444' },
    { id: 'sr:sport:1',    name: 'American Football',emoji: '🏈', color: '#fb923c' },
];

// Hero card gradient colors — amber/orange palette for odd69 branding
const HERO_CARD_COLORS = [
    { from: '#3d2710', to: '#5c3916', accent: '#f59e0b' },
    { from: '#2a1a0a', to: '#4a2d12', accent: '#fbbf24' },
    { from: '#1f1308', to: '#3d2710', accent: '#f59e0b' },
    { from: '#4a2d12', to: '#7a4a1c', accent: '#fbbf24' },
    { from: '#2a1a0a', to: '#3d2710', accent: '#f59e0b' },
];

interface Props {
    selectedSportId: string | null;
    onSelectSport?: (id: string | null) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name?: string) {
    if (!name) return '??';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatOdds(price?: number | null): string {
    if (!price || price <= 1) return '-';
    return price.toFixed(2);
}

function formatMatchTime(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        if (diffDays === 0) return `Today, ${timeStr}`;
        if (diffDays === 1) return `Tomorrow, ${timeStr}`;
        return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
        return '';
    }
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function HeroSkeleton() {
    return (
        <div className="relative w-full h-[200px] rounded-2xl overflow-hidden animate-pulse bg-white/[0.04] border border-white/[0.08]">
            <div className="absolute inset-0 flex items-center justify-between px-8">
                <div className="flex flex-col gap-3">
                    <div className="h-3 w-24 bg-white/[0.08] rounded-full" />
                    <div className="h-5 w-32 bg-white/[0.08] rounded-full" />
                </div>
                <div className="h-5 w-32 bg-white/[0.08] rounded-full" />
            </div>
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="flex-shrink-0 w-[220px] h-[130px] rounded-2xl animate-pulse bg-white/[0.04] border border-white/[0.08]" />
    );
}

function RowSkeleton() {
    return (
        <div className="px-4 py-3 border-b border-white/[0.05] animate-pulse">
            <div className="h-2.5 w-40 bg-white/[0.04] rounded mb-2" />
            <div className="h-3.5 w-52 bg-white/[0.04] rounded mb-1.5" />
            <div className="h-3.5 w-44 bg-white/[0.04] rounded mb-2" />
            <div className="flex gap-2">
                <div className="flex-1 h-8 bg-white/[0.04] rounded-lg" />
                <div className="flex-1 h-8 bg-white/[0.04] rounded-lg" />
                <div className="flex-1 h-8 bg-white/[0.04] rounded-lg" />
            </div>
        </div>
    );
}

// ─── Hero Banner ─────────────────────────────────────────────────────────────
function HeroBanner({ match }: { match: Event | null }) {
    if (!match) return <HeroSkeleton />;

    const homeTeam = match.home_team || match.event_name?.split(' vs. ')[0]?.trim() || 'Home';
    const awayTeam = match.away_team || match.event_name?.split(' vs. ')[1]?.trim() || 'Away';
    const compName = (match as any).competition_name || match.competition?.competition_name || 'International';
    const runners = (match as any).sr_markets?.matchOdds?.[0]?.runners ?? (match as any).match_odds ?? [];
    const isLive = match.match_status === 'Live' || match.match_status === 'In Play';
    const dateStr = formatMatchTime(match.open_date);

    return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-amber-500/20"
            style={{ background: 'linear-gradient(135deg, #06080c 0%, #1a0f05 40%, #2a1a0a 100%)', minHeight: '200px' }}>

            <div className="absolute inset-0 opacity-40">
                <img
                    src="/sports-hero-banner.png"
                    alt=""
                    aria-hidden
                    loading="eager"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(6,8,12,0.95) 0%, rgba(6,8,12,0.5) 50%, rgba(6,8,12,0.7) 100%)' }} />
            </div>

            <div className="relative z-10 px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">🏆 {compName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isLive ? (
                            <span className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                LIVE
                            </span>
                        ) : (
                            <span className="text-[11px] text-white/50 font-medium">{dateStr}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative z-10 px-5 pb-3">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.08] backdrop-blur-md flex items-center justify-center text-sm font-black text-white">
                                {getInitials(homeTeam)}
                            </div>
                            <span className="text-[15px] font-black text-white">{homeTeam}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.08] backdrop-blur-md flex items-center justify-center text-sm font-black text-white">
                                {getInitials(awayTeam)}
                            </div>
                            <span className="text-[15px] font-black text-white">{awayTeam}</span>
                        </div>
                    </div>
                </div>

                {runners.length > 0 && (
                    <div className="flex gap-2">
                        {runners.slice(0, 3).map((r: any, i: number) => {
                            const price = r.backPrices?.[0]?.price ?? r.back;
                            const shortLabel = i === 0 ? '1' : i === 1 ? 'draw' : '2';
                            return (
                                <button
                                    key={i}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all hover:brightness-110 active:scale-95 bg-white/[0.04] border border-white/[0.08]"
                                >
                                    <span className="text-white/50">{shortLabel}</span>
                                    <span className="text-white font-black">{formatOdds(price)}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                <div className="w-5 h-1 rounded-full bg-amber-400" />
                <div className="w-1 h-1 rounded-full bg-white/25" />
                <div className="w-1 h-1 rounded-full bg-white/25" />
            </div>
        </div>
    );
}

// ─── Horizontal scroll match card ──────────
function HScrollMatchCard({ match, colorIndex }: { match: Event; colorIndex: number }) {
    const router = useRouter();
    const colors = HERO_CARD_COLORS[colorIndex % HERO_CARD_COLORS.length];

    const homeTeam = match.home_team || match.event_name?.split(' vs. ')[0]?.trim() || 'Home';
    const awayTeam = match.away_team || match.event_name?.split(' vs. ')[1]?.trim() || 'Away';
    const compName = (match as any).competition_name || match.competition?.competition_name || 'International';
    const runners = (match as any).sr_markets?.matchOdds?.[0]?.runners ?? (match as any).match_odds ?? [];
    const timeStr = formatMatchTime(match.open_date);
    const isLive = match.match_status === 'Live' || match.match_status === 'In Play';

    return (
        <div
            onClick={() => router.push(`/sports/match/${match.event_id}`)}
            className="flex-shrink-0 w-[220px] rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
            style={{
                background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                border: `1px solid ${colors.accent}33`,
            }}
        >
            <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-black truncate max-w-[120px]"
                    style={{ color: colors.accent, opacity: 0.9 }}>
                    {compName}
                </span>
                <span className="text-[10px] font-black" style={{ color: colors.accent, opacity: 0.8 }}>
                    {isLive ? (
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                            LIVE
                        </span>
                    ) : timeStr}
                </span>
            </div>

            <div className="px-3 py-2 flex justify-between items-end">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.12] flex items-center justify-center text-[10px] font-black text-white">
                            {getInitials(homeTeam)}
                        </div>
                        <span className="text-[12px] font-black text-white leading-tight max-w-[100px] truncate">{homeTeam}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.12] flex items-center justify-center text-[10px] font-black text-white">
                            {getInitials(awayTeam)}
                        </div>
                        <span className="text-[12px] font-black text-white leading-tight max-w-[100px] truncate">{awayTeam}</span>
                    </div>
                </div>
            </div>

            {runners.length > 0 && (
                <div className="px-3 pb-3 flex gap-1.5">
                    {runners.slice(0, 3).map((r: any, i: number) => {
                        const price = r.backPrices?.[0]?.price ?? r.back;
                        const shortLabel = i === 0 ? '1' : i === 1 ? 'draw' : '2';
                        return (
                            <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black"
                                style={{ background: 'rgba(0,0,0,0.35)', color: colors.accent }}>
                                <span className="text-white/50 font-semibold text-[9px]">{shortLabel}</span>
                                <span>{formatOdds(price)}</span>
                            </div>
                        );
                    })}
                    {runners.length === 2 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black"
                            style={{ background: 'rgba(0,0,0,0.35)', color: colors.accent }}>
                            <span className="text-white/50 font-semibold text-[9px]">2</span>
                            <span>{formatOdds(runners[1]?.backPrices?.[0]?.price ?? runners[1]?.back)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Match Row ────────────────────────────────
function MatchRow({ match }: { match: Event; odd?: number }) {
    const router = useRouter();

    const homeTeam = match.home_team || match.event_name?.split(' vs. ')[0]?.trim() || 'Home';
    const awayTeam = match.away_team || match.event_name?.split(' vs. ')[1]?.trim() || 'Away';
    const compName = (match as any).competition_name || match.competition?.competition_name || 'International';
    const runners = (match as any).sr_markets?.matchOdds?.[0]?.runners ?? (match as any).match_odds ?? [];
    const timeStr = formatMatchTime(match.open_date);
    const isLive = match.match_status === 'Live' || match.match_status === 'In Play';
    const [expanded, setExpanded] = useState(false);

    const r0 = runners[0];
    const r1 = runners[1];
    const r2 = runners[2];

    const p0 = r0?.backPrices?.[0]?.price ?? r0?.back;
    const p1 = r1?.backPrices?.[0]?.price ?? r1?.back;
    const p2 = r2?.backPrices?.[0]?.price ?? r2?.back;

    return (
        <div className="border-b border-white/[0.05] last:border-b-0 bg-white/[0.02]">
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                <span className="text-[10px] text-white/50 font-medium">International · {compName}</span>
                <span className="text-[10px] text-white/50">·</span>
                <span className="text-[10px] font-black"
                    style={{ color: isLive ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                    {isLive ? (
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                            LIVE
                        </span>
                    ) : timeStr}
                </span>
            </div>

            <div className="px-4 pb-2">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[8px] font-black text-white/70">
                        {getInitials(homeTeam).charAt(0)}
                    </div>
                    <span className="text-[13px] font-black text-white">{homeTeam}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[8px] font-black text-white/70">
                        {getInitials(awayTeam).charAt(0)}
                    </div>
                    <span className="text-[13px] font-black text-white">{awayTeam}</span>
                </div>
                <div className="text-[10px] text-white/25 mt-1 ml-7">Winner (incl. overtime)</div>
            </div>

            {runners.length > 0 && (
                <div className="flex items-center px-4 pb-3 gap-2">
                    <button
                        className="flex flex-col items-center flex-1 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] transition-all hover:bg-amber-500/10 hover:border-amber-500/30 active:scale-95"
                        onClick={(e) => { e.stopPropagation(); router.push(`/sports/match/${match.event_id}`); }}>
                        <span className="text-[9px] text-white/50 font-semibold">1</span>
                        <span className="text-[13px] font-black text-white">{formatOdds(p0)}</span>
                    </button>

                    {r2 && (
                        <button
                            className="flex flex-col items-center flex-1 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] transition-all hover:bg-amber-500/10 hover:border-amber-500/30 active:scale-95"
                            onClick={(e) => { e.stopPropagation(); router.push(`/sports/match/${match.event_id}`); }}>
                            <span className="text-[9px] text-white/50 font-semibold">X</span>
                            <span className="text-[13px] font-black text-white">{formatOdds(p1)}</span>
                        </button>
                    )}

                    <button
                        className="flex flex-col items-center flex-1 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] transition-all hover:bg-amber-500/10 hover:border-amber-500/30 active:scale-95"
                        onClick={(e) => { e.stopPropagation(); router.push(`/sports/match/${match.event_id}`); }}>
                        <span className="text-[9px] text-white/50 font-semibold">2</span>
                        <span className="text-[13px] font-black text-white">{formatOdds(r2 ? p2 : p1)}</span>
                    </button>

                    <button
                        className="w-8 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center transition-all hover:bg-white/[0.08] flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d={expanded ? 'M2 8L6 4L10 8' : 'M2 4L6 8L10 4'} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Betslip Bar ──────────────────────────────────────────────────────────────
function BetslipBar() {
    const [quickBet, setQuickBet] = useState(false);

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.08]"
            style={{
                background: 'rgba(6,8,12,0.97)',
                backdropFilter: 'blur(20px)',
            }}>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-white/[0.04] text-white/80">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" opacity="0.7" />
                    <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" opacity="0.7" />
                    <rect x="2" y="11" width="8" height="2" rx="1" fill="currentColor" opacity="0.7" />
                </svg>
                Betslip
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 4L5 7L8 4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>

            <div className="flex items-center gap-3">
                <span className="text-xs font-black text-white/50">QUICK BET</span>
                <button
                    onClick={() => setQuickBet(!quickBet)}
                    className="relative w-10 h-5 rounded-full transition-all"
                    style={{ background: quickBet ? '#10b981' : 'rgba(255,255,255,0.12)' }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ left: quickBet ? '1.25rem' : '0.125rem' }} />
                </button>
            </div>
        </div>
    );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ onRefresh }: { onRefresh: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-lg font-black text-white mb-2">No Events Available</h3>
            <p className="text-sm text-white/50 max-w-xs mb-6">
                Sportsradar feed is syncing. Events appear once live data is available.
            </p>
            <button onClick={onRefresh}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208]">
                ↻ Refresh
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SportsRadarMainContent({ selectedSportId }: Props) {
    const [matches, setMatches] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('highlights');
    const [activeSportFilter, setActiveSportFilter] = useState<string | null>(null);
    const [activeSportName, setActiveSportName] = useState('Basketball');
    const scrollRef = useRef<HTMLDivElement>(null);
    const REFRESH_MS = 10_000;

    const fetchEvents = useCallback(async () => {
        try {
            const data = await sportsbookApi.getEvents();
            setMatches(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[Sportsbook] fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
        const timer = setInterval(fetchEvents, REFRESH_MS);
        return () => clearInterval(timer);
    }, [fetchEvents]);

    const activeFilter = activeSportFilter ?? (selectedSportId?.startsWith('sr:') ? selectedSportId : null);

    const filteredMatches = useMemo(() => {
        let list = activeFilter
            ? matches.filter(m => String((m as any).sport_id) === activeFilter)
            : [...matches];
        return list.sort((a, b) => {
            const aLive = (a.match_status === 'Live' || a.match_status === 'In Play') ? 0 : 1;
            const bLive = (b.match_status === 'Live' || b.match_status === 'In Play') ? 0 : 1;
            if (aLive !== bLive) return aLive - bLive;
            return new Date(a.open_date || 0).getTime() - new Date(b.open_date || 0).getTime();
        });
    }, [matches, activeFilter]);

    const featuredMatch = filteredMatches[0] ?? null;
    const heroScrollMatches = filteredMatches.slice(0, 8);

    return (
        <main className="flex-1 flex flex-col overflow-hidden bg-[#06080c]">

            {/* ── TAB BAR ──────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 border-b border-white/[0.08] bg-[#06080c]/98">
                <div className="flex items-center gap-1 px-4 py-2">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-wide transition-all border ${
                                activeTab === tab.id
                                    ? 'bg-white/[0.08] text-white border-white/[0.12]'
                                    : 'text-white/50 border-transparent hover:text-white/70'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── SCROLLABLE CONTENT ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

                <div className="px-3 pt-3 pb-2">
                    {loading ? <HeroSkeleton /> : <HeroBanner match={featuredMatch} />}
                </div>

                <div className="pb-3">
                    <div ref={scrollRef}
                        className="flex gap-3 px-3 overflow-x-auto pb-1"
                        style={{ scrollbarWidth: 'none' }}>
                        {loading
                            ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
                            : heroScrollMatches.map((m, i) => (
                                <HScrollMatchCard key={m.event_id} match={m} colorIndex={i} />
                            ))
                        }
                    </div>
                </div>

                {/* ── POPULAR SECTION ──────────────────────────────────────── */}
                <div className="px-4 pb-2 pt-1">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">👑</span>
                        <h2 className="text-[16px] font-black text-white">Popular</h2>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {SPORT_FILTERS.map((sport, i) => {
                            const isActive = activeSportName === sport.name;
                            return (
                                <button
                                    key={`${sport.name}-${i}`}
                                    onClick={() => {
                                        setActiveSportFilter(sport.id);
                                        setActiveSportName(sport.name);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-black whitespace-nowrap transition-all flex-shrink-0"
                                    style={isActive ? {
                                        background: sport.color + '22',
                                        border: `1px solid ${sport.color}55`,
                                        color: sport.color,
                                    } : {
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'rgba(255,255,255,0.7)',
                                    }}>
                                    <span className="text-sm leading-none">{sport.emoji}</span>
                                    {sport.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── MATCH LIST ────────────────────────────────────────────── */}
                <div className="rounded-xl mx-3 mb-4 overflow-hidden bg-white/[0.02] border border-white/[0.05]">
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
                        : filteredMatches.length === 0
                        ? <EmptyState onRefresh={fetchEvents} />
                        : filteredMatches.slice(0, 15).map(m => (
                            <MatchRow key={m.event_id} match={m} />
                        ))
                    }
                </div>

                <div className="h-4" />
            </div>

            {/* ── BETSLIP BAR ──────────────────────────────────────────────── */}
            <BetslipBar />
        </main>
    );
}
