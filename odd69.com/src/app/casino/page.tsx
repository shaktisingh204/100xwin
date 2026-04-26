"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import GamePlayInterface from "@/components/casino/GamePlayInterface";
import CasinoMobileView from "@/components/casino/CasinoMobileView";
import CasinoBrowserModal from "@/components/casino/CasinoBrowserModal";
import {
  House, Layers, Flame, Tickets, Star, Dice5, Rocket, Sparkles, Target, Fish, Drama, CircleDot, Trophy,
} from "lucide-react";
import { casinoService } from "@/services/casino";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import MaintenanceState from "@/components/maintenance/MaintenanceState";
import { useSectionMaintenance } from "@/hooks/useSectionMaintenance";
import { getCasinoWalletModeFromSubWallet } from "@/utils/casinoWalletMode";

interface LaunchableGame {
  id?: string;
  name?: string;
  gameName?: string;
  provider?: string;
  providerCode?: string;
  gameCode?: string;
  url?: string;
}

const CASINO_RAIL = [
  { key: "all",       label: "Lobby",       Icon: House },
  { key: "providers", label: "Providers",   Icon: Layers },
  { key: "popular",   label: "Hot Games",   Icon: Flame },
  { key: "slots",     label: "Slots",       Icon: Tickets },
  { key: "live",      label: "Live Casino", Icon: Star },
  { key: "table",     label: "Table Games", Icon: Dice5 },
  { key: "crash",     label: "Crash",       Icon: Rocket },
  { key: "new",       label: "New Games",   Icon: Sparkles },
  { key: "top-slots", label: "Top Slots",   Icon: Target },
  { key: "fishing",   label: "Fishing",     Icon: Fish },
  { key: "blackjack", label: "Blackjack",   Icon: Drama },
  { key: "roulette",  label: "Roulette",    Icon: CircleDot },
  { key: "baccarat",  label: "Baccarat",    Icon: Trophy },
];

function CasinoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const { user } = useAuth();
  const { selectedSubWallet } = useWallet();
  const { blocked, loading: maintenanceLoading, message: maintenanceMessage } = useSectionMaintenance(
    "casino",
    "Casino is currently under maintenance. Game launches are temporarily unavailable.",
  );

  const [activeGame, setActiveGame] = useState<{ id: string; name: string; provider: string; url: string } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Browser Modal State
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserInitialCat, setBrowserInitialCat] = useState("all");
  const [browserInitialSearch, setBrowserInitialSearch] = useState("");

  // Auto-open browser modal when URL has a category param
  useEffect(() => {
    if (categoryParam && categoryParam !== "all") {
      setBrowserInitialCat(categoryParam);
      setBrowserInitialSearch("");
      setIsBrowserOpen(true);
    } else if (!categoryParam) {
      setIsBrowserOpen(false);
    }
  }, [categoryParam]);

  if (maintenanceLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[var(--bg-base)]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--gold)]" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-[70vh] bg-[var(--bg-base)]">
        <MaintenanceState title="Casino Maintenance" message={maintenanceMessage} backHref="/" backLabel="Back to Home" />
      </div>
    );
  }

  const toActiveGame = (g: LaunchableGame, url: string) => ({
    id: g.id || g.gameCode || "",
    name: g.name || g.gameName || "",
    provider: g.providerCode || g.provider || "",
    url,
  });

  const handleGameLaunch = async (gameData: LaunchableGame) => {
    if (gameData.url) { setActiveGame(toActiveGame(gameData, gameData.url)); setLaunchError(null); return; }
    if (!user) { alert("Please login to play"); return; }
    const providerCode = gameData.providerCode || gameData.provider;
    const gameId = gameData.gameCode || gameData.id;
    if (!providerCode || !gameId) { setLaunchError("Game data is incomplete."); return; }
    setLaunching(true); setLaunchError(null);
    try {
      const res = await casinoService.launchGame({
        username: user.username,
        provider: providerCode,
        gameId,
        isLobby: false,
        walletMode: getCasinoWalletModeFromSubWallet(selectedSubWallet),
      });
      if (res?.url) setActiveGame(toActiveGame(gameData, res.url));
      else setLaunchError("Could not get game URL.");
    } catch (error: unknown) {
      setLaunchError(error instanceof Error ? error.message : "Failed to launch game.");
    } finally { setLaunching(false); }
  };

  return (
    <>
      {/* Launching overlay */}
      {launching && (
        <div className="fixed inset-0 z-[600] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-3">
          <div className="relative w-14 h-14">
            <div className="w-14 h-14 rounded-full border-2 border-[var(--gold-line)] border-t-[var(--gold)] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-xl">🎰</div>
          </div>
          <p className="t-eyebrow !text-[11px] text-[var(--ink-dim)] animate-pulse">Launching…</p>
        </div>
      )}

      {/* Error overlay */}
      {launchError && (
        <div className="fixed inset-0 z-[600] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-14 h-14 rounded-2xl bg-[var(--crimson-soft)] border border-[color:var(--crimson)]/25 flex items-center justify-center text-2xl">⚠️</div>
          <div className="text-center">
            <h2 className="font-display text-[16px] font-bold text-[var(--ink)] mb-1">Unable to Launch</h2>
            <p className="text-[13px] text-[var(--ink-faint)]">{launchError}</p>
          </div>
          <button
            onClick={() => setLaunchError(null)}
            className="btn btn-ghost h-10 uppercase tracking-[0.06em] text-[11px]"
          >
            <X size={14} /> Close
          </button>
        </div>
      )}

      {/* Game overlay */}
      {activeGame && (
        <div className="fixed inset-0 z-[500] bg-[var(--bg-base)] flex flex-col">
          <GamePlayInterface
            game={activeGame}
            onClose={() => setActiveGame(null)}
            isEmbedded={false}
            onLaunch={handleGameLaunch}
            key={activeGame.id}
          />
        </div>
      )}

      <CasinoBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => {
          setIsBrowserOpen(false);
          router.push("/casino");
        }}
        initialCategory={browserInitialCat}
        initialSearch={browserInitialSearch}
        onLaunch={handleGameLaunch}
        categories={CASINO_RAIL}
      />

      {/* ── Same view on every viewport — centered with max-width on desktop ── */}
      <div className="mx-auto max-w-[640px] md:max-w-[820px] lg:max-w-[1080px]">
        <CasinoMobileView onLaunch={handleGameLaunch} />
      </div>
    </>
  );
}

export default function CasinoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] bg-[var(--bg-base)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--gold)]" />
        </div>
      }
    >
      <CasinoContent />
    </Suspense>
  );
}
