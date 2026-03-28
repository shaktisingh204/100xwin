"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { sportsApi, Event } from "@/services/sports";
import { ChevronLeft, Calendar, Activity, Trophy, ChevronDown, Tv, Clock } from "lucide-react";
import { useBets } from "@/context/BetContext";
import { useSportsSocket } from "@/context/SportsSocketContext";
import { useAuth } from "@/context/AuthContext";
import { showBetErrorToast, showBetPlacedToast } from "@/utils/betToasts";

/* ═══ HELPERS ═══ */
const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
};

const getTeamInitials = (name?: string) => (name || "??").substring(0, 3).toUpperCase();

/* ═══ MAIN PAGE ═══ */
export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<Event | null>(null);
  const [matchDetails, setMatchDetails] = useState<any>(null);
  const [tvUrl, setTvUrl] = useState<string | null>(null);
  const [scoreUrl, setScoreUrl] = useState<string | null>(null);
  const [mediaView, setMediaView] = useState<"match" | "tv">("match");
  const [isFetchingMedia, setIsFetchingMedia] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liveMarkets, setLiveMarkets] = useState<Map<string, any>>(new Map());
  const [activeTab, setActiveTab] = useState("all");
  const [teamIcons, setTeamIcons] = useState<Record<string, string>>({});
  const sportIdRef = useRef<string | null>(null);

  const { addBet, placeSingleBet, oneClickEnabled, oneClickStake, isOneClickPending } = useBets();
  const { sportsSocket, isSportsConnected, joinMatch, leaveMatch } = useSportsSocket();
  const { user } = useAuth();

  const SPORTS_API_BASE = (process.env.NEXT_PUBLIC_SPORTS_API_URL || "https://api.zeero.bet").replace(/\/$/, "");
  const proxyUrl = (url: string | null) => url ? `${SPORTS_API_BASE}/sports/stream-proxy?url=${encodeURIComponent(url)}` : null;

  /* ── Fetch match data ── */
  useEffect(() => {
    if (!matchId) return;
    const fetchMatch = async () => {
      try {
        const data = await sportsApi.getMatchDetails(matchId);
        setMatch(data);
        const sid = String((data as any).sport_id || data?.competition?.sport?.sport_id || "");
        if (sid) {
          const [details, tv, score] = await Promise.all([
            sportsApi.getMatchDetailsData(sid, matchId, user?.id),
            sportsApi.getTvUrl(sid, matchId),
            sportsApi.getScoreUrl(sid, matchId),
          ]);
          if (details) setMatchDetails(details);
          setTvUrl(tv || null);
          setScoreUrl(score || null);
        }
      } catch { console.error("Failed to load match"); }
      finally { setLoading(false); }
    };
    fetchMatch();
    sportsApi.getTeamIcons().then(setTeamIcons).catch(() => {});

    // HTTP polling every 2s
    const poll = setInterval(async () => {
      try { const r = await sportsApi.getMatchDetails(matchId); if (r) setMatch(r); } catch {}
    }, 2000);
    return () => clearInterval(poll);
  }, [matchId, user?.id]);

  /* ── Store sportId ── */
  useEffect(() => {
    if (match) sportIdRef.current = String((match as any).sport_id || match?.competition?.sport?.sport_id || "");
  }, [match]);

  /* ── Sports Socket: join/leave ── */
  useEffect(() => {
    if (!isSportsConnected || !matchId) return;
    joinMatch(matchId);
    return () => { leaveMatch(matchId); };
  }, [isSportsConnected, matchId, joinMatch, leaveMatch]);

  /* ── Sports Socket: heartbeat ── */
  useEffect(() => {
    if (!sportsSocket || !isSportsConnected || !matchId) return;
    const hb = setInterval(() => sportsSocket.emit('match-heartbeat', matchId), 30_000);
    return () => clearInterval(hb);
  }, [sportsSocket, isSportsConnected, matchId]);

  /* ── Sports Socket: live odds ── */
  useEffect(() => {
    if (!sportsSocket) return;
    const handler = (data: any) => {
      if (!data) return;
      setLiveMarkets((prev) => {
        const next = new Map(prev);
        const getMarket = (mid: string) => {
          if (!next.has(mid)) next.set(mid, { runners: new Map(), suspended: false });
          return next.get(mid)!;
        };
        const isFancyGtype = (g?: string) => {
          if (!g) return false;
          const l = g.toLowerCase();
          return ["session", "fancy", "fancy2", "khado", "meter", "oddeven", "other fancy"].includes(l);
        };

        // Match odds
        if ((data.messageType === "match_odds" || data.messageType === "odds") && Array.isArray(data.data)) {
          data.data.forEach((u: any) => {
            const mid = String(u.bmi || u.mid || u.id || ""); if (!mid) return;
            const mkt = getMarket(mid);
            if (u.ms !== undefined) mkt.suspended = u.ms === 4;
            const fancy = isFancyGtype(u.gtype);
            if (Array.isArray(u.rt)) {
              u.rt.forEach((r: any) => {
                const rid = String(r.ri ?? r.id ?? ""); if (!rid) return;
                const ex = mkt.runners.get(rid) || {};
                if (fancy) {
                  if (r.ib) { mkt.runners.set(rid, { ...ex, backOdds: r.rt, backSize: r.bv }); mkt.b1 = r.rt; mkt.bs1 = r.bv; }
                  else { mkt.runners.set(rid, { ...ex, layOdds: r.rt, laySize: r.bv }); mkt.l1 = r.rt; mkt.ls1 = r.bv; }
                } else {
                  if (r.ib) mkt.runners.set(rid, { ...ex, backOdds: r.rt, backSize: r.bv });
                  else mkt.runners.set(rid, { ...ex, layOdds: r.rt, laySize: r.bv });
                }
              });
            }
          });
        }
        // Session / Fancy
        if (["session_odds", "fancy_odds", "fancy"].includes(data.messageType) && Array.isArray(data.data)) {
          data.data.forEach((u: any) => {
            const mid = String(u.id || u.mid || u.market_id || ""); if (!mid) return;
            const mkt = getMarket(mid);
            if (u.ms !== undefined) mkt.suspended = u.ms === 4;
            if (u.b1 !== undefined) mkt.b1 = u.b1;
            if (u.l1 !== undefined) mkt.l1 = u.l1;
            if (u.bs1 !== undefined) mkt.bs1 = u.bs1;
            if (u.ls1 !== undefined) mkt.ls1 = u.ls1;
            if (Array.isArray(u.rt)) {
              u.rt.forEach((r: any) => {
                const rid = String(r.ri ?? r.sid ?? r.id ?? ""); if (!rid) return;
                const ex = mkt.runners.get(rid) || {};
                mkt.runners.set(rid, { ...ex, backOdds: r.b1 ?? r.rt, layOdds: r.l1, backSize: r.bs1, laySize: r.ls1 });
              });
            }
          });
        }
        // Bookmaker
        if ((data.messageType === "bookmaker_odds" || data.messageType === "bm_odds") && Array.isArray(data.data)) {
          data.data.forEach((u: any) => {
            const mid = String(u.mid || u.id || u.bmi || ""); if (!mid) return;
            const mkt = getMarket(mid);
            if (u.ms !== undefined) mkt.suspended = u.ms === 4;
            if (Array.isArray(u.rt)) {
              u.rt.forEach((r: any) => {
                const rid = String(r.ri ?? r.id ?? ""); if (!rid) return;
                const ex = mkt.runners.get(rid) || {};
                if (r.ib) mkt.runners.set(rid, { ...ex, backOdds: r.rt, backSize: r.bv });
                else mkt.runners.set(rid, { ...ex, layOdds: r.rt, laySize: r.bv });
              });
            }
          });
        }
        if (data.ms !== undefined && data.id) {
          const mkt = getMarket(String(data.id));
          mkt.suspended = data.ms === 4;
        }
        return next;
      });
    };
    sportsSocket.on("socket-data", handler);
    return () => { sportsSocket.off("socket-data", handler); };
  }, [sportsSocket]);

  /* ── Media view change ── */
  const handleMediaViewChange = async (view: "match" | "tv") => {
    const sid = sportIdRef.current;
    if (!sid) { setMediaView(view); return; }
    setMediaView(view);
    setIsFetchingMedia(true);
    try {
      if (view === "tv") { setTvUrl(null); const u = await sportsApi.getTvUrl(sid, matchId); setTvUrl(u || null); }
      else { setScoreUrl(null); const u = await sportsApi.getScoreUrl(sid, matchId); setScoreUrl(u || null); }
    } catch {}
    setIsFetchingMedia(false);
  };

  /* ── Odd click ── */
  const handleOddClick = async ({ marketId, marketName, selectionId, selectionName, odds, rate, marketType, betType = "back" }: {
    marketId: string; marketName: string; selectionId: string; selectionName: string; odds: number; rate?: number; marketType?: string; betType?: "back" | "lay";
  }) => {
    if (!odds || odds <= 1 || !match) return;
    const bet = { eventId: match.event_id, eventName: match.event_name, marketId, marketName, selectionId, selectionName, odds, rate, marketType, betType };
    if (!oneClickEnabled) { addBet(bet); return; }
    try {
      await placeSingleBet(bet);
      showBetPlacedToast({ selectionName, stake: oneClickStake });
    } catch (error: any) {
      if (error?.message === "Login required") return;
      showBetErrorToast(error);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Not found ── */
  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Trophy size={40} className="text-white/10" />
        <h2 className="text-lg font-bold text-white/50">Match Not Found</h2>
        <button onClick={() => router.push("/sports")} className="px-4 py-2 bg-white/[0.04] rounded-lg text-white/50 text-sm font-bold hover:bg-white/[0.08] transition-colors">
          Back to Sports
        </button>
      </div>
    );
  }

  /* ── Derived state ── */
  const league = match.competition_name || match.competition?.competition_name || (matchDetails as any)?.cname || "";
  const parseOpenDate = (d: string) => {
    if (!d) return 0;
    if (d.includes("/Date(")) return parseInt(d.replace(/\/Date\((-?\d+)\)\//, "$1"));
    return new Date(d).getTime();
  };
  const hasStarted = parseOpenDate(match.open_date) > 0 && Date.now() >= parseOpenDate(match.open_date);
  const isCompleted = match.match_status === "Completed";
  const isLive = match.match_status === "In Play" || match.match_status === "Live" || !!match.match_info || !!(match as any).in_play || matchDetails?.iplay || (!isCompleted && hasStarted);

  const home = match.home_team || match.event_name.split(" v ")[0] || "Team A";
  const away = match.away_team || match.event_name.split(" v ")[1] || "Team B";
  const homeIcon = teamIcons[home.toLowerCase().trim()];
  const awayIcon = teamIcons[away.toLowerCase().trim()];

  const allMarkets = (match.markets || []).filter((m: any) => {
    const s = (m.status || m.mstatus || m.marketStatus || "").toUpperCase();
    return s !== "CLOSED" && s !== "INACTIVE" && s !== "FINISHED";
  });

  const getMarketCategory = (n: string) => {
    const l = n.toLowerCase();
    if (l.includes("winner") || l.includes("match") || l.includes("1x2") || l.includes("bookmaker")) return "main";
    if (l.includes("session") || l.includes("over") || l.includes("run") || l.includes("fall") || l.includes("wicket")) return "session";
    if (l.includes("fancy") || l.includes("yes") || l.includes("no")) return "fancy";
    if (l.includes("goal") || l.includes("score")) return "goals";
    return "others";
  };

  const categorized: Record<string, any[]> = { all: [], main: [], session: [], fancy: [], goals: [], others: [] };
  allMarkets.forEach((m) => { const c = getMarketCategory(m.market_name); categorized[c].push(m); });
  const sorted = [...allMarkets].sort((a, b) => {
    const ca = getMarketCategory(a.market_name), cb = getMarketCategory(b.market_name);
    if (categorized[ca].length !== categorized[cb].length) return categorized[ca].length - categorized[cb].length;
    return a.market_name.localeCompare(b.market_name);
  });
  categorized.all = sorted;

  const tabs = ["all", "main", "session", "fancy", "goals", "others"].filter((t) => categorized[t].length > 0 || t === "all");
  const currentMarkets = categorized[activeTab] || categorized.all;

  return (
    <div className="max-w-[1600px] mx-auto px-0 md:px-4 py-0 md:py-4 space-y-3">
      {/* Match header card */}
      <div className="bg-white/[0.015] md:rounded-xl overflow-hidden border-0 md:border border-white/[0.04]">
        {/* Breadcrumb bar */}
        <div className="px-3 py-2.5 bg-white/[0.01] flex items-center justify-between border-b border-white/[0.03]">
          <button onClick={() => router.push("/sports")} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors text-[11px] font-bold">
            <ChevronLeft size={14} /> <span className="truncate max-w-[200px]">{league || "Sports"}</span>
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[9px] text-white/15 flex items-center gap-1"><Calendar size={9} /> {formatDate(match.open_date)}</span>
            {isCompleted ? (
              <span className="text-[8px] font-black text-white/20 bg-white/[0.03] px-1.5 py-0.5 rounded uppercase">Ended</span>
            ) : isLive && (
              <span className="text-[8px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse uppercase">
                <Activity size={8} /> Live
              </span>
            )}
          </div>
        </div>

        {/* Media tabs */}
        {(tvUrl || scoreUrl) && (
          <div className="flex bg-white/[0.01] border-b border-white/[0.03] px-3 gap-4 overflow-x-auto">
            <button onClick={() => handleMediaViewChange("match")} disabled={isFetchingMedia} className={`py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-colors ${mediaView === "match" ? "border-[#f59e0b] text-[#f59e0b]" : "border-transparent text-white/20 hover:text-white/40"}`}>
              Match Details
            </button>
            {tvUrl && (
              <button onClick={() => handleMediaViewChange("tv")} disabled={isFetchingMedia} className={`py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${mediaView === "tv" ? "border-red-400 text-red-400" : "border-transparent text-white/20 hover:text-white/40"}`}>
                <Tv size={11} /> Live TV
              </button>
            )}
          </div>
        )}

        {/* Fetch spinner */}
        {isFetchingMedia && <div className="w-full flex items-center justify-center bg-[#06080c]" style={{ height: "220px" }}><div className="w-7 h-7 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" /></div>}

        {/* TV iframe */}
        {!isFetchingMedia && mediaView === "tv" && tvUrl && (
          <div className="w-full relative aspect-video bg-black">
            <iframe key={tvUrl} src={proxyUrl(tvUrl)!} className="absolute inset-0 w-full h-full border-0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
          </div>
        )}

        {/* Scorecard iframe */}
        {!isFetchingMedia && mediaView !== "tv" && scoreUrl && (
          <div className="w-full bg-black" style={{ height: "220px" }}>
            <iframe key={scoreUrl} src={proxyUrl(scoreUrl)!} className="w-full h-full border-0" allowFullScreen />
          </div>
        )}

        {/* Teams display */}
        <div className="p-4 md:p-6 bg-gradient-to-b from-white/[0.01] to-transparent">
          <div className="flex items-center justify-between gap-4">
            {/* Home */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center border-2 ${isLive ? "bg-emerald-500/10 border-emerald-500/15" : "bg-white/[0.03] border-white/[0.06]"}`}>
                {homeIcon ? <img src={homeIcon} alt={home} className="w-full h-full object-contain rounded-lg p-0.5" /> : <span className={`text-lg md:text-xl font-black ${isLive ? "text-emerald-400" : "text-white/20"}`}>{getTeamInitials(home)}</span>}
              </div>
              <h2 className="text-[12px] md:text-[14px] font-bold text-white/70 text-center leading-tight">{home}</h2>
            </div>

            {/* Score/VS */}
            <div className="flex flex-col items-center gap-1.5">
              {isLive && (match.score1 || match.score2) ? (
                <div className="text-2xl md:text-3xl font-black text-[#f59e0b] tracking-widest font-mono">
                  {match.score1 || "0"}<span className="text-white/10 mx-1">-</span>{match.score2 || "0"}
                </div>
              ) : isCompleted && (match.score1 || match.score2) ? (
                <div className="text-2xl font-black text-white/30 tracking-widest font-mono">
                  {match.score1 || "0"}<span className="text-white/10 mx-1">-</span>{match.score2 || "0"}
                </div>
              ) : (
                <span className="text-2xl md:text-3xl font-black text-white/5 tracking-widest">VS</span>
              )}
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${
                isLive ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-400" : isCompleted ? "bg-white/[0.02] border-white/[0.04] text-white/15" : "bg-white/[0.02] border-white/[0.04] text-white/10"
              }`}>
                {isLive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                {isCompleted ? "Completed" : isLive ? "In Progress" : "Starting Soon"}
              </div>
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center border-2 ${isLive ? "bg-emerald-500/10 border-emerald-500/15" : "bg-white/[0.03] border-white/[0.06]"}`}>
                {awayIcon ? <img src={awayIcon} alt={away} className="w-full h-full object-contain rounded-lg p-0.5" /> : <span className={`text-lg md:text-xl font-black ${isLive ? "text-emerald-400" : "text-white/20"}`}>{getTeamInitials(away)}</span>}
              </div>
              <h2 className="text-[12px] md:text-[14px] font-bold text-white/70 text-center leading-tight">{away}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Market tabs */}
      <div className="sticky top-0 z-20 bg-[#06080c]">
        <div className="bg-white/[0.015] md:rounded-xl p-1 flex items-center gap-1 overflow-x-auto border border-white/[0.04] mx-0 md:mx-0" style={{ scrollbarWidth: "none" }}>
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab ? "bg-white/[0.04] text-[#f59e0b]" : "text-white/20 hover:text-white/40 hover:bg-white/[0.02]"
              }`}>
              {tab}
              <span className={`text-[8px] px-1 py-0.5 rounded ${activeTab === tab ? "bg-[#f59e0b]/15 text-[#f59e0b]" : "bg-white/[0.03] text-white/15"}`}>
                {categorized[tab].length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Markets */}
      <div className="space-y-2 px-0 md:px-0">
        {currentMarkets.length === 0 ? (
          <div className="text-center py-12 text-white/20">
            <Trophy size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-[12px] font-bold">No markets in this category</p>
          </div>
        ) : (
          currentMarkets.map((market) => (
            <MarketAccordion
              key={market.market_id}
              market={market}
              disabled={isCompleted}
              liveOverlay={liveMarkets.get(String(market.market_id))}
              onOddClick={handleOddClick}
              isOneClickPending={(sid) => oneClickEnabled && isOneClickPending(match.event_id, market.market_id, sid)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ═══ MARKET ACCORDION ═══ */
const BACK_COLOR = "#72BBEF";
const LAY_COLOR = "#FAA9BA";

function MarketAccordion({ market, disabled, liveOverlay, onOddClick, isOneClickPending }: {
  market: any;
  disabled?: boolean;
  liveOverlay?: { runners: Map<string, any>; suspended: boolean; b1?: any; l1?: any; bs1?: any; ls1?: any };
  onOddClick: (s: { marketId: string; marketName: string; selectionId: string; selectionName: string; odds: number; rate?: number; marketType?: string; betType?: "back" | "lay" }) => void | Promise<void>;
  isOneClickPending?: (selectionId: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const prevOddsRef = useRef<Map<string, number>>(new Map());
  const [flashMap, setFlashMap] = useState<Map<string, "up" | "down">>(new Map());

  useEffect(() => {
    if (!liveOverlay?.runners) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    liveOverlay.runners.forEach((live, rid) => {
      [{ key: `${rid}_back`, val: live.backOdds != null ? Number(live.backOdds) : null }, { key: `${rid}_lay`, val: live.layOdds != null ? Number(live.layOdds) : null }].forEach(({ key, val }) => {
        if (val == null) return;
        const prev = prevOddsRef.current.get(key);
        if (prev !== undefined && prev !== val) {
          const dir: "up" | "down" = val > prev ? "up" : "down";
          setFlashMap((m) => new Map(m).set(key, dir));
          timers.push(setTimeout(() => setFlashMap((m) => { const n = new Map(m); n.delete(key); return n; }), 800));
        }
        prevOddsRef.current.set(key, val);
      });
    });
    return () => timers.forEach(clearTimeout);
  }, [liveOverlay]);

  const getLiveOdds = (runner: any) => {
    const rid = String(runner.sid ?? runner.selectionId ?? runner.ri ?? runner.id ?? "");
    const live = liveOverlay?.runners?.get(rid);
    const arr = Array.isArray(runner.odds) ? runner.odds : [];
    const dbBack = arr.find((o: any) => o.otype === "back" && o.tno === 0) || arr.find((o: any) => o.otype === "back");
    const dbLay = arr.find((o: any) => o.otype === "lay" && o.tno === 0) || arr.find((o: any) => o.otype === "lay");
    return {
      rid,
      backOdds: live?.backOdds ?? liveOverlay?.b1 ?? dbBack?.odds ?? null,
      layOdds: live?.layOdds ?? liveOverlay?.l1 ?? dbLay?.odds ?? null,
      backSize: live?.backSize ?? liveOverlay?.bs1 ?? dbBack?.size ?? null,
      laySize: live?.laySize ?? liveOverlay?.ls1 ?? dbLay?.size ?? null,
    };
  };

  const isSuspendedMarket = !disabled && (liveOverlay?.suspended || market.mstatus === "SUSPENDED");
  const isFancy = market.gtype === "fancy" || market.gtype === "fancy2" || market.gtype === "session" || market.gtype === "khado" || market.gtype === "oddeven" || (market.mname && market.mname.includes("Normal"));
  const isDecimalOddsFancy = market.gtype === "khado" || market.gtype === "oddeven";
  const rawName = (market.mname || market.market_name || "").replace(/_/g, " ");
  const hasZero = (market.runners_data || []).some((r: any) => r.nat?.includes("0 Number"));
  const displayName = hasZero ? `${rawName} Last Digit` : rawName;

  const flashClass = (key: string, isBack: boolean) => {
    const dir = flashMap.get(key);
    if (!dir) return "";
    if (isBack) return dir === "up" ? "bg-[#3BC117]/30" : "bg-red-500/30";
    return dir === "up" ? "bg-red-500/30" : "bg-[#3BC117]/30";
  };

  return (
    <div className="bg-white/[0.015] md:rounded-xl border border-white/[0.04] overflow-hidden relative">
      {isSuspendedMarket && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/65 backdrop-blur-[1px] rounded-xl">
          <span className="text-[10px] font-black text-red-400 tracking-[0.3em] uppercase border border-red-500/30 bg-red-500/10 px-3 py-1 rounded-full">Suspended</span>
        </div>
      )}

      <button className="w-full px-3 py-2.5 flex items-center justify-between group" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-[#f59e0b]/40 rounded-full" />
          <span className="text-[12px] font-bold text-white/50 tracking-wide">{displayName}</span>
        </div>
        <div className={`text-white/15 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}><ChevronDown size={14} /></div>
      </button>

      {isOpen && (
        <div className="pb-2">
          {isFancy ? (
            <div className="flex flex-col">
              <div className="flex items-center justify-end gap-1 px-3 pb-1.5">
                <div className="w-[68px] text-center text-[8px] font-black uppercase tracking-wider" style={{ color: LAY_COLOR + "aa" }}>
                  {market.gtype === "oddeven" ? "Odd" : "NO"}
                </div>
                <div className="w-[68px] text-center text-[8px] font-black uppercase tracking-wider" style={{ color: BACK_COLOR + "aa" }}>
                  {market.gtype === "oddeven" ? "Even" : "YES"}
                </div>
              </div>
              {(market.runners_data || []).map((runner: any, idx: number) => {
                const { backOdds, layOdds, backSize, laySize, rid } = getLiveOdds(runner);
                const hasId = !!rid;
                const susp = disabled || isSuspendedMarket || runner.gstatus === "SUSPENDED";
                const pending = !!isOneClickPending?.(rid);
                const backRate = backSize ? (1 + Number(backSize) / 100).toFixed(2).replace(/\.00$/, ".0") : null;
                const layRate = laySize ? (1 + Number(laySize) / 100).toFixed(2).replace(/\.00$/, ".0") : null;

                return (
                  <div key={idx} className={`flex items-center justify-between px-3 py-1.5 border-t border-white/[0.02] ${susp ? "opacity-50" : ""}`}>
                    <span className="text-[12px] font-semibold text-white/50 truncate flex-1 pr-2">{runner.nat || `Selection ${idx + 1}`}</span>
                    {susp && <span className="text-[8px] font-black text-red-400 mr-2 uppercase">{runner.gstatus || "SUSP"}</span>}
                    <div className="flex gap-1 flex-shrink-0">
                      <button disabled={susp || !layOdds || !hasId || pending}
                        onClick={() => !susp && layOdds && !pending && void onOddClick({
                          marketId: market.market_id, marketName: market.market_name, selectionId: rid,
                          selectionName: runner.nat || `Selection ${idx + 1}`, odds: Number(layOdds),
                          rate: !isDecimalOddsFancy && layRate ? Number(layRate) : undefined, marketType: market.gtype, betType: "lay",
                        })}
                        className={`w-[68px] h-[36px] rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                          susp || !layOdds || !hasId || pending ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-110 " + flashClass(`${rid}_lay`, false)
                        }`} style={{ backgroundColor: LAY_COLOR + "18", border: `1px solid ${LAY_COLOR}30` }}>
                        <span className="text-[12px] font-black leading-none" style={{ color: layOdds ? LAY_COLOR : "rgba(255,255,255,0.1)" }}>
                          {pending ? "..." : layOdds || "-"}
                        </span>
                        {layOdds && !isDecimalOddsFancy && layRate && !pending && <span className="text-[7px] mt-0.5" style={{ color: LAY_COLOR + "80" }}>({layRate})</span>}
                      </button>
                      <button disabled={susp || !backOdds || !hasId || pending}
                        onClick={() => !susp && backOdds && !pending && void onOddClick({
                          marketId: market.market_id, marketName: market.market_name, selectionId: rid,
                          selectionName: runner.nat || `Selection ${idx + 1}`, odds: Number(backOdds),
                          rate: !isDecimalOddsFancy && backRate ? Number(backRate) : undefined, marketType: market.gtype, betType: "back",
                        })}
                        className={`w-[68px] h-[36px] rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                          susp || !backOdds || !hasId || pending ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-110 " + flashClass(`${rid}_back`, true)
                        }`} style={{ backgroundColor: BACK_COLOR + "18", border: `1px solid ${BACK_COLOR}30` }}>
                        <span className="text-[12px] font-black leading-none" style={{ color: backOdds ? BACK_COLOR : "rgba(255,255,255,0.1)" }}>
                          {pending ? "..." : backOdds || "-"}
                        </span>
                        {backOdds && !isDecimalOddsFancy && backRate && !pending && <span className="text-[7px] mt-0.5" style={{ color: BACK_COLOR + "80" }}>({backRate})</span>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col">
              {(market.runners_data || []).map((runner: any, idx: number) => {
                const { backOdds, backSize, rid } = getLiveOdds(runner);
                const hasId = !!rid;
                const isValid = backOdds != null && backOdds !== "-" && backOdds !== 0;
                const susp = disabled || isSuspendedMarket || runner.gstatus === "SUSPENDED";
                const pending = !!isOneClickPending?.(rid);

                return (
                  <div key={idx} className={`flex items-center justify-between px-3 py-1.5 border-t border-white/[0.02] ${susp ? "opacity-50" : ""}`}>
                    <div className="flex-1 pr-2 min-w-0">
                      <span className="text-[12px] font-semibold text-white/50 truncate block">{runner.nat || `Selection ${idx + 1}`}</span>
                      {susp && <span className="text-[8px] font-black text-red-400 uppercase">{runner.gstatus || "SUSPENDED"}</span>}
                    </div>
                    <button disabled={!isValid || !hasId || susp || pending}
                      onClick={() => isValid && !susp && !pending && void onOddClick({
                        marketId: market.market_id, marketName: market.market_name, selectionId: rid,
                        selectionName: runner.nat || `Selection ${idx + 1}`, odds: Number(backOdds), marketType: market.gtype, betType: "back",
                      })}
                      className={`w-[76px] h-[36px] rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                        susp || !isValid || !hasId || pending ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-110 " + flashClass(`${rid}_back`, true)
                      }`} style={{ backgroundColor: BACK_COLOR + "18", border: `1px solid ${BACK_COLOR}30` }}>
                      <span className="text-[13px] font-black leading-none" style={{ color: isValid && !susp ? BACK_COLOR : "rgba(255,255,255,0.1)" }}>
                        {pending ? "..." : susp ? "SUSP" : isValid ? backOdds : "-"}
                      </span>
                      {isValid && !susp && backSize && !pending && <span className="text-[7px] mt-0.5" style={{ color: BACK_COLOR + "70" }}>{Math.floor(Number(backSize))}</span>}
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
