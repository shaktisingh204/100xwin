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
      <div className="hidden md:block relative">
        {/* Ambient gold radial behind the page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-0"
          style={{
            background:
              "radial-gradient(ellipse 900px 360px at 18% 0%, rgba(245,183,10,0.08) 0%, transparent 65%), radial-gradient(ellipse 700px 320px at 92% 6%, rgba(139,92,255,0.06) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Hero banner — admin-controlled from CMS > Sliders */}
          {selectedCategory === "all" && (
            <div className="relative rounded-[18px] overflow-hidden border border-[var(--gold-line)]">
              <DynamicHeroSlider
                page="CASINO"
                className="w-full"
                onGameLaunch={handleGameLaunch}
                fallback={<PromoCardSlider onGameLaunch={handleGameLaunch} />}
              />
            </div>
          )}

          {/* Lobby intro strip — eyebrow + tagline + live status */}
          {selectedCategory === "all" && (
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="rail-gold">
                <span className="t-eyebrow">The Floor</span>
                <h1 className="font-display font-extrabold text-[var(--ink)] text-[26px] md:text-[32px] tracking-[-0.025em] leading-none mt-1">
                  Casino <span className="text-gold-grad">Lobby</span>
                </h1>
                <p className="text-[12.5px] text-[var(--ink-dim)] mt-2 max-w-md">
                  Slots, live tables, crash rails — every tile audited, every payout instant.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="chip chip-emerald">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-live-dot" />
                  Live
                </span>
                <span className="chip chip-gold">
                  <Sparkles size={10} /> 1,200+ Games
                </span>
                <span className="chip">
                  <Layers size={10} /> 32 Studios
                </span>
              </div>
            </div>
          )}

          {/* Search bar — opens browser modal */}
          <button
            type="button"
            onClick={handleSearchClick}
            aria-label="Search games"
            className="relative w-full text-left group block"
          >
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] group-hover:text-[var(--gold)] transition-colors"
              size={18}
            />
            <div className="h-12 w-full rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] pl-12 pr-20 text-[13.5px] font-medium text-[var(--ink-faint)] flex items-center transition-all group-hover:border-[var(--gold-line)] group-hover:bg-[var(--bg-elevated)] group-hover:shadow-[0_0_0_4px_var(--gold-soft)]">
              Search 1,200+ games — slot, provider, or table…
            </div>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--ink-whisper)] border border-[var(--line-default)] rounded-md px-1.5 py-0.5 bg-[var(--bg-elevated)]">
              ⌘K
            </span>
          </button>

          {/* Category rail — chips with circular icon badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            {CASINO_RAIL.map(({ key, label, Icon }) => {
              const active = selectedCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => handleCategoryClick(key)}
                  className={`flex shrink-0 items-center gap-2 rounded-[12px] pl-1.5 pr-3.5 py-1.5 text-[12px] font-semibold transition-all border ${
                    active
                      ? "bg-[var(--gold-soft)] border-[var(--gold-line)] text-[var(--gold-bright)] shadow-[0_0_18px_var(--gold-halo)]"
                      : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <span
                    className={`grid place-items-center w-7 h-7 rounded-[9px] transition-colors ${
                      active
                        ? "bg-gold-grad text-[#120c00]"
                        : "bg-[var(--bg-elevated)] text-[var(--ink-faint)] group-hover:text-[var(--ink-dim)]"
                    }`}
                  >
                    <Icon size={14} />
                  </span>
                  {label}
                </button>
              );
            })}
            <button
              onClick={handleSearchClick}
              aria-label="Browse all"
              className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--bg-surface)] border border-[var(--line-default)] text-[var(--ink-faint)] hover:text-[var(--ink)] hover:border-[var(--gold-line)] transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Section rows — gold rail accent on titles via the GameGrid component */}
          <div className="space-y-7 md:space-y-8">
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
