'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Search, HelpCircle, Shield, Zap, BookOpen, Globe,
    ChevronDown, ArrowLeft, Headphones, ChevronRight, Home
} from 'lucide-react';

const CATEGORIES = [
    {
        id: 'account',
        label: 'Account & Security',
        icon: Shield,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        border: 'border-blue-400/20',
        articles: [
            { title: 'How do I verify my account?', body: 'Go to your Profile page and click "Verify Identity". Upload a valid government-issued ID and a selfie. Verification usually takes 1–24 hours.' },
            { title: 'How do I reset my password?', body: 'Click "Forgot Password" on the login screen. Enter your registered email and we\'ll send a reset link within a few minutes. Check your spam folder if you don\'t see it.' },
            { title: 'Can I have multiple accounts?', body: 'No. Each user is only allowed one account. Creating multiple accounts may result in all accounts being permanently suspended.' },
            { title: 'How do I enable two-factor authentication?', body: 'Go to Profile → Security Settings and enable 2FA. We support authenticator apps. This adds an extra layer of protection to your account.' },
        ]
    },
    {
        id: 'payments',
        label: 'Deposits & Withdrawals',
        icon: Zap,
        color: 'text-brand-gold',
        bg: 'bg-brand-gold/10',
        border: 'border-brand-gold/20',
        articles: [
            { title: 'What payment methods are supported?', body: 'We support UPI, Net Banking, cryptocurrencies (BTC, ETH, USDT), and select e-wallets. Available methods may vary by region.' },
            { title: 'How long do withdrawals take?', body: 'Crypto withdrawals are usually processed within 1 hour. Fiat withdrawals (UPI / Bank Transfer) typically take 1–3 business days depending on your bank.' },
            { title: 'What is the minimum deposit amount?', body: 'The minimum deposit is ₹100 for fiat and $10 equivalent for crypto. There is no maximum deposit limit.' },
            { title: 'Why was my withdrawal rejected?', body: 'Withdrawals may be rejected if your account is unverified, if there is a pending bonus wagering requirement, or if your withdrawal details don\'t match your verified identity.' },
        ]
    },
    {
        id: 'bonuses',
        label: 'Bonuses & Promotions',
        icon: BookOpen,
        color: 'text-pink-400',
        bg: 'bg-pink-400/10',
        border: 'border-pink-400/20',
        articles: [
            { title: 'How do I claim a bonus?', body: 'Visit the Promotions page and click "Claim" on any active offer. Some bonuses are credited automatically upon qualifying deposit. Check the T&Cs for each offer.' },
            { title: 'What is a wagering requirement?', body: 'A wagering requirement (e.g., 10x) means you must bet the bonus amount that many times before it can be withdrawn. E.g., a ₹500 bonus with 10x wagering = ₹5,000 in bets.' },
            { title: 'How do I use a promo code?', body: 'Enter your promo code in the designated field during deposit. The bonus will be credited to your account automatically once the deposit is confirmed.' },
        ]
    },
    {
        id: 'sports',
        label: 'Sports Betting',
        icon: Globe,
        color: 'text-teal-400',
        bg: 'bg-teal-400/10',
        border: 'border-teal-400/20',
        articles: [
            { title: 'How do I place a bet?', body: 'Navigate to Sports, select your event, click an odds button to add it to your betslip on the right sidebar, enter your stake, and click "Place Bet".' },
            { title: 'What happens if a match is abandoned?', body: 'If a match is abandoned or postponed before completion, all bets are typically voided and stakes returned. Check our Terms & Conditions for sport-specific rules.' },
            { title: 'What are the minimum and maximum bet amounts?', body: 'Minimum bet is ₹10. Maximum bet varies by market and event. High-value bets may require admin approval for settlement.' },
        ]
    },
];

function ArticleItem({ title, body }: { title: string; body: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className={`border border-white/5 rounded-xl overflow-hidden transition-all duration-200 ${open ? 'bg-[#1A1D21]' : 'bg-[#141618] hover:bg-[#1A1D21]'}`}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
            >
                <span className="text-white font-semibold text-sm leading-snug">{title}</span>
                <ChevronDown size={18} className={`text-text-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-brand-gold' : ''}`} />
            </button>
            {open && (
                <div className="px-5 pb-4 text-text-muted text-sm leading-relaxed border-t border-white/5 pt-3">
                    {body}
                </div>
            )}
        </div>
    );
}

