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
        gradient: 'from-purple-600/20 to-purple-900/5',
        border: 'border-purple-500/30',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        glow: 'shadow-purple-900/20',
        accent: 'text-purple-400',
        bar: 'from-purple-500 to-violet-500',
        ring: 'ring-purple-500/20',
    },
    SPORTS: {
        icon: Trophy,
        label: 'Sports',
        gradient: 'from-emerald-600/20 to-emerald-900/5',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        glow: 'shadow-emerald-900/20',
        accent: 'text-emerald-400',
        bar: 'from-emerald-500 to-teal-400',
        ring: 'ring-emerald-500/20',
    },
};

const APPLICABLE_LABELS: Record<string, string> = {
    CASINO: 'Casino only',
    SPORTS: 'Sports only',
    BOTH: 'Casino & Sports',
};

const CURRENCY_CONFIG: Record<string, { label: string; color: string }> = {
    INR: { label: '₹ Fiat / INR', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
    CRYPTO: { label: '₿ Crypto', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    BOTH: { label: 'Fiat & Crypto', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
};

function ConditionRow({ icon: Icon, label, value, accent }: {
    icon: React.ElementType; label: string; value: React.ReactNode; accent?: string;
}) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
            <div className="flex items-center gap-2 text-xs text-white/40">
                <Icon size={13} className="flex-shrink-0" />
                <span>{label}</span>
            </div>
            <div className={`text-xs font-bold ${accent || 'text-white/80'}`}>{value}</div>
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
            className={`
                relative overflow-hidden rounded-2xl bg-[#13151a]
                border ${cfg.border}
                shadow-xl ${cfg.glow}
                ring-1 ${cfg.ring}
                flex flex-col transition-all duration-300
                hover:shadow-2xl hover:scale-[1.01]
            `}
        >
            {/* ── TOP GRADIENT BAND ── */}
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${cfg.bar} opacity-60`} />

            {/* ── HEADER ── */}
            <div className={`bg-gradient-to-br ${cfg.gradient} p-5 pb-4`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                            <TypeIcon size={18} className={cfg.accent} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-white leading-tight truncate">{bonus.title}</h3>
                            {bonus.description && (
                                <p className="text-[11px] text-white/40 mt-0.5 line-clamp-1">{bonus.description}</p>
                            )}
                        </div>
                    </div>
                    {/* Info toggle */}
                    <button
                        onClick={() => setShowInfo(v => !v)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 flex-shrink-0 transition-colors"
                        title="Toggle wagering info"
                    >
                        <Info size={13} className="text-white/40" />
                    </button>
                </div>

                {/* ── BONUS VALUE HERO ── */}
                <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                        <div className="text-3xl font-black text-white leading-none tracking-tight">
                            {isPercentage
                                ? <><span className={cfg.accent}>+{bonus.percentage}%</span></>
                                : <span className={cfg.accent}>{currencySymbol}{bonus.amount.toLocaleString()}</span>
                            }
                        </div>
                        {isPercentage && bonus.maxBonus > 0 && (
                            <div className="text-xs text-white/40 mt-1">
                                Up to <span className="text-white/70 font-bold">{currencySymbol}{bonus.maxBonus.toLocaleString()}</span> bonus
                            </div>
                        )}
                        {!isPercentage && bonus.amount > 0 && (
                            <div className="text-xs text-white/40 mt-1">Flat bonus — no deposit required</div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                        {/* Type badge */}
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${cfg.badge} tracking-wider`}>
                            {cfg.label}
                        </span>
                        {/* Currency badge */}
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${currCfg.color} tracking-wide`}>
                            {currCfg.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── CONDITIONS GRID ── */}
            <div className="px-5 pt-3 pb-1 flex-1">
                {/* Wagering explainer */}
                {showInfo && (
                    <div className="mb-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] text-[11px] text-white/50 leading-relaxed">
                        <span className="font-bold text-white/70">How wagering works: </span>
                        You must wager your bonus <span className="font-bold text-white/70">{bonus.wageringRequirement}×</span> before withdrawing.
                        {bonus.depositWagerMultiplier > 1 && (
                            <> You also need to wager your deposit amount <span className="font-bold text-white/70">{bonus.depositWagerMultiplier}×</span>.</>
                        )}
                    </div>
                )}

                <ConditionRow
                    icon={Wallet}
                    label="Min Deposit"
                    value={bonus.minDeposit > 0 ? `${currencySymbol}${bonus.minDeposit.toLocaleString()}` : 'No minimum'}
                    accent={bonus.minDeposit > 0 ? 'text-white/80' : 'text-white/40'}
                />
                <ConditionRow
                    icon={BadgePercent}
                    label="Max Bonus"
                    value={bonus.maxBonus > 0 ? `${currencySymbol}${bonus.maxBonus.toLocaleString()}` : 'Uncapped'}
                    accent={bonus.maxBonus > 0 ? cfg.accent : 'text-white/40'}
                />
                <ConditionRow
                    icon={Zap}
                    label="Wagering Req."
                    value={<span>{bonus.wageringRequirement}<span className="text-white/40 font-normal">× bonus amount</span></span>}
                    accent={cfg.accent}
                />
                {bonus.depositWagerMultiplier > 1 && (
                    <ConditionRow
                        icon={Coins}
                        label="Deposit Wager"
                        value={<span>{bonus.depositWagerMultiplier}<span className="text-white/40 font-normal">× deposit amount</span></span>}
                        accent="text-white/70"
                    />
                )}
                <ConditionRow
                    icon={Gamepad2}
                    label="Applies To"
                    value={APPLICABLE_LABELS[bonus.applicableTo] || bonus.applicableTo}
                    accent="text-white/80"
                />
                <ConditionRow
                    icon={Clock}
                    label="Validity"
                    value={`${bonus.expiryDays} days after claim`}
                    accent="text-white/80"
                />
                {bonus.forFirstDepositOnly && (
                    <ConditionRow
                        icon={Star}
                        label="First Deposit"
                        value="First deposit only"
                        accent="text-amber-400"
                    />
                )}
                {bonus.usageLimit > 0 && (
                    <ConditionRow
                        icon={Users}
                        label="Usage"
                        value={<span>{bonus.usageCount.toLocaleString()} / {bonus.usageLimit.toLocaleString()} claimed</span>}
                        accent="text-white/60"
                    />
                )}
                {bonus.validUntil && (
                    <ConditionRow
                        icon={ShieldCheck}
                        label="Valid Until"
                        value={new Date(bonus.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        accent="text-white/70"
                    />
                )}
            </div>

            {/* ── USAGE PROGRESS BAR (if capped) ── */}
            {bonus.usageLimit > 0 && (
                <div className="px-5 pb-3">
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${cfg.bar} transition-all duration-700`}
                            style={{ width: `${usagePct}%` }}
                        />
                    </div>
                    <p className="text-[9px] text-white/25 mt-1 text-right">{usagePct}% claimed</p>
                </div>
            )}

            {/* ── FOOTER: CODE + CTA ── */}
            <div className="p-4 pt-2 space-y-2.5 border-t border-white/[0.05]">
                {/* Promo code */}
                <div className="flex items-center gap-2 bg-black/30 border border-dashed border-white/10 rounded-xl px-3 py-2">
                    <span className="font-mono font-black text-sm tracking-widest text-white flex-1 truncate">{bonus.code}</span>
                    <button
                        onClick={handleCopy}
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
                        title="Copy code"
                    >
                        {copied
                            ? <Check size={12} className="text-green-400" />
                            : <Copy size={12} className="text-white/40" />
                        }
                    </button>
                </div>

                {/* CTA */}
                <button
                    type="button"
                    onClick={handleClaimBonus}
                    className={`
                        w-full flex items-center justify-center gap-2
                        py-2.5 rounded-xl font-black text-sm uppercase tracking-wider
                        bg-gradient-to-r ${cfg.bar}
                        text-white shadow-lg
                        hover:opacity-90 hover:scale-[1.02]
                        transition-all duration-200
                    `}
                >
                    Claim Bonus <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default BonusConditionCard;
