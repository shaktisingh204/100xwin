'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, Calendar, ShieldCheck, ArrowRight, Radio } from 'lucide-react';

export interface PromoTeamDeal {
    _id: string;
    eventId: string;
    eventName: string;
    matchDate?: string;
    teams?: string[];
    teamName?: string;
    promotionType?: 'MATCH_LOSS_CASHBACK' | 'FIRST_OVER_SIX_CASHBACK' | 'LEAD_MARGIN_PAYOUT' | 'LATE_LEAD_REFUND' | 'PERIOD_LEAD_PAYOUT';
    benefitType?: 'REFUND' | 'PAYOUT_AS_WIN';
    refundPercentage: number;
    walletTarget: string;
    walletType?: string;
    cardTitle?: string;
    cardDescription?: string;
    cardGradient?: string;
    cardBgImage?: string;
    cardBadge?: string;
    conditionSummary?: string;
    order?: number;
    createdAt?: string;
    triggerConfig?: {
        oversWindow?: number;
        leadThreshold?: number;
        minuteThreshold?: number;
        periodLabel?: string;
        qualifyingSelections?: string[];
        scoreSnapshot?: string;
        triggerNote?: string;
        isTriggered?: boolean;
    } | null;
}

interface Props {
    deal: PromoTeamDeal;
}

