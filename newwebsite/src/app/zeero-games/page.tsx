"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import LeftSidebar from "@/components/layout/LeftSidebar";
import { Bomb, ChevronRight, Zap, Star, Lock, Plane } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useOriginalsAccess } from "@/hooks/useOriginalsAccess";

const ORIGINALS_GAMES = [
  {
    id: "mines",
    name: "Zeero Mines",
    description: "Reveal gems, dodge mines. Cash out before it explodes.",
    icon: <Bomb size={48} />,
    href: "/zeero-games/mines",
    badge: "NEW",
    badgeColor: "bg-green-500",
    gradient: "from-[#1a3a1a] via-[#0d2e1a] to-[#0d1a0d]",
    accentColor: "#4ade80",
    glowColor: "rgba(74,222,128,0.3)",
    available: true,
  },
  {
    id: "crash",
    name: "Zeero Crash",
    description: "Watch the multiplier soar. Cash out at the right moment.",
    icon: <Zap size={48} />,
    href: "/zeero-games/crash",
    badge: "LIVE",
    badgeColor: "bg-orange-500",
    gradient: "from-[#2a1a00] via-[#1a1000] to-[#0d0a00]",
    accentColor: "#fb923c",
    glowColor: "rgba(251,146,60,0.3)",
    available: true,
  },
  {
    id: "dice",
    name: "Zeero Dice",
    description: "Roll the dice. Beat the threshold. Win big.",
    icon: <Star size={48} />,
    href: "/zeero-games/dice",
    badge: "LIVE",
    badgeColor: "bg-purple-500",
    gradient: "from-[#1a0a2e] via-[#100a22] to-[#0a0614]",
    accentColor: "#a78bfa",
    glowColor: "rgba(167,139,250,0.3)",
    available: true,
  },
  {
    id: "limbo",
    name: "Zeero Limbo",
    description: "Watch the multiplier soar. Cash out before the plane flies away!",
    icon: <Plane size={48} />,
    href: "/zeero-games/limbo",
    badge: "LIVE",
    badgeColor: "bg-indigo-500",
    gradient: "from-[#0d0e2a] via-[#0a0c22] to-[#050714]",
    accentColor: "#818cf8",
    glowColor: "rgba(129,140,248,0.3)",
    available: true,
  },
];

export default function ZeeroGamesPage() {
  const { token, loading } = useAuth();
  const { canAccessOriginals, loading: accessLoading } = useOriginalsAccess();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !accessLoading && (!token || !canAccessOriginals)) {
      router.replace("/");
    }
  }, [token, loading, accessLoading, canAccessOriginals, router]);

  if (loading || accessLoading || !token || !canAccessOriginals) {
    return <div className="h-screen flex items-center justify-center bg-bg-base"><div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" /></div>;
  }

  return (
    <div className="h-screen overflow-hidden bg-bg-base flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden pt-[110px] md:pt-[64px] pb-[80px] md:pb-0 max-w-[1920px] mx-auto w-full">
        <LeftSidebar />
        <main className="flex-1 min-w-0 bg-bg-base overflow-y-auto overflow-x-hidden border-l border-white/5 border-r border-white/5">
          <div className="p-4 md:p-8 space-y-10 max-w-5xl mx-auto">

            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1208] via-[#201910] to-[#2a1e14] p-8 md:p-12">
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-20 bg-brand-gold" />
                <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full blur-2xl opacity-10 bg-brand-gold" />
                {/* Grid dot pattern */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, #e37d32 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/30 rounded-full px-3 py-1">
                    <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                    <span className="text-brand-gold text-xs font-black tracking-widest uppercase">
                      Zeero Originals
                    </span>
                  </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-text-primary mb-3 leading-tight">
                  Play <span className="text-gradient-gold">Original Games</span>
                  <br />Built by Zeero
                </h1>
                <p className="text-text-secondary text-sm md:text-base max-w-xl mb-6">
                  Provably fair, in-house games crafted exclusively for Zeero. Every outcome is
                  verifiable. Every bet is transparent.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-[8px] font-black text-white">✓</span>
                    </div>
                    <span className="text-text-secondary text-xs font-bold">Provably Fair</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <div className="w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center">
                      <span className="text-[8px] font-black text-black">₿</span>
                    </div>
                    <span className="text-text-secondary text-xs font-bold">Fiat & Crypto</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-[8px] font-black text-white">%</span>
                    </div>
                    <span className="text-text-secondary text-xs font-bold">Bonus Compatible</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Games Grid */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-text-primary font-black text-xl">All Games</h2>
                <span className="text-xs text-text-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {ORIGINALS_GAMES.filter((g) => g.available).length} Live
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ORIGINALS_GAMES.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </div>

            {/* Why Originals */}
            <div className="border-t border-white/10 pt-8">
              <h2 className="text-text-primary font-black text-xl mb-5">Why Zeero Originals?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: "🔐",
                    title: "Provably Fair",
                    desc: "Every game uses cryptographic HMAC-SHA256 seeding. Verify any result independently.",
                  },
                  {
                    icon: "⚡",
                    title: "Instant Results",
                    desc: "No waiting, no loading. Pure on-platform speed with zero third-party lag.",
                  },
                  {
                    icon: "🎁",
                    title: "Bonus Compatible",
                    desc: "Use your casino bonus balance. Wagering requirements count toward Originals.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-bg-card rounded-xl border border-white/10 p-5 hover:border-brand-gold/30 transition-all"
                  >
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <h3 className="text-text-primary font-bold text-sm mb-1">{item.title}</h3>
                    <p className="text-text-muted text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function GameCard({ game }: { game: (typeof ORIGINALS_GAMES)[0] }) {
  const card = (
    <div
      className={`relative group rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer
      ${game.available
          ? "border-white/10 hover:border-white/30 hover:scale-[1.02]"
          : "border-white/5 opacity-60"
        }
      `}
      style={{
        boxShadow: game.available
          ? `0 0 0 0 ${game.glowColor}`
          : undefined,
      }}
      onMouseEnter={(e) => {
        if (game.available) {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${game.glowColor}`;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient}`} />
      <div className="absolute inset-0 bg-bg-card/50" />

      {/* Glow orb */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-30 transition-opacity duration-300 group-hover:opacity-50"
        style={{ background: game.accentColor }}
      />

      <div className="relative z-10 p-6">
        {/* Badge */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="p-3 rounded-xl bg-black/30 border border-white/10"
            style={{ color: game.accentColor }}
          >
            {game.icon}
          </div>
          <span
            className={`text-[10px] font-black px-2.5 py-1 rounded-full text-white tracking-wider ${game.badgeColor}`}
          >
            {game.badge}
          </span>
        </div>

        <h3 className="text-text-primary font-black text-lg mb-1">{game.name}</h3>
        <p className="text-text-muted text-xs mb-5 leading-relaxed">{game.description}</p>

        {/* Play button */}
        <div
          className={`flex items-center gap-2 text-sm font-bold transition-all
          ${game.available
              ? "text-text-primary group-hover:gap-3"
              : "text-text-disabled"
            }`}
          style={game.available ? { color: game.accentColor } : undefined}
        >
          {game.available ? (
            <>
              <span>Play Now</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </>
          ) : (
            <>
              <Lock size={14} />
              <span>Coming Soon</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (game.available) {
    return <Link href={game.href}>{card}</Link>;
  }
  return card;
}
