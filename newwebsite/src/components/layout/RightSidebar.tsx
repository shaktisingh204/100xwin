'use client';

import { Ticket, History, X, CheckCircle, AlertCircle, Trash2, ChevronUp } from 'lucide-react';
import { useBets } from '@/context/BetContext';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import SportsBetCashoutWidget from '@/components/sports/SportsBetCashoutWidget';
import { showBetErrorToast, showBetPlacedToast } from '@/utils/betToasts';
import {
    getBetNetPnL,
    getBetOriginalStake,
    getBetPartialCashoutValue,
    getBetPendingMaxReturn,
    getBetSettledReturn,
    hasPartialCashout,
} from '@/utils/sportsBetDisplay';
import { isLineBasedFancyMarket } from '@/utils/sportsBetPricing';

/* ─── BetCard — extracted so React never re-creates it on parent re-renders ─── */
interface BetCardProps {
    bet: {
        id: string;
        eventName: string;
        marketName: string;
        selectionName: string;
        odds: number;
        marketType?: string;
        stake: number;
        potentialWin: number;
    };
    activeSymbol: string;
    onRemove: (id: string) => void;
    onStake: (id: string, value: number) => void;
}

function BetCard({ bet, activeSymbol, onRemove, onStake }: BetCardProps) {
    const [stakeStr, setStakeStr] = useState<string>(
        bet.stake ? String(bet.stake) : ''
    );

    const contextVal = bet.stake ? String(bet.stake) : '';
    useEffect(() => {
        const syncTimer = setTimeout(() => {
            setStakeStr((prev) => (prev !== contextVal ? contextVal : prev));
        }, 0);
        return () => clearTimeout(syncTimer);
    }, [contextVal]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        setStakeStr(raw);
        const num = parseFloat(raw);
        onStake(bet.id, isNaN(num) ? 0 : num);
    };

    const isLine = isLineBasedFancyMarket({
        marketType: bet.marketType,
        marketName: bet.marketName,
        selectionName: bet.selectionName,
    });

    return (
        <div className="group relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-2xl p-4 border border-white/[0.06] hover:border-white/[0.1] transition-all duration-200">
            {/* Remove button */}
            <button
                onClick={() => onRemove(bet.id)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/[0.04] text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
            >
                <X size={12} />
            </button>

            {/* Event + Market */}
            <div className="pr-8">
                <div className="text-[12px] text-white/90 font-semibold leading-tight line-clamp-1">{bet.eventName}</div>
                <div className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">{bet.marketName}</div>
            </div>

            {/* Selection pill + Odds */}
            <div className="flex items-center justify-between mt-3 gap-2">
                <span className="text-[12px] font-bold text-emerald-400 truncate">{bet.selectionName}</span>
                <span className="text-[13px] font-black text-white bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 rounded-full flex-shrink-0">
                    {isLine ? `${bet.odds} runs` : bet.odds}
                </span>
            </div>

            {/* Stake + Potential Win */}
            <div className="mt-3 flex gap-2">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={stakeStr}
                        placeholder="Stake"
                        onChange={handleChange}
                        className="w-full bg-black/30 text-white text-[13px] font-bold pl-3 pr-8 py-2.5 rounded-xl outline-none border border-white/[0.06] focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-white/15"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20 font-bold pointer-events-none">{activeSymbol}</span>
                </div>
                <div className="flex flex-col items-end justify-center min-w-[80px]">
                    <span className="text-[9px] text-white/25 uppercase">Win</span>
                    <span className="text-[14px] font-black text-emerald-400 leading-tight">
                        {activeSymbol}{Math.floor(bet.potentialWin).toLocaleString('en-IN')}
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Floating Betslip ─── */
export default function RightSidebar({ className = '' }: { className?: string }) {
    const {
        bets,
        removeBet,
        updateStake,
        placeBet,
        totalStake,
        totalPotentialWin,
        myBets,
        refreshMyBets,
        isBetslipOpen,
        toggleBetslip,
    } = useBets();
    const { isAuthenticated } = useAuth();
    const { openLogin } = useModal();
    const { activeSymbol, selectedWallet, activeBalance, refreshWallet } = useWallet();
    const [placing, setPlacing] = useState(false);
    const [activeTab, setActiveTab] = useState<'betslip' | 'mybets'>('betslip');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const quickStakes = [100, 500, 1000, 5000];

    useEffect(() => {
        if (!feedback) return;
        const t = setTimeout(() => setFeedback(null), 3000);
        return () => clearTimeout(t);
    }, [feedback]);

    useEffect(() => {
        if (bets.length > 0 && !isBetslipOpen) toggleBetslip();
    }, [bets.length]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isAuthenticated || activeTab !== 'mybets') return;
        void refreshMyBets();
        const timer = setInterval(() => { void refreshMyBets(); }, 15000);
        return () => clearInterval(timer);
    }, [activeTab, isAuthenticated, refreshMyBets]);

    const handlePlaceBet = async () => {
        if (!isAuthenticated) { openLogin(); return; }
        if (bets.length === 0) return;
        setPlacing(true);
        try {
            await placeBet();
            showBetPlacedToast();
            setFeedback({ type: 'success', message: 'Bet placed!' });
            setTimeout(() => setActiveTab('mybets'), 1200);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to place bet.';
            setFeedback({ type: 'error', message: errorMessage });
            showBetErrorToast(e);
        } finally {
            setPlacing(false);
        }
    };

    const handleCashoutSuccess = async () => {
        await Promise.all([refreshMyBets(), refreshWallet()]);
        setFeedback({ type: 'success', message: 'Cash out completed.' });
    };

    /* ─── Floating Pill (collapsed) ─── */
    if (!isBetslipOpen) {
        return (
            <div className={`fixed right-4 xl:right-6 z-50 ${className}`} style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                <button
                    onClick={toggleBetslip}
                    className="group relative flex items-center gap-3 bg-[#1a1d21]/90 backdrop-blur-xl text-white pl-4 pr-5 py-3.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_40px_rgba(59,193,23,0.15)] transition-all duration-300 border border-white/[0.08] hover:border-emerald-500/20 hover:scale-[1.02]"
                >
                    {/* Green icon badge */}
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(59,193,23,0.3)]">
                        <Ticket size={16} className="text-white" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider leading-none">
                            Betslip
                        </span>
                        <span className="text-[14px] font-bold leading-tight mt-0.5">
                            {bets.length} bet{bets.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {bets.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(59,193,23,0.4)] animate-bounce">
                            {bets.length}
                        </span>
                    )}
                </button>
            </div>
        );
    }

    /* ─── Expanded Panel ─── */
    return (
        <aside
            className={`fixed left-2 right-2 md:left-auto md:right-4 xl:right-6 md:w-[380px] z-50 flex flex-col font-sans overflow-hidden ${className}`}
            style={{
                bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
                maxHeight: 'calc(100vh - 160px)',
            }}
        >
            {/* Glass background container */}
            <div className="bg-[#12141a]/95 backdrop-blur-2xl rounded-3xl shadow-[0_16px_64px_rgba(0,0,0,0.6)] border border-white/[0.08] flex flex-col overflow-hidden" style={{ maxHeight: 'inherit' }}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-[0_0_8px_rgba(59,193,23,0.2)]">
                            <Ticket size={14} className="text-white" />
                        </div>
                        <div>
                            <span className="text-[14px] font-bold text-white">Betslip</span>
                            {bets.length > 0 && (
                                <span className="ml-2 bg-emerald-500/15 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {bets.length}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Tab Switcher */}
                        <div className="flex bg-white/[0.04] rounded-xl p-0.5">
                            <button
                                onClick={() => setActiveTab('betslip')}
                                className={`text-[11px] font-bold px-3.5 py-1.5 rounded-lg transition-all ${activeTab === 'betslip'
                                    ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                                    : 'text-white/30 hover:text-white/60'
                                    }`}
                            >
                                Slip
                            </button>
                            <button
                                onClick={() => setActiveTab('mybets')}
                                className={`text-[11px] font-bold px-3.5 py-1.5 rounded-lg transition-all ${activeTab === 'mybets'
                                    ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                                    : 'text-white/30 hover:text-white/60'
                                    }`}
                            >
                                My Bets
                            </button>
                        </div>
                        <button
                            onClick={toggleBetslip}
                            className="ml-1 p-2 text-white/20 hover:text-white/60 hover:bg-white/[0.06] rounded-xl transition-all"
                        >
                            <ChevronUp size={16} className="rotate-180" />
                        </button>
                    </div>
                </div>

                {/* ── Feedback Banner ── */}
                {feedback && (
                    <div
                        className={`mx-4 mb-2 px-4 py-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 ${feedback.type === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                            : 'bg-red-500/10 text-red-400 border border-red-500/15'
                            }`}
                    >
                        {feedback.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                        {feedback.message}
                    </div>
                )}

                {/* ── Content ── */}
                <div
                    className="flex-1 overflow-y-auto px-4 pb-2 space-y-3"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#252830 transparent' }}
                >
                    {activeTab === 'betslip' ? (
                        bets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
                                    <Ticket size={24} className="text-white/10" />
                                </div>
                                <p className="text-[13px] font-semibold text-white/20">Your betslip is empty</p>
                                <p className="text-[11px] text-white/10 mt-1">Tap any odds to add a selection</p>
                            </div>
                        ) : (
                            bets.map((bet) => (
                                <BetCard
                                    key={bet.id}
                                    bet={bet}
                                    activeSymbol={activeSymbol}
                                    onRemove={removeBet}
                                    onStake={updateStake}
                                />
                            ))
                        )
                    ) : myBets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
                                <History size={24} className="text-white/10" />
                            </div>
                            <p className="text-[13px] font-semibold text-white/20">No bets placed yet</p>
                        </div>
                    ) : (
                        myBets.map((bet) => {
                            const partialCashoutTaken = hasPartialCashout(bet);
                            const partialCashoutValue = getBetPartialCashoutValue(bet);
                            const originalStake = getBetOriginalStake(bet);
                            const pendingMaxReturn = getBetPendingMaxReturn(bet);
                            const settledReturn = getBetSettledReturn(bet);
                            const betNetPnl = getBetNetPnL(bet);

                            const statusCls = bet.status === 'WON'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                : bet.status === 'LOST'
                                    ? 'bg-red-500/15 text-red-400 border-red-500/20'
                                    : bet.status === 'CASHED_OUT'
                                        ? 'bg-orange-500/15 text-orange-300 border-orange-500/20'
                                        : bet.status === 'VOID'
                                            ? 'bg-white/5 text-white/40 border-white/10'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                            return (
                                <div key={bet.id} className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-2xl p-4 border border-white/[0.06] space-y-3">
                                    {/* Status + Time */}
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${statusCls}`}>
                                            {bet.status}
                                        </span>
                                        <span className="text-[10px] text-white/20">
                                            {new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Event */}
                                    <div>
                                        <div className="text-[12px] text-white/90 font-semibold mb-1 line-clamp-1">{bet.eventName}</div>
                                        <div className="text-[11px] text-white/30">
                                            {bet.selectionName} {isLineBasedFancyMarket({
                                                marketType: (bet as { gtype?: string }).gtype,
                                                marketName: bet.marketName,
                                                selectionName: bet.selectionName,
                                            }) ? <><span className="text-white/15">·</span> Runs: <span className="text-white/60 font-bold">{bet.odds}</span></> : <>@ <span className="text-white/60 font-bold">{bet.odds}</span></>}
                                        </div>
                                        {partialCashoutTaken && (
                                            <div className="mt-1 text-[10px] text-orange-300/75">
                                                Realized cash out: {activeSymbol}{partialCashoutValue.toFixed(2)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2.5 text-[11px] space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/25">{partialCashoutTaken ? 'Remaining Stake' : 'Stake'}</span>
                                            <span className="text-white/60 font-bold">{activeSymbol}{bet.stake}</span>
                                        </div>
                                        {partialCashoutTaken && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/25">Original Stake</span>
                                                <span className="text-white/60 font-bold">{activeSymbol}{originalStake.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/25">{bet.status === 'PENDING' ? 'Max Return' : 'Total Returned'}</span>
                                            <span className={`font-bold ${bet.status === 'PENDING' ? 'text-amber-300' : bet.status === 'WON' ? 'text-emerald-400' : bet.status === 'CASHED_OUT' ? 'text-orange-300' : 'text-white/60'}`}>
                                                {activeSymbol}{(bet.status === 'PENDING' ? pendingMaxReturn : (settledReturn ?? bet.potentialWin)).toFixed(2)}
                                            </span>
                                        </div>
                                        {bet.status !== 'PENDING' && betNetPnl !== null && (
                                            <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04]">
                                                <span className="text-white/25">Net P&L</span>
                                                <span className={`font-bold ${betNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {betNetPnl >= 0 ? '+' : '-'}{activeSymbol}{Math.abs(betNetPnl).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {bet.status === 'PENDING' && (
                                        <SportsBetCashoutWidget
                                            bet={bet}
                                            onSuccess={handleCashoutSuccess}
                                            compact
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Footer (only when betslip has bets) ── */}
                {activeTab === 'betslip' && bets.length > 0 && (
                    <div className="p-4 border-t border-white/[0.05]">
                        {/* Quick Stakes */}
                        <div className="flex gap-2 mb-3">
                            {quickStakes.map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => bets.forEach((b) => updateStake(b.id, amount))}
                                    className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white text-[11px] font-bold py-2 rounded-xl transition-all border border-white/[0.04] hover:border-emerald-500/20"
                                >
                                    +{amount >= 1000 ? `${amount / 1000}k` : amount}
                                </button>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="bg-black/20 rounded-2xl px-4 py-3 mb-3 border border-white/[0.04] space-y-2">
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-white/25">Wallet</span>
                                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${selectedWallet === 'crypto' ? 'bg-purple-500/15 text-purple-400' : 'bg-brand-gold/10 text-brand-gold'}`}>
                                    {selectedWallet === 'crypto' ? '$ Crypto' : `${activeSymbol} Fiat`} · {activeSymbol}{activeBalance.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-white/30">Total Stake</span>
                                <span className="text-white font-bold">{activeSymbol}{totalStake.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-white/30">Potential Win</span>
                                <span className="text-emerald-400 font-black text-[14px]">
                                    {activeSymbol}{Math.floor(totalPotentialWin).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* CTA */}
                        {!isAuthenticated ? (
                            <button
                                onClick={openLogin}
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-3.5 rounded-2xl text-[13px] uppercase tracking-wider transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(59,193,23,0.25)]"
                            >
                                Login to Place Bet
                            </button>
                        ) : (
                            <button
                                onClick={handlePlaceBet}
                                disabled={placing || bets.every((b) => !b.stake || b.stake <= 0)}
                                className={`w-full flex items-center justify-center gap-2 font-black py-3.5 rounded-2xl text-[13px] uppercase tracking-wider transition-all active:scale-[0.98] ${placing || bets.every((b) => !b.stake || b.stake <= 0)
                                    ? 'bg-white/[0.04] text-white/15 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-[0_4px_20px_rgba(59,193,23,0.25)]'
                                    }`}
                            >
                                {placing && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                )}
                                {placing ? 'Placing...' : `Place Bet — ${activeSymbol}${totalStake}`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
