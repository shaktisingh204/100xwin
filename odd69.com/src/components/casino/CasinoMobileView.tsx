'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Search, X, House, Layers, ChevronRight,
    Flame, Dice5, PlayCircle, Coffee, Zap, TrendingUp, Fish,
    Sparkles, Star, Trophy, Tv, Crown, Rocket, Diamond,
    Gift, Heart, Circle, Shuffle, Music, Target, Award, BarChart2,
    Ghost, Joystick, Ticket, Gem, Banknote, Monitor, Gamepad2,
} from 'lucide-react';
import { casinoService } from '@/services/casino';
import GameGrid from '@/components/casino/GameGrid';
import ProviderLogo from '@/components/casino/ProviderLogo';
import Hero from '@/components/casino/Hero';

// ─── Icon registry (maps stored name → component) ─────────────────────────────
const ICON_REGISTRY: Record<string, React.ElementType> = {
    Flame, Dice5, PlayCircle, Coffee, Zap, TrendingUp, Fish,
    Sparkles, Star, Trophy, Tv, Crown, Layers, Rocket, Diamond,
    Gift, Heart, Circle, Shuffle, Music, Target, Award, BarChart2,
    Ghost, Joystick, Ticket, Gem, Banknote, Monitor, Gamepad2,
};

function resolveIcon(name: string, size = 14, className = 'text-white/50'): React.ReactNode {
    const Comp = ICON_REGISTRY[name] ?? Gamepad2;
    return <Comp size={size} className={className} />;
}

// ─── Default casino lobby sections (inlined — no server action in odd69) ──────
interface SectionConfig {
    section: string;
    label: string;
    icon: string;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
    { section: 'popular',   label: 'Hot Games',      icon: 'Flame' },
    { section: 'slots',     label: 'Slots',          icon: 'Dice5' },
    { section: 'new',       label: 'New Arrivals',   icon: 'Sparkles' },
    { section: 'trending',  label: 'Trending Now',   icon: 'TrendingUp' },
    { section: 'table',     label: 'Table Games',    icon: 'Coffee' },
    { section: 'crash',     label: 'Crash Games',    icon: 'Zap' },
    { section: 'top-slots', label: 'Top Slots',      icon: 'Target' },
    { section: 'fishing',   label: 'Fishing',        icon: 'Fish' },
    { section: 'arcade',    label: 'Arcade',         icon: 'Gamepad2' },
    { section: 'virtual',   label: 'Virtual Sports', icon: 'Trophy' },
    { section: 'exclusive', label: 'Exclusive',      icon: 'Star' },
    { section: 'top',       label: 'Top Picks',      icon: 'Crown' },
];

interface CasinoMobileViewProps {
    onLaunch: (game: any) => void;
    onViewAll?: (cat: string) => void;
    onSearchClick?: () => void;
}

