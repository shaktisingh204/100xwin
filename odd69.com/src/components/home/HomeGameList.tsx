'use client';

import React, { useRef, useState } from 'react';
import { Play, Loader2, X, RefreshCw, Maximize2, Minimize2, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { casinoService } from '@/services/casino';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useWallet } from '@/context/WalletContext';

// ─── Skeleton row (inline) ───────────────────────────────────────────────────
function SkeletonGameRow({ count = 10 }: { count?: number }) {
    return (
        <div className="flex gap-1 overflow-hidden pb-2">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="shrink-0 w-[calc((100vw-40px)/3.1)] md:w-[155px] aspect-[3/4] rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse"
                />
            ))}
        </div>
    );
}

// ─── Game card ───────────────────────────────────────────────────────────────
interface GameCardProps {
    game: any;
    onPlay: (game: any) => void;
}

function GameCard({ game, onPlay }: GameCardProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const [loading, setLoading] = useState(false);
    const imgSrc = game.image || game.banner || '';

    return (
        <div
            className="relative shrink-0 cursor-pointer group w-[calc((100vw-40px)/3.1)] md:w-[155px] aspect-[3/4]"
            onClick={() => { setLoading(true); onPlay(game); }}
        >
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-500/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(245,158,11,0.08)]">
                {!imgFailed && imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={game.name}
                        onError={() => setImgFailed(true)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.04] to-white/[0.02] text-4xl">
                        🎮
                    </div>
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Play button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {loading ? (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.5)]">
                            <Loader2 size={20} className="text-[#1a1208] animate-spin" />
                        </div>
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.5)] group-hover:scale-110 transition-transform duration-300">
                            <Play size={18} fill="#1a1208" className="text-[#1a1208] ml-0.5" />
                        </div>
                    )}
                </div>

                {/* Tag badge */}
                {game.tag && (
                    <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                        {game.tag}
                    </div>
                )}

                {/* Provider badge */}
                {game.provider && (
                    <div className="absolute top-2 right-2 z-10 bg-black/50 text-white/60 text-[7px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-md border border-white/[0.06]">
                        {game.provider?.slice(0, 6)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Game Player Overlay ─────────────────────────────────────────────────────
interface GamePlayerProps {
    game: { id: string; name: string; provider: string; url: string };
    onClose: () => void;
}

function GamePlayerOverlay({ game, onClose }: GamePlayerProps) {
    const [iframeKey, setIframeKey] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col animate-in fade-in duration-200">
            <div className="flex items-center gap-3 px-4 py-3 bg-[#06080c] border-b border-white/[0.06] flex-shrink-0">
                <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm truncate">{game.name}</p>
                    <p className="text-white/50 text-[10px] font-bold uppercase">{game.provider}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setIsFavorite(!isFavorite)} className={`p-2 rounded-lg transition-colors ${isFavorite ? 'text-amber-400 bg-amber-400/10' : 'text-white/50 hover:text-white bg-white/[0.04]'}`}>
                        <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => setIframeKey(k => k + 1)} className="p-2 rounded-lg text-white/50 hover:text-white bg-white/[0.04] transition-colors">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={toggleFullscreen} className="p-2 rounded-lg text-white/50 hover:text-white bg-white/[0.04] transition-colors hidden md:flex">
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button onClick={onClose} className="p-2 rounded-lg text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                <iframe
                    key={iframeKey}
                    src={game.url}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture"
                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                />
            </div>
        </div>
    );
}

// ─── Main HomeGameList ───────────────────────────────────────────────────────
interface HomeGameListProps {
    title?: string;
    games: any[];
    icon?: React.ReactNode;
    viewAllHref?: string;
    isLoading?: boolean;
}

export default function HomeGameList({ title, games, icon, viewAllHref, isLoading }: HomeGameListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [localGames, setLocalGames] = React.useState<any[]>(games);
    const [activeGame, setActiveGame] = useState<{ id: string; name: string; provider: string; url: string } | null>(null);
    const { user } = useAuth();
    const { openLogin } = useModal();
    const { selectedSubWallet } = useWallet();

    React.useEffect(() => { setLocalGames(games); }, [games]);

    if (isLoading) {
        return <SkeletonGameRow count={10} />;
    }

    const scroll = (dir: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
        }
    };

    const handlePlay = async (game: any) => {
        if (!user) {
            openLogin();
            return;
        }
        try {
            const gameId = game.gameCode || game.id || game.gameId;
            const provider = game.providerCode || game.provider || '';
            const res: any = await casinoService.launchGame({
                username: user.username,
                provider,
                gameId,
                walletMode: (selectedSubWallet as any) ?? undefined,
            } as any);
            const url = res?.url || res?.launch_url || res?.gameUrl || '';
            if (url) {
                setActiveGame({ id: gameId, name: game.name || game.gameName, provider, url });
                document.body.style.overflow = 'hidden';
            }
        } catch (err) {
            console.error('Failed to launch game', err);
        }
    };

    const handleClose = () => {
        setActiveGame(null);
        document.body.style.overflow = '';
    };

    if (localGames.length === 0) return null;

    return (
        <>
            {activeGame && <GamePlayerOverlay game={activeGame} onClose={handleClose} />}

            <div>
                {(title || icon) && (
                    <div className="flex items-center justify-between mb-4 px-0.5">
                        <div className="flex items-center gap-2.5">
                            {icon}
                            {title && <h3 className="text-lg md:text-xl font-black text-white tracking-tight">{title}</h3>}
                        </div>
                        <div className="flex items-center gap-2">
                            {viewAllHref && (
                                <a href={viewAllHref} className="text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06]">
                                    All
                                </a>
                            )}
                            <button onClick={() => scroll('left')} className="w-8 h-8 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all">
                                <ChevronLeft size={15} />
                            </button>
                            <button onClick={() => scroll('right')} className="w-8 h-8 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all">
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="-mx-1 px-1 -my-2 py-2">
                    <div
                        ref={scrollRef}
                        className="flex gap-1 overflow-x-auto pb-2 snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none' }}
                    >
                        {localGames.map((game, i) => (
                            <GameCard key={game.id || game.gameCode || i} game={game} onPlay={handlePlay} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
