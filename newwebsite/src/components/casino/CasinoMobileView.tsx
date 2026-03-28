'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, ChevronRight, Gamepad2, Grid3X3, Layers, Play } from 'lucide-react';
import { IoFlame, IoDiamond, IoSparkles, IoGrid } from 'react-icons/io5';
import { MdCasino, MdTableBar } from 'react-icons/md';
import { GiPokerHand, GiBattleship } from 'react-icons/gi';
import { casinoService } from '@/services/casino';
import Link from 'next/link';
import ProviderLogo from './ProviderLogo';

// ─── Category metadata — matches mobile app exactly ───────────────────────────
const CAT_META: Record<string, { Icon: React.ElementType; gradient: string; iconColor: string; label: string }> = {
    popular:   { Icon: IoFlame,          gradient: 'from-orange-600 to-red-700',    iconColor: '#f97316', label: 'POPULAR'   },
    slots:     { Icon: IoDiamond,         gradient: 'from-purple-600 to-violet-700', iconColor: '#a855f7', label: 'SLOTS'     },
    live:      { Icon: MdCasino,          gradient: 'from-red-600 to-rose-700',      iconColor: '#ef4444', label: 'LIVE'      },
    table:     { Icon: MdTableBar,        gradient: 'from-sky-600 to-blue-700',      iconColor: '#38bdf8', label: 'TABLE'     },
    crash:     { Icon: IoSparkles,        gradient: 'from-amber-500 to-yellow-600',  iconColor: '#f59e0b', label: 'CRASH'     },
    new:       { Icon: IoSparkles,        gradient: 'from-teal-500 to-cyan-600',     iconColor: '#2dd4bf', label: 'NEW'       },
    fishing:   { Icon: GiBattleship,     gradient: 'from-cyan-600 to-sky-700',      iconColor: '#06b6d4', label: 'FISHING'   },
    instant:   { Icon: IoFlame,           gradient: 'from-yellow-500 to-amber-600',  iconColor: '#eab308', label: 'INSTANT'   },
    virtual:   { Icon: Gamepad2,          gradient: 'from-violet-600 to-purple-700', iconColor: '#8b5cf6', label: 'VIRTUAL'   },
    lottery:   { Icon: Grid3X3,           gradient: 'from-pink-500 to-rose-600',     iconColor: '#ec4899', label: 'LOTTERY'   },
    poker:     { Icon: GiPokerHand,       gradient: 'from-teal-600 to-green-700',    iconColor: '#14b8a6', label: 'POKER'     },
    bingo:     { Icon: Grid3X3,           gradient: 'from-pink-400 to-fuchsia-600',  iconColor: '#f472b6', label: 'BINGO'     },
    jackpot:   { Icon: IoFlame,           gradient: 'from-amber-400 to-orange-600',  iconColor: '#fbbf24', label: 'JACKPOT'   },
};

const FALLBACK_GRADIENTS = [
    'from-rose-600 to-pink-700', 'from-violet-600 to-indigo-700', 'from-sky-600 to-blue-700',
    'from-fuchsia-600 to-purple-700', 'from-emerald-600 to-green-700', 'from-orange-600 to-amber-700',
];

const getCatMeta = (cat: string, idx = 0) => {
    const key = cat.toLowerCase();
    return CAT_META[key] ?? {
        Icon: Grid3X3,
        gradient: FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length],
        iconColor: '#94a3b8',
        label: cat.toUpperCase(),
    };
};

const FEATURED = ['popular', 'slots', 'live', 'table', 'crash', 'new'];
const PROVIDER_PREVIEW_LIMIT = 8;
const getImg = (g: any) => {
    const img = g.banner || g.image;
    if (!img) return null;
    return img.startsWith('http') ? img : `https://zeero.bet${img}`;
};

