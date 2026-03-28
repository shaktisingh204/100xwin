"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame, Star, Zap, Trophy, ArrowRight, Gift, Shield, Lock,
  Headphones, ChevronRight, Gamepad2, Sparkles, TrendingUp,
  Play, Award, Clock, Rocket, ChevronLeft, Users, ExternalLink,
  Circle, MessageCircle,
} from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { IoGameController } from "react-icons/io5";
import { casinoService } from "@/services/casino";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

/* ═══ GAME CARD ═══ */
function GameCard({ game, onPlay }: { game: any; onPlay: (g: any) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const src = game.image || game.banner || "";

  return (
    <div onClick={() => onPlay(game)} className="flex-shrink-0 cursor-pointer group">
      <div className="relative w-[130px] h-[170px] md:w-[150px] md:h-[195px] rounded-2xl overflow-hidden border border-white/[0.04] group-hover:border-white/[0.12] transition-all group-hover:-translate-y-1 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
        {!imgErr && src ? (
          <img src={src} alt={game.name} onError={() => setImgErr(true)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#12151a] to-[#0a0c10] text-3xl"><IoGameController size={28} className="text-white/15" /></div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
            <Play size={16} className="text-white ml-0.5" fill="white" />
          </div>
        </div>
        {game.tag && <div className="absolute top-2 left-2 z-10 bg-[#f59e0b] text-black text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase">{game.tag}</div>}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
          {game.provider && <span className="text-[7px] font-bold text-white/20 uppercase tracking-wider block mb-0.5">{game.provider?.slice(0, 10)}</span>}
          <p className="text-[11px] font-bold text-white/80 truncate leading-tight">{game.name || "Game"}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══ GAME ROW ═══ */
function GameRow({ title, subtitle, icon, accentColor, games, isLoading, viewAllHref, onPlay }: {
  title: string; subtitle?: string; icon: React.ReactNode; accentColor: string;
  games: any[]; isLoading: boolean; viewAllHref?: string; onPlay: (g: any) => void;
}) {
  const scrollRef = { current: null as HTMLDivElement | null };
  const scroll = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  if (isLoading) {
    return (
      <div>
        <div className="h-4 w-32 bg-white/[0.03] rounded mb-3 skeleton" />
        <div className="flex gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex-shrink-0 w-[130px] h-[170px] md:w-[150px] md:h-[195px] rounded-2xl skeleton" />)}
        </div>
      </div>
    );
  }
  if (games.length === 0) return null;

  return (
    <div className="relative">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-full ${accentColor} hidden md:block`} />
      <div className="md:pl-5">
        <div className="flex items-end justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03]`}>{icon}</div>
            <div>
              <h2 className="text-[15px] font-black text-white/90 tracking-tight">{title}</h2>
              {subtitle && <p className="text-[10px] text-white/20 font-medium mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => scroll(-1)} className="w-6 h-6 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg flex items-center justify-center text-white/15 hover:text-white/40 transition-colors border border-white/[0.03]"><ChevronLeft size={12} /></button>
            <button onClick={() => scroll(1)} className="w-6 h-6 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg flex items-center justify-center text-white/15 hover:text-white/40 transition-colors border border-white/[0.03]"><ChevronRight size={12} /></button>
            {viewAllHref && <Link href={viewAllHref} className="text-[10px] font-bold text-white/20 hover:text-white/50 ml-1 uppercase tracking-wider transition-colors flex items-center gap-1">All <ArrowRight size={9} /></Link>}
          </div>
        </div>
        <div ref={(el) => { scrollRef.current = el; }} className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>{games.map((g, i) => <GameCard key={g.id || g.gameCode || i} game={g} onPlay={onPlay} />)}</div>
      </div>
    </div>
  );
}

/* ═══ LIVE STATS PILLS ═══ */
function LiveStats() {
  const [online, setOnline] = useState(14283);
  const [bets, setBets] = useState(983412);
  useEffect(() => {
    const i = setInterval(() => { setOnline(p => p + Math.floor(Math.random() * 20) - 8); setBets(b => b + Math.floor(Math.random() * 50) + 10); }, 4000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 md:px-6" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-3 py-1.5 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-bold text-emerald-400">{online.toLocaleString()} playing now</span>
      </div>
      <div className="flex items-center gap-1.5 bg-[#f59e0b]/8 border border-[#f59e0b]/15 rounded-full px-3 py-1.5 flex-shrink-0">
        <TrendingUp size={10} className="text-[#f59e0b]" />
        <span className="text-[10px] font-bold text-[#f59e0b]">{bets.toLocaleString()} wagers placed</span>
      </div>
      <div className="flex items-center gap-1.5 bg-purple-500/8 border border-purple-500/15 rounded-full px-3 py-1.5 flex-shrink-0">
        <Award size={10} className="text-purple-400" />
        <span className="text-[10px] font-bold text-purple-400">₹2.4Cr paid out today</span>
      </div>
      <div className="flex items-center gap-1.5 bg-cyan-500/8 border border-cyan-500/15 rounded-full px-3 py-1.5 flex-shrink-0">
        <Clock size={10} className="text-cyan-400" />
        <span className="text-[10px] font-bold text-cyan-400">Withdrawal: ~47s</span>
      </div>
    </div>
  );
}

/* ═══ CATEGORY STRIP ═══ */
function CategoryStrip() {
  const cats = [
    { name: "Casino", icon: Gamepad2, href: "/casino", accent: "text-amber-400", bg: "from-amber-500/15 to-amber-900/20" },
    { name: "Sports", icon: Trophy, href: "/sports", accent: "text-teal-400", bg: "from-teal-500/15 to-teal-900/20" },
    { name: "Live", icon: Play, href: "/live-dealers", accent: "text-red-400", bg: "from-red-500/15 to-red-900/20" },
    { name: "Crash", icon: Rocket, href: "/casino?category=crash", accent: "text-orange-400", bg: "from-orange-500/15 to-orange-900/20" },
    { name: "Slots", icon: Star, href: "/casino?category=slots", accent: "text-purple-400", bg: "from-purple-500/15 to-purple-900/20" },
    { name: "Originals", icon: Sparkles, href: "/zeero-games", accent: "text-emerald-400", bg: "from-emerald-500/15 to-emerald-900/20" },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 px-4 md:px-6">
      {cats.map(c => {
        const Icon = c.icon;
        return (
          <Link key={c.name} href={c.href} className={`flex items-center gap-2.5 p-3.5 rounded-xl border border-white/[0.04] hover:border-white/[0.1] bg-gradient-to-br ${c.bg} transition-all group`}>
            <Icon size={18} className={`${c.accent} group-hover:scale-110 transition-transform`} />
            <span className="text-[12px] font-bold text-white/60 group-hover:text-white/90 transition-colors">{c.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

/* ═══ HERO SLIDER ═══ */
function HeroSlider({ promos }: { promos: any[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fallbackSlides = [
    {
      title: "Welcome Bonus",
      subtitle: "Get 100% bonus on your first deposit up to ₹10,000",
      gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
      cta: "Claim Now",
      href: "/promotions",
    },
    {
      title: "IPL 2026 Special",
      subtitle: "Free bets on every match day. Predict & win big!",
      gradient: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
      cta: "Bet Now",
      href: "/sports",
    },
    {
      title: "Crash & Win",
      subtitle: "Play Aviator, Crash & Plinko — instant payouts guaranteed",
      gradient: "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)",
      cta: "Play Now",
      href: "/zeero-games",
    },
    {
      title: "Refer & Earn",
      subtitle: "Invite friends & earn 5% of their wagers forever",
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
      cta: "Get Link",
      href: "/referral",
    },
  ];

  const slides = promos.length > 0
    ? promos.map((p) => ({
        title: p.title || "Special Offer",
        subtitle: p.description || "",
        gradient: p.gradient || "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
        bgImage: p.bgImage || "",
        cta: p.buttonText || "Claim Now",
        href: p.buttonLink || "/promotions",
        bonus: p.bonusPercentage,
      }))
    : fallbackSlides;

  const total = slides.length;

  const goTo = (i: number) => setCurrent((i + total) % total);
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  useEffect(() => {
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current]);

  const slide = slides[current];

  return (
    <section className="relative px-3 md:px-4 pt-3">
      <div
        className="relative w-full h-[180px] md:h-[240px] rounded-2xl overflow-hidden transition-all duration-500"
        style={{ background: slide.gradient }}
      >
        {/* Background image if available */}
        {(slide as any).bgImage && (
          <img
            src={(slide as any).bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
          />
        )}

        {/* Decorative circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.06]" />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-black/[0.08]" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-10 max-w-lg">
          {(slide as any).bonus && (
            <span className="text-4xl md:text-5xl font-black text-white leading-none mb-1">
              +{(slide as any).bonus}%
            </span>
          )}
          <h2 className="text-xl md:text-3xl font-black text-white leading-tight">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="text-[12px] md:text-sm text-white/60 mt-1.5 leading-relaxed max-w-sm">
              {slide.subtitle}
            </p>
          )}
          <Link
            href={slide.href}
            className="mt-4 self-start inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur text-white font-bold text-[11px] uppercase tracking-wider px-5 py-2.5 rounded-lg border border-white/20 transition-all"
          >
            {slide.cta} <ArrowRight size={12} strokeWidth={3} />
          </Link>
        </div>

        {/* Arrows */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur flex items-center justify-center text-white/50 hover:text-white transition-all"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur flex items-center justify-center text-white/50 hover:text-white transition-all"
        >
          <ChevronRight size={14} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? "w-5 bg-white"
                  : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ BENTO FEATURES ═══ */
function BentoFeatures() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 md:px-6">
      <div className="col-span-2 row-span-2 rounded-2xl bg-gradient-to-br from-emerald-900/25 to-[#080d0a] border border-emerald-500/10 p-6 flex flex-col justify-between group hover:border-emerald-500/20 transition-all">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform"><Shield size={22} className="text-emerald-400" /></div>
        <div className="mt-6">
          <p className="text-white font-black text-2xl leading-tight">Provably<br />Fair</p>
          <p className="text-emerald-400/40 text-[12px] mt-2 leading-relaxed max-w-[280px]">Every bet verified on-chain. Curaçao licensed. Your money is always secure.</p>
        </div>
      </div>
      {[
        { icon: Zap, color: "text-amber-400", title: "Lightning Payouts", desc: "Cash out in under 60 seconds" },
        { icon: Lock, color: "text-indigo-400", title: "Vault Security", desc: "Military-grade 256-bit encryption" },
        { icon: Headphones, color: "text-pink-400", title: "Always On", desc: "24/7 live chat & WhatsApp" },
        { icon: Gift, color: "text-[#f59e0b]", title: "Daily Bonuses", desc: "Reload, cashback & VIP deals" },
      ].map((f) => {
        const Icon = f.icon;
        return (
          <div key={f.title} className="rounded-2xl bg-white/[0.015] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-all group">
            <Icon size={18} className={`${f.color} mb-3 group-hover:scale-110 transition-transform`} />
            <p className="text-white font-bold text-[14px]">{f.title}</p>
            <p className="text-white/20 text-[10px] mt-1.5 leading-relaxed">{f.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ═══ PROMOTIONS SCROLLER ═══ */
function PromotionCards({ promos }: { promos: any[] }) {
  if (promos.length === 0) return null;
  return (
    <div className="px-4 md:px-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gift size={15} className="text-amber-400" fill="currentColor" />
          <h2 className="text-[14px] font-black text-white tracking-tight">Hot Deals</h2>
          <span className="text-[8px] font-black text-amber-400/50 bg-amber-400/8 px-1.5 py-0.5 rounded-full">{promos.length} LIVE</span>
        </div>
        <Link href="/promotions" className="text-[10px] font-bold text-white/20 hover:text-white/50 transition-colors flex items-center gap-1">All <ArrowRight size={9} /></Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {promos.map(promo => (
          <Link key={promo._id} href={promo.buttonLink || "/promotions"}
            className="flex-shrink-0 relative rounded-2xl overflow-hidden border border-white/[0.05] hover:border-white/15 transition-all hover:-translate-y-0.5"
            style={{ background: promo.gradient || "linear-gradient(135deg, #7c3aed, #4c1d95)", width: 300, minHeight: 170 }}>
            {promo.bgImage && <img src={promo.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />}
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/[0.05]" />
            <div className="relative z-10 p-5 flex flex-col gap-1 max-w-[65%]">
              {promo.bonusPercentage > 0 && <span className="text-3xl font-black text-white leading-none">+{promo.bonusPercentage}%</span>}
              <p className="text-white font-black text-sm leading-tight">{promo.title}</p>
              {promo.description && <p className="text-white/45 text-[10px] line-clamp-2 mt-0.5">{promo.description}</p>}
              <div className="mt-2.5 self-start inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg">{promo.buttonText || "CLAIM NOW"} <ArrowRight size={9} /></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══ LIVE SPORTS STRIP ═══ */
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
    <div className="px-4 md:px-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-[14px] font-black text-white tracking-tight">Live Right Now</h2>
          <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">{matches.length} LIVE</span>
        </div>
        <Link href="/sports" className="text-[10px] font-bold text-white/20 hover:text-white/50 transition-colors flex items-center gap-1">View all <ArrowRight size={9} /></Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {matches.map((m, i) => (
          <Link key={m._id || i} href={`/sports/match/${m._id || m.eventId}`}
            className="flex-shrink-0 w-[260px] rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.1] p-3.5 transition-all hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-bold text-white/15 uppercase tracking-wider">
                {m.sportName || m.competition?.name || "Match"}
              </span>
              <span className="flex items-center gap-1 text-[8px] font-bold text-red-400">
                <Circle size={5} fill="currentColor" /> LIVE
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white/70 truncate">{m.team1 || m.runners?.[0]?.runnerName || "Team A"}</p>
                <p className="text-[11px] font-bold text-white/70 truncate mt-1">{m.team2 || m.runners?.[1]?.runnerName || "Team B"}</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-black text-[#f59e0b]">{m.score1 || "-"}</p>
                <p className="text-[13px] font-black text-[#f59e0b] mt-1">{m.score2 || "-"}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-bold text-white/15 group-hover:text-white/30 transition-colors">
              <Play size={8} /> Bet now
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══ RECENT WINNERS TICKER ═══ */
function RecentWinners() {
  const winners = [
    { user: "raj***28", game: "Aviator", amount: "₹18,420", time: "2m ago" },
    { user: "pri***91", game: "Crash", amount: "₹42,800", time: "5m ago" },
    { user: "vik***44", game: "Mines", amount: "₹8,350", time: "8m ago" },
    { user: "san***67", game: "Plinko", amount: "₹15,200", time: "11m ago" },
    { user: "anu***12", game: "Roulette", amount: "₹31,600", time: "14m ago" },
    { user: "dee***33", game: "Blackjack", amount: "₹22,100", time: "17m ago" },
    { user: "kir***89", game: "Dragon Tiger", amount: "₹56,750", time: "19m ago" },
    { user: "man***05", game: "Dice", amount: "₹9,800", time: "22m ago" },
  ];
  const doubled = [...winners, ...winners];
  const tickerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="px-4 md:px-6">
      <div className="flex items-center gap-2 mb-2.5">
        <TrendingUp size={13} className="text-emerald-400" />
        <h2 className="text-[13px] font-black text-white/60">Winning Right Now</h2>
      </div>
      <div className="overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#06080c] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#06080c] to-transparent z-10" />
        <div ref={tickerRef} className="flex gap-2 animate-scroll-x">
          {doubled.map((w, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-white/[0.015] border border-white/[0.03] rounded-lg px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-[8px] font-black text-white/40">
                {w.user.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/40">{w.user}</p>
                <p className="text-[8px] text-white/15">{w.game}</p>
              </div>
              <span className="text-[11px] font-black text-emerald-400 ml-1">{w.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ PROVIDER STRIP ═══ */
function ProviderStrip() {
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    casinoService.getProviders()
      .then((data: any[]) => setProviders(data.slice(0, 16)))
      .catch(() => {});
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="px-4 md:px-6">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[13px] font-black text-white/40">Top Providers</h2>
        <Link href="/casino/providers" className="text-[10px] font-bold text-white/15 hover:text-white/40 transition-colors flex items-center gap-1">
          All <ArrowRight size={9} />
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {providers.map((p) => (
          <Link
            key={p.provider}
            href={`/casino?provider=${p.provider}`}
            className="flex-shrink-0 flex items-center gap-2 bg-white/[0.015] border border-white/[0.03] hover:border-white/[0.08] rounded-lg px-3 py-2 transition-all group"
          >
            {p.logo ? (
              <img src={p.logo} alt={p.provider} className="w-5 h-5 rounded object-contain opacity-30 group-hover:opacity-60 transition-opacity" />
            ) : (
              <Gamepad2 size={14} className="text-white/15" />
            )}
            <span className="text-[10px] font-bold text-white/20 group-hover:text-white/50 capitalize transition-colors whitespace-nowrap">
              {p.provider}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══ TELEGRAM CTA ═══ */
function TelegramCTA() {
  return (
    <div className="px-4 md:px-6">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#0088cc]/15 via-[#0088cc]/5 to-transparent border border-[#0088cc]/15 p-5 md:p-8">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[#0088cc]/5" />
        <div className="absolute right-8 bottom-4 opacity-5">
          <SiTelegram size={100} />
        </div>
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <SiTelegram size={18} className="text-[#29b6f6]" />
            <span className="text-[10px] font-black text-[#29b6f6] uppercase tracking-wider">Official Channel</span>
          </div>
          <h3 className="text-xl font-black text-white leading-tight">
            Join 25,000+ bettors
          </h3>
          <p className="text-[12px] text-white/25 mt-1.5 max-w-sm leading-relaxed">
            Get exclusive promo codes, match predictions, and insider tips. Direct from the odd69 crew.
          </p>
          <a
            href="https://t.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 bg-[#29b6f6]/15 hover:bg-[#29b6f6]/25 text-[#29b6f6] font-bold text-[11px] uppercase tracking-wider px-5 py-2.5 rounded-lg border border-[#29b6f6]/20 transition-all"
          >
            <SiTelegram size={13} /> Join Telegram <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN HOME PAGE ═══ */
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { openLogin } = useModal();
  const [slotGames, setSlotGames] = useState<any[]>([]);
  const [liveGames, setLiveGames] = useState<any[]>([]);
  const [newGames, setNewGames] = useState<any[]>([]);
  const [tableGames, setTableGames] = useState<any[]>([]);
  const [crashGames, setCrashGames] = useState<any[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [promos, setPromos] = useState<any[]>([]);

  const handlePlayGame = (game: any) => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }
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
          casinoService.getGames(undefined, "live", undefined, 1, 12),
          casinoService.getGames(undefined, "new", undefined, 1, 12),
          casinoService.getGames(undefined, "table", undefined, 1, 12),
          casinoService.getGames(undefined, "crash", undefined, 1, 12),
        ]);
        if (slotsRes.games) setSlotGames(slotsRes.games);
        if (liveRes.games) setLiveGames(liveRes.games);
        if (newRes.games) setNewGames(newRes.games);
        if (tableRes.games) setTableGames(tableRes.games);
        if (crashRes.games) setCrashGames(crashRes.games);
      } catch (e) { console.error("Failed to load games", e); }
      finally { setGamesLoading(false); }
      try { const res = await api.get("/promotions/app-home"); if (Array.isArray(res.data) && res.data.length > 0) setPromos(res.data); } catch {}
    };
    load();
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 md:pb-10">
      {/* Hero Slider */}
      <HeroSlider promos={promos} />

      {/* Live Stats */}
      <LiveStats />

      {/* Categories */}
      <CategoryStrip />

      {/* Live Sports */}
      <LiveSportsStrip />

      {/* Game Sections */}
      <div className="px-4 md:px-6 space-y-8">
        <GameRow accentColor="bg-teal-400" title="Just Dropped" subtitle="Fresh picks from top studios" icon={<Sparkles size={15} className="text-teal-400" />} games={newGames} isLoading={gamesLoading} viewAllHref="/casino?category=new" onPlay={handlePlayGame} />
        <GameRow accentColor="bg-red-500" title="Fan Favourites" subtitle="The slots everyone's spinning" icon={<Flame size={15} className="text-red-400" />} games={slotGames} isLoading={gamesLoading} viewAllHref="/casino?category=slots" onPlay={handlePlayGame} />
        <GameRow accentColor="bg-[#f59e0b]" title="Live Tables" subtitle="Real dealers streaming in HD" icon={<Play size={15} className="text-[#f59e0b]" fill="currentColor" />} games={liveGames} isLoading={gamesLoading} viewAllHref="/live-dealers" onPlay={handlePlayGame} />
      </div>

      {/* Recent Winners */}
      <RecentWinners />

      {/* More Game Sections */}
      <div className="px-4 md:px-6 space-y-8">
        <GameRow accentColor="bg-purple-400" title="Classic Tables" subtitle="Blackjack, Roulette & more" icon={<Star size={15} className="text-purple-400" fill="currentColor" />} games={tableGames} isLoading={gamesLoading} viewAllHref="/casino?category=table" onPlay={handlePlayGame} />
        <GameRow accentColor="bg-orange-400" title="Instant Win" subtitle="Crash, Plinko & fast picks" icon={<Flame size={15} className="text-orange-400" fill="currentColor" />} games={crashGames} isLoading={gamesLoading} viewAllHref="/casino?category=crash" onPlay={handlePlayGame} />
      </div>

      {/* Provider Strip */}
      <ProviderStrip />

      {/* Telegram CTA */}
      <TelegramCTA />

      {/* Bento Features */}
      <BentoFeatures />
    </div>
  );
}

