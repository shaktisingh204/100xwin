'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Ticket, Zap } from 'lucide-react';
import { useBets } from '@/context/BetContext';
import { useWallet } from '@/context/WalletContext';

interface OneClickBetControlsProps {
    className?: string;
}

const STAKE_PRESETS = [100, 500, 1_000, 5_000, 10_000, 25_000];

export default function OneClickBetControls({ className = '' }: OneClickBetControlsProps) {
    const {
        oneClickEnabled,
        oneClickStake,
        setOneClickEnabled,
        setOneClickStake,
    } = useBets();
    const { activeSymbol, selectedWallet } = useWallet();

    // Whether the inline amount panel is open
    const [amountOpen, setAmountOpen] = useState(false);
    const [customStake, setCustomStake] = useState(String(oneClickStake));
    const [pendingStake, setPendingStake] = useState<number>(oneClickStake);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync if external changes happen
    useEffect(() => {
        setCustomStake(String(oneClickStake));
        setPendingStake(oneClickStake);
    }, [oneClickStake]);

    // When enabled turns ON → open the amount panel right away
    const handleToggle = () => {
        const next = !oneClickEnabled;
        setOneClickEnabled(next);
        if (next) {
            setAmountOpen(true);
            setPendingStake(oneClickStake);
            setCustomStake(String(oneClickStake));
        } else {
            setAmountOpen(false);
        }
    };

    const selectPreset = (amount: number) => {
        setPendingStake(amount);
        setCustomStake(String(amount));
    };

    const applyStake = () => {
        const cleaned = customStake.replace(/[^0-9]/g, '');
        const val = Number(cleaned);
        if (!val) return;
        setOneClickStake(val);
        setPendingStake(val);
        setAmountOpen(false);
    };

    const handleCustomChange = (raw: string) => {
        const cleaned = raw.replace(/[^0-9]/g, '');
        setCustomStake(cleaned);
        const n = Number(cleaned);
        if (n > 0) setPendingStake(n);
    };

    // Focus input when panel opens
    useEffect(() => {
        if (amountOpen) {
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [amountOpen]);

    return (
        <section className={`overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] ${className}`}>

            {/* ── Top row: icon · label · wallet badge · toggle ── */}
            <div className="flex items-center gap-2 p-3">
                {/* Mode icon */}
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    oneClickEnabled
                        ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                        : 'border-white/[0.08] bg-white/[0.04] text-white/50'
                }`}>
                    {oneClickEnabled ? <Zap size={15} /> : <Ticket size={15} />}
                </div>

                {/* Label + sub-text */}
                <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black text-white leading-none">Quick Bet</p>
                    <p className="mt-0.5 text-[10px] text-white/50 leading-none">
                        {oneClickEnabled
                            ? `${activeSymbol}${oneClickStake.toLocaleString()} per click`
                            : 'Tap an odd to add to slip'}
                    </p>
                </div>

                {/* Wallet badge */}
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] ${
                    selectedWallet === 'crypto'
                        ? 'bg-purple-500/15 text-purple-300'
                        : 'bg-amber-500/10 text-amber-300'
                }`}>
                    {selectedWallet}
                </span>

                {/* Stake chip — visible only when enabled; opens/closes amount panel */}
                {oneClickEnabled && (
                    <button
                        type="button"
                        onClick={() => setAmountOpen((v) => !v)}
                        className={`flex-shrink-0 flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[10px] font-black transition-all ${
                            amountOpen
                                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                                : 'border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-white/[0.12] hover:text-white'
                        }`}
                    >
                        {activeSymbol}{oneClickStake.toLocaleString()}
                        {amountOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                )}

                {/* Enable / Disable toggle */}
                <button
                    type="button"
                    onClick={handleToggle}
                    className={`flex-shrink-0 relative h-8 rounded-xl border px-3 transition-all ${
                        oneClickEnabled
                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                            : 'border-white/[0.08] bg-white/[0.04] text-white/50'
                    }`}
                >
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                        <span>{oneClickEnabled ? 'ON' : 'OFF'}</span>
                        <span className={`h-2 w-2 rounded-full transition-all ${
                            oneClickEnabled
                                ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                                : 'bg-white/25'
                        }`} />
                    </span>
                </button>
            </div>

            {/* ── Inline amount panel — slides in when amountOpen ── */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    amountOpen ? 'max-h-[260px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="border-t border-white/[0.06] px-3 pb-3 pt-2.5">
                    {/* Section label */}
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
                        Set one-click amount
                    </p>

                    {/* Preset grid */}
                    <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                        {STAKE_PRESETS.map((amount) => {
                            const active = pendingStake === amount;
                            return (
                                <button
                                    key={amount}
                                    type="button"
                                    onClick={() => selectPreset(amount)}
                                    className={`num min-h-[44px] rounded-xl border py-2 text-[12px] font-black transition-all active:scale-95 ${
                                        active
                                            ? 'border-[var(--gold-line)] bg-[var(--gold-soft)] text-[var(--gold-bright)]'
                                            : 'border-[var(--line-default)] bg-white/[0.04] text-[var(--ink-dim)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]'
                                    }`}
                                >
                                    {activeSymbol}{amount >= 1000 ? `${amount / 1000}K` : amount}
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom input + apply */}
                    <div className="flex items-center gap-2">
                        <div className="flex min-h-[44px] flex-1 items-center rounded-xl border border-[var(--line-default)] bg-white/[0.02] px-3 focus-within:border-[var(--gold-line)] transition-colors">
                            <span className="num text-[13px] font-black text-[var(--ink-dim)] flex-shrink-0">{activeSymbol}</span>
                            <input
                                ref={inputRef}
                                type="text"
                                inputMode="numeric"
                                value={customStake}
                                onChange={(e) => handleCustomChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); applyStake(); }
                                }}
                                placeholder="Custom amount"
                                className="num ml-1.5 w-full bg-transparent text-[14px] font-bold text-[var(--ink)] outline-none placeholder:text-[var(--ink-whisper)]"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={applyStake}
                            aria-label="Apply stake"
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gold-grad text-[#120c00] transition-all hover:brightness-110 active:scale-95"
                        >
                            <Check size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
