"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import api from '@/services/api';
import {
    Gamepad2, Trophy, Copy, Check, Zap, ShieldCheck,
    Wallet, Clock, Coins, BadgePercent, ArrowRight,
    Users, Star, Info,
} from 'lucide-react';
import { BonusPromotion } from '@/services/promotions';
import toast from 'react-hot-toast';

interface Props {
    bonus: BonusPromotion;
    currencySymbol?: string;
}

const TYPE_CONFIG = {
    CASINO: {
        icon: Gamepad2,
        label: 'Casino',
        accentColor: 'text-[var(--gold-bright)]',
        chipClass: 'chip-gold',
    },
    SPORTS: {
        icon: Trophy,
        label: 'Sports',
        accentColor: 'text-[var(--emerald)]',
        chipClass: 'chip-emerald',
    },
};

const APPLICABLE_LABELS: Record<string, string> = {
    CASINO: 'Casino only',
    SPORTS: 'Sports only',
    BOTH: 'Casino & Sports',
};

const CURRENCY_CONFIG: Record<string, { label: string; color: string }> = {
    INR: { label: 'Fiat & Crypto', color: 'text-[var(--gold-bright)]' },
    CRYPTO: { label: 'Crypto', color: 'text-[var(--gold-bright)]' },
    BOTH: { label: 'Fiat & Crypto', color: 'text-[var(--gold-bright)]' },
};

function DetailChip({ icon: Icon, label, value, accent, numeric = false }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    accent?: string;
    numeric?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-[var(--line)] last:border-0 gap-3">
            <div className="flex items-center gap-2 text-[12px] text-[var(--ink-faint)]">
                <Icon size={12} className="flex-shrink-0" />
                <span>{label}</span>
            </div>
            <div className={`text-[12px] font-bold text-right ${accent || 'text-[var(--ink-dim)]'} ${numeric ? 'num' : ''}`}>
                {value}
            </div>
        </div>
    );
}

