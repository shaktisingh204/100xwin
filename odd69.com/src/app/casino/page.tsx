"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search, X, Flame, Star, Sparkles, Rocket, Play, Gamepad2,
  ChevronLeft, ChevronRight, Loader2, ArrowRight, Trophy, Zap,
  Grid3x3, LayoutGrid,
} from "lucide-react";
import { IoGameController } from "react-icons/io5";
import { BiErrorAlt } from "react-icons/bi";
import { casinoService } from "@/services/casino";
import { useAuth } from "@/context/AuthContext";
import GamePlayInterface from "@/components/casino/GamePlayInterface";

/* ═══ TYPES ═══ */
interface LaunchableGame {
  id?: string; name?: string; gameName?: string;
  provider?: string; providerCode?: string; gameCode?: string;
  image?: string; banner?: string; url?: string; tag?: string;
}

/* ═══ CATEGORY TABS ═══ */
const CATEGORIES = [
  { key: "all", label: "All Games", icon: LayoutGrid },
  { key: "popular", label: "Popular", icon: Flame },
  { key: "new", label: "New", icon: Sparkles },
  { key: "slots", label: "Slots", icon: Star },
  { key: "live", label: "Live", icon: Play },
  { key: "table", label: "Table", icon: Grid3x3 },
  { key: "crash", label: "Crash", icon: Rocket },
  { key: "exclusive", label: "Exclusive", icon: Zap },
];

