"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bomb, ChevronRight, Dice5, Plane, ShieldCheck, Sparkles, Zap } from "lucide-react";
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

// Fallback static data — used if API is down or game has no config
const STATIC_GAMES: OriginalsGame[] = [
  {
    gameKey: "mines",
    gameName: "Zeero Mines",
    gameDescription: "Tap tiles, dodge the traps. One wrong move and it's over.",
    thumbnailUrl: null,
    isActive: true,
    fakePlayerMin: 200,
    fakePlayerMax: 300,
    displayRtpPercent: 95,
  },
  {
    gameKey: "crash",
    gameName: "Zeero Crash",
    gameDescription: "Ride the rocket. The longer you hold, the bigger the win.",
    thumbnailUrl: null,
    isActive: true,
    fakePlayerMin: 180,
    fakePlayerMax: 280,
    displayRtpPercent: 96,
  },
  {
    gameKey: "dice",
    gameName: "Zeero Dice",
    gameDescription: "Set your odds, roll the number, collect the payout.",
    thumbnailUrl: null,
    isActive: true,
    fakePlayerMin: 120,
    fakePlayerMax: 220,
    displayRtpPercent: 97,
  },
  {
    gameKey: "limbo",
    gameName: "Zeero Limbo",
    gameDescription: "Choose your multiplier. Will you survive the drop?",
    thumbnailUrl: null,
    isActive: true,
    fakePlayerMin: 140,
    fakePlayerMax: 240,
    displayRtpPercent: 96,
  },
];

// Emoji fallbacks per game
const GAME_EMOJI: Record<string, string> = {
  mines: "💎",
  crash: "🚀",
  dice: "🎲",
  limbo: "✈️",
};

const GAME_COLOR: Record<string, string> = {
  mines: "from-green-900/80 to-[#0d1a0d]",
  crash: "from-purple-900/80 to-[#0d0d1a]",
  dice: "from-blue-900/80 to-[#0d0d1a]",
  limbo: "from-indigo-900/80 to-[#0d1022]",
};

const GAME_ACCENT: Record<string, string> = {
  mines: "text-green-400",
  crash: "text-purple-400",
  dice: "text-blue-400",
  limbo: "text-indigo-300",
};

const GAME_BORDER: Record<string, string> = {
  mines: "border-green-500/20 hover:border-green-500/40",
  crash: "border-purple-500/20 hover:border-purple-500/40",
  dice: "border-blue-500/20 hover:border-blue-500/40",
  limbo: "border-indigo-400/20 hover:border-indigo-300/40",
};

const GAME_ICON = {
  mines: Bomb,
  crash: Zap,
  dice: Dice5,
  limbo: Plane,
} as const;

function useFakePlayerCount(min: number, max: number): number {
  const [count, setCount] = useState(() =>
    Math.floor(Math.random() * (max - min + 1)) + min
  );
  useEffect(() => {
    const interval = setInterval(() => {
      // Drift ±5 from current, stay within min/max
      setCount((prev) => {
        const drift = Math.floor(Math.random() * 11) - 5;
        return Math.max(min, Math.min(max, prev + drift));
      });
    }, 3000 + Math.random() * 2000); // update every 3–5 seconds
    return () => clearInterval(interval);
  }, [min, max]);
  return count;
}

