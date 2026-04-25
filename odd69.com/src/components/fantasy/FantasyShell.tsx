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
    <div className="min-h-full bg-[var(--bg-base)]">
      {(title || backHref !== undefined || rightSlot) && (
        <div className="relative overflow-hidden border-b border-[var(--line-default)] glass">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--gold-soft),_transparent_60%)]" />
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-[var(--gold)]/10 blur-3xl pointer-events-none" />
          <div className="relative px-4 md:px-6 py-4 md:py-5 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-3">
              {backHref !== undefined && (
                backHref ? (
                  <Link
                    prefetch
                    href={backHref}
                    className="w-11 h-11 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-raised)] border border-[var(--line-default)] flex items-center justify-center text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors shrink-0"
                    aria-label="Back"
                  >
                    <ArrowLeft size={16} strokeWidth={2.5} />
                  </Link>
                ) : (
                  <button
                    onClick={() => router.back()}
                    className="w-11 h-11 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-raised)] border border-[var(--line-default)] flex items-center justify-center text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors shrink-0"
                    aria-label="Back"
                  >
                    <ArrowLeft size={16} strokeWidth={2.5} />
                  </button>
                )
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <h1 className="font-display text-[var(--ink)] font-extrabold text-[17px] md:text-xl truncate tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-[var(--ink-faint)] text-[11px] md:text-xs font-medium truncate mt-0.5">
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
          <div className="-mx-4 md:mx-0 mb-4 md:mb-5 overflow-x-auto no-scrollbar">
            <div className="inline-flex md:flex items-center gap-2 px-4 md:px-0 min-w-full">
              {subNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[11px] md:text-xs font-bold whitespace-nowrap transition-all uppercase tracking-[0.08em] ${
                      active
                        ? "bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[var(--line-gold)]"
                        : "bg-[var(--bg-surface)] text-[var(--ink-faint)] border border-[var(--line-default)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
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
