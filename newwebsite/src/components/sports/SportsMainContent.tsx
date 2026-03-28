'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    Trophy, Activity, Layers, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { sportsApi, Event, MatchOddSummary } from '@/services/sports';
import SkeletonMatchGroup from '@/components/shared/SkeletonMatchGroup';
import type { IconType } from 'react-icons';
import { IoStar, IoFootball, IoTennisball, IoRibbon, IoPeople, IoPodium, IoDisc, IoBasketball, IoFitness, IoGlobe, IoFlash } from 'react-icons/io5';
import { GiCricketBat } from 'react-icons/gi';
import { useBets } from '@/context/BetContext';
import OneClickBetControls from '@/components/sports/OneClickBetControls';
import { showBetErrorToast, showBetPlacedToast } from '@/utils/betToasts';

// ─── Country → flag ────────────────────────────────────────────────────────────
const FLAG_MAP: Record<string, string> = {
    IN: '🇮🇳', GB: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', AU: '🇦🇺', ZA: '🇿🇦', NZ: '🇳🇿', PK: '🇵🇰', WI: '🌴',
    BD: '🇧🇩', SL: '🇱🇰', AF: '🇦🇫', ZW: '🇿🇼', IE: '🇮🇪', NL: '🇳🇱',
    US: '🇺🇸', ES: '🇪🇸', DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', BR: '🇧🇷', AR: '🇦🇷',
    JP: '🇯🇵', KR: '🇰🇷', CN: '🇨🇳', MX: '🇲🇽', CA: '🇨🇦', PT: '🇵🇹', SE: '🇸🇪',
    RU: '🇷🇺', TR: '🇹🇷', SA: '🇸🇦', AE: '🇦🇪', EG: '🇪🇬', KE: '🇰🇪', NG: '🇳🇬',
    TH: '🇹🇭', ID: '🇮🇩', MY: '🇲🇾', PH: '🇵🇭', VN: '🇻🇳', SG: '🇸🇬',
};
const getFlag = (code?: string) => code ? (FLAG_MAP[code.toUpperCase()] ?? null) : null;

// ─── Sport definitions (matches mobile app exactly) ─────────────────────────
const ALL_SPORTS: { id: string | null; name: string; Icon: IconType; color: string }[] = [
    { id: null,  name: 'Popular',      Icon: IoStar,        color: '#f59e0b' },
    { id: '4',   name: 'Cricket',      Icon: GiCricketBat,  color: '#10b981' },
    { id: '1',   name: 'Football',     Icon: IoFootball,    color: '#3b82f6' },
    { id: '2',   name: 'Tennis',       Icon: IoTennisball,  color: '#eab308' },
    { id: '10',  name: 'Horse Racing', Icon: IoRibbon,      color: '#a855f7' },
    { id: '66',  name: 'Kabaddi',      Icon: IoPeople,      color: '#ef4444' },
    { id: '40',  name: 'Politics',     Icon: IoPodium,      color: '#6366f1' },
    { id: '8',   name: 'Table Tennis', Icon: IoDisc,        color: '#f97316' },
    { id: '15',  name: 'Basketball',   Icon: IoBasketball,  color: '#ec4899' },
    { id: '6',   name: 'Boxing',       Icon: IoFitness,     color: '#dc2626' },
    { id: '18',  name: 'Volleyball',   Icon: IoGlobe,       color: '#14b8a6' },
    { id: '22',  name: 'Badminton',    Icon: IoFlash,       color: '#8b5cf6' },
];

interface SportsMainContentProps {
    selectedSportId: string | null;
    activeTab?: 'live' | 'line';
    matches?: Event[];
    onSelectSport?: (id: string | null) => void;
}

// ─── Shimmer Skeleton ──────────────────────────────────────────────────────────
function ShimmerCard() {
    return (
        <div className="bg-[#141619] rounded-2xl border border-white/5 overflow-hidden animate-pulse">
            <div className="flex justify-between items-center px-3 py-2.5 border-b border-white/[0.03]">
                <div className="h-2.5 w-28 bg-white/6 rounded" />
                <div className="h-5 w-12 bg-white/6 rounded-md" />
            </div>
            <div className="px-3 py-3 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/6" />
                    <div className="h-3 flex-1 bg-white/6 rounded" />
                    <div className="h-4 w-8 bg-white/6 rounded" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/6" />
                    <div className="h-3 w-28 bg-white/6 rounded" />
                    <div className="h-4 w-8 bg-white/6 rounded" />
                </div>
            </div>
            <div className="flex gap-1.5 px-3 pb-3">
                {[1,2,3].map(i => <div key={i} className="flex-1 h-9 bg-white/5 rounded-lg" />)}
            </div>
        </div>
    );
}

