"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bomb,
  ChevronRight,
  CircleDot,
  Coins,
  Crown,
  Dice5,
  Disc3,
  Hash,
  Layers,
  Plane,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Tickets,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useOriginalsAccess } from "@/hooks/useOriginalsAccess";

interface OriginalsGame {
  gameKey: string;
  gameName: string;
  gameDescription: string;
  thumbnailUrl: string | null;
  isActive: boolean;
  fakePlayerMin: number;
  fakePlayerMax: number;
  displayRtpPercent: number;
}

// Fallback static data
const STATIC_GAMES: OriginalsGame[] = [
  {
    gameKey: "mines",
    gameName: "Zeero Mines",
    gameDescription: "Dodge the mines, collect the gems. Cash out before you explode.",
    thumbnailUrl: null,
    isActive: true,
    fakePlayerMin: 200,
    fakePlayerMax: 300,
    displayRtpPercent: 95,
  },
  {
    gameKey: "crash",
    gameName: "Zeero Crash",
    gameDescription: "Watch the multiplier climb. Cash out before it crashes.",
    thumbnailUrl: null,
    isActive: true,
    fakePlayerMin: 180,
    fakePlayerMax: 280,
    displayRtpPercent: 96,
  },
  {
    gameKey: "dice",
    gameName: "Zeero Dice",
    gameDescription: "Roll the dice, set your target, beat the house.",
    thumbnailUrl: null,
    isActive: true,
    fakePlayerMin: 120,
    fakePlayerMax: 220,
    displayRtpPercent: 97,
  },
  {
    gameKey: "limbo",
    gameName: "Zeero Limbo",
    gameDescription: "Pick your multiplier and beat the bust point.",
    thumbnailUrl: null,
    isActive: true,
    fakePlayerMin: 140,
    fakePlayerMax: 240,
    displayRtpPercent: 96,
  },
  {
    gameKey: "plinko",
    gameName: "Zeero Plinko",
    gameDescription: "Drop the ball and chase riskier multiplier slots.",
    thumbnailUrl: null,
    isActive: true,
    fakePlayerMin: 90,
    fakePlayerMax: 160,
    displayRtpPercent: 97,
  },
  {
    gameKey: "keno",
    gameName: "Zeero Keno",
    gameDescription: "Pick your lucky numbers and hit the board.",
    thumbnailUrl: null,
    isActive: false,
    fakePlayerMin: 70,
    fakePlayerMax: 140,
    displayRtpPercent: 95.5,
  },
  {
    gameKey: "hilo",
    gameName: "Zeero Hi-Lo",
    gameDescription: "Guess whether the next card goes higher or lower.",
    thumbnailUrl: null,
    isActive: false,
    fakePlayerMin: 60,
    fakePlayerMax: 110,
    displayRtpPercent: 96,
  },
  {
    gameKey: "roulette",
    gameName: "Zeero Roulette",
    gameDescription: "Cover your numbers and let the wheel decide.",
    thumbnailUrl: null,
    isActive: false,
    fakePlayerMin: 80,
    fakePlayerMax: 150,
    displayRtpPercent: 94.7,
  },
  {
    gameKey: "wheel",
    gameName: "Zeero Wheel",
    gameDescription: "Spin a fast bonus wheel for instant multipliers.",
    thumbnailUrl: null,
    isActive: false,
    fakePlayerMin: 50,
    fakePlayerMax: 120,
    displayRtpPercent: 95.2,
  },
  {
    gameKey: "coinflip",
    gameName: "Zeero Coinflip",
    gameDescription: "Call heads or tails and settle each round instantly.",
    thumbnailUrl: null,
    isActive: false,
    fakePlayerMin: 65,
    fakePlayerMax: 135,
    displayRtpPercent: 97.1,
  },
  {
    gameKey: "towers",
    gameName: "Zeero Towers",
    gameDescription: "Climb one floor at a time and cash out before you fall.",
    thumbnailUrl: null,
    isActive: false,
    fakePlayerMin: 55,
    fakePlayerMax: 125,
    displayRtpPercent: 96.4,
  },
  {
    gameKey: "color",
    gameName: "Zeero Color",
    gameDescription: "Pick a color lane and ride short, fast multiplier rounds.",
    thumbnailUrl: null,
    isActive: false,
    fakePlayerMin: 75,
    fakePlayerMax: 155,
    displayRtpPercent: 95.8,
  },
  {
    gameKey: "lotto",
    gameName: "Zeero Lotto",
    gameDescription: "Choose your ticket line and chase oversized payout grids.",
    thumbnailUrl: null,
    isActive: false,
    fakePlayerMin: 45,
    fakePlayerMax: 95,
    displayRtpPercent: 94.9,
  },
  {
    gameKey: "jackpot",
    gameName: "Zeero Jackpot",
    gameDescription: "Snap into boosted prize pots with a high-volatility hit chase.",
    thumbnailUrl: null,
    isActive: false,
    fakePlayerMin: 35,
    fakePlayerMax: 85,
    displayRtpPercent: 94.5,
  },
];