const BonusConditionCard: React.FC<Props> = ({ bonus, currencySymbol = '₹' }) => {
    const [copied, setCopied] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const { isAuthenticated } = useAuth();
    const { openRegister, openUPIDeposit } = useModal();

    const cfg = TYPE_CONFIG[bonus.type] || TYPE_CONFIG.CASINO;
    const TypeIcon = cfg.icon;
    const currCfg = CURRENCY_CONFIG[bonus.currency || 'INR'];

    const isPercentage = bonus.percentage > 0;
    const fiatMinimum = bonus.minDepositFiat ?? bonus.minDeposit ?? 0;
    const cryptoMinimum = bonus.minDepositCrypto ?? bonus.minDeposit ?? 0;
    const minimumDepositLabel = bonus.currency === 'CRYPTO'
        ? (cryptoMinimum > 0 ? `$${cryptoMinimum.toLocaleString()}` : 'No minimum')
        : bonus.currency === 'BOTH'
            ? [
                fiatMinimum > 0 ? `₹${fiatMinimum.toLocaleString()} fiat` : null,
                cryptoMinimum > 0 ? `$${cryptoMinimum.toLocaleString()} crypto` : null,
            ].filter(Boolean).join(' / ') || 'No minimum'
            : (fiatMinimum > 0 ? `${currencySymbol}${fiatMinimum.toLocaleString()}` : 'No minimum');

    const handleCopy = () => {
        if (bonus.code) {
            navigator.clipboard.writeText(bonus.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClaimBonus = async () => {
        if (!bonus.code) {
            toast.error('This promotion does not have a deposit code yet.');
            return;
        }

        if (!isAuthenticated) {
            toast('Create your account to claim this deposit bonus.');
            openRegister();
            return;
        }

        try {
            await api.post('/bonus/pending', { bonusCode: bonus.code });
            toast.success(`${bonus.title} is ready for your deposit.`);
            openUPIDeposit();
        } catch {
            toast.error('Unable to attach this bonus right now. Please try again.');
        }
    };

    const usagePct = bonus.usageLimit > 0
        ? Math.min(100, Math.round((bonus.usageCount / bonus.usageLimit) * 100))
        : 0;

    return (
        <div className="group relative overflow-hidden rounded-[18px] bg-[var(--bg-surface)] border border-[var(--line-default)] flex flex-col transition-all duration-200 hover:border-[var(--line-gold)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] active:scale-[0.99] grain">
            {/* Top accent line */}
            <div className="h-[2px] bg-gold-grad" />

            {/* Header */}
            <div className="p-4 md:p-5 pb-3 md:pb-4">
                <div className="flex items-start justify-between gap-3 mb-3 md:mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-[12px] bg-[var(--gold-soft)] border border-[var(--line-gold)] flex items-center justify-center flex-shrink-0">
                            <TypeIcon size={18} className={cfg.accentColor} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-display font-bold text-[14px] text-[var(--ink-strong)] leading-tight truncate">
                                {bonus.title}
                            </h3>
                            {bonus.description && (
                                <p className="text-[11px] text-[var(--ink-faint)] mt-0.5 line-clamp-1">
                                    {bonus.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowInfo(v => !v)}
                        aria-expanded={showInfo}
                        aria-label="Toggle wagering info"
                        className="p-1.5 rounded-[10px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-raised)] flex-shrink-0 transition-colors border border-[var(--line)]"
                    >
                        <Info size={13} className="text-[var(--ink-faint)]" />
                    </button>
                </div>

                {/* Hero value + badges */}
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <div className="num font-display font-extrabold text-[28px] md:text-[32px] leading-none tracking-[-0.03em]">
                            {isPercentage
                                ? <span className="text-gold-grad">+{bonus.percentage}%</span>
                                : <span className="text-gold-grad">{currencySymbol}{bonus.amount.toLocaleString()}</span>}
                        </div>
                        {isPercentage && bonus.maxBonus > 0 && (
                            <div className="text-[12px] text-[var(--ink-faint)] mt-1.5">
                                Up to{' '}
                                <span className="num font-bold text-[var(--ink-dim)]">
                                    {currencySymbol}{bonus.maxBonus.toLocaleString()}
                                </span>{' '}
                                bonus
                            </div>
                        )}
                        {!isPercentage && bonus.amount > 0 && (
                            <div className="text-[12px] text-[var(--ink-faint)] mt-1.5">
                                Flat bonus — no deposit required
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                        <span className={`chip ${cfg.chipClass}`}>{cfg.label}</span>
                        <span className={`text-[10px] font-mono uppercase tracking-[0.06em] font-semibold ${currCfg.color}`}>
                            {currCfg.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Conditions */}
            <div className="px-4 md:px-5 pt-1 pb-1 flex-1">
                {showInfo && (
                    <div className="mb-3 p-3 bg-[var(--bg-elevated)] rounded-[12px] border border-[var(--line)] text-[11px] text-[var(--ink-faint)] leading-relaxed">
                        <span className="font-bold text-[var(--ink-dim)]">How wagering works: </span>
                        You must wager your bonus{' '}
                        <span className="num font-bold text-[var(--ink-dim)]">{bonus.wageringRequirement}×</span>{' '}
                        before withdrawing.
                        {bonus.depositWagerMultiplier > 1 && (
                            <>
                                {' '}You also need to wager your deposit amount{' '}
                                <span className="num font-bold text-[var(--ink-dim)]">{bonus.depositWagerMultiplier}×</span>.
                            </>
                        )}
                    </div>
                )}

                <DetailChip icon={Wallet} label="Min Deposit" value={minimumDepositLabel} numeric />
                <DetailChip
                    icon={BadgePercent}
                    label="Max Bonus"
                    value={bonus.maxBonus > 0 ? `${currencySymbol}${bonus.maxBonus.toLocaleString()}` : 'Uncapped'}
                    accent={bonus.maxBonus > 0 ? cfg.accentColor : 'text-[var(--ink-faint)]'}
                    numeric={bonus.maxBonus > 0}
                />
                <DetailChip
                    icon={Zap}
                    label="Wagering Req."
                    value={
                        <span>
                            <span className="num">{bonus.wageringRequirement}×</span>
                            <span className="text-[var(--ink-faint)] font-normal"> bonus amount</span>
                        </span>
                    }
                    accent={cfg.accentColor}
                />
                {bonus.depositWagerMultiplier > 1 && (
                    <DetailChip
                        icon={Coins}
                        label="Deposit Wager"
                        value={
                            <span>
                                <span className="num">{bonus.depositWagerMultiplier}×</span>
                                <span className="text-[var(--ink-faint)] font-normal"> deposit amount</span>
                            </span>
                        }
                    />
                )}
                <DetailChip
                    icon={Gamepad2}
                    label="Applies To"
                    value={APPLICABLE_LABELS[bonus.applicableTo] || bonus.applicableTo}
                />
                <DetailChip
                    icon={Clock}
                    label="Validity"
                    value={<><span className="num">{bonus.expiryDays}</span> days after claim</>}
                />
                {bonus.forFirstDepositOnly && (
                    <DetailChip
                        icon={Star}
                        label="First Deposit"
                        value="First deposit only"
                        accent="text-[var(--gold-bright)]"
                    />
                )}
                {bonus.usageLimit > 0 && (
                    <DetailChip
                        icon={Users}
                        label="Usage"
                        value={
                            <span className="num">
                                {bonus.usageCount.toLocaleString()} / {bonus.usageLimit.toLocaleString()}
                            </span>
                        }
                    />
                )}
                {bonus.validUntil && (
                    <DetailChip
                        icon={ShieldCheck}
                        label="Valid Until"
                        value={
                            <span className="num">
                                {new Date(bonus.validUntil).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                })}
                            </span>
                        }
                    />
                )}
            </div>

            {/* Usage progress */}
            {bonus.usageLimit > 0 && (
                <div className="px-4 md:px-5 pb-3">
                    <div className="h-1 rounded-full bg-[var(--ink-ghost)] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gold-grad transition-all duration-700"
                            style={{ width: `${usagePct}%` }}
                        />
                    </div>
                    <p className="text-[9px] text-[var(--ink-whisper)] mt-1 text-right">
                        <span className="num">{usagePct}%</span> claimed
                    </p>
                </div>
            )}

            {/* Footer: code + CTA */}
            <div className="p-4 pt-2 space-y-2.5 border-t border-[var(--line)]">
                {/* Promo code */}
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-dashed border-[var(--line-default)] rounded-[12px] px-3 py-2">
                    <span className="num font-bold text-[14px] tracking-widest text-[var(--ink-strong)] flex-1 truncate">
                        {bonus.code}
                    </span>
                    <button
                        type="button"
                        onClick={handleCopy}
                        aria-label="Copy code"
                        className="flex-shrink-0 w-7 h-7 rounded-[8px] flex items-center justify-center bg-[var(--bg-raised)] hover:bg-[var(--gold-soft)] transition-colors border border-[var(--line)]"
                    >
                        {copied
                            ? <Check size={12} className="text-[var(--emerald)]" />
                            : <Copy size={12} className="text-[var(--ink-faint)]" />}
                    </button>
                </div>

                {/* CTA */}
                <button
                    type="button"
                    onClick={handleClaimBonus}
                    className="btn btn-gold sweep w-full h-10 uppercase tracking-[0.06em] text-[11px]"
                >
                    Claim Bonus <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default BonusConditionCard;
