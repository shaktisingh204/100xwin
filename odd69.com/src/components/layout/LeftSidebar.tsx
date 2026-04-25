"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    Gamepad2, Trophy, Dices, Crown, Home,
    Zap, Users, Gift,
    ChevronRight, ChevronDown,
    MonitorPlay, Tv, Star, Disc, Gem,
    HelpCircle, Shield, Lock, FileText, BookOpen, MessageCircle, Sparkles,
    Swords
} from 'lucide-react';
import { casinoService } from '@/services/casino';
import { useLayout } from '@/context/LayoutContext';
import { useAuth } from '@/context/AuthContext';

interface Category {
    id: string;
    name: string;
    path: string;
}

interface LeftSidebarProps {
    selectedSportId?: string | null;
    onSelectSport?: (id: string | null) => void;
    activeTab?: 'live' | 'line';
    onTabChange?: (tab: 'live' | 'line') => void;
    collapsedOnly?: boolean;
}

const getCasinoIcon = (id: string) => {
    if (id.includes('slots')) return <Dices size={13} />;
    if (id.includes('table')) return <Gamepad2 size={13} />;
    if (id.includes('original')) return <Star size={13} />;
    return <Dices size={13} />;
};

const getLiveIcon = (id: string) => {
    if (id.includes('blackjack')) return <Dices size={13} />;
    if (id.includes('roulette')) return <Disc size={13} />;
    if (id.includes('baccarat')) return <Gem size={13} />;
    if (id.includes('show')) return <Tv size={13} />;
    return <MonitorPlay size={13} />;
};

const SR_SPORTS: { id: string; emoji: string; label: string }[] = [
    { id: 'sr:sport:1',   emoji: '⚽', label: 'Soccer' },
    { id: 'sr:sport:21',  emoji: '🏏', label: 'Cricket' },
    { id: 'sr:sport:2',   emoji: '🏀', label: 'Basketball' },
    { id: 'sr:sport:5',   emoji: '🎾', label: 'Tennis' },
    { id: 'sr:sport:16',  emoji: '🏈', label: 'American Football' },
    { id: 'sr:sport:3',   emoji: '⚾', label: 'Baseball' },
    { id: 'sr:sport:4',   emoji: '🏒', label: 'Ice Hockey' },
    { id: 'sr:sport:117', emoji: '🥊', label: 'MMA' },
    { id: 'sr:sport:12',  emoji: '🏉', label: 'Rugby Union' },
    { id: 'sr:sport:6',   emoji: '🏉', label: 'Rugby League' },
    { id: 'sr:sport:20',  emoji: '🏓', label: 'Table Tennis' },
    { id: 'sr:sport:31',  emoji: '🏸', label: 'Badminton' },
    { id: 'sr:sport:23',  emoji: '🏐', label: 'Volleyball' },
    { id: 'sr:sport:19',  emoji: '🎱', label: 'Snooker' },
    { id: 'sr:sport:22',  emoji: '🎯', label: 'Darts' },
    { id: 'sr:sport:29',  emoji: '⚽', label: 'Futsal' },
    { id: 'sr:sport:138', emoji: '🤸', label: 'Kabaddi' },
    { id: 'sr:sport:7',   emoji: '⛳', label: 'Golf' },
    { id: 'sr:sport:9',   emoji: '🏎️', label: 'Motor Sports' },
    { id: 'sr:sport:14',  emoji: '🎮', label: 'Esports' },
    { id: 'sr:sport:17',  emoji: '🏊', label: 'Swimming' },
    { id: 'sr:sport:32',  emoji: '🥋', label: 'Boxing' },
];