/* ═══ GAME CARD ═══ */
function GameCard({ game, onPlay }: { game: any; onPlay: (g: any) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const src = game.image || game.banner || "";

  return (
    <div onClick={() => onPlay(game)} className="cursor-pointer group">
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.04] group-hover:border-white/[0.12] transition-all group-hover:-translate-y-1 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
        {!imgErr && src ? (
          <img src={src} alt={game.name} onError={() => setImgErr(true)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#12151a] to-[#0a0c10] text-3xl"><IoGameController size={28} className="text-white/15" /></div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-11 h-11 rounded-full bg-[#f59e0b]/20 backdrop-blur flex items-center justify-center border border-[#f59e0b]/30">
            <Play size={16} className="text-[#f59e0b] ml-0.5" fill="currentColor" />
          </div>
        </div>
        {game.tag && <div className="absolute top-2 left-2 z-10 bg-[#f59e0b] text-black text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase">{game.tag}</div>}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
          {game.provider && <span className="text-[7px] font-bold text-white/15 uppercase tracking-wider block mb-0.5">{game.provider?.slice(0, 12)}</span>}
          <p className="text-[11px] font-bold text-white/80 truncate leading-tight">{game.name || "Game"}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══ PROVIDER PILL ═══ */
function ProviderPill({ provider, selected, onClick }: { provider: any; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold transition-all flex-shrink-0 whitespace-nowrap ${
      selected
        ? "bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]"
        : "bg-white/[0.015] border-white/[0.04] text-white/25 hover:text-white/50 hover:border-white/[0.08]"
    }`}>
      {provider.logo ? (
        <img src={provider.logo} alt={provider.provider} className="w-4 h-4 rounded object-contain opacity-50" />
      ) : (
        <Gamepad2 size={12} />
      )}
      <span className="capitalize">{provider.provider}</span>
    </button>
  );
}

/* ═══ MAIN CASINO CONTENT ═══ */
function CasinoContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "all";
  const providerParam = searchParams.get("provider") || "all";

  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedProvider, setSelectedProvider] = useState(providerParam);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalGames, setTotalGames] = useState(0);

  const [activeGame, setActiveGame] = useState<{ id: string; name: string; provider: string; url: string } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  /* ── Sync URL params ── */
  useEffect(() => { setSelectedCategory(categoryParam); setPage(1); }, [categoryParam]);
  useEffect(() => { setSelectedProvider(providerParam); setPage(1); }, [providerParam]);

  /* ── Load providers ── */
  useEffect(() => {
    casinoService.getProviders().then((data: any[]) => setProviders(data)).catch(() => {});
  }, []);

  /* ── Load games ── */
  const loadGames = useCallback(async (p: number, append = false) => {
    setLoading(true);
    try {
      const cat = selectedCategory === "all" ? undefined : selectedCategory;
      const prov = selectedProvider === "all" ? undefined : selectedProvider;
      const search = searchQuery || undefined;
      const res = await casinoService.getGames(prov, cat, search, p, 40);
      const newGames = res.games || [];
      setGames((prev) => (append ? [...prev, ...newGames] : newGames));
      setTotalGames(res.totalCount || newGames.length);
      setHasMore(newGames.length >= 40);
    } catch { setGames([]); }
    finally { setLoading(false); }
  }, [selectedCategory, selectedProvider, searchQuery]);

  useEffect(() => { loadGames(1); }, [loadGames]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadGames(next, true);
  };

  /* ── URL navigation ── */
  const updateURL = (cat: string, prov: string) => {
    const params = new URLSearchParams();
    if (cat !== "all") params.set("category", cat);
    if (prov !== "all") params.set("provider", prov);
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(url, { scroll: false });
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSearchQuery("");
    setPage(1);
    updateURL(cat, selectedProvider);
  };

  const handleProviderSelect = (prov: string) => {
    setSelectedProvider(prov);
    setSearchQuery("");
    setPage(1);
    updateURL(selectedCategory, prov);
  };

  /* ── Game launch ── */
  const handleGameLaunch = async (gameData: LaunchableGame) => {
    if (gameData.url) {
      setActiveGame({ id: gameData.gameCode || gameData.id || "", name: gameData.name || gameData.gameName || "", provider: gameData.providerCode || gameData.provider || "", url: gameData.url });
      setLaunchError(null);
      return;
    }
    if (!user) { alert("Please login to play"); return; }
    const providerCode = gameData.providerCode || gameData.provider;
    const gameId = gameData.gameCode || gameData.id;
    if (!providerCode || !gameId) { setLaunchError("Game data is incomplete."); return; }

    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await casinoService.launchGame({ username: user.username, provider: providerCode, gameId, isLobby: false });
      if (res?.url) {
        setActiveGame({ id: gameId, name: gameData.name || gameData.gameName || "", provider: providerCode, url: res.url });
      } else { setLaunchError("Could not get game URL."); }
    } catch (error: unknown) {
      setLaunchError(error instanceof Error ? error.message : "Failed to launch game.");
    } finally { setLaunching(false); }
  };

  return (
    <>
      {/* ── Launching Overlay ── */}
      {launching && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border-2 border-[#f59e0b]/20 border-t-[#f59e0b] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl"><IoGameController size={20} className="text-[#f59e0b]" /></div>
          </div>
          <p className="text-white/60 text-sm font-bold tracking-widest uppercase animate-pulse">Launching game…</p>
        </div>
      )}

      {/* ── Launch Error Overlay ── */}
      {launchError && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-5 px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl"><BiErrorAlt size={28} className="text-red-400" /></div>
          <div className="text-center">
            <h2 className="text-white font-bold text-lg mb-1">Unable to Launch</h2>
            <p className="text-white/40 text-sm">{launchError}</p>
          </div>
          <button onClick={() => setLaunchError(null)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-sm">
            <X size={16} /> Close
          </button>
        </div>
      )}

      {/* ── Game Overlay ── */}
      {activeGame && (
        <div className="fixed inset-0 z-[500] bg-[#06080c] flex flex-col">
          <GamePlayInterface game={activeGame} onClose={() => setActiveGame(null)} isEmbedded={false} key={activeGame.id} />
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="max-w-[1600px] mx-auto px-3 md:px-5 py-4 space-y-5">

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15" size={16} />
          <input
            type="text"
            placeholder="Search 1200+ games..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-xl py-3 pl-10 pr-10 outline-none text-[13px] placeholder:text-white/15 focus:border-white/[0.1] transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.key;
            return (
              <button key={cat.key} onClick={() => handleCategoryChange(cat.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[11px] font-bold transition-all flex-shrink-0 ${
                  active
                    ? "bg-[#f59e0b]/10 border-[#f59e0b]/25 text-[#f59e0b]"
                    : "bg-white/[0.01] border-white/[0.04] text-white/25 hover:text-white/50 hover:bg-white/[0.03]"
                }`}>
                <Icon size={13} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Provider strip */}
        {providers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-black text-white/10 uppercase tracking-[0.15em]">Filter by Provider</h3>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              <button onClick={() => handleProviderSelect("all")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-bold transition-all flex-shrink-0 ${
                selectedProvider === "all" ? "bg-[#f59e0b]/10 border-[#f59e0b]/25 text-[#f59e0b]" : "bg-white/[0.015] border-white/[0.04] text-white/25 hover:text-white/50"
              }`}>
                <LayoutGrid size={12} /> All
              </button>
              {providers.slice(0, 20).map((p) => (
                <ProviderPill key={p.provider} provider={p} selected={selectedProvider === p.provider} onClick={() => handleProviderSelect(p.provider)} />
              ))}
            </div>
          </div>
        )}

        {/* Results header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-black text-white/80">
              {searchQuery ? `Results for "${searchQuery}"` : CATEGORIES.find((c) => c.key === selectedCategory)?.label || "All Games"}
            </h2>
            {!loading && <span className="text-[10px] font-bold text-white/15 bg-white/[0.03] px-2 py-0.5 rounded-full">{totalGames} games</span>}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && games.length === 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl skeleton" />
            ))}
          </div>
        )}

        {/* Game grid */}
        {games.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5">
            {games.map((game, i) => (
              <GameCard key={game.id || game.gameCode || i} game={game} onPlay={handleGameLaunch} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && games.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-3xl"><IoGameController size={28} className="text-white/15" /></div>
            <div className="text-center">
              <p className="text-white/50 font-bold text-sm">No games found</p>
              <p className="text-white/15 text-xs mt-1">Try adjusting your filters or search term</p>
            </div>
            <button onClick={() => { setSearchQuery(""); handleCategoryChange("all"); handleProviderSelect("all"); }}
              className="text-[10px] font-bold text-[#f59e0b] hover:text-[#f59e0b]/80 transition-colors">
              Clear all filters
            </button>
          </div>
        )}

        {/* Load more */}
        {hasMore && games.length > 0 && !loading && (
          <div className="flex justify-center pt-4">
            <button onClick={loadMore} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.05] text-[12px] font-bold transition-all">
              Load more games <ArrowRight size={12} />
            </button>
          </div>
        )}

        {loading && games.length > 0 && (
          <div className="flex justify-center py-4">
            <Loader2 size={20} className="text-[#f59e0b] animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}

/* ═══ EXPORT ═══ */
export default function CasinoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f59e0b]" />
      </div>
    }>
      <CasinoContent />
    </Suspense>
  );
}
