'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, ChevronRight, Gamepad2, Play, Tv } from 'lucide-react';
import {
    IoFlame, IoSparkles, IoGrid,
} from 'react-icons/io5';
import {
    GiPokerHand, GiCardAceSpades, GiCardKingDiamonds,
} from 'react-icons/gi';
import { MdCasino, MdLiveTv, MdTableBar } from 'react-icons/md';
import { casinoService } from '@/services/casino';

// ─── Live Casino category metadata ────────────────────────────────────────────
const LIVE_CATS = [
    { id: 'popular',   label: 'POPULAR',    Icon: IoFlame,           iconColor: '#f97316', gradient: 'from-orange-600 to-red-700'      },
    { id: 'roulette',  label: 'ROULETTE',   Icon: MdCasino,          iconColor: '#f43f5e', gradient: 'from-rose-600 to-red-700'        },
    { id: 'blackjack', label: 'BLACKJACK',  Icon: GiCardAceSpades,   iconColor: '#60a5fa', gradient: 'from-blue-600 to-indigo-700'     },
    { id: 'baccarat',  label: 'BACCARAT',   Icon: GiCardKingDiamonds,iconColor: '#a78bfa', gradient: 'from-violet-600 to-purple-700'   },
    { id: 'gameshow',  label: 'GAME SHOW',  Icon: MdLiveTv,          iconColor: '#fbbf24', gradient: 'from-amber-500 to-yellow-600'    },
    { id: 'poker',     label: 'POKER',      Icon: GiPokerHand,       iconColor: '#34d399', gradient: 'from-teal-500 to-emerald-600'    },
    { id: 'table',     label: 'TABLE',      Icon: MdTableBar,        iconColor: '#38bdf8', gradient: 'from-sky-600 to-blue-700'        },
    { id: 'new',       label: 'NEW',        Icon: IoSparkles,        iconColor: '#2dd4bf', gradient: 'from-teal-500 to-cyan-600'       },
];

const FALLBACK_GRADIENTS = [
    'from-rose-600 to-pink-700', 'from-violet-600 to-indigo-700', 'from-sky-600 to-blue-700',
    'from-fuchsia-600 to-purple-700', 'from-emerald-600 to-green-700', 'from-orange-600 to-amber-700',
];

const getImg = (g: any) => {
    const img = g.banner || g.image;
    if (!img) return null;
    return img.startsWith('http') ? img : `https://zeero.bet${img}`;
};

// ─── Shimmer ──────────────────────────────────────────────────────────────────
function ShimmerRow() {
    return (
        <div className="mt-5">
            <div className="flex items-center justify-between px-3 mb-2.5">
                <div className="h-4 w-24 bg-white/6 rounded animate-pulse" />
                <div className="h-5 w-14 bg-white/4 rounded-lg animate-pulse" />
            </div>
            <div className="flex gap-2.5 px-3 overflow-hidden">
                {[1,2,3,4].map(i => <div key={i} className="flex-shrink-0 w-28 aspect-[3/4] bg-white/6 rounded-xl animate-pulse" />)}
            </div>
        </div>
    );
}

