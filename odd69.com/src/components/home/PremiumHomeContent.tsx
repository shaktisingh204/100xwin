'use client';

import HomeGameList from './HomeGameList';
import PromoCardSlider from './PromoCardSlider';
import dynamic from 'next/dynamic';

// Heavy below-fold sections — code-split.
const ZeeroOriginalsSection = dynamic(
    () => import('./ZeeroOriginalsSection'),
    { ssr: false },
);
const GamePlayInterface = dynamic(
    () => import('@/components/casino/GamePlayInterface'),
    { ssr: false },
);

import { useState, useEffect, useCallback } from 'react';
import {
    Flame, Star, Zap, ArrowRight, Gift,
    ChevronRight, Dices, Trophy, Coins,
} from 'lucide-react';
import { casinoService } from '@/services/casino';
import api from '@/services/api';
import Link from 'next/link';

interface PremiumHomeContentProps {
    selectedSportId?: string | null;
}

function gradientToCss(g?: string) {
    return g || 'linear-gradient(135deg, #7c3aed, #4c1d95)';
}

// ─── Inline Category Grid (odd69 themed) ─────────────────────────────────────
function CategoryGrid() {
    const cats = [
        { label: 'Casino', href: '/casino', icon: Dices, tint: 'from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-400' },
        { label: 'Live', href: '/live-dealers', icon: Zap, tint: 'from-red-500/20 to-red-500/5', iconColor: 'text-red-400' },
        { label: 'Sports', href: '/sports', icon: Trophy, tint: 'from-teal-500/20 to-teal-500/5', iconColor: 'text-teal-400' },
        { label: 'Originals', href: '/zeero-games', icon: Star, tint: 'from-violet-500/20 to-violet-500/5', iconColor: 'text-violet-400' },
        { label: 'Promotions', href: '/promotions', icon: Gift, tint: 'from-rose-500/20 to-rose-500/5', iconColor: 'text-rose-400' },
        { label: 'VIP', href: '/vip', icon: Coins, tint: 'from-orange-500/20 to-orange-500/5', iconColor: 'text-orange-400' },
    ];
    return (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
            {cats.map(c => (
                <Link
                    key={c.label}
                    href={c.href}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all py-3 md:py-4 group"
                >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.tint} border border-white/[0.06] flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <c.icon size={18} className={c.iconColor} />
                    </div>
                    <span className="text-[11px] font-bold text-white/80 group-hover:text-white">{c.label}</span>
                </Link>
            ))}
        </div>
    );
}

