import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import SkeletonGameRow from '@/components/shared/SkeletonGameRow';
import SkeletonGameGrid from '@/components/shared/SkeletonGameGrid';
import GameCard from './GameCard';
import { useAuth } from '@/context/AuthContext';
import { casinoService, type CasinoGame } from '@/services/casino';

interface GameGridProps {
    title: string;
    category: string;
    provider?: string;
    search?: string;
    layout?: 'grid' | 'row';
    onViewAll?: () => void;
    onLaunch?: (game: { id: string; name: string; provider: string; url: string }) => void;
    type?: string; // New prop
}

const GameGrid: React.FC<GameGridProps> = ({ title, category, provider, search, layout = 'grid', onViewAll, onLaunch, type }) => {
    const { user } = useAuth();
    const [games, setGames] = React.useState<CasinoGame[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalGames, setTotalGames] = React.useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // ... (rest of useEffects unchanged)

    React.useEffect(() => {
        const fetchGames = async () => {
            try {
                setLoading(true);
                const cat = category === 'all' ? undefined : category;
                const prov = provider === 'all' ? undefined : provider;

                // Pass page and type
                const data = await casinoService.getGames(prov, cat, search, page, undefined, type);

                if (data && Array.isArray(data.games)) {
                    setGames(data.games as CasinoGame[]);
                    setTotalPages(data.totalPages);
                    setTotalGames(data.totalCount || 0);
                } else {
                    // Fallback if structure mismatches (should not happen with updated service)
                    setGames([]);
                }
            } catch (error) {
                console.error("Failed to fetch games", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGames();
    }, [category, provider, search, page, type]);

    const handleLaunchGame = async (game: CasinoGame) => {
        if (!user) {
            alert("Please login to play");
            return;
        }
        
        const gameData = {
            id: game.gameCode || game.id,
            name: game.gameName || game.name,
            provider: game.providerCode || game.provider,
            url: '' // handled by play page
        };

        if (onLaunch) {
            onLaunch(gameData);
        } else {
            // Navigate directly to the play page
            window.location.href = `/casino/play/${gameData.id}?provider=${encodeURIComponent(gameData.provider)}&name=${encodeURIComponent(gameData.name)}`;
        }
    };

    const removeGame = (idToRemove: string) => {
        setGames(prevGames => prevGames.filter(g => (g.id || g.gameCode) !== idToRemove));
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = direction === 'left' ? -current.offsetWidth : current.offsetWidth;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) {
        return layout === 'row'
            ? <SkeletonGameRow count={10} />
            : <SkeletonGameGrid count={18} />;
    }

    if (games.length === 0) return null;

    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        {category === 'popular' && <span className="text-orange-500">🔥</span>}
                        {category === 'new' && <span className="text-jackpot">⚡</span>}
                        {title}
                        <span className="text-xs font-normal text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full ml-2">
                            {totalGames}
                        </span>
                    </h3>
                </div>

                <div className="flex items-center gap-3">
                    {layout === 'row' && (
                        <>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => scroll('left')}
                                    className="w-8 h-8 rounded-lg bg-bg-elevated border border-divider hover:border-brand-gold flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => scroll('right')}
                                    className="w-8 h-8 rounded-lg bg-bg-elevated border border-divider hover:border-brand-gold flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            {onViewAll && (
                                <button
                                    onClick={onViewAll}
                                    className="text-sm text-brand-gold hover:text-text-primary flex items-center gap-1 transition-colors"
                                >
                                    View All <ArrowRight size={14} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {layout === 'row' ? (
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-3 md:gap-4 pb-4 scrollbar-hide scroll-smooth"
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {games.map((game, idx) => (
                        <GameCard
                            key={game.id || idx}
                            name={game.gameName || game.name || 'Unknown Game'}
                            image={game.banner || game.image || 'https://images.unsplash.com/photo-1605218427306-022ba8c15661?q=80&w=600&auto=format&fit=crop'}
                            provider={game.providerCode || game.provider}
                            tag={game.tag}
                            layout="row"
                            onClick={() => handleLaunchGame(game)}
                            onError={() => removeGame(game.id || game.gameCode)}
                        />
                    ))}

                </div>
            ) : (
                <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2 md:gap-4">
                    {games.map((game, idx) => (
                        <GameCard
                            key={game.id || idx}
                            name={game.gameName || game.name || 'Unknown Game'}
                            image={game.banner || game.image || 'https://images.unsplash.com/photo-1605218427306-022ba8c15661?q=80&w=600&auto=format&fit=crop'}
                            provider={game.providerCode || game.provider}
                            tag={game.tag}
                            layout="grid"
                            onClick={() => handleLaunchGame(game)}
                            onError={() => removeGame(game.id || game.gameCode)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {layout === 'grid' && totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                    <button
                        disabled={page === 1}
                        onClick={() => {
                            setPage(p => Math.max(1, p - 1));
                            // Scroll to top of grid
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-4 py-2 rounded-lg bg-bg-elevated border border-divider hover:border-brand-gold disabled:opacity-50 disabled:cursor-not-allowed text-text-primary transition-colors flex items-center gap-2"
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-text-muted text-sm font-medium">Page {page} of {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => {
                            setPage(p => Math.min(totalPages, p + 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-4 py-2 rounded-lg bg-bg-elevated border border-divider hover:border-brand-gold disabled:opacity-50 disabled:cursor-not-allowed text-text-primary transition-colors flex items-center gap-2"
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </section>
    );
};

export default GameGrid;
