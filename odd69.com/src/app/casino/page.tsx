"use client";

import React, { useEffect, useMemo, useState, Suspense, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search, X, Flame, Star, Sparkles, Rocket, Play, Gamepad2,
  Loader2, ArrowRight, Zap, LayoutGrid, Dice5, Tickets, CircleDot,
  Target, Fish, Drama, Trophy, House, ArrowDown,
} from "lucide-react";
import { IoGameController } from "react-icons/io5";
import { BiErrorAlt } from "react-icons/bi";
import { casinoService } from "@/services/casino";
import { useAuth } from "@/context/AuthContext";
import GamePlayInterface from "@/components/casino/GamePlayInterface";

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
interface LaunchableGame {
  id?: string; name?: string; gameName?: string;
  provider?: string; providerCode?: string; gameCode?: string;
  image?: string; banner?: string; url?: string; tag?: string;
}

/* ═════════════════════════════════════════════════════════════════════
   CATEGORY RAIL
   ═════════════════════════════════════════════════════════════════════ */
const CASINO_RAIL = [
  { key: "all",       label: "Lobby",       Icon: House },
  { key: "popular",   label: "Hot Games",   Icon: Flame },
  { key: "slots",     label: "Slots",       Icon: Tickets },
  { key: "live",      label: "Live",        Icon: Star },
  { key: "table",     label: "Table",       Icon: Dice5 },
  { key: "crash",     label: "Crash",       Icon: Rocket },
  { key: "new",       label: "New",         Icon: Sparkles },
  { key: "top-slots", label: "Top Slots",   Icon: Target },
  { key: "fishing",   label: "Fishing",     Icon: Fish },
  { key: "blackjack", label: "Blackjack",   Icon: Drama },
  { key: "roulette",  label: "Roulette",    Icon: CircleDot },
  { key: "baccarat",  label: "Baccarat",    Icon: Trophy },
  { key: "exclusive", label: "Exclusive",   Icon: Zap },
];

/* ═════════════════════════════════════════════════════════════════════
   LIVE TICKER — heartbeat strip
   ═════════════════════════════════════════════════════════════════════ */
