"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import GameGrid from '@/components/casino/GameGrid';
import ProviderList from '@/components/casino/ProviderList';
import GamePlayInterface from '@/components/casino/GamePlayInterface';
import LiveCasinoMobileView from '@/components/casino/LiveCasinoMobileView';

function LiveDealersContent() {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category');
    // Default to 'all' if not present
    const selectedCategory = categoryParam || 'all';

    const [selectedProvider, setSelectedProvider] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeGame, setActiveGame] = useState<{ id: string; name: string; provider: string; url: string } | null>(null);

    const handleProviderSelect = (provider: string) => {
        setSelectedProvider(provider);
        if (searchQuery) setSearchQuery('');
    };

    const handleGameLaunch = (gameData: any) => {
        setActiveGame(gameData);
    };

    return (
        <div className="h-screen overflow-hidden bg-bg-base flex flex-col">
            <Header />

            {/* ── MOBILE VIEW (< md) ─────────────────────────────── */}
            <div className="md:hidden flex-1 overflow-y-auto pt-[110px] pb-[80px]">
                {activeGame ? (
                    <div className="h-full bg-bg-base">
                        <GamePlayInterface
                            game={activeGame}
                            onClose={() => setActiveGame(null)}
                            isEmbedded={true}
                            onLaunch={handleGameLaunch}
                            key={activeGame.id}
                        />
                    </div>
                ) : (
                    <LiveCasinoMobileView onLaunch={handleGameLaunch} />
                )}
            </div>

            {/* ── DESKTOP VIEW (≥ md) ──────────────────────────── */}
            <div className="hidden md:flex flex-1 overflow-hidden pt-[64px] max-w-[1920px] mx-auto w-full">
                {/* Global Sidebar */}
                <LeftSidebar />

                <main className="flex-1 min-w-0 border-l border-white/5 border-r border-white/5 bg-bg-base overflow-y-auto overflow-x-hidden">
                    {activeGame ? (
                        <div className="h-full bg-bg-base">
                            <GamePlayInterface
                                game={activeGame}
                                onClose={() => setActiveGame(null)}
                                isEmbedded={true}
                                onLaunch={handleGameLaunch}
                                key={activeGame.id}
                            />
                        </div>
                    ) : (
                        <div className="p-4 md:p-6 space-y-8">
                            {/* Banner Carousel */}
                            {selectedCategory === 'all' && (
                                <div className="relative w-full h-[180px] md:h-[320px] rounded-2xl overflow-hidden shadow-2xl group">
                                    <img
                                        src="/assets/banner-casino-main.jpg"
                                        alt="Live Casino Banner"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2070&auto=format&fit=crop';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center p-8 md:p-12">
                                        <span className="text-brand-gold font-bold tracking-widest text-xs md:text-sm mb-2 animate-pulse">LIVE ACTION</span>
                                        <h1 className="text-3xl md:text-5xl font-extrabold text-text-primary mb-4 leading-tight">
                                            LIVE DEALERS <br />
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-brand-gold-hover">REAL EXPERIENCE</span>
                                        </h1>
                                        <p className="text-text-secondary text-sm md:text-base max-w-lg mb-6 line-clamp-2">
                                            Interact with professional dealers in real-time. Roulette, Blackjack, Baccarat and more.
                                        </p>
                                        <button className="w-max bg-brand-gold hover:bg-brand-gold-hover text-text-inverse font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 shadow-glow-gold">
                                            PLAY LIVE
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search live games..."
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
                                    type="live"
                                />
                            ) : (
                                <>
                                    {/* Provider List */}
                                    {selectedCategory === 'all' && (
                                        <ProviderList
                                            selectedCategory={selectedCategory === 'all' ? 'live' : selectedCategory}
                                            selectedProvider={selectedProvider}
                                            onSelectProvider={handleProviderSelect}
                                        />
                                    )}

                                    {/* Game Grids */}
                                    {selectedProvider === 'all' && selectedCategory === 'all' ? (
                                        <div className="space-y-8">
                                            <GameGrid
                                                title="Popular Live Games"
                                                category="popular"
                                                layout="row"
                                                onViewAll={() => { }}
                                                onLaunch={handleGameLaunch}
                                                type="live"
                                            />
                                            <GameGrid
                                                title="New Live Games"
                                                category="new"
                                                layout="row"
                                                onViewAll={() => { }}
                                                onLaunch={handleGameLaunch}
                                                type="live"
                                            />
                                            <GameGrid
                                                title="Live Roulette"
                                                category="roulette"
                                                layout="row"
                                                onViewAll={() => { }}
                                                onLaunch={handleGameLaunch}
                                                type="live"
                                            />
                                            <GameGrid
                                                title="Live Blackjack"
                                                category="blackjack"
                                                layout="row"
                                                onViewAll={() => { }}
                                                onLaunch={handleGameLaunch}
                                                type="live"
                                            />
                                            <GameGrid
                                                title="Live Baccarat"
                                                category="baccarat"
                                                layout="row"
                                                onViewAll={() => { }}
                                                onLaunch={handleGameLaunch}
                                                type="live"
                                            />
                                        </div>
                                    ) : (
                                        <GameGrid
                                            title={`${selectedProvider !== 'all' ? selectedProvider : ''} ${selectedCategory !== 'all' ? selectedCategory : 'Live Games'}`}
                                            category={selectedCategory}
                                            provider={selectedProvider}
                                            layout="grid"
                                            onLaunch={handleGameLaunch}
                                            type="live"
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

export default function LiveDealersPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div></div>}>
            <LiveDealersContent />
        </Suspense>
    );
}
