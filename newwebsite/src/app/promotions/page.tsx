"use client";

import React, { useEffect, useState, Suspense } from 'react';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import Footer from '@/components/layout/Footer';
import PromotionCard from '@/components/promotions/PromotionCard';
import BonusConditionCard from '@/components/promotions/BonusConditionCard';
import PromoTeamCard from '@/components/promotions/PromoTeamCard';
import { promotionApi, Promotion, BonusPromotion, PromoTeamDeal } from '@/services/promotions';
import { Zap, Trophy, Gamepad2, Radio, Crown, LayoutGrid, ShieldCheck } from 'lucide-react';

const CATEGORIES = [
    { id: 'ALL', label: 'All Promos', icon: LayoutGrid },
    { id: 'CASINO', label: 'Casino', icon: Gamepad2 },
    { id: 'SPORTS', label: 'Sports', icon: Zap },
    { id: 'LIVE', label: 'Live', icon: Radio },
    { id: 'VIP', label: 'VIP', icon: Crown },
];

function PromotionsContent() {
    const [promos, setPromos] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [bonusConditions, setBonusConditions] = useState<BonusPromotion[]>([]);
    const [bonusLoading, setBonusLoading] = useState(true);
    const [promoDeals, setPromoDeals] = useState<PromoTeamDeal[]>([]);
    const [promoDealsLoading, setPromoDealsLoading] = useState(true);

    useEffect(() => {
        const fetchPromos = async () => {
            try {
                const data = await promotionApi.getAll();
                setPromos(data);
            } catch (error) {
                console.error("Failed to fetch promotions:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchBonusConditions = async () => {
            try {
                const data = await promotionApi.getBonusConditions();
                setBonusConditions(data);
            } catch (error) {
                console.error("Failed to fetch bonus conditions:", error);
            } finally {
                setBonusLoading(false);
            }
        };

        const fetchPromoDeals = async () => {
            try {
                const data = await promotionApi.getPromoTeamDeals();
                setPromoDeals(data);
            } catch (error) {
                console.error("Failed to fetch promo team deals:", error);
            } finally {
                setPromoDealsLoading(false);
            }
        };

        fetchPromos();
        fetchBonusConditions();
        fetchPromoDeals();
    }, []);

    const featured = promos.filter(p => p.isFeatured);
    const filtered = activeCategory === 'ALL'
        ? promos
        : promos.filter(p => (p.category || 'ALL') === activeCategory);

    const filteredPromoDeals = activeCategory === 'ALL' || activeCategory === 'SPORTS'
        ? promoDeals
        : [];

    const filteredBonus = activeCategory === 'ALL'
        ? bonusConditions
        : bonusConditions.filter(b => b.applicableTo === activeCategory || b.applicableTo === 'BOTH');

    const hasAnyContent = filtered.length > 0 || filteredPromoDeals.length > 0 || filteredBonus.length > 0;
    return (
        <div className="h-screen overflow-hidden bg-bg-base font-[family-name:var(--font-poppins)] flex flex-col">
            <Header />

            <div className="flex flex-1 overflow-hidden pt-[110px] md:pt-[64px] pb-[80px] md:pb-0 max-w-[1920px] mx-auto w-full">
                {/* Left Sidebar - Navigation */}
                <LeftSidebar />

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 bg-bg-base overflow-y-auto overflow-x-hidden w-full xl:max-w-[calc(100%-240px)] flex flex-col">
                    <div className="p-4 md:p-6 lg:p-8 flex-1">
                        {/* Hero Section */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-1">
                                <Trophy size={28} className="text-brand-gold" />
                                <h1 className="text-3xl md:text-4xl font-black text-text-primary">PROMOTIONS</h1>
                            </div>
                            <p className="text-text-secondary text-sm md:text-base ml-10">
                                Discover our latest offers, bonuses, and exclusive VIP rewards.
                            </p>
                        </div>

                        {/* Featured Banner (if any) */}
                        {!loading && featured.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-3 flex items-center gap-1">
                                    <span className="h-px w-4 bg-brand-gold inline-block" /> Featured Offers
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    {featured.map((promo, i) => (
                                        <PromotionCard key={promo._id || i} promo={promo} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Category Filter Tabs */}
                        <div className="flex gap-2 flex-wrap mb-6">
                            {CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                const count = cat.id === 'ALL' ? promos.length : promos.filter(p => (p.category || 'ALL') === cat.id).length;
                                if (count === 0 && cat.id !== 'ALL') return null;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold uppercase transition-all duration-200 border ${activeCategory === cat.id
                                            ? 'bg-brand-gold text-text-inverse border-brand-gold shadow-glow-gold'
                                            : 'bg-transparent text-text-muted border-white/10 hover:border-white/30 hover:text-text-secondary'
                                            }`}
                                    >
                                        <Icon size={14} />
                                        {cat.label}
                                        {count > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeCategory === cat.id ? 'bg-black/20' : 'bg-white/10'}`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Promotions Grid */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="animate-pulse rounded-2xl bg-bg-elevated h-[380px] w-full border border-white/5" />
                                ))}
                            </div>
                        ) : filtered.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filtered.map((promo, index) => (
                                    <PromotionCard key={promo._id || index} promo={promo} />
                                ))}
                            </div>
                        ) : !hasAnyContent ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center bg-bg-elevated rounded-2xl border border-white/5">
                                <Trophy size={48} className="text-brand-gold opacity-30 mb-4" />
                                <h3 className="text-xl font-bold text-text-primary mb-2">No Promotions Found</h3>
                                <p className="text-text-secondary text-sm max-w-md mx-auto">
                                    {activeCategory !== 'ALL'
                                        ? `No ${activeCategory.toLowerCase()} promotions are active right now. Check back soon!`
                                        : 'Check back later for new bonuses, campaigns, and exclusive rewards.'}
                                </p>
                                {activeCategory !== 'ALL' && (
                                    <button
                                        onClick={() => setActiveCategory('ALL')}
                                        className="mt-4 px-6 py-2 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold rounded-lg font-bold text-sm transition-colors border border-brand-gold/30"
                                    >
                                        View All Promotions
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* ── PROMO TEAM DEALS SECTION ── */}
                    {(promoDealsLoading || filteredPromoDeals.length > 0) && (activeCategory === 'ALL' || activeCategory === 'SPORTS') && (
                        <div className="px-4 md:px-6 lg:px-8 pb-8">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                    <Trophy size={16} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-text-primary uppercase tracking-wider">Sports Promo Deals</h2>
                                    <p className="text-[11px] text-text-muted mt-0.5">Match cashback, bad beat refunds, and Stake-style early payout offers appear here as soon as admin creates them.</p>
                                </div>
                            </div>

                            {promoDealsLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[1, 2].map(i => (
                                        <div key={i} className="animate-pulse rounded-2xl bg-bg-elevated h-[340px] border border-white/5" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filteredPromoDeals.map((deal) => (
                                        <PromoTeamCard key={deal._id} deal={deal} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── BONUS CONDITIONS SECTION ── */}
                    {(bonusLoading || filteredBonus.length > 0) && (
                        <div className="px-4 md:px-6 lg:px-8 pb-8">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck size={16} className="text-brand-gold" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-text-primary uppercase tracking-wider">Bonus Conditions</h2>
                                    <p className="text-[11px] text-text-muted mt-0.5">Full terms, wagering requirements, and eligibility for each active bonus.</p>
                                </div>
                            </div>

                            {bonusLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse rounded-2xl bg-bg-elevated h-[420px] border border-white/5" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filteredBonus.map((bonus) => (
                                        <BonusConditionCard key={bonus._id} bonus={bonus} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <Footer />
                </main>

            </div>
        </div>
    );
}

export default function PromotionsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-bg-base flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
            </div>
        }>
            <PromotionsContent />
        </Suspense>
    );
}
