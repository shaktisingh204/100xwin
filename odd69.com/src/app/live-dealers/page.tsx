"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, X, Play, Gamepad2, Loader2, ArrowRight,
  LayoutGrid, Radio, Sparkles, Gem, Dice1, Spade,
  Tv, Coffee, Circle, PlayCircle,
} from "lucide-react";
import { casinoService } from "@/services/casino";
import { useAuth } from "@/context/AuthContext";
import GamePlayInterface from "@/components/casino/GamePlayInterface";
import { GiPokerHand } from "react-icons/gi";
import { BiErrorAlt } from "react-icons/bi";

/* ═════════════════════════════════════════════════════════════════════
   LIVE CATEGORIES — expanded from newwebsite IA
   ═════════════════════════════════════════════════════════════════════ */
const CATEGORIES = [
  { key: "all",              label: "All Live",   Icon: LayoutGrid },
  { key: "live_roulette",    label: "Roulette",   Icon: Radio },
  { key: "live_blackjack",   label: "Blackjack",  Icon: Spade },
  { key: "live_baccarat",    label: "Baccarat",   Icon: Gem },
  { key: "live_poker",       label: "Poker",      Icon: Dice1 },
  { key: "live_game_shows",  label: "Game Shows", Icon: Sparkles },
];

/* Lobby "rooms" — decorative grouping for the hero section */
const LIVE_ROOMS = [
  { key: "live_roulette",   label: "Roulette Room",  Icon: Radio,     chip: "chip-crimson" as const, copy: "Wheels spinning now." },
  { key: "live_blackjack",  label: "Blackjack Pit",  Icon: Spade,     chip: "chip-gold"    as const, copy: "Seats open at every limit." },
  { key: "live_baccarat",   label: "Baccarat Salon", Icon: Coffee,    chip: "chip-violet"  as const, copy: "High-limit tables warm." },
  { key: "live_game_shows", label: "Game Shows",     Icon: Tv,        chip: "chip-ice"     as const, copy: "Wheel of fortunes turning." },
];

/* ═════════════════════════════════════════════════════════════════════
   LIVE GAME CARD
   ═════════════════════════════════════════════════════════════════════ */
function LiveGameCard({ game, onPlay }: { game: any; onPlay: (g: any) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const src = game.image || game.banner || "";

  return (
    <button
      onClick={() => onPlay(game)}
      className="group text-left focus:outline-none"
    >
      <div className="relative aspect-[4/3] rounded-[16px] overflow-hidden border border-[var(--line-default)] group-hover:border-[color:var(--emerald)]/35 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_14px_40px_rgba(0,216,123,0.15)] bg-[var(--bg-surface)]">
        {!imgErr && src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={game.name}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-base)]">
            <GiPokerHand size={28} className="text-[var(--ink-whisper)]" />
          </div>
        )}

        {/* Live chip */}
        <div className="absolute top-2 left-2 z-10">
          <span className="chip chip-crimson !py-0.5 !px-2 !text-[9px]">
            <Circle size={6} fill="currentColor" className="animate-live-dot" />
            Live
          </span>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Hover play */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="grid place-items-center w-11 h-11 rounded-full bg-[var(--emerald-soft)] border border-[color:var(--emerald)]/35 backdrop-blur">
            <Play size={15} className="text-[var(--emerald)] ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          {game.provider && (
            <span className="t-eyebrow !text-[8.5px] !text-[var(--ink-whisper)] block mb-0.5">
              {(game.provider || "").slice(0, 15)}
            </span>
          )}
          <p className="text-[12px] font-semibold text-[var(--ink)] truncate leading-tight">
            {game.name || "Live Game"}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   MAIN CONTENT
   ═════════════════════════════════════════════════════════════════════ */
function LiveCasinoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "all";

  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalGames, setTotalGames] = useState(0);

  const [activeGame, setActiveGame] = useState<{ id: string; name: string; provider: string; url: string } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => { setSelectedCategory(categoryParam); setPage(1); }, [categoryParam]);

  /* Load providers (live) */
  useEffect(() => {
    casinoService.getProviders("live")
      .then((data: any[]) => setProviders(data))
      .catch(() => {});
  }, []);

  /* Load games — always pass type=live */
  const loadGames = useCallback(async (p: number, append = false) => {
    setLoading(true);
    try {
      const cat = selectedCategory === "all" ? "live" : selectedCategory;
      const prov = selectedProvider === "all" ? undefined : selectedProvider;
      const search = searchQuery || undefined;
      const res = await casinoService.getGames(prov, cat, search, p, 40, "live");
      const newGames = res.games || [];
      setGames((prev) => (append ? [...prev, ...newGames] : newGames));
      setTotalGames(res.totalCount || newGames.length);
      setHasMore(newGames.length >= 40);
    } catch { setGames([]); }
    finally { setLoading(false); }
  }, [selectedCategory, selectedProvider, searchQuery]);

  useEffect(() => { loadGames(1); }, [loadGames]);

  const loadMore = () => { const next = page + 1; setPage(next); loadGames(next, true); };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSearchQuery("");
    setPage(1);
    const params = new URLSearchParams();
    if (cat !== "all") params.set("category", cat);
    router.replace(params.toString() ? `/live-dealers?${params.toString()}` : "/live-dealers", { scroll: false });
  };

  const handleProviderSelect = (prov: string) => {
    setSelectedProvider(prov);
    setSearchQuery("");
    setPage(1);
  };

  /* Launch */
  const handleGameLaunch = async (gameData: any) => {
    if (gameData.url) {
      setActiveGame({
        id: gameData.gameCode || gameData.id || "",
        name: gameData.name || gameData.gameName || "",
        provider: gameData.providerCode || gameData.provider || "",
        url: gameData.url,
      });
      return;
    }
    if (!user) { alert("Please login to play"); return; }
    const providerCode = gameData.providerCode || gameData.provider;
    const gameId = gameData.gameCode || gameData.id;
    if (!providerCode || !gameId) { setLaunchError("Game data is incomplete."); return; }

    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await casinoService.launchGame({
        username: user.username,
        provider: providerCode,
        gameId,
        isLobby: false,
      });
      if (res?.url) {
        setActiveGame({
          id: gameId,
          name: gameData.name || gameData.gameName || "",
          provider: providerCode,
          url: res.url,
        });
      } else {
        setLaunchError("Could not get game URL.");
      }
    } catch (error: unknown) {
      setLaunchError(error instanceof Error ? error.message : "Failed to launch game.");
    } finally {
      setLaunching(false);
    }
  };

  const activeLabel =
    CATEGORIES.find((c) => c.key === selectedCategory)?.label || "All Live";

  return (
    <>
      {/* ── Launching overlay ── */}
      {launching && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border-2 border-[color:var(--emerald)]/20 border-t-[var(--emerald)] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <GiPokerHand size={22} className="text-[var(--emerald)]" />
            </div>
          </div>
          <p className="t-eyebrow !text-[11px] text-[var(--ink-dim)] animate-pulse">Joining live table…</p>
        </div>
      )}

      {/* ── Launch error overlay ── */}
      {launchError && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-5 px-6">
          <div className="w-16 h-16 rounded-[16px] bg-[var(--crimson-soft)] border border-[color:var(--crimson)]/25 flex items-center justify-center">
            <BiErrorAlt size={28} className="text-[var(--crimson)]" />
          </div>
          <div className="text-center">
            <h2 className="font-display text-[18px] font-bold text-[var(--ink)] mb-1">Unable to Join</h2>
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
        <section className="page-x">
          <div className="relative overflow-hidden rounded-[22px] border border-[color:var(--emerald)]/20 bg-[var(--bg-surface)] grain dotgrid p-6 md:p-10">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 800px 400px at 15% 20%, rgba(0, 216, 123, 0.10), transparent 60%), radial-gradient(ellipse 600px 300px at 85% 80%, rgba(245, 183, 10, 0.08), transparent 60%)",
              }}
            />
            <div className="relative z-10 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="chip chip-crimson">
                  <Circle size={6} fill="currentColor" className="animate-live-dot" />
                  Live Now
                </span>
                <span className="chip chip-emerald">Real Dealers</span>
                <span className="chip chip-gold">HD Stream</span>
              </div>
              <h1 className="font-display text-[34px] md:text-[52px] font-extrabold leading-[0.95] tracking-[-0.03em] text-[var(--ink)] mb-3">
                The <span className="text-gold-grad">Live Floor</span>.<br />
                Real cards. Real dealers.
              </h1>
              <p className="text-[14px] text-[var(--ink-dim)] max-w-lg">
                Pull up a chair. Every table is streamed from a real studio in real time — the closest you get to a casino floor without leaving the armchair.
              </p>
            </div>

            {/* Room cards */}
            <div className="relative z-10 mt-6 grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {LIVE_ROOMS.map(({ key, label, Icon, chip, copy }) => (
                <button
                  key={key}
                  onClick={() => handleCategoryChange(key)}
                  className="group text-left rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-elevated)] p-3 hover:border-[var(--line-gold)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="grid place-items-center w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--line-default)] text-[var(--ink-dim)] group-hover:text-[var(--gold-bright)]">
                      <Icon size={14} />
                    </div>
                    <span className={`chip ${chip} !py-0.5 !px-1.5 !text-[9px]`}>Open</span>
                  </div>
                  <p className="font-display text-[13px] font-semibold text-[var(--ink)] leading-tight">{label}</p>
                  <p className="text-[10.5px] text-[var(--ink-faint)] mt-0.5">{copy}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── SEARCH ── */}
        <section className="page-x">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" size={16} />
            <input
              type="text"
              placeholder="Search live games…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-[var(--bg-surface)] border border-[var(--line-default)] focus:border-[color:var(--emerald)]/35 text-[var(--ink)] rounded-[14px] py-3 pl-11 pr-10 outline-none text-[14px] placeholder:text-[var(--ink-faint)] transition-colors"
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

        {/* ── CATEGORY TABS ── */}
        <section className="page-x">
          <div className="mb-3 rail-gold">
            <span className="t-eyebrow">Tables</span>
            <h2 className="t-section mt-1">Choose your table</h2>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(({ key, label, Icon }) => {
              const active = selectedCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => handleCategoryChange(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border text-[11px] font-semibold transition-all flex-shrink-0 ${
                    active
                      ? "bg-[var(--emerald-soft)] border-[color:var(--emerald)]/30 text-[var(--emerald)]"
                      : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              );
            })}
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
                    ? "bg-[var(--emerald-soft)] border-[color:var(--emerald)]/30 text-[var(--emerald)]"
                    : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)]"
                }`}
              >
                <LayoutGrid size={12} /> All
              </button>
              {providers.slice(0, 24).map((p) => (
                <button
                  key={p.provider}
                  onClick={() => handleProviderSelect(p.provider)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-[10px] border text-[11px] font-semibold transition-all flex-shrink-0 whitespace-nowrap ${
                    selectedProvider === p.provider
                      ? "bg-[var(--emerald-soft)] border-[color:var(--emerald)]/30 text-[var(--emerald)]"
                      : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
                  }`}
                >
                  {p.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logo} alt={p.provider} className="w-4 h-4 rounded object-contain opacity-70" />
                  ) : (
                    <Gamepad2 size={12} />
                  )}
                  <span className="capitalize">{p.provider}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── RESULTS ── */}
        <section className="page-x">
          <div className="flex items-end justify-between mb-4">
            <div className="rail-gold">
              <span className="t-eyebrow">Now dealing</span>
              <h2 className="t-section mt-1">
                {searchQuery ? `Results for "${searchQuery}"` : activeLabel}
              </h2>
              <p className="t-section-sub">
                <span className="num">{totalGames}</span> tables streaming
              </p>
            </div>
            {!loading && totalGames > 0 && (
              <span className="chip chip-emerald">
                <Circle size={6} fill="currentColor" className="animate-live-dot" />
                <span className="num">{totalGames}</span> tables
              </span>
            )}
          </div>

          {/* Skeleton */}
          {loading && games.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-[16px] skeleton" />
              ))}
            </div>
          )}

          {/* Grid */}
          {games.length > 0 && (
            <div className="stagger grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {games.map((game, i) => (
                <LiveGameCard
                  key={(game.id || game.gameCode || "g") + i}
                  game={game}
                  onPlay={handleGameLaunch}
                />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && games.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)]">
              <div className="w-16 h-16 rounded-[16px] bg-[var(--bg-elevated)] border border-[var(--line-default)] flex items-center justify-center">
                <GiPokerHand size={28} className="text-[var(--ink-faint)]" />
              </div>
              <div className="text-center">
                <p className="font-display text-[16px] font-semibold text-[var(--ink)]">No live games found</p>
                <p className="text-[12px] text-[var(--ink-faint)] mt-1">Try adjusting your filters or search</p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  handleCategoryChange("all");
                  handleProviderSelect("all");
                }}
                className="chip chip-emerald !py-1.5 !px-3"
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
              <Loader2 size={20} className="text-[var(--emerald)] animate-spin" />
            </div>
          )}
        </section>

        {/* ── WHY LIVE ── */}
        <section className="page-x">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">Why live</span>
            <h2 className="t-section mt-1">Why our live floor</h2>
            <p className="t-section-sub">Real dealers, audited streams, instant cashouts.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { Icon: PlayCircle, title: "HD studios",      copy: "Multi-camera 1080p streams from licensed studios with under one second of latency." },
              { Icon: Spade,      title: "Real dealers",    copy: "Trained pit crews handle every deal, spin and shuffle — no RNG behind the curtain." },
              { Icon: Gem,        title: "Instant payout",  copy: "Win a hand, the balance moves in the same second. Cash out anytime, no waiting." },
            ].map(({ Icon, title, copy }) => (
              <div
                key={title}
                className="relative overflow-hidden rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] grain p-5 hover:border-[var(--line-gold)] transition-all"
              >
                <div className="relative z-10">
                  <div className="grid place-items-center w-10 h-10 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--gold-line)] text-[var(--gold-bright)] mb-3">
                    <Icon size={16} />
                  </div>
                  <h3 className="font-display text-[15px] font-semibold text-[var(--ink)] mb-1">{title}</h3>
                  <p className="text-[12.5px] text-[var(--ink-dim)] leading-relaxed">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export default function LiveDealersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--emerald)]" />
        </div>
      }
    >
      <LiveCasinoContent />
    </Suspense>
  );
}