// ─── Game thumb ───────────────────────────────────────────────────────────────
function GameThumb({ game, onLaunch, loading }: { game: any; onLaunch: (g: any) => void; loading: boolean }) {
    const url = getImg(game);
    return (
        <button
            onClick={() => onLaunch(game)}
            className="flex-shrink-0 w-28 relative rounded-xl overflow-hidden bg-[#1a1d21] group"
            style={{ aspectRatio: '3/4' }}
        >
            {url ? (
                <img src={url} alt={game.gameName || game.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1a1d21]">
                    <Tv size={24} className="text-white/10" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={8} className="text-white ml-0.5" />
            </div>
            {loading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
            {/* LIVE badge */}
            <div className="absolute top-1.5 left-1.5 bg-red-500/90 text-white text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-widest">
                LIVE
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <p className="text-white text-[9px] font-bold truncate leading-tight">{game.gameName || game.name}</p>
                <p className="text-white/40 text-[7px] uppercase font-bold tracking-wider truncate">{game.provider || game.providerCode}</p>
            </div>
        </button>
    );
}

// ─── Horizontal game row ──────────────────────────────────────────────────────
function HorizontalRow({ cat, onLaunch, hideHeader }: { cat: typeof LIVE_CATS[0]; onLaunch: (g: any) => void; hideHeader?: boolean }) {
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingGameId, setLoadingGameId] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        casinoService.getGames(undefined, cat.id === 'popular' ? undefined : cat.id, undefined, 1, 14, 'live')
            .then(r => setGames(r.games || []))
            .catch(() => setGames([]))
            .finally(() => setLoading(false));
    }, [cat.id]);

    if (loading) return <ShimmerRow />;
    if (games.length === 0) return null;

    const handleLaunch = async (game: any) => {
        const gid = game.id || game.gameCode || '';
        setLoadingGameId(gid);
        try { await onLaunch(game); } finally { setLoadingGameId(null); }
    };

    const SIcon = cat.Icon;

    return (
        <div className="mt-5">
            {!hideHeader && (
                <div className="flex items-center justify-between px-3 mb-2.5">
                    <div className="flex items-center gap-2">
                        <SIcon size={15} style={{ color: cat.iconColor }} />
                        <span className="text-white text-[13px] font-black tracking-[0.8px]">{cat.label}</span>
                        <span className="bg-white/6 text-white/30 text-[10px] font-bold px-1.5 py-0.5 rounded-lg">{games.length}</span>
                    </div>
                    <button
                        onClick={() => window.location.href = `/live-dealers?category=${cat.id}`}
                        className="flex items-center gap-1 bg-red-500/8 border border-red-500/15 px-2.5 py-1 rounded-lg"
                    >
                        <span className="text-red-400 text-[10px] font-black">SEE ALL</span>
                        <ChevronRight size={10} className="text-red-400" />
                    </button>
                </div>
            )}
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

// ─── Search card ──────────────────────────────────────────────────────────────
function SearchCard({ game, onLaunch, loading }: { game: any; onLaunch: (g: any) => void; loading: boolean }) {
    const url = getImg(game);
    return (
        <button onClick={() => onLaunch(game)} className="relative rounded-xl overflow-hidden bg-[#1a1d21] aspect-[3/4] group w-full">
            {url ? (
                <img src={url} alt={game.gameName || game.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1a1d21]">
                    <Tv size={20} className="text-white/10" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            {loading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
            <div className="absolute top-1.5 left-1.5 bg-red-500/90 text-white text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-widest">LIVE</div>
            <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <p className="text-white text-[9px] font-bold truncate">{game.gameName || game.name}</p>
                <p className="text-white/40 text-[7px] uppercase font-bold truncate">{game.provider}</p>
            </div>
        </button>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface LiveCasinoMobileViewProps {
    onLaunch: (game: any) => void;
}

export default function LiveCasinoMobileView({ onLaunch }: LiveCasinoMobileViewProps) {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
    const [activeCat, setActiveCat] = useState<string | null>(null); // null = show all rows
    const [providers, setProviders] = useState<any[]>([]);

    // Fetch providers for the grid
    useEffect(() => {
        casinoService.getProviders('live')
            .then((provs: any) => setProviders(Array.isArray(provs) ? provs.filter(Boolean) : []))
            .catch(() => setProviders([]));
    }, []);

    // Debounced search
    useEffect(() => {
        if (!search.trim()) { setSearchResults([]); setSearching(false); return; }
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const r = await casinoService.getGames(undefined, undefined, search, 1, 30, 'live');
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

    // Which categories to show in horizontal rows
    const rowCats = activeCat
        ? LIVE_CATS.filter(c => c.id === activeCat)
        : LIVE_CATS;

    return (
        <div className="flex flex-col bg-[#0f1114] min-h-full pb-24">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5 bg-[#15171b] border-b border-white/[0.04]">
                <div className="w-8 h-8 rounded-[10px] bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <MdLiveTv size={16} className="text-red-400" />
                </div>
                <h1 className="text-white text-xl font-black">Live Casino</h1>
                {/* Live indicator */}
                <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-[9px] font-black tracking-widest">LIVE</span>
                </div>
            </div>

            {/* ── Banner ──────────────────────────────────────────────── */}
            <div className="mx-2.5 mt-2.5 rounded-2xl overflow-hidden border border-red-500/15 bg-gradient-to-br from-[#1a0809] via-[#0f0909] to-[#120a1a] relative p-4">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-red-500/8 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-1.5 self-start bg-red-500/15 border border-red-500/30 px-2 py-1 rounded-md w-fit mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400 text-[9px] font-black tracking-widest">LIVE ACTION</span>
                    </div>
                    <h2 className="text-white text-[22px] font-black tracking-[0.5px]">Live Dealers</h2>
                    <p className="text-white/40 text-xs font-medium mt-1">Real dealers, real tables, real experience</p>
                    {/* Stats */}
                    <div className="flex items-center mt-3.5 bg-black/30 rounded-xl p-3">
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-white text-base font-black">500+</span>
                            <span className="text-white/30 text-[9px] font-semibold uppercase tracking-wider mt-0.5">Tables</span>
                        </div>
                        <div className="w-px h-6 bg-white/[0.06]" />
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-white text-base font-black">30+</span>
                            <span className="text-white/30 text-[9px] font-semibold uppercase tracking-wider mt-0.5">Providers</span>
                        </div>
                        <div className="w-px h-6 bg-white/[0.06]" />
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-red-400 text-base font-black">Live</span>
                            <span className="text-white/30 text-[9px] font-semibold uppercase tracking-wider mt-0.5">24/7</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Search bar ──────────────────────────────────────────── */}
            <div className="px-2.5 mt-2.5">
                <div className={`flex items-center gap-2.5 bg-[#1a1d21] px-3.5 py-2.5 rounded-xl border ${search ? 'border-red-500/30' : 'border-white/[0.04]'} transition-colors`}>
                    <Search size={15} className={search ? 'text-red-400' : 'text-white/20'} />
                    <input
                        type="text"
                        placeholder="Search live games or providers..."
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

            {/* ── Category Pills ───────────────────────────────────────── */}
            {!search.trim() && (
                <div className="px-2.5 mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {/* "All" pill */}
                    <button
                        onClick={() => setActiveCat(null)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-[11px] font-black tracking-wide transition-all ${
                            activeCat === null
                                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                                : 'bg-white/[0.04] border-white/[0.06] text-white/40'
                        }`}
                    >
                        <IoGrid size={13} />
                        ALL
                    </button>
                    {LIVE_CATS.map(cat => {
                        const SIcon = cat.Icon;
                        const isActive = activeCat === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCat(isActive ? null : cat.id)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-[11px] font-black tracking-wide transition-all ${
                                    isActive
                                        ? 'border-red-500/30 text-red-400'
                                        : 'bg-white/[0.04] border-white/[0.06] text-white/40'
                                }`}
                                style={isActive ? { backgroundColor: cat.iconColor + '18', borderColor: cat.iconColor + '40', color: cat.iconColor } : {}}
                            >
                                <SIcon size={13} style={{ color: isActive ? cat.iconColor : undefined }} />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {search.trim() ? (
                /* ── Search Results ──────────────────────────────────── */
                <div className="px-3 mt-4">
                    <p className="text-white text-[13px] font-black tracking-[0.8px] mb-3">SEARCH RESULTS</p>
                    {searching ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-red-400 rounded-full animate-spin" />
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
                    {/* ── Horizontal rows ──────────────────────────────── */}
                    {rowCats.map(cat => (
                        <HorizontalRow key={cat.id} cat={cat} onLaunch={handleLaunch} hideHeader={!!activeCat} />
                    ))}

                    {/* ── Providers grid ───────────────────────────────── */}
                    <div className="mt-6 px-3">
                        <div className="flex items-center gap-1.5 mb-3">
                            <IoGrid size={13} className="text-white/30" />
                            <span className="text-white/30 text-[11px] font-black tracking-widest uppercase">Providers</span>
                        </div>
                        {providers.length === 0 ? (
                            <div className="grid grid-cols-3 gap-1.5">
                                {FALLBACK_GRADIENTS.map((g, i) => (
                                    <div key={i} className={`h-[70px] rounded-2xl bg-gradient-to-br ${g} animate-pulse`} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                                {providers.map((prov: any, idx: number) => {
                                    const slug = typeof prov === 'string' ? prov : (prov.slug || prov.id || prov.providerCode || '');
                                    const name = typeof prov === 'string' ? prov : (prov.name || prov.providerName || slug);
                                    const logo = prov.logo || prov.image || prov.icon || null;
                                    const gradient = FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length];
                                    return (
                                        <button
                                            key={slug || idx}
                                            onClick={() => { window.location.href = `/live-dealers?provider=${slug}`; }}
                                            className={`relative h-[70px] rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-1`}
                                        >
                                            {logo ? (
                                                <img
                                                    src={logo.startsWith('http') ? logo : `https://zeero.bet${logo}`}
                                                    alt={name}
                                                    className="w-10 h-10 object-contain drop-shadow"
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <MdLiveTv size={22} className="text-white/60" />
                                            )}
                                            <span className="text-[7px] font-black text-white/50 tracking-widest uppercase truncate px-1 max-w-full">
                                                {name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