export default function PromoTeamCard({ deal }: Props) {
    const sportUrl = `/sports/match/${deal.eventId}`;
    const isTriggerPromo = deal.promotionType === 'FIRST_OVER_SIX_CASHBACK';
    const isPayoutPromo = deal.benefitType === 'PAYOUT_AS_WIN';

    const gradient = deal.cardGradient ||
        'linear-gradient(135deg, rgba(16,185,129,0.7), rgba(6,78,59,0.3))';

    const title = deal.cardTitle ||
        (deal.promotionType === 'FIRST_OVER_SIX_CASHBACK'
            ? `Get ${deal.refundPercentage}% Back if a 6 lands early — ${deal.eventName}`
            : deal.promotionType === 'LEAD_MARGIN_PAYOUT'
                ? `Paid as winner if your team leads big — ${deal.eventName}`
                : deal.promotionType === 'LATE_LEAD_REFUND'
                    ? `Bad Beat refund if your team leads late — ${deal.eventName}`
                    : deal.promotionType === 'PERIOD_LEAD_PAYOUT'
                        ? `Paid as winner if your team leads at the break — ${deal.eventName}`
                        : `Get ${deal.refundPercentage}% Back on Any Loss — ${deal.eventName}`);

    const description = deal.cardDescription ||
        (deal.promotionType === 'FIRST_OVER_SIX_CASHBACK'
            ? `If any team hits a 6 in the first ${(deal.triggerConfig?.oversWindow || 1)} over, losing bets on ${deal.eventName} still get refunded.`
            : deal.promotionType === 'LEAD_MARGIN_PAYOUT'
                ? `If your selected team goes ${(deal.triggerConfig?.leadThreshold || 2)}+ ahead but still fails to win, the bet can still be paid like a winner.`
                : deal.promotionType === 'LATE_LEAD_REFUND'
                    ? `If your selected team is still leading at ${(deal.triggerConfig?.minuteThreshold || 80)}' but does not win, the losing bet can be refunded.`
                    : deal.promotionType === 'PERIOD_LEAD_PAYOUT'
                        ? `If your selected team leads at ${(deal.triggerConfig?.periodLabel || 'HALF_TIME').toLowerCase().replace(/_/g, ' ')} but does not win, the bet can still be paid like a winner.`
                        : `Bet on ${deal.eventName} and get ${deal.refundPercentage}% of your stake refunded if you lose. Offer applies to all teams.`);

    const badge = deal.cardBadge || (
        deal.promotionType === 'FIRST_OVER_SIX_CASHBACK'
            ? 'TRIGGER PROMO'
            : deal.promotionType === 'LEAD_MARGIN_PAYOUT'
                ? 'EARLY PAYOUT'
                : deal.promotionType === 'LATE_LEAD_REFUND'
                    ? 'BAD BEAT'
                    : deal.promotionType === 'PERIOD_LEAD_PAYOUT'
                        ? 'PERIOD PAYOUT'
                        : 'SPORTS PROMO'
    );

    const matchDate = deal.matchDate
        ? new Date(deal.matchDate).toLocaleString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
        })
        : null;

    const walletLabel = deal.walletTarget === 'bonus_wallet'
        ? 'Bonus wallet'
        : deal.walletTarget === 'main_wallet'
            ? 'Main wallet'
            : deal.walletTarget === 'crypto'
                ? 'Crypto wallet'
                : 'Main wallet';

    const triggerLabel = isTriggerPromo
        ? deal.triggerConfig?.isTriggered
            ? 'Trigger hit'
            : `Waiting for a 6 in first ${(deal.triggerConfig?.oversWindow || 1)} over${(deal.triggerConfig?.oversWindow || 1) > 1 ? 's' : ''}`
        : deal.promotionType === 'LEAD_MARGIN_PAYOUT'
            ? deal.triggerConfig?.isTriggered
                ? `Triggered for ${(deal.triggerConfig?.qualifyingSelections || []).join(', ')}`
                : `Waiting for ${(deal.triggerConfig?.leadThreshold || 2)}+ lead trigger`
            : deal.promotionType === 'LATE_LEAD_REFUND'
                ? deal.triggerConfig?.isTriggered
                    ? `Triggered for ${(deal.triggerConfig?.qualifyingSelections || []).join(', ')}`
                    : `Waiting for ${(deal.triggerConfig?.minuteThreshold || 80)}' lead trigger`
                : deal.promotionType === 'PERIOD_LEAD_PAYOUT'
                    ? deal.triggerConfig?.isTriggered
                        ? `Triggered for ${(deal.triggerConfig?.qualifyingSelections || []).join(', ')}`
                        : `Waiting for ${(deal.triggerConfig?.periodLabel || 'HALF_TIME').toLowerCase().replace(/_/g, ' ')} lead`
        : null;

    return (
        <div className="group relative rounded-2xl overflow-hidden border border-white/10 bg-bg-elevated cursor-pointer hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            {/* Card Banner */}
            <div className="h-40 relative overflow-hidden" style={{ background: gradient }}>
                {deal.cardBgImage && (
                    <img
                        src={deal.cardBgImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                    />
                )}

                {/* Overlay gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                        <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {badge}
                        </span>
                        <div className="text-right">
                            <div className="text-3xl font-black text-white leading-none">
                                {deal.refundPercentage}%
                            </div>
                            <div className="text-[10px] text-white/70 font-semibold">{isPayoutPromo ? 'winner credit' : 'refund'}</div>
                        </div>
                    </div>

                    {/* Bottom — title */}
                    <div>
                        <h3 className="text-sm font-black text-white leading-tight drop-shadow-sm">
                            {title}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
                {/* Match info */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Trophy size={11} className="text-amber-400 flex-shrink-0" />
                        <span className="truncate font-medium">{deal.eventName}</span>
                    </div>
                    {matchDate && (
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Calendar size={11} className="flex-shrink-0" />
                            <span>{matchDate}</span>
                        </div>
                    )}
                </div>

                {/* Teams chips — all equal, no highlight */}
                {deal.teams && deal.teams.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                        {deal.teams.map((team, i) => (
                            <span key={i}
                                className="text-[11px] px-2 py-0.5 rounded font-bold bg-white/5 text-text-muted border border-white/10">
                                {team}
                            </span>
                        ))}
                    </div>
                )}

                {/* Description */}
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {description}
                </p>

                {deal.conditionSummary && (
                    <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Trophy size={13} className="text-amber-400 flex-shrink-0" />
                        <div className="text-[11px] text-amber-100/90">
                            {deal.conditionSummary}
                        </div>
                    </div>
                )}

                {triggerLabel && (
                    <div className={`rounded-lg px-3 py-2 flex items-center gap-2 border ${deal.triggerConfig?.isTriggered ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-sky-500/8 border-sky-500/20'}`}>
                        <Radio size={13} className={`${deal.triggerConfig?.isTriggered ? 'text-emerald-400' : 'text-sky-400'} flex-shrink-0`} />
                        <div className={`text-[11px] ${deal.triggerConfig?.isTriggered ? 'text-emerald-100/90' : 'text-sky-100/90'}`}>
                            {triggerLabel}
                        </div>
                    </div>
                )}

                {/* Refund info pill */}
                <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                    <ShieldCheck size={13} className="text-emerald-400 flex-shrink-0" />
                    <div className="text-xs">
                        <span className="text-emerald-400 font-bold">
                            {isPayoutPromo ? `${deal.refundPercentage}% winner payout ` : `${deal.refundPercentage}% stake back `}
                        </span>
                        <span className="text-text-muted">
                            {isPayoutPromo
                                ? 'when trigger hits and the bet still loses -> '
                                : isTriggerPromo
                                    ? 'when trigger hits and bet loses -> '
                                    : 'on any losing bet -> '}
                        </span>
                        <span className={`font-semibold ${deal.walletTarget === 'bonus_wallet' ? 'text-violet-400' : deal.walletTarget === 'crypto' ? 'text-amber-400' : 'text-sky-400'}`}>
                            {walletLabel}
                        </span>
                    </div>
                </div>

                {/* CTA Button */}
                <Link href={sportUrl}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-200 group/btn"
                    style={{ background: gradient }}>
                    <span>Bet Now</span>
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}
