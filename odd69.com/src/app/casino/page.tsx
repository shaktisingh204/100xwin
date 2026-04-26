"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search, X, Flame, Dice5, House, Fish, Tickets, CircleDot, Drama, Trophy,
  ChevronRight, Star, Layers, Sparkles, Rocket, Target,
} from "lucide-react";
import GameGrid from "@/components/casino/GameGrid";
import GamePlayInterface from "@/components/casino/GamePlayInterface";
import CasinoMobileView from "@/components/casino/CasinoMobileView";
import CasinoBrowserModal from "@/components/casino/CasinoBrowserModal";
import { casinoService } from "@/services/casino";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import MaintenanceState from "@/components/maintenance/MaintenanceState";
import { useSectionMaintenance } from "@/hooks/useSectionMaintenance";
import { getCasinoWalletModeFromSubWallet } from "@/utils/casinoWalletMode";
import PromoCardSlider from "@/components/home/PromoCardSlider";
import DynamicHeroSlider from "@/components/shared/DynamicHeroSlider";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const selectedCategory = categoryParam || "all";

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

  // Sections shown as horizontal rows on the casino lobby
  const sectionConfigs = useMemo(() => ([
    { title: "Hot Games",   category: "popular",   icon: <Flame    size={15} className="text-[var(--crimson)]"   /> },
    { title: "Slots",       category: "slots",     icon: <Dice5    size={15} className="text-[var(--gold-bright)]" /> },
    { title: "Live Casino", category: "live",      icon: <CircleDot size={15} className="text-[var(--crimson)]"   /> },
    { title: "Table Games", category: "table",     icon: <Layers   size={15} className="text-[var(--violet)]"    /> },
    { title: "Crash",       category: "crash",     icon: <Rocket   size={15} className="text-[var(--gold)]"      /> },
    { title: "New Games",   category: "new",       icon: <Sparkles size={15} className="text-[var(--ice)]"       /> },
    { title: "Top Slots",   category: "top-slots", icon: <Star     size={15} className="text-[var(--gold-bright)]" /> },
  ]), []);

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

  const handleCategoryClick = (cat: string) => {
    if (cat === "all") {
      router.push("/casino");
      return;
    }
    router.push(`/casino?category=${cat}`);
  };

  const handleSearchClick = () => {
    setBrowserInitialCat("all");
    setIsBrowserOpen(true);
  };

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

      {/* ── MOBILE ── */}
      <div className="md:hidden">
        <CasinoMobileView onLaunch={handleGameLaunch} />
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block">
        <div className="p-4 md:p-5 space-y-5 max-w-[1600px] mx-auto">
          {/* Hero banner — admin-controlled from CMS > Sliders */}
          {selectedCategory === "all" && (
            <DynamicHeroSlider
              page="CASINO"
              className="w-full"
              onGameLaunch={handleGameLaunch}
              fallback={<PromoCardSlider onGameLaunch={handleGameLaunch} />}
            />
          )}

          {/* Search bar — opens browser modal */}
          <button
            type="button"
            onClick={handleSearchClick}
            aria-label="Search games"
            className="relative w-full text-left group"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" size={18} />
            <div className="h-11 w-full rounded-xl border border-[var(--line-default)] bg-white/[0.03] py-2.5 pl-11 pr-4 text-sm font-medium text-[var(--ink-faint)] flex items-center transition-all group-hover:border-[var(--gold-line)] group-hover:bg-white/[0.04]">
              Search games...
            </div>
          </button>

          {/* Category rail */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CASINO_RAIL.map(({ key, label, Icon }) => {
              const active = selectedCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => handleCategoryClick(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-semibold transition-all border ${
                    active
                      ? "bg-[var(--gold-soft)] border-[var(--gold-line)] text-[var(--gold-bright)]"
                      : "bg-white/[0.03] border-[var(--line-default)] text-[var(--ink-faint)] hover:text-[var(--ink-dim)] hover:border-[var(--line-strong)] hover:bg-white/[0.05]"
                  }`}
                >
                  <Icon size={13} className={active ? "text-[var(--gold-bright)]" : "text-[var(--ink-faint)]"} />
                  {label}
                </button>
              );
            })}
            <button
              onClick={handleSearchClick}
              aria-label="Browse all"
              className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] border border-[var(--line-default)] text-[var(--ink-faint)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] transition-all"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Section rows */}
          <div className="space-y-6">
            {sectionConfigs.map((section) => (
              <GameGrid
                key={section.category}
                title={section.title}
                icon={section.icon}
                category={section.category}
                layout="row"
                onViewAll={() => handleCategoryClick(section.category)}
                onLaunch={handleGameLaunch}
              />
            ))}
          </div>
        </div>
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
