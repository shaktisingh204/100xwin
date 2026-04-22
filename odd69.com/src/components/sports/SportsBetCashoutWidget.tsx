'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Loader2,
    RotateCcw,
} from 'lucide-react';
import { betsApi, Bet, CashoutOffer, CashoutResult } from '@/services/bets';
import { useWallet } from '@/context/WalletContext';

type CashoutPhase =
    | 'LOADING'
    | 'UNAVAILABLE'
    | 'SUSPENDED'
    | 'FULL_REFUND'
    | 'IDLE'
    | 'CONFIRMING'
    | 'PRICE_CHANGED'
    | 'EXECUTING'
    | 'SUCCESS';

interface SportsBetCashoutWidgetProps {
    bet: Bet;
    onSuccess: () => void | Promise<void>;
    compact?: boolean;
}

export default function SportsBetCashoutWidget({
    bet,
    onSuccess,
    compact = false,
}: SportsBetCashoutWidgetProps) {
    const { activeSymbol } = useWallet();
    const [offer, setOffer] = useState<CashoutOffer | null>(null);
    const [phase, setPhase] = useState<CashoutPhase>('LOADING');
    const [fraction, setFraction] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [priceChangedValue, setPriceChangedValue] = useState<number | null>(null);
    const [result, setResult] = useState<CashoutResult | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchOffer = useCallback(async (signal?: AbortSignal) => {
        try {
            const data = await betsApi.getCashoutOffer(bet.id);
            if (signal?.aborted) return;

            setOffer(data);
            setPhase((prev) => {
                if (prev === 'CONFIRMING' || prev === 'PRICE_CHANGED' || prev === 'EXECUTING' || prev === 'SUCCESS') {
                    return prev;
                }
                if (data.status === 'UNAVAILABLE') return 'UNAVAILABLE';
                if (data.status === 'SUSPENDED') return 'SUSPENDED';
                if (data.fullRefundEligible) return 'FULL_REFUND';
                return 'IDLE';
            });
        } catch (err: unknown) {
            const maybeAxiosError = err as { response?: { status?: number; data?: { message?: string } } };
            const message = maybeAxiosError.response?.data?.message;

            if (maybeAxiosError.response?.status === 503) {
                setOffer({
                    betId: bet.id,
                    status: 'SUSPENDED',
                    reason: message || 'Sports cash out is temporarily unavailable due to maintenance.',
                });
                setPhase('SUSPENDED');
            }
        }
    }, [bet.id]);

    useEffect(() => {
        const ctrl = new AbortController();
        const initialFetch = setTimeout(() => {
            void fetchOffer(ctrl.signal);
        }, 0);
        timerRef.current = setInterval(() => fetchOffer(ctrl.signal), 8000);

        return () => {
            clearTimeout(initialFetch);
            ctrl.abort();
            if (timerRef.current) clearInterval(timerRef.current);
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        };
    }, [fetchOffer]);

    const restartPolling = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => fetchOffer(), 8000);
    }, [fetchOffer]);

    const doExecute = async (opts: { fraction: number; clientExpectedValue?: number; fullRefund?: boolean }) => {
        setPhase('EXECUTING');
        setError(null);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const res = await betsApi.executeCashout(bet.id, opts);
            if (res.status === 'PRICE_CHANGED') {
                setPriceChangedValue(res.newCashoutValue ?? null);
                setPhase('PRICE_CHANGED');
                restartPolling();
                return;
            }

            setResult(res);
            setPhase('SUCCESS');
            setTimeout(() => {
                void onSuccess();
            }, 1200);
        } catch (err: unknown) {
            const maybeAxiosError = err as { response?: { data?: { message?: string } }; message?: string };
            const msg = maybeAxiosError.response?.data?.message || maybeAxiosError.message || 'Cash out failed. Please try again.';
            setError(msg);
            setPhase('IDLE');
            void fetchOffer();
            restartPolling();
        }
    };

    const handleFirstTap = () => {
        setPhase('CONFIRMING');
        setError(null);
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = setTimeout(() => setPhase('IDLE'), 8000);
    };

    const handleCancel = () => {
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        setPhase('IDLE');
        setPriceChangedValue(null);
        setError(null);
    };

    const displayValue = offer?.cashoutValue ?? 0;
    const partialValue = parseFloat((displayValue * fraction).toFixed(2));
    const restStake = parseFloat(((offer?.stake ?? bet.stake) * (1 - fraction)).toFixed(2));

    // Determine profitability vs original stake so we can switch button color per spec
    const originalStake = offer?.stake ?? bet.stake ?? 0;
    const isProfitable = partialValue >= originalStake * fraction;

    const containerCls = compact
        ? 'rounded-xl bg-white/[0.04] border border-amber-500/25 p-2.5 space-y-2.5'
        : 'rounded-xl bg-white/[0.04] border border-amber-500/30 p-3 space-y-3';
    const textXsCls = compact ? 'text-[10px]' : 'text-[11px]';

    if (phase === 'LOADING') {
        return (
            <div className="flex items-center gap-1.5 py-1 text-[11px] text-white/25">
                <Loader2 size={10} className="animate-spin" />
                <span>Fetching offer...</span>
            </div>
        );
    }

    if (phase === 'UNAVAILABLE') return null;

    if (phase === 'SUSPENDED') {
        return (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                <div className="flex items-center gap-1.5">
                    <AlertCircle size={12} className="text-white/25" />
                    <span className="text-[11px] font-medium text-white/50">Cash Out Suspended</span>
                </div>
            </div>
        );
    }

    if (phase === 'SUCCESS') {
        const isFull = !result?.remainingStake || result.remainingStake === 0;
        const isPartial = result?.status === 'PARTIAL_CASHED_OUT';

        return (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                <div className="text-xs">
                    <p className="font-black text-emerald-300">
                        {isPartial ? 'Partial Cash Out Successful!' : 'Cashed Out!'}
                    </p>
                    {result?.cashoutValue && (
                        <p className="mt-0.5 text-[10px] text-emerald-300/70">
                            {activeSymbol}{result.cashoutValue.toFixed(2)} added to wallet
                            {isFull ? '' : ` · ${activeSymbol}${result.remainingStake?.toFixed(2)} still active`}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (phase === 'FULL_REFUND' || (phase === 'IDLE' && offer?.fullRefundEligible)) {
        if (phase === 'IDLE') {
            return (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <button
                            onClick={handleFirstTap}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2.5 text-[11px] font-black text-[#1a1208] transition-all hover:brightness-110 active:scale-[0.98]"
                        >
                            <DollarSign size={12} />
                            Cash Out {activeSymbol}{displayValue.toFixed(2)}
                        </button>
                        <button
                            onClick={() => doExecute({ fraction: 1, fullRefund: true })}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2.5 text-[11px] font-black text-emerald-300 transition-all hover:bg-emerald-500/25 active:scale-[0.98]"
                        >
                            <RotateCcw size={12} />
                            Cancel Bet {activeSymbol}{offer?.fullRefundValue?.toFixed(2)}
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-white/50">
                        Pre-match · Cancel for full stake back
                    </p>
                </div>
            );
        }
    }

    if (phase === 'PRICE_CHANGED') {
        return (
            <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-center gap-2">
                    <AlertCircle size={13} className="shrink-0 text-amber-300" />
                    <p className="text-xs font-black text-amber-300">Odds Changed</p>
                </div>
                <p className="text-[11px] leading-relaxed text-white/70">
                    The market moved. New offer:{' '}
                    <span className="font-black text-white">{activeSymbol}{priceChangedValue?.toFixed(2)}</span>
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={handleCancel}
                        className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 text-[11px] font-black text-white/50 transition-all hover:text-white/70"
                    >
                        Decline
                    </button>
                    <button
                        onClick={() => doExecute({ fraction, clientExpectedValue: priceChangedValue ?? undefined })}
                        className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 py-2 text-[11px] font-black text-[#1a1208] transition-all hover:brightness-110 active:scale-[0.98]"
                    >
                        Accept {activeSymbol}{priceChangedValue?.toFixed(2)}
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'EXECUTING') {
        return (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3">
                <Loader2 size={14} className="animate-spin text-amber-300" />
                <span className="text-xs font-black text-amber-300">Processing...</span>
            </div>
        );
    }

    if (phase === 'IDLE') {
        // Cash-out main button: green when profitable, red when loss
        const btnCls = isProfitable
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-black hover:brightness-110'
            : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white font-black hover:brightness-110';
        return (
            <div className="space-y-1.5">
                <button
                    onClick={handleFirstTap}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs transition-all active:scale-[0.98] ${btnCls}`}
                >
                    <DollarSign size={13} />
                    Cash Out {activeSymbol}{displayValue.toFixed(2)}
                </button>
                <div className="flex justify-between px-1 text-[10px] text-white/25">
                    <span>Live odds: {offer?.currentOdds}</span>
                    <span>Original: {offer?.originalOdds}</span>
                </div>
                {error && (
                    <p className="flex items-center gap-1 text-[11px] text-rose-400">
                        <AlertCircle size={10} /> {error}
                    </p>
                )}
            </div>
        );
    }

    const isFullCashout = fraction >= 0.99;

    return (
        <div className={containerCls}>
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-black text-white">Confirm Cash Out</p>
                <button
                    onClick={handleCancel}
                    className="text-[10px] text-white/50 transition-all hover:text-white/70"
                >
                    Cancel
                </button>
            </div>

            <div className="space-y-2">
                <div className={`flex items-center justify-between text-white/50 ${textXsCls}`}>
                    <span>Partial</span>
                    <span className="font-black text-white">{Math.round(fraction * 100)}%</span>
                    <span>Full</span>
                </div>
                <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={Math.round(fraction * 100)}
                    onChange={(e) => setFraction(parseInt(e.target.value, 10) / 100)}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, #f59e0b ${Math.round(fraction * 100)}%, rgba(255,255,255,0.08) ${Math.round(fraction * 100)}%)`,
                    }}
                />
                <div className="flex justify-center gap-1.5">
                    {[25, 50, 75, 100].map((pct) => (
                        <button
                            key={pct}
                            onClick={() => setFraction(pct / 100)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
                                Math.round(fraction * 100) === pct
                                    ? 'bg-amber-500 text-[#1a1208]'
                                    : 'bg-white/[0.04] text-white/50 hover:text-white/70'
                            }`}
                        >
                            {pct}%
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                    <p className="text-white/50">You receive</p>
                    <p className="mt-0.5 text-xs font-black text-amber-300">{activeSymbol}{partialValue.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                    <p className="text-white/50">{isFullCashout ? 'Bet closed' : 'Still active'}</p>
                    <p className={`mt-0.5 text-xs font-black ${isFullCashout ? 'text-white/50' : 'text-emerald-300'}`}>
                        {isFullCashout ? '—' : `${activeSymbol}${restStake.toFixed(2)} stake`}
                    </p>
                </div>
            </div>

            <button
                onClick={() => {
                    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
                    doExecute({
                        fraction,
                        clientExpectedValue: partialValue,
                    });
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs transition-all active:scale-[0.98] ${
                    isProfitable
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-black hover:brightness-110'
                        : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white font-black hover:brightness-110'
                }`}
            >
                <CheckCircle2 size={14} />
                {isFullCashout
                    ? `Cash Out ${activeSymbol}${partialValue.toFixed(2)}`
                    : `Partial Cash Out ${activeSymbol}${partialValue.toFixed(2)}`}
            </button>

            {error && (
                <p className="flex items-center justify-center gap-1 text-center text-[11px] text-rose-400">
                    <AlertCircle size={10} /> {error}
                </p>
            )}
        </div>
    );
}