function GameCard({ game }: { game: OriginalsGame }) {
  const playerCount = useFakePlayerCount(game.fakePlayerMin, game.fakePlayerMax);
  const [imgFailed, setImgFailed] = useState(false);

  const link = game.isActive ? `/zeero-games/${game.gameKey}` : "#";
  const colorClass = GAME_COLOR[game.gameKey] || "from-slate-800 to-slate-900";
  const accentClass = GAME_ACCENT[game.gameKey] || "text-green-400";
  const borderClass = GAME_BORDER[game.gameKey] || "border-white/10";
  const Icon = GAME_ICON[game.gameKey as keyof typeof GAME_ICON] || Bomb;

  return (
    <Link
      href={link}
      className={`group relative flex-shrink-0 overflow-hidden rounded-[28px] border ${borderClass}
        bg-gradient-to-b ${colorClass} transition-all duration-300
        hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)] cursor-pointer
        w-[220px] sm:w-[240px] md:w-[252px]
        ${!game.isActive ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%)] opacity-80" />

      {/* Thumbnail / fallback — FIXED height, image fills via object-cover */}
      <div className="relative w-full h-[170px] sm:h-[188px] overflow-hidden">
        {game.thumbnailUrl && !imgFailed ? (
          <Image
            src={game.thumbnailUrl}
            alt={game.gameName}
            fill
            sizes="(max-width: 640px) 220px, (max-width: 768px) 240px, 252px"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${colorClass}`}>
            <div className="mb-2 rounded-[22px] border border-white/15 bg-black/20 p-4 shadow-2xl transition-transform duration-300 group-hover:scale-110">
              <Icon size={32} className="text-white" />
            </div>
            <div className="text-4xl drop-shadow-2xl">{GAME_EMOJI[game.gameKey] ?? "🎮"}</div>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070d] via-black/15 to-transparent" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <div className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
            Zeero
          </div>
          {!game.isActive && (
            <div className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              Soon
            </div>
          )}
        </div>

        {game.isActive && (
          <div className={`absolute right-3 top-3 rounded-full border border-current/25 bg-black/45 px-2.5 py-1 text-[10px] font-black ${accentClass}`}>
            {game.displayRtpPercent}% RTP
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-sm">
            {playerCount.toLocaleString()} playing
          </div>
          <div className="rounded-full border border-white/10 bg-black/50 p-2 text-white/80 backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight size={12} />
          </div>
        </div>
      </div>

      <div className="relative p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className={`rounded-xl border border-white/10 bg-white/5 p-2 ${accentClass}`}>
            <Icon size={14} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Zeero Originals</span>
        </div>

        <p className="text-white font-black text-base leading-tight">{game.gameName}</p>
        <p className="mt-1.5 min-h-[34px] text-[11px] leading-relaxed text-white/45">{game.gameDescription}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className={`text-[11px] font-black ${accentClass}`}>
            {game.isActive ? "Play now" : "Coming soon"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">
            {game.gameKey}
          </span>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: "inset 0 0 80px rgba(255,255,255,0.05)" }}
      />
    </Link>
  );
}

// Fetch from backend — GET /originals/games (public)
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

  // Gate: only show for allowed user
  if (loading || !canAccessOriginals) return null;

  const activeCount = games.filter((g) => g.isActive).length;
  const featuredGame = games.find((game) => game.isActive) ?? games[0];

  return (
    <section className="mt-8 mb-10">
      <div className="relative overflow-hidden rounded-[32px] border border-emerald-500/15 bg-[#08110f] shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative z-10 p-4 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  <Sparkles size={12} />
                  Zeero Originals
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">
                  <ShieldCheck size={12} />
                  Private Suite
                </div>
              </div>

              <h3 className="max-w-xl text-xl font-black uppercase tracking-[0.06em] text-white md:text-2xl">
                Exclusive games built from scratch — designed for speed, edge, and zero lag
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
                Mines, Crash, Dice, and Limbo — each one hand-tuned for Zeero VIPs. No third-party delays, just instant action.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Active</p>
                <p className="mt-1 text-lg font-black text-white">{activeCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Max RTP</p>
                <p className="mt-1 text-lg font-black text-emerald-300">
                  {Math.max(...games.map((game) => game.displayRtpPercent))}%
                </p>
              </div>
              <Link
                href="/zeero-games"
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 transition-colors hover:bg-emerald-400/15"
              >
                Enter Originals
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
            <Link
              href={featuredGame?.isActive ? `/zeero-games/${featuredGame.gameKey}` : "/zeero-games"}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#111827_0%,#0b1320_45%,#07120f_100%)] p-5"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/15 blur-3xl transition-transform duration-500 group-hover:scale-125" />
              <div className="absolute bottom-0 right-0 text-[88px] leading-none opacity-[0.08]">
                {GAME_EMOJI[featuredGame?.gameKey ?? "mines"] ?? "🎮"}
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                  Spotlight
                </div>
                <h4 className="mt-4 text-2xl font-black text-white">{featuredGame?.gameName ?? "Zeero Originals"}</h4>
                <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-white/55">
                  {featuredGame?.gameDescription ?? "Exclusive Originals, built by Zeero."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">RTP</p>
                    <p className="mt-1 font-black text-emerald-300">{featuredGame?.displayRtpPercent ?? 95}%</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Range</p>
                    <p className="mt-1 font-black text-white/85">
                      {featuredGame?.fakePlayerMin ?? 0}-{featuredGame?.fakePlayerMax ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-200">
                  Play This One
                  <ArrowRight size={13} />
                </div>
              </div>
            </Link>

            <div>
              <div className="mb-3 flex items-center justify-between px-0.5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">All Games</p>
                  <p className="mt-1 text-sm text-white/50">Swipe to explore every Zeero Original.</p>
                </div>
                <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 md:inline-flex">
                  VIP Only
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
