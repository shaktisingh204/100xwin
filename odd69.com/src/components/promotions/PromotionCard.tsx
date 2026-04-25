"use client";

import React from 'react';
import Link from 'next/link';
import { Clock, Gift, ArrowRight, Percent, Star } from 'lucide-react';
import { Promotion } from '@/services/promotions';

interface PromotionCardProps {
    promo: Promotion;
}

const CATEGORY_CHIP: Record<string, string> = {
    CASINO: 'chip-gold',
    SPORTS: 'chip-emerald',
    LIVE: 'chip-crimson',
    VIP: 'chip-gold',
    ALL: '',
};

export default function PromotionCard({ promo }: PromotionCardProps) {
    const chipClass = CATEGORY_CHIP[(promo.category || 'ALL').toUpperCase()] || '';

    const daysLeft = promo.expiryDate
        ? Math.max(0, Math.ceil((new Date(promo.expiryDate).getTime() - Date.now()) / 86400000))
        : null;
    const isExpired = daysLeft !== null && daysLeft <= 0;

    const claimProgress = promo.claimLimit
        ? Math.min(100, Math.round(((promo.claimCount || 0) / promo.claimLimit) * 100))
        : null;

    return (
        <Link
            href={`/promotions/${promo._id}`}
            className="group relative flex flex-col overflow-hidden rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] transition-all duration-200 hover:border-[var(--line-gold)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] active:scale-[0.99] grain"
        >
            {/* Full-bleed banner with gradient scrim */}
            <div className="relative aspect-[16/10] overflow-hidden">
                {promo.bgImage ? (
                    <img
                        src={promo.bgImage}
                        alt={promo.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                ) : (
                    <div
                        className="absolute inset-0"
                        style={{ background: promo.gradient || 'linear-gradient(135deg, var(--gold-soft), transparent), var(--bg-elevated)' }}
                    />
                )}

                {/* Scrim — top-to-bottom darkening for legibility */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(180deg, rgba(10,11,15,0.05) 0%, rgba(10,11,15,0.45) 55%, rgba(10,11,15,0.92) 100%)',
                    }}
                />

                {/* Top-left badges */}
                <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {promo.category && (
                            <span className={`chip ${chipClass}`}>{promo.category}</span>
                        )}
                        {promo.badgeLabel && (
                            <span className="chip">{promo.badgeLabel}</span>
                        )}
                    </div>
                    {promo.isFeatured && (
                        <Star size={14} className="text-[var(--gold)] drop-shadow-[0_2px_8px_rgba(245,183,10,0.6)]" fill="currentColor" />
                    )}
                </div>

                {/* Bonus overlay */}
                {promo.bonusPercentage && promo.bonusPercentage > 0 ? (
                    <div className="absolute bottom-3 left-3 z-10">
                        <span className="num font-display font-extrabold text-[36px] md:text-[40px] leading-none tracking-[-0.04em] text-gold-grad drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                            +{promo.bonusPercentage}%
                        </span>
                    </div>
                ) : null}

                {/* Character image */}
                {promo.charImage && (
                    <img
                        src={promo.charImage}
                        alt=""
                        className="absolute bottom-0 right-2 h-[85%] object-contain pointer-events-none"
                    />
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-4 gap-3">
                <div>
                    <h3 className="font-display font-bold text-[14px] md:text-[15px] text-[var(--ink-strong)] leading-snug line-clamp-2 group-hover:text-[var(--gold-bright)] transition-colors">
                        {promo.title}
                    </h3>
                    {promo.subtitle && (
                        <p className="text-[12px] text-[var(--ink-dim)] mt-1 line-clamp-1">{promo.subtitle}</p>
                    )}
                </div>

                {/* Quick info chips */}
                <div className="flex flex-wrap gap-1.5">
                    {promo.maxBonus ? (
                        <span className="chip">
                            <Gift size={10} className="text-[var(--gold)]" />
                            Up to <span className="num">₹{promo.maxBonus.toLocaleString()}</span>
                        </span>
                    ) : null}
                    {promo.wageringMultiplier ? (
                        <span className="chip">
                            <Percent size={10} className="text-[var(--ink-faint)]" />
                            <span className="num">{promo.wageringMultiplier}×</span> wager
                        </span>
                    ) : null}
                </div>

                {/* Claim progress */}
                {claimProgress !== null && promo.claimLimit && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-[var(--ink-faint)]">Claims</span>
                            <span className="num text-[var(--ink-dim)] font-bold">
                                {promo.claimCount || 0}/{promo.claimLimit}
                            </span>
                        </div>
                        <div className="h-1 bg-[var(--ink-ghost)] rounded-full overflow-hidden">
                            <div className="h-full bg-gold-grad rounded-full" style={{ width: `${claimProgress}%` }} />
                        </div>
                    </div>
                )}

                {/* Bottom row: expiry + CTA */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--line)]">
                    {daysLeft !== null ? (
                        <span
                            className={`flex items-center gap-1 text-[11px] font-bold ${
                                isExpired
                                    ? 'text-[var(--crimson)]'
                                    : daysLeft <= 3
                                        ? 'text-[var(--gold-bright)]'
                                        : 'text-[var(--ink-faint)]'
                            }`}
                        >
                            <Clock size={11} />
                            {isExpired ? 'Expired' : <><span className="num">{daysLeft}</span>d left</>}
                        </span>
                    ) : (
                        <span className="text-[11px] text-[var(--ink-whisper)]">No expiry</span>
                    )}

                    <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.06em] font-semibold text-[var(--gold-bright)] group-hover:gap-2 transition-all">
                        Details <ArrowRight size={12} />
                    </span>
                </div>
            </div>
        </Link>
    );
}