// ── Sub-item row ───────────────────────────────────────────────────────────
function SubItem({
    href,
    label,
    active,
    accent = 'amber',
    icon,
    emoji,
    onClick,
}: {
    href: string;
    label: string;
    active: boolean;
    accent?: 'amber' | 'red';
    icon?: React.ReactNode;
    emoji?: string;
    onClick?: () => void;
}) {
    const activeAccentDot = accent === 'red' ? 'bg-red-500' : 'bg-amber-500';
    const activeIconBg = accent === 'red' ? 'bg-red-500 text-white' : 'bg-amber-500 text-[#06080c]';

    return (
        <Link
            href={href}
            onClick={onClick}
            className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] leading-none transition-all duration-150 ${
                active
                    ? (accent === 'red'
                        ? 'bg-gradient-to-r from-red-500/15 to-transparent text-white border-l-2 border-red-500'
                        : 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-300 border-l-2 border-amber-500')
                    : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
            }`}
        >
            {emoji ? (
                <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[13px] flex-shrink-0 transition-all ${active ? activeIconBg : 'bg-white/[0.06] group-hover:bg-white/[0.12]'}`}>
                    {emoji}
                </span>
            ) : (
                <span className={`flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 transition-all ${active ? activeIconBg : 'bg-white/[0.06] text-white/50 group-hover:bg-white/[0.12] group-hover:text-white/80'}`}>
                    {icon}
                </span>
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
            {active
                ? <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${activeAccentDot}`} />
                : <ChevronRight size={10} className="text-white/25 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            }
        </Link>
    );
}

// ── Sports list ────────────────────────────────────────────────────────────
function DesktopSportsList({ selectedSportId, pathname, onSelectSport }: {
    selectedSportId?: string | null;
    pathname: string;
    onSelectSport?: (id: string) => void;
}) {
    const [showAll, setShowAll] = useState(false);
    const INITIAL_COUNT = 10;
    const displayedSr = useMemo(() => showAll ? SR_SPORTS : SR_SPORTS.slice(0, INITIAL_COUNT), [showAll]);
    const isAllPage = pathname === '/sports';

    return (
        <div className="space-y-0.5">
            <SubItem href="/sports" label="All Sports" emoji="🏆" active={isAllPage} />
            {displayedSr.map((sport) => {
                const encodedId = encodeURIComponent(sport.id);
                const active = selectedSportId === sport.id || pathname.includes(encodedId + '/') || pathname.endsWith(encodedId);
                return (
                    <SubItem
                        key={`ds-${sport.id}`}
                        href={`/sports/league/${encodeURIComponent(sport.id)}`}
                        label={sport.label}
                        emoji={sport.emoji}
                        active={active}
                        onClick={() => onSelectSport?.(sport.id)}
                    />
                );
            })}
            {SR_SPORTS.length > INITIAL_COUNT && (
                <button
                    onClick={() => setShowAll(v => !v)}
                    className="flex w-full items-center justify-between rounded-md bg-amber-500/[0.08] px-2.5 py-2 text-[11px] font-semibold text-amber-400/80 transition-all hover:bg-amber-500/[0.14] hover:text-amber-300"
                >
                    <span>{showAll ? 'Show Less' : `Show All ${SR_SPORTS.length} Sports`}</span>
                    <ChevronDown size={11} className={`transition-transform duration-200 ${showAll ? '' : '-rotate-90'}`} />
                </button>
            )}
        </div>
    );
}


// ── Main nav card ──────────────────────────────────────────────────────────
function NavCard({
    id, label, href, icon: Icon, iconClass, active, expandable, isOpen,
    onNavigate, onToggle, children,
}: {
    id: string; label: string; href: string;
    icon: React.ElementType; iconClass: string; active: boolean;
    expandable: boolean; isOpen: boolean;
    onNavigate: () => void; onToggle: () => void;
    children?: React.ReactNode;
}) {
    return (
        <div className={`overflow-hidden rounded-xl transition-all duration-200 ${
            active || isOpen
                ? 'bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-white/[0.08]'
                : 'bg-white/[0.02] hover:bg-white/[0.04] border border-transparent'
        }`}>
            <div className="flex items-center gap-2.5 px-3 py-2.5">
                <Link
                    href={href}
                    onClick={onNavigate}
                    className="flex min-w-0 flex-1 items-center gap-2.5"
                >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0 transition-all ${
                        active || isOpen ? iconClass : iconClass + ' opacity-80'
                    }`}>
                        <Icon size={14} />
                    </span>
                    <span className={`truncate text-[12px] font-semibold tracking-[-0.01em] transition-colors ${active || isOpen ? 'text-white' : 'text-white/90'}`}>
                        {label}
                    </span>
                </Link>

                {expandable ? (
                    <button
                        type="button"
                        onClick={onToggle}
                        className={`flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 transition-all ${
                            isOpen
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-white/[0.06] text-white/30 hover:bg-amber-500/15 hover:text-amber-400'
                        }`}
                        aria-label={`Toggle ${label}`}
                    >
                        <ChevronDown size={11} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                ) : (
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 transition-all ${
                        active ? 'bg-amber-500/20 text-amber-400' : 'bg-white/[0.06] text-white/25'
                    }`}>
                        <ChevronRight size={11} />
                    </div>
                )}
            </div>

            {expandable && isOpen && (
                <div className="px-2.5 pb-2.5 pt-0">
                    <div className="mb-2 h-px bg-white/[0.06]" />
                    {children}
                </div>
            )}
        </div>
    );
}

// ── Utility row ────────────────────────────────────────────────────────────
function UtilityCard({
    href, label, icon: Icon, iconClass, active, badge, onNavigate,
}: {
    href: string; label: string;
    icon: React.ElementType; iconClass: string; active: boolean;
    badge?: string; onNavigate: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-2.5 py-[9px] transition-all duration-150 ${
                active
                    ? 'bg-amber-500/10 text-white'
                    : 'text-white hover:bg-white/[0.05]'
            }`}
        >
            <span className={`flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 ${iconClass}`}>
                <Icon size={12} />
            </span>
            <span className={`min-w-0 flex-1 truncate text-[11px] font-medium tracking-[-0.01em]`}>{label}</span>
            {badge ? (
                <span className="rounded-full bg-emerald-500 px-1.5 py-px text-[8px] font-black uppercase text-[#06080c] flex-shrink-0 leading-none">
                    {badge}
                </span>
            ) : (
                <ChevronRight size={10} className={`flex-shrink-0 ${active ? 'text-amber-400' : 'text-white/25'}`} />
            )}
        </Link>
    );
}

