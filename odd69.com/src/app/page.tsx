"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame, Star, Zap, Trophy, ArrowRight, Gift, Shield, Lock,
  Headphones, ChevronRight, Gamepad2, Sparkles, TrendingUp,
  Play, Award, Clock, Rocket, ChevronLeft, ExternalLink,
  Circle,
} from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { IoGameController } from "react-icons/io5";
import { casinoService } from "@/services/casino";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

/* ═════════════════════════════════════════════════════════════════════════════
   GAME CARD
   ═════════════════════════════════════════════════════════════════════════════ */
function GameCard({ game, onPlay }: { game: any; onPlay: (g: any) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const src = game.image || game.banner || "";

  return (
    <button
      onClick={() => onPlay(game)}
      className="flex-shrink-0 text-left cursor-pointer group focus:outline-none"
    >
      <div className="relative w-[136px] h-[184px] md:w-[156px] md:h-[210px] rounded-[18px] overflow-hidden border border-[var(--line-default)] group-hover:border-[var(--line-gold)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_18px_48px_rgba(0,0,0,0.5),0_0_0_1px_var(--line-gold)]">
        {!imgErr && src ? (
          <img
            src={src}
            alt={game.name}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-base)]">
            <IoGameController size={32} className="text-[var(--ink-whisper)]" />
          </div>
        )}

        {/* Bottom gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

        {/* Hover play button */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="grid place-items-center w-12 h-12 rounded-full bg-gold-grad shadow-[0_8px_24px_var(--gold-halo)] ring-1 ring-inset ring-white/40">
            <Play size={16} className="text-[#120c00] ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Tag */}
        {game.tag && (
          <div className="absolute top-2 left-2 z-10 bg-gold-grad text-[#120c00] text-[8.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] shadow-[0_4px_10px_var(--gold-halo)]">
            {game.tag}
          </div>
        )}

        {/* Meta */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          {game.provider && (
            <span className="t-eyebrow !text-[8.5px] !text-[var(--ink-whisper)] block mb-0.5">
              {(game.provider || "").slice(0, 14)}
            </span>
          )}
          <p className="text-[12px] font-semibold text-[var(--ink)] truncate leading-tight">
            {game.name || "Game"}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   GAME ROW
   ═════════════════════════════════════════════════════════════════════════════ */
function GameRow({
  title, subtitle, icon, games, isLoading, viewAllHref, onPlay,
}: {
  title: string; subtitle?: string; icon: React.ReactNode;
  games: any[]; isLoading: boolean; viewAllHref?: string; onPlay: (g: any) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  if (isLoading) {
    return (
      <div>
        <div className="h-6 w-48 skeleton mb-4" />
        <div className="flex gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[136px] h-[184px] md:w-[156px] md:h-[210px] skeleton rounded-[18px]" />
          ))}
        </div>
      </div>
    );
  }
  if (games.length === 0) return null;

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div className="rail-gold">
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center w-8 h-8 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--line-default)]">
              {icon}
            </div>
            <div>
              <h2 className="t-section !text-[17px]">{title}</h2>
              {subtitle && <p className="t-section-sub">{subtitle}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="grid place-items-center w-8 h-8 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] rounded-[10px] text-[var(--ink-faint)] hover:text-[var(--ink)] transition-all border border-[var(--line-default)] hover:border-[var(--line-strong)]"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="grid place-items-center w-8 h-8 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] rounded-[10px] text-[var(--ink-faint)] hover:text-[var(--ink)] transition-all border border-[var(--line-default)] hover:border-[var(--line-strong)]"
          >
            <ChevronRight size={14} />
          </button>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="ml-1 chip chip-gold !py-1.5 !px-3 hover:brightness-110 transition-all"
            >
              View all <ArrowRight size={10} />
            </Link>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {games.map((g, i) => (
          <GameCard key={g.id || g.gameCode || i} game={g} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   LIVE STATS RIBBON
   ═════════════════════════════════════════════════════════════════════════════ */
function LiveStats() {
  const [online, setOnline] = useState(14283);
  const [bets, setBets]     = useState(983412);

  useEffect(() => {
    const i = setInterval(() => {
      setOnline((p) => p + Math.floor(Math.random() * 20) - 8);
      setBets((b) => b + Math.floor(Math.random() * 50) + 10);
    }, 4000);
    return () => clearInterval(i);
  }, []);

  const stats = [
    { icon: <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-live-dot" />, value: online.toLocaleString(), label: "playing now",     color: "chip-emerald" },
    { icon: <TrendingUp size={11} />, value: bets.toLocaleString(),   label: "wagers placed today", color: "chip-gold" },
    { icon: <Award size={11} />,      value: "₹2.4Cr",                label: "paid out today",       color: "chip-violet" },
    { icon: <Clock size={11} />,      value: "47s",                   label: "avg. withdrawal",      color: "chip-ice" },
  ];

  return (
    <div className="page-x">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {stats.map((s, i) => (
          <div key={i} className={`chip ${s.color} flex-shrink-0 !py-1.5 !px-3.5`}>
            {s.icon}
            <span className="num text-[11px] font-bold !tracking-normal normal-case">{s.value}</span>
            <span className="text-[10px] !tracking-normal !text-[var(--ink-faint)] normal-case">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   CATEGORY STRIP
   ═════════════════════════════════════════════════════════════════════════════ */
function CategoryStrip() {
  const cats = [
    { name: "Casino",    icon: Gamepad2,  href: "/casino",                 color: "var(--gold)",     from: "rgba(245,183,10,0.18)",  to: "rgba(245,183,10,0.02)" },
    { name: "Sports",    icon: Trophy,    href: "/sports",                 color: "var(--emerald)",  from: "rgba(0,216,123,0.18)",   to: "rgba(0,216,123,0.02)" },
    { name: "Live",      icon: Play,      href: "/live-dealers",           color: "var(--crimson)",  from: "rgba(255,46,76,0.18)",   to: "rgba(255,46,76,0.02)" },
    { name: "Crash",     icon: Rocket,    href: "/casino?category=crash",  color: "#ff9948",         from: "rgba(255,153,72,0.18)",  to: "rgba(255,153,72,0.02)" },
    { name: "Slots",     icon: Star,      href: "/casino?category=slots",  color: "var(--violet)",   from: "rgba(139,92,255,0.18)",  to: "rgba(139,92,255,0.02)" },
    { name: "Originals", icon: Sparkles,  href: "/zeero-games",            color: "var(--ice)",      from: "rgba(100,211,255,0.18)", to: "rgba(100,211,255,0.02)" },
  ];
  return (
    <div className="page-x">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 stagger">
        {cats.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.name}
              href={c.href}
              className="relative flex items-center gap-3 p-3.5 rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-strong)] hover:-translate-y-0.5 transition-all group overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%), linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)`,
              }}
            >
              <div className="grid place-items-center w-9 h-9 rounded-[10px] border border-white/[0.06]" style={{ background: `${c.from}` }}>
                <Icon size={16} style={{ color: c.color }} className="group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="font-display text-[13px] font-bold tracking-tight text-[var(--ink)] group-hover:text-white transition-colors">
                {c.name}
              </span>
              <ChevronRight size={12} className="ml-auto text-[var(--ink-whisper)] group-hover:text-[var(--ink-dim)] group-hover:translate-x-0.5 transition-all" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   HERO SLIDER
   ═════════════════════════════════════════════════════════════════════════════ */
function HeroSlider({ promos }: { promos: any[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fallbackSlides = [
    {
      eyebrow: "Welcome bonus",
      title: "Get 100% match up to ₹10,000",
      subtitle: "Your first deposit doubles itself. No promo code required.",
      gradient: "linear-gradient(135deg, #f5b70a 0%, #ff5c3c 100%)",
      cta: "Claim now",
      href: "/promotions",
    },
    {
      eyebrow: "IPL 2026 special",
      title: "Free bets on every match day",
      subtitle: "Daily boosts, cashback on losses, predict & win big.",
      gradient: "linear-gradient(135deg, #00d87b 0%, #0ea5e9 100%)",
      cta: "Bet now",
      href: "/sports",
    },
    {
      eyebrow: "Instant games",
      title: "Crash, Aviator & Plinko live",
      subtitle: "Cash out when you feel the pull. Millisecond payouts.",
      gradient: "linear-gradient(135deg, #8b5cff 0%, #d946ef 100%)",
      cta: "Play now",
      href: "/zeero-games",
    },
    {
      eyebrow: "Lifetime earnings",
      title: "Refer a friend, earn forever",
      subtitle: "5% of every wager they ever place, credited instantly.",
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
      cta: "Get referral link",
      href: "/referral",
    },
  ];

  const slides = promos.length > 0
    ? promos.map((p) => ({
        eyebrow: "Live offer",
        title: p.title || "Special offer",
        subtitle: p.description || "",
        gradient: p.gradient || "linear-gradient(135deg, #f5b70a 0%, #ff5c3c 100%)",
        bgImage: p.bgImage || "",
        cta: p.buttonText || "Claim now",
        href: p.buttonLink || "/promotions",
        bonus: p.bonusPercentage,
      }))
    : fallbackSlides;

  const total = slides.length;
  const goTo = (i: number) => setCurrent((i + total) % total);
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  useEffect(() => {
    timerRef.current = setInterval(next, 6000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current]);

  const slide = slides[current];

  return (
    <section className="page-x pt-4">
      <div
        className="relative grain w-full h-[220px] md:h-[300px] rounded-[22px] overflow-hidden transition-all duration-500 border border-white/[0.08]"
        style={{ background: slide.gradient }}
      >
        {(slide as any).bgImage && (
          <img
            src={(slide as any).bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
          />
        )}

        {/* Dotted-grid underlay on right */}
        <div className="absolute inset-0 dotgrid opacity-40 mix-blend-overlay" />

        {/* Decorative rings */}
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full border border-white/15" />
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full border border-white/10" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-black/25 blur-2xl" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-12 max-w-xl animate-fade-up">
          {slide.eyebrow && (
            <span className="t-eyebrow !text-[10.5px] !text-white/80 mb-3 inline-flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-white" />
              {slide.eyebrow}
            </span>
          )}
          {(slide as any).bonus ? (
            <span className="font-display font-extrabold text-5xl md:text-6xl text-white leading-none mb-2 tracking-[-0.04em] drop-shadow-[0_6px_20px_rgba(0,0,0,0.4)]">
              +{(slide as any).bonus}%
            </span>
          ) : null}
          <h2 className="font-display font-extrabold text-2xl md:text-4xl text-white leading-[1.05] tracking-[-0.035em] drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="text-[12.5px] md:text-sm text-white/85 mt-3 leading-relaxed max-w-md">
              {slide.subtitle}
            </p>
          )}
          <Link
            href={slide.href}
            className="mt-5 self-start inline-flex items-center gap-2 bg-white text-[#120c00] font-bold text-[12px] uppercase tracking-[0.1em] px-5 py-2.5 rounded-[10px] hover:bg-[var(--gold-bright)] transition-all shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          >
            {slide.cta} <ArrowRight size={13} strokeWidth={3} />
          </Link>
        </div>

        {/* Arrows */}
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur border border-white/15 text-white/75 hover:text-white transition-all"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={next}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur border border-white/15 text-white/75 hover:text-white transition-all"
        >
          <ChevronRight size={15} />
        </button>

        {/* Dots + counter */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3">
          <span className="font-mono text-[10px] font-semibold text-white/70 tabular-nums">
            {String(current + 1).padStart(2, "0")} <span className="text-white/40">/</span> {String(total).padStart(2, "0")}
          </span>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-1.5 bg-white/35 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   BENTO FEATURES
   ═════════════════════════════════════════════════════════════════════════════ */
function BentoFeatures() {
  return (
    <div className="page-x">
      <div className="mb-5 rail-gold">
        <span className="t-eyebrow">Why odd69</span>
        <h2 className="t-section mt-1">Built for sharp players</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 row-span-2 relative overflow-hidden rounded-[20px] border border-[var(--line-strong)] p-6 flex flex-col justify-between group hover:border-[var(--line-gold)] transition-all min-h-[220px]"
             style={{ background: "radial-gradient(ellipse 100% 100% at 0% 0%, rgba(0,216,123,0.18) 0%, transparent 60%), linear-gradient(180deg, var(--bg-surface), var(--bg-base))" }}>
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-[var(--emerald)]/10 blur-3xl" />
          <div className="relative">
            <div className="grid place-items-center w-12 h-12 rounded-[14px] bg-[var(--emerald-soft)] border border-[rgba(0,216,123,0.25)] group-hover:scale-105 transition-transform">
              <Shield size={22} className="text-[var(--emerald)]" />
            </div>
          </div>
          <div className="relative mt-6">
            <p className="font-display text-3xl md:text-4xl font-extrabold text-[var(--ink)] leading-[0.95] tracking-[-0.03em]">
              Provably<br/>fair
            </p>
            <p className="text-[12.5px] text-[var(--ink-faint)] mt-3 leading-relaxed max-w-[320px]">
              Every spin, every bet verified on-chain. Curaçao licensed. Your funds, your keys, your game.
            </p>
            <Link href="/fairness" className="chip chip-emerald mt-4 inline-flex !py-1.5">
              Learn how <ArrowRight size={10} />
            </Link>
          </div>
        </div>

        {[
          { icon: Zap,        color: "var(--gold)",     bg: "var(--gold-soft)",    line: "var(--line-gold)",                 title: "Lightning payouts", desc: "Cash out in under 60 seconds, every time." },
          { icon: Lock,       color: "var(--violet)",   bg: "var(--violet-soft)",  line: "rgba(139,92,255,0.25)",           title: "Vault security",    desc: "Military-grade 256-bit encryption on every session." },
          { icon: Headphones, color: "var(--rose)",     bg: "rgba(255,122,182,0.10)", line: "rgba(255,122,182,0.25)",      title: "Always on",         desc: "24/7 humans on live chat, WhatsApp & Telegram." },
          { icon: Gift,       color: "var(--gold-bright)", bg: "var(--gold-soft)", line: "var(--line-gold)",                title: "Daily bonuses",     desc: "Reload boosts, cashback and VIP-only deals." },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="relative overflow-hidden rounded-[20px] border p-4 hover:-translate-y-1 transition-all group"
              style={{ background: `linear-gradient(180deg, var(--bg-surface), var(--bg-base))`, borderColor: "var(--line-default)" }}
            >
              <div className="grid place-items-center w-9 h-9 rounded-[10px] mb-3 group-hover:scale-105 transition-transform"
                   style={{ background: f.bg, borderColor: f.line, borderWidth: 1, borderStyle: "solid" }}>
                <Icon size={16} style={{ color: f.color }} />
              </div>
              <p className="font-display text-[14px] font-bold text-[var(--ink)] leading-tight">{f.title}</p>
              <p className="text-[11px] text-[var(--ink-faint)] mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   PROMOTIONS SCROLLER
   ═════════════════════════════════════════════════════════════════════════════ */
function PromotionCards({ promos }: { promos: any[] }) {
  if (promos.length === 0) return null;
  return (
    <div className="page-x">
      <div className="flex items-end justify-between mb-4">
        <div className="rail-gold flex items-center gap-2.5">
          <div className="grid place-items-center w-8 h-8 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--line-gold)]">
            <Gift size={15} className="text-[var(--gold-bright)]" />
          </div>
          <div>
            <h2 className="t-section !text-[17px]">Hot deals</h2>
            <p className="t-section-sub">Offers that expire fast</p>
          </div>
          <span className="chip chip-crimson ml-2"><Circle size={6} fill="currentColor" /> {promos.length} live</span>
        </div>
        <Link href="/promotions" className="chip chip-gold !py-1.5 !px-3 hover:brightness-110 transition-all">
          All <ArrowRight size={10} />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {promos.map((promo) => (
          <Link
            key={promo._id}
            href={promo.buttonLink || "/promotions"}
            className="flex-shrink-0 relative rounded-[18px] overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all hover:-translate-y-1 grain"
            style={{
              background: promo.gradient || "linear-gradient(135deg, #7c3aed, #4c1d95)",
              width: 320, minHeight: 180,
            }}
          >
            {promo.bgImage && <img src={promo.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />}
            <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full border border-white/10" />
            <div className="relative z-10 p-5 flex flex-col gap-1 max-w-[70%]">
              {promo.bonusPercentage > 0 && (
                <span className="font-display text-4xl font-extrabold text-white leading-none tracking-[-0.04em] drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                  +{promo.bonusPercentage}%
                </span>
              )}
              <p className="font-display text-white font-bold text-[15px] leading-tight mt-1 tracking-[-0.02em]">{promo.title}</p>
              {promo.description && <p className="text-white/75 text-[11px] line-clamp-2 mt-0.5 leading-relaxed">{promo.description}</p>}
              <div className="mt-3 self-start inline-flex items-center gap-1.5 bg-white text-[#120c00] text-[10px] font-extrabold uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-[8px]">
                {promo.buttonText || "Claim"} <ArrowRight size={10} strokeWidth={3} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   LIVE SPORTS STRIP
   ═════════════════════════════════════════════════════════════════════════════ */
function LiveSportsStrip() {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    api.get("/events/live-events")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.events || [];
        setMatches(data.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  if (matches.length === 0) return null;

  return (
    <div className="page-x">
      <div className="flex items-end justify-between mb-4">
        <div className="rail-gold flex items-center gap-2.5">
          <div className="grid place-items-center w-8 h-8 rounded-[10px] bg-[var(--crimson-soft)] border border-[rgba(255,46,76,0.25)]">
            <Circle size={9} className="text-[var(--crimson)] animate-live-dot" fill="currentColor" />
          </div>
          <div>
            <h2 className="t-section !text-[17px]">Live right now</h2>
            <p className="t-section-sub">Real-time odds, real markets</p>
          </div>
          <span className="chip chip-crimson ml-2">{matches.length} live</span>
        </div>
        <Link href="/sports" className="chip chip-gold !py-1.5 !px-3 hover:brightness-110 transition-all">
          View all <ArrowRight size={10} />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {matches.map((m, i) => (
          <Link
            key={m._id || i}
            href={`/sports/match/${m._id || m.eventId}`}
            className="flex-shrink-0 w-[290px] rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-gold)] p-4 transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="t-eyebrow !text-[9px]">
                {m.sportName || m.competition?.name || "Match"}
              </span>
              <span className="chip chip-crimson !py-0.5 !px-1.5 !text-[8.5px]">
                <Circle size={5} fill="currentColor" className="animate-live-dot" /> Live
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-[13px] font-semibold text-[var(--ink)] truncate">{m.team1 || m.runners?.[0]?.runnerName || "Team A"}</p>
                <p className="text-[13px] font-semibold text-[var(--ink)] truncate">{m.team2 || m.runners?.[1]?.runnerName || "Team B"}</p>
              </div>
              <div className="text-right space-y-1.5">
                <p className="num text-[15px] font-bold text-[var(--gold-bright)]">{m.score1 || "—"}</p>
                <p className="num text-[15px] font-bold text-[var(--gold-bright)]">{m.score2 || "—"}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-[var(--line-default)]">
              <span className="text-[10.5px] font-semibold text-[var(--ink-faint)] group-hover:text-[var(--ink-dim)] transition-colors">Place a bet</span>
              <ArrowRight size={12} className="text-[var(--ink-whisper)] group-hover:text-[var(--gold)] group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   RECENT WINNERS TICKER
   ═════════════════════════════════════════════════════════════════════════════ */
function RecentWinners() {
  const winners = [
    { user: "raj***28", game: "Aviator",      amount: "₹18,420", time: "2m" },
    { user: "pri***91", game: "Crash",        amount: "₹42,800", time: "5m" },
    { user: "vik***44", game: "Mines",        amount: "₹8,350",  time: "8m" },
    { user: "san***67", game: "Plinko",       amount: "₹15,200", time: "11m" },
    { user: "anu***12", game: "Roulette",     amount: "₹31,600", time: "14m" },
    { user: "dee***33", game: "Blackjack",    amount: "₹22,100", time: "17m" },
    { user: "kir***89", game: "Dragon Tiger", amount: "₹56,750", time: "19m" },
    { user: "man***05", game: "Dice",         amount: "₹9,800",  time: "22m" },
  ];
  const doubled = [...winners, ...winners];

  return (
    <div className="page-x">
      <div className="flex items-center gap-2.5 mb-3 rail-gold">
        <TrendingUp size={14} className="text-[var(--emerald)]" />
        <span className="t-eyebrow">Winning right now</span>
      </div>
      <div className="overflow-hidden relative rounded-[14px] bg-[var(--bg-surface)] border border-[var(--line-default)] py-2.5">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--bg-surface)] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--bg-surface)] to-transparent z-10" />
        <div className="flex gap-2.5 animate-scroll-x">
          {doubled.map((w, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-2.5 bg-[var(--bg-elevated)] border border-[var(--line-default)] rounded-[10px] px-3 py-2">
              <div className="grid place-items-center w-7 h-7 rounded-full bg-gradient-to-br from-[var(--violet)]/40 to-[var(--rose)]/40 text-[9px] font-extrabold text-white">
                {w.user.slice(0, 2).toUpperCase()}
              </div>
              <div className="leading-none">
                <p className="text-[11px] font-semibold text-[var(--ink-dim)]">{w.user}</p>
                <p className="text-[9.5px] text-[var(--ink-whisper)] mt-0.5">{w.game} · {w.time}</p>
              </div>
              <span className="num text-[12px] font-extrabold text-[var(--emerald)] ml-2">{w.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   PROVIDER STRIP
   ═════════════════════════════════════════════════════════════════════════════ */
function ProviderStrip() {
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    casinoService.getProviders()
      .then((data: any[]) => setProviders(data.slice(0, 16)))
      .catch(() => {});
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="page-x">
      <div className="flex items-center justify-between mb-3 rail-gold">
        <span className="t-eyebrow">Powered by the best studios</span>
        <Link href="/casino/providers" className="text-[11px] font-semibold text-[var(--ink-faint)] hover:text-[var(--gold)] transition-colors flex items-center gap-1">
          All providers <ArrowRight size={10} />
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {providers.map((p) => (
          <Link
            key={p.provider}
            href={`/casino?provider=${p.provider}`}
            className="flex-shrink-0 flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--line-default)] hover:border-[var(--line-gold)] hover:text-[var(--gold-bright)] rounded-[10px] px-3 py-2 transition-all group"
          >
            {p.logo ? (
              <img src={p.logo} alt={p.provider} className="w-5 h-5 rounded object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
            ) : (
              <Gamepad2 size={13} className="text-[var(--ink-faint)]" />
            )}
            <span className="text-[11px] font-semibold text-[var(--ink-dim)] group-hover:text-[var(--ink)] capitalize whitespace-nowrap transition-colors">
              {p.provider}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   TELEGRAM CTA
   ═════════════════════════════════════════════════════════════════════════════ */
function TelegramCTA() {
  return (
    <div className="page-x">
      <div className="relative overflow-hidden rounded-[22px] border border-[rgba(41,182,246,0.25)] p-6 md:p-10 grain"
           style={{ background: "radial-gradient(ellipse 90% 100% at 0% 0%, rgba(41,182,246,0.22) 0%, rgba(41,182,246,0.02) 70%), linear-gradient(180deg, var(--bg-surface), var(--bg-base))" }}>
        <div className="absolute inset-0 dotgrid opacity-20" />
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#0088cc]/10 blur-3xl" />
        <div className="absolute right-10 bottom-6 opacity-[0.07]">
          <SiTelegram size={180} />
        </div>
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="grid place-items-center w-7 h-7 rounded-[8px] bg-[#29b6f6]/15 border border-[#29b6f6]/30">
              <SiTelegram size={13} className="text-[#29b6f6]" />
            </div>
            <span className="t-eyebrow !text-[10px] !text-[#29b6f6]">Official channel</span>
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-extrabold text-[var(--ink)] leading-[1.05] tracking-[-0.03em]">
            Join <span className="num text-[#29b6f6]">25,000+</span> bettors
          </h3>
          <p className="text-[13px] text-[var(--ink-faint)] mt-3 max-w-sm leading-relaxed">
            Exclusive promo codes, match predictions & insider tips — direct from the odd69 crew.
          </p>
          <a
            href="https://t.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-5 bg-[#29b6f6] hover:bg-[#4fc3f7] text-[#021a25] font-bold text-[12px] uppercase tracking-[0.08em] px-5 py-2.5 rounded-[10px] transition-all shadow-[0_8px_24px_rgba(41,182,246,0.35)]"
          >
            <SiTelegram size={14} /> Join Telegram <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   MAIN HOME PAGE
   ═════════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModal();
  const [slotGames, setSlotGames]     = useState<any[]>([]);
  const [liveGames, setLiveGames]     = useState<any[]>([]);
  const [newGames, setNewGames]       = useState<any[]>([]);
  const [tableGames, setTableGames]   = useState<any[]>([]);
  const [crashGames, setCrashGames]   = useState<any[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [promos, setPromos]           = useState<any[]>([]);

  const handlePlayGame = (game: any) => {
    if (!isAuthenticated) { openLogin(); return; }
    const provider = game.providerCode || game.provider || "";
    const gameCode = game.gameCode || game.gameId || game.casinoGameId || game.id || "";
    if (provider && gameCode) {
      router.push(`/casino/game/${encodeURIComponent(provider)}/${encodeURIComponent(gameCode)}`);
    } else if (game.id) {
      router.push(`/casino/play/${game.id}`);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [slotsRes, liveRes, newRes, tableRes, crashRes] = await Promise.all([
          casinoService.getGames(undefined, "slots", undefined, 1, 12),
          casinoService.getGames(undefined, "live",  undefined, 1, 12),
          casinoService.getGames(undefined, "new",   undefined, 1, 12),
          casinoService.getGames(undefined, "table", undefined, 1, 12),
          casinoService.getGames(undefined, "crash", undefined, 1, 12),
        ]);
        if (slotsRes.games) setSlotGames(slotsRes.games);
        if (liveRes.games)  setLiveGames(liveRes.games);
        if (newRes.games)   setNewGames(newRes.games);
        if (tableRes.games) setTableGames(tableRes.games);
        if (crashRes.games) setCrashGames(crashRes.games);
      } catch (e) { console.error("Failed to load games", e); }
      finally   { setGamesLoading(false); }
      try {
        const res = await api.get("/promotions/app-home");
        if (Array.isArray(res.data) && res.data.length > 0) setPromos(res.data);
      } catch {}
    };
    load();
  }, []);

  return (
    <div className="max-w-[1680px] mx-auto space-y-10 md:space-y-12 pb-24 md:pb-14 pt-1">
      <HeroSlider promos={promos} />
      <LiveStats />
      <CategoryStrip />
      <LiveSportsStrip />

      <div className="page-x">
        <div className="space-y-12">
          <GameRow title="Just dropped"    subtitle="Fresh picks from top studios"  icon={<Sparkles size={15} className="text-[var(--ice)]" />}       games={newGames}   isLoading={gamesLoading} viewAllHref="/casino?category=new"   onPlay={handlePlayGame} />
          <GameRow title="Fan favourites"  subtitle="The slots everyone's spinning" icon={<Flame size={15} className="text-[var(--crimson)]" />}     games={slotGames}  isLoading={gamesLoading} viewAllHref="/casino?category=slots" onPlay={handlePlayGame} />
          <GameRow title="Live tables"     subtitle="Real dealers streaming in HD"  icon={<Play size={15} className="text-[var(--gold)]" fill="currentColor" />} games={liveGames}  isLoading={gamesLoading} viewAllHref="/live-dealers"          onPlay={handlePlayGame} />
        </div>
      </div>

      <RecentWinners />

      <div className="page-x">
        <div className="space-y-12">
          <GameRow title="Classic tables" subtitle="Blackjack, roulette & more"     icon={<Star size={15} className="text-[var(--violet)]" fill="currentColor" />} games={tableGames} isLoading={gamesLoading} viewAllHref="/casino?category=table" onPlay={handlePlayGame} />
          <GameRow title="Instant win"    subtitle="Crash, plinko & fast picks"    icon={<Flame size={15} className="text-[var(--gold-bright)]" fill="currentColor" />} games={crashGames} isLoading={gamesLoading} viewAllHref="/casino?category=crash" onPlay={handlePlayGame} />
        </div>
      </div>

      <PromotionCards promos={promos} />
      <ProviderStrip />
      <TelegramCTA />
      <BentoFeatures />
    </div>
  );
}
