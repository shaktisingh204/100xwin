
import React from 'react';
import Link from 'next/link';

const allLinks = [
    { label: 'Casino', href: '/casino' },
    { label: 'Sports', href: '/sports' },
    { label: 'Live Casino', href: '/live-dealers' },
    { label: 'Promotions', href: '/promotions' },
    { label: 'VIP', href: '/vip' },
    { label: 'Support', href: '/support' },
    { label: 'Help Center', href: '/support/help-center' },
    { label: 'Fairness', href: '/fairness' },
    { label: 'Privacy Policy', href: '/legal/privacy-policy' },
    { label: 'Terms', href: '/legal/terms' },
    { label: 'Rules', href: '/legal/rules' },
];

const paymentMethods = ['UPI', 'VISA', 'MC', 'BTC', 'USDT', 'GPay'];

export default function Footer() {
    return (
        <footer className="bg-[#08090b] text-white/30 text-[12px]">
            {/* Row 1: Logo + Tagline + Payments */}
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-10 pb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Logo + tagline */}
                    <div className="flex items-center gap-4">
                        <span className="text-2xl font-extrabold italic tracking-tighter">
                            <span className="text-brand-gold">Ze</span><span className="text-white/80">ero</span>
                        </span>
                        <div className="hidden md:block w-px h-8 bg-white/[0.06]" />
                        <p className="hidden md:block text-[11px] text-white/15 max-w-[200px] leading-relaxed">
                            Premium Sports Betting & Casino. Play Responsibly.
                        </p>
                    </div>

                    {/* Payment method badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {paymentMethods.map((method) => (
                            <span
                                key={method}
                                className="text-[9px] font-black uppercase tracking-wider text-white/15 bg-white/[0.03] border border-white/[0.04] px-3 py-1.5 rounded-lg"
                            >
                                {method}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="max-w-[1200px] mx-auto px-4 md:px-8">
                <div className="h-px bg-white/[0.04]" />
            </div>

            {/* Row 2: Horizontal link bar */}
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-5">
                <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
                    {allLinks.map((link, i) => (
                        <React.Fragment key={link.label}>
                            <Link
                                href={link.href}
                                className="text-white/25 hover:text-white/60 transition-colors text-[11px] font-medium px-2 py-1 rounded-lg hover:bg-white/[0.03]"
                            >
                                {link.label}
                            </Link>
                            {i < allLinks.length - 1 && (
                                <span className="text-white/[0.06] text-[8px]">·</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div className="max-w-[1200px] mx-auto px-4 md:px-8">
                <div className="h-px bg-white/[0.04]" />
            </div>

            {/* Row 3: Copyright + 18+ + License */}
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-5">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[9px] font-black text-red-400/80">18+</span>
                        <span className="text-[10px] text-white/15">
                            © 2026 Zeero. All rights reserved.
                        </span>
                    </div>
                    <p className="text-[9px] text-white/[0.06] text-center md:text-right max-w-md leading-relaxed">
                        Operated by BlockDance B.V. (Curaçao no. 158182). Gambling can be addictive. Play responsibly.
                    </p>
                </div>
            </div>
        </footer>
    );
}
