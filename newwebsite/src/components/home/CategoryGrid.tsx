'use client';

import React, { useEffect, useState } from 'react';
import { Gamepad2, Trophy, Dices, ArrowRight, Flag, Tags, Rocket, Circle, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';

interface HomeCategory {
    _id: string;
    id?: string;
    title: string;
    subtitle?: string;
    description?: string;
    image?: string;
    link: string;
    isLarge: boolean;
    order: number;
    isActive: boolean;
    style?: any;
}

const QUICK_ACCESS = [
    { id: 'poker', name: 'Poker', Icon: Dices, path: '/casino?category=poker', gradient: 'from-green-500/20 to-green-900/30', accent: 'text-green-400', glow: 'shadow-green-500/10' },
    { id: 'racing', name: 'Racing', Icon: Flag, path: '/casino?category=racing', gradient: 'from-blue-500/20 to-blue-900/30', accent: 'text-blue-400', glow: 'shadow-blue-500/10' },
    { id: 'lottery', name: 'Lottery', Icon: Tags, path: '/casino?category=lottery', gradient: 'from-purple-500/20 to-purple-900/30', accent: 'text-purple-400', glow: 'shadow-purple-500/10' },
    { id: 'crash', name: 'Instant', Icon: Rocket, path: '/casino?category=crash', gradient: 'from-orange-500/20 to-orange-900/30', accent: 'text-orange-400', glow: 'shadow-orange-500/10' },
    { id: 'bingo', name: 'Bingo', Icon: Circle, path: '/casino?category=bingo', gradient: 'from-red-500/20 to-red-900/30', accent: 'text-red-400', glow: 'shadow-red-500/10' },
    { id: 'live', name: 'Live', Icon: Zap, path: '/live-dealers', gradient: 'from-amber-500/20 to-amber-900/30', accent: 'text-amber-400', glow: 'shadow-amber-500/10' },
];

export default function CategoryGrid() {
    const [categories, setCategories] = useState<HomeCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get('/home-category');
                const raw = response.data;
                const arr: HomeCategory[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.categories) ? raw.categories : [];
                setCategories(arr.filter((c: HomeCategory) => c.isActive));
            } catch (error) { console.error("Failed to load home categories", error); }
            finally { setLoading(false); }
        };
        fetchCategories();
    }, []);

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-[80px] bg-white/[0.02] rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-[110px] bg-white/[0.02] rounded-2xl animate-pulse" />
                    <div className="h-[110px] bg-white/[0.02] rounded-2xl animate-pulse" />
                </div>
            </div>
        );
    }

    const hasAdminCats = categories.length > 0;
    const largeCats = hasAdminCats ? categories.filter(c => c.isLarge).slice(0, 2) : null;
    const hasTwoLarge = largeCats && largeCats.length >= 2;

    return (
        <div className="space-y-3">
            {/* ── Quick Access — 6-icon horizontal strip with glow effects ── */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {QUICK_ACCESS.map((cat) => {
                    const IconComp = cat.Icon;
                    return (
                        <Link
                            key={cat.id}
                            href={cat.path}
                            className={`relative flex items-center gap-2 md:gap-2.5 p-3 md:p-3.5 rounded-xl border border-white/[0.04] hover:border-white/[0.12] transition-all group overflow-hidden bg-gradient-to-br ${cat.gradient} hover:shadow-lg ${cat.glow}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <IconComp size={18} className={`${cat.accent} z-10 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`} />
                            <span className="text-[11px] md:text-xs font-bold text-white/60 z-10 group-hover:text-white/90 transition-colors truncate">
                                {cat.name}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* ── Hero Cards — Casino & Sports with mesh gradient bg ── */}
            <div className="grid grid-cols-2 gap-2">
                {/* Casino */}
                <Link
                    href={hasTwoLarge ? largeCats![0].link : '/casino'}
                    className="relative h-[110px] md:h-[140px] rounded-2xl overflow-hidden group cursor-pointer border border-white/[0.05] hover:border-amber-500/25 transition-all block"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_50%)] bg-[#0a0c10]" />

                    {hasTwoLarge && largeCats![0].image ? (
                        <img src={largeCats![0].image} alt={largeCats![0].title}
                            className="absolute right-0 bottom-0 h-[90%] w-auto object-contain object-right-bottom group-hover:scale-105 transition-transform duration-500 drop-shadow-2xl opacity-90" />
                    ) : (
                        <div className="absolute right-3 bottom-3 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity">
                            <Dices size={70} className="text-brand-gold" />
                        </div>
                    )}

                    <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
                        <div>
                            <div className="inline-flex items-center gap-1.5 bg-brand-gold/10 border border-brand-gold/15 rounded-lg px-2 py-1 mb-2">
                                <Gamepad2 size={10} className="text-brand-gold" />
                                <span className="text-[8px] font-black text-brand-gold uppercase tracking-wider">Casino</span>
                            </div>
                            <h3 className="text-white font-black text-lg md:text-xl leading-none">
                                {hasTwoLarge ? largeCats![0].title : 'CASINO'}
                            </h3>
                            {hasTwoLarge && largeCats![0].subtitle && (
                                <p className="text-white/25 text-[9px] mt-1">{largeCats![0].subtitle}</p>
                            )}
                        </div>
                        <span className="text-brand-gold/60 text-[9px] font-bold flex items-center gap-1 group-hover:text-brand-gold transition-colors">
                            Start playing <ArrowRight size={9} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                    </div>
                </Link>

                {/* Sports */}
                <Link
                    href={hasTwoLarge ? largeCats![1].link : '/sports'}
                    className="relative h-[110px] md:h-[140px] rounded-2xl overflow-hidden group cursor-pointer border border-white/[0.05] hover:border-teal-500/25 transition-all block"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(20,184,166,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.08),transparent_50%)] bg-[#0a0c10]" />

                    {hasTwoLarge && largeCats![1].image ? (
                        <img src={largeCats![1].image} alt={largeCats![1].title}
                            className="absolute right-0 bottom-0 h-[90%] w-auto object-contain object-right-bottom group-hover:scale-105 transition-transform duration-500 drop-shadow-2xl opacity-90" />
                    ) : (
                        <div className="absolute right-3 bottom-3 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity">
                            <Trophy size={70} className="text-teal-400" />
                        </div>
                    )}

                    <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
                        <div>
                            <div className="inline-flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/15 rounded-lg px-2 py-1 mb-2">
                                <Trophy size={10} className="text-teal-400" />
                                <span className="text-[8px] font-black text-teal-400 uppercase tracking-wider">Sports</span>
                            </div>
                            <h3 className="text-white font-black text-lg md:text-xl leading-none">
                                {hasTwoLarge ? largeCats![1].title : 'SPORTS'}
                            </h3>
                            {hasTwoLarge && largeCats![1].subtitle && (
                                <p className="text-white/25 text-[9px] mt-1">{largeCats![1].subtitle}</p>
                            )}
                        </div>
                        <span className="text-teal-400/60 text-[9px] font-bold flex items-center gap-1 group-hover:text-teal-400 transition-colors">
                            Place a bet <ArrowRight size={9} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
