"use client";

import React from 'react';
import { Play } from 'lucide-react';

const Hero = () => {
    return (
        <div className="relative w-full h-[160px] sm:h-[220px] md:h-[320px] rounded-2xl overflow-hidden group bg-[var(--bg-base)] border border-[var(--gold-line)]">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2940&auto=format&fit=crop")',
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-base)] via-[var(--bg-base)]/85 to-[var(--bg-base)]/20"></div>
            </div>

            {/* Gold glow accent */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-[var(--gold-soft)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 right-10 w-[320px] h-[320px] rounded-full bg-[var(--violet-soft)] blur-3xl" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-8 md:px-16 z-10">
                <div className="animate-in fade-in slide-in-from-left-10 duration-700">
                    <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-black text-[var(--ink)] italic uppercase tracking-tighter drop-shadow-lg mb-2 leading-[0.95]">
                        JACKPOTS <br /> <span className="text-gold-grad">START HERE!</span>
                    </h2>
                    <p className="hidden sm:block text-[var(--ink-dim)] text-sm md:text-lg font-medium mb-6 max-w-[500px]">
                        Experience the thrill of over 5,000+ premium casino games. Sign up now and claim your welcome bonus.
                    </p>
                    <button className="btn btn-gold sweep min-h-[44px] mt-2 sm:mt-0 px-5 sm:px-6 text-[13px] uppercase tracking-wider">
                        <Play size={18} fill="#120c00" />
                        Play Now
                    </button>

                    {/* Pagination dots */}
                    <div className="hidden sm:flex gap-2 mt-6 md:mt-8">
                        <div className="w-8 h-1 bg-[var(--gold)] rounded-full shadow-[0_0_8px_var(--gold-halo)]"></div>
                        <div className="w-2 h-1 bg-[var(--ink-whisper)] rounded-full hover:bg-[var(--ink-dim)] cursor-pointer transition-colors"></div>
                        <div className="w-2 h-1 bg-[var(--ink-whisper)] rounded-full hover:bg-[var(--ink-dim)] cursor-pointer transition-colors"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
