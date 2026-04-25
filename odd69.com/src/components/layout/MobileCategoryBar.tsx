"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Gamepad2, Trophy, MonitorPlay, Dices, Disc, Gem, Tv, Star, Activity } from 'lucide-react';
import api from '@/services/api';
import { casinoService } from '@/services/casino';

// --- Types ---
interface Category {
    id: string;
    name: string;
    path: string;
    icon?: React.ReactNode;
}

const getSportIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('ecricket')) return <Gamepad2 size={16} />;
    if (n.includes('cricket')) return <Trophy size={16} />;
    if (n.includes('soccer')) return <Activity size={16} />;
    return <Trophy size={16} />;
};

const getCasinoIcon = (id: string) => {
    if (id.includes('slots')) return <Dices size={16} />;
    if (id.includes('table')) return <Gamepad2 size={16} />;
    if (id.includes('original')) return <Star size={16} />;
    return <Dices size={16} />;
};

const getLiveIcon = (id: string) => {
    if (id.includes('blackjack')) return <Dices size={16} />;
    if (id.includes('roulette')) return <Disc size={16} />;
    if (id.includes('baccarat')) return <Gem size={16} />;
    if (id.includes('show')) return <Tv size={16} />;
    return <MonitorPlay size={16} />;
};

function MobileCategoryBarInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category'); // For casino/live

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            let newCategories: Category[] = [];

            try {
                if (pathname.includes('/casino') && !pathname.includes('type=live')) {
                    // Casino Categories
                    try {
                        const casinoCats = await casinoService.getCategories('casino');
                        if (casinoCats && Array.isArray(casinoCats)) {
                            newCategories = casinoCats.map((c: string | { id: string; name?: string }) => {
                                const id = typeof c === 'string' ? c : c.id;
                                const name = typeof c === 'string' ? c : c.name || c.id || "Category";
                                return {
                                    id,
                                    name,
                                    path: `/casino?category=${id}`,
                                    icon: getCasinoIcon(id)
                                };
                            }).filter((c: Category) => c.id !== 'live');
                        }
                    } catch {
                        // Fallback
                        newCategories = [
                            { id: 'slots', name: 'Slots', path: '/casino?category=slots', icon: <Dices size={16} /> },
                            { id: 'table', name: 'Table Games', path: '/casino?category=table', icon: <Gamepad2 size={16} /> },
                            { id: 'originals', name: 'Originals', path: '/casino?category=originals', icon: <Star size={16} /> },
                        ];
                    }
                } else if (pathname.includes('/live-dealers') || (pathname.includes('/casino') && pathname.includes('type=live'))) {
                    // Live Categories
                    try {
                        const liveCats = await casinoService.getCategories('live');
                        if (liveCats && Array.isArray(liveCats)) {
                            newCategories = liveCats.map((c: string | { id: string; name?: string }) => {
                                const id = typeof c === 'string' ? c : c.id;
                                const name = typeof c === 'string' ? c : c.name || c.id || "Category";
                                return {
                                    id,
                                    name,
                                    path: `/live-dealers?category=${id}`,
                                    icon: getLiveIcon(id)
                                };
                            });
                        }
                    } catch {
                        newCategories = [
                            { id: 'blackjack', name: 'Blackjack', path: '/live-dealers?category=blackjack', icon: <Dices size={16} /> },
                            { id: 'roulette', name: 'Roulette', path: '/live-dealers?category=roulette', icon: <Disc size={16} /> },
                            { id: 'baccarat', name: 'Baccarat', path: '/live-dealers?category=baccarat', icon: <Gem size={16} /> },
                            { id: 'shows', name: 'Game Shows', path: '/live-dealers?category=shows', icon: <Tv size={16} /> },
                        ];
                    }
                } else if (pathname.includes('/sports')) {
                    // Sports Categories
                    try {
                        const sportsRes = await api.get('/sports/list');
                        if (sportsRes.data && Array.isArray(sportsRes.data)) {
                            newCategories = sportsRes.data.slice(0, 10).map((s: { sport_id: string; sport_name: string }) => ({
                                id: s.sport_id,
                                name: s.sport_name,
                                path: `/sports?sport=${s.sport_id}`,
                                icon: getSportIcon(s.sport_name)
                            }));
                        }
                    } catch {
                        newCategories = [
                            { id: 'cricket', name: 'Cricket', path: '/sports?sport=4', icon: <Trophy size={16} /> },
                            { id: 'soccer', name: 'Soccer', path: '/sports?sport=1', icon: <Activity size={16} /> },
                            { id: 'tennis', name: 'Tennis', path: '/sports?sport=2', icon: <Activity size={16} /> },
                        ];
                    }
                } else {
                    // No default quick links on home — bar hides itself
                    newCategories = [];
                }
            } catch (error) {
                console.error("Error fetching mobile categories", error);
            } finally {
                setCategories(newCategories);
                setLoading(false);
            }
        };

        fetchCategories();
    }, [pathname]);

    if (categories.length === 0 && !loading) return null;
    // On sports pages, sports UI renders its own sport picker
    if (pathname.includes('/sports')) return null;
    // On casino pages, casino mobile view renders its own inline category pills
    if (pathname.includes('/casino')) return null;
    // On live-dealers, live casino mobile view renders its own layout
    if (pathname.includes('/live-dealers')) return null;

    return (
        <div className="md:hidden w-full bg-[#06080c] border-b border-white/[0.06] overflow-x-auto no-scrollbar sticky top-[64px] z-40">
            <div className="flex items-center gap-2 p-3 min-w-max">
                {loading ? (
                    // Skeletons
                    [1, 2, 3, 4].map(i => <div key={i} className="h-8 w-24 bg-white/[0.04] rounded-full animate-pulse" />)
                ) : (
                    categories.map((cat) => {
                        // Active State Logic
                        let isActive = false;
                        if (pathname.includes('/sports')) {
                            // Sports active state handled by the sports page itself
                        } else {
                            isActive = currentCategory === cat.id || pathname === cat.path;
                        }

                        return (
                            <Link
                                key={cat.id}
                                href={cat.path}
                                className={`
                                    flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap border transition-all
                                    ${isActive
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        : 'bg-white/[0.03] text-white/70 border-white/[0.08] hover:bg-white/[0.05] hover:text-white'
                                    }
                                `}
                            >
                                {cat.icon}
                                {cat.name}
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default function MobileCategoryBar() {
    return (
        <Suspense fallback={null}>
            <MobileCategoryBarInner />
        </Suspense>
    );
}
