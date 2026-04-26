"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Activity,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Lock,
  Tv,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useBets } from "@/context/BetContext";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { sportsApi } from "@/services/sports";
import { showBetErrorToast, showBetPlacedToast } from "@/utils/betToasts";
import OneClickBetControls from "@/components/sports/OneClickBetControls";

/* ─────────────────────────────────────────────
   SR types
   ───────────────────────────────────────────── */
type PricePoint = { price: number; size: number };

interface SrRunner {
  runnerId: string;
  runnerName: string;
  status: string;
  backPrices: PricePoint[];
  layPrices: PricePoint[];
}

interface SrMarket {
  marketId: string;
  marketName: string;
  marketType?: string;
  status: string;
  runners: SrRunner[];
  category?: string;
  limits?: { minBetValue: number; maxBetValue: number; currency: string };
}

interface LiveRunnerOdds {
  backOdds?: number;
  backSize?: number;
  layOdds?: number;
  laySize?: number;
}

interface LiveMarket {
  runners: Map<string, LiveRunnerOdds>;
  suspended: boolean;
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
  eventStatus?: string;
  catId?: string;
  catName?: string;
  homeScore: number;
  awayScore: number;
  country?: string;
  venue?: string;
  winnerBlocked?: boolean;
  team1Image?: string;
  team2Image?: string;
  markets: {
    matchOdds?: SrMarket[];
    bookmakers?: SrMarket[];
    fancyMarkets?: SrMarket[];
    premiumMarkets?: SrMarket[];
  };
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || "https://odd69.com/api").replace(/\/$/, "");

const proxyUrl = (url: string | null | undefined) =>
  url ? `${BACKEND}/sports/stream-proxy?url=${encodeURIComponent(url)}` : null;

const isSrMatch = (id: string) => /^sr:match:/i.test(id);