// ── Inner sidebar ──────────────────────────────────────────────────────────
function LeftSidebarWithSearchParams({ selectedSportId, onSelectSport, collapsedOnly = false }: LeftSidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category');

    const { user } = useAuth();
    const fantasyAllowed = !!user;

    const [activeRailItem, setActiveRailItem] = useState<string>('casino');
    const [isSubRailOpen, setIsSubRailOpen] = useState(!collapsedOnly);
    const [casinoCategories, setCasinoCategories] = useState<Category[]>([]);
    const [liveCategories, setLiveCategories] = useState<Category[]>([]);
    const [dailyRewardsHidden, setDailyRewardsHidden] = useState(false);

    useEffect(() => {
        fetch('/api/daily-checkin/config', { cache: 'no-store' })
            .then(r => r.json())
            .then(d => { if (d?.hidden === true) setDailyRewardsHidden(true); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                try {
                    const catRes = await fetch('/api/sidebar-categories');
                    if (catRes.ok) {
                        const { categories } = await catRes.json();
                        if (Array.isArray(categories) && categories.length > 0) {
                            setCasinoCategories(categories.slice(0, 8).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name, path: `/casino?category=${c.id}` })));
                        } else throw new Error('empty');
                    } else throw new Error('api-unavailable');
                } catch {
                    try {
                        const cats = await casinoService.getCategories('casino');
                        if (cats && Array.isArray(cats)) {
                            setCasinoCategories(
                                cats.map((c: string | { id: string; name?: string }) => {
                                    const name = typeof c === 'string' ? c : c.name || c.id || 'Category';
                                    const id = typeof c === 'string' ? c : c.id;
                                    return { id, name, path: `/casino?category=${id}` };
                                }).filter((c: Category) => c.id !== 'live').slice(0, 8)
                            );
                        } else throw new Error('no-cats');
                    } catch {
                        setCasinoCategories([
                            { id: 'slots',     name: 'Slots',       path: '/casino?category=slots' },
                            { id: 'live',      name: 'Live Casino', path: '/casino?category=live' },
                            { id: 'table',     name: 'Table Games', path: '/casino?category=table' },
                            { id: 'crash',     name: 'Crash',       path: '/casino?category=crash' },
                            { id: 'originals', name: 'Originals',   path: '/casino?category=originals' },
                            { id: 'popular',   name: 'Popular',     path: '/casino?category=popular' },
                            { id: 'new',       name: 'New Games',   path: '/casino?category=new' },
                            { id: 'jackpot',   name: 'Jackpot',     path: '/casino?category=jackpot' },
                        ]);
                    }
                }
                try {
                    const liveCats = await casinoService.getCategories('live');
                    if (liveCats && Array.isArray(liveCats)) {
                        setLiveCategories(liveCats.map((c: string | { id: string; name?: string }) => {
                            const name = typeof c === 'string' ? c : c.name || c.id || 'Category';
                            const id = typeof c === 'string' ? c : c.id;
                            return { id, name, path: `/live-dealers?category=${id}` };
                        }));
                    } else throw new Error('no-live');
                } catch {
                    setLiveCategories([
                        { id: 'blackjack', name: 'Blackjack',  path: '/live-dealers?category=blackjack' },
                        { id: 'roulette',  name: 'Roulette',   path: '/live-dealers?category=roulette' },
                        { id: 'baccarat',  name: 'Baccarat',   path: '/live-dealers?category=baccarat' },
                        { id: 'shows',     name: 'Game Shows', path: '/live-dealers?category=shows' },
                    ]);
                }
            } catch (e) { console.error('Sidebar fetch error', e); }
        };
        fetchData();
    }, []);

    useEffect(() => {
        let newItem = activeRailItem;
        let shouldClose = false;
        if (pathname === '/') { newItem = 'home'; shouldClose = true; }
        else if (pathname.includes('/zeero-games')) { newItem = 'originals'; shouldClose = true; }
        else if (pathname.includes('/casino') && !pathname.includes('type=live')) newItem = 'casino';
        else if (pathname.includes('/live-dealers') || (pathname.includes('/casino') && pathname.includes('type=live'))) newItem = 'live';
        else if (pathname.includes('/sports') || selectedSportId) newItem = 'sports';
        else if (pathname.includes('/fantasy')) { newItem = 'fantasy'; shouldClose = true; }
        else if (pathname.includes('/promotions')) newItem = 'promotions';
        else if (pathname.includes('/daily-rewards')) newItem = 'daily-rewards';
        else if (pathname.includes('/vip')) newItem = 'vip';
        else if (pathname.includes('/referral')) newItem = 'referral';
        else if (pathname.includes('/support') || pathname.includes('/fairness') || pathname.includes('/legal')) newItem = 'support';

        if (newItem !== activeRailItem) {
            setTimeout(() => {
                setActiveRailItem(newItem);
                if (shouldClose || collapsedOnly) setIsSubRailOpen(false);
                else if (newItem !== 'home' && !isSubRailOpen) setIsSubRailOpen(true);
            }, 0);
        } else if ((newItem === 'home' || collapsedOnly) && isSubRailOpen) {
            setTimeout(() => setIsSubRailOpen(false), 0);
        }
    }, [pathname, selectedSportId, activeRailItem, isSubRailOpen, collapsedOnly]);

    const [openDesktopSection, setOpenDesktopSection] = useState<string | null>('casino');
    useEffect(() => {
        if (collapsedOnly) return;
        if (['casino', 'sports', 'live'].includes(activeRailItem)) setOpenDesktopSection(activeRailItem);
        else if (activeRailItem === 'home') setOpenDesktopSection(null);
    }, [activeRailItem, collapsedOnly]);

    const { isMobileSidebarOpen, closeMobileSidebar } = useLayout();
    useEffect(() => { closeMobileSidebar(); }, [pathname, closeMobileSidebar]);

    // ── Sub-content renderer ──────────────────────────────────────────────
    const [showAllCasino, setShowAllCasino] = useState(false);
    const CASINO_INITIAL = 10;
    const displayedCasino = useMemo(
        () => showAllCasino ? casinoCategories : casinoCategories.slice(0, CASINO_INITIAL),
        [showAllCasino, casinoCategories]
    );

    const renderExpanded = (sectionId: string) => {
        if (sectionId === 'casino') {
            return (
                <div className="space-y-0.5">
                    {displayedCasino.map((cat) => (
                        <SubItem
                            key={`dc-${cat.id}`}
                            href={`/casino?category=${cat.id}`}
                            label={cat.name}
                            icon={getCasinoIcon(cat.id)}
                            active={pathname === '/casino' && currentCategory === cat.id}
                        />
                    ))}
                    {casinoCategories.length > CASINO_INITIAL && (
                        <button
                            onClick={() => setShowAllCasino(v => !v)}
                            className="flex w-full items-center justify-between rounded-md bg-amber-500/[0.08] px-2.5 py-2 text-[11px] font-semibold text-amber-400/80 transition-all hover:bg-amber-500/[0.14] hover:text-amber-300"
                        >
                            <span>{showAllCasino ? 'Show Less' : `Show All ${casinoCategories.length} Categories`}</span>
                            <ChevronDown size={11} className={`transition-transform duration-200 ${showAllCasino ? '' : '-rotate-90'}`} />
                        </button>
                    )}
                    <SubItem
                        href="/casino"
                        label="View All Casino"
                        icon={<ChevronRight size={10} />}
                        active={pathname === '/casino' && !currentCategory}
                    />
                </div>
            );
        }
        if (sectionId === 'sports') {
            return <DesktopSportsList selectedSportId={selectedSportId} pathname={pathname} onSelectSport={onSelectSport ?? undefined} />;
        }
        if (sectionId === 'live') {
            const STATIC_LIVE = [
                { id: 'all',        name: 'All Games',  path: '/live-dealers' },
                { id: 'roulette',   name: 'Roulette',   path: '/live-dealers?category=roulette' },
                { id: 'blackjack',  name: 'Blackjack',  path: '/live-dealers?category=blackjack' },
                { id: 'baccarat',   name: 'Baccarat',   path: '/live-dealers?category=baccarat' },
                { id: 'game_shows', name: 'Game Shows', path: '/live-dealers?category=game_shows' },
                { id: 'poker',      name: 'Poker',      path: '/live-dealers?category=poker' },
            ];
            const staticIds = new Set(STATIC_LIVE.map(c => c.id));
            const extraDynamic = liveCategories.filter(c => !staticIds.has(c.id));
            const allLiveCats = [...STATIC_LIVE, ...extraDynamic];
            return (
                <div className="space-y-0.5">
                    {allLiveCats.map((cat) => {
                        const isActive = cat.id === 'all'
                            ? pathname === '/live-dealers' && !currentCategory
                            : pathname === '/live-dealers' && currentCategory === cat.id;
                        return (
                            <SubItem
                                key={`dl-${cat.id}`}
                                href={cat.path}
                                label={cat.name}
                                icon={getLiveIcon(cat.id)}
                                accent="red"
                                active={isActive}
                            />
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    // ── Icon rail (collapsed-only variant) ────────────────────────────────
    if (collapsedOnly) {
        return (
            <>
                {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden" onClick={closeMobileSidebar} />}
                <aside className="hidden md:flex md:sticky md:top-[64px] h-[calc(100vh-64px)] flex-shrink-0 border-r border-white/[0.06] bg-[#06080c]/80 backdrop-blur-md" style={{ width: 60 }}>
                    <div className="flex w-full flex-col items-center gap-2 overflow-y-auto px-2 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-500/10 text-amber-400 mb-1">
                            <Crown size={15} />
                        </div>
                        {[
                            { href: '/',             label: 'Home',   icon: Home,        active: pathname === '/',               onClick: () => { setActiveRailItem('home'); setIsSubRailOpen(false); } },
                            { href: '/casino',       label: 'Casino', icon: Gamepad2,    active: activeRailItem === 'casino',    onClick: () => { setActiveRailItem('casino'); setIsSubRailOpen(true); } },
                            { href: '/sports',       label: 'Sports', icon: Trophy,      active: activeRailItem === 'sports',    onClick: () => { setActiveRailItem('sports'); setIsSubRailOpen(true); } },
                            ...(fantasyAllowed ? [{ href: '/fantasy', label: 'Fantasy', icon: Swords, active: activeRailItem === 'fantasy', onClick: () => { setActiveRailItem('fantasy'); setIsSubRailOpen(false); } }] : []),
                            { href: '/live-dealers', label: 'Live',   icon: MonitorPlay, active: activeRailItem === 'live',      onClick: () => { setActiveRailItem('live'); setIsSubRailOpen(true); } },
                            { href: '/promotions',   label: 'Offers', icon: Zap,         active: activeRailItem === 'promotions', onClick: () => setActiveRailItem('promotions') },
                            ...(!dailyRewardsHidden ? [{ href: '/daily-rewards', label: 'Rewards', icon: Sparkles,  active: pathname.startsWith('/daily-rewards'), onClick: () => setActiveRailItem('daily-rewards') }] : []),
                            { href: '/vip',          label: 'VIP',    icon: Crown,       active: pathname.startsWith('/vip'),   onClick: () => setActiveRailItem('vip') },
                        ].map(({ href, label, icon: Icon, active, onClick }) => (
                            <Link key={href} href={href} onClick={onClick} title={label}
                                className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                                    active
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white'
                                }`}
                            >
                                <Icon size={17} />
                                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-[#0b0f15] border border-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 z-50">{label}</span>
                            </Link>
                        ))}
                    </div>
                </aside>
            </>
        );
    }

    // ── Full sidebar ──────────────────────────────────────────────────────
    const utilityItems: { href: string; label: string; icon: React.ElementType; iconClass: string; active: boolean; badge?: string }[] = [
        { href: '/vip',              label: 'VIP Club',         icon: Crown,         iconClass: 'bg-amber-500/20 text-amber-400',        active: pathname.startsWith('/vip') },
        { href: '/referral',         label: 'Refer & Earn',     icon: Gift,          iconClass: 'bg-emerald-500/15 text-emerald-400',    active: pathname === '/referral' },
        { href: '/profile/referral', label: 'My Referrals',     icon: Users,         iconClass: 'bg-amber-500/10 text-amber-400',        active: pathname === '/profile/referral' },
        { href: '/support',          label: 'Live Support',     icon: MessageCircle, iconClass: 'bg-emerald-500/15 text-emerald-400',    active: pathname === '/support',            badge: '24/7' },
        { href: '/support/help-center', label: 'Help Center',   icon: HelpCircle,   iconClass: 'bg-white/[0.06] text-white/60',          active: pathname === '/support/help-center' },
        { href: '/fairness',         label: 'Provably Fair',    icon: Shield,        iconClass: 'bg-white/[0.06] text-white/60',          active: pathname === '/fairness' },
        { href: '/legal/privacy-policy', label: 'Privacy Policy', icon: Lock,        iconClass: 'bg-white/[0.06] text-white/50',          active: pathname === '/legal/privacy-policy' },
        { href: '/legal/terms',      label: 'Terms of Service', icon: FileText,      iconClass: 'bg-white/[0.06] text-white/50',          active: pathname === '/legal/terms' },
        { href: '/legal/rules',      label: 'Betting Rules',    icon: BookOpen,      iconClass: 'bg-white/[0.06] text-white/50',          active: pathname === '/legal/rules' },
    ];

    return (
        <>
            {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden" onClick={closeMobileSidebar} />}

            <aside className="hidden md:block md:sticky md:top-[64px] h-[calc(100vh-64px)] w-[240px] flex-shrink-0 border-r border-white/[0.06] bg-[#06080c]/80 backdrop-blur-md">
                <div className="h-full overflow-y-auto py-3 no-scrollbar">

                    {/* Logo */}
                    <div className="flex items-center gap-2.5 px-3.5 pb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-500/5 text-amber-400 flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                            <Sparkles size={16} />
                        </div>
                        <Link href="/" className="min-w-0">
                            <p className="text-[7px] font-bold uppercase tracking-[0.25em] text-amber-400/60 leading-none">Play Hub</p>
                            <p className="text-[15px] font-black leading-tight tracking-[-0.04em] text-white">odd69</p>
                        </Link>
                    </div>

                    <div className="px-2.5 space-y-1">

                        {/* Primary Nav */}
                        {[
                            { id: 'home',       label: 'Home',         href: '/',             icon: Home,        iconClass: 'bg-white/[0.08] text-white',             expandable: false, active: pathname === '/' },
                            { id: 'casino',     label: 'Casino',       href: '/casino',       icon: Gamepad2,    iconClass: 'bg-amber-500/20 text-amber-400',         expandable: true,  active: activeRailItem === 'casino' },
                            { id: 'sports',     label: 'Sports',       href: '/sports',       icon: Trophy,      iconClass: 'bg-amber-500/20 text-amber-400',         expandable: true,  active: activeRailItem === 'sports' },
                            ...(fantasyAllowed ? [{ id: 'fantasy', label: 'Fantasy', href: '/fantasy', icon: Swords, iconClass: 'bg-teal-500/20 text-teal-400', expandable: false, active: activeRailItem === 'fantasy' }] : []),
                            { id: 'live',       label: 'Live Dealers', href: '/live-dealers', icon: MonitorPlay, iconClass: 'bg-red-500/16 text-red-400',              expandable: true,  active: activeRailItem === 'live' },
                            ...(!dailyRewardsHidden ? [{ id: 'daily-rewards', label: 'Daily Rewards', href: '/daily-rewards', icon: Sparkles, iconClass: 'bg-amber-500/16 text-amber-400',       expandable: false, active: pathname.startsWith('/daily-rewards') }] : []),
                        ].map(({ id, label, href, icon, iconClass, active, expandable }) => (
                            <NavCard
                                key={id}
                                id={id} label={label} href={href}
                                icon={icon} iconClass={iconClass} active={active}
                                expandable={expandable} isOpen={openDesktopSection === id}
                                onNavigate={() => {
                                    setActiveRailItem(id);
                                    if (expandable) setOpenDesktopSection(id);
                                    else setOpenDesktopSection(null);
                                }}
                                onToggle={() => setOpenDesktopSection(prev => prev === id ? null : id)}
                            >
                                {renderExpanded(id)}
                            </NavCard>
                        ))}

                        {/* Promotions — accented card */}
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-0.5">
                            <NavCard
                                id="promotions" label="Promotions" href="/promotions"
                                icon={Zap} iconClass="bg-amber-500/20 text-amber-400" active={activeRailItem === 'promotions'}
                                expandable={false} isOpen={false}
                                onNavigate={() => { setActiveRailItem('promotions'); setOpenDesktopSection(null); }}
                                onToggle={() => {}}
                            />
                        </div>

                        {/* Utility big card */}
                        <div className="mt-1.5 overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.06]">
                            {utilityItems.map(({ href, label, icon, iconClass, active, badge }, i) => (
                                <React.Fragment key={href}>
                                    <UtilityCard
                                        href={href} label={label}
                                        icon={icon} iconClass={iconClass} active={active} badge={badge}
                                        onNavigate={() => setActiveRailItem(
                                            href.includes('/referral') ? 'referral'
                                                : href.includes('/support') || href.includes('/fairness') || href.includes('/legal') ? 'support'
                                                    : href.includes('/vip') ? 'vip'
                                                        : activeRailItem
                                        )}
                                    />
                                    {i < utilityItems.length - 1 && (
                                        <div className="mx-2.5 h-px bg-white/[0.06]" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                    </div>
                    <div className="h-4" />
                </div>
            </aside>
        </>
    );
}

export default function LeftSidebar(props: LeftSidebarProps) {
    return (
        <Suspense fallback={null}>
            <LeftSidebarWithSearchParams {...props} />
        </Suspense>
    );
}
