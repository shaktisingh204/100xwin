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
        accentColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    },
    SPORTS: {
        icon: Trophy,
        label: 'Sports',
        accentColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    },
};

const APPLICABLE_LABELS: Record<string, string> = {
    CASINO: 'Casino only',
    SPORTS: 'Sports only',
    BOTH: 'Casino & Sports',
};

const CURRENCY_CONFIG: Record<string, { label: string; color: string }> = {
    INR: { label: 'Fiat & Crypto', color: 'text-amber-400' },
    CRYPTO: { label: 'Crypto', color: 'text-amber-400' },
    BOTH: { label: 'Fiat & Crypto', color: 'text-amber-400' },
};

function DetailChip({ icon: Icon, label, value, accent }: {
    icon: React.ElementType; label: string; value: React.ReactNode; accent?: string;
}) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
            <div className="flex items-center gap-2 text-[12px] text-white/50">
                <Icon size={12} className="flex-shrink-0" />
                <span>{label}</span>
            </div>
            <div className={`text-[12px] font-black ${accent || 'text-white/70'}`}>{value}</div>
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
        <div
            className="
                group relative overflow-hidden rounded-2xl bg-white/[0.02]
                border border-white/[0.06]
                flex flex-col transition-all duration-200
                hover:border-amber-500/30 hover:shadow-[0_8px_32px_rgba(245,158,11,0.1)]
                active:scale-[0.99]
            "
        >
            {/* Top accent line */}
            <div className="h-[2px] bg-gradient-to-r from-amber-500 to-orange-600" />

            {/* Header Section */}
            <div className="p-5 pb-4">
                {/* Top row: title + info toggle */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                            <TypeIcon size={18} className={cfg.accentColor} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[14px] font-black text-white leading-tight truncate">{bonus.title}</h3>
                            {bonus.description && (
                                <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">{bonus.description}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowInfo(v => !v)}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex-shrink-0 transition-colors"
                        title="Toggle wagering info"
                    >
                        <Info size={13} className="text-white/50" />
                    </button>
                </div>

                {/* Hero value + badges */}
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <div className="text-3xl font-black text-white leading-none tracking-tight">
                            {isPercentage
                                ? <span className={cfg.accentColor}>+{bonus.percentage}%</span>
                                : <span className={cfg.accentColor}>{currencySymbol}{bonus.amount.toLocaleString()}</span>
                            }
                        </div>
                        {isPercentage && bonus.maxBonus > 0 && (
                            <div className="text-[12px] text-white/50 mt-1.5">
                                Up to <span className="text-white/70 font-black">{currencySymbol}{bonus.maxBonus.toLocaleString()}</span> bonus
                            </div>
                        )}
                        {!isPercentage && bonus.amount > 0 && (
                            <div className="text-[12px] text-white/50 mt-1.5">Flat bonus — no deposit required</div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${cfg.badgeBg} tracking-wider`}>
                            {cfg.label}
                        </span>
                        <span className={`text-[10px] font-black ${currCfg.color}`}>
                            {currCfg.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Conditions */}
            <div className="px-5 pt-1 pb-1 flex-1">
                {showInfo && (
                    <div className="mb-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] text-[11px] text-white/50 leading-relaxed">
                        <span className="font-black text-white/70">How wagering works: </span>
                        You must wager your bonus <span className="font-black text-white/70">{bonus.wageringRequirement}×</span> before withdrawing.
                        {bonus.depositWagerMultiplier > 1 && (
                            <> You also need to wager your deposit amount <span className="font-black text-white/70">{bonus.depositWagerMultiplier}×</span>.</>
                        )}
                    </div>
                )}

                <DetailChip icon={Wallet} label="Min Deposit" value={minimumDepositLabel} />
                <DetailChip icon={BadgePercent} label="Max Bonus"
                    value={bonus.maxBonus > 0 ? `${currencySymbol}${bonus.maxBonus.toLocaleString()}` : 'Uncapped'}
                    accent={bonus.maxBonus > 0 ? cfg.accentColor : 'text-white/50'}
                />
                <DetailChip icon={Zap} label="Wagering Req."
                    value={<span>{bonus.wageringRequirement}<span className="text-white/50 font-normal">× bonus amount</span></span>}
                    accent={cfg.accentColor}
                />
                {bonus.depositWagerMultiplier > 1 && (
                    <DetailChip icon={Coins} label="Deposit Wager"
                        value={<span>{bonus.depositWagerMultiplier}<span className="text-white/50 font-normal">× deposit amount</span></span>}
                    />
                )}
                <DetailChip icon={Gamepad2} label="Applies To"
                    value={APPLICABLE_LABELS[bonus.applicableTo] || bonus.applicableTo}
                />
                <DetailChip icon={Clock} label="Validity"
                    value={`${bonus.expiryDays} days after claim`}
                />
                {bonus.forFirstDepositOnly && (
                    <DetailChip icon={Star} label="First Deposit"
                        value="First deposit only"
                        accent="text-amber-400"
                    />
                )}
                {bonus.usageLimit > 0 && (
                    <DetailChip icon={Users} label="Usage"
                        value={<span>{bonus.usageCount.toLocaleString()} / {bonus.usageLimit.toLocaleString()} claimed</span>}
                        accent="text-white/70"
                    />
                )}
                {bonus.validUntil && (
                    <DetailChip icon={ShieldCheck} label="Valid Until"
                        value={new Date(bonus.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    />
                )}
            </div>

            {/* Usage progress */}
            {bonus.usageLimit > 0 && (
                <div className="px-5 pb-3">
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-700"
                            style={{ width: `${usagePct}%` }}
                        />
                    </div>
                    <p className="text-[9px] text-white/25 mt-1 text-right">{usagePct}% claimed</p>
                </div>
            )}

            {/* Footer: code + CTA */}
            <div className="p-4 pt-2 space-y-2.5 border-t border-white/[0.06]">
                {/* Promo code */}
                <div className="flex items-center gap-2 bg-white/[0.03] border border-dashed border-white/[0.08] rounded-xl px-3 py-2">
                    <span className="font-mono font-black text-sm tracking-widest text-white flex-1 truncate">{bonus.code}</span>
                    <button
                        onClick={handleCopy}
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        title="Copy code"
                    >
                        {copied
                            ? <Check size={12} className="text-emerald-400" />
                            : <Copy size={12} className="text-white/50" />
                        }
                    </button>
                </div>

                {/* CTA */}
                <button
                    type="button"
                    onClick={handleClaimBonus}
                    className="
                        w-full flex items-center justify-center gap-2
                        py-2.5 rounded-xl font-black text-sm
                        bg-gradient-to-r from-amber-500 to-orange-600
                        text-[#1a1208]
                        hover:opacity-90 hover:scale-[1.01]
                        active:scale-[0.99]
                        transition-all duration-200
                    "
                >
                    Claim Bonus <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default BonusConditionCard;