const LAUNCHABLE_GAME_KEYS = new Set(["mines", "crash", "dice", "limbo", "plinko"]);

const GAME_EMOJI: Record<string, string> = {
  mines: "💎",
  crash: "🚀",
  dice: "🎲",
  limbo: "✈️",
  plinko: "🪙",
  keno: "🔢",
  hilo: "🃏",
  roulette: "🎯",
  wheel: "🎡",
  coinflip: "🪙",
  towers: "🗼",
  color: "🔴",
  lotto: "🎟️",
  jackpot: "👑",
};

const GAME_ACCENT: Record<string, string> = {
  mines: "text-green-400",
  crash: "text-purple-300",
  dice: "text-amber-400",
  limbo: "text-indigo-300",
  plinko: "text-amber-300",
  keno: "text-rose-300",
  hilo: "text-cyan-300",
  roulette: "text-red-300",
  wheel: "text-sky-300",
  coinflip: "text-yellow-300",
  towers: "text-stone-300",
  color: "text-pink-300",
  lotto: "text-teal-300",
  jackpot: "text-orange-300",
};

const GAME_BORDER: Record<string, string> = {
  mines: "border-green-500/20 hover:border-green-500/40",
  crash: "border-purple-400/20 hover:border-purple-500/40",
  dice: "border-amber-500/20 hover:border-amber-500/40",
  limbo: "border-indigo-400/20 hover:border-indigo-300/40",
  plinko: "border-amber-400/20 hover:border-amber-300/40",
  keno: "border-rose-400/20 hover:border-rose-300/40",
  hilo: "border-cyan-400/20 hover:border-cyan-300/40",
  roulette: "border-red-400/20 hover:border-red-300/40",
  wheel: "border-sky-400/20 hover:border-sky-300/40",
  coinflip: "border-yellow-400/20 hover:border-yellow-300/40",
  towers: "border-stone-400/20 hover:border-stone-300/40",
  color: "border-pink-400/20 hover:border-pink-300/40",
  lotto: "border-teal-400/20 hover:border-teal-300/40",
  jackpot: "border-orange-400/20 hover:border-orange-300/40",
};

const GAME_ICON = {
  mines: Bomb,
  crash: Zap,
  dice: Dice5,
  limbo: Plane,
  plinko: Target,
  keno: Hash,
  hilo: TrendingUp,
  roulette: Disc3,
  wheel: RefreshCcw,
  coinflip: Coins,
  towers: Layers,
  color: CircleDot,
  lotto: Tickets,
  jackpot: Crown,
} as const;

function useFakePlayerCount(min: number, max: number): number {
  const [count, setCount] = useState(() =>
    Math.floor(Math.random() * (max - min + 1)) + min
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const drift = Math.floor(Math.random() * 11) - 5;
        return Math.max(min, Math.min(max, prev + drift));
      });
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [min, max]);
  return count;
}

