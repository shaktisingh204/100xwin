'use client';

import CategoryGrid from './CategoryGrid';
import HomeGameList from './HomeGameList';
import PromoCardSlider from './PromoCardSlider';
import RecentWinsTicker from './RecentWinsTicker';
import SportEventCard from '@/components/sports/SportEventCard';
import ZeeroOriginalsSection from './ZeeroOriginalsSection';
import { useState, useEffect } from 'react';
import {
    Flame, Star, Zap, Trophy, ArrowRight, Gift, Shield, Lock,
    CreditCard, Headphones, ChevronRight, Gamepad2, Wallet, Sparkles, TrendingUp,
    Play, Users, Award, Clock
} from 'lucide-react';
import { sportsApi, Event } from '@/services/sports';
import { casinoService } from '@/services/casino';
import api from '@/services/api';
import Link from 'next/link';
import GamePlayInterface from '@/components/casino/GamePlayInterface';
import {
    SiPhonepe, SiPaytm, SiGooglepay, SiBitcoin, SiTether,
    SiEthereum, SiTelegram
} from 'react-icons/si';
import { FaUniversity } from 'react-icons/fa';

interface PremiumHomeContentProps {
    selectedSportId?: string | null;
}

function gradientToCss(g?: string) {
    return g || 'linear-gradient(135deg, #7c3aed, #4c1d95)';
}

/* ═══════════════════════════════════════════════════════════════════════════════
   UNIQUE SUB-COMPONENTS — completely new layouts
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Stat Pill Row — animated live counters ─────────────────────────────────── */
function LiveStatsPills() {
    const [onlinePlayers, setOnlinePlayers] = useState(12847);
    const [totalBets, setTotalBets] = useState(983412);

    useEffect(() => {
        const int = setInterval(() => {
            setOnlinePlayers(p => p + Math.floor(Math.random() * 20) - 8);
            setTotalBets(b => b + Math.floor(Math.random() * 50) + 10);
        }, 4000);
        return () => clearInterval(int);
    }, []);

    return (
        <div className="flex items-center gap-2 overflow-x-auto px-3 md:px-0" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-3 py-1.5 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400">{onlinePlayers.toLocaleString()} playing now</span>
            </div>
            <div className="flex items-center gap-1.5 bg-brand-gold/8 border border-brand-gold/15 rounded-full px-3 py-1.5 flex-shrink-0">
                <TrendingUp size={10} className="text-brand-gold" />
                <span className="text-[10px] font-bold text-brand-gold">{totalBets.toLocaleString()} wagers placed</span>
            </div>
            <div className="flex items-center gap-1.5 bg-purple-500/8 border border-purple-500/15 rounded-full px-3 py-1.5 flex-shrink-0">
                <Award size={10} className="text-purple-400" />
                <span className="text-[10px] font-bold text-purple-400">₹2.4Cr paid out today</span>
            </div>
            <div className="flex items-center gap-1.5 bg-cyan-500/8 border border-cyan-500/15 rounded-full px-3 py-1.5 flex-shrink-0">
                <Clock size={10} className="text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-400">Withdrawal: ~47 seconds</span>
            </div>
        </div>
    );
}

/* ── Game Section with unique header style ───────────────────────────────────
   Uses a left color accent bar + split title/action layout               */
