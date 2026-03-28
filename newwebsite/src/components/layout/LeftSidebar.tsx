"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    Gamepad2, Trophy, Dices, Crown, Home,
    Zap, Users, Gift,
    ChevronDown, ChevronRight,
    MonitorPlay, Tv, Star, Flame, Activity, Disc, Gem,
    Swords, Target, Flag, Car, Bike, Snowflake, Anchor, Crosshair,
    HelpCircle, Shield, Lock, FileText, BookOpen, MessageCircle, Bomb
} from 'lucide-react';
import api from '@/services/api';
import { casinoService } from '@/services/casino';
import { useLayout } from '@/context/LayoutContext';

// --- Types ---
interface AdminSport {
    sport_id?: string;
    sport_name?: string;
    isVisible?: boolean;
    eid?: number;
    id?: number;
    ename?: string;
    name?: string;
    active?: boolean;
    tab?: boolean;
    isdefault?: boolean;
    oid?: number;
}

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

// --- Icon Helpers ---
const getSportIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('ecricket')) return <Gamepad2 size={14} />;
    if (n.includes('cricket')) return <Trophy size={14} />;
    if (n.includes('soccer')) return <Activity size={14} />;
    if (n.includes('kabaddi')) return <Swords size={14} />;
    if (n.includes('tennis') && !n.includes('table')) return <Activity size={14} />;
    if (n.includes('table tennis')) return <Dices size={14} />;
    if (n.includes('basket')) return <Dices size={14} />;
    if (n.includes('baseball')) return <Target size={14} />;
    if (n.includes('volleyball') || n.includes('handball')) return <Activity size={14} />;
    if (n.includes('hockey')) return <Flame size={14} />;
    if (n.includes('boxing') || n.includes('mma') || n.includes('fighting')) return <Swords size={14} />;
    if (n.includes('football')) return <Trophy size={14} />;
    if (n.includes('chess')) return <Crown size={14} />;
    if (n.includes('formula') || n.includes('racing') || n.includes('nascar') || n.includes('touring')) return <Car size={14} />;
    if (n.includes('cycling')) return <Bike size={14} />;
    if (n.includes('darts') || n.includes('snooker')) return <Crosshair size={14} />;
    if (n.includes('golf')) return <Flag size={14} />;
    if (n.includes('water') || n.includes('swimming')) return <Anchor size={14} />;
    if (n.includes('ski') || n.includes('snow') || n.includes('ice') || n.includes('winter') || n.includes('luge') || n.includes('bobsleigh') || n.includes('biathlon')) return <Snowflake size={14} />;
    if (n.includes('esport') || n.includes('counter') || n.includes('dota') || n.includes('league') || n.includes('e-') || n.startsWith('e') && n.length > 2) return <Gamepad2 size={14} />;
    return <Trophy size={14} />;
};

const getCasinoIcon = (id: string) => {
    if (id.includes('slots')) return <Dices size={14} />;
    if (id.includes('table')) return <Gamepad2 size={14} />;
    if (id.includes('original')) return <Star size={14} />;
    return <Dices size={14} />;
};

const getLiveIcon = (id: string) => {
    if (id.includes('blackjack')) return <Dices size={14} />;
    if (id.includes('roulette')) return <Disc size={14} />;
    if (id.includes('baccarat')) return <Gem size={14} />;
    if (id.includes('show')) return <Tv size={14} />;
    return <MonitorPlay size={14} />;
};

// --- Nav Item Component ---
function NavItem({ href, icon: Icon, label, active, badge, badgeColor, onClick }: {
    href: string;
    icon: React.ElementType;
    label: string;
    active: boolean;
    badge?: string;
    badgeColor?: string;
    onClick?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group
                ${active
                    ? 'bg-brand-gold/10 text-brand-gold font-bold'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                }`}
        >
            <Icon size={16} className={active ? 'text-brand-gold' : 'text-white/30 group-hover:text-white/60'} />
            <span className="flex-1 truncate">{label}</span>
            {badge && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full text-white ${badgeColor || 'bg-white/10'}`}>{badge}</span>
            )}
        </Link>
    );
}

// --- Collapsible Section ---
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false, active = false }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    active?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    useEffect(() => {
        if (active && !open) setOpen(true);
    }, [active]);

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group
                    ${active
                        ? 'bg-brand-gold/10 text-brand-gold font-bold'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                    }`}
            >
                <Icon size={16} className={active ? 'text-brand-gold' : 'text-white/30 group-hover:text-white/60'} />
                <span className="flex-1 text-left truncate">{title}</span>
                <ChevronDown size={12} className={`text-white/20 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="ml-5 pl-3 border-l border-white/[0.04] mt-1 space-y-0.5">
                    {children}
                </div>
            )}
        </div>
    );
}

