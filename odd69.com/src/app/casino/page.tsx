"use client";

import React, { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search, X, Flame, Star, Sparkles, Rocket, Play, Gamepad2,
  Loader2, ArrowRight, Zap, LayoutGrid, Dice5, Tickets, CircleDot,
  Target, Fish, Drama, Trophy, ChevronRight, House,
} from "lucide-react";
import { IoGameController } from "react-icons/io5";
import { BiErrorAlt } from "react-icons/bi";
import { casinoService } from "@/services/casino";
import { useAuth } from "@/context/AuthContext";
import GamePlayInterface from "@/components/casino/GamePlayInterface";

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
interface LaunchableGame {
  id?: string; name?: string; gameName?: string;
  provider?: string; providerCode?: string; gameCode?: string;
  image?: string; banner?: string; url?: string; tag?: string;
}

/* ═════════════════════════════════════════════════════════════════════
   CATEGORY RAIL — pulled from newwebsite's richer lobby taxonomy
   ═════════════════════════════════════════════════════════════════════ */
const CASINO_RAIL = [
  { key: "all",       label: "Lobby",       Icon: House },
  { key: "popular",   label: "Hot Games",   Icon: Flame },
  { key: "slots",     label: "Slots",       Icon: Tickets },
  { key: "live",      label: "Live",        Icon: Star },
  { key: "table",     label: "Table",       Icon: Dice5 },
  { key: "crash",     label: "Crash",       Icon: Rocket },
  { key: "new",       label: "New",         Icon: Sparkles },
  { key: "top-slots", label: "Top Slots",   Icon: Target },
  { key: "fishing",   label: "Fishing",     Icon: Fish },
  { key: "blackjack", label: "Blackjack",   Icon: Drama },
  { key: "roulette",  label: "Roulette",    Icon: CircleDot },
  { key: "baccarat",  label: "Baccarat",    Icon: Trophy },
  { key: "exclusive", label: "Exclusive",   Icon: Zap },
];

/* ═════════════════════════════════════════════════════════════════════
   GAME CARD — gold-leaf theme
   ═════════════════════════════════════════════════════════════════════ */