function GameSection({
    accentColor, title, subtitle, icon, games, viewAllHref, isLoading, badge
}: {
    accentColor: string; title: string; subtitle?: string;
    icon: React.ReactNode; games: any[]; viewAllHref?: string;
    isLoading?: boolean; badge?: string;
}) {
    return (
        <div className="relative">
            {/* Accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-full ${accentColor} hidden md:block`} />

            <div className="md:pl-5">
                {/* Header */}
                <div className="flex items-end justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentColor.replace('bg-', 'bg-').replace(/\/\d+/, '/12')}`}>
                            {icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-[15px] font-black text-white/90 tracking-tight">{title}</h2>
                                {badge && (
                                    <span className="text-[7px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase animate-pulse">{badge}</span>
                                )}
                            </div>
                            {subtitle && <p className="text-[10px] text-white/20 font-medium mt-0.5">{subtitle}</p>}
                        </div>
                    </div>
                    {viewAllHref && (
                        <Link
                            href={viewAllHref}
                            className="text-[10px] font-bold text-white/25 hover:text-white/60 transition-colors uppercase tracking-wider flex items-center gap-1 group"
                        >
                            See all <ArrowRight size={9} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    )}
                </div>

                <HomeGameList title="" games={games} viewAllHref={viewAllHref} isLoading={isLoading} />
            </div>
        </div>
    );
}

/* ── Bento Trust Grid — 2x3 asymmetric trust cards ──────────────────────────
   Instead of a boring horizontal strip, use a bento grid layout           */
function BentoTrustGrid() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {/* Large feature card */}
            <div className="col-span-2 md:col-span-1 md:row-span-2 rounded-2xl bg-gradient-to-br from-emerald-900/30 to-emerald-950/50 border border-emerald-500/10 p-5 flex flex-col justify-between group hover:border-emerald-500/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Shield size={20} className="text-emerald-400" />
                </div>
                <div>
                    <p className="text-white font-black text-lg leading-tight">Fully<br />Licensed</p>
                    <p className="text-emerald-400/50 text-[11px] mt-2 leading-relaxed">Regulated by Curaçao eGaming Authority. Every bet is verifiably fair and transparent.</p>
                </div>
            </div>

            {/* Small cards */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-all group">
                <Zap size={16} className="text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-white font-bold text-[13px]">Lightning Payouts</p>
                <p className="text-white/20 text-[10px] mt-1">Cash in under 60 seconds</p>
            </div>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-all group">
                <Lock size={16} className="text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-white font-bold text-[13px]">Vault Security</p>
                <p className="text-white/20 text-[10px] mt-1">Military-grade 256-bit</p>
            </div>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-all group">
                <Headphones size={16} className="text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-white font-bold text-[13px]">Always On Support</p>
                <p className="text-white/20 text-[10px] mt-1">Real humans, real fast</p>
            </div>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-all group">
                <Gamepad2 size={16} className="text-brand-gold mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-white font-bold text-[13px]">Massive Library</p>
                <p className="text-white/20 text-[10px] mt-1">1200+ titles from 30+ studios</p>
            </div>
        </div>
    );
}

