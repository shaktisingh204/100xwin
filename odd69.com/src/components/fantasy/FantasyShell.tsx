"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Crown,
  Gift,
  History as HistoryIcon,
  Home as HomeIcon,
  Trophy,
} from "lucide-react";

interface FantasyShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  backHref?: string;
  rightSlot?: React.ReactNode;
  hideSubNav?: boolean;
}

export default function FantasyShell({
  children,
  title,
  subtitle,
  backHref,
  rightSlot,
  hideSubNav = false,
}: FantasyShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const subNav = [
    { href: "/fantasy", label: "Home", icon: HomeIcon },
    { href: "/fantasy/history", label: "My Matches", icon: HistoryIcon },
    { href: "/fantasy/leaderboard", label: "Leaderboard", icon: Crown },
    { href: "/fantasy/stats", label: "Stats", icon: Trophy },
    { href: "/fantasy/refer", label: "Refer & Earn", icon: Gift },
  ];

  const isActive = (href: string) =>
    href === "/fantasy" ? pathname === "/fantasy" : pathname?.startsWith(href) ?? false;

  return (
    <div className="min-h-full bg-[#06080c]">
      {(title || backHref !== undefined || rightSlot) && (
        <div className="relative overflow-hidden border-b border-white/[0.04]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.15),_transparent_60%)]" />
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="relative px-4 md:px-6 py-5 md:py-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-3">
              {backHref !== undefined && (
                backHref ? (
                  <Link
                    prefetch
                    href={backHref}
                    className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
                    aria-label="Back"
                  >
                    <ArrowLeft size={16} strokeWidth={2.5} />
                  </Link>
                ) : (
                  <button
                    onClick={() => router.back()}
                    className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
                    aria-label="Back"
                  >
                    <ArrowLeft size={16} strokeWidth={2.5} />
                  </button>
                )
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <h1 className="text-white font-black text-[17px] md:text-xl truncate tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-white/40 text-[11px] md:text-xs font-medium truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              {rightSlot && <div className="shrink-0">{rightSlot}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 py-4 md:py-5 max-w-5xl mx-auto w-full">
        {!hideSubNav && (
          <div className="-mx-4 md:mx-0 mb-4 md:mb-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="inline-flex md:flex items-center gap-2 px-4 md:px-0 min-w-full">
              {subNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] md:text-xs font-bold whitespace-nowrap transition-all tracking-wide ${
                      active
                        ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300 border border-amber-500/30"
                        : "bg-white/[0.02] text-white/40 border border-white/[0.06] hover:border-white/[0.12] hover:text-white/70"
                    }`}
                  >
                    <Icon size={13} strokeWidth={2.5} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
