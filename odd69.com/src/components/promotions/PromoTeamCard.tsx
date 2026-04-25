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

    // Active = match is upcoming or live (within ~6h after start). Expired = past match window.
    const matchTime = deal.matchDate ? new Date(deal.matchDate).getTime() : null;
    const now = Date.now();
    const isExpired = matchTime ? matchTime < now - 6 * 60 * 60 * 1000 : false;
    const isActive = !isExpired;

    const gradient = deal.cardGradient ||
        'linear-gradient(135deg, var(--gold-soft), transparent), var(--bg-elevated)';

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

    // Active vs expired: emerald for active, ink-dim for expired
    const accentColor = isExpired ? 'text-[var(--ink-dim)]' : 'text-[var(--emerald)]';
    const accentChipClass = isExpired ? '' : 'chip-emerald';

    return (
        <Link
            href={detailUrl}
            className={`group relative flex flex-col overflow-hidden rounded-[18px] border bg-[var(--bg-surface)] transition-all duration-200 active:scale-[0.99] grain ${
                isExpired
                    ? 'border-[var(--line)] opacity-75 hover:opacity-95'
                    : 'border-[var(--line-default)] hover:border-[var(--line-gold)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]'
            }`}
        >
            {/* Banner */}
            <div className="relative aspect-[16/10] overflow-hidden" style={{ background: gradient }}>
                {deal.cardBgImage && (
                    <img
                        src={deal.cardBgImage}
                        alt=""
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                            isExpired ? 'opacity-20 grayscale' : 'opacity-50 group-hover:opacity-65'
                        }`}
                    />
                )}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(180deg, rgba(10,11,15,0.05) 0%, rgba(10,11,15,0.45) 55%, rgba(10,11,15,0.92) 100%)',
                    }}
                />

                {/* Top row: badge + percentage */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`chip ${accentChipClass}`}>{badge}</span>
                        {isExpired && <span className="chip">Expired</span>}
                        {isActive && (
                            <span className="chip chip-emerald">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-live-dot" />
                                Active
                            </span>
                        )}
                    </div>
                    <div className="text-right">
                        <div
                            className={`num font-display font-extrabold text-[28px] md:text-[32px] leading-none tracking-[-0.04em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] ${
                                isExpired ? 'text-[var(--ink-dim)]' : 'text-gold-grad'
                            }`}
                        >
                            {deal.refundPercentage}%
                        </div>
                        <div className="t-eyebrow !text-[9px] mt-0.5 !text-[var(--ink-dim)]">
                            {isPayoutPromo ? 'winner credit' : 'refund'}
                        </div>
                    </div>
                </div>

                {/* Bottom title on banner */}
                <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="font-display font-bold text-[13px] md:text-[14px] text-[var(--ink-strong)] leading-snug line-clamp-2">
                        {title}
                    </h3>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-col flex-1 p-4 gap-3">
                {/* Match + date */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-strong)]">
                        <Trophy size={11} className="text-[var(--gold)] flex-shrink-0" />
                        <span className="truncate font-semibold">{deal.eventName}</span>
                    </div>
                    {matchDate && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-faint)]">
                            <Calendar size={11} className="flex-shrink-0" />
                            <span className="num">{matchDate}</span>
                        </div>
                    )}
                </div>

                {/* Teams */}
                {deal.teams && deal.teams.length > 0 && (
                    <div className="flex gap-2 items-center">
                        {deal.teams.map((team, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && (
                                    <span className="text-[10px] text-[var(--ink-faint)] font-mono uppercase tracking-wider">vs</span>
                                )}
                                <div className="flex-1 bg-[var(--bg-elevated)] border border-[var(--line)] rounded-[10px] px-2.5 py-2 text-center">
                                    <span className="text-[11px] font-bold text-[var(--ink-strong)]">{team}</span>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Trigger status */}
                {triggerLabel && (
                    <div
                        className={`rounded-[10px] px-3 py-2 flex items-center gap-2 border ${
                            deal.triggerConfig?.isTriggered
                                ? 'bg-[var(--emerald-soft)] border-[rgba(0,216,123,0.25)]'
                                : 'bg-[var(--ice-soft)] border-[rgba(100,211,255,0.25)]'
                        }`}
                    >
                        {deal.triggerConfig?.isTriggered
                            ? <CheckCircle2 size={12} className="text-[var(--emerald)] flex-shrink-0" />
                            : <Radio size={12} className="text-[var(--ice)] flex-shrink-0 animate-pulse" />}
                        <span
                            className={`text-[11px] leading-tight ${
                                deal.triggerConfig?.isTriggered ? 'text-[var(--emerald)]' : 'text-[var(--ice)]'
                            }`}
                        >
                            {triggerLabel}
                        </span>
                    </div>
                )}

                {/* Refund info */}
                <div
                    className={`rounded-[10px] px-3 py-2 flex items-center gap-2 border ${
                        isExpired
                            ? 'bg-[var(--bg-elevated)] border-[var(--line)]'
                            : 'bg-[var(--gold-soft)] border-[var(--line-gold)]'
                    }`}
                >
                    <ShieldCheck size={12} className={`flex-shrink-0 ${isExpired ? 'text-[var(--ink-faint)]' : 'text-[var(--gold)]'}`} />
                    <div className="text-[11px]">
                        <span className={`font-bold ${isExpired ? 'text-[var(--ink-dim)]' : 'text-[var(--gold-bright)]'}`}>
                            <span className="num">{deal.refundPercentage}%</span>{' '}
                            {isPayoutPromo ? 'winner payout ' : 'stake back '}
                        </span>
                        <span className="text-[var(--ink-faint)]">
                            {isPayoutPromo ? 'when trigger hits → ' : isTriggerPromo ? 'when trigger hits → ' : 'on any loss → '}
                        </span>
                        <span className={`font-bold ${isExpired ? 'text-[var(--ink-dim)]' : 'text-[var(--gold-bright)]'}`}>
                            {walletLabel}
                        </span>
                    </div>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--line)]">
                    <div className="flex items-center gap-1.5">
                        <Zap size={11} className={accentColor} />
                        <span className={`text-[10px] font-mono uppercase tracking-[0.08em] font-semibold ${accentColor}`}>
                            {isExpired ? 'Match Ended' : 'Sports Promo'}
                        </span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.06em] font-semibold text-[var(--gold-bright)] group-hover:gap-2 transition-all">
                        Details <ArrowRight size={12} />
                    </span>
                </div>
            </div>
        </Link>
    );
}
