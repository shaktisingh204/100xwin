"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import GameGrid from '@/components/casino/GameGrid';
import ProviderList from '@/components/casino/ProviderList';
import GamePlayInterface from '@/components/casino/GamePlayInterface';
import CasinoMobileView from '@/components/casino/CasinoMobileView';
import { casinoService } from '@/services/casino';
import { useAuth } from '@/context/AuthContext';

interface LaunchableGame {
    id?: string;
    name?: string;
    gameName?: string;
    provider?: string;
    providerCode?: string;
    gameCode?: string;
    url?: string;
}

function CasinoContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category');
    const providerParam = searchParams.get('provider') || 'all';
    const selectedCategory = categoryParam || 'all';

    const { user } = useAuth();
    const [selectedProvider, setSelectedProvider] = useState(providerParam);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeGame, setActiveGame] = useState<{ id: string; name: string; provider: string; url: string } | null>(null);
    const [launching, setLaunching] = useState(false);
    const [launchError, setLaunchError] = useState<string | null>(null);

    useEffect(() => {
        setSelectedProvider(providerParam);
    }, [providerParam]);

    const toActiveGame = (gameData: LaunchableGame, url: string) => ({
        id: gameData.id || gameData.gameCode || '',
        name: gameData.name || gameData.gameName || '',
        provider: gameData.providerCode || gameData.provider || '',
        url,
    });

    const handleProviderSelect = (provider: string) => {
        setSelectedProvider(provider);
        if (searchQuery) setSearchQuery('');

        const nextParams = new URLSearchParams(searchParams.toString());
        if (provider === 'all') {
            nextParams.delete('provider');
        } else {
            nextParams.set('provider', provider);
        }

        const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    };

    const handleGameLaunch = async (gameData: LaunchableGame) => {
        // If URL is already resolved (e.g. from a previous launch), use it directly
        if (gameData.url) {
            setActiveGame(toActiveGame(gameData, gameData.url));
            setLaunchError(null);
            return;
        }
        if (!user) {
            alert('Please login to play');
            return;
        }

        const providerCode = gameData.providerCode || gameData.provider;
        const gameId = gameData.gameCode || gameData.id;
        if (!providerCode || !gameId) {
            setLaunchError('Game data is incomplete. Please try another game.');
            return;
        }

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
                setActiveGame(toActiveGame(gameData, res.url));
            } else {
                setLaunchError('Could not get game URL. Please try again.');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to launch game.';
            setLaunchError(errorMessage);
        } finally {
            setLaunching(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-bg-base flex flex-col">
            <Header />

            {/* ── LAUNCHING OVERLAY ── */}
            {launching && (
                <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="w-16 h-16 rounded-full border-2 border-[#E37D32]/20 border-t-[#E37D32] animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-2xl">🎰</div>
                    </div>
                    <p className="text-white/60 text-sm font-semibold tracking-widest uppercase animate-pulse">Launching game…</p>
                </div>
            )}

            {/* ── LAUNCH ERROR OVERLAY ── */}
            {launchError && (
                <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-5 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl">⚠️</div>
                    <div className="text-center">
                        <h2 className="text-white font-bold text-lg mb-1">Unable to Launch</h2>
                        <p className="text-white/40 text-sm">{launchError}</p>
                    </div>
                    <button
                        onClick={() => setLaunchError(null)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-sm active:scale-95 transition-transform"
                    >
                        <X size={16} /> Close
                    </button>
                </div>
            )}

            {/* ── GAME OVERLAY (both viewports) ── */}
            {activeGame && (
                <div className="fixed inset-0 z-[500] bg-[#0d0d0f] flex flex-col">
                    <GamePlayInterface
                        game={activeGame}
                        onClose={() => setActiveGame(null)}
                        isEmbedded={false}
                        onLaunch={handleGameLaunch}
                        key={activeGame.id}
                    />
                </div>
            )}

            {/* ══ MOBILE LAYOUT (md:hidden) ════════════════════════════════ */}
            <div className="md:hidden flex-1 overflow-y-auto pt-[64px] pb-[72px]">
                <CasinoMobileView
                    onLaunch={handleGameLaunch}
                    onViewAll={(cat) => {
                        // navigate to filtered view (could set a state or URL)
                        window.location.href = `/casino?category=${cat}`;
                    }}
                />
            </div>

            {/* ══ DESKTOP LAYOUT (hidden md:flex) ══════════════════════════ */}
            <div className="hidden md:flex flex-1 overflow-hidden pt-[64px] pb-0 max-w-[1920px] mx-auto w-full">
                {!activeGame && <LeftSidebar />}

                <main className={`flex-1 min-w-0 bg-bg-base overflow-y-auto overflow-x-hidden ${!activeGame ? 'border-l border-white/5 border-r border-white/5' : ''}`}>
                    {activeGame ? (
                        <div className="w-full bg-bg-base">
                            <GamePlayInterface
                                game={activeGame}
                                onClose={() => setActiveGame(null)}
                                isEmbedded={true}
                                onLaunch={handleGameLaunch}
                                key={activeGame.id}
                            />
                        </div>
                    ) : (
                        <div className="p-2 sm:p-4 md:p-6 space-y-6 md:space-y-8">
                            {/* Banner Carousel */}
                            {selectedCategory === 'all' && (
                                <div className="relative w-full h-[180px] md:h-[320px] rounded-2xl overflow-hidden shadow-2xl group">
                                    <img
                                        src="/assets/banner-casino-main.jpg"
                                        alt="Casino Banner"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2070&auto=format&fit=crop';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center p-8 md:p-12">
                                        <span className="text-brand-gold font-bold tracking-widest text-xs md:text-sm mb-2 animate-pulse">EXCLUSIVE OFFER</span>
                                        <h1 className="text-3xl md:text-5xl font-extrabold text-text-primary mb-4 leading-tight">
                                            WELCOME TO <br />
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-brand-gold-hover">ZEERO CASINO</span>
                                        </h1>
                                        <p className="text-text-secondary text-sm md:text-base max-w-lg mb-6 line-clamp-2">
                                            Experience the thrill of next-gen gaming with instant deposits, lightning-fast withdrawals, and VIP rewards.
                                        </p>
                                        <button className="w-max bg-brand-gold hover:bg-brand-gold-hover text-text-inverse font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 shadow-glow-gold">
                                            PLAY NOW
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search games..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-bg-elevated text-text-primary rounded-lg py-3 pl-10 pr-4 outline-none transition-all shadow-inner focus:shadow-[0_0_0_2px_var(--action-primary)] placeholder-text-muted"
                                />
                            </div>

                            {searchQuery ? (
                                <GameGrid
                                    title={`Search Results for "${searchQuery}"`}
                                    category="all"
                                    search={searchQuery}
                                    layout="grid"
                                    onLaunch={handleGameLaunch}
                                />
                            ) : (
                                <>
                                    {selectedCategory === 'all' && (
                                        <ProviderList
                                            selectedCategory={selectedCategory}
                                            selectedProvider={selectedProvider}
                                            onSelectProvider={handleProviderSelect}
                                            previewLimit={8}
                                            viewAllHref="/casino/providers"
                                        />
                                    )}

                                    {selectedProvider === 'all' && selectedCategory === 'all' ? (
                                        <div className="space-y-8">
                                            <GameGrid title="🌟 Exclusive Games" category="exclusive" layout="row" onViewAll={() => router.push('/casino?category=exclusive')} onLaunch={handleGameLaunch} />
                                            <GameGrid title="🔥 Popular Games"   category="popular"   layout="row" onViewAll={() => router.push('/casino?category=popular')}   onLaunch={handleGameLaunch} />
                                            <GameGrid title="✨ New Games"        category="new"       layout="row" onViewAll={() => router.push('/casino?category=new')}       onLaunch={handleGameLaunch} />
                                            <GameGrid title="📈 Trending Now"     category="trending"  layout="row" onViewAll={() => router.push('/casino?category=trending')}  onLaunch={handleGameLaunch} />
                                            <GameGrid title="🎰 Top Slots"        category="slots"     layout="row" onViewAll={() => router.push('/casino?category=slots')}     onLaunch={handleGameLaunch} />
                                            <GameGrid title="🎲 Live Casino"      category="live"      layout="row" onViewAll={() => router.push('/casino?category=live')}      onLaunch={handleGameLaunch} />
                                            <GameGrid title="♟️ Table Games"      category="table"     layout="row" onViewAll={() => router.push('/casino?category=table')}     onLaunch={handleGameLaunch} />
                                            <GameGrid title="💥 Crash Games"      category="crash"     layout="row" onViewAll={() => router.push('/casino?category=crash')}     onLaunch={handleGameLaunch} />
                                        </div>
                                    ) : (
                                        <GameGrid
                                            title={`${selectedProvider !== 'all' ? selectedProvider : ''} ${selectedCategory !== 'all' ? selectedCategory : 'Games'}`}
                                            category={selectedCategory}
                                            provider={selectedProvider}
                                            layout="grid"
                                            onLaunch={handleGameLaunch}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default function CasinoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div></div>}>
            <CasinoContent />
        </Suspense>
    );
}