function GameCard({ game }: { game: OriginalsGame }) {
  const playerCount = useFakePlayerCount(game.fakePlayerMin, game.fakePlayerMax);
  const [imgFailed, setImgFailed] = useState(false);

  const isLaunchable = game.isActive && LAUNCHABLE_GAME_KEYS.has(game.gameKey);
  const link = isLaunchable ? `/zeero-games/${game.gameKey}` : "#";
  const accentClass = GAME_ACCENT[game.gameKey] || "text-green-400";
  const borderClass = GAME_BORDER[game.gameKey] || "border-white/[0.06]";
  const Icon = GAME_ICON[game.gameKey as keyof typeof GAME_ICON] || Bomb;

  return (
    <Link
      href={link}
      className={`group relative flex-shrink-0 overflow-hidden rounded-[28px] border ${borderClass}
        bg-white/[0.03] transition-all duration-300
        hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)] cursor-pointer
        w-[220px] sm:w-[240px] md:w-[252px]
        ${!isLaunchable ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%)] opacity-80" />

      {/* Thumbnail / fallback */}
      <div className="relative w-full h-[170px] sm:h-[188px] overflow-hidden">
        {game.thumbnailUrl && !imgFailed ? (
          <img
            src={game.thumbnailUrl}
            alt={game.gameName}
            onError={() => setImgFailed(true)}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-white/[0.04] to-white/[0.02]">
            <div className="mb-2 rounded-[22px] border border-white/[0.1] bg-black/30 p-4 shadow-xl transition-transform duration-300 group-hover:scale-110">
              <Icon size={32} className="text-white" />
            </div>
            <div className="text-4xl drop-shadow-xl">{GAME_EMOJI[game.gameKey] ?? "🎮"}</div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#06080c] via-black/20 to-transparent" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <div className="rounded-full border border-white/[0.08] bg-black/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
            Zeero
          </div>
          {!isLaunchable && (
            <div className="rounded-full border border-white/[0.08] bg-black/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              Soon
            </div>
          )}
        </div>

        {isLaunchable && (
          <div className={`absolute right-3 top-3 rounded-full border border-current/25 bg-black/50 px-2.5 py-1 text-[10px] font-black ${accentClass}`}>
            {game.displayRtpPercent}% RTP
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div className="rounded-full border border-white/[0.08] bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-md">
            {playerCount.toLocaleString()} playing
          </div>
          <div className="rounded-full border border-white/[0.08] bg-black/50 p-2 text-white/80 backdrop-blur-md transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight size={12} />
          </div>
        </div>
      </div>

      <div className="relative p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className={`rounded-xl border border-white/[0.06] bg-white/[0.04] p-2 ${accentClass}`}>
            <Icon size={14} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Zeero Originals</span>
        </div>

        <p className="text-white font-black text-base leading-tight">{game.gameName}</p>
        <p className="mt-1.5 min-h-[34px] text-[11px] leading-relaxed text-white/50">{game.gameDescription}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className={`text-[11px] font-black ${accentClass}`}>
            {isLaunchable ? "Play now" : "Coming soon"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">
            {game.gameKey}
          </span>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: "inset 0 0 80px rgba(255,255,255,0.04)" }}
      />
    </Link>
  );
}

async function fetchOriginalsGames(): Promise<OriginalsGame[]> {
  try {
    const { default: api } = await import("@/services/api");
    const res = await api.get("/originals/games");
    const data = Array.isArray(res.data) ? res.data : [];
    if (data.length > 0) return data;
    return STATIC_GAMES;
  } catch {
    return STATIC_GAMES;
  }
}

export default function ZeeroOriginalsSection() {
  const { canAccessOriginals, loading } = useOriginalsAccess();
  const [games, setGames] = useState<OriginalsGame[]>(STATIC_GAMES);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && canAccessOriginals) {
      fetchOriginalsGames().then(setGames);
    }
  }, [canAccessOriginals, loading]);

  if (loading || !canAccessOriginals) return null;

  const liveGames = games.filter((game) => game.isActive && LAUNCHABLE_GAME_KEYS.has(game.gameKey));
  const activeCount = liveGames.length;
  const featuredGame = liveGames[0] ?? games.find((game) => LAUNCHABLE_GAME_KEYS.has(game.gameKey)) ?? games[0];

  return (
    <section className="mt-8 mb-10">
      {/* Hero card with amber gradient (odd69 themed) */}
      <div className="relative overflow-hidden rounded-[32px] border border-amber-500/20 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        style={{ background: 'linear-gradient(135deg, #1a1208 0%, #14120a 30%, #0f0d08 60%, #06080c 100%)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

        <div className="relative z-10 p-4 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
                  <Sparkles size={12} />
                  Zeero Originals
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                  <ShieldCheck size={12} />
                  Private Access
                </div>
              </div>

              <h3 className="max-w-xl text-xl font-black uppercase tracking-[0.06em] text-white md:text-2xl">
                In-house games with sharper visuals, faster rounds, and one-click access from home
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
                Mines, Crash, Dice, and Limbo are live today, with ten more Originals now staged in the lane as upcoming releases.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Live Games</p>
                <p className="mt-1 text-lg font-black text-white">{activeCount}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Top RTP</p>
                <p className="mt-1 text-lg font-black text-amber-400">
                  {Math.max(...games.map((game) => game.displayRtpPercent))}%
                </p>
              </div>
              <Link
                href="/zeero-games"
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-black text-[#1a1208] transition-all hover:brightness-110 shadow-[0_0_16px_rgba(245,158,11,0.4)]"
              >
                Open Originals
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
            <Link
              href={featuredGame?.isActive ? `/zeero-games/${featuredGame.gameKey}` : "/zeero-games"}
              className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] p-5"
              style={{ background: 'linear-gradient(155deg, #1a1510 0%, #14120a 45%, #0a0d0c 100%)' }}
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/20 blur-3xl transition-transform duration-500 group-hover:scale-125" />
              <div className="absolute bottom-0 right-0 text-[88px] leading-none opacity-[0.08]">
                {GAME_EMOJI[featuredGame?.gameKey ?? "mines"] ?? "🎮"}
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                  Featured
                </div>
                <h4 className="mt-4 text-2xl font-black text-white">{featuredGame?.gameName ?? "Zeero Originals"}</h4>
                <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-white/60">
                  {featuredGame?.gameDescription ?? "Exclusive Originals, built by Zeero."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">RTP</p>
                    <p className="mt-1 font-black text-amber-400">{featuredGame?.displayRtpPercent ?? 95}%</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Range</p>
                    <p className="mt-1 font-black text-white/85">
                      {featuredGame?.fakePlayerMin ?? 0}-{featuredGame?.fakePlayerMax ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-400">
                  Play Featured Game
                  <ArrowRight size={13} />
                </div>
              </div>
            </Link>

            <div>
              <div className="mb-3 flex items-center justify-between px-0.5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">Game Lobby</p>
                  <p className="mt-1 text-sm text-white/50">Swipe through the live Zeero Originals line-up.</p>
                </div>
                <div className="hidden rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 md:inline-flex">
                  Members Only
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none" }}
              >
                {games.map((game) => (
                  <div key={game.gameKey} className="snap-start flex-shrink-0">
                    <GameCard game={game} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