function LiveTicker() {
  const items = [
    "JACKPOT POOL ₹48,27,194",
    "247 PLAYERS LIVE",
    "GATES OF OLYMPUS · HOT STREAK",
    "LIVE BACCARAT · TABLE 7 OPEN",
    "AVIATOR · ROUND 18,442",
    "₹2,11,450 PAID OUT THIS HOUR",
    "MEGA WHEEL × 50 SPIN",
    "SWEET BONANZA · 1000X HIT",
  ];
  const stream = [...items, ...items, ...items];
  return (
    <div className="relative border-y border-[var(--gold-line)] bg-[var(--bg-base)]/60 overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-[var(--bg-base)] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-[var(--bg-base)] to-transparent z-10 pointer-events-none" />
      <div className="flex items-center gap-8 py-2.5 animate-scroll whitespace-nowrap will-change-transform">
        {stream.map((t, i) => (
          <span key={i} className="num inline-flex items-center gap-2.5 text-[10px] sm:text-[11px] text-[var(--ink-dim)] font-semibold tracking-[0.18em] uppercase">
            <span className="w-1 h-1 rounded-full bg-[var(--gold)] shadow-[0_0_8px_var(--gold-halo)]" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   MASTHEAD HERO — editorial typographic statement
   ═════════════════════════════════════════════════════════════════════ */
function Masthead({ totalGames, onScrollToLobby }: { totalGames: number; onScrollToLobby: () => void }) {
  // Synthetic but believable live counter
  const [playersLive, setPlayersLive] = useState(247);
  useEffect(() => {
    const t = setInterval(() => {
      setPlayersLive((n) => Math.max(180, Math.min(420, n + Math.floor(Math.random() * 11) - 5)));
    }, 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="page-x relative">
      <div className="relative overflow-hidden rounded-[24px] border border-[var(--gold-line)] bg-gold-soft grain dotgrid">
        {/* Decorative gold orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-[460px] h-[460px] rounded-full bg-[radial-gradient(circle,var(--gold-halo),transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,var(--violet-soft),transparent_65%)] blur-3xl" />

        {/* Corner index marks — luxury watch face */}
        <CornerIndex position="tl" />
        <CornerIndex position="tr" />
        <CornerIndex position="bl" />
        <CornerIndex position="br" />

        {/* Issue mark */}
        <div className="absolute top-4 right-5 sm:top-6 sm:right-8 z-10 hidden sm:flex items-center gap-2">
          <span className="t-eyebrow">Issue №01 · 2026</span>
          <span className="w-1 h-1 rounded-full bg-[var(--gold)]" />
          <span className="t-eyebrow">In Play Now</span>
        </div>

        <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-6 lg:gap-12 p-5 sm:p-8 md:p-12 lg:p-16">
          {/* Left: typographic masthead */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-4 sm:mb-6 flex-wrap">
              <span className="chip chip-gold">
                <Sparkles size={10} /> The Gold Room
              </span>
              <span className="chip chip-emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-live-dot" />
                Open · 24/7
              </span>
            </div>

            <h1
              className="font-display italic font-extrabold leading-[0.86] tracking-[-0.045em] text-[var(--ink)] mb-3 sm:mb-4"
              style={{ fontSize: "clamp(40px, 9vw, 124px)" }}
            >
              The
              <br />
              <span className="text-gold-grad">Gold&nbsp;Room.</span>
            </h1>

            <p className="font-display text-[16px] sm:text-[18px] md:text-[22px] text-[var(--ink-dim)] tracking-tight max-w-xl mb-5 sm:mb-7">
              Spin <span className="text-[var(--gold)]">·</span> Deal <span className="text-[var(--gold)]">·</span> Crash <span className="text-[var(--gold)]">·</span> Win.
              <span className="block text-[12px] sm:text-[13px] text-[var(--ink-faint)] font-body mt-2 tracking-normal">
                Slots, live tables, crash rails and originals — every tile audited, every payout instant.
              </span>
            </p>

            {/* Inline meta row */}
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap mb-5 sm:mb-6">
              <Stat label="Tiles" value={String(totalGames || 1200)} suffix="+" />
              <span className="hairline w-6 sm:w-10 inline-block" />
              <Stat label="Studios" value="32" />
              <span className="hairline w-6 sm:w-10 inline-block" />
              <Stat label="Avg. Payout" value="< 6s" />
            </div>

            <button
              onClick={onScrollToLobby}
              className="btn btn-gold sweep min-h-[48px] px-6 text-[12px] uppercase tracking-[0.12em]"
            >
              Enter Lobby <ArrowDown size={14} strokeWidth={3} />
            </button>
          </div>

          {/* Right: live counter card */}
          <div className="lg:self-end lg:min-w-[260px]">
            <div className="relative overflow-hidden rounded-[18px] border border-[var(--gold-line)] bg-[var(--bg-elevated)]/70 backdrop-blur-md p-5 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="t-eyebrow">Players Live</span>
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--emerald)] font-mono uppercase tracking-[0.18em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-live-dot" />
                  Now
                </span>
              </div>
              <div className="num font-display font-extrabold text-[var(--ink)] leading-none tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 8vw, 88px)" }}>
                {playersLive}
              </div>
              <div className="hairline my-4" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="t-eyebrow !text-[9px]">Pool</div>
                  <div className="num font-display font-bold text-[var(--gold-bright)] text-[15px] sm:text-[17px]">₹48.27L</div>
                </div>
                <div>
                  <div className="t-eyebrow !text-[9px]">This Hour</div>
                  <div className="num font-display font-bold text-[var(--ink)] text-[15px] sm:text-[17px]">₹2.11L</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <div className="t-eyebrow !text-[9px] mb-0.5">{label}</div>
      <div className="num font-display font-bold text-[var(--ink)] text-[18px] sm:text-[22px] leading-none tracking-tight">
        {value}<span className="text-[var(--gold)]">{suffix}</span>
      </div>
    </div>
  );
}

function CornerIndex({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const cls: Record<string, string> = {
    tl: "top-2.5 left-2.5 border-t border-l",
    tr: "top-2.5 right-2.5 border-t border-r",
    bl: "bottom-2.5 left-2.5 border-b border-l",
    br: "bottom-2.5 right-2.5 border-b border-r",
  };
  return (
    <span
      aria-hidden
      className={`absolute w-3 h-3 ${cls[position]} border-[var(--gold)] opacity-60 pointer-events-none`}
    />
  );
}

/* ═════════════════════════════════════════════════════════════════════
   SECTION MARK — magazine-style numbered divider
   ═════════════════════════════════════════════════════════════════════ */
function SectionMark({ num, kicker, title, action }: { num: string; kicker?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
      <div className="flex items-end gap-3 sm:gap-4 min-w-0">
        <div className="num font-display font-bold text-[28px] sm:text-[36px] leading-none tracking-[-0.04em] text-[var(--gold-bright)]">
          §{num}
        </div>
        <div className="min-w-0">
          {kicker && <div className="t-eyebrow mb-0.5">{kicker}</div>}
          <h2 className="font-display font-bold text-[var(--ink)] text-[20px] sm:text-[26px] tracking-[-0.025em] leading-none truncate">
            {title}
          </h2>
        </div>
      </div>
      {action}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   GAME CARD — refined, with corner index, vertical provider strip, lift on hover
   ═════════════════════════════════════════════════════════════════════ */
function GameCard({ game, onPlay, index }: { game: LaunchableGame; onPlay: (g: LaunchableGame) => void; index: number }) {
  const [imgErr, setImgErr] = useState(false);
  const src = game.image || game.banner || "";
  const provider = (game.provider || "").trim();

  return (
    <button
      onClick={() => onPlay(game)}
      className="group relative text-left focus:outline-none animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 24) * 24}ms`, animationFillMode: "both" }}
    >
      <div className="relative aspect-[3/4] rounded-[14px] overflow-hidden border border-[var(--line-default)] group-hover:border-[var(--line-gold)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)] bg-[var(--bg-surface)]">
        {/* Image */}
        {!imgErr && src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={game.name || "Game"}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-[1.08] transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-base)]">
            <IoGameController size={28} className="text-[var(--ink-whisper)]" />
          </div>
        )}

        {/* Bottom scrim for legibility */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="relative grid place-items-center w-12 h-12 rounded-full bg-gold-grad shadow-[0_8px_24px_var(--gold-halo)] ring-1 ring-inset ring-white/40 scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play size={16} className="text-[#120c00] ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Corner index marks (visible on hover) */}
        <span aria-hidden className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-[var(--gold-bright)] opacity-0 group-hover:opacity-90 transition-opacity duration-300" />
        <span aria-hidden className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-[var(--gold-bright)] opacity-0 group-hover:opacity-90 transition-opacity duration-300" />
        <span aria-hidden className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-[var(--gold-bright)] opacity-0 group-hover:opacity-90 transition-opacity duration-300" />
        <span aria-hidden className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-[var(--gold-bright)] opacity-0 group-hover:opacity-90 transition-opacity duration-300" />

        {/* Tag */}
        {game.tag && (
          <div className="absolute top-2 left-2 z-10">
            <span className="chip chip-gold !py-0.5 !px-2 !text-[9px]">{game.tag}</span>
          </div>
        )}

        {/* Vertical provider strip on left edge — appears on hover */}
        {provider && (
          <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 origin-left translate-x-2 opacity-0 group-hover:opacity-90 group-hover:translate-x-3 transition-all duration-300 pointer-events-none">
            <span className="num text-[8.5px] uppercase tracking-[0.32em] text-[var(--gold-bright)] whitespace-nowrap">
              {provider.slice(0, 18)}
            </span>
          </div>
        )}

        {/* Title row */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 z-10">
          {provider && (
            <span className="t-eyebrow !text-[8.5px] !text-[var(--ink-whisper)] block mb-0.5 truncate">
              {provider.slice(0, 14)}
            </span>
          )}
          <p className="font-display text-[12.5px] sm:text-[13px] font-bold text-[var(--ink)] truncate leading-tight tracking-tight">
            {game.name || "Game"}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   FEATURED COLLECTION — asymmetric 1 + 2 composition (lobby only)
   ═════════════════════════════════════════════════════════════════════ */
function FeaturedCollection({ games, onPlay }: { games: LaunchableGame[]; onPlay: (g: LaunchableGame) => void }) {
  if (games.length < 3) return null;
  const [hero, ...rest] = games.slice(0, 3);
  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3 sm:gap-4">
      {/* Hero feature */}
      <FeaturedCard game={hero} kicker="Editor's Pick №01" tall onPlay={onPlay} />
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
        <FeaturedCard game={rest[0]} kicker="Hot Right Now" onPlay={onPlay} />
        <FeaturedCard game={rest[1]} kicker="Studio Drop"   onPlay={onPlay} />
      </div>
    </div>
  );
}

function FeaturedCard({ game, kicker, tall, onPlay }: { game: LaunchableGame; kicker: string; tall?: boolean; onPlay: (g: LaunchableGame) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const src = game.image || game.banner || "";
  return (
    <button
      onClick={() => onPlay(game)}
      className={`group relative text-left focus:outline-none rounded-[18px] overflow-hidden border border-[var(--line-default)] hover:border-[var(--line-gold)] transition-all duration-300 hover:shadow-[var(--shadow-lift)] bg-[var(--bg-surface)] ${tall ? "min-h-[280px] sm:min-h-[360px] lg:min-h-[480px]" : "min-h-[140px] sm:min-h-[170px] lg:min-h-[230px]"}`}
    >
      {!imgErr && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={game.name || "Featured"}
          onError={() => setImgErr(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-[900ms] ease-out"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-base)]" />
      )}

      {/* Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />

      {/* Corner accents */}
      <span aria-hidden className="absolute top-3 left-3 w-3 h-3 border-t border-l border-[var(--gold-bright)] opacity-80" />
      <span aria-hidden className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-[var(--gold-bright)] opacity-80" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-4 sm:p-5 lg:p-7">
        <div>
          <span className="chip chip-gold !py-0.5 !px-2 !text-[9px]">{kicker}</span>
        </div>
        <div>
          {game.provider && (
            <div className="t-eyebrow !text-[9px] !text-[var(--ink-whisper)] mb-1">{game.provider.slice(0, 18)}</div>
          )}
          <h3 className={`font-display font-extrabold italic text-[var(--ink)] leading-[0.95] tracking-[-0.025em] ${tall ? "text-[28px] sm:text-[40px] lg:text-[56px]" : "text-[18px] sm:text-[22px] lg:text-[28px]"}`}>
            {game.name || "Featured Game"}
          </h3>
          <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-[var(--gold-bright)] text-[11px] sm:text-[12px] font-mono uppercase tracking-[0.16em] group-hover:text-[var(--gold)] transition-colors">
            Play Now <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   PROVIDER MONOGRAM
   ═════════════════════════════════════════════════════════════════════ */
function ProviderMonogram({ provider, selected, onClick }: { provider: { provider: string; logo?: string }; selected: boolean; onClick: () => void }) {
  const monogram = (provider.provider || "").slice(0, 2).toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-[12px] border text-[11px] font-semibold transition-all flex-shrink-0 whitespace-nowrap min-h-[44px] ${
        selected
          ? "bg-[var(--gold-soft)] border-[var(--gold-line)] text-[var(--gold-bright)] shadow-[0_0_0_1px_var(--gold-line)_inset]"
          : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
      }`}
    >
      {provider.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={provider.logo} alt={provider.provider} className="w-5 h-5 rounded-md object-contain opacity-80" />
      ) : (
        <span className={`grid place-items-center w-6 h-6 rounded-md text-[9px] font-mono font-bold border ${
          selected
            ? "bg-[var(--gold-grad)] border-[var(--gold)] text-[#120c00]"
            : "bg-[var(--bg-elevated)] border-[var(--line-default)] text-[var(--ink-dim)]"
        }`}>{monogram}</span>
      )}
      <span className="capitalize">{provider.provider}</span>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   MAIN CONTENT
   ═════════════════════════════════════════════════════════════════════ */
function CasinoContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "all";
  const providerParam = searchParams.get("provider") || "all";

  const { user } = useAuth();
  const [games, setGames] = useState<LaunchableGame[]>([]);
  const [providers, setProviders] = useState<{ provider: string; logo?: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedProvider, setSelectedProvider] = useState(providerParam);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalGames, setTotalGames] = useState(0);

  const [activeGame, setActiveGame] = useState<{ id: string; name: string; provider: string; url: string } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const lobbyRef = useRef<HTMLDivElement>(null);

  /* Sync URL params */
  useEffect(() => { setSelectedCategory(categoryParam); setPage(1); }, [categoryParam]);
  useEffect(() => { setSelectedProvider(providerParam); setPage(1); }, [providerParam]);

  /* Load providers */
  useEffect(() => {
    casinoService.getProviders()
      .then((data: { provider: string; logo?: string }[]) => setProviders(data))
      .catch(() => {});
  }, []);

  /* Load games */
  const loadGames = useCallback(async (p: number, append = false) => {
    setLoading(true);
    try {
      const cat = selectedCategory === "all" ? undefined : selectedCategory;
      const prov = selectedProvider === "all" ? undefined : selectedProvider;
      const search = searchQuery || undefined;
      const res = await casinoService.getGames(prov, cat, search, p, 40);
      const newGames: LaunchableGame[] = res.games || [];
      setGames((prev) => (append ? [...prev, ...newGames] : newGames));
      setTotalGames(res.totalCount || newGames.length);
      setHasMore(newGames.length >= 40);
    } catch { setGames([]); }
    finally { setLoading(false); }
  }, [selectedCategory, selectedProvider, searchQuery]);

  useEffect(() => { loadGames(1); }, [loadGames]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadGames(next, true);
  };

  const updateURL = (cat: string, prov: string) => {
    const params = new URLSearchParams();
    if (cat !== "all") params.set("category", cat);
    if (prov !== "all") params.set("provider", prov);
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(url, { scroll: false });
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSearchQuery("");
    setPage(1);
    updateURL(cat, selectedProvider);
  };

  const handleProviderSelect = (prov: string) => {
    setSelectedProvider(prov);
    setSearchQuery("");
    setPage(1);
    updateURL(selectedCategory, prov);
  };

  /* Launch */
  const handleGameLaunch = async (gameData: LaunchableGame) => {
    if (gameData.url) {
      setActiveGame({
        id: gameData.gameCode || gameData.id || "",
        name: gameData.name || gameData.gameName || "",
        provider: gameData.providerCode || gameData.provider || "",
        url: gameData.url,
      });
      setLaunchError(null);
      return;
    }
    if (!user) { alert("Please login to play"); return; }
    const providerCode = gameData.providerCode || gameData.provider;
    const gameId = gameData.gameCode || gameData.id;
    if (!providerCode || !gameId) { setLaunchError("Game data is incomplete."); return; }

    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await casinoService.launchGame({ username: user.username, provider: providerCode, gameId, isLobby: false });
      if (res?.url) {
        setActiveGame({
          id: gameId,
          name: gameData.name || gameData.gameName || "",
          provider: providerCode,
          url: res.url,
        });
      } else { setLaunchError("Could not get game URL."); }
    } catch (error: unknown) {
      setLaunchError(error instanceof Error ? error.message : "Failed to launch game.");
    } finally { setLaunching(false); }
  };

  const activeCat = CASINO_RAIL.find((c) => c.key === selectedCategory);
  const showingLobby = selectedCategory === "all" && selectedProvider === "all" && !searchQuery;

  const scrollToLobby = () => lobbyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      {/* ── Launching overlay ── */}
      {launching && (
        <div className="fixed inset-0 z-[600] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border-2 border-[var(--gold-line)] border-t-[var(--gold)] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <IoGameController size={22} className="text-[var(--gold)]" />
            </div>
          </div>
          <p className="t-eyebrow !text-[11px] text-[var(--ink-dim)] animate-pulse">Launching game…</p>
        </div>
      )}

      {/* ── Launch error overlay ── */}
      {launchError && (
        <div className="fixed inset-0 z-[600] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-5 px-6">
          <div className="w-16 h-16 rounded-[16px] bg-[var(--crimson-soft)] border border-[color:var(--crimson)]/25 flex items-center justify-center">
            <BiErrorAlt size={28} className="text-[var(--crimson)]" />
          </div>
          <div className="text-center">
            <h2 className="font-display text-[18px] font-bold text-[var(--ink)] mb-1">Unable to Launch</h2>
            <p className="text-[13px] text-[var(--ink-faint)]">{launchError}</p>
          </div>
          <button
            onClick={() => setLaunchError(null)}
            className="btn btn-ghost h-10 uppercase tracking-[0.06em] text-[11px]"
          >
            <X size={14} /> Close
          </button>
        </div>
      )}

      {/* ── Game overlay ── */}
      {activeGame && (
        <div className="fixed inset-0 z-[500] bg-[var(--bg-base)] flex flex-col">
          <GamePlayInterface game={activeGame} onClose={() => setActiveGame(null)} isEmbedded={false} key={activeGame.id} />
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="max-w-[1680px] mx-auto pt-3 sm:pt-4 pb-8 sm:pb-12">

        {/* Live ticker — heartbeat */}
        <div className="mb-5 sm:mb-7">
          <LiveTicker />
        </div>

        {/* Masthead — only on lobby */}
        {showingLobby && (
          <div className="mb-8 sm:mb-12">
            <Masthead totalGames={totalGames} onScrollToLobby={scrollToLobby} />
          </div>
        )}

        {/* ── SEARCH ── */}
        <section className="page-x mb-6 sm:mb-8">
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--gold)] hidden sm:inline">Q.</span>
            <Search
              className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search 1,200+ games — slot, provider, or table…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-[var(--bg-surface)] border border-[var(--line-default)] focus:border-[var(--line-gold)] text-[var(--ink)] rounded-[14px] py-3.5 pl-11 sm:pl-20 pr-12 outline-none text-[14px] sm:text-[15px] placeholder:text-[var(--ink-faint)] transition-colors"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-[10px] text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-white/[0.04]"
              >
                <X size={14} />
              </button>
            ) : (
              <span className="hidden sm:inline absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--ink-whisper)]">
                ⌘K
              </span>
            )}
          </div>
        </section>

        {/* ── CATEGORY RAIL ── */}
        <section className="page-x mb-8 sm:mb-10">
          <SectionMark
            num="I"
            kicker="Browse"
            title="Categories"
            action={
              <span className="hidden sm:inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                Swipe <ArrowRight size={12} />
              </span>
            }
          />
          <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x snap-proximity">
            {CASINO_RAIL.map(({ key, label, Icon }) => {
              const active = selectedCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => handleCategoryChange(key)}
                  className={`snap-start flex shrink-0 items-center gap-2 rounded-[12px] px-3.5 min-h-[44px] text-[12px] font-semibold transition-all border ${
                    active
                      ? "bg-[var(--gold-soft)] border-[var(--gold-line)] text-[var(--gold-bright)] shadow-[0_0_20px_var(--gold-halo)]"
                      : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
                  }`}
                >
                  <span className={`grid place-items-center w-6 h-6 rounded-full ${
                    active
                      ? "bg-[var(--gold-grad)] text-[#120c00]"
                      : "bg-[var(--bg-elevated)] text-[var(--ink-faint)]"
                  }`}>
                    <Icon size={12} />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── FEATURED COLLECTION ── (lobby only, after we have games) */}
        {showingLobby && games.length >= 3 && (
          <section className="page-x mb-10 sm:mb-14">
            <SectionMark num="II" kicker="The Floor" title="Featured Collection" />
            <FeaturedCollection games={games} onPlay={handleGameLaunch} />
          </section>
        )}

        {/* ── PROVIDER STRIP ── */}
        {providers.length > 0 && (
          <section className="page-x mb-8 sm:mb-10">
            <SectionMark
              num="III"
              kicker="Studios"
              title="By Provider"
              action={
                selectedProvider !== "all" ? (
                  <button
                    onClick={() => handleProviderSelect("all")}
                    className="chip !py-1.5 !px-3 hover:border-[var(--line-strong)]"
                  >
                    Clear
                  </button>
                ) : null
              }
            />
            <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x snap-proximity">
              <button
                onClick={() => handleProviderSelect("all")}
                className={`snap-start flex items-center gap-2 px-3 min-h-[44px] rounded-[12px] border text-[11px] font-semibold transition-all flex-shrink-0 ${
                  selectedProvider === "all"
                    ? "bg-[var(--gold-soft)] border-[var(--gold-line)] text-[var(--gold-bright)]"
                    : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)]"
                }`}
              >
                <LayoutGrid size={12} /> All Studios
              </button>
              {providers.slice(0, 24).map((p) => (
                <ProviderMonogram
                  key={p.provider}
                  provider={p}
                  selected={selectedProvider === p.provider}
                  onClick={() => handleProviderSelect(p.provider)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── LOBBY GRID ── */}
        <section ref={lobbyRef} className="page-x scroll-mt-24">
          <SectionMark
            num="IV"
            kicker={searchQuery ? "Search" : "Lobby"}
            title={searchQuery ? `"${searchQuery}"` : (activeCat?.label || "All Games")}
            action={
              !loading && totalGames > 0 ? (
                <span className="chip chip-gold !py-1.5">
                  <span className="num">{totalGames}</span> tiles
                </span>
              ) : null
            }
          />
          <p className="t-section-sub mb-5 sm:mb-6 -mt-3 sm:-mt-4">
            {searchQuery
              ? <>Showing matches for <span className="text-[var(--ink-dim)]">&quot;{searchQuery}&quot;</span></>
              : <>Hand-picked from <span className="num text-[var(--gold-bright)]">{providers.length || 32}</span> studios — every tile audited, every payout instant.</>}
          </p>

          {/* Loading skeleton */}
          {loading && games.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-[14px] bg-[var(--bg-surface)] border border-[var(--line-default)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[shimmer_1.6s_infinite] bg-[length:200%_100%]" />
                </div>
              ))}
            </div>
          )}

          {/* Game grid */}
          {games.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3">
              {games.map((game, i) => (
                <GameCard
                  key={(game.id || game.gameCode || "g") + i}
                  game={game}
                  onPlay={handleGameLaunch}
                  index={i}
                />
              ))}
            </div>
          )}

          {/* Empty state — editorial poster */}
          {!loading && games.length === 0 && (
            <div className="relative overflow-hidden rounded-[20px] border border-[var(--line-default)] bg-gold-soft grain dotgrid p-8 sm:p-14 text-center">
              <CornerIndex position="tl" />
              <CornerIndex position="tr" />
              <CornerIndex position="bl" />
              <CornerIndex position="br" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-[14px] bg-[var(--bg-elevated)] border border-[var(--line-gold)] flex items-center justify-center mx-auto mb-5">
                  <IoGameController size={26} className="text-[var(--gold)]" />
                </div>
                <p className="t-eyebrow mb-2">No Match · §404</p>
                <h3 className="font-display italic font-extrabold text-[28px] sm:text-[44px] leading-none tracking-[-0.025em] text-[var(--ink)] mb-3">
                  The floor is <span className="text-gold-grad">empty</span>.
                </h3>
                <p className="text-[13px] text-[var(--ink-faint)] mb-5 max-w-md mx-auto">
                  Try a different category, drop the provider filter, or clear the search to see the full lobby.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    handleCategoryChange("all");
                    handleProviderSelect("all");
                  }}
                  className="btn btn-gold sweep min-h-[44px] px-5 text-[11px] uppercase tracking-[0.12em]"
                >
                  Clear filters <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Load more */}
          {hasMore && games.length > 0 && !loading && (
            <div className="flex justify-center pt-8 sm:pt-10">
              <button
                onClick={loadMore}
                className="btn btn-ghost min-h-[44px] px-5 uppercase tracking-[0.12em] text-[11px]"
              >
                Load more games <ArrowRight size={12} />
              </button>
            </div>
          )}

          {loading && games.length > 0 && (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="text-[var(--gold)] animate-spin" />
            </div>
          )}
        </section>

        {/* ── FOOTER MARK ── */}
        <section className="page-x mt-12 sm:mt-16">
          <div className="hairline mb-4" />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="num text-[var(--gold-bright)] text-[20px] font-display font-bold tracking-[-0.04em]">odd<span className="text-[var(--gold)]">69</span></div>
              <span className="t-eyebrow">Casino · 2026</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
              <span className="t-eyebrow">▮ Provably Fair</span>
              <span className="t-eyebrow">▮ Instant Payouts</span>
              <span className="t-eyebrow">▮ 24/7 Support</span>
              <span className="t-eyebrow">▮ WCO Licensed</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   EXPORT
   ═════════════════════════════════════════════════════════════════════ */
export default function CasinoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)]" />
        </div>
      }
    >
      <CasinoContent />
    </Suspense>
  );
}