// --- Sub-link inside collapsible ---
function SubLink({ href, icon, label, active }: { href: string; icon?: React.ReactNode; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-all
                ${active
                    ? 'text-brand-gold font-bold bg-brand-gold/8'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
        >
            {icon && <span className={active ? 'text-brand-gold' : 'text-white/20'}>{icon}</span>}
            <span className="truncate">{label}</span>
        </Link>
    );
}

// --- Main Sidebar ---
function LeftSidebarWithSearchParams({ selectedSportId, onSelectSport, collapsedOnly = false }: LeftSidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category');

    // Data State
    const [sportsData, setSportsData] = useState<AdminSport[]>([]);
    const [casinoCategories, setCasinoCategories] = useState<Category[]>([]);
    const [liveCategories, setLiveCategories] = useState<Category[]>([]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const sportsRes = await api.get('/sports/list');
                const rawSports = Array.isArray(sportsRes.data)
                    ? sportsRes.data
                    : Array.isArray(sportsRes.data?.data) ? sportsRes.data.data : [];
                if (rawSports.length > 0) {
                    setSportsData(rawSports.filter((s: AdminSport) => s.tab !== false));
                }
                try {
                    const casinoCats = await casinoService.getCategories('casino');
                    if (casinoCats && Array.isArray(casinoCats)) {
                        setCasinoCategories(casinoCats.map((c: string | { id: string; name?: string }) => {
                            const name = typeof c === 'string' ? c : c.name || c.id || "Category";
                            return { id: typeof c === 'string' ? c : c.id, name: name, path: `/casino?category=${typeof c === 'string' ? c : c.id}` };
                        }).filter((c: Category) => c.id !== 'live'));
                    } else {
                        setCasinoCategories([
                            { id: 'slots', name: 'Slots', path: '/casino?category=slots' },
                            { id: 'table', name: 'Table Games', path: '/casino?category=table' },
                            { id: 'originals', name: 'Originals', path: '/casino?category=originals' },
                        ]);
                    }
                } catch {
                    setCasinoCategories([
                        { id: 'slots', name: 'Slots', path: '/casino?category=slots' },
                        { id: 'table', name: 'Table Games', path: '/casino?category=table' },
                        { id: 'originals', name: 'Originals', path: '/casino?category=originals' },
                    ]);
                }
                try {
                    const liveCats = await casinoService.getCategories('live');
                    if (liveCats && Array.isArray(liveCats)) {
                        setLiveCategories(liveCats.map((c: string | { id: string; name?: string }) => {
                            const name = typeof c === 'string' ? c : c.name || c.id || "Category";
                            return { id: typeof c === 'string' ? c : c.id, name: name, path: `/live-dealers?category=${typeof c === 'string' ? c : c.id}` };
                        }));
                    } else {
                        setLiveCategories([
                            { id: 'blackjack', name: 'Blackjack', path: '/live-dealers?category=blackjack' },
                            { id: 'roulette', name: 'Roulette', path: '/live-dealers?category=roulette' },
                            { id: 'baccarat', name: 'Baccarat', path: '/live-dealers?category=baccarat' },
                            { id: 'shows', name: 'Game Shows', path: '/live-dealers?category=shows' },
                        ]);
                    }
                } catch {
                    setLiveCategories([
                        { id: 'blackjack', name: 'Blackjack', path: '/live-dealers?category=blackjack' },
                        { id: 'roulette', name: 'Roulette', path: '/live-dealers?category=roulette' },
                        { id: 'baccarat', name: 'Baccarat', path: '/live-dealers?category=baccarat' },
                        { id: 'shows', name: 'Game Shows', path: '/live-dealers?category=shows' },
                    ]);
                }
            } catch (error) {
                console.error("Error fetching sidebar data", error);
            }
        };
        fetchData();
    }, []);

    const { isMobileSidebarOpen, closeMobileSidebar } = useLayout();

    // Close mobile sidebar on route change
    useEffect(() => {
        closeMobileSidebar();
    }, [pathname, closeMobileSidebar]);

    // Active state helpers
    const isCasinoActive = pathname.includes('/casino') && !pathname.includes('type=live');
    const isSportsActive = pathname.includes('/sports') || !!selectedSportId;
    const isLiveActive = pathname.includes('/live-dealers') || (pathname.includes('/casino') && pathname.includes('type=live'));

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={closeMobileSidebar}
                />
            )}

            <aside className={`
                fixed md:sticky top-[56px] md:top-[60px] h-[calc(100vh-56px)] md:h-[calc(100vh-60px)] z-50 md:z-40
                w-[220px] bg-[#0c0e12] border-r border-white/[0.03] flex flex-col transition-transform duration-300
                ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>

                {/* Scrollable Navigation */}
                <div className="flex-1 overflow-y-auto scrollbar-none px-2.5 py-4 space-y-1">

                    {/* ── Main Navigation ── */}
                    <NavItem href="/" icon={Home} label="Home" active={pathname === '/'} />
                    <NavItem href="/zeero-games" icon={Bomb} label="Originals" active={pathname.includes('/zeero-games')} />

                    <div className="h-px bg-white/[0.04] my-2 mx-2" />

                    {/* ── Casino (collapsible) ── */}
                    <CollapsibleSection title="Casino" icon={Gamepad2} active={isCasinoActive} defaultOpen={isCasinoActive}>
                        {casinoCategories.map(cat => (
                            <SubLink
                                key={`casino-${cat.id}`}
                                href={cat.path}
                                icon={getCasinoIcon(cat.id)}
                                label={cat.name}
                                active={currentCategory === cat.id && pathname.includes('/casino')}
                            />
                        ))}
                        <SubLink href="/casino" icon={<ChevronRight size={12} />} label="View All" active={false} />
                    </CollapsibleSection>

                    {/* ── Sports (collapsible) ── */}
                    <CollapsibleSection title="Sports" icon={Trophy} active={isSportsActive} defaultOpen={isSportsActive}>
                        {sportsData.map(sport => {
                            const sportId = (sport.sport_id ?? sport.eid ?? sport.id ?? 0).toString();
                            const sportName = sport.sport_name ?? sport.ename ?? sport.name ?? '';
                            return (
                                <SubLink
                                    key={`sport-${sportId}`}
                                    href={`/sports?sport_id=${sportId}`}
                                    icon={getSportIcon(sportName)}
                                    label={sportName}
                                    active={selectedSportId === sportId}
                                />
                            );
                        })}
                        <SubLink href="/sports" icon={<ChevronRight size={12} />} label="View All" active={false} />
                    </CollapsibleSection>

                    {/* ── Live Dealers (collapsible) ── */}
                    <CollapsibleSection title="Live Dealers" icon={MonitorPlay} active={isLiveActive} defaultOpen={isLiveActive}>
                        {liveCategories.map(cat => (
                            <SubLink
                                key={`live-${cat.id}`}
                                href={cat.path}
                                icon={getLiveIcon(cat.id)}
                                label={cat.name}
                                active={currentCategory === cat.id && pathname.includes('/live-dealers')}
                            />
                        ))}
                    </CollapsibleSection>

                    <div className="h-px bg-white/[0.04] my-2 mx-2" />

                    {/* ── Secondary Links ── */}
                    <NavItem href="/promotions" icon={Zap} label="Promotions" active={pathname.includes('/promotions')} />
                    <NavItem href="/vip" icon={Crown} label="VIP Club" active={pathname.includes('/vip')} />
                    <NavItem href="/referral" icon={Gift} label="Refer & Earn" active={pathname.includes('/referral')} />

                    <div className="h-px bg-white/[0.04] my-2 mx-2" />

                    {/* ── Support & Legal ── */}
                    <NavItem href="/support" icon={MessageCircle} label="Support" active={pathname === '/support'} badge="24/7" badgeColor="bg-emerald-500" />
                    <NavItem href="/support/help-center" icon={HelpCircle} label="Help Center" active={pathname.includes('/help-center')} />
                    <NavItem href="/fairness" icon={Shield} label="Fairness" active={pathname.includes('/fairness')} />

                    <div className="h-px bg-white/[0.04] my-2 mx-2" />

                    <p className="text-[9px] font-bold text-white/10 uppercase tracking-[0.15em] px-3 pt-1 pb-0.5">Legal</p>
                    <NavItem href="/legal/privacy-policy" icon={Lock} label="Privacy Policy" active={pathname.includes('/privacy-policy')} />
                    <NavItem href="/legal/terms" icon={FileText} label="Terms of Service" active={pathname.includes('/legal/terms')} />
                    <NavItem href="/legal/rules" icon={BookOpen} label="Betting Rules" active={pathname.includes('/legal/rules')} />
                </div>

            </aside>
        </>
    );
}

// Exported component wraps the inner one in Suspense
export default function LeftSidebar(props: LeftSidebarProps) {
    return (
        <Suspense fallback={null}>
            <LeftSidebarWithSearchParams {...props} />
        </Suspense>
    );
}