/* ── Marquee Payment Strip — infinite scroll ─────────────────────────────── */
function MarqueePayments() {
    const methods = [
        { icon: <svg width="14" height="14" viewBox="0 0 60 60"><rect width="60" height="60" rx="12" fill="#6739B7" /><text x="50%" y="38" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="Arial">UPI</text></svg>, name: 'UPI' },
        { icon: <SiPaytm size={13} style={{ color: '#00b9f5' }} />, name: 'Paytm' },
        { icon: <SiPhonepe size={13} style={{ color: '#8B5CF6' }} />, name: 'PhonePe' },
        { icon: <SiGooglepay size={16} style={{ color: '#4285F4' }} />, name: 'GPay' },
        { icon: <FaUniversity size={11} style={{ color: '#60a5fa' }} />, name: 'Bank Transfer' },
        { icon: <SiBitcoin size={13} style={{ color: '#f7931a' }} />, name: 'Bitcoin' },
        { icon: <SiTether size={13} style={{ color: '#26a17b' }} />, name: 'USDT' },
        { icon: <SiEthereum size={13} style={{ color: '#627EEA' }} />, name: 'Ethereum' },
    ];
    const doubled = [...methods, ...methods];
    return (
        <div className="overflow-hidden py-3 border-y border-white/[0.03]">
            <div className="flex items-center gap-1 mb-2 px-3 md:px-0">
                <CreditCard size={10} className="text-white/10" />
                <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.2em]">Deposit & Withdraw</span>
            </div>
            <div className="flex animate-scroll hover:[animation-play-state:paused] w-max gap-3 px-3 md:px-0">
                {doubled.map((m, i) => (
                    <div key={`${m.name}-${i}`} className="flex items-center gap-1.5 flex-shrink-0 bg-white/[0.015] border border-white/[0.03] rounded-lg px-3 py-2 hover:border-white/[0.06] transition-colors">
                        {m.icon}
                        <span className="text-white/30 text-[10px] font-medium">{m.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Provider Logos — glass chip row ─────────────────────────────────────── */
function ProviderChips() {
    const providers = [
        { name: 'Evolution', dot: '#f59e0b' },
        { name: 'Pragmatic Play', dot: '#ef4444' },
        { name: 'NetEnt', dot: '#10b981' },
        { name: 'Spribe', dot: '#14b8a6' },
        { name: 'Ezugi', dot: '#ec4899' },
        { name: 'Playtech', dot: '#8b5cf6' },
        { name: 'Betsoft', dot: '#f97316' },
        { name: 'Microgaming', dot: '#6366f1' },
    ];
    return (
        <div className="flex items-center gap-1.5 overflow-x-auto px-3 md:px-0" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[8px] font-black text-white/8 uppercase tracking-[0.2em] flex-shrink-0 mr-1">Powered by</span>
            {providers.map(p => (
                <Link key={p.name} href={`/casino/providers`} className="flex items-center gap-1.5 flex-shrink-0 bg-white/[0.015] border border-white/[0.03] rounded-full px-2.5 py-1 hover:bg-white/[0.04] transition-colors group">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.dot }} />
                    <span className="text-[9px] font-bold text-white/25 group-hover:text-white/50 transition-colors">{p.name}</span>
                </Link>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function PremiumHomeContent({ selectedSportId }: PremiumHomeContentProps = {}) {
    const [liveEvents, setLiveEvents] = useState<Event[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [teamIcons, setTeamIcons] = useState<Record<string, string>>({});
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

    useEffect(() => {
        const fetchLive = async () => {
            try {
                let data: Event[] = [];
                try {
                    const homeEvts = await sportsApi.getHomeEvents();
                    if (homeEvts && homeEvts.length > 0) {
                        const homeIds = new Set(homeEvts.map((t: any) => String(t.event_id)));
                        const [live, upcoming] = await Promise.all([
                            sportsApi.getLiveEvents(selectedSportId || undefined),
                            sportsApi.getUpcomingEvents(selectedSportId || undefined),
                        ]);
                        const all = [...(live || []), ...(upcoming || [])];
                        const deduped = [...new Map(all.map(m => [m.event_id, m])).values()];
                        data = deduped.filter(e => homeIds.has(String(e.event_id)));
                    }
                } catch { }
                if (data && Array.isArray(data)) setLiveEvents(data);
            } catch (e) { console.error('Failed to load live events', e); }
            finally { setEventsLoading(false); }
        };
        fetchLive();
        const interval = setInterval(fetchLive, 30000);
        sportsApi.getTeamIcons().then(setTeamIcons).catch(() => { });
        return () => clearInterval(interval);
    }, [selectedSportId]);

    useEffect(() => {
        const fetchAll = async () => {
            setGamesLoading(true);
            try {
                const [slotsRes, liveRes, newRes, tableRes, crashRes] = await Promise.all([
                    casinoService.getGames(undefined, 'slots', undefined, 1, 12),
                    casinoService.getGames(undefined, 'live', undefined, 1, 12),
                    casinoService.getGames(undefined, 'new', undefined, 1, 12),
                    casinoService.getGames(undefined, 'table', undefined, 1, 12),
                    casinoService.getGames(undefined, 'crash', undefined, 1, 12),
                ]);
                if (slotsRes.games) setSlotGames(slotsRes.games);
                if (liveRes.games) setLiveGames(liveRes.games);
                if (newRes.games) setNewGames(newRes.games);
                if (tableRes.games) setTableGames(tableRes.games);
                if (crashRes.games) setCrashGames(crashRes.games);
            } catch (e) { console.error('Failed to load games', e); }
            finally { setGamesLoading(false); }
            try { const res = await api.get('/promotions/app-home'); if (Array.isArray(res.data) && res.data.length > 0) setDbPromos(res.data); } catch { }
            try { const res = await api.get('/contact-settings'); if (res.data?.telegramChannelLink) setTelegramLink(res.data.telegramChannelLink); } catch { }
        };
        fetchAll();
    }, []);

    return (
        <div className="w-full max-w-[1600px] mx-auto">

            {/* Full-screen game overlay */}
            {activeGame && (
                <div className="fixed inset-0 z-[500] bg-bg-base flex flex-col p-2 md:p-3">
                    <GamePlayInterface game={activeGame} onClose={() => setActiveGame(null)} isEmbedded={false} onLaunch={(g) => setActiveGame(g)} />
                </div>
            )}

            {/* ═══ 1. HERO SLIDER ═══ */}
            <section className="px-3 md:px-0 pt-2 md:pt-3">
                <PromoCardSlider onGameLaunch={(g) => setActiveGame(g)} />
            </section>

            {/* ═══ 2. LIVE STATS PILLS — animated counters ═══ */}
            <section className="mt-2">
                <LiveStatsPills />
            </section>

            {/* ═══ 3. RECENT WINS — compact ticker ═══ */}
            <section className="mt-3">
                <RecentWinsTicker />
            </section>

            {/* ═══ 4. CATEGORY NAVIGATION ═══ */}
            <section className="px-3 md:px-0 mt-4">
                <CategoryGrid />
            </section>

            {/* ═══ 5. DB PROMOTIONS — horizontal card scroller ═══ */}
            {dbPromos.length > 0 && (
                <section className="px-3 md:px-0 mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Gift size={15} className="text-amber-400" fill="currentColor" />
                            <h2 className="text-[14px] font-black text-white tracking-tight">Hot Deals</h2>
                            <span className="text-[8px] font-black text-amber-400/50 bg-amber-400/8 px-1.5 py-0.5 rounded-full">{dbPromos.length} LIVE</span>
                        </div>
                        <Link href="/promotions" className="text-[10px] font-bold text-white/20 hover:text-white/50 transition-colors flex items-center gap-1 group">
                            All <ArrowRight size={9} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {dbPromos.map(promo => (
                            <Link
                                key={promo._id}
                                href={promo.buttonLink || '/promotions'}
                                className="flex-shrink-0 relative rounded-2xl overflow-hidden border border-white/[0.05] hover:border-white/15 transition-all hover:-translate-y-0.5 group"
                                style={{ background: gradientToCss(promo.gradient), width: 300, minHeight: 170 }}
                            >
                                {promo.bgImage && <img src={promo.bgImage} alt={promo.title} className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />}
                                <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/[0.05]" />
                                <div className="relative z-10 p-5 flex flex-col gap-1 max-w-[65%]">
                                    {(promo.badgeLabel || promo.category) && (
                                        <span className="self-start bg-black/25 backdrop-blur text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1">{promo.badgeLabel || promo.category}</span>
                                    )}
                                    {promo.bonusPercentage > 0 && <span className="text-3xl font-black text-white leading-none">+{promo.bonusPercentage}%</span>}
                                    <p className="text-white font-black text-sm leading-tight">{promo.title}</p>
                                    {promo.description && <p className="text-white/45 text-[10px] line-clamp-2 mt-0.5">{promo.description}</p>}
                                    <div className="mt-2.5 self-start inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-colors">
                                        {promo.buttonText || 'CLAIM NOW'} <ArrowRight size={9} />
                                    </div>
                                </div>
                                {promo.charImage && <img src={promo.charImage} alt="" className="absolute right-0 bottom-0 h-full max-h-36 object-contain" />}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══ 6. ZEERO ORIGINALS ═══ */}
            <section className="px-3 md:px-0 mt-5">
                <ZeeroOriginalsSection />
            </section>

            {/* ═══ 7. POPULAR EVENTS ═══ */}
            {!eventsLoading && liveEvents.length > 0 && (
                <section className="px-3 md:px-0 mt-6">
                    <div className="flex items-end justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <span className="absolute -inset-1 rounded-full bg-red-500/20 animate-ping" />
                                <div className="bg-red-500 text-white p-1.5 rounded-lg"><Zap size={10} fill="white" /></div>
                            </div>
                            <div>
                        <h2 className="text-[15px] font-black text-white tracking-tight">Trending Matches</h2>
                        <p className="text-[9px] text-white/15 font-medium">{liveEvents.length} live & upcoming</p>
                            </div>
                        </div>
                        <Link href="/sports" className="text-[10px] font-bold text-white/20 hover:text-white/50 transition-colors flex items-center gap-1 group">
                            Browse all <ArrowRight size={9} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    {/* Mobile horizontal */}
                    <div className="md:hidden flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {liveEvents.slice(0, 18).map(m => (
                            <div key={m.event_id} className="flex-shrink-0 w-[272px]"><SportEventCard match={m} teamIcons={teamIcons} /></div>
                        ))}
                    </div>
                    {/* Desktop grid */}
                    <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {liveEvents.slice(0, 18).map(m => <SportEventCard key={m.event_id} match={m} teamIcons={teamIcons} />)}
                    </div>
                </section>
            )}

            {/* ═══ 8. GAME SECTIONS — each with unique accent bar ═══ */}
            <section className="px-3 md:px-0 mt-6 space-y-8">
                <GameSection
                    accentColor="bg-teal-400"
                    title="Just Dropped"
                    subtitle="Fresh picks from top studios"
                    icon={<Sparkles size={15} className="text-teal-400" />}
                    games={newGames}
                    viewAllHref="/casino?category=new"
                    isLoading={gamesLoading}
                />

                <GameSection
                    accentColor="bg-red-500"
                    title="Fan Favourites"
                    subtitle="The slots everyone's spinning"
                    icon={<Flame size={15} className="text-red-400" />}
                    games={slotGames}
                    viewAllHref="/casino?category=slots"
                    isLoading={gamesLoading}
                />
            </section>

            {/* ═══ 9. MARQUEE PAYMENTS ═══ */}
            <section className="mt-6">
                <MarqueePayments />
            </section>

            {/* ═══ 10. LIVE CASINO ═══ */}
            <section className="px-3 md:px-0 mt-6">
                <GameSection
                    accentColor="bg-brand-gold"
                    title="Live Tables"
                    subtitle="Real dealers streaming in HD"
                    icon={<Play size={15} className="text-brand-gold" fill="currentColor" />}
                    games={liveGames}
                    viewAllHref="/live-dealers"
                    isLoading={gamesLoading}
                    badge="LIVE"
                />
            </section>

            {/* ═══ 11. PROVIDER CHIPS ═══ */}
            <section className="mt-5">
                <ProviderChips />
            </section>

            {/* ═══ 12. TABLE + CRASH GAMES ═══ */}
            <section className="px-3 md:px-0 mt-6 space-y-8">
                <GameSection
                    accentColor="bg-purple-400"
                    title="Classic Tables"
                    subtitle="Blackjack, Roulette & more"
                    icon={<Star size={15} className="text-purple-400" fill="currentColor" />}
                    games={tableGames}
                    viewAllHref="/casino?category=table"
                    isLoading={gamesLoading}
                />

                <GameSection
                    accentColor="bg-orange-400"
                    title="Instant Win"
                    subtitle="Crash, Plinko & fast-action picks"
                    icon={<Flame size={15} className="text-orange-400" fill="currentColor" />}
                    games={crashGames}
                    viewAllHref="/casino?category=crash"
                    isLoading={gamesLoading}
                />
            </section>

            {/* ═══ 13. BENTO TRUST GRID ═══ */}
            <section className="px-3 md:px-0 mt-8">
                <BentoTrustGrid />
            </section>

            {/* ═══ 14. TELEGRAM CTA — glassmorphic card ═══ */}
            {telegramLink && (
                <section className="px-3 md:px-0 mt-6">
                    <a
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block rounded-2xl overflow-hidden border border-[#0088cc]/20 hover:border-[#0088cc]/40 transition-all group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0088cc]/15 to-transparent" />
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#0088cc]/10 to-transparent" />
                        <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#0088cc]/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <SiTelegram size={20} className="text-[#29b6f6]" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-[14px]">Zeero Insiders Club</p>
                                    <p className="text-white/30 text-[10px] mt-0.5">Exclusive drops, free bets & winning strategies</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-[#0088cc]/20 hover:bg-[#0088cc]/30 text-[#29b6f6] text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-colors flex-shrink-0">
                                Enter <ChevronRight size={11} />
                            </div>
                        </div>
                    </a>
                </section>
            )}

            {/* Bottom spacing */}
            <div className="pb-20 md:pb-10" />
        </div>
    );
}
