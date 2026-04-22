"use client";

import React from 'react';
import { Play } from 'lucide-react';

const Hero = () => {
    return (
        <div className="relative w-full h-[200px] md:h-[320px] rounded-2xl overflow-hidden group bg-[#06080c] border border-white/[0.06]">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2940&auto=format&fit=crop")',
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-[#06080c] via-[#06080c]/80 to-[#06080c]/20"></div>
            </div>

            {/* Amber glow accent */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-amber-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 right-10 w-[320px] h-[320px] rounded-full bg-orange-600/10 blur-3xl" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 z-10">
                <div className="animate-in fade-in slide-in-from-left-10 duration-700">
                    <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter drop-shadow-lg mb-2">
                        JACKPOTS <br /> <span className="text-amber-400">START HERE!</span>
                    </h2>
                    <p className="text-white/70 md:text-lg font-medium mb-6 max-w-[500px]">
                        Experience the thrill of over 5,000+ premium casino games. Sign up now and claim your welcome bonus.
                    </p>
                    <button className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-[#1a1208] font-black uppercase tracking-wider px-6 py-3 rounded-xl transform hover:-translate-y-1 transition-all shadow-[0_4px_0_0_rgba(180,83,9,0.9)]">
                        <Play size={20} fill="#1a1208" />
                        Play Now
                    </button>

                    {/* Pagination dots */}
                    <div className="flex gap-2 mt-8">
                        <div className="w-8 h-1 bg-amber-500 rounded-full"></div>
                        <div className="w-2 h-1 bg-white/25 rounded-full hover:bg-white/70 cursor-pointer"></div>
                        <div className="w-2 h-1 bg-white/25 rounded-full hover:bg-white/70 cursor-pointer"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
