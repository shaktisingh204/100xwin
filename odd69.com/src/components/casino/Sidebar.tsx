"use client";

import { casinoService } from '@/services/casino';
import React, { useState, useEffect } from 'react';
import {
    LayoutGrid, Dices, Trophy, Disc, Clapperboard,
    MonitorPlay, Spade, Gem, Video, TrendingUp
} from 'lucide-react';

interface SidebarProps {
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    context?: 'live' | 'casino';
}

const Sidebar: React.FC<SidebarProps> = ({ selectedCategory, onSelectCategory, context }) => {
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await casinoService.getCategories(context);
                let mappedData = Array.isArray(data) ? data.map((c: any) => {
                    let Icon = LayoutGrid;
                    const lowerName = c.name.toLowerCase();
                    let isHot = false;

                    if (lowerName.includes('slot')) Icon = Dices;
                    else if (lowerName.includes('live')) {
                        Icon = Video;
                        isHot = true;
                    }
                    else if (lowerName.includes('roulette')) Icon = Disc;
                    else if (lowerName.includes('blackjack')) Icon = Spade;
                    else if (lowerName.includes('poker')) Icon = Gem;
                    else if (lowerName.includes('baccarat')) Icon = Clapperboard;
                    else if (lowerName.includes('crash')) Icon = TrendingUp;
                    else if (lowerName.includes('virtual')) Icon = MonitorPlay;

                    return { ...c, icon: Icon, isHot };
                }) : [];

                if (context === 'live') {
                    mappedData = mappedData.filter(c => {
                        const n = c.name.toLowerCase();
                        return n.includes('live') || n.includes('table') || n.includes('blackjack') || n.includes('roulette') || n.includes('baccarat') || n.includes('poker') || n.includes('dragon') || n.includes('andar') || n.includes('teen');
                    });
                } else if (context === 'casino') {
                    mappedData = mappedData.filter(c => {
                        const n = c.name.toLowerCase();
                        return !n.includes('live');
                    });
                }

                setCategories(mappedData);
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        };
        fetchCategories();
    }, [context]);

    return (
        <aside className="hidden md:flex flex-col w-[260px] h-[calc(100vh-60px)] bg-[#06080c] border-r border-white/[0.06] overflow-y-auto sticky top-[60px]">

            <div className="p-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 px-2">Categories</h3>
                <div className="flex flex-col gap-1">
                    {categories.map((cat) => {
                        const isActive = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => onSelectCategory(cat.id)}
                                className={`flex items-center justify-between px-3 py-3 rounded-lg transition-all group ${
                                    isActive
                                        ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-300 border-l-2 border-amber-500'
                                        : 'text-white/70 hover:bg-white/[0.03] hover:text-white border-l-2 border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <cat.icon size={18} className={isActive ? 'text-amber-400' : 'text-white/50 group-hover:text-white'} />
                                    <span className="font-medium text-sm">{cat.name}</span>
                                    {cat.isHot && (
                                        <span className="ml-2 text-[8px] font-black bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] px-1.5 py-0.5 rounded-sm animate-pulse">
                                            HOT
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[10px] font-bold ${isActive ? 'text-amber-300/80' : 'text-white/50'}`}>
                                    {cat.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-auto p-4 m-4 bg-white/[0.03] border border-white/[0.06] rounded-xl relative overflow-hidden group">
                <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/15 blur-3xl" />
                <div className="relative z-10">
                    <h4 className="font-black text-white mb-1">VIP Club</h4>
                    <p className="text-xs text-white/70 mb-3">Join now for exclusive rewards!</p>
                    <button className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] px-3 py-1.5 rounded-md hover:from-amber-400 hover:to-orange-500 transition-colors">
                        View Details
                    </button>
                </div>
                <div className="absolute -right-2 -bottom-2 opacity-20 group-hover:opacity-30 transition-opacity">
                    <Trophy size={60} className="text-amber-400" />
                </div>
            </div>

        </aside>
    );
};

export default Sidebar;
