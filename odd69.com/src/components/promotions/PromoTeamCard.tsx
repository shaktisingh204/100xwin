'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, Calendar, ShieldCheck, ArrowRight, Radio, Zap, CheckCircle2 } from 'lucide-react';

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
    const detailUrl = `/promotions/sports-deal/${deal._id}`;
    const isTriggerPromo = deal.promotionType === 'FIRST_OVER_SIX_CASHBACK';
    const isPayoutPromo = deal.benefitType === 'PAYOUT_AS_WIN';

    const gradient = deal.cardGradient ||
        'linear-gradient(135deg, rgba(245,158,11,0.6), rgba(120,53,15,0.3))';

    const title = deal.cardTitle ||
        (deal.promotionType === 'FIRST_OVER_SIX_CASHBACK'
            ? `${deal.refundPercentage}% back if your pre-match team hits a 6 in first ${(deal.triggerConfig?.oversWindow || 1)} over`
            : deal.promotionType === 'LEAD_MARGIN_PAYOUT'
                ? `Paid as winner if your team leads big — ${deal.eventName}`
                : deal.promotionType === 'LATE_LEAD_REFUND'
                    ? `Bad Beat refund if your team leads late — ${deal.eventName}`
                    : deal.promotionType === 'PERIOD_LEAD_PAYOUT'
                        ? `Paid as winner if your team leads at the break — ${deal.eventName}`
                        : `Get ${deal.refundPercentage}% Back on Any Loss — ${deal.eventName}`);

    const badge = deal.cardBadge || (
        deal.promotionType === 'FIRST_OVER_SIX_CASHBACK' ? 'TRIGGER PROMO'
            : deal.promotionType === 'LEAD_MARGIN_PAYOUT' ? 'EARLY PAYOUT'
                : deal.promotionType === 'LATE_LEAD_REFUND' ? 'BAD BEAT'
                    : deal.promotionType === 'PERIOD_LEAD_PAYOUT' ? 'PERIOD PAYOUT'
                        : 'SPORTS PROMO');

    const matchDate = deal.matchDate
        ? new Date(deal.matchDate).toLocaleString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
        })
        : null;

    const walletLabel = deal.walletTarget === 'bonus_wallet' ? 'Bonus wallet'
        : deal.walletTarget === 'crypto' ? 'Crypto wallet'
            : 'Main wallet';

    const triggerLabel = isTriggerPromo
        ? deal.triggerConfig?.isTriggered
            ? `Triggered for ${(deal.triggerConfig?.qualifyingSelections || []).join(', ')}`
            : `Waiting for selected pre-match team to hit a 6 in first ${(deal.triggerConfig?.oversWindow || 1)} over${(deal.triggerConfig?.oversWindow || 1) > 1 ? 's' : ''}`
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
        <Link
            href={detailUrl}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all duration-200 hover:border-amber-500/30 hover:shadow-[0_8px_32px_rgba(245,158,11,0.1)] active:scale-[0.99]"
        >
            {/* Banner */}
            <div className="relative h-[150px] overflow-hidden" style={{ background: gradient }}>
                {deal.cardBgImage && (
                    <img src={deal.cardBgImage} alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity duration-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#06080c] via-black/30 to-transparent" />

                {/* Top row: badge + percentage */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/[0.08]">
                        {badge}
                    </span>
                    <div className="text-right">
                        <div className="text-3xl font-black text-white leading-none drop-shadow-lg">
                            {deal.refundPercentage}%
                        </div>
                        <div className="text-[10px] text-white/70 font-black">{isPayoutPromo ? 'winner credit' : 'refund'}</div>
                    </div>
                </div>

                {/* Bottom title on banner */}
                <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-[13px] font-black text-white leading-snug drop-shadow-sm line-clamp-2">
                        {title}
                    </h3>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-col flex-1 p-4 gap-3">
                {/* Match + date */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-white/70">
                        <Trophy size={11} className="text-amber-400 flex-shrink-0" />
                        <span className="truncate font-medium">{deal.eventName}</span>
                    </div>
                    {matchDate && (
                        <div className="flex items-center gap-1.5 text-xs text-white/50">
                            <Calendar size={11} className="flex-shrink-0" />
                            <span>{matchDate}</span>
                        </div>
                    )}
                </div>

                {/* Teams */}
                {deal.teams && deal.teams.length > 0 && (
                    <div className="flex gap-2 items-center">
                        {deal.teams.map((team, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span className="text-[10px] text-white/50 font-black">vs</span>}
                                <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-2 text-center">
                                    <span className="text-[11px] font-black text-white/70">{team}</span>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Trigger status */}
                {triggerLabel && (
                    <div className={`rounded-lg px-3 py-2 flex items-center gap-2 border ${deal.triggerConfig?.isTriggered
                        ? 'bg-emerald-500/10 border-emerald-500/25'
                        : 'bg-amber-500/10 border-amber-500/20'
                        }`}>
                        {deal.triggerConfig?.isTriggered
                            ? <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                            : <Radio size={12} className="text-amber-400 flex-shrink-0 animate-pulse" />
                        }
                        <span className={`text-[11px] leading-tight ${deal.triggerConfig?.isTriggered ? 'text-emerald-400/90' : 'text-amber-400/90'}`}>
                            {triggerLabel}
                        </span>
                    </div>
                )}

                {/* Refund info */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                    <ShieldCheck size={12} className="text-amber-400 flex-shrink-0" />
                    <div className="text-[11px]">
                        <span className="text-amber-400 font-black">
                            {isPayoutPromo ? `${deal.refundPercentage}% winner payout ` : `${deal.refundPercentage}% stake back `}
                        </span>
                        <span className="text-white/50">
                            {isPayoutPromo ? 'when trigger hits -> ' : isTriggerPromo ? 'when trigger hits -> ' : 'on any loss -> '}
                        </span>
                        <span className="font-black text-amber-400">
                            {walletLabel}
                        </span>
                    </div>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                        <Zap size={11} className="text-amber-400" />
                        <span className="text-[11px] font-black text-amber-400/80">Sports Promo</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-black text-amber-400 group-hover:gap-2 transition-all">
                        View Details <ArrowRight size={12} />
                    </span>
                </div>
            </div>
        </Link>
    );
}
