"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, Gamepad2, Trophy, Rocket, Star, Gift, Crown,
  Headphones, BookOpen, Shield, ChevronDown, Search, Sparkles,
  Tv, Dice1, Dice3, Target, Gem, Flame, Zap, Settings, Ticket,
} from "lucide-react";
import { HiOutlineGift } from "react-icons/hi";
import { casinoService } from "@/services/casino";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  accent?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    main: true, casino: true, sports: true, providers: false, support: false,
  });

  useEffect(() => {
    casinoService.getProviders()
      .then((data: any[]) => setProviders(data.slice(0, 12)))
      .catch(() => {});
  }, []);

  const toggle = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const mainNav: NavItem[] = [
    { label: "Home",        href: "/",              icon: Home,      accent: "text-[var(--ink)]" },
    { label: "Casino",      href: "/casino",        icon: Gamepad2,  accent: "text-[var(--gold)]" },
    { label: "Live Casino", href: "/live-dealers",  icon: Tv,        accent: "text-[var(--crimson)]" },
    { label: "Sports",      href: "/sports",        icon: Trophy,    accent: "text-[var(--emerald)]" },
    { label: "Originals",   href: "/zeero-games",   icon: Sparkles,  accent: "text-[var(--violet)]" },
    { label: "Promotions",  href: "/promotions",    icon: Gift,      accent: "text-[var(--rose)]", badge: "HOT" },
    { label: "VIP Club",    href: "/vip",           icon: Crown,     accent: "text-[var(--gold-bright)]" },
  ];

  const casinoGames: NavItem[] = [
    { label: "Slots",         href: "/casino?category=slots", icon: Star },
    { label: "Crash",         href: "/casino?category=crash", icon: Rocket },
    { label: "Table games",   href: "/casino?category=table", icon: Dice3 },
    { label: "Live roulette", href: "/casino?category=live",  icon: Target },
    { label: "Card games",    href: "/casino?category=card",  icon: Dice1 },
    { label: "New releases",  href: "/casino?category=new",   icon: Gem },
  ];

  const supportNav: NavItem[] = [
    { label: "Help center", href: "/support/help-center", icon: Headphones },
    { label: "Fairness",    href: "/fairness",            icon: Shield },
    { label: "Rules",       href: "/legal/rules",         icon: BookOpen },
    { label: "Settings",    href: "/settings",            icon: Settings },
  ];

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.label}
        href={item.href}
        className={`relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-[10px] text-[12.5px] font-semibold transition-all group ${
          active
            ? "bg-white/[0.045] text-[var(--ink)]"
            : "text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-white/[0.025]"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gold-grad shadow-[0_0_8px_var(--gold-halo)]" />
        )}
        <Icon
          size={15}
          strokeWidth={active ? 2.25 : 1.75}
          className={`flex-shrink-0 transition-colors ${
            active ? (item.accent || "text-[var(--gold)]") : "text-[var(--ink-whisper)] group-hover:text-[var(--ink-dim)]"
          }`}
        />
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="ml-auto chip chip-crimson !py-[2px] !px-1.5 !text-[8.5px]">{item.badge}</span>
        )}
      </Link>
    );
  };

  const renderSection = (key: string, title: string, items: NavItem[]) => (
    <div key={key}>
      <button
        onClick={() => toggle(key)}
        className="flex items-center justify-between w-full px-4 py-2 group"
      >
        <span className="t-eyebrow !text-[9px]">{title}</span>
        <ChevronDown
          size={11}
          className={`text-[var(--ink-whisper)] group-hover:text-[var(--ink-faint)] transition-transform ${
            openSections[key] ? "rotate-0" : "-rotate-90"
          }`}
        />
      </button>
      {openSections[key] && <div className="space-y-0.5 px-1.5">{items.map(renderItem)}</div>}
    </div>
  );

  return (
    <aside
      className="hidden md:flex flex-col w-[224px] flex-shrink-0 h-[calc(100vh-64px)] bg-[var(--bg-base)]/85 border-r border-[var(--line-default)] overflow-y-auto overflow-x-hidden no-scrollbar"
    >
      {/* Search */}
      <div className="p-3">
        <label className="group flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--line-default)] rounded-[10px] pl-3 pr-2 h-9 focus-within:border-[var(--line-gold)] transition-colors">
          <Search size={13} className="text-[var(--ink-whisper)] group-focus-within:text-[var(--gold)] transition-colors" />
          <input
            type="text"
            placeholder="Search games, markets, teams…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                router.push(`/casino?search=${encodeURIComponent(searchQuery.trim())}`);
                setSearchQuery("");
              }
            }}
            className="bg-transparent text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] outline-none w-full"
          />
          <span className="font-mono text-[9.5px] text-[var(--ink-whisper)] border border-[var(--line-default)] rounded px-1">⌘K</span>
        </label>
      </div>

      {/* Main nav */}
      <div className="px-1.5 space-y-0.5">{mainNav.map(renderItem)}</div>

      <div className="my-3 mx-4 hairline" />

      {/* Casino categories */}
      {renderSection("casino", "Casino", casinoGames)}

      <div className="my-3 mx-4 hairline" />

      {/* Providers */}
      <div>
        <button
          onClick={() => toggle("providers")}
          className="flex items-center justify-between w-full px-4 py-2 group"
        >
          <span className="t-eyebrow !text-[9px]">Providers</span>
          <ChevronDown
            size={11}
            className={`text-[var(--ink-whisper)] transition-transform ${openSections.providers ? "rotate-0" : "-rotate-90"}`}
          />
        </button>
        {openSections.providers && (
          <div className="px-1.5 space-y-0.5">
            {providers.map((p) => (
              <Link
                key={p.provider}
                href={`/casino?provider=${p.provider}`}
                className="flex items-center gap-2.5 pl-4 pr-3 py-1.5 rounded-[10px] text-[11.5px] font-medium text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-white/[0.025] transition-all"
              >
                {p.logo ? (
                  <img src={p.logo} alt={p.provider} className="w-4 h-4 rounded object-contain opacity-60" />
                ) : (
                  <Flame size={12} className="text-[var(--ink-whisper)]" />
                )}
                <span className="truncate capitalize">{p.provider}</span>
                {p.gameCount && (
                  <span className="ml-auto num text-[9.5px] text-[var(--ink-whisper)]">{p.gameCount}</span>
                )}
              </Link>
            ))}
            <Link
              href="/casino/providers"
              className="flex items-center gap-1.5 pl-4 pr-3 py-1.5 text-[10.5px] font-bold text-[var(--gold)] hover:text-[var(--gold-bright)] transition-colors uppercase tracking-wider"
            >
              <Zap size={10} /> All providers →
            </Link>
          </div>
        )}
      </div>

      <div className="my-3 mx-4 hairline" />

      {/* Sports */}
      {renderSection("sports", "Sports", [
        { label: "Cricket",    href: "/sports?sport=cricket",  icon: Trophy },
        { label: "Football",   href: "/sports?sport=football", icon: Trophy },
        { label: "Tennis",     href: "/sports?sport=tennis",   icon: Ticket },
        { label: "All sports", href: "/sports",                icon: Star },
      ])}

      <div className="my-3 mx-4 hairline" />

      {/* Support */}
      {renderSection("support", "Support", supportNav)}

      {/* Refer block */}
      <div className="mt-auto p-3">
        <div className="relative overflow-hidden rounded-[14px] bg-[linear-gradient(140deg,rgba(245,183,10,0.14)_0%,rgba(245,183,10,0.02)_60%)] border border-[var(--line-gold)] p-3.5">
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-[var(--gold)]/15 blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <HiOutlineGift size={14} className="text-[var(--gold-bright)]" />
              <span className="t-eyebrow !text-[9px] !text-[var(--gold-bright)]">Refer & earn</span>
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-[var(--ink-dim)] leading-snug">
              Invite friends, earn <span className="num text-[var(--gold-bright)] font-semibold">5%</span> of their wagers forever.
            </p>
            <Link
              href="/referral"
              className="mt-2.5 inline-flex items-center gap-1 btn btn-gold !py-1.5 !px-3 !text-[10px] uppercase tracking-[0.1em]"
            >
              Get link
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
