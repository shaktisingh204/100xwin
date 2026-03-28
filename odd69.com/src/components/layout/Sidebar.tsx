"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, Gamepad2, Trophy, Play, Rocket, Star, Gift, Crown,
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

interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    main: true,
    casino: true,
    sports: true,
    providers: false,
    support: false,
  });

  useEffect(() => {
    casinoService.getProviders()
      .then((data: any[]) => setProviders(data.slice(0, 12)))
      .catch(() => {});
  }, []);

  const toggle = (key: string) =>
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const mainNav: NavItem[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Casino", href: "/casino", icon: Gamepad2, accent: "text-amber-400" },
    { label: "Live Casino", href: "/live-dealers", icon: Tv, accent: "text-red-400" },
    { label: "Sports", href: "/sports", icon: Trophy, accent: "text-teal-400" },
    { label: "Originals", href: "/zeero-games", icon: Sparkles, accent: "text-emerald-400" },
    { label: "Promotions", href: "/promotions", icon: Gift, badge: "HOT", accent: "text-[#f59e0b]" },
    { label: "VIP Club", href: "/vip", icon: Crown, accent: "text-purple-400" },
  ];

  const casinoGames: NavItem[] = [
    { label: "Slots", href: "/casino?category=slots", icon: Star },
    { label: "Crash", href: "/casino?category=crash", icon: Rocket },
    { label: "Table Games", href: "/casino?category=table", icon: Dice3 },
    { label: "Live Roulette", href: "/casino?category=live", icon: Target },
    { label: "Card Games", href: "/casino?category=card", icon: Dice1 },
    { label: "New Releases", href: "/casino?category=new", icon: Gem },
  ];

  const supportNav: NavItem[] = [
    { label: "Help Center", href: "/support/help-center", icon: Headphones },
    { label: "Fairness", href: "/fairness", icon: Shield },
    { label: "Rules", href: "/legal/rules", icon: BookOpen },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.label}
        href={item.href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all group relative ${
          active
            ? "bg-white/[0.06] text-white"
            : "text-white/30 hover:text-white/60 hover:bg-white/[0.02]"
        }`}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[#f59e0b]" />
        )}
        <Icon
          size={15}
          className={`flex-shrink-0 ${active ? (item.accent || "text-[#f59e0b]") : "text-white/20 group-hover:text-white/40"} transition-colors`}
        />
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="ml-auto text-[7px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const renderSection = (
    key: string,
    title: string,
    items: NavItem[],
    collapsible = true
  ) => (
    <div key={key}>
      <button
        onClick={() => collapsible && toggle(key)}
        className="flex items-center justify-between w-full px-3 py-2 group"
      >
        <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.15em]">
          {title}
        </span>
        {collapsible && (
          <ChevronDown
            size={10}
            className={`text-white/10 transition-transform ${
              openSections[key] ? "rotate-0" : "-rotate-90"
            }`}
          />
        )}
      </button>
      {openSections[key] && (
        <div className="space-y-0.5">{items.map(renderItem)}</div>
      )}
    </div>
  );

  return (
    <aside className="hidden md:flex flex-col w-[200px] flex-shrink-0 h-[calc(100vh-56px)] bg-[#080b10]/80 border-r border-white/[0.03] overflow-y-auto overflow-x-hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Search */}
      <div className="p-3">
        <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg px-2.5 py-2">
          <Search size={12} className="text-white/15 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                router.push(`/casino?search=${encodeURIComponent(searchQuery.trim())}`);
                setSearchQuery("");
              }
            }}
            className="bg-transparent text-[11px] text-white/60 placeholder:text-white/15 outline-none w-full"
          />
        </div>
      </div>

      {/* Main nav */}
      <div className="px-1.5 space-y-0.5">
        {mainNav.map(renderItem)}
      </div>

      <div className="my-2 mx-3 h-px bg-white/[0.03]" />

      {/* Casino categories */}
      {renderSection("casino", "Casino Games", casinoGames)}

      <div className="my-2 mx-3 h-px bg-white/[0.03]" />

      {/* Providers */}
      <div>
        <button
          onClick={() => toggle("providers")}
          className="flex items-center justify-between w-full px-3 py-2 group"
        >
          <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.15em]">
            Providers
          </span>
          <ChevronDown
            size={10}
            className={`text-white/10 transition-transform ${
              openSections.providers ? "rotate-0" : "-rotate-90"
            }`}
          />
        </button>
        {openSections.providers && (
          <div className="px-1.5 space-y-0.5">
            {providers.map((p) => (
              <Link
                key={p.provider}
                href={`/casino?provider=${p.provider}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.02] transition-all"
              >
                {p.logo ? (
                  <img
                    src={p.logo}
                    alt={p.provider}
                    className="w-4 h-4 rounded object-contain opacity-40"
                  />
                ) : (
                  <Flame size={12} className="text-white/15" />
                )}
                <span className="truncate capitalize">{p.provider}</span>
                {p.gameCount && (
                  <span className="ml-auto text-[8px] text-white/10">
                    {p.gameCount}
                  </span>
                )}
              </Link>
            ))}
            <Link
              href="/casino/providers"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-[#f59e0b]/40 hover:text-[#f59e0b]/70 transition-colors"
            >
              <Zap size={10} /> All providers →
            </Link>
          </div>
        )}
      </div>

      <div className="my-2 mx-3 h-px bg-white/[0.03]" />

      {/* Sports */}
      {renderSection("sports", "Sports", [
        { label: "Cricket", href: "/sports?sport=cricket", icon: Trophy },
        { label: "Football", href: "/sports?sport=football", icon: Trophy },
        { label: "Tennis", href: "/sports?sport=tennis", icon: Ticket },
        { label: "All Sports", href: "/sports", icon: Star },
      ])}

      <div className="my-2 mx-3 h-px bg-white/[0.03]" />

      {/* Support & Legal */}
      {renderSection("support", "Support", supportNav)}

      {/* Bottom spacer */}
      <div className="mt-auto p-3">
        <div className="bg-gradient-to-br from-[#f59e0b]/8 to-transparent border border-[#f59e0b]/10 rounded-xl p-3">
          <p className="text-[10px] font-bold text-[#f59e0b]/60">
            <span className="flex items-center gap-1.5"><HiOutlineGift size={13} className="text-[#f59e0b]/60" /> Refer & Earn</span>
          </p>
          <p className="text-[8px] text-white/15 mt-1 leading-relaxed">
            Invite friends, earn 5% of their wagers forever
          </p>
          <Link
            href="/referral"
            className="mt-2 block text-center text-[9px] font-black uppercase tracking-wider bg-[#f59e0b]/10 text-[#f59e0b]/60 hover:text-[#f59e0b] px-2 py-1.5 rounded-lg transition-colors"
          >
            Get link
          </Link>
        </div>
      </div>
    </aside>
  );
}