export default function CasinoMobileView({ onLaunch }: CasinoMobileViewProps) {
    const [activeCat, setActiveCat]         = useState('all');
    const [search, setSearch]               = useState('');
    const [searchInput, setSearchInput]     = useState('');
    const [providers, setProviders]         = useState<any[]>([]);
    const [providersLoading, setProvidersLoading] = useState(false);
    const [activeProvider, setActiveProvider] = useState<string | null>(null);
    const lobbySections = DEFAULT_SECTIONS;
    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Debounce search
    const handleSearchChange = (val: string) => {
        setSearchInput(val);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setSearch(val), 350);
    };

    const clearSearch = () => { setSearchInput(''); setSearch(''); };

    // Load providers lazily
    useEffect(() => {
        if (activeCat === 'providers' && providers.length === 0) {
            setProvidersLoading(true);
            casinoService.getProviders()
                .then(data => setProviders(Array.isArray(data) ? data.filter(Boolean) : []))
                .catch(() => {})
                .finally(() => setProvidersLoading(false));
        }
    }, [activeCat, providers.length]);

    const handleCatSelect = (key: string) => {
        setActiveCat(key);
        setActiveProvider(null);
        clearSearch();
    };

    const handleProviderClick = (code: string) => {
        setActiveProvider(code);
        setActiveCat('all');
        clearSearch();
    };

    const isSearching = !!search.trim();

    return (
        <div className="flex flex-col bg-[#06080c] min-h-full pb-24">

            {/* Hero (Lobby only, top of page) */}
            {activeCat === 'all' && !activeProvider && !search && (
                <div className="px-3 pt-3">
                    <Hero />
                </div>
            )}

            {/* Search bar */}
            <div className="px-3 mt-3 sticky top-0 z-10 pb-2 bg-[#06080c]">
                <div className={`flex items-center gap-3 bg-white/[0.02] px-4 py-3 rounded-2xl border transition-colors ${searchInput ? 'border-amber-500/50' : 'border-white/[0.06]'}`}>
                    <Search size={16} className={`flex-shrink-0 transition-colors ${searchInput ? 'text-amber-400' : 'text-white/50'}`} />
                    <input
                        type="text"
                        placeholder="Search 1000+ games…"
                        value={searchInput}
                        onChange={e => handleSearchChange(e.target.value)}
                        className="flex-1 bg-transparent text-white text-[13px] font-semibold outline-none placeholder:text-white/50"
                    />
                    {searchInput && (
                        <button onClick={clearSearch} className="p-1 rounded-lg bg-white/[0.04] text-white/50 hover:text-white transition-colors border border-white/[0.04]">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Category Pills */}
            {!isSearching && (
                <div className="mt-2.5 px-3 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {[{ key: 'all', label: 'Lobby', icon: <House size={12} /> }, { key: 'providers', label: 'Providers', icon: <Layers size={12} /> }]
                        .map(({ key, label, icon }) => {
                            const active = activeCat === key && !activeProvider;
                            return (
                                <button key={key} onClick={() => handleCatSelect(key)}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-black tracking-wide transition-all ${active ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-white/[0.02] border-white/[0.04] text-white/50 hover:text-white/80'}`}>
                                    <span className={active ? 'text-amber-400' : 'text-white/50'}>{icon}</span>{label}
                                </button>
                            );
                        })
                    }
                    {lobbySections.map((s) => {
                        const active = activeCat === s.section && !activeProvider;
                        return (
                            <button key={s.section} onClick={() => handleCatSelect(s.section)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-black tracking-wide transition-all ${active ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-white/[0.02] border-white/[0.04] text-white/50 hover:text-white/80'}`}>
                                {resolveIcon(s.icon || 'Gamepad2', 12, active ? 'text-amber-400' : 'text-white/50')}
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Active provider breadcrumb */}
            {activeProvider && !isSearching && (
                <div className="px-3 mt-2 flex items-center gap-2">
                    <button
                        onClick={() => { setActiveProvider(null); setActiveCat('providers'); }}
                        className="flex items-center gap-1 text-[11px] text-amber-400 font-bold"
                    >
                        <Layers size={12} />
                        Providers
                        <ChevronRight size={11} className="text-white/50" />
                    </button>
                    <span className="text-[11px] text-white/70 font-bold">{activeProvider}</span>
                </div>
            )}

            {/* MAIN CONTENT */}
            <div className="mt-4 px-1">

                {/* Search results */}
                {isSearching ? (
                    <div className="px-2">
                        <GameGrid
                            title={`Results for "${search}"`}
                            category="all"
                            search={search}
                            layout="grid"
                            onLaunch={onLaunch}
                        />
                    </div>
                ) : activeCat === 'providers' && !activeProvider ? (
                    /* Providers grid */
                    <div className="px-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">
                            All Providers <span className="ml-1 text-white/25">({providers.length || '…'})</span>
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {providersLoading
                                ? Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="h-16 rounded-2xl bg-white/[0.04] animate-pulse" />
                                ))
                                : providers.map((p, idx) => {
                                    const code = p.providerCode || p.provider || p.code || '';
                                    const name = p.name || code;
                                    return (
                                        <button
                                            key={code || idx}
                                            onClick={() => handleProviderClick(code)}
                                            className="flex h-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 transition-all active:scale-95 hover:border-amber-500/40"
                                        >
                                            <ProviderLogo
                                                provider={{ image: p.image, provider: code, code }}
                                                alt={name}
                                                className="max-h-8 w-auto max-w-[90px] object-contain"
                                                fallbackClassName="text-[10px] font-black text-white/70"
                                                fallbackText={name}
                                            />
                                        </button>
                                    );
                                })
                            }
                        </div>
                    </div>
                ) : activeCat !== 'all' || activeProvider ? (
                    /* Filtered category or provider grid */
                    <div className="px-2">
                        <GameGrid
                            title={activeProvider ? `${activeProvider} Games` : (lobbySections.find((c) => c.section === activeCat)?.label || 'Games')}
                            category={activeCat === 'all' ? 'all' : activeCat}
                            provider={activeProvider || undefined}
                            layout="grid"
                            onLaunch={onLaunch}
                        />
                    </div>
                ) : (
                    /* Lobby: horizontal rows */
                    <div className="space-y-5">
                        {lobbySections.map((section) => (
                            <GameGrid
                                key={section.section}
                                title={section.label}
                                icon={resolveIcon(section.icon || 'Gamepad2')}
                                sectionKey={section.section}
                                category={section.section}
                                layout="row"
                                onViewAll={() => handleCatSelect(section.section)}
                                onLaunch={onLaunch}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