// ─── Shimmer skeleton ──────────────────────────────────────────────────────────
function ShimmerRow() {
    return (
        <div className="mt-5">
            <div className="flex items-center justify-between px-3 mb-2.5">
                <div className="h-4 w-24 bg-white/6 rounded animate-pulse" />
                <div className="h-5 w-14 bg-white/4 rounded-lg animate-pulse" />
            </div>
            <div className="flex gap-2.5 px-3 overflow-hidden">
                {[1,2,3,4].map(i => (
                    <div key={i} className="flex-shrink-0 w-28 aspect-[3/4] bg-white/6 rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    );
}

// ─── Individual game card ──────────────────────────────────────────────────────
function GameThumb({ game, onLaunch, loading }: { game: any; onLaunch: (g: any) => void; loading: boolean }) {
    const url = getImg(game);
    const isLoading = loading;
    return (
        <button
            onClick={() => onLaunch(game)}
            className="flex-shrink-0 w-28 relative rounded-xl overflow-hidden bg-[#1a1d21] aspect-[3/4] group"
            style={{ aspectRatio: '3/4' }}
        >
            {url ? (
                <img src={url} alt={game.gameName || game.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1a1d21]">
                    <Gamepad2 size={24} className="text-white/10" />
                </div>
            )}
            {/* gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            {/* play icon top-right */}
            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={8} className="text-white ml-0.5" />
            </div>
            {/* loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-[8px] text-white/70 font-bold">Loading...</span>
                </div>
            )}
            {/* name + provider at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <p className="text-white text-[9px] font-bold truncate leading-tight">{game.gameName || game.name}</p>
                <p className="text-white/40 text-[7px] uppercase font-bold tracking-wider truncate">{game.provider || game.providerCode}</p>
            </div>
        </button>
    );
}

// ─── Horizontal section row ────────────────────────────────────────────────────
function HorizontalRow({ cat, onLaunch, onViewAll, hideHeader }: { cat: string; onLaunch: (g: any) => void; onViewAll: (cat: string) => void; hideHeader?: boolean }) {
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
    const meta = getCatMeta(cat);

    useEffect(() => {
        setLoading(true);
        casinoService.getGames(undefined, cat === 'popular' ? undefined : cat, undefined, 1, 14, 'casino')
            .then(r => setGames(r.games || []))
            .catch(() => setGames([]))
            .finally(() => setLoading(false));
    }, [cat]);

    if (loading) return <ShimmerRow />;
    if (games.length === 0) return null;

    const handleLaunch = async (game: any) => {
        const gid = game.id || game.gameCode || '';
        setLoadingGameId(gid);
        try { await onLaunch(game); } finally { setLoadingGameId(null); }
    };

    const SIcon = meta.Icon;

    return (
        <div className="mt-5">
            {/* Section header — hidden when a specific pill is active (pill is already the header) */}
            {!hideHeader && (
                <div className="flex items-center justify-between px-3 mb-2.5">
                    <div className="flex items-center gap-2">
                        <SIcon size={15} style={{ color: meta.iconColor }} />
                        <span className="text-white text-[13px] font-black tracking-[0.8px]">{meta.label}</span>
                        <span className="bg-white/6 text-white/30 text-[10px] font-bold px-1.5 py-0.5 rounded-lg">{games.length}</span>
                    </div>
                    <button
                        onClick={() => onViewAll(cat)}
                        className="flex items-center gap-1 bg-[#E37D32]/8 border border-[#E37D32]/15 px-2.5 py-1 rounded-lg"
                    >
                        <span className="text-[#E37D32] text-[10px] font-black">SEE ALL</span>
                        <ChevronRight size={10} className="text-[#E37D32]" />
                    </button>
                </div>
            )}
            {/* Horizontal scroll */}
            <div className="flex gap-2.5 px-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {games.map((game, i) => (
                    <GameThumb
                        key={game.id || i}
                        game={game}
                        onLaunch={handleLaunch}
                        loading={loadingGameId === (game.id || game.gameCode)}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Search result card ────────────────────────────────────────────────────────
function SearchCard({ game, onLaunch, loading }: { game: any; onLaunch: (g: any) => void; loading: boolean }) {
    const url = getImg(game);
    return (
        <button onClick={() => onLaunch(game)} className="relative rounded-xl overflow-hidden bg-[#1a1d21] aspect-[3/4] group w-full">
            {url ? (
                <img src={url} alt={game.gameName || game.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1a1d21]">
                    <Gamepad2 size={20} className="text-white/10" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            {loading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <p className="text-white text-[9px] font-bold truncate">{game.gameName || game.name}</p>
                <p className="text-white/40 text-[7px] uppercase font-bold truncate">{game.provider}</p>
            </div>
        </button>
    );
}

// ─── Main CasinoMobileView ─────────────────────────────────────────────────────
interface CasinoMobileViewProps {
    onLaunch: (game: any) => void;
    onViewAll?: (cat: string) => void;
}

export default function CasinoMobileView({ onLaunch, onViewAll }: CasinoMobileViewProps) {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
    const [providers, setProviders] = useState<any[]>([]);
    const [activeCat, setActiveCat] = useState<string | null>(null); // null = show all
    const previewProviders = providers.slice(0, PROVIDER_PREVIEW_LIMIT);

    // Fetch all providers for the grid
    useEffect(() => {
        casinoService.getProviders('casino')
            .then((provs: any) => {
                const list: any[] = Array.isArray(provs)
                    ? provs.filter(Boolean)
                    : [];
                setProviders(list);
            })
            .catch(() => setProviders([]));
    }, []);

    // Debounced search
    useEffect(() => {
        if (!search.trim()) { setSearchResults([]); setSearching(false); return; }
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const r = await casinoService.getGames(undefined, undefined, search, 1, 30, 'casino');
                setSearchResults(r.games || []);
            } catch { setSearchResults([]); }
            finally { setSearching(false); }
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const handleLaunch = async (game: any) => {
        const gid = game.id || game.gameCode || '';
        setLoadingGameId(gid);
        try { await onLaunch(game); } finally { setLoadingGameId(null); }
    };

    const handleViewAll = (cat: string) => {
        if (onViewAll) { onViewAll(cat); return; }
        // Fallback: navigate via URL
        window.location.href = `/casino?category=${cat}`;
    };

    return (
        <div className="flex flex-col bg-[#0f1114] min-h-full pb-24">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5 bg-[#15171b] border-b border-white/[0.04]">
                <div className="w-8 h-8 rounded-[10px] bg-[#E37D32]/10 border border-[#E37D32]/20 flex items-center justify-center">
                    <Gamepad2 size={16} className="text-[#E37D32]" />
                </div>
                <h1 className="text-white text-xl font-black">Casino</h1>
            </div>

            {/* ── Banner ─────────────────────────────────────────────────── */}
            <div className="mx-2.5 mt-2.5 rounded-2xl overflow-hidden border border-purple-500/15 bg-gradient-to-br from-[#1a1221] via-[#0f0a1a] to-[#1a0a10] relative p-4">
                {/* glow */}
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-purple-500/12 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-1.5 self-start bg-purple-500/15 border border-purple-500/30 px-2 py-1 rounded-md w-fit mb-2">
                        <IoDiamond size={8} className="text-purple-400" />
                        <span className="text-purple-400 text-[9px] font-black tracking-widest">PREMIUM</span>
                    </div>
                    <h2 className="text-white text-[22px] font-black tracking-[0.5px]">Casino Games</h2>
                    <p className="text-white/40 text-xs font-medium mt-1">1000+ slots, table games &amp; live dealers</p>
                    {/* Stats */}
                    <div className="flex items-center mt-3.5 bg-black/30 rounded-xl p-3">
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-white text-base font-black">1000+</span>
                            <span className="text-white/30 text-[9px] font-semibold uppercase tracking-wider mt-0.5">Games</span>
                        </div>
                        <div className="w-px h-6 bg-white/[0.06]" />
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-white text-base font-black">50+</span>
                            <span className="text-white/30 text-[9px] font-semibold uppercase tracking-wider mt-0.5">Providers</span>
                        </div>
                        <div className="w-px h-6 bg-white/[0.06]" />
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-emerald-400 text-base font-black">Live</span>
                            <span className="text-white/30 text-[9px] font-semibold uppercase tracking-wider mt-0.5">Dealers</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Search bar ─────────────────────────────────────────────── */}
            <div className="px-2.5 mt-2.5">
                <div className={`flex items-center gap-2.5 bg-[#1a1d21] px-3.5 py-2.5 rounded-xl border ${search ? 'border-[#E37D32]/30' : 'border-white/[0.04]'} transition-colors`}>
                    <Search size={15} className={search ? 'text-[#E37D32]' : 'text-white/20'} />
                    <input
                        type="text"
                        placeholder="Search games or providers..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-white text-[13px] outline-none placeholder:text-white/20"
                    />
                    {search && (
                        <button onClick={() => setSearch('')}>
                            <X size={15} className="text-white/30" />
                        </button>
                    )}
                </div>
            </div>
            {/* ── Category Pills ───────────────────────────────── */}
            {!search.trim() && (
                <div className="px-2.5 mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {/* All pill */}
                    <button
                        onClick={() => setActiveCat(null)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-[11px] font-black tracking-wide transition-all ${
                            activeCat === null
                                ? 'bg-[#E37D32]/15 border-[#E37D32]/30 text-[#E37D32]'
                                : 'bg-white/[0.04] border-white/[0.06] text-white/40'
                        }`}
                    >
                        <IoGrid size={13} />
                        ALL
                    </button>
                    {FEATURED.map(cat => {
                        const meta = getCatMeta(cat);
                        const SIcon = meta.Icon;
                        const isActive = activeCat === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCat(isActive ? null : cat)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-[11px] font-black tracking-wide transition-all ${
                                    isActive
                                        ? 'border-transparent'
                                        : 'bg-white/[0.04] border-white/[0.06] text-white/40'
                                }`}
                                style={isActive ? { backgroundColor: meta.iconColor + '18', borderColor: meta.iconColor + '40', color: meta.iconColor } : {}}
                            >
                                <SIcon size={13} style={{ color: isActive ? meta.iconColor : undefined }} />
                                {meta.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {search.trim() ? (
                /* Search Results */
                <div className="px-3 mt-4">
                    <p className="text-white text-[13px] font-black tracking-[0.8px] mb-3">SEARCH RESULTS</p>
                    {searching ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-[#E37D32] rounded-full animate-spin" />
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="flex flex-col items-center py-16 gap-3">
                            <Search size={40} className="text-white/10" />
                            <p className="text-white/30 text-sm">No games found for &ldquo;{search}&rdquo;</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                            {searchResults.map((game, i) => (
                                <SearchCard
                                    key={game.id || i}
                                    game={game}
                                    onLaunch={handleLaunch}
                                    loading={loadingGameId === (game.id || game.gameCode)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* ── Horizontal rows for each featured section ── */}
                    {(activeCat ? FEATURED.filter(c => c === activeCat) : FEATURED).map(cat => (
                        <HorizontalRow key={cat} cat={cat} onLaunch={handleLaunch} onViewAll={handleViewAll} hideHeader={!!activeCat} />
                    ))}

                    {/* ── PROVIDERS 3-col grid ──────────────────────────────── */}
                    <div className="mt-6 px-3">
                        <div className="flex items-center gap-1.5 mb-3">
                            <IoGrid size={13} className="text-white/30" />
                            <span className="text-white/30 text-[11px] font-black tracking-widest uppercase">Top Providers</span>
                        </div>
                        {providers.length === 0 ? (
                            <div className="grid grid-cols-3 gap-1.5">
                                {Array.from({ length: 9 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-[70px] rounded-2xl bg-gradient-to-br ${FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length]} animate-pulse`}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                                {previewProviders.map((prov: any, idx: number) => {
                                    const providerCode = typeof prov === 'string'
                                        ? prov
                                        : (prov.provider || prov.code || prov.providerCode || prov.slug || prov.id || '');
                                    const name = typeof prov === 'string' ? prov : (prov.name || prov.providerName || providerCode);
                                    const gradient = FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length];
                                    return (
                                        <Link
                                            key={providerCode || idx}
                                            href={`/casino?provider=${encodeURIComponent(providerCode)}`}
                                            className={`relative h-[70px] rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-1`}
                                        >
                                            <ProviderLogo
                                                provider={{ image: prov.image, provider: providerCode, code: providerCode }}
                                                alt={name}
                                                className="w-10 h-10 object-contain drop-shadow"
                                                fallbackClassName="text-sm font-black text-white/60"
                                                fallbackText={name}
                                            />
                                            <span className="text-[7px] font-black text-white/50 tracking-widest uppercase truncate px-1 max-w-full">
                                                {name}
                                            </span>
                                        </Link>
                                    );
                                })}
                                <Link
                                    href="/casino/providers"
                                    className="relative h-[70px] rounded-2xl overflow-hidden border border-[#E37D32]/20 bg-[#E37D32]/10 flex flex-col items-center justify-center gap-1"
                                >
                                    <Layers size={18} className="text-[#E37D32]" />
                                    <span className="text-[7px] font-black text-[#E37D32] tracking-widest uppercase">
                                        All
                                    </span>
                                </Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
