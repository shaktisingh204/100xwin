'use client';

import React, { useRef, useState } from 'react';
import { Play, Loader2, X, RefreshCw, Maximize2, Minimize2, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { casinoService } from '@/services/casino';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import SkeletonGameRow from '@/components/shared/SkeletonGameRow';

/* ── Unique Game Card — floating label with glass overlay & gradient pulse ─── */
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
            className="relative flex-shrink-0 cursor-pointer group"
            onClick={() => { setLoading(true); onPlay(game); }}
        >
            {/* Card container with unique border-radius mix */}
            <div className="relative w-[128px] h-[168px] md:w-[155px] md:h-[200px] rounded-2xl overflow-hidden border border-white/[0.04] group-hover:border-white/[0.12] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
                {/* Image */}
                {!imgFailed && imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={game.name}
                        onError={() => setImgFailed(true)}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#12151a] to-[#0a0c10] text-3xl">
                        🎮
                    </div>
                )}

                {/* Bottom gradient — stronger so name is readable */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {loading ? (
                        <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Loader2 size={18} className="text-white animate-spin" />
                        </div>
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                            <Play size={16} className="text-white ml-0.5" fill="white" />
                        </div>
                    )}
                </div>

                {/* Tag */}
                {game.tag && (
                    <div className="absolute top-2 left-2 z-10 bg-brand-gold text-black text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-lg">
                        {game.tag}
                    </div>
                )}

                {/* Game name — bottom left */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
                    {game.provider && (
                        <span className="text-[7px] font-bold text-white/25 uppercase tracking-wider block mb-0.5">{game.provider?.slice(0, 10)}</span>
                    )}
                    <p className="text-[11px] font-bold text-white/80 truncate leading-tight group-hover:text-white transition-colors">{game.name || 'Unknown'}</p>
                </div>
            </div>
        </div>
    );
}

/* ── Game Player Overlay ─────────────────────────────────────────────────── */
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
        <div className="fixed inset-0 z-[300] bg-black flex flex-col animate-in fade-in duration-200">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0c10] border-b border-white/[0.04] flex-shrink-0">
                <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-[13px] truncate">{game.name}</p>
                    <p className="text-white/15 text-[9px] font-bold uppercase tracking-wider">{game.provider}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setIsFavorite(!isFavorite)} className={`p-1.5 rounded-lg transition-colors ${isFavorite ? 'text-brand-gold bg-brand-gold/10' : 'text-white/15 hover:text-white/40 bg-white/[0.02]'}`}>
                        <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => setIframeKey(k => k + 1)} className="p-1.5 rounded-lg text-white/15 hover:text-white/40 bg-white/[0.02] transition-colors">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={toggleFullscreen} className="p-1.5 rounded-lg text-white/15 hover:text-white/40 bg-white/[0.02] transition-colors hidden md:flex">
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-red-400 hover:text-white bg-red-500/8 hover:bg-red-500/15 transition-colors">
                        <X size={16} />
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

/* ── Main HomeGameList ─────────────────────────────────────────────────────── */
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

    React.useEffect(() => { setLocalGames(games); }, [games]);

    if (isLoading) return <SkeletonGameRow count={10} />;

    const scroll = (dir: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
        }
    };

    const handlePlay = async (game: any) => {
        if (!user) { openLogin(); return; }
        try {
            const gameId = game.gameCode || game.id || game.gameId;
            const provider = game.providerCode || game.provider || '';
            const res = await casinoService.launchGame({ username: user.username, provider, gameId });
            const url = res?.url || res?.launch_url || res?.gameUrl || '';
            if (url) {
                setActiveGame({ id: gameId, name: game.name || game.gameName, provider, url });
                document.body.style.overflow = 'hidden';
            }
        } catch (err) { console.error('Failed to launch game', err); }
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
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {icon}
                            {title && <h3 className="text-[13px] font-black text-white uppercase tracking-wider">{title}</h3>}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => scroll('left')} className="w-6 h-6 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg flex items-center justify-center text-white/15 hover:text-white/40 transition-colors border border-white/[0.03]">
                                <ChevronLeft size={12} />
                            </button>
                            <button onClick={() => scroll('right')} className="w-6 h-6 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg flex items-center justify-center text-white/15 hover:text-white/40 transition-colors border border-white/[0.03]">
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Game card row */}
                <div
                    ref={scrollRef}
                    className="flex gap-2.5 overflow-x-auto pb-2 snap-x"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {localGames.map((game, i) => (
                        <GameCard key={game.id || game.gameCode || i} game={game} onPlay={handlePlay} />
                    ))}
                </div>
            </div>
        </>
    );
}
