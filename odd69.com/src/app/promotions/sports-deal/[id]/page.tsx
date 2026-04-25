"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { promotionApi, PromoTeamDeal } from '@/services/promotions';
import {
    ArrowLeft, Trophy, Calendar, ShieldCheck, Radio, ArrowRight,
    Zap, Target, Clock, Wallet, AlertTriangle, CheckCircle2,
} from 'lucide-react';

function DetailRow({ icon: Icon, label, value, accent, numeric = false }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    accent?: string;
    numeric?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-3.5 border-b border-[var(--line)] last:border-0 gap-3">
            <div className="flex items-center gap-2.5 text-[var(--ink-faint)]">
                <Icon size={14} />
                <span className="text-[13px]">{label}</span>
            </div>
            <div className={`text-[13px] font-bold text-right ${accent || 'text-[var(--ink-strong)]'} ${numeric ? 'num' : ''}`}>
                {value}
            </div>
        </div>
    );
}

export default function SportsDealDetailPage() {
    const params = useParams();
    const router = useRouter();
    const dealId = params.id as string;

    const [deal, setDeal] = useState<PromoTeamDeal | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        promotionApi.getPromoTeamDeals().then((all) => {
            const found = all.find(d => d._id === dealId);
            setDeal(found || null);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [dealId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--line)] border-t-[var(--gold)]" />
            </div>
        );
    }

    if (!deal) {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center gap-4 px-4 text-center">
                <p className="text-[var(--ink-dim)] text-[15px]">Deal not found</p>
                <button
                    onClick={() => router.push('/promotions')}
                    className="btn btn-gold sweep h-10 uppercase tracking-[0.06em] text-[11px] px-5"
                >
                    Back to Promotions
                </button>
            </div>
        );
    }

    const isTriggerPromo = deal.promotionType === 'FIRST_OVER_SIX_CASHBACK';
    const isPayoutPromo = deal.benefitType === 'PAYOUT_AS_WIN';
    const sportUrl = `/sports/match/${deal.eventId}`;

    const gradient = deal.cardGradient ||
        'linear-gradient(135deg, var(--gold-soft), transparent), var(--bg-elevated)';

    const title = deal.cardTitle ||
        (deal.promotionType === 'FIRST_OVER_SIX_CASHBACK'
            ? `${deal.refundPercentage}% back if your pre-match team hits a 6 in first ${deal.triggerConfig?.oversWindow || 1} over`
            : deal.promotionType === 'LEAD_MARGIN_PAYOUT'
                ? `Paid as winner if your team leads big`
                : deal.promotionType === 'LATE_LEAD_REFUND'
                    ? `Bad Beat refund if your team leads late`
                    : deal.promotionType === 'PERIOD_LEAD_PAYOUT'
                        ? `Paid as winner if your team leads at the break`
                        : `Get ${deal.refundPercentage}% Back on Any Loss`);

    const description = deal.cardDescription ||
        (deal.promotionType === 'FIRST_OVER_SIX_CASHBACK'
            ? `Place a pre-match Match Odds bet on ${deal.eventName}. If your selected team hits a six in the first ${deal.triggerConfig?.oversWindow || 1} over but still loses, get ${deal.refundPercentage}% refunded to the ${deal.walletTarget === 'bonus_wallet' ? 'bonus' : deal.walletTarget === 'crypto' ? 'crypto' : 'main'} wallet.`
            : deal.promotionType === 'LEAD_MARGIN_PAYOUT'
                ? `If your selected team goes ${deal.triggerConfig?.leadThreshold || 2}+ ahead but still fails to win, the bet can still be paid like a winner.`
                : deal.promotionType === 'LATE_LEAD_REFUND'
                    ? `If your selected team is still leading at ${deal.triggerConfig?.minuteThreshold || 80}' but does not win, the losing bet can be refunded.`
                    : deal.promotionType === 'PERIOD_LEAD_PAYOUT'
                        ? `If your selected team leads at ${(deal.triggerConfig?.periodLabel || 'HALF_TIME').toLowerCase().replace(/_/g, ' ')} but does not win, the bet can still be paid like a winner.`
                        : `Bet on ${deal.eventName} and get ${deal.refundPercentage}% of your stake refunded if you lose. Offer applies to all teams.`);

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

    const matchExpired = deal.matchDate
        ? new Date(deal.matchDate).getTime() < Date.now() - 6 * 60 * 60 * 1000
        : false;

    const walletLabel = deal.walletTarget === 'bonus_wallet' ? 'Bonus wallet'
        : deal.walletTarget === 'crypto' ? 'Crypto wallet'
            : 'Main wallet';

    const conditionText = deal.conditionSummary ||
        (isTriggerPromo
            ? `If your selected pre-match Match Odds team hits a six in the first ${deal.triggerConfig?.oversWindow || 1} over but still loses, the losing bet qualifies for cashback.`
            : deal.promotionType === 'LEAD_MARGIN_PAYOUT'
                ? `If your team leads by ${deal.triggerConfig?.leadThreshold || 2}+ goals/runs but still doesn't win, the bet qualifies.`
                : deal.promotionType === 'LATE_LEAD_REFUND'
                    ? `If your team is leading at ${deal.triggerConfig?.minuteThreshold || 80}' but doesn't win, the bet qualifies for refund.`
                    : deal.promotionType === 'PERIOD_LEAD_PAYOUT'
                        ? `If your team leads at ${(deal.triggerConfig?.periodLabel || 'HALF_TIME').toLowerCase().replace(/_/g, ' ')} but doesn't win, the bet qualifies.`
                        : 'Your losing bet qualifies for cashback based on the promo conditions.');

    const triggerLabel = isTriggerPromo
        ? deal.triggerConfig?.isTriggered
            ? `Triggered for ${(deal.triggerConfig?.qualifyingSelections || []).join(', ')}`
            : `Waiting for selected pre-match team to hit a 6 in first ${deal.triggerConfig?.oversWindow || 1} over${(deal.triggerConfig?.oversWindow || 1) > 1 ? 's' : ''}`
        : deal.promotionType === 'LEAD_MARGIN_PAYOUT'
            ? deal.triggerConfig?.isTriggered
                ? `Triggered for ${(deal.triggerConfig?.qualifyingSelections || []).join(', ')}`
                : `Waiting for ${deal.triggerConfig?.leadThreshold || 2}+ lead trigger`
            : deal.promotionType === 'LATE_LEAD_REFUND'
                ? deal.triggerConfig?.isTriggered
                    ? `Triggered for ${(deal.triggerConfig?.qualifyingSelections || []).join(', ')}`
                    : `Waiting for ${deal.triggerConfig?.minuteThreshold || 80}' lead trigger`
                : deal.promotionType === 'PERIOD_LEAD_PAYOUT'
                    ? deal.triggerConfig?.isTriggered
                        ? `Triggered for ${(deal.triggerConfig?.qualifyingSelections || []).join(', ')}`
                        : `Waiting for ${(deal.triggerConfig?.periodLabel || 'HALF_TIME').toLowerCase().replace(/_/g, ' ')} lead`
                    : null;

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            <div className="max-w-[800px] mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-32 md:pb-12 space-y-5 md:space-y-6">
                {/* Back */}
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-[var(--ink-faint)] hover:text-[var(--ink)] text-[13px] transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Promotions
                </button>

                {/* Hero Banner */}
                <div
                    className="relative overflow-hidden rounded-[18px] md:rounded-[22px] border border-[var(--line-gold)] aspect-[16/9] md:aspect-[21/9] grain"
                    style={{ background: gradient }}
                >
                    {deal.cardBgImage && (
                        <img
                            src={deal.cardBgImage}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-50"
                        />
                    )}
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'linear-gradient(180deg, rgba(10,11,15,0.05) 0%, rgba(10,11,15,0.45) 50%, rgba(10,11,15,0.92) 100%)',
                        }}
                    />

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                        <span className="chip chip-gold">{badge}</span>
                        {matchExpired && <span className="chip chip-crimson">Expired</span>}
                    </div>

                    {/* Refund percentage */}
                    <div className="absolute top-3 right-3 text-right">
                        <div className="num font-display font-extrabold text-[44px] md:text-[64px] leading-none tracking-[-0.04em] text-gold-grad drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                            {deal.refundPercentage}%
                        </div>
                        <div className="t-eyebrow !text-[9px] mt-1 !text-[var(--ink-dim)]">
                            {isPayoutPromo ? 'winner credit' : 'refund'}
                        </div>
                    </div>

                    {/* Bottom title */}
                    <div className="absolute bottom-3 left-3 right-3">
                        <h1 className="font-display font-bold text-[16px] md:text-[22px] text-[var(--ink-strong)] leading-tight line-clamp-3">
                            {title}
                        </h1>
                    </div>
                </div>

                {/* Match Info Card */}
                <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 md:p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                        <Trophy size={16} className="text-[var(--gold)]" />
                        <span className="text-[14px] font-bold text-[var(--ink-strong)]">{deal.eventName}</span>
                    </div>

                    {matchDate && (
                        <div className="flex items-center gap-2.5 text-[var(--ink-dim)] text-[13px]">
                            <Calendar size={14} />
                            <span className={matchExpired ? 'text-[var(--ink-dim)]' : 'text-[var(--ink-dim)]'}>
                                {matchDate}
                            </span>
                        </div>
                    )}

                    {/* Teams */}
                    {deal.teams && deal.teams.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-2">
                            {deal.teams.map((team, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && (
                                        <span className="text-[10px] font-bold text-[var(--ink-faint)] uppercase tracking-wider text-center">vs</span>
                                    )}
                                    <div className="flex-1">
                                        <div className="bg-[var(--bg-elevated)] border border-[var(--line)] rounded-[12px] px-3 py-3 text-center">
                                            <div className="w-9 h-9 rounded-full bg-[var(--gold-soft)] border border-[var(--line-gold)] flex items-center justify-center mx-auto mb-2">
                                                <Trophy size={14} className="text-[var(--gold)]" />
                                            </div>
                                            <span className="text-[13px] font-bold text-[var(--ink-strong)]">{team}</span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 md:p-5 space-y-2.5">
                    <h3 className="text-[13px] font-bold text-[var(--ink-strong)] flex items-center gap-2">
                        <Zap size={14} className="text-[var(--gold)]" /> How It Works
                    </h3>
                    <p className="text-[13.5px] text-[var(--ink-dim)] leading-relaxed">{description}</p>
                </div>

                {/* Condition Summary */}
                <div className="rounded-[14px] border border-[var(--line-gold)] bg-[var(--gold-soft)] p-4 md:p-5 space-y-2.5">
                    <h3 className="text-[13px] font-bold text-[var(--ink-strong)] flex items-center gap-2">
                        <AlertTriangle size={14} className="text-[var(--gold)]" /> Qualifying Condition
                    </h3>
                    <p className="text-[13px] text-[var(--ink-strong)] leading-relaxed">{conditionText}</p>
                </div>

                {/* Trigger Status */}
                {triggerLabel && (
                    <div
                        className={`rounded-[14px] border p-4 md:p-5 flex items-center gap-3 ${
                            deal.triggerConfig?.isTriggered
                                ? 'border-[rgba(0,216,123,0.25)] bg-[var(--emerald-soft)]'
                                : 'border-[rgba(100,211,255,0.25)] bg-[var(--ice-soft)]'
                        }`}
                    >
                        {deal.triggerConfig?.isTriggered
                            ? <CheckCircle2 size={18} className="text-[var(--emerald)] flex-shrink-0" />
                            : <Radio size={18} className="text-[var(--ice)] flex-shrink-0 animate-pulse" />
                        }
                        <div>
                            <div className={`text-[13px] font-bold ${deal.triggerConfig?.isTriggered ? 'text-[var(--emerald)]' : 'text-[var(--ice)]'}`}>
                                {deal.triggerConfig?.isTriggered ? 'Trigger Activated' : 'Trigger Pending'}
                            </div>
                            <div className="text-[11.5px] mt-0.5 text-[var(--ink-dim)]">
                                {triggerLabel}
                            </div>
                        </div>
                    </div>
                )}

                {/* Offer Details Grid */}
                <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
                    <div className="px-4 md:px-5 py-3 border-b border-[var(--line)]">
                        <h3 className="text-[13px] font-bold text-[var(--ink-strong)]">Offer Details</h3>
                    </div>
                    <div className="px-4 md:px-5">
                        <DetailRow
                            icon={Target}
                            label="Promo Type"
                            value={badge}
                            accent="text-[var(--gold-bright)]"
                        />
                        <DetailRow
                            icon={Zap}
                            label="Refund / Payout"
                            value={
                                <span>
                                    <span className="num">{deal.refundPercentage}%</span>{' '}
                                    {isPayoutPromo ? 'winner payout' : 'stake back'}
                                </span>
                            }
                            accent="text-[var(--gold-bright)]"
                        />
                        <DetailRow
                            icon={Wallet}
                            label="Credit To"
                            value={walletLabel}
                            accent={deal.walletTarget === 'bonus_wallet' ? 'text-[var(--violet)]' : 'text-[var(--gold-bright)]'}
                        />
                        {matchDate && (
                            <DetailRow
                                icon={Clock}
                                label="Match Time"
                                value={matchDate}
                            />
                        )}
                    </div>
                </div>

                {/* Refund Guarantee */}
                <div className="rounded-[14px] border border-[rgba(0,216,123,0.25)] bg-[var(--emerald-soft)] p-4 md:p-5 flex items-start gap-3">
                    <ShieldCheck size={20} className="text-[var(--emerald)] flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="text-[13px] font-bold text-[var(--emerald)]">
                            {isPayoutPromo
                                ? <><span className="num">{deal.refundPercentage}%</span> winner payout when trigger hits and the bet still loses</>
                                : <><span className="num">{deal.refundPercentage}%</span> stake back {isTriggerPromo ? 'when trigger hits and bet loses' : 'on any losing bet'}</>}
                        </div>
                        <div className="text-[11.5px] text-[var(--ink-dim)] mt-1">
                            Credited to your{' '}
                            <span className={`font-semibold ${deal.walletTarget === 'bonus_wallet' ? 'text-[var(--violet)]' : 'text-[var(--gold-bright)]'}`}>
                                {walletLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Inline CTA on md+ */}
                <div className="hidden md:block">
                    <Link
                        href={sportUrl}
                        className="btn btn-gold sweep w-full h-12 uppercase tracking-[0.08em] text-[12px]"
                    >
                        <span>Bet Now</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {/* Sticky bottom CTA — mobile only, with safe-area */}
            <div
                className="md:hidden fixed inset-x-0 bottom-0 z-40 glass border-t border-[var(--line-default)]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="px-4 pt-3 pb-3">
                    <Link
                        href={sportUrl}
                        className="btn btn-gold sweep w-full h-12 uppercase tracking-[0.08em] text-[12px]"
                    >
                        <span>Bet Now</span>
                        <ArrowRight size={15} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
