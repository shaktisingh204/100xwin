"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOriginalsAccess } from "@/hooks/useOriginalsAccess";

interface OriginalsShellProps {
  /** Game key — used in the bottom-bar #tag fallback */
  gameKey: string;
  /** Game display name shown bottom-left ("Mines", "Hi-Lo", …) */
  title: string;
  /** Hashtag chips shown bottom-right (defaults to title + originals + provably fair) */
  tags?: string[];
  /** Left control panel content (manual tabs, amount, action button, etc.) */
  controls: React.ReactNode;
  /** Game-area content (board, wheel, etc.) — fills the rest */
  children: React.ReactNode;
}

/**
 * Shared chrome for every odd69 Originals game page. Provides a consistent
 * left-controls + game-area layout with a dark shell and amber accents.
 *
 * Layout:
 *   ┌────────────┬──────────────────────┐
 *   │  controls  │                      │
 *   │   panel    │      game area       │
 *   │            │      (children)      │
 *   ├────────────┴──────────────────────┤
 *   │            bottom bar             │
 *   └────────────────────────────────────┘
 */
export default function OriginalsShell({
  gameKey: _gameKey,
  title,
  tags,
  controls,
  children,
}: OriginalsShellProps) {
  const { token, loading: authLoading } = useAuth();
  const { canAccessOriginals, loading: accessLoading } = useOriginalsAccess();
  const router = useRouter();
  const hasSession = !!token;

  React.useEffect(() => {
    if (!authLoading && !accessLoading && (!hasSession || !canAccessOriginals)) {
      router.replace("/");
    }
  }, [authLoading, accessLoading, hasSession, canAccessOriginals, router]);

  if (authLoading || accessLoading || !hasSession || !canAccessOriginals) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#06080c]">
        <div className="animate-spin w-8 h-8 border-2 border-white/[0.12] border-t-amber-500 rounded-full" />
      </div>
    );
  }

  const finalTags = tags ?? [
    `# ${title}`,
    "# odd69 Originals",
    "# Provably Fair",
  ];

  return (
    <div className="min-h-screen md:h-screen overflow-y-auto md:overflow-hidden bg-[#06080c] flex flex-col">
      <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden">
        {/* Dark top bar with amber accent */}
        <div className="flex-shrink-0 px-5 py-3 bg-white/[0.02] border-b border-amber-500/20 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
          <span className="text-white text-sm font-black tracking-wide">{title}</span>
          <span className="text-white/50 text-xs">odd69 Originals</span>
        </div>

        <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
          {/* ── LEFT CONTROLS PANEL (mobile: order 2 / desktop: order 1) */}
          <div className="w-full md:w-72 xl:w-80 flex-shrink-0 bg-white/[0.02] border-t md:border-t-0 md:border-r border-white/[0.06] flex flex-col overflow-y-auto order-2 md:order-1">
            {controls}
          </div>

          {/* ── GAME AREA (mobile: order 1 / desktop: order 2) */}
          <div className="flex-1 min-w-0 md:overflow-y-auto order-1 md:order-2 relative">
            {children}
          </div>
        </div>

        {/* Bottom info bar */}
        <div className="flex-shrink-0 px-5 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-white text-sm font-black">{title}</span>
            <span className="text-white/50 text-xs ml-2">by odd69 Originals</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {finalTags.map((t) => (
              <span
                key={t}
                className="text-[11px] px-2.5 py-1 bg-white/[0.03] border border-white/[0.08] rounded-full text-white/70"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