function GameCard({ game, onPlay }: { game: LaunchableGame; onPlay: (g: LaunchableGame) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const src = game.image || game.banner || "";

  return (
    <button
      onClick={() => onPlay(game)}
      className="group text-left focus:outline-none"
    >
      <div className="relative aspect-[3/4] rounded-[16px] overflow-hidden border border-[var(--line-default)] group-hover:border-[var(--line-gold)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)] bg-[var(--bg-surface)]">
        {!imgErr && src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={game.name || "Game"}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-base)]">
            <IoGameController size={28} className="text-[var(--ink-whisper)]" />
          </div>
        )}

        {/* Bottom gradient for legibility */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

        {/* Hover play token */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="grid place-items-center w-11 h-11 rounded-full bg-gold-grad shadow-[0_8px_24px_var(--gold-halo)] ring-1 ring-inset ring-white/40">
            <Play size={15} className="text-[#120c00] ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Tag */}
        {game.tag && (
          <div className="absolute top-2 left-2 z-10">
            <span className="chip chip-gold !py-0.5 !px-2 !text-[9px]">{game.tag}</span>
          </div>
        )}

        {/* Meta */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          {game.provider && (
            <span className="t-eyebrow !text-[8.5px] !text-[var(--ink-whisper)] block mb-0.5">
              {(game.provider || "").slice(0, 14)}
            </span>
          )}
          <p className="text-[12px] font-semibold text-[var(--ink)] truncate leading-tight">
            {game.name || "Game"}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   PROVIDER PILL
   ═════════════════════════════════════════════════════════════════════ */
function ProviderPill({ provider, selected, onClick }: { provider: { provider: string; logo?: string }; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-[10px] border text-[11px] font-semibold transition-all flex-shrink-0 whitespace-nowrap ${
        selected
          ? "bg-[var(--gold-soft)] border-[var(--gold-line)] text-[var(--gold-bright)]"
          : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
      }`}
    >
      {provider.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={provider.logo} alt={provider.provider} className="w-4 h-4 rounded object-contain opacity-70" />
      ) : (
        <Gamepad2 size={12} />
      )}
      <span className="capitalize">{provider.provider}</span>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   MAIN CONTENT
   ═════════════════════════════════════════════════════════════════════ */
function CasinoContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "all";
  const providerParam = searchParams.get("provider") || "all";

  const { user } = useAuth();
  const [games, setGames] = useState<LaunchableGame[]>([]);
  const [providers, setProviders] = useState<{ provider: string; logo?: string }[]>([]);
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

  /* Sync URL params */
  useEffect(() => { setSelectedCategory(categoryParam); setPage(1); }, [categoryParam]);
  useEffect(() => { setSelectedProvider(providerParam); setPage(1); }, [providerParam]);

  /* Load providers */
  useEffect(() => {
    casinoService.getProviders()
      .then((data: { provider: string; logo?: string }[]) => setProviders(data))
      .catch(() => {});
  }, []);

  /* Load games */
  const loadGames = useCallback(async (p: number, append = false) => {
    setLoading(true);
    try {
      const cat = selectedCategory === "all" ? undefined : selectedCategory;
      const prov = selectedProvider === "all" ? undefined : selectedProvider;
      const search = searchQuery || undefined;
      const res = await casinoService.getGames(prov, cat, search, p, 40);
      const newGames: LaunchableGame[] = res.games || [];
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

  /* Launch */
  const handleGameLaunch = async (gameData: LaunchableGame) => {
    if (gameData.url) {
      setActiveGame({
        id: gameData.gameCode || gameData.id || "",
        name: gameData.name || gameData.gameName || "",
        provider: gameData.providerCode || gameData.provider || "",
        url: gameData.url,
      });
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
        setActiveGame({
          id: gameId,
          name: gameData.name || gameData.gameName || "",
          provider: providerCode,
          url: res.url,
        });
      } else { setLaunchError("Could not get game URL."); }
    } catch (error: unknown) {
      setLaunchError(error instanceof Error ? error.message : "Failed to launch game.");
    } finally { setLaunching(false); }
  };

  const activeCat = CASINO_RAIL.find((c) => c.key === selectedCategory);
  const showingLobby = selectedCategory === "all" && selectedProvider === "all" && !searchQuery;

  /* Feature tiles for hero rail */
  const featureTiles = useMemo(() => ([
    { key: "popular", label: "Hot Now",   Icon: Flame,     chip: "chip-crimson" },
    { key: "slots",   label: "Slot Floor",Icon: Tickets,   chip: "chip-gold" },
    { key: "live",    label: "Live Room", Icon: Star,      chip: "chip-emerald" },
    { key: "crash",   label: "Crash Pit", Icon: Rocket,    chip: "chip-violet" },
  ]), []);

  return (
    <>
      {/* ── Launching overlay ── */}
      {launching && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border-2 border-[var(--gold-line)] border-t-[var(--gold)] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <IoGameController size={22} className="text-[var(--gold)]" />
            </div>
          </div>
          <p className="t-eyebrow !text-[11px] text-[var(--ink-dim)] animate-pulse">Launching game…</p>
        </div>
      )}

      {/* ── Launch error overlay ── */}
      {launchError && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-5 px-6">
          <div className="w-16 h-16 rounded-[16px] bg-[var(--crimson-soft)] border border-[color:var(--crimson)]/25 flex items-center justify-center">
            <BiErrorAlt size={28} className="text-[var(--crimson)]" />
          </div>
          <div className="text-center">
            <h2 className="font-display text-[18px] font-bold text-[var(--ink)] mb-1">Unable to Launch</h2>
            <p className="text-[13px] text-[var(--ink-faint)]">{launchError}</p>
          </div>
          <button
            onClick={() => setLaunchError(null)}
            className="btn btn-ghost h-9 uppercase tracking-[0.06em] text-[11px]"
          >
            <X size={14} /> Close
          </button>
        </div>
      )}

      {/* ── Game overlay ── */}
      {activeGame && (
        <div className="fixed inset-0 z-[500] bg-[var(--bg-base)] flex flex-col">
          <GamePlayInterface game={activeGame} onClose={() => setActiveGame(null)} isEmbedded={false} key={activeGame.id} />
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="max-w-[1680px] mx-auto py-6 space-y-10 md:space-y-12">

        {/* ── HERO ── */}
        {showingLobby && (
          <section className="page-x">
            <div className="relative overflow-hidden rounded-[22px] border border-[var(--gold-line)] bg-gold-soft grain dotgrid p-6 md:p-10">
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="chip chip-gold">
                    <Sparkles size={10} /> Casino Floor
                  </span>
                  <span className="chip chip-emerald">
                    <span className="num">1200+</span> Games
                  </span>
                </div>
                <h1 className="font-display text-[34px] md:text-[52px] font-extrabold leading-[0.95] tracking-[-0.03em] text-[var(--ink)] mb-3">
                  The <span className="text-gold-grad">Gold Room</span>.<br />
                  Spin, deal, crash.
                </h1>
                <p className="text-[14px] text-[var(--ink-dim)] max-w-lg mb-5">
                  Slots, live tables, crash rails and originals — every tile audited, every payout instant.
                </p>

                <div className="flex flex-wrap gap-2">
                  {featureTiles.map(({ key, label, Icon, chip }) => (
                    <button
                      key={key}
                      onClick={() => handleCategoryChange(key)}
                      className={`chip ${chip} !py-2 !px-3 hover:opacity-90 transition-opacity`}
                    >
                      <Icon size={11} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* floating glint */}
              <div className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-[radial-gradient(circle,var(--gold-halo),transparent_70%)] blur-2xl pointer-events-none" />
            </div>
          </section>
        )}

        {/* ── SEARCH ── */}
        <section className="page-x">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search 1200+ games…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-[var(--bg-surface)] border border-[var(--line-default)] focus:border-[var(--line-gold)] text-[var(--ink)] rounded-[14px] py-3 pl-11 pr-10 outline-none text-[14px] placeholder:text-[var(--ink-faint)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </section>

        {/* ── CATEGORY RAIL ── */}
        <section className="page-x">
          <div className="mb-3 rail-gold">
            <span className="t-eyebrow">Browse</span>
            <h2 className="t-section mt-1">Categories</h2>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CASINO_RAIL.map(({ key, label, Icon }) => {
              const active = selectedCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => handleCategoryChange(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[11px] font-semibold transition-all border ${
                    active
                      ? "bg-[var(--gold-soft)] border-[var(--gold-line)] text-[var(--gold-bright)]"
                      : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
                  }`}
                >
                  <Icon size={13} className={active ? "text-[var(--gold-bright)]" : "text-[var(--ink-faint)]"} />
                  {label}
                </button>
              );
            })}
            <div className="ml-auto hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bg-surface)] border border-[var(--line-default)] text-[var(--ink-faint)]">
              <ChevronRight size={15} />
            </div>
          </div>
        </section>

        {/* ── PROVIDER STRIP ── */}
        {providers.length > 0 && (
          <section className="page-x">
            <div className="flex items-end justify-between mb-3">
              <div className="rail-gold">
                <span className="t-eyebrow">Studios</span>
                <h2 className="t-section mt-1">By Provider</h2>
              </div>
              {selectedProvider !== "all" && (
                <button
                  onClick={() => handleProviderSelect("all")}
                  className="chip !py-1.5 !px-3 hover:border-[var(--line-strong)]"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => handleProviderSelect("all")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] border text-[11px] font-semibold transition-all flex-shrink-0 ${
                  selectedProvider === "all"
                    ? "bg-[var(--gold-soft)] border-[var(--gold-line)] text-[var(--gold-bright)]"
                    : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)]"
                }`}
              >
                <LayoutGrid size={12} /> All
              </button>
              {providers.slice(0, 24).map((p) => (
                <ProviderPill
                  key={p.provider}
                  provider={p}
                  selected={selectedProvider === p.provider}
                  onClick={() => handleProviderSelect(p.provider)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── RESULTS HEADER ── */}
        <section className="page-x">
          <div className="flex items-end justify-between mb-4">
            <div className="rail-gold">
              <span className="t-eyebrow">Games</span>
              <h2 className="t-section mt-1">
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : activeCat?.label || "All Games"}
              </h2>
              <p className="t-section-sub">
                <span className="num">{totalGames}</span> tiles ready to play
              </p>
            </div>
            {!loading && totalGames > 0 && (
              <span className="chip chip-gold">
                <span className="num">{totalGames}</span> games
              </span>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && games.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-[16px] skeleton" />
              ))}
            </div>
          )}

          {/* Game grid */}
          {games.length > 0 && (
            <div className="stagger grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5">
              {games.map((game, i) => (
                <GameCard
                  key={(game.id || game.gameCode || "g") + i}
                  game={game}
                  onPlay={handleGameLaunch}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && games.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)]">
              <div className="w-16 h-16 rounded-[16px] bg-[var(--bg-elevated)] border border-[var(--line-default)] flex items-center justify-center">
                <IoGameController size={28} className="text-[var(--ink-faint)]" />
              </div>
              <div className="text-center">
                <p className="font-display text-[16px] font-semibold text-[var(--ink)]">No games found</p>
                <p className="text-[12px] text-[var(--ink-faint)] mt-1">Try adjusting your filters or search term</p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  handleCategoryChange("all");
                  handleProviderSelect("all");
                }}
                className="chip chip-gold !py-1.5 !px-3"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Load more */}
          {hasMore && games.length > 0 && !loading && (
            <div className="flex justify-center pt-6">
              <button
                onClick={loadMore}
                className="btn btn-ghost h-10 uppercase tracking-[0.06em] text-[11px]"
              >
                Load more games <ArrowRight size={12} />
              </button>
            </div>
          )}

          {loading && games.length > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="text-[var(--gold)] animate-spin" />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   EXPORT
   ═════════════════════════════════════════════════════════════════════ */
export default function CasinoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)]" />
        </div>
      }
    >
      <CasinoContent />
    </Suspense>
  );
}