export default function HelpCenterPage() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const allArticles = CATEGORIES.flatMap(c => c.articles.map(a => ({ ...a, category: c.label, color: c.color, bg: c.bg })));

    const searchResults = search.trim()
        ? allArticles.filter(a =>
            a.title.toLowerCase().includes(search.toLowerCase()) ||
            a.body.toLowerCase().includes(search.toLowerCase())
        )
        : null;

    const displayCategories = activeCategory
        ? CATEGORIES.filter(c => c.id === activeCategory)
        : CATEGORIES;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#0E0F11] text-white pb-24">

            {/* Hero */}
            <div className="relative overflow-hidden bg-gradient-to-b from-blue-500/8 via-[#111315] to-[#0E0F11] border-b border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.10),transparent_60%)]" />
                <div className="relative max-w-3xl mx-auto px-4 pt-10 pb-8 text-center">

                    {/* Back links */}
                    <div className="hidden md:flex absolute top-6 left-4 items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2 rounded-full">
                            <Home size={14} /> Home
                        </Link>
                        <ChevronRight size={12} className="text-text-disabled" />
                        <Link href="/support" className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2 rounded-full">
                            <Headphones size={14} /> Support
                        </Link>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-400 text-xs font-black uppercase tracking-widest mb-5">
                        <HelpCircle size={13} /> Help Center
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                        How can we <span className="text-brand-gold">help you?</span>
                    </h1>
                    <p className="text-text-muted text-sm mb-7">
                        Browse our knowledge base or search for answers below.
                    </p>

                    {/* Search */}
                    <div className="relative max-w-lg mx-auto">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search articles..."
                            className="w-full bg-[#1A1D21] border border-white/10 focus:border-brand-gold/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-text-disabled outline-none transition-all shadow-lg"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-10">

                {/* Mobile back to support */}
                <div className="md:hidden flex items-center gap-2 mb-6">
                    <Link href="/support" className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm">
                        <ArrowLeft size={16} /> Back to Support
                    </Link>
                </div>

                {/* Search Results */}
                {searchResults !== null && (
                    <div className="mb-10">
                        <p className="text-xs font-black text-text-muted uppercase tracking-widest mb-4">
                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
                        </p>
                        <div className="space-y-2">
                            {searchResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-3">
                                    <HelpCircle size={40} className="opacity-30" />
                                    <p>No articles found. Try a different search or <Link href="/support" className="text-brand-gold hover:underline">open a support ticket</Link>.</p>
                                </div>
                            ) : (
                                searchResults.map(a => <ArticleItem key={a.title} title={a.title} body={a.body} />)
                            )}
                        </div>
                    </div>
                )}

                {/* Category Pills */}
                {!searchResults && (
                    <>
                        <div className="flex gap-2 flex-wrap mb-8">
                            <button
                                onClick={() => setActiveCategory(null)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === null ? 'bg-brand-gold text-black' : 'bg-white/5 text-text-muted hover:text-white'}`}
                            >
                                All Topics
                            </button>
                            {CATEGORIES.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setActiveCategory(c.id === activeCategory ? null : c.id)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === c.id ? 'bg-brand-gold text-black' : 'bg-white/5 text-text-muted hover:text-white'}`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-10">
                            {displayCategories.map(cat => {
                                const CatIcon = cat.icon;
                                return (
                                    <section key={cat.id}>
                                        <div className={`inline-flex items-center gap-2 ${cat.color} text-xs font-black uppercase tracking-widest mb-4`}>
                                            <div className={`p-1.5 rounded-lg ${cat.bg}`}><CatIcon size={13} /></div>
                                            {cat.label}
                                        </div>
                                        <div className="space-y-2">
                                            {cat.articles.map(a => <ArticleItem key={a.title} title={a.title} body={a.body} />)}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Still need help */}
                <div className="mt-14 rounded-2xl bg-gradient-to-r from-brand-gold/10 to-transparent border border-brand-gold/20 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-white font-black text-lg">Still need help?</p>
                        <p className="text-text-muted text-sm mt-1">Our support team is available 24/7 via live chat.</p>
                    </div>
                    <Link
                        href="/support"
                        className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-black font-black px-6 py-3 rounded-xl text-sm uppercase transition-all shadow-glow-gold whitespace-nowrap"
                    >
                        <Headphones size={16} /> Open Support
                    </Link>
                </div>
            </div>
        </div>
    );
}
