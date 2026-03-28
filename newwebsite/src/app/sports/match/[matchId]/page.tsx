"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from "@/components/layout/Header";
import { sportsApi, Event } from '@/services/sports';
import { ChevronLeft, Calendar, Activity, Trophy, ChevronDown, Tv } from 'lucide-react';
import { getFlagByCode, getRegionFlag } from '@/config/countries';
import { useBets } from '@/context/BetContext';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import RightSidebar from '@/components/layout/RightSidebar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import GamesRail from '@/components/layout/GamesRail';
import OneClickBetControls from '@/components/sports/OneClickBetControls';
import { showBetErrorToast, showBetPlacedToast } from '@/utils/betToasts';

// Helper to format date
const formatDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
};

// Helper for team flags
function getFlagCode(teamName?: string) {
    if (!teamName) return 'un';
    const lower = teamName.toLowerCase();
    if (lower.includes('india')) return 'in';
    if (lower.includes('australia')) return 'au';
    if (lower.includes('new zealand')) return 'nz';
    if (lower.includes('afghanistan')) return 'af';
    if (lower.includes('england')) return 'gb-eng';
    if (lower.includes('nepal')) return 'np';
    if (lower.includes('sri lanka')) return 'lk';
    if (lower.includes('ireland')) return 'ie';
    if (lower.includes('pakistan')) return 'pk';
    if (lower.includes('bangladesh')) return 'bd';
    if (lower.includes('south africa')) return 'za';
    if (lower.includes('west indies')) return 'kn';
    return 'un';
}