const formatDateTime = (ms: number | string) => {
  const d = new Date(typeof ms === "string" ? Number(ms) || ms : ms);
  if (Number.isNaN(d.getTime())) return String(ms);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name?: string) => {
  if (!name) return "??";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const isOver = (n: string) => n.toLowerCase().startsWith("over");
const isUnder = (n: string) => n.toLowerCase().startsWith("under");

const closedStates = new Set(["CLOSED", "COMPLETED", "ENDED", "FINISHED", "ABANDONED", "SETTLED"]);
const liveStates = new Set(["LIVE", "IN_PLAY", "INPLAY"]);

const norm = (s: string | undefined | null) =>
  String(s ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");

/* ─────────────────────────────────────────────
   SR fetch
   ───────────────────────────────────────────── */
async function fetchSrEvent(eventId: string): Promise<SrEvent | null> {
  // Retry once on transient failure. The backend's getEventById has its
  // own retry on the proxy step, but if Cloudflare 502s twice in a row
  // the first call here returns null. A 200ms-spaced second attempt
  // avoids the user-visible "Match Not Found" flash for a match that
  // does exist upstream.
  const tryOnce = async (): Promise<SrEvent | null> => {
    try {
      const res = await fetch(
        `${BACKEND}/sports/sportradar/event?eventId=${encodeURIComponent(eventId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return null;
      const body = await res.json();
      if (!body?.success || !body?.data) return null;
      return body.data as SrEvent;
    } catch {
      return null;
    }
  };

  const first = await tryOnce();
  if (first) return first;
  await new Promise((r) => setTimeout(r, 200));
  return tryOnce();
}

async function fetchSrMarketsFallback(eventId: string): Promise<SrEvent["markets"] | null> {
  try {
    const res = await fetch(
      `${BACKEND}/sportsbook/market?event_id=${encodeURIComponent(eventId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = await res.json();
    const data = body?.data ?? body;
    if (!data) return null;
    return {
      matchOdds: data.matchOdds ?? data.match_odds ?? [],
      bookmakers: data.bookmakers ?? [],
      fancyMarkets: data.fancyMarkets ?? data.fancy ?? [],
      premiumMarkets: data.premiumMarkets ?? data.premium ?? [],
    };
  } catch {
    return null;
  }
}

const hasAnyMarkets = (markets?: SrEvent["markets"]) =>
  !!markets &&
  ((markets.matchOdds?.length ?? 0) +
    (markets.bookmakers?.length ?? 0) +
    (markets.fancyMarkets?.length ?? 0) +
    (markets.premiumMarkets?.length ?? 0) >
    0);

/* ─────────────────────────────────────────────
   Odds button (single back price)
   ───────────────────────────────────────────── */
type BetFn = (p: {
  marketId: string;
  marketName: string;
  marketType?: string;
  selectionId: string;
  selectionName: string;
  odds: number;
  betType: "back";
}) => void;

function PriceChip({
  label,
  price,
  disabled,
  pending,
  onClick,
  variant = "gold",
}: {
  label?: string;
  price?: number | null;
  disabled?: boolean;
  pending?: boolean;
  onClick?: () => void;
  variant?: "gold" | "emerald" | "crimson";
}) {
  const hasPrice = price != null && price > 1 && !disabled;
  const palette =
    variant === "emerald"
      ? "border-[var(--emerald)]/40 bg-[var(--emerald-soft)] text-[var(--emerald)] hover:border-[var(--emerald)]/70"
      : variant === "crimson"
      ? "border-[var(--crimson)]/40 bg-[var(--crimson-soft)] text-[var(--crimson)] hover:border-[var(--crimson)]/70"
      : "border-[var(--gold-line)] bg-[var(--gold-soft)] text-[var(--gold-bright)] hover:border-[var(--gold)]/60 hover:shadow-[var(--shadow-gold)]";

  return (
    <button
      type="button"
      disabled={!hasPrice}
      onClick={hasPrice ? onClick : undefined}
      className={`flex h-[44px] min-w-[68px] flex-col items-center justify-center rounded-[var(--r-md)] border px-3 transition-all active:scale-95 ${
        hasPrice
          ? `cursor-pointer ${palette}`
          : "cursor-not-allowed border-[var(--line-default)] bg-[var(--bg-elevated)] text-[var(--ink-whisper)]"
      }`}
    >
      {label && (
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] opacity-80 leading-none">
          {label}
        </span>
      )}
      <span className="num text-[14px] font-black leading-tight">
        {pending ? "…" : disabled ? "🔒" : hasPrice ? price!.toFixed(2) : "-"}
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Over / Under pair row
   ───────────────────────────────────────────── */
function OverUnderRow({
  over,
  under,
  marketId,
  marketName,
  overPrice,
  underPrice,
  suspended,
  isPendingFn,
  onBet,
}: {
  over: SrRunner;
  under: SrRunner;
  marketId: string;
  marketName: string;
  overPrice?: number;
  underPrice?: number;
  suspended?: boolean;
  isPendingFn: (sid: string) => boolean;
  onBet: BetFn;
}) {
  const lineLabel = over.runnerName.replace(/^over\s*/i, "").trim();

  return (
    <div className="flex items-center gap-3 border-t border-[var(--line)] px-3 py-2">
      <span className="num min-w-[48px] text-[12px] font-bold text-[var(--ink-dim)]">
        {lineLabel}
      </span>
      <div className="flex flex-1 items-center justify-end gap-2">
        <PriceChip
          label="Over"
          price={overPrice}
          disabled={suspended}
          pending={isPendingFn(over.runnerId)}
          variant="emerald"
          onClick={() =>
            overPrice &&
            onBet({
              marketId,
              marketName,
              selectionId: over.runnerId,
              selectionName: over.runnerName,
              odds: overPrice,
              betType: "back",
            })
          }
        />
        <PriceChip
          label="Under"
          price={underPrice}
          disabled={suspended}
          pending={isPendingFn(under.runnerId)}
          variant="crimson"
          onClick={() =>
            underPrice &&
            onBet({
              marketId,
              marketName,
              selectionId: under.runnerId,
              selectionName: under.runnerName,
              odds: underPrice,
              betType: "back",
            })
          }
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Standard runner row (full width)
   ───────────────────────────────────────────── */
function StandardRow({
  runner,
  price,
  marketId,
  marketName,
  suspended,
  isPending,
  onBet,
}: {
  runner: SrRunner;
  price?: number;
  marketId: string;
  marketName: string;
  suspended?: boolean;
  isPending?: boolean;
  onBet: BetFn;
}) {
  const inactive = runner.status && runner.status !== "Active";
  return (
    <div
      className={`flex items-center justify-between gap-3 border-t border-[var(--line)] px-3 py-2.5 transition-colors ${
        inactive ? "opacity-50" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[var(--line-default)] bg-[var(--bg-elevated)] text-[10px] font-black uppercase text-[var(--ink-dim)]">
          {getInitials(runner.runnerName)}
        </div>
        <span className="truncate text-[13px] font-semibold text-[var(--ink-strong)]">
          {runner.runnerName}
        </span>
      </div>
      <PriceChip
        price={price}
        disabled={suspended}
        pending={isPending}
        onClick={() =>
          price &&
          onBet({
            marketId,
            marketName,
            selectionId: runner.runnerId,
            selectionName: runner.runnerName,
            odds: price,
            betType: "back",
          })
        }
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Grid chip (>4 runners, e.g. correct score)
   ───────────────────────────────────────────── */
function GridCell({
  runner,
  price,
  marketId,
  marketName,
  suspended,
  isPending,
  onBet,
}: {
  runner: SrRunner;
  price?: number;
  marketId: string;
  marketName: string;
  suspended?: boolean;
  isPending?: boolean;
  onBet: BetFn;
}) {
  const hasPrice = price != null && price > 1 && !suspended;
  return (
    <button
      type="button"
      disabled={!hasPrice}
      onClick={() =>
        hasPrice &&
        onBet({
          marketId,
          marketName,
          selectionId: runner.runnerId,
          selectionName: runner.runnerName,
          odds: price!,
          betType: "back",
        })
      }
      className={`flex flex-col items-center gap-1 rounded-[var(--r-md)] border px-2 py-3 transition-all ${
        hasPrice
          ? "border-[var(--gold-line)] bg-[var(--gold-soft)] text-[var(--gold-bright)] cursor-pointer hover:border-[var(--gold)]/60 hover:shadow-[var(--shadow-gold)] active:scale-95"
          : "border-[var(--line-default)] bg-[var(--bg-elevated)] text-[var(--ink-whisper)] cursor-not-allowed"
      }`}
    >
      <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-[var(--ink-strong)]">
        {runner.runnerName}
      </span>
      <span className="num text-[13px] font-black">
        {isPending ? "…" : hasPrice ? price!.toFixed(2) : "-"}
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Market accordion
   ───────────────────────────────────────────── */
interface MarketAccordionProps {
  market: SrMarket;
  liveMarket?: LiveMarket;
  onBet: BetFn;
  isCompleted?: boolean;
  pending: (marketId: string, selectionId: string) => boolean;
}

function MarketAccordion({
  market,
  liveMarket,
  onBet,
  isCompleted,
  pending,
}: MarketAccordionProps) {
  const [open, setOpen] = useState(true);

  const isSuspended = isCompleted || market.status !== "Active" || liveMarket?.suspended;

  const priceFor = (runner: SrRunner): number | undefined =>
    liveMarket?.runners?.get(runner.runnerId)?.backOdds ?? runner.backPrices?.[0]?.price;

  const onBetWithType: BetFn = (p) => onBet({ ...p, marketType: market.marketType || "MATCH_ODDS" });

  const allOverUnder =
    market.runners.length > 0 &&
    market.runners.every((r) => isOver(r.runnerName) || isUnder(r.runnerName));

  const overUnderPairs: { over: SrRunner; under: SrRunner }[] = [];
  if (allOverUnder) {
    const overs = market.runners.filter((r) => isOver(r.runnerName));
    const unders = market.runners.filter((r) => isUnder(r.runnerName));
    overs.forEach((o) => {
      const line = o.runnerName.replace(/^over\s*/i, "").trim();
      const u = unders.find((u) => u.runnerName.replace(/^under\s*/i, "").trim() === line);
      if (u) overUnderPairs.push({ over: o, under: u });
    });
  }

  const isGrid = !allOverUnder && market.runners.length > 4;

  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-surface)]">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="h-3.5 w-1 rounded-full bg-[var(--gold)]" />
          <span className="truncate text-[13px] font-bold text-[var(--ink-strong)]">
            {market.marketName}
          </span>
          {isSuspended && (
            <span className="chip chip-crimson flex-shrink-0">
              <Lock size={8} /> Susp
            </span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 text-[var(--ink-faint)]">
          {market.limits && (
            <span className="num hidden text-[10px] sm:inline">
              {market.limits.currency} {market.limits.minBetValue.toLocaleString()}–
              {market.limits.maxBetValue.toLocaleString()}
            </span>
          )}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="pb-2">
          {allOverUnder && overUnderPairs.length > 0 && (
            <>
              {overUnderPairs.map(({ over, under }) => (
                <OverUnderRow
                  key={over.runnerId}
                  over={over}
                  under={under}
                  marketId={market.marketId}
                  marketName={market.marketName}
                  overPrice={priceFor(over)}
                  underPrice={priceFor(under)}
                  suspended={isSuspended}
                  isPendingFn={(sid) => pending(market.marketId, sid)}
                  onBet={onBetWithType}
                />
              ))}
            </>
          )}

          {isGrid && (
            <div className="grid grid-cols-3 gap-2 px-3 py-2">
              {market.runners.map((r) => (
                <GridCell
                  key={r.runnerId}
                  runner={r}
                  price={priceFor(r)}
                  marketId={market.marketId}
                  marketName={market.marketName}
                  suspended={isSuspended}
                  isPending={pending(market.marketId, r.runnerId)}
                  onBet={onBetWithType}
                />
              ))}
            </div>
          )}

          {!allOverUnder && !isGrid &&
            market.runners.map((r) => (
              <StandardRow
                key={r.runnerId}
                runner={r}
                price={priceFor(r)}
                marketId={market.marketId}
                marketName={market.marketName}
                suspended={isSuspended}
                isPending={pending(market.marketId, r.runnerId)}
                onBet={onBetWithType}
              />
            ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
   ───────────────────────────────────────────── */
export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  // Next.js sometimes hands back the param URL-encoded (`sr%3Amatch%3A...`)
  // depending on how the link was constructed. Decode once so the SR
  // detection regex and downstream Redis-key lookups all see the canonical
  // `sr:match:...` form.
  const matchId = decodeURIComponent((params.matchId as string) ?? "");
  const isSR = isSrMatch(matchId);

  const [event, setEvent] = useState<SrEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] =
    useState<"matchOdds" | "bookmakers" | "fancy" | "premium">("matchOdds");
  const [liveMarkets, setLiveMarkets] = useState<Map<string, LiveMarket>>(new Map());

  const [showTracker, setShowTracker] = useState(false);
  const [scoreUrl, setScoreUrl] = useState<string | null>(null);
  const [tvUrl, setTvUrl] = useState<string | null>(null);
  const [mediaView, setMediaView] = useState<"score" | "tv">("score");
  const [mediaLoading, setMediaLoading] = useState(false);

  const { addBet, placeSingleBet, oneClickEnabled, oneClickStake, isOneClickPending } = useBets();
  const { socket, isConnected, joinMatchRoom, leaveMatchRoom } = useSocket();
  const { isAuthenticated } = useAuth();

  /* ── Fetch SR event ── */
  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    const load = async () => {
      let data: SrEvent | null = null;
      if (isSR) {
        data = await fetchSrEvent(matchId);
        // Second window of patience before declaring the match missing.
        // Mirror lag + Cloudflare blip on a cold key can both miss
        // simultaneously; a 500ms-delayed second pull catches that.
        if (!data) {
          await new Promise((r) => setTimeout(r, 500));
          data = await fetchSrEvent(matchId);
        }
        if (data && !hasAnyMarkets(data.markets)) {
          const markets = await fetchSrMarketsFallback(matchId);
          if (markets) data = { ...data, markets };
        }
      } else {
        data = (await sportsApi
          .getMatchDetails(matchId)
          .catch(() => null)) as unknown as SrEvent | null;
      }
      if (cancelled) return;
      setEvent(data);
      setLoading(false);
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [matchId, isSR]);

  /* ── Polling fallback (only when socket is offline) ── */
  useEffect(() => {
    if (!matchId || !isSR || isConnected) return;
    let cancelled = false;
    const t = setInterval(async () => {
      const data = await fetchSrEvent(matchId);
      if (data && !cancelled) setEvent(data);
    }, 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [matchId, isSR, isConnected]);

  /* ── Socket: join / leave match room ── */
  useEffect(() => {
    if (!matchId) return;
    joinMatchRoom(matchId);
    return () => leaveMatchRoom(matchId);
  }, [matchId, joinMatchRoom, leaveMatchRoom]);

  /* ── Socket: heartbeat ── */
  useEffect(() => {
    if (!socket || !isConnected || !matchId) return;
    const tick = () => socket.emit("match-heartbeat", matchId);
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [socket, isConnected, matchId]);

  /* ── Socket: live odds ── */
  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      if (!data) return;
      if (data.messageType === "sportradar_odds" && data.eventId && data.eventId !== matchId) return;

      const oddsMsg =
        data.messageType === "odds" ||
        data.messageType === "match_odds" ||
        data.messageType === "sportradar_odds" ||
        data.messageType === "bookmaker_odds" ||
        data.messageType === "bm_odds";

      if (data.messageType === "market_status" && data.id) {
        setLiveMarkets((prev: Map<string, LiveMarket>) => {
          const next = new Map(prev);
          const mid = String(data.id);
          const ex: LiveMarket = next.get(mid) || { runners: new Map(), suspended: false };
          next.set(mid, { ...ex, suspended: data.ms === 4 });
          return next;
        });
        return;
      }

      if (!oddsMsg || !Array.isArray(data.data)) return;

      setLiveMarkets((prev: Map<string, LiveMarket>) => {
        const next = new Map(prev);
        const getM = (mid: string): LiveMarket => {
          if (!next.has(mid)) next.set(mid, { runners: new Map(), suspended: false });
          return next.get(mid)!;
        };
        data.data.forEach((u: any) => {
          const mid = String(u.bmi || u.mid || u.marketId || u.id || "");
          if (!mid) return;
          const m = getM(mid);
          if (u.ms !== undefined) m.suspended = u.ms === 4;

          if (Array.isArray(u.rt)) {
            u.rt.forEach((r: any) => {
              const rid = String(r.ri ?? r.runnerId ?? r.id ?? "");
              if (!rid) return;
              const ex: LiveRunnerOdds = m.runners.get(rid) || {};
              if (r.ib) m.runners.set(rid, { ...ex, backOdds: r.rt, backSize: r.bv });
              else m.runners.set(rid, { ...ex, layOdds: r.rt, laySize: r.bv });
            });
          }
          if (Array.isArray(u.runners)) {
            u.runners.forEach((r: any) => {
              const rid = String(r.runnerId ?? "");
              if (!rid) return;
              const back = r.backPrices?.[0]?.price;
              const lay = r.layPrices?.[0]?.price;
              const ex: LiveRunnerOdds = m.runners.get(rid) || {};
              m.runners.set(rid, {
                ...ex,
                ...(back != null ? { backOdds: back, backSize: r.backPrices?.[0]?.size } : {}),
                ...(lay != null ? { layOdds: lay, laySize: r.layPrices?.[0]?.size } : {}),
              });
            });
          }
        });
        return next;
      });
    };

    socket.on("socket-data", handler);
    socket.on("sports-lobby-data", handler);
    return () => {
      socket.off("socket-data", handler);
      socket.off("sports-lobby-data", handler);
    };
  }, [socket, matchId]);

  /* ── Refresh ── */
  const refresh = async () => {
    if (!matchId) return;
    setRefreshing(true);
    const data = isSR ? await fetchSrEvent(matchId) : null;
    if (data) setEvent(data);
    setRefreshing(false);
  };

  /* ── Tracker / TV ── */
  const sportId = String(event?.sportId || "");
  const toggleTracker = async () => {
    if (!showTracker) {
      setShowTracker(true);
      if (!scoreUrl && !mediaLoading && sportId) {
        setMediaLoading(true);
        try {
          const [s, t] = await Promise.all([
            sportsApi.getScoreUrl(sportId, matchId).catch(() => null),
            sportsApi.getTvUrl(sportId, matchId).catch(() => null),
          ]);
          if (s) setScoreUrl(s);
          if (t) setTvUrl(t);
        } finally {
          setMediaLoading(false);
        }
      }
    } else {
      setShowTracker(false);
    }
  };

  /* ── Bet handler ── */
  const handleBet: BetFn = async (p) => {
    if (!event) return;

    const bet = {
      eventId: event.eventId,
      eventName: event.eventName,
      provider: "sportradar",
      srSportId: String(event.sportId || ""),
      srMarketFullId: p.marketId,
      srRunnerId: p.selectionId,
      srRunnerName: p.selectionName,
      srMarketName: p.marketName,
      marketId: p.marketId,
      marketName: p.marketName,
      selectionId: p.selectionId,
      selectionName: p.selectionName,
      odds: p.odds,
      marketType: p.marketType,
      betType: p.betType,
    };

    if (!oneClickEnabled) {
      addBet(bet);
      return;
    }
    try {
      await placeSingleBet(bet);
      showBetPlacedToast({ selectionName: p.selectionName, stake: oneClickStake });
    } catch (e: any) {
      if (e?.message !== "Login required") showBetErrorToast(e);
    }
  };

  /* ── Derived ── */
  const status = norm(event?.status);
  const eventStatus = norm(event?.eventStatus);
  const isCompleted = closedStates.has(status) || closedStates.has(eventStatus);
  const isLive =
    !isCompleted && (liveStates.has(status) || liveStates.has(eventStatus));

  const homeTeam = event?.eventName?.split(/ vs\.? /i)[0]?.trim() || "Home";
  const awayTeam = event?.eventName?.split(/ vs\.? /i)[1]?.trim() || "Away";
  const compName = event?.competitionName || "";

  const matchOdds = event?.markets?.matchOdds || [];
  const bookmakers = event?.markets?.bookmakers || [];
  const fancyMarkets = event?.markets?.fancyMarkets || [];
  const premiumMarkets = event?.markets?.premiumMarkets || [];

  const tabs = useMemo(
    () =>
      [
        { key: "matchOdds" as const, label: "Match Odds", count: matchOdds.length },
        { key: "bookmakers" as const, label: "Bookmakers", count: bookmakers.length },
        { key: "fancy" as const, label: "Fancy", count: fancyMarkets.length },
        { key: "premium" as const, label: "Premium", count: premiumMarkets.length },
      ].filter((t) => t.count > 0),
    [matchOdds.length, bookmakers.length, fancyMarkets.length, premiumMarkets.length],
  );

  // Auto-pick first available tab if current is empty
  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.find((t) => t.key === activeTab)) setActiveTab(tabs[0].key);
  }, [tabs, activeTab]);

  const marketsForTab: SrMarket[] =
    activeTab === "matchOdds"
      ? matchOdds
      : activeTab === "bookmakers"
      ? (bookmakers as SrMarket[])
      : activeTab === "fancy"
      ? (fancyMarkets as SrMarket[])
      : (premiumMarkets as SrMarket[]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Trophy size={42} className="text-[var(--ink-whisper)]" />
        <h2 className="font-display text-lg font-black text-[var(--ink-strong)]">Match Not Found</h2>
        <p className="text-[13px] text-[var(--ink-faint)]">
          The match you’re looking for is no longer available.
        </p>
        <button onClick={() => router.push("/sports")} className="btn btn-ghost h-9 px-4">
          Back to Sports
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-4 px-2 py-3 md:px-4 md:py-4">
      {/* ─── Hero ─── */}
      <section
        className={`relative overflow-hidden rounded-none border md:rounded-[var(--r-2xl)] ${
          isLive
            ? "border-[var(--crimson)]/25 bg-gradient-to-b from-[var(--crimson-soft)] to-[var(--bg-surface)]"
            : "border-[var(--line-default)] bg-[var(--bg-surface)]"
        }`}
      >
        {isLive && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--crimson)]/70 to-transparent" />
        )}
        {!isLive && !isCompleted && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--gold)]/60 to-transparent" />
        )}

        {/* Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2.5 md:px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink-faint)] transition-colors hover:text-[var(--ink-strong)]"
          >
            <ChevronLeft size={14} />
            <Shield size={10} className="text-[var(--gold)]" />
            <span className="max-w-[180px] truncate sm:max-w-[280px]">{compName || "Sports"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] border border-[var(--line-default)] bg-[var(--bg-elevated)] text-[var(--ink-faint)] transition-colors hover:text-[var(--ink-strong)] disabled:opacity-40"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            </button>

            {!isLive && !isCompleted && (
              <span className="num flex items-center gap-1 text-[10px] text-[var(--ink-faint)]">
                <Clock size={10} /> {formatDateTime(event.openDate)}
              </span>
            )}
            {isLive && (
              <span className="chip chip-crimson">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--crimson)] animate-pulse" />
                Live
              </span>
            )}
            {isCompleted && (
              <span className="chip" style={{ color: "var(--ink-faint)" }}>
                Ended
              </span>
            )}
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-2 px-4 py-6 md:px-8 md:py-8">
          {/* Home */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div
              className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-[var(--r-lg)] border-2 md:h-20 md:w-20 ${
                isLive
                  ? "border-[var(--crimson)]/30 bg-[var(--crimson-soft)]"
                  : "border-[var(--gold-line)] bg-[var(--gold-soft)]"
              }`}
            >
              {event.team1Image ? (
                <img
                  src={event.team1Image}
                  alt={homeTeam}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span
                  className={`font-display text-xl font-black md:text-2xl ${
                    isLive ? "text-[var(--crimson)]" : "text-[var(--gold-bright)]"
                  }`}
                >
                  {getInitials(homeTeam)}
                </span>
              )}
            </div>
            <h2 className="line-clamp-2 w-full text-center text-[13px] font-bold text-[var(--ink-strong)] md:text-[15px]">
              {homeTeam}
            </h2>
          </div>

          {/* Score / VS */}
          <div className="flex flex-shrink-0 flex-col items-center gap-2 px-1 md:px-4">
            {isAuthenticated ? (
              (isLive || isCompleted) && (event.homeScore != null || event.awayScore != null) ? (
                <div
                  className={`num font-display whitespace-nowrap text-3xl font-black tracking-widest md:text-5xl ${
                    isLive ? "text-[var(--crimson)]" : "text-[var(--ink-strong)]"
                  }`}
                >
                  {event.homeScore ?? 0}
                  <span className="mx-1 text-[var(--ink-whisper)] md:mx-2">–</span>
                  {event.awayScore ?? 0}
                </div>
              ) : (
                <span className="font-display text-3xl font-black tracking-widest text-[var(--ink-whisper)] md:text-4xl">
                  VS
                </span>
              )
            ) : (
              <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-elevated)] px-3 py-2">
                <Lock size={12} className="text-[var(--ink-faint)]" />
                <span className="text-[11px] font-black text-[var(--ink-dim)]">
                  Login to view
                </span>
              </div>
            )}

            <div
              className={`text-[10px] font-black uppercase tracking-wider ${
                isLive
                  ? "text-[var(--crimson)]"
                  : isCompleted
                  ? "text-[var(--ink-faint)]"
                  : "text-[var(--ink-faint)]"
              }`}
            >
              {isCompleted ? "Full Time" : isLive ? "In Progress" : "Starting Soon"}
            </div>

            <button
              type="button"
              onClick={toggleTracker}
              className="mt-1 flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--ink-dim)] transition-colors hover:border-[var(--gold-line)] hover:text-[var(--gold-bright)]"
            >
              <Activity
                size={11}
                className={showTracker ? "text-[var(--emerald)]" : "text-[var(--ink-faint)]"}
              />
              {showTracker ? "Hide Tracker" : "Live Tracker"}
            </button>
          </div>

          {/* Away */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div
              className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-[var(--r-lg)] border-2 md:h-20 md:w-20 ${
                isLive
                  ? "border-[var(--crimson)]/30 bg-[var(--crimson-soft)]"
                  : "border-[var(--gold-line)] bg-[var(--gold-soft)]"
              }`}
            >
              {event.team2Image ? (
                <img
                  src={event.team2Image}
                  alt={awayTeam}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span
                  className={`font-display text-xl font-black md:text-2xl ${
                    isLive ? "text-[var(--crimson)]" : "text-[var(--gold-bright)]"
                  }`}
                >
                  {getInitials(awayTeam)}
                </span>
              )}
            </div>
            <h2 className="line-clamp-2 w-full text-center text-[13px] font-bold text-[var(--ink-strong)] md:text-[15px]">
              {awayTeam}
            </h2>
          </div>
        </div>

        {/* Tracker / TV */}
        {showTracker && (
          <div className="border-t border-[var(--line)] bg-black/40">
            {(scoreUrl || tvUrl) && (
              <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
                <button
                  type="button"
                  onClick={() => setMediaView("score")}
                  className={`py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                    mediaView === "score"
                      ? "border-b-2 border-[var(--gold)] text-[var(--gold-bright)]"
                      : "text-[var(--ink-faint)] hover:text-[var(--ink-dim)]"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Activity size={11} /> Scoreboard
                  </span>
                </button>
                {tvUrl && (
                  <button
                    type="button"
                    onClick={() => setMediaView("tv")}
                    className={`py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                      mediaView === "tv"
                        ? "border-b-2 border-[var(--crimson)] text-[var(--crimson)]"
                        : "text-[var(--ink-faint)] hover:text-[var(--ink-dim)]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Tv size={11} /> Live TV
                    </span>
                  </button>
                )}
              </div>
            )}

            {mediaLoading ? (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 md:h-[360px]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--ink-faint)]">
                  Loading {mediaView === "tv" ? "Live TV" : "Scoreboard"}
                </span>
              </div>
            ) : mediaView === "tv" && tvUrl ? (
              <iframe
                src={proxyUrl(tvUrl) || ""}
                className="h-[280px] w-full border-0 md:h-[420px]"
                title="Live TV"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : scoreUrl ? (
              <iframe
                src={proxyUrl(scoreUrl) || ""}
                className="h-[280px] w-full border-0 md:h-[360px]"
                title="Live Tracker"
              />
            ) : (
              <div className="flex h-[200px] items-center justify-center text-[11px] font-medium uppercase tracking-wider text-[var(--ink-faint)]">
                Tracker unavailable for this match
              </div>
            )}
          </div>
        )}

        {/* One-click controls */}
        <div className="border-t border-[var(--line)] px-3 py-3 md:px-4">
          <OneClickBetControls />
        </div>
      </section>

      {/* ─── Market tabs ─── */}
      {tabs.length > 0 && (
        <div className="sticky top-0 z-10 -mx-2 px-2 md:mx-0 md:px-0">
          <div className="glass flex items-center gap-1 overflow-x-auto rounded-none border-y border-[var(--line-default)] p-1 no-scrollbar md:rounded-[var(--r-lg)] md:border">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-[var(--r-sm)] px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                    active
                      ? "bg-[var(--gold-soft)] text-[var(--gold-bright)]"
                      : "text-[var(--ink-faint)] hover:bg-[var(--bg-elevated)] hover:text-[var(--ink-dim)]"
                  }`}
                >
                  {t.label}
                  <span
                    className={`num rounded px-1 py-0.5 text-[9px] ${
                      active
                        ? "bg-[var(--gold)]/15 text-[var(--gold-bright)]"
                        : "bg-[var(--bg-elevated)] text-[var(--ink-whisper)]"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Markets ─── */}
      <div className="space-y-2">
        {marketsForTab.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-surface)] py-12">
            <Activity size={28} className="text-[var(--ink-whisper)]" />
            <p className="text-[12px] font-black text-[var(--ink-dim)]">Markets not yet available</p>
            <p className="text-[11px] text-[var(--ink-faint)]">
              Odds will appear closer to match time
            </p>
          </div>
        ) : (
          marketsForTab.map((m) => (
            <MarketAccordion
              key={m.marketId}
              market={m}
              liveMarket={liveMarkets.get(m.marketId)}
              onBet={handleBet}
              isCompleted={isCompleted}
              pending={(mid, sid) => isOneClickPending(event.eventId, mid, sid)}
            />
          ))
        )}
      </div>
    </div>
  );
}