// ─── Inline Recent Wins Ticker ───────────────────────────────────────────────
function RecentWinsTicker() {
    const wins = [
        { user: 'Player***1', game: 'Aviator', amount: 1245.5 },
        { user: 'Player***2', game: 'Mines', amount: 832.1 },
        { user: 'Player***3', game: 'Gates of Olympus', amount: 2180.0 },
        { user: 'Player***4', game: 'Crash', amount: 415.7 },
        { user: 'Player***5', game: 'Sweet Bonanza', amount: 960.0 },
    ];
    return (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 overflow-hidden">
            <div className="flex items-center gap-6 whitespace-nowrap animate-[marquee_30s_linear_infinite]">
                {[...wins, ...wins].map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="text-amber-400 font-black">🏆</span>
                        <span className="text-white/60 font-semibold">{w.user}</span>
                        <span className="text-white/40">won</span>
                        <span className="text-amber-400 font-black">${w.amount.toFixed(2)}</span>
                        <span className="text-white/40">on</span>
                        <span className="text-white/80 font-bold">{w.game}</span>
                    </div>
                ))}
            </div>
            <style jsx>{`
                @keyframes marquee {
                    from { transform: translateX(0%); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}

export default function PremiumHomeContent({
    selectedSportId: _selectedSportId,
}: PremiumHomeContentProps = {}) {
    const [activeGame, setActiveGame] = useState<{
        id: string; name: string; provider: string; url: string;
    } | null>(null);

    const [slotGames, setSlotGames] = useState<any[]>([]);
    const [liveGames, setLiveGames] = useState<any[]>([]);
    const [newGames, setNewGames] = useState<any[]>([]);
    const [tableGames, setTableGames] = useState<any[]>([]);
    const [crashGames, setCrashGames] = useState<any[]>([]);
    const [gamesLoading, setGamesLoading] = useState(true);

    const [dbPromos, setDbPromos] = useState<any[]>([]);
    const [telegramLink, setTelegramLink] = useState('');

    // Fetch all game categories + DB promotions + telegram (deferred until after LCP)
    useEffect(() => {
        let cancelled = false;

        const fetchAll = async () => {
            if (cancelled) return;
            setGamesLoading(true);
            try {
                const [slotsRes, liveRes, newRes, tableRes, crashRes] = await Promise.all([
                    (casinoService as any).getGames(undefined, 'slots', undefined, 1, 12),
                    (casinoService as any).getGames(undefined, 'live', undefined, 1, 12),
                    (casinoService as any).getGames(undefined, 'new', undefined, 1, 12),
                    (casinoService as any).getGames(undefined, 'table', undefined, 1, 12),
                    (casinoService as any).getGames(undefined, 'crash', undefined, 1, 12),
                ]);
                if (cancelled) return;
                if (slotsRes?.games) setSlotGames(slotsRes.games);
                if (liveRes?.games) setLiveGames(liveRes.games);
                if (newRes?.games) setNewGames(newRes.games);
                if (tableRes?.games) setTableGames(tableRes.games);
                if (crashRes?.games) setCrashGames(crashRes.games);
            } catch (e) {
                console.error('Failed to load home premium games', e);
            } finally {
                if (!cancelled) setGamesLoading(false);
            }

            try {
                const res = await api.get('/promotions/app-home');
                if (!cancelled && Array.isArray(res.data) && res.data.length > 0) {
                    setDbPromos(res.data);
                }
            } catch { /* silently ignore */ }

            try {
                const res = await api.get('/contact-settings');
                if (!cancelled && res.data?.telegramChannelLink) {
                    setTelegramLink(res.data.telegramChannelLink);
                }
            } catch { /* silently ignore */ }
        };

        let idleHandle: number | null = null;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        const ric = (globalThis as any).requestIdleCallback as
            | ((cb: () => void, opts?: { timeout: number }) => number)
            | undefined;
        if (typeof ric === 'function') {
            idleHandle = ric(() => { fetchAll(); }, { timeout: 1500 });
        } else {
            timeoutHandle = setTimeout(() => { fetchAll(); }, 0);
        }

        return () => {
            cancelled = true;
            const cic = (globalThis as any).cancelIdleCallback as
                | ((handle: number) => void)
                | undefined;
            if (idleHandle !== null && typeof cic === 'function') {
                cic(idleHandle);
            }
            if (timeoutHandle !== null) clearTimeout(timeoutHandle);
        };
    }, []);

    const handleGameLaunch = useCallback((g: { id: string; name: string; provider: string; url: string }) => {
        setActiveGame(g);
    }, []);

    return (
        <div className="w-full max-w-[1600px] mx-auto px-0 py-2 md:p-6 bg-[#06080c]">

            {/* FULL-SCREEN GAME OVERLAY */}
            {activeGame && (
                <div className="fixed inset-0 z-[500] bg-[#06080c] flex flex-col p-2 md:p-3">
                    <GamePlayInterface
                        game={activeGame}
                        onClose={() => setActiveGame(null)}
                        isEmbedded={false}
                        onLaunch={(g: any) => setActiveGame(g)}
                    />
                </div>
            )}

            {/* 1. HERO PROMO SLIDER */}
            <section className="mt-0 px-3 md:px-0 pt-2 md:pt-3 relative z-10">
                <PromoCardSlider onGameLaunch={handleGameLaunch} />
            </section>

            {/* 2. RECENT WINS TICKER */}
            <section className="mt-1 px-3 md:px-0">
                <RecentWinsTicker />
            </section>

            {/* 3. CATEGORY GRID */}
            <section className="px-3 md:px-0 mt-3 md:mt-4">
                <CategoryGrid />
            </section>

            {/* 4. DB PROMOTIONS CAROUSEL */}
            {dbPromos.length > 0 && (
                <section className="px-3 md:px-0 mt-5 md:mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                                <Gift size={16} className="text-amber-400" fill="currentColor" />
                            </div>
                            <h2 className="text-lg md:text-xl font-black text-white tracking-[-0.02em]">Promotions</h2>
                            <span className="text-[9px] font-bold text-white/25 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">{dbPromos.length}</span>
                        </div>
                        <Link href="/promotions" className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                            All <ArrowRight size={10} />
                        </Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {dbPromos.map(promo => (
                            <Link
                                key={promo._id}
                                href={promo.buttonLink || '/promotions'}
                                className="flex-shrink-0 relative rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.15] transition-all hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] group"
                                style={{ background: gradientToCss(promo.gradient), width: 280, minHeight: 160 }}
                            >
                                {promo.bgImage && (
                                    <img
                                        src={promo.bgImage}
                                        alt={promo.title}
                                        loading="lazy"
                                        decoding="async"
                                        className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
                                    />
                                )}
                                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/[0.06] pointer-events-none" />
                                <div className="relative z-10 p-5 flex flex-col gap-1 max-w-[65%]">
                                    {(promo.badgeLabel || promo.category) && (
                                        <span className="self-start bg-black/30 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md mb-1">
                                            {promo.badgeLabel || promo.category}
                                        </span>
                                    )}
                                    {promo.bonusPercentage > 0 && (
                                        <span className="text-3xl font-black text-white leading-none">+{promo.bonusPercentage}%</span>
                                    )}
                                    <p className="text-white font-black text-base leading-tight">{promo.title}</p>
                                    {promo.description && (
                                        <p className="text-white/70 text-[11px] line-clamp-2 mt-0.5">{promo.description}</p>
                                    )}
                                    <div className="mt-3 self-start inline-flex items-center gap-1.5 bg-white/[0.12] hover:bg-white/25 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-colors">
                                        {promo.buttonText || 'CLAIM NOW'} <ArrowRight size={10} />
                                    </div>
                                </div>
                                {promo.charImage && (
                                    <img
                                        src={promo.charImage}
                                        alt=""
                                        aria-hidden
                                        loading="lazy"
                                        decoding="async"
                                        className="absolute right-0 bottom-0 h-full max-h-36 object-contain"
                                    />
                                )}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* 5. ZEERO ORIGINALS */}
            <section className="px-3 md:px-0 mt-6 md:mt-8">
                <ZeeroOriginalsSection />
            </section>

            {/* 8. NEW GAMES */}
            <section className="px-3 md:px-0 mt-6 md:mt-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-500/5 flex items-center justify-center">
                            <Zap size={16} className="text-teal-400" fill="currentColor" />
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-white tracking-[-0.02em]">New Games</h2>
                    </div>
                    <Link href="/casino?category=new" className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                        All <ArrowRight size={10} />
                    </Link>
                </div>
                <HomeGameList title="" games={newGames} viewAllHref="/casino?category=new" isLoading={gamesLoading} />
            </section>

            {/* 10. TOP SLOTS */}
            <section className="px-3 md:px-0 mt-6 md:mt-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center">
                            <Flame size={16} className="text-rose-400" fill="currentColor" />
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-white tracking-[-0.02em]">Top Slots</h2>
                    </div>
                    <Link href="/casino?category=slots" className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                        All <ArrowRight size={10} />
                    </Link>
                </div>
                <HomeGameList title="" games={slotGames} isLoading={gamesLoading} />
            </section>

            {/* 12. LIVE CASINO */}
            <section className="px-3 md:px-0 mt-6 md:mt-10 pb-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                            <Zap size={16} className="text-amber-400" fill="currentColor" />
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-white tracking-[-0.02em]">Live Casino</h2>
                        <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400 text-[9px] font-bold">LIVE</span>
                        </div>
                    </div>
                    <Link href="/live-dealers" className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                        All <ArrowRight size={10} />
                    </Link>
                </div>
                <HomeGameList title="" games={liveGames} viewAllHref="/live-dealers" isLoading={gamesLoading} />
            </section>

            {/* 14. TABLE GAMES */}
            <section className="px-3 md:px-0 mt-6 md:mt-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
                            <Star size={16} className="text-violet-400" fill="currentColor" />
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-white tracking-[-0.02em]">Table Games</h2>
                    </div>
                    <Link href="/casino?category=table" className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                        All <ArrowRight size={10} />
                    </Link>
                </div>
                <HomeGameList title="" games={tableGames} viewAllHref="/casino?category=table" isLoading={gamesLoading} />
            </section>

            {/* 16. CRASH GAMES */}
            <section className="px-3 md:px-0 mt-6 md:mt-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center">
                            <Flame size={16} className="text-orange-400" fill="currentColor" />
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-white tracking-[-0.02em]">Crash Games</h2>
                    </div>
                    <Link href="/casino?category=crash" className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                        All <ArrowRight size={10} />
                    </Link>
                </div>
                <HomeGameList title="" games={crashGames} viewAllHref="/casino?category=crash" isLoading={gamesLoading} />
            </section>

            {/* BOTTOM BANNER */}
            <section className="px-3 md:px-0 mt-4 md:mt-6">
                <div className="flex flex-col md:flex-row items-center justify-between rounded-2xl border border-white/[0.06] px-5 py-4 md:px-8 md:py-5 gap-4 md:gap-6 overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg, #1a1510 0%, #14121a 30%, #0f1016 60%, #10101c 100%)' }}>
                    <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-amber-500/8 blur-3xl pointer-events-none" />

                    <div className="shrink-0 relative z-10 text-center md:text-left">
                        <span className="text-xl md:text-2xl font-black italic text-amber-400">200% </span>
                        <span className="text-xl md:text-2xl font-black text-white">Deposit Bonus</span>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4 shrink-0 relative z-10 flex-wrap justify-center">
                        <span className="text-white font-black text-sm tracking-wider">VISA</span>
                        <span className="text-white/70 text-sm font-bold">Mastercard</span>
                        <span className="text-white/70 text-sm font-bold">G Pay</span>
                        <span className="text-white/70 text-sm font-bold">UPI</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 relative z-10 flex-wrap justify-center">
                        <div className="w-7 h-7 rounded-full bg-[#f7931a] flex items-center justify-center"><span className="text-white text-xs font-black">₿</span></div>
                        <div className="w-7 h-7 rounded-full bg-[#627EEA] flex items-center justify-center"><span className="text-white text-xs font-black">Ξ</span></div>
                        <div className="w-7 h-7 rounded-full bg-[#F3BA2F] flex items-center justify-center"><span className="text-white text-xs font-black">B</span></div>
                        <div className="w-7 h-7 rounded-full bg-[#26a17b] flex items-center justify-center"><span className="text-white text-xs font-black">₮</span></div>
                        <div className="w-7 h-7 rounded-full bg-[#2775CA] flex items-center justify-center"><span className="text-white text-xs font-black">$</span></div>
                    </div>
                </div>
            </section>

            {/* TELEGRAM JOIN CARD */}
            {telegramLink && (
                <section className="px-3 md:px-0 mt-5 md:mt-7 pb-16 md:pb-8">
                    <a
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-4 bg-gradient-to-r from-[#0088cc]/90 to-[#005f9e]/90 rounded-2xl px-5 py-4 border border-white/[0.08] hover:border-white/[0.15] transition-all hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(0,136,204,0.2)] group overflow-hidden relative"
                    >
                        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/[0.06] pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.12] flex items-center justify-center flex-shrink-0">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.6 8.2l-1.9 8.9c-.1.6-.5.8-1 .5l-2.8-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-3 5.4-4.9c.2-.2 0-.3-.3-.1l-6.7 4.2-2.9-.9c-.6-.2-.6-.6.1-.9l11.3-4.4c.5-.2 1 .1.8.9z"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-black text-sm">Join our Telegram</p>
                                <p className="text-white/70 text-[11px] mt-0.5">Tips, updates &amp; exclusive community bonuses</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/[0.16] hover:bg-white/25 text-white text-[11px] font-black uppercase px-4 py-2 rounded-xl transition-colors flex-shrink-0 relative z-10">
                            JOIN <ChevronRight size={12} />
                        </div>
                    </a>
                </section>
            )}

            {!telegramLink && <div className="pb-16 md:pb-8" />}

        </div>
    );
}