export default function MatchDetailPage() {
    // Proxies upstream TV/score URLs through our backend to bypass CSP frame-ancestors.
    // Ensure NEXT_PUBLIC_API_URL is set to your zeero.bet backend (e.g. https://api.zeero.bet)
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9828').replace(/\/$/, '');
    const proxyUrl = (url: string | null) =>
        url ? `${API_BASE}/sports/stream-proxy?url=${encodeURIComponent(url)}` : null;
    const params = useParams();
    const router = useRouter();
    const [match, setMatch] = useState<Event | null>(null);
    const [matchDetails, setMatchDetails] = useState<any>(null);
    const [tvUrl, setTvUrl] = useState<string | null>(null);
    const [scoreUrl, setScoreUrl] = useState<string | null>(null);
    const [mediaView, setMediaView] = useState<'match' | 'tv' | 'scorecard' | 'livescore'>('match');
    const [isFetchingMedia, setIsFetchingMedia] = useState(false);
    const [loading, setLoading] = useState(true);
    const [liveMarkets, setLiveMarkets] = useState<Map<string, any>>(new Map());
    const {
        addBet,
        placeSingleBet,
        oneClickEnabled,
        oneClickStake,
        isOneClickPending,
    } = useBets();
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('all');
    const [activeSidebarTab, setActiveSidebarTab] = useState<'live' | 'line'>('line');
    const sportIdRef = useRef<string | null>(null);
    const [teamIcons, setTeamIcons] = useState<Record<string, string>>({});

    const matchId = params.matchId as string;

    useEffect(() => {
        if (!matchId) return;

        const fetchMatch = async () => {
            try {
                const data = await sportsApi.getMatchDetails(matchId);
                setMatch(data);

                // Read sport_id from flat field (joined from competition in backend)
                // Also try competition.sport.sport_id for compatibility
                const sportIdStr = String(
                    (data as any).sport_id ||
                    data?.competition?.sport?.sport_id ||
                    ''
                );

                if (!sportIdStr) {
                    console.warn('[MatchPage] sport_id not found in match data, TV/score APIs skipped', data);
                } else {
                    console.log(`[MatchPage] Fetching TV+Score for matchId=${matchId} sportId=${sportIdStr}`);

                    // Fire all four in parallel — no gate, let each API decide
                    const [details, fetchedTvUrl, fetchedScoreUrl] = await Promise.all([
                        sportsApi.getMatchDetailsData(sportIdStr, matchId, user?.id),
                        sportsApi.getTvUrl(sportIdStr, matchId),
                        sportsApi.getScoreUrl(sportIdStr, matchId),
                    ]);

                    if (details) setMatchDetails(details);

                    // TV/Score: null when not live (API returns null / 404)
                    setTvUrl(fetchedTvUrl || null);
                    setScoreUrl(fetchedScoreUrl || null);
                }
            } catch (error) {
                console.error("Failed to load match details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMatch();

        // Fetch team icons once
        sportsApi.getTeamIcons().then(setTeamIcons).catch(() => {});

        // ── Aggressive HTTP Polling Fallback (Every 2 seconds) ────────────────────
        // Fetches from local DB (getMatchDetails) to avoid 429s on Diamond API,
        // and only updates the `match` state so `MarketAccordion` re-renders with new odds.
        const pollInterval = setInterval(async () => {
            if (!matchId) return;
            try {
                const refreshedMatch = await sportsApi.getMatchDetails(matchId);
                if (refreshedMatch) {
                    setMatch(refreshedMatch);
                }
            } catch {
                // Silently swallow polling errors to avoid console spam
            }
        }, 2000);

        return () => clearInterval(pollInterval);

    }, [matchId, user?.id]);


    // ── Store sportId whenever match loads ────────────────────────────────────
    useEffect(() => {
        if (match) {
            sportIdRef.current = String(
                (match as any).sport_id ||
                match?.competition?.sport?.sport_id ||
                ''
            );
        }
    }, [match]);

    // ── Join / leave the match room on the backend socket ─────────────────────
    useEffect(() => {
        if (!socket || !isConnected || !matchId) return;
        socket.emit('join-match', matchId);
        return () => {
            socket.emit('leave-match', matchId);
        };
    }, [socket, isConnected, matchId]);

    // ── 30-second heartbeat to keep viewer tracking alive ─────────────────────
    useEffect(() => {
        if (!socket || !isConnected || !matchId) return;
        const hb = setInterval(() => {
            socket.emit('match-heartbeat', matchId);
        }, 30_000);
        return () => clearInterval(hb);
    }, [socket, isConnected, matchId]);

    // ── Live socket-data listener → liveMarkets overlay ───────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleSocketData = (data: any) => {
            if (!data) return;

            setLiveMarkets(prev => {
                const next = new Map(prev);

                // Helper: get or create market entry
                const getMarket = (mid: string) => {
                    if (!next.has(mid)) next.set(mid, { runners: new Map(), suspended: false });
                    return next.get(mid)!;
                };

                // Helper: is gtype a fancy/session market?
                const isFancyGtype = (g?: string) => {
                    if (!g) return false;
                    const lower = g.toLowerCase();
                    return lower === 'session' || lower === 'fancy' || lower === 'fancy2' || lower === 'khado' || lower === 'meter' || lower === 'oddeven' || lower === 'other fancy';
                };

                // ── Unified handler for 'odds' / 'match_odds' packets (server's HTTP sync format) ──
                // Server emits: { messageType:'odds', data:[{bmi, mid, eid, ms, rt:[{ri, ib, rt, bv, nat}], gtype }] }
                if ((data.messageType === 'match_odds' || data.messageType === 'odds') && Array.isArray(data.data)) {
                    data.data.forEach((update: any) => {
                        const mid = String(update.bmi || update.mid || update.id || '');
                        if (!mid) return;
                        const mkt = getMarket(mid);
                        // ms: 1=active, 4=suspended
                        if (update.ms !== undefined) mkt.suspended = update.ms === 4;

                        // Detect if this is a fancy market by gtype
                        const fancy = isFancyGtype(update.gtype);

                        if (Array.isArray(update.rt)) {
                            update.rt.forEach((r: any) => {
                                const rid = String(r.ri ?? r.id ?? '');
                                if (!rid) return;
                                const existing = mkt.runners.get(rid) || {};
                                if (fancy) {
                                    // Fancy: treat all runners as back (YES) if ib=true, lay (NO) if ib=false
                                    if (r.ib) {
                                        // 'back' in fancy = YES
                                        mkt.runners.set(rid, { ...existing, backOdds: r.rt, backSize: r.bv });
                                        // Also expose b1/l1 at market level for single-runner fancy
                                        mkt.b1 = r.rt;
                                        mkt.bs1 = r.bv;
                                    } else {
                                        mkt.runners.set(rid, { ...existing, layOdds: r.rt, laySize: r.bv });
                                        mkt.l1 = r.rt;
                                        mkt.ls1 = r.bv;
                                    }
                                } else {
                                    // Match Odds / Bookmaker
                                    if (r.ib) {
                                        mkt.runners.set(rid, { ...existing, backOdds: r.rt, backSize: r.bv });
                                    } else {
                                        mkt.runners.set(rid, { ...existing, layOdds: r.rt, laySize: r.bv });
                                    }
                                }
                            });
                        }
                    });
                }

                // 2. Session / Fancy  (messageType: 'session_odds' | 'fancy_odds' | 'fancy')
                if (['session_odds', 'fancy_odds', 'fancy'].includes(data.messageType) && Array.isArray(data.data)) {
                    data.data.forEach((update: any) => {
                        const mid = String(update.id || update.mid || update.market_id || '');
                        if (!mid) return;
                        const mkt = getMarket(mid);
                        if (update.ms !== undefined) mkt.suspended = update.ms === 4;
                        // Store b1/l1 for fancy display
                        if (update.b1 !== undefined) mkt.b1 = update.b1;
                        if (update.l1 !== undefined) mkt.l1 = update.l1;
                        if (update.bs1 !== undefined) mkt.bs1 = update.bs1;
                        if (update.ls1 !== undefined) mkt.ls1 = update.ls1;
                        // runners_data-based updates (if present)
                        if (Array.isArray(update.rt)) {
                            update.rt.forEach((r: any) => {
                                const rid = String(r.ri ?? r.sid ?? r.id ?? '');
                                if (!rid) return;
                                const existing = mkt.runners.get(rid) || {};
                                mkt.runners.set(rid, { ...existing, backOdds: r.b1 ?? r.rt, layOdds: r.l1, backSize: r.bs1, laySize: r.ls1 });
                            });
                        }
                    });
                }

                // 3. Bookmaker  (messageType: 'bookmaker_odds' | 'bm_odds')
                if ((data.messageType === 'bookmaker_odds' || data.messageType === 'bm_odds') && Array.isArray(data.data)) {
                    data.data.forEach((update: any) => {
                        const mid = String(update.mid || update.id || update.bmi || '');
                        if (!mid) return;
                        const mkt = getMarket(mid);
                        if (update.ms !== undefined) mkt.suspended = update.ms === 4;
                        if (Array.isArray(update.rt)) {
                            update.rt.forEach((r: any) => {
                                const rid = String(r.ri ?? r.id ?? '');
                                if (!rid) return;
                                const existing = mkt.runners.get(rid) || {};
                                if (r.ib) {
                                    mkt.runners.set(rid, { ...existing, backOdds: r.rt, backSize: r.bv });
                                } else {
                                    mkt.runners.set(rid, { ...existing, layOdds: r.rt, laySize: r.bv });
                                }
                            });
                        }
                    });
                }

                // 4. Market status update  (top-level ms)
                if (data.ms !== undefined && data.id) {
                    const mid = String(data.id);
                    const mkt = getMarket(mid);
                    mkt.suspended = data.ms === 4;
                }

                return next;
            });
        };

        socket.on('socket-data', handleSocketData);
        return () => { socket.off('socket-data', handleSocketData); };
    }, [socket]);

    // ── Refetch the correct URL fresh on every tab switch ─────────────────────
    // TV and score URLs are one-time-use, so we clear + refetch each time.
    const handleMediaViewChange = async (view: 'match' | 'tv') => {
        const sid = sportIdRef.current;
        if (!sid) { setMediaView(view); return; }

        setMediaView(view);
        setIsFetchingMedia(true);

        try {
            if (view === 'tv') {
                setTvUrl(null); // unmount old iframe
                const freshUrl = await sportsApi.getTvUrl(sid, matchId);
                setTvUrl(freshUrl || null);
            } else {
                setScoreUrl(null); // unmount old iframe
                const freshUrl = await sportsApi.getScoreUrl(sid, matchId);
                setScoreUrl(freshUrl || null);
            }
        } catch { /* silent — iframe area will stay empty */ }

        setIsFetchingMedia(false);
    };

    const handleOddClick = async ({
        marketId,
        marketName,
        selectionId,
        selectionName,
        odds,
        rate,
        marketType,
        betType = 'back',
    }: {
        marketId: string;
        marketName: string;
        selectionId: string;
        selectionName: string;
        odds: number;
        rate?: number;
        marketType?: string;
        betType?: 'back' | 'lay';
    }) => {
        if (!odds || odds <= 1 || !match) return;

        const bet = {
            eventId: match.event_id,
            eventName: match.event_name,
            marketId,
            marketName,
            selectionId,
            selectionName,
            odds,
            rate,
            marketType,
            betType,
        };

        if (!oneClickEnabled) {
            addBet(bet);
            return;
        }

        try {
            await placeSingleBet(bet);
            showBetPlacedToast({
                selectionName,
                stake: oneClickStake,
            });
        } catch (error: any) {
            if (error?.message === 'Login required') return;
            showBetErrorToast(error);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-bg-base min-h-screen">
                <div className="flex-1 pt-[84px] flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
                <RightSidebar />
                <GamesRail />
            </div>
        );
    }

    if (!match) {
        return (
            <div className="flex bg-bg-base min-h-screen">
                <div className="flex-1 pt-[84px] flex flex-col items-center justify-center gap-4">
                    <Trophy size={48} className="text-text-muted opacity-50" />
                    <h2 className="text-lg font-bold text-white">Match Not Found</h2>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-bg-elevated text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
                    >
                        Go Back
                    </button>
                </div>
                <RightSidebar />
                <GamesRail />
            </div>
        );
    }

    const leagueName =
        match.competition_name ||                          // stored directly on event by TurnkeySyncService
        match.competition?.competition_name ||             // from $lookup join
        (matchDetails as any)?.cname ||                   // from Diamond API matchDetails
        (matchDetails as any)?.series ||                  // alternate field name
        (match as any)?.league_name ||                    // any other field
        match.competition?.sport?.sport_name ||           // fallback to sport name
        '';
    const countryCode = match.competition?.country_code;
    const flag = countryCode ? getFlagByCode(countryCode) : getRegionFlag(leagueName);

    // Time-based live detection (socket is disabled, match_status may never update)
    const parseOpenDate = (d: string) => {
        if (!d) return 0;
        if (d.includes('/Date(')) return parseInt(d.replace(/\/Date\((-?\d+)\)\//, '$1'));
        return new Date(d).getTime();
    };
    const matchStartedAt = parseOpenDate(match.open_date);
    const hasStarted = matchStartedAt > 0 && Date.now() >= matchStartedAt;
    const isCompleted = match.match_status === 'Completed';

    const isLive =
        match.match_status === 'In Play' ||
        match.match_status === 'Live' ||
        !!match.match_info ||
        (match as any).in_play ||
        matchDetails?.iplay ||
        (!isCompleted && hasStarted);


    const allMarkets = (match.markets || []).filter((m: any) => {
        // Exclude markets that are explicitly finished or closed.
        // Some APIs/DBs skip status field or use mstatus.
        const s = (m.status || m.mstatus || m.marketStatus || '').toUpperCase();
        if (s === 'CLOSED' || s === 'INACTIVE' || s === 'FINISHED') return false;
        
        return true;
    });

    const getMarketCategory = (marketName: string) => {
        const lower = marketName.toLowerCase();
        if (lower.includes('winner') || lower.includes('match') || lower.includes('1x2') || lower.includes('bookmaker')) return 'main';
        if (lower.includes('session') || lower.includes('over') || lower.includes('run') || lower.includes('fall') || lower.includes('wicket')) return 'session';
        if (lower.includes('fancy') || lower.includes('yes') || lower.includes('no')) return 'fancy';
        if (lower.includes('goal') || lower.includes('score')) return 'goals';
        return 'others';
    };

    // Group markets
    const categorizedMarkets: Record<string, any[]> = {
        'all': [],
        'main': [],
        'session': [],
        'fancy': [],
        'goals': [],
        'others': []
    };

    allMarkets.forEach(m => {
        const cat = getMarketCategory(m.market_name);
        categorizedMarkets[cat].push(m);
    });

    const sortedAllMarkets = [...allMarkets].sort((a, b) => {
        const catA = getMarketCategory(a.market_name);
        const catB = getMarketCategory(b.market_name);
        const countA = categorizedMarkets[catA].length;
        const countB = categorizedMarkets[catB].length;
        if (countA !== countB) return countA - countB;
        return a.market_name.localeCompare(b.market_name);
    });
    categorizedMarkets['all'] = sortedAllMarkets;

    // Available tabs (only show if has items)
    const availableTabs = ['all', 'main', 'session', 'fancy', 'goals', 'others'].filter(
        tab => categorizedMarkets[tab].length > 0 || tab === 'all'
    );

    // Ensure active tab is valid, else fallback to 'all'
    const currentMarkets = categorizedMarkets[activeTab] || categorizedMarkets['all'];



    return (
        <div className="h-screen overflow-hidden bg-[#141619] font-sans text-white flex flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <LeftSidebar
                    selectedSportId={match?.competition?.sport?.sport_id?.toString() || null}
                    onSelectSport={() => {
                        router.push('/sports');
                    }}
                    activeTab={activeSidebarTab}
                    onTabChange={setActiveSidebarTab}
                />
                <main className="flex-1 pt-[64px] md:pt-[84px] pb-20 xl:mr-[64px] overflow-y-auto overflow-x-hidden">

                    {/* 1. Header Card */}
                    <div className="bg-[#1a1d21] md:rounded-xl overflow-hidden border border-white/[0.06] mb-3 md:mx-4 md:mt-4">
                        {/* Breadcrumbs / Header Bar */}
                        <div className="px-4 py-3 bg-[#1e2126] flex items-center justify-between border-b border-white/[0.05]">
                            <button
                                onClick={() => router.back()}
                                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-semibold"
                            >
                                <ChevronLeft size={16} />
                                <span className="flex items-center gap-1.5">
                                    <span className="text-base leading-none">{flag}</span>
                                    <span className="truncate max-w-[200px]">{leagueName}</span>
                                </span>
                            </button>

                            {/* Status / Live */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1 text-white/30 text-[10px] font-medium">
                                    <Calendar size={10} />
                                    <span>{matchDetails?.stime ? formatDate(matchDetails.stime) : formatDate(match.open_date)}</span>
                                </div>
                                {isCompleted ? (
                                    <span className="bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold px-2 py-0.5 rounded">
                                        ENDED
                                    </span>
                                ) : isLive && (
                                    <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                        <Activity size={9} /> LIVE
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Media Tabs — Match Details + Live TV only */}
                        {(tvUrl || scoreUrl) && (
                            <div className="flex bg-[#202327] border-b border-white/5 px-3 md:px-6 gap-3 md:gap-6 overflow-x-auto scrollbar-hide">
                                <button
                                    onClick={() => handleMediaViewChange('match')}
                                    disabled={isFetchingMedia}
                                    className={`py-3 text-[11px] md:text-sm font-bold uppercase tracking-wider transition-colors border-b-2 outline-none ${mediaView === 'match' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-text-muted hover:text-white'}`}
                                >
                                    Match Details
                                </button>
                                {tvUrl && (
                                    <button
                                        onClick={() => handleMediaViewChange('tv')}
                                        disabled={isFetchingMedia}
                                        className={`py-3 text-[11px] md:text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 outline-none ${mediaView === 'tv' ? 'border-red-400 text-red-400' : 'border-transparent text-text-muted hover:text-white'}`}
                                    >
                                        <Tv size={14} /> Live TV
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Loading spinner while fetching a fresh URL */}
                        {isFetchingMedia && (
                            <div className="w-full flex items-center justify-center bg-[#141619]" style={{ height: '220px' }}>
                                <div className="w-7 h-7 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {/* TV tab — full-width iframe */}
                        {!isFetchingMedia && mediaView === 'tv' && tvUrl && (
                            <div className="w-full relative aspect-video bg-black">
                                <iframe
                                    key={tvUrl}
                                    src={proxyUrl(tvUrl)!}
                                    className="absolute inset-0 w-full h-full border-0"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                            </div>
                        )}

                        {/* Scorecard — visible on Match Details view only */}
                        {!isFetchingMedia && mediaView !== 'tv' && scoreUrl && (
                            <div className="w-full bg-[#141619]" style={{ height: '220px' }}>
                                <iframe
                                    key={scoreUrl}
                                    src={proxyUrl(scoreUrl)!}
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                />
                            </div>
                        )}

                        <div className="p-4 md:p-8 bg-gradient-to-b from-[#1a1b1e] to-[#141517] relative overflow-hidden">
                            {/* Background Decoration */}
                            <div className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-5 pointer-events-none" style={{ backgroundImage: 'url(/assets/pattern.png)' }}></div>

                            {/* ── MOBILE HERO ── matches mobile app MatchDetailScreen ── */}
                            <div className="flex flex-col items-center z-10 relative md:hidden">
                                {/* Ambient glow when live */}
                                {isLive && <div className="absolute inset-0 rounded-2xl bg-emerald-500/4 pointer-events-none" />}

                                {/* Teams row — initials badge | VS/Score | initials badge */}
                                <div className="flex items-center justify-between w-full gap-2">
                                    {/* Home */}
                                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${
                                            isLive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.05] border-white/[0.08]'
                                        }`}>
                                            {(() => {
                                                const ht = match.home_team || '';
                                                const iconUrl = teamIcons[ht.toLowerCase().trim()];
                                                if (iconUrl) return <img src={iconUrl} className="w-full h-full object-contain rounded-xl p-0.5" alt={ht} />;
                                                const code = getFlagCode(match.home_team);
                                                const isGeneric = code === 'un' || (countryCode && code === countryCode.toLowerCase());
                                                if (isGeneric) return (
                                                    <span className={`text-xl font-black ${
                                                        isLive ? 'text-emerald-400' : 'text-white/50'
                                                    }`}>
                                                        {(match.home_team || 'HM').substring(0, 2).toUpperCase()}
                                                    </span>
                                                );
                                                return <img src={`https://flagcdn.com/w80/${code}.png`} className="w-full h-full object-contain rounded-xl" alt={match.home_team} onError={(e) => { e.currentTarget.style.display = 'none' }} />;
                                            })()}
                                        </div>
                                        <h2 className="text-[13px] font-bold text-white text-center leading-tight truncate w-full px-1">
                                            {match.home_team || match.event_name.split(' v ')[0]}
                                        </h2>
                                    </div>

                                    {/* VS / Score */}
                                    <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                                        {isLive && (match.score1 || match.score2) ? (
                                            <div className="text-2xl font-black text-[#f0c040] tracking-widest font-mono">
                                                {match.score1 || '0'}<span className="text-white/20 mx-1">-</span>{match.score2 || '0'}
                                            </div>
                                        ) : isCompleted && (match.score1 || match.score2) ? (
                                            <div className="text-2xl font-black text-white/60 tracking-widest font-mono">
                                                {match.score1 || '0'}<span className="text-white/20 mx-1">-</span>{match.score2 || '0'}
                                            </div>
                                        ) : (
                                            <span className="text-2xl font-black text-white/10 tracking-widest">VS</span>
                                        )}
                                        {/* Status pill */}
                                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                                            isLive
                                                ? 'bg-emerald-500/10 border-emerald-500/20'
                                                : isCompleted
                                                    ? 'bg-white/[0.04] border-white/[0.06]'
                                                    : 'bg-white/[0.03] border-white/[0.04]'
                                        }`}>
                                            {isLive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                            <span className={`text-[9px] font-black uppercase tracking-wider ${
                                                isLive ? 'text-emerald-400' : isCompleted ? 'text-white/30' : 'text-white/25'
                                            }`}>
                                                {isCompleted ? 'Completed' : isLive ? 'In Progress' : 'Starting Soon'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Away */}
                                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${
                                            isLive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.05] border-white/[0.08]'
                                        }`}>
                                            {(() => {
                                                const at = match.away_team || '';
                                                const iconUrl = teamIcons[at.toLowerCase().trim()];
                                                if (iconUrl) return <img src={iconUrl} className="w-full h-full object-contain rounded-xl p-0.5" alt={at} />;
                                                const code = getFlagCode(match.away_team);
                                                const isGeneric = code === 'un' || (countryCode && code === countryCode.toLowerCase());
                                                if (isGeneric) return (
                                                    <span className={`text-xl font-black ${
                                                        isLive ? 'text-emerald-400' : 'text-white/50'
                                                    }`}>
                                                        {(match.away_team || 'AW').substring(0, 2).toUpperCase()}
                                                    </span>
                                                );
                                                return <img src={`https://flagcdn.com/w80/${code}.png`} className="w-full h-full object-contain rounded-xl" alt={match.away_team} onError={(e) => { e.currentTarget.style.display = 'none' }} />;
                                            })()}
                                        </div>
                                        <h2 className="text-[13px] font-bold text-white text-center leading-tight truncate w-full px-1">
                                            {match.away_team || match.event_name.split(' v ')[1]}
                                        </h2>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Layout: 3-column */}
                            <div className="hidden md:flex items-center justify-around relative z-10">
                                {/* Home Team */}
                                <div className="flex flex-col items-center gap-4 w-1/3">
                                    <div className="w-24 h-24 rounded-full bg-[#252830] flex items-center justify-center p-4 shadow-2xl border border-white/5 overflow-hidden">
                                        {(() => {
                                            const ht = match.home_team || '';
                                            const iconUrl = teamIcons[ht.toLowerCase().trim()];
                                            if (iconUrl) return <img src={iconUrl} className="w-full h-full object-contain" alt={ht} />;
                                            const code = getFlagCode(match.home_team);
                                            const isGeneric = code === 'un' || (countryCode && code === countryCode.toLowerCase());
                                            if (isGeneric) return <span className="text-6xl leading-none grayscale opacity-80">{flag}</span>;
                                            return <img src={`https://flagcdn.com/w160/${code}.png`} className="w-full h-full object-contain" alt={match.home_team} onError={(e) => { e.currentTarget.style.display = 'none' }} />;
                                        })()}
                                    </div>
                                    <h2 className="text-xl font-bold text-white text-center leading-tight">
                                        {match.home_team || match.event_name.split(' v ')[0]}
                                    </h2>
                                </div>

                                {/* VS / Score / TV */}
                                <div className="flex flex-col items-center justify-center gap-2 w-1/3 px-4">
                                    {(match.match_status === 'Live' || !!match.match_info || (match as any).in_play || matchDetails?.iplay || isCompleted) && (match.score1 || match.score2) ? (
                                        <div className="text-5xl font-black text-brand-gold tracking-widest drop-shadow-lg font-mono">
                                            {match.score1} - {match.score2}
                                        </div>
                                    ) : (
                                        <span className="text-4xl font-black text-white/10 tracking-widest">VS</span>
                                    )}
                                    <div className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1 mb-2">
                                        {isCompleted ? 'Completed' : ((match.match_status === 'Live' || !!match.match_info || (match as any).in_play || matchDetails?.iplay) ? 'In Progress' : 'Starting Soon')}
                                    </div>


                                </div>

                                {/* Away Team */}
                                <div className="flex flex-col items-center gap-4 w-1/3">
                                    <div className="w-24 h-24 rounded-full bg-[#252830] flex items-center justify-center p-4 shadow-2xl border border-white/5 overflow-hidden">
                                        {(() => {
                                            const at = match.away_team || '';
                                            const iconUrl = teamIcons[at.toLowerCase().trim()];
                                            if (iconUrl) return <img src={iconUrl} className="w-full h-full object-contain" alt={at} />;
                                            const code = getFlagCode(match.away_team);
                                            const isGeneric = code === 'un' || (countryCode && code === countryCode.toLowerCase());
                                            if (isGeneric) return <span className="text-6xl leading-none grayscale opacity-80">{flag}</span>;
                                            return <img src={`https://flagcdn.com/w160/${code}.png`} className="w-full h-full object-contain" alt={match.away_team} onError={(e) => { e.currentTarget.style.display = 'none' }} />;
                                        })()}
                                    </div>
                                    <h2 className="text-xl font-bold text-white text-center leading-tight">
                                        {match.away_team || match.event_name.split(' v ')[1]}
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-3 md:px-4 mb-3">
                        <OneClickBetControls />
                    </div>

                    {/* 2. Tabs Bar (Dynamic) — sticky on mobile */}
                    <div className="sticky top-0 z-20 bg-[#141619] border-b border-white/[0.04] md:bg-transparent md:border-0 md:static md:z-auto">
                        <div className="bg-[#1a1d21] md:rounded-xl p-1 flex items-center gap-1 mb-0 md:mb-3 overflow-x-auto scrollbar-hide border-0 md:border border-white/[0.06] mx-0 md:mx-4">
                            {availableTabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                                        activeTab === tab
                                            ? 'bg-[#252830] text-emerald-400'
                                            : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {tab}
                                    <span className={`text-[10px] px-1 py-0.5 rounded ${
                                        activeTab === tab ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/30'
                                    }`}>
                                        {categorizedMarkets[tab].length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. Markets Grid */}
                    <div className="px-0 md:px-4 space-y-0">
                        {currentMarkets.length === 0 ? (
                            <div className="text-center py-12 text-white/30">
                                <Trophy size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-bold">No markets in this category</p>
                            </div>
                        ) : (
                            currentMarkets.map(market => (
                                <MarketAccordion
                                    key={market.market_id}
                                    market={market}
                                    disabled={isCompleted}
                                    liveOverlay={liveMarkets.get(String(market.market_id))}
                                    onOddClick={handleOddClick}
                                    isOneClickPending={(selectionId) => (
                                        oneClickEnabled &&
                                        isOneClickPending(match.event_id, market.market_id, selectionId)
                                    )}
                                />
                            ))
                        )}
                    </div>

                </main>

                <RightSidebar />
                <GamesRail />
            </div >
        </div >
    );
}

// Sub-component for Accordion Market
function MarketAccordion({ market, disabled, liveOverlay, onOddClick, isOneClickPending }: {
    market: any;
    disabled?: boolean;
    liveOverlay?: { runners: Map<string, any>; suspended: boolean; b1?: any; l1?: any; bs1?: any; ls1?: any };
    onOddClick: (selection: {
        marketId: string;
        marketName: string;
        selectionId: string;
        selectionName: string;
        odds: number;
        rate?: number;
        marketType?: string;
        betType?: 'back' | 'lay';
    }) => void | Promise<void>;
    isOneClickPending?: (selectionId: string) => boolean;
}) {
    const [isOpen, setIsOpen] = useState(true);
    // Flash animation state — keyed by `${rid}_back` or `${rid}_lay`
    const prevOddsRef = useRef<Map<string, number>>(new Map());
    const [flashMap, setFlashMap] = useState<Map<string, 'up' | 'down'>>(new Map());

    // ── Flash detection runs in useEffect (NEVER during render) ───────────────
    useEffect(() => {
        if (!liveOverlay?.runners) return;
        const timers: ReturnType<typeof setTimeout>[] = [];

        liveOverlay.runners.forEach((live, rid) => {
            const pairs: Array<{ key: string; val: number | null }> = [
                { key: `${rid}_back`, val: live.backOdds != null ? Number(live.backOdds) : null },
                { key: `${rid}_lay`, val: live.layOdds != null ? Number(live.layOdds) : null },
            ];
            pairs.forEach(({ key, val }) => {
                if (val == null) return;
                const prev = prevOddsRef.current.get(key);
                if (prev !== undefined && prev !== val) {
                    const dir: 'up' | 'down' = val > prev ? 'up' : 'down';
                    setFlashMap(m => new Map(m).set(key, dir));
                    const t = setTimeout(() => setFlashMap(m => {
                        const next = new Map(m); next.delete(key); return next;
                    }), 800);
                    timers.push(t);
                }
                prevOddsRef.current.set(key, val);
            });
        });

        return () => timers.forEach(clearTimeout);
    }, [liveOverlay]);

    // Pure merge: DB odds + live overlay, no side-effects ─────────────────────
    const getLiveOdds = (runner: any) => {
        // Diamond API section uses `sid` as selection id. Fall back to other fields for safety.
        const rid = String(runner.sid ?? runner.selectionId ?? runner.ri ?? runner.id ?? '');
        const live = liveOverlay?.runners?.get(rid);
        const oddsArray = Array.isArray(runner.odds) ? runner.odds : [];
        const dbBack = oddsArray.find((o: any) => o.otype === 'back' && o.tno === 0) || oddsArray.find((o: any) => o.otype === 'back');
        const dbLay = oddsArray.find((o: any) => o.otype === 'lay' && o.tno === 0) || oddsArray.find((o: any) => o.otype === 'lay');

        // For fancy/session: fall back to market-level b1/l1 if per-runner entry missing
        const mktB1 = liveOverlay?.b1;
        const mktL1 = liveOverlay?.l1;
        const mktBs1 = liveOverlay?.bs1;
        const mktLs1 = liveOverlay?.ls1;

        return {
            rid,
            backOdds: live?.backOdds ?? mktB1 ?? dbBack?.odds ?? null,
            layOdds: live?.layOdds ?? mktL1 ?? dbLay?.odds ?? null,
            backSize: live?.backSize ?? mktBs1 ?? dbBack?.size ?? null,
            laySize: live?.laySize ?? mktLs1 ?? dbLay?.size ?? null,
        };
    };


    const isSuspendedMarket = !disabled && (liveOverlay?.suspended || market.mstatus === 'SUSPENDED');

    const isFancy = market.gtype === 'fancy' || market.gtype === 'fancy2' || market.gtype === 'session'
        || market.gtype === 'khado' || market.gtype === 'oddeven'
        || (market.mname && market.mname.includes('Normal'));
    // khado / oddeven show decimal odds (1.95, 2.0...) not session lines — skip the rate sub-label
    const isDecimalOddsFancy = market.gtype === 'khado' || market.gtype === 'oddeven';

    const hasZeroNumber = (market.runners_data || []).some((r: any) => r.nat && r.nat.includes('0 Number'));
    const rawMarketName = (market.mname || market.market_name || '').replace(/_/g, ' ');
    const displayMarketName = hasZeroNumber ? `${rawMarketName} Last Digit` : rawMarketName;

    const flashClass = (key: string, isBack: boolean) => {
        const dir = flashMap.get(key);
        if (!dir) return '';
        if (isBack) return dir === 'up' ? 'bg-[#3BC117]/30' : 'bg-red-500/30';
        return dir === 'up' ? 'bg-red-500/30' : 'bg-[#3BC117]/30'; // lay: higher price is worse for backer
    };

    // Mobile app: back=blue (#72BBEF), lay=pink (#FAA9BA)
    const BACK_COLOR = '#72BBEF';
    const LAY_COLOR  = '#FAA9BA';

    return (
        <div className="bg-[#1a1d21] rounded-xl border border-white/[0.06] overflow-hidden mb-3 relative">

            {/* SUSPENDED overlay */}
            {isSuspendedMarket && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/65 backdrop-blur-[1px] rounded-xl">
                    <span className="text-[11px] font-black text-red-400 tracking-[0.3em] uppercase border border-red-500/30 bg-red-500/10 px-4 py-1.5 rounded-full">
                        Suspended
                    </span>
                </div>
            )}

            {/* Header */}
            <button
                className="w-full px-4 py-3 flex items-center justify-between group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full opacity-70" />
                    <span className="text-[13px] font-bold text-white tracking-wide">{displayMarketName}</span>
                </div>
                <div className={`text-white/30 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} />
                </div>
            </button>

            {isOpen && (
                <div className="pb-3">
                    {isFancy ? (
                        // FANCY / SESSION — YES/NO rows (matches mobile app)
                        <div className="flex flex-col">
                            {/* Column headers */}
                            <div className="flex items-center justify-end gap-1 px-3 pb-1.5">
                                <div className="w-[72px] text-center text-[10px] font-black uppercase tracking-wider" style={{ color: LAY_COLOR + 'aa' }}>
                                    {market.gtype === 'oddeven' ? 'Odd' : 'NO'}
                                </div>
                                <div className="w-[72px] text-center text-[10px] font-black uppercase tracking-wider" style={{ color: BACK_COLOR + 'aa' }}>
                                    {market.gtype === 'oddeven' ? 'Even' : 'YES'}
                                </div>
                            </div>

                            {(market.runners_data || []).map((runner: any, idx: number) => {
                                const { backOdds, layOdds, backSize, laySize, rid } = getLiveOdds(runner);
                                const hasSelectionId = !!rid;
                                const isSuspended = disabled || isSuspendedMarket || runner.gstatus === 'SUSPENDED';
                                const isPending = !!isOneClickPending?.(rid);
                                const backRate = backSize ? (1 + Number(backSize) / 100).toFixed(2).replace(/\.00$/, '.0') : null;
                                const layRate  = laySize  ? (1 + Number(laySize)  / 100).toFixed(2).replace(/\.00$/, '.0') : null;

                                return (
                                    <div key={idx} className={`flex items-center justify-between px-3 py-2 border-t border-white/[0.03] ${
                                        isSuspended ? 'opacity-50' : ''
                                    }`}>
                                        <span className="text-[13px] font-semibold text-white/80 truncate flex-1 pr-2">
                                            {runner.nat || `Selection ${idx + 1}`}
                                        </span>
                                        {isSuspended && (
                                            <span className="text-[9px] font-black text-red-400 mr-2 uppercase tracking-widest">
                                                {runner.gstatus || 'SUSP'}
                                            </span>
                                        )}
                                        <div className="flex gap-1 flex-shrink-0">
                                            {/* NO (Lay) — pink */}
                                            <button
                                                disabled={isSuspended || !layOdds || !hasSelectionId || isPending}
                                                onClick={() => !isSuspended && layOdds && !isPending && void onOddClick({
                                                    marketId: market.market_id,
                                                    marketName: market.market_name,
                                                    selectionId: rid,
                                                    selectionName: runner.nat || `Selection ${idx + 1}`,
                                                    odds: Number(layOdds),
                                                    rate: !isDecimalOddsFancy && layRate ? Number(layRate) : undefined,
                                                    marketType: market.gtype,
                                                    betType: 'lay',
                                                })}
                                                className={`w-[72px] h-[38px] rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                                                    isSuspended || !layOdds || !hasSelectionId || isPending
                                                        ? 'opacity-40 cursor-not-allowed'
                                                        : 'cursor-pointer hover:brightness-110 ' + flashClass(`${rid}_lay`, false)
                                                }`}
                                                style={{ backgroundColor: LAY_COLOR + '18', border: `1px solid ${LAY_COLOR}30` }}
                                            >
                                                <span className="text-[13px] font-black leading-none" style={{ color: layOdds ? LAY_COLOR : 'rgba(255,255,255,0.2)' }}>
                                                    {isPending ? '...' : (layOdds || '-')}
                                                </span>
                                                {layOdds && !isDecimalOddsFancy && layRate && !isPending && (
                                                    <span className="text-[8px] mt-0.5" style={{ color: LAY_COLOR + '80' }}>({layRate})</span>
                                                )}
                                            </button>
                                            {/* YES (Back) — blue */}
                                            <button
                                                disabled={isSuspended || !backOdds || !hasSelectionId || isPending}
                                                onClick={() => !isSuspended && backOdds && !isPending && void onOddClick({
                                                    marketId: market.market_id,
                                                    marketName: market.market_name,
                                                    selectionId: rid,
                                                    selectionName: runner.nat || `Selection ${idx + 1}`,
                                                    odds: Number(backOdds),
                                                    rate: !isDecimalOddsFancy && backRate ? Number(backRate) : undefined,
                                                    marketType: market.gtype,
                                                    betType: 'back',
                                                })}
                                                className={`w-[72px] h-[38px] rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                                                    isSuspended || !backOdds || !hasSelectionId || isPending
                                                        ? 'opacity-40 cursor-not-allowed'
                                                        : 'cursor-pointer hover:brightness-110 ' + flashClass(`${rid}_back`, true)
                                                }`}
                                                style={{ backgroundColor: BACK_COLOR + '18', border: `1px solid ${BACK_COLOR}30` }}
                                            >
                                                <span className="text-[13px] font-black leading-none" style={{ color: backOdds ? BACK_COLOR : 'rgba(255,255,255,0.2)' }}>
                                                    {isPending ? '...' : (backOdds || '-')}
                                                </span>
                                                {backOdds && !isDecimalOddsFancy && backRate && !isPending && (
                                                    <span className="text-[8px] mt-0.5" style={{ color: BACK_COLOR + '80' }}>({backRate})</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // MATCH ODDS / BOOKMAKER — single main rate per runner
                        <div className="flex flex-col">
                            {(market.runners_data || []).map((runner: any, idx: number) => {
                                const { backOdds, backSize, rid } = getLiveOdds(runner);
                                const hasSelectionId = !!rid;
                                const isValid = backOdds != null && backOdds !== '-' && backOdds !== 0;
                                const isSuspended = disabled || isSuspendedMarket || runner.gstatus === 'SUSPENDED';
                                const isPending = !!isOneClickPending?.(rid);

                                return (
                                    <div key={idx} className={`flex items-center justify-between px-3 py-2 border-t border-white/[0.03] ${
                                        isSuspended ? 'opacity-50' : ''
                                    }`}>
                                        <div className="flex-1 pr-2 min-w-0">
                                            <span className="text-[13px] font-semibold text-white/80 truncate block">
                                                {runner.nat || `Selection ${idx + 1}`}
                                            </span>
                                            {isSuspended && (
                                                <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                                                    {runner.gstatus || 'SUSPENDED'}
                                                </span>
                                            )}
                                        </div>
                                        {/* Single main rate box */}
                                        <button
                                            disabled={!isValid || !hasSelectionId || isSuspended || isPending}
                                            onClick={() => isValid && !isSuspended && !isPending && void onOddClick({
                                                marketId: market.market_id,
                                                marketName: market.market_name,
                                                selectionId: rid,
                                                selectionName: runner.nat || `Selection ${idx + 1}`,
                                                odds: Number(backOdds),
                                                marketType: market.gtype,
                                                betType: 'back',
                                            })}
                                            className={`w-[80px] h-[38px] rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                                                isSuspended || !isValid || !hasSelectionId || isPending
                                                    ? 'opacity-40 cursor-not-allowed'
                                                    : 'cursor-pointer hover:brightness-110 ' + flashClass(`${rid}_back`, true)
                                            }`}
                                            style={{ backgroundColor: BACK_COLOR + '18', border: `1px solid ${BACK_COLOR}30` }}
                                        >
                                            <span className="text-[14px] font-black leading-none" style={{ color: isValid && !isSuspended ? BACK_COLOR : 'rgba(255,255,255,0.2)' }}>
                                                {isPending ? '...' : (isSuspended ? 'SUSP' : isValid ? backOdds : '-')}
                                            </span>
                                            {isValid && !isSuspended && backSize && !isPending ? (
                                                <span className="text-[8px] mt-0.5" style={{ color: BACK_COLOR + '70' }}>{Math.floor(Number(backSize))}</span>
                                            ) : null}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
