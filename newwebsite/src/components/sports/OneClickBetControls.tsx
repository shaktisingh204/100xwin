'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Ticket, X, Zap } from 'lucide-react';
import { useBets } from '@/context/BetContext';
import { useWallet } from '@/context/WalletContext';

interface OneClickBetControlsProps {
    className?: string;
}

const stakePresets = [100, 500, 1000, 5000];

export default function OneClickBetControls({ className = '' }: OneClickBetControlsProps) {
    const {
        oneClickEnabled,
        oneClickStake,
        setOneClickEnabled,
        setOneClickStake,
    } = useBets();
    const { activeSymbol, selectedWallet } = useWallet();
    const [isStakeDialogOpen, setIsStakeDialogOpen] = useState(false);
    const [customStake, setCustomStake] = useState(String(oneClickStake));

    useEffect(() => {
        setCustomStake(String(oneClickStake));
    }, [oneClickStake]);

    const applyStake = (value: string | number) => {
        const normalized = String(value).replace(/[^0-9]/g, '');
        if (!normalized) return;

        setOneClickStake(Number(normalized));
        setCustomStake(normalized);
        setIsStakeDialogOpen(false);
    };

    return (
        <section className={`rounded-2xl border border-white/[0.06] bg-[#1a1d21] p-3 ${className}`}>
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border flex-shrink-0 ${
                    oneClickEnabled
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/[0.08] bg-white/[0.04] text-white/40'
                }`}>
                    {oneClickEnabled ? <Zap size={16} /> : <Ticket size={16} />}
                </div>

                <div className="min-w-0 flex-shrink-0">
                    <p className="text-[12px] font-black text-white">One-Click Bet</p>
                    <p className="text-[10px] text-white/35">
                        {oneClickEnabled
                            ? `Instant ${activeSymbol}${oneClickStake}`
                            : 'Adds to betslip'}
                    </p>
                </div>

                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] flex-shrink-0 ${
                    selectedWallet === 'crypto'
                        ? 'bg-purple-500/10 text-purple-300'
                        : 'bg-brand-gold/10 text-brand-gold'
                }`}>
                    {selectedWallet}
                </span>

                <button
                    type="button"
                    onClick={() => setOneClickEnabled(!oneClickEnabled)}
                    className={`relative h-9 min-w-[112px] rounded-xl border px-3 transition-all flex-shrink-0 ${
                        oneClickEnabled
                            ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300'
                            : 'border-white/[0.08] bg-white/[0.04] text-white/55'
                    }`}
                >
                    <span className="flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.2em]">
                        <span>{oneClickEnabled ? 'Enabled' : 'Disabled'}</span>
                        <span className={`h-2.5 w-2.5 rounded-full ${
                            oneClickEnabled ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'bg-white/20'
                        }`} />
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setIsStakeDialogOpen(true)}
                    className={`flex h-9 min-w-[136px] items-center justify-between gap-2 rounded-xl border px-3 text-[11px] font-black transition-all flex-shrink-0 ${
                        isStakeDialogOpen
                            ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300'
                            : 'border-white/[0.08] bg-[#111316] text-white/70 hover:border-white/15 hover:text-white'
                    }`}
                >
                    <span>Stake {activeSymbol}{oneClickStake}</span>
                    <ChevronDown size={14} className={`transition-transform ${isStakeDialogOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isStakeDialogOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close amount dialog"
                        onClick={() => setIsStakeDialogOpen(false)}
                        className="fixed inset-0 z-[98] bg-black/70 backdrop-blur-sm"
                    />

                    <div className="fixed inset-0 z-[99] flex items-end justify-center p-3 md:items-center md:p-4">
                        <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#101215] shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                                <div>
                                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">One-Click Amount</p>
                                    <p className="mt-1 text-[11px] text-white/35">Pick a preset or enter a custom stake</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsStakeDialogOpen(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-white/45 transition-all hover:bg-white/[0.08] hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-4">
                                <div className="flex flex-wrap gap-2">
                                    {stakePresets.map((amount) => {
                                        const active = oneClickStake === amount;
                                        return (
                                            <button
                                                key={amount}
                                                type="button"
                                                onClick={() => applyStake(amount)}
                                                className={`rounded-2xl border px-4 py-2.5 text-[13px] font-black transition-all ${
                                                    active
                                                        ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-300'
                                                        : 'border-white/[0.06] bg-[#16191d] text-white/65 hover:border-white/15 hover:text-white'
                                                }`}
                                            >
                                                {activeSymbol}{amount}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-[#16191d] p-3">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                        Custom Amount
                                    </label>

                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="flex h-11 flex-1 items-center rounded-2xl border border-white/[0.08] bg-[#0f1114] px-3">
                                            <span className="text-[13px] font-black text-white/40">{activeSymbol}</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={customStake}
                                                onChange={(event) => setCustomStake(event.target.value.replace(/[^0-9]/g, ''))}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter') {
                                                        event.preventDefault();
                                                        applyStake(customStake);
                                                    }
                                                }}
                                                placeholder="Enter amount"
                                                className="ml-2 w-full bg-transparent text-[14px] font-bold text-white outline-none placeholder:text-white/20"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => applyStake(customStake)}
                                            className="h-11 rounded-2xl bg-emerald-500 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-black transition-all hover:bg-emerald-400"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