// ─── Mobile Match Card (matches mobile app's MatchCard exactly) ────────────────
function MobileMatchCard({
    match,
    onOddsClick,
    oneClickEnabled,
    isOneClickPending,
    teamIcons,
}: {
    match: Event;
    onOddsClick: (match: Event, odd: MatchOddSummary, e: React.MouseEvent<HTMLButtonElement>) => void;
    oneClickEnabled: boolean;
    isOneClickPending: (eventId: string, marketId: string, selectionId: string) => boolean;
    teamIcons?: Record<string, string>;
}) {
    const router = useRouter();
    const homeTeam = match.home_team || match.event_name?.split(' v ')[0] || match.event_name || '';
    const awayTeam = match.away_team || match.event_name?.split(' v ')[1] || '';
    const isLive    = match.match_status === 'In Play' || match.match_status === 'Live';
    const isDone    = match.match_status === 'Completed' || match.match_status === 'Ended';
    const flag      = getFlag(match.competition?.country_code);
    const homeIcon  = teamIcons?.[homeTeam.toLowerCase().trim()];
    const awayIcon  = teamIcons?.[awayTeam.toLowerCase().trim()];

    return (
        <div
            onClick={() => router.push(`/sports/match/${match.event_id}`)}
            className={`relative block bg-[#1a1d21] rounded-2xl border overflow-hidden transition-all hover:border-white/10 ${
                isLive ? 'border-emerald-500/12' : 'border-white/[0.06]'
            }`}
        >
            {/* live top stripe */}
            {isLive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500/40" />}

            {/* Card Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.03]">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Trophy size={9} className="text-emerald-400/50 flex-shrink-0" />
                    <span className="text-emerald-400/60 text-[10px] font-semibold truncate">
                        {(match as any).competition_name || match.competition?.competition_name || ''}
                    </span>
                </div>
                {isLive ? (
                    <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex-shrink-0 ml-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-400 text-[9px] font-black">LIVE</span>
                    </div>
                ) : isDone ? (
                    <span className="text-white/20 text-[9px] font-bold ml-2 flex-shrink-0">ENDED</span>
                ) : (
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <Activity size={8} className="text-white/25" />
                        <span className="text-white/25 text-[9px] font-semibold">{match.match_status || 'Upcoming'}</span>
                    </div>
                )}
            </div>

            {/* Teams */}
            <div className="px-3 py-2.5 flex flex-col gap-2">
                {/* Home */}
                <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.04] border overflow-hidden ${isLive ? 'border-emerald-500/15' : 'border-white/[0.06]'}`}>
                        {homeIcon
                            ? <img src={homeIcon} alt="" className="w-full h-full object-contain p-0.5" />
                            : flag
                                ? <span className="text-sm leading-none">{flag}</span>
                                : <span className="text-[10px] font-black text-white/40">{homeTeam.substring(0, 2).toUpperCase()}</span>
                        }
                    </div>
                    <span className="flex-1 text-white text-[13px] font-bold truncate">{homeTeam}</span>
                    {match.score1 != null && (
                        <span className={`text-base font-black min-w-[24px] text-right ${isLive ? 'text-emerald-400' : 'text-white'}`}>
                            {match.score1}
                        </span>
                    )}
                </div>

                {/* VS divider */}
                <div className="flex items-center gap-2 pl-2">
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span className="text-[8px] font-black text-white/15">VS</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                </div>

                {/* Away */}
                {awayTeam && (
                    <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.04] border overflow-hidden ${isLive ? 'border-emerald-500/15' : 'border-white/[0.06]'}`}>
                            {awayIcon
                                ? <img src={awayIcon} alt="" className="w-full h-full object-contain p-0.5" />
                                : flag
                                    ? <span className="text-sm leading-none">{flag}</span>
                                    : <span className="text-[10px] font-black text-white/40">{awayTeam.substring(0, 2).toUpperCase()}</span>
                            }
                        </div>
                        <span className="flex-1 text-white text-[13px] font-bold truncate">{awayTeam}</span>
                        {match.score2 != null && (
                            <span className={`text-base font-black min-w-[24px] text-right ${isLive ? 'text-emerald-400' : 'text-white'}`}>
                                {match.score2}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Match Odds Row — shown when odds are available */}
            {(match as any).match_odds?.length > 0 ? (
                <div className="px-2.5 pb-2.5 pt-1.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-0.5">
                            <ChevronRight size={9} className="text-white/20" />
                            <span className="text-[9px] font-black text-white/25 uppercase tracking-wider">Match Odds</span>
                        </div>
                        {oneClickEnabled && (
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                1-Tap
                            </span>
                        )}
                    </div>
                    <div className="flex gap-1">
                        {(match.match_odds || []).map((o, i) => {
                            const pending = o.marketId && o.selectionId
                                ? isOneClickPending(match.event_id, o.marketId, o.selectionId)
                                : false;
                            const isClickable = !isDone && !!o.back && !!o.marketId && !!o.selectionId;

                            return (
                                <button
                                    key={`${o.marketId}-${o.selectionId}-${i}`}
                                    type="button"
                                    disabled={!isClickable || pending}
                                    onClick={(e) => onOddsClick(match, o, e)}
                                    className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-[8px] min-w-0 transition-all ${
                                        isClickable && !pending
                                            ? 'hover:brightness-110 active:scale-[0.98] cursor-pointer'
                                            : 'cursor-not-allowed opacity-60'
                                    }`}
                                    style={{ backgroundColor: 'rgba(18,100,179,0.12)', border: '1px solid rgba(18,100,179,0.22)' }}
                                >
                                    <span className="text-[8px] text-white/35 font-semibold truncate w-full text-center leading-none mb-1">
                                        {o.name}
                                    </span>
                                    <span className="text-[13px] font-black leading-none" style={{ color: o.back ? '#5BB7FF' : 'rgba(255,255,255,0.2)' }}>
                                        {pending ? '...' : (o.back ?? '-')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-end px-3 py-2 border-t border-white/[0.03]">
                    <div className="flex items-center gap-1">
                        <span className="text-[#f0c040] text-[10px] font-black">View</span>
                        <ChevronRight size={10} className="text-[#f0c040]" />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SportsMainContent({
    selectedSportId, matches: propMatches, onSelectSport
}: SportsMainContentProps) {
    const [internalMatches, setInternalMatches] = useState<Event[]>([]);
    const [loading, setLoading]   = useState(!propMatches);
    const [topEventIds, setTopEventIds] = useState<Set<string>>(new Set());
    const [teamIcons, setTeamIcons] = useState<Record<string, string>>({});
    const {
        addBet,
        placeSingleBet,
        oneClickEnabled,
        oneClickStake,
        isOneClickPending,
    } = useBets();

    const activeMatches = propMatches || internalMatches;

    const handleMatchOddsClick = async (
        match: Event,
        odd: MatchOddSummary,
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        e.preventDefault();
        e.stopPropagation();

        if (!odd.back || !odd.marketId || !odd.selectionId) return;

        const bet = {
            eventId: match.event_id,
            eventName: match.event_name,
            marketId: odd.marketId,
            marketName: odd.marketName || 'Match Odds',
            selectionId: odd.selectionId,
            selectionName: odd.name,
            odds: odd.back,
            betType: odd.betType || 'back' as const,
        };

        if (!oneClickEnabled) {
            addBet(bet);
            return;
        }

        try {
            await placeSingleBet(bet);
            showBetPlacedToast({
                selectionName: odd.name,
                stake: oneClickStake,
            });
        } catch (error: any) {
            if (error?.message === 'Login required') return;
            showBetErrorToast(error);
        }
    };

    // ── Fetch ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (propMatches) { setLoading(false); return; }
        let isActive = true;
        const run = async (showLoader = false) => {
            if (showLoader) setLoading(true);
            try {
                const [allData, tops] = await Promise.all([
                    sportsApi.getAllEvents(selectedSportId || undefined),
                    sportsApi.getTopEvents(),
                ]);
                // Fetch team icons once
                sportsApi.getTeamIcons().then(setTeamIcons).catch(() => {});
                if (!isActive) return;
                if (tops && Array.isArray(tops)) setTopEventIds(new Set(tops.map((t: any) => String(t.event_id))));
                if (allData && Array.isArray(allData)) {
                    console.log(`[Sports] API returned ${allData.length} events for sportId=${selectedSportId ?? 'all'}`);
                    if (allData.length > 0) {
                        const sample = allData[0];
                        console.log('[Sports] Sample event fields:', {
                            event_id: sample.event_id,
                            event_name: sample.event_name,
                            match_status: sample.match_status,
                            sport_id: (sample as any).sport_id,
                            competition_sport_id: sample.competition?.sport?.sport_id,
                            competition_sport_id_direct: (sample as any).competition?.sport_id,
                            competition_name: sample.competition_name || sample.competition?.competition_name,
                        });
                        // Log unique sport_ids to see what came back
                        const sportIds = [...new Set(allData.map((e: any) =>
                            e.sport_id ?? e.competition?.sport?.sport_id ?? e.competition?.sport_id ?? 'MISSING'
                        ))];
                        console.log('[Sports] Unique sport_ids in response:', sportIds);
                    }
                    const sorted = allData.sort((a, b) => {
                        const aA = a.markets?.some(m => m.is_active);
                        const bA = b.markets?.some(m => m.is_active);
                        if (aA && !bA) return -1; if (!aA && bA) return 1;
                        const ts = (d: string) => { if (!d) return 0; const t = new Date(d).getTime(); return isNaN(t) ? 0 : t; };
                        return ts(a.open_date) - ts(b.open_date);
                    });
                    setInternalMatches(sorted);
                } else {
                    console.warn('[Sports] API returned empty or non-array:', allData);
                    setInternalMatches([]);
                }
            } catch(err) {
                if (!isActive) return;
                console.error('[Sports] Error fetching events:', err);
                setInternalMatches([]);
            }
            finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        run(true);
        const intervalId = window.setInterval(() => {
            run(false);
        }, 15000);

        return () => {
            isActive = false;
            window.clearInterval(intervalId);
        };
    }, [propMatches, selectedSportId]);

    // ── Derived ──────────────────────────────────────────────────────────────
    const liveCount = useMemo(() =>
        activeMatches.filter(m => m.match_status === 'In Play' || m.match_status === 'Live').length,
    [activeMatches]);

    const filteredMatches = useMemo(() => {
        let list: Event[];
        if (selectedSportId) {
            // Backend returns ALL events — filter by sport on the frontend.
            list = activeMatches.filter(m => {
                const sid = String(selectedSportId);
                const match = (
                    String((m as any).sport_id) === sid ||
                    String(m.competition?.sport?.sport_id) === sid ||
                    String((m as any).competition?.sport_id) === sid
                );
                return match;
            });
            console.log(`[Sports] Filter: selectedSportId=${selectedSportId}, total=${activeMatches.length}, afterFilter=${list.length}`);
            if (list.length === 0 && activeMatches.length > 0) {
                const sample = activeMatches[0];
                console.warn('[Sports] FILTER MISMATCH - sample event sport fields:', {
                    sport_id: (sample as any).sport_id,
                    comp_sport_sport_id: sample.competition?.sport?.sport_id,
                    comp_sport_id: (sample as any).competition?.sport_id,
                });
            }
        } else {
            // "Popular" mode — show only top/pinned events
            list = activeMatches.filter(m => topEventIds.has(String(m.event_id)));
            console.log(`[Sports] Popular mode: total=${activeMatches.length}, afterTopFilter=${list.length}`);
        }
        // Sort: live events first, then by open_date
        list = [...list].sort((a, b) => {
            const aLive = a.match_status === 'In Play' || a.match_status === 'Live' ? 0 : 1;
            const bLive = b.match_status === 'In Play' || b.match_status === 'Live' ? 0 : 1;
            if (aLive !== bLive) return aLive - bLive;
            const ts = (d: string) => { if (!d) return 0; const t = new Date(d).getTime(); return isNaN(t) ? 0 : t; };
            return ts(a.open_date) - ts(b.open_date);
        });
        console.log(`[Sports] Final list: ${list.length}`);
        return list;
    }, [activeMatches, selectedSportId, topEventIds]);

    const groupedMatches = useMemo(() => {
        const g: Record<string, Event[]> = {};
        filteredMatches.forEach(m => {
            const k = m.competition?.competition_name || 'Other';
            if (!g[k]) g[k] = [];
            g[k].push(m);
        });
        return g;
    }, [filteredMatches]);

    const selectedSportData = ALL_SPORTS.find(s => s.id === selectedSportId) || ALL_SPORTS[0];

    return (
        <main className="flex-1 bg-[#0C0D0F] pb-[100px] md:pb-20 xl:mr-[64px] overflow-y-auto overflow-x-hidden w-full">

            {/* ══════════════════════════════════════════════════
                MOBILE LAYOUT  (md:hidden)
                matches mobile app SportsScreen exactly
            ══════════════════════════════════════════════════ */}
            <div className="md:hidden flex flex-col h-full">

                {/* ── HEADER (gradient like mobile) ─────────────────────── */}
                <div className="bg-gradient-to-b from-[#1A1D21] to-[#141619] px-3.5 pt-3 pb-3 border-b border-white/[0.04]">
                    {/* Title row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center border border-[#f0c040]/20 bg-[#f0c040]/10">
                                <Trophy size={15} className="text-[#f0c040]" />
                            </div>
                            <div>
                                <h1 className="text-white text-xl font-black tracking-[0.3px]">Sports</h1>
                                <p className="text-white/30 text-[10px] font-semibold mt-0.5">
                                    {loading ? 'Loading...' : `${filteredMatches.length} events available`}
                                </p>
                            </div>
                        </div>
                        {!loading && liveCount > 0 && (
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-[10px]">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-emerald-400 text-[11px] font-black">{liveCount} LIVE</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SPORT PILLS ───────────────────────────────────────── */}
                <div className="border-b border-white/[0.04] bg-[#0C0D0F]">
                    <div className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                        {ALL_SPORTS.map(sport => {
                            const active = selectedSportId === sport.id;
                            return (
                                <button
                                    key={sport.name}
                                    onClick={() => onSelectSport?.(sport.id)}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border text-[11px] font-bold whitespace-nowrap transition-all"
                                    style={active ? {
                                        backgroundColor: sport.color + '20',
                                        borderColor:     sport.color + '40',
                                        color:           sport.color,
                                    } : {
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                        borderColor:     'rgba(255,255,255,0.06)',
                                        color:           'rgba(255,255,255,0.4)',
                                    }}
                                >
                                    {(() => { const SIcon = sport.Icon; return <SIcon size={13} />; })()}
                                    {sport.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── STATS BAR ─────────────────────────────────────────── */}
                <div className="flex items-center gap-1.5 px-3 pt-3 pb-1.5">
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] rounded-md">
                        {(() => { const SIcon = selectedSportData.Icon; return <SIcon size={10} style={{ color: selectedSportData.color }} />; })()}
                        <span className="text-white/30 text-[9px] font-bold">{selectedSportData.name}</span>
                    </div>
                    {!loading && (
                        <>
                            <div className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] rounded-md">
                                <Layers size={9} className="text-white/30" />
                                <span className="text-white/30 text-[9px] font-bold">{filteredMatches.length} matches</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] rounded-md">
                                <Trophy size={9} className="text-white/30" />
                                <span className="text-white/30 text-[9px] font-bold">{Object.keys(groupedMatches).length} leagues</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-3 pb-1.5">
                    <OneClickBetControls />
                </div>

                {/* ── MATCH LIST ────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-3 pb-4">
                    {loading ? (
                        <div className="flex flex-col gap-3 pt-3">
                            {[1,2,3,4].map(i => <ShimmerCard key={i} />)}
                        </div>
                    ) : filteredMatches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                                <Trophy size={32} className="text-white/10" />
                            </div>
                            <p className="text-white/50 text-base font-black">No Events Found</p>
                            <p className="text-white/25 text-xs font-medium">No upcoming events in this category</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5 pt-3">
                            {Object.entries(groupedMatches).map(([tournament, tMatches]) => {
                                const hasLive = tMatches.some(m => m.match_status === 'In Play' || m.match_status === 'Live');
                                return (
                                    <div key={tournament} className="flex flex-col gap-2">
                                        {/* Tournament Header */}
                                        <div className="flex items-center gap-2 pb-2">
                                            <div className={`w-0.5 h-[18px] rounded-full ${hasLive ? 'bg-emerald-500' : 'bg-[#f0c040]'}`} />
                                            <span className="text-white text-[11px] font-black uppercase tracking-[0.5px] flex-1 truncate">{tournament}</span>
                                            {hasLive && (
                                                <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                    <span className="text-emerald-400 text-[8px] font-black">LIVE</span>
                                                </div>
                                            )}
                                            <div className="bg-white/[0.04] border border-white/5 px-1.5 py-0.5 rounded-lg">
                                                <span className="text-white/30 text-[10px] font-bold">{tMatches.length}</span>
                                            </div>
                                        </div>
                                        {/* Match Cards */}
                                        {tMatches.map(match => (
                                            <MobileMatchCard
                                                key={match.event_id}
                                                match={match}
                                                onOddsClick={handleMatchOddsClick}
                                                oneClickEnabled={oneClickEnabled}
                                                isOneClickPending={isOneClickPending}
                                                teamIcons={teamIcons}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>


            {/* ══════════════════════════════════════════════════
                DESKTOP LAYOUT  (hidden md:block)
                unchanged from previous implementation
            ══════════════════════════════════════════════════ */}
            <div className="hidden md:block">
                {/* Ambient glow */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#1A1D21] to-transparent pointer-events-none" />

                {/* Banner */}
                <div className="p-4 pb-0 relative z-10">
                    <div className="w-full h-[130px] md:h-[200px] rounded-2xl relative overflow-hidden flex items-center px-4 md:px-8 mb-6 shadow-2xl shadow-black/40">
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-[#1A1D21] to-[#7f6000]/20" />
                        <div className="absolute -right-20 -top-20 w-[300px] h-[300px] bg-[#f0c040]/10 rounded-full blur-[80px]" />
                        <div className="z-10 relative max-w-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-[#f0c040] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Update</span>
                                <span className="text-[11px] font-bold text-white/60 tracking-wide uppercase">Security Notice</span>
                            </div>
                            <h2 className="text-xl md:text-4xl font-black text-white mb-2 leading-[0.9] drop-shadow-lg tracking-tight">
                                SECURE YOUR <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f0c040] to-white">WINNINGS</span>
                            </h2>
                            <p className="hidden md:block text-sm text-white/50 font-medium max-w-sm leading-relaxed">
                                Enable 2FA today to keep your account safe.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Desktop header row */}
                <div className="px-6 mb-5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#1A1D21] border border-white/5 flex items-center justify-center text-[#f0c040]">
                            <Trophy size={18} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">
                                {selectedSportData.name}
                            </h2>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
                                {filteredMatches.length} Active Events
                            </p>
                        </div>
                    </div>
                    {liveCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Live Now
                        </div>
                    )}
                </div>

                <div className="px-6 mb-5 relative z-10">
                    <OneClickBetControls />
                </div>

                {/* Desktop match list */}
                <div className="border-t border-white/5 relative z-10">
                    {loading ? (
                        <div className="flex flex-col gap-8 p-6 pb-32">
                            <SkeletonMatchGroup cards={3} />
                            <SkeletonMatchGroup cards={3} />
                            <SkeletonMatchGroup cards={2} />
                        </div>
                    ) : filteredMatches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-50">
                            <Trophy size={64} className="text-white/10" />
                            <span className="text-sm text-white/50 font-bold uppercase tracking-wider">No Events Found</span>
                            <p className="text-xs text-white/30">Try selecting a different sport or filter.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8 p-6 pb-32">
                            {Object.entries(groupedMatches).map(([tournamentName, matches]) => (
                                <div key={tournamentName} className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2 px-1 border-b border-white/5 pb-2">
                                        <div className="w-1 h-5 bg-[#f0c040] rounded-full" />
                                        <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight truncate">{tournamentName}</h3>
                                        <span className="text-[10px] font-bold text-white/40 bg-white/5 px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0">
                                            {matches.length}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {matches.map(match => (
                                            <MobileMatchCard
                                                key={match.event_id}
                                                match={match}
                                                onOddsClick={handleMatchOddsClick}
                                                oneClickEnabled={oneClickEnabled}
                                                isOneClickPending={isOneClickPending}
                                                teamIcons={teamIcons}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
