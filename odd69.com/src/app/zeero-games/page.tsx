"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles, Rocket, Dice1, Target, Bomb, ArrowRight, Zap,
  Crown, Flame, Users, Shield, Gauge, Gift, Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import api from "@/services/api";

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
interface OriginalGame {
  gameKey: string;
  gameName: string;
  gameDescription: string;
  emoji: string;
  isActive: boolean;
  displayRtpPercent: number;
  minBet: number;
  maxBet: number;
  thumbnailUrl: string | null;
  fakePlayerMin: number;
  fakePlayerMax: number;
}

/* Icon + accent per game key, mapped to theme variables only */
const iconMap: Record<string, React.ReactNode> = {
  crash: <Rocket size={26} />,
  dice:  <Dice1  size={26} />,
  mines: <Bomb   size={26} />,
  limbo: <Target size={26} />,
};

const accentMap: Record<string, { chip: string; cssVar: string }> = {
  crash: { chip: "chip-crimson", cssVar: "var(--crimson)" },
  dice:  { chip: "chip-ice",     cssVar: "var(--ice)" },
  mines: { chip: "chip-emerald", cssVar: "var(--emerald)" },
  limbo: { chip: "chip-violet",  cssVar: "var(--violet)" },
};

/* ═════════════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════════════ */
export default function ZeeroGamesPage() {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModal();
  const [games, setGames] = useState<OriginalGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/originals/games")
      .then((res) => setGames(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeGames = games.filter((g) => g.isActive);

  /* Live-computed stats from the backend payload */
  const avgRtp =
    activeGames.length > 0
      ? (activeGames.reduce((sum, g) => sum + g.displayRtpPercent, 0) / activeGames.length).toFixed(1)
      : "96.0";
  const houseEdge =
    activeGames.length > 0
      ? (100 - activeGames.reduce((sum, g) => sum + g.displayRtpPercent, 0) / activeGames.length).toFixed(1)
      : "4.0";

  const stats = [
    { label: "House Edge", value: `${houseEdge}%`, Icon: Shield,  chip: "chip-gold" as const },
    { label: "Avg RTP",    value: `${avgRtp}%`,   Icon: Gauge,   chip: "chip-emerald" as const },
    { label: "Max Win",    value: "1000x",        Icon: Crown,   chip: "chip-violet" as const },
    { label: "Auto Bet",   value: "Available",    Icon: Flame,   chip: "chip-ice" as const },
  ];

  return (
    <div className="max-w-[1680px] mx-auto py-6 space-y-10 md:space-y-12 pb-24">

      {/* ── HERO ── */}
      <section className="page-x">
        <div className="relative overflow-hidden rounded-[22px] border border-[var(--gold-line)] bg-gold-soft grain dotgrid p-6 md:p-12">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 700px 360px at 20% 20%, rgba(139, 92, 255, 0.10), transparent 60%), radial-gradient(ellipse 500px 300px at 85% 80%, rgba(245, 183, 10, 0.10), transparent 60%)",
            }}
          />
          <div className="relative z-10 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="chip chip-violet">
                <Sparkles size={10} /> Odd69 Originals
              </span>
              <span className="chip chip-gold">Provably Fair</span>
              <span className="chip chip-emerald">Lowest Edge</span>
            </div>
            <h1 className="font-display text-[34px] md:text-[56px] font-extrabold leading-[0.95] tracking-[-0.035em] text-[var(--ink)] mb-3">
              Odd69 <span className="text-gold-grad">Originals</span>.
              <br />
              Built in-house.
            </h1>
            <p className="text-[14px] text-[var(--ink-dim)] max-w-lg mb-5">
              Our own games with the lowest house edge on the floor, provably-fair outcomes, and instant payouts. No middlemen — just pure, transparent gaming.
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="chip chip-gold !py-2 !px-3">
                <Shield size={11} /> HMAC-SHA256
              </span>
              <span className="chip chip-emerald !py-2 !px-3">
                <Gauge size={11} /> RTP <span className="num ml-0.5">{avgRtp}%</span>
              </span>
              <span className="chip chip-violet !py-2 !px-3">
                <Gift size={11} /> Bonus Compatible
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="page-x">
        <div className="mb-4 rail-gold">
          <span className="t-eyebrow">At a glance</span>
          <h2 className="t-section mt-1">Originals by the numbers</h2>
        </div>
        <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => {
            const Icon = s.Icon;
            return (
              <div
                key={s.label}
                className="relative overflow-hidden rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 hover:border-[var(--line-gold)] transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="grid place-items-center w-9 h-9 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--gold-line)] text-[var(--gold-bright)]">
                    <Icon size={14} />
                  </div>
                  <span className={`chip ${s.chip} !py-0.5 !px-2 !text-[9px]`}>Live</span>
                </div>
                <p className="num font-display text-[22px] font-bold text-[var(--ink)]">{s.value}</p>
                <p className="t-eyebrow !text-[9.5px] mt-1">{s.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── GAMES ── */}
      <section className="page-x">
        <div className="flex items-end justify-between mb-4">
          <div className="rail-gold">
            <span className="t-eyebrow">Games</span>
            <h2 className="t-section mt-1">All Originals</h2>
            <p className="t-section-sub">
              <span className="num">{activeGames.length}</span> titles live — verify any result, any time.
            </p>
          </div>
          {!loading && activeGames.length > 0 && (
            <span className="chip chip-gold">
              <span className="num">{activeGames.length}</span> live
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[200px] rounded-[16px] skeleton" />
            ))}
          </div>
        ) : activeGames.length > 0 ? (
          <div className="stagger grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGames.map((g) => {
              const accent = accentMap[g.gameKey] || { chip: "chip-gold", cssVar: "var(--gold)" };
              const icon = iconMap[g.gameKey] || <Sparkles size={26} />;
              const href = `/zeero-games/${g.gameKey}`;
              const fakePlayers =
                Math.floor(Math.random() * (g.fakePlayerMax - g.fakePlayerMin + 1)) + g.fakePlayerMin;

              return (
                <Link
                  key={g.gameKey}
                  href={isAuthenticated ? href : "#"}
                  onClick={(e) => {
                    if (!isAuthenticated) {
                      e.preventDefault();
                      openLogin();
                    }
                  }}
                  className="group"
                >
                  <div className="relative overflow-hidden rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] grain p-5 md:p-6 hover:border-[var(--line-gold)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] transition-all cursor-pointer">
                    {/* accent glow */}
                    <div
                      className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"
                      style={{ background: accent.cssVar }}
                    />

                    <div className="relative z-10 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {g.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={g.thumbnailUrl}
                            alt={g.gameName}
                            className="w-14 h-14 rounded-[14px] object-cover border border-[var(--line-default)] group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div
                            className="grid place-items-center w-14 h-14 rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-elevated)] group-hover:scale-105 transition-transform"
                            style={{ color: accent.cssVar }}
                          >
                            {icon}
                          </div>
                        )}
                        <div>
                          <h3 className="font-display text-[20px] font-bold text-[var(--ink)] mb-1 leading-tight">
                            {g.gameName}
                          </h3>
                          <p className="text-[12.5px] text-[var(--ink-dim)] leading-relaxed max-w-md">
                            {g.gameDescription}
                          </p>
                        </div>
                      </div>
                      <span className={`chip ${accent.chip}`}>Live</span>
                    </div>

                    {/* Stats row */}
                    <div className="relative z-10 mt-4 flex flex-wrap gap-1.5">
                      <span className="chip chip-emerald">
                        RTP <span className="num ml-0.5">{g.displayRtpPercent}%</span>
                      </span>
                      <span className="chip">
                        Min <span className="num ml-0.5">₹{g.minBet}</span>
                      </span>
                      <span className="chip">
                        Max <span className="num ml-0.5">₹{g.maxBet.toLocaleString()}</span>
                      </span>
                      <span className="chip chip-violet">
                        <Users size={10} />
                        <span className="num">{fakePlayers}</span> playing
                      </span>
                    </div>

                    {/* CTA */}
                    <div className="relative z-10 mt-5 flex items-center justify-between">
                      <div
                        className="flex items-center gap-1.5 font-display text-[13px] font-bold group-hover:gap-3 transition-all"
                        style={{ color: accent.cssVar }}
                      >
                        {isAuthenticated ? (
                          <>
                            <span>Play Now</span>
                            <ArrowRight size={14} />
                          </>
                        ) : (
                          <>
                            <Lock size={12} />
                            <span>Sign in to play</span>
                          </>
                        )}
                      </div>
                      <span className="t-eyebrow !text-[9px]">Provably fair</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)]">
            <div className="grid place-items-center w-16 h-16 rounded-[16px] bg-[var(--bg-elevated)] border border-[var(--line-default)]">
              <Sparkles size={24} className="text-[var(--ink-faint)]" />
            </div>
            <div className="text-center">
              <p className="font-display text-[16px] font-semibold text-[var(--ink)]">Games are being configured</p>
              <p className="text-[12px] text-[var(--ink-faint)] mt-1">Check back soon — the floor is warming up.</p>
            </div>
          </div>
        )}
      </section>

      {/* ── WHY ORIGINALS ── */}
      <section className="page-x">
        <div className="mb-4 rail-gold">
          <span className="t-eyebrow">Why originals</span>
          <h2 className="t-section mt-1">Why play in-house</h2>
          <p className="t-section-sub">Three reasons Originals beat third-party rails.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              Icon: Shield,
              title: "Provably Fair",
              copy:
                "Every round is seeded with HMAC-SHA256. Copy the seed, verify the result — cryptographic proof, not a promise.",
              chip: "chip-emerald" as const,
            },
            {
              Icon: Zap,
              title: "Instant Results",
              copy:
                "No loading screens, no third-party lag. Each round settles on-platform and the balance moves the same second.",
              chip: "chip-gold" as const,
            },
            {
              Icon: Gift,
              title: "Bonus Compatible",
              copy:
                "Every bet counts toward wagering. Casino bonus balance works across all Originals — no exclusions, no fine print.",
              chip: "chip-violet" as const,
            },
          ].map(({ Icon, title, copy, chip }) => (
            <div
              key={title}
              className="relative overflow-hidden rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] grain p-5 hover:border-[var(--line-gold)] transition-all"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="grid place-items-center w-10 h-10 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--gold-line)] text-[var(--gold-bright)]">
                    <Icon size={16} />
                  </div>
                  <span className={`chip ${chip}`}>Zeero</span>
                </div>
                <h3 className="font-display text-[15px] font-semibold text-[var(--ink)] mb-1">{title}</h3>
                <p className="text-[12.5px] text-[var(--ink-dim)] leading-relaxed">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
