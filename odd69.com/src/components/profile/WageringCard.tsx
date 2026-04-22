'use client';
import { TrendingUp, Lock, CheckCircle2, Zap, Gamepad2, Trophy, Clock, RotateCcw } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function WageringCard() {
    const {
        depositWageringRequired,
        depositWageringDone,
        casinoBonusWageringRequired,
        casinoBonusWageringDone,
        sportsBonusWageringRequired,
        sportsBonusWageringDone,
        activeCasinoBonus,
        activeSportsBonus,
        activeSymbol,
        refreshWallet,
    } = useWallet();
    const { token } = useAuth();
    const [revoking, setRevoking] = useState<string | null>(null);

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

    const hasDepositLock = depositWageringRequired > 0;
    const depositDone = depositWageringDone;
    const depositPct = hasDepositLock
        ? Math.min(100, Math.round((depositDone / depositWageringRequired) * 100))
        : 100;
    const depositRemaining = Math.max(0, depositWageringRequired - depositDone);
    const depositComplete = depositDone >= depositWageringRequired;

    const hasCasinoBonus = casinoBonusWageringRequired > 0;
    const casinoPct = hasCasinoBonus
        ? Math.min(100, Math.round((casinoBonusWageringDone / casinoBonusWageringRequired) * 100))
        : 0;
    const casinoRemaining = Math.max(0, casinoBonusWageringRequired - casinoBonusWageringDone);
    const casinoComplete = hasCasinoBonus && casinoBonusWageringDone >= casinoBonusWageringRequired;

    const hasSportsBonus = sportsBonusWageringRequired > 0;
    const sportsPct = hasSportsBonus
        ? Math.min(100, Math.round((sportsBonusWageringDone / sportsBonusWageringRequired) * 100))
        : 0;
    const sportsRemaining = Math.max(0, sportsBonusWageringRequired - sportsBonusWageringDone);
    const sportsComplete = hasSportsBonus && sportsBonusWageringDone >= sportsBonusWageringRequired;

    if (!hasDepositLock && !hasCasinoBonus && !hasSportsBonus) return null;

    const handleRevoke = async (type: 'CASINO' | 'SPORTS') => {
        const label = type === 'CASINO' ? 'Casino' : 'Sports';
        if (!confirm(`Revoke your active ${label} bonus? This cannot be undone — your bonus balance will be cleared.`)) return;
        setRevoking(type);
        try {
            await api.post('/bonus/revoke', { type }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`${label} bonus revoked`);
            await refreshWallet();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to revoke bonus');
        } finally {
            setRevoking(null);
        }
    };

    return (
        <div className="space-y-3">

            {/* ── 1. Deposit Wagering Lock ── */}
            {hasDepositLock && (
                depositComplete ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={18} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-emerald-400">Deposit Wagering Complete!</p>
                            <p className="text-[11px] text-emerald-400/70">Withdrawals are now unlocked.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/[0.02] border border-amber-500/25 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                                    <Lock size={13} className="text-amber-400" />
                                </div>
                                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                                    Withdrawal Locked
                                </span>
                            </div>
                            <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                                {depositPct}%
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500"
                                    style={{ width: `${depositPct}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-white/50">
                                <span>{activeSymbol}{fmt(depositDone)} wagered</span>
                                <span>{activeSymbol}{fmt(depositWageringRequired)} required (1×)</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                            <Zap size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-400/90 leading-relaxed">
                                Bet{' '}
                                <span className="font-black text-amber-400">{activeSymbol}{fmt(depositRemaining)}</span>{' '}
                                more on Sports or Casino to unlock withdrawals.
                            </p>
                        </div>
                    </div>
                )
            )}

            {/* ── 2. Casino Bonus Wagering ── */}
            {hasCasinoBonus && (
                casinoComplete ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={18} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-emerald-400">🎰 Casino Bonus Wagering Complete!</p>
                            <p className="text-[11px] text-emerald-400/70">Bonus has been added to your wallet 🎉</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/[0.02] border border-amber-500/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                                    <Gamepad2 size={13} className="text-amber-400" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                                        Casino Bonus
                                    </span>
                                    {activeCasinoBonus && (
                                        <div className="text-[10px] text-white/50 mt-0.5 truncate max-w-[140px]">
                                            {activeCasinoBonus.bonusTitle}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeCasinoBonus?.daysLeft !== null && activeCasinoBonus?.daysLeft !== undefined && (
                                    <div className="flex items-center gap-1 text-[10px] text-white/50">
                                        <Clock size={9} />
                                        <span>{activeCasinoBonus.daysLeft}d left</span>
                                    </div>
                                )}
                                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                                    {casinoPct}%
                                </span>
                                <button
                                    onClick={() => handleRevoke('CASINO')}
                                    disabled={revoking === 'CASINO'}
                                    className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                    title="Revoke casino bonus"
                                >
                                    <RotateCcw size={11} className={`text-red-400/60 hover:text-red-400 ${revoking === 'CASINO' ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500"
                                    style={{ width: `${casinoPct}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-white/50">
                                <span>{activeSymbol}{fmt(casinoBonusWageringDone)} wagered</span>
                                <span>{activeSymbol}{fmt(casinoBonusWageringRequired)} required</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                            <TrendingUp size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-400/90 leading-relaxed">
                                Play casino games to wager{' '}
                                <span className="font-black text-amber-400">{activeSymbol}{fmt(casinoRemaining)}</span>{' '}
                                more to unlock your bonus automatically.
                            </p>
                        </div>
                    </div>
                )
            )}

            {/* ── 3. Sports Bonus Wagering ── */}
            {hasSportsBonus && (
                sportsComplete ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={18} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-emerald-400">⚽ Sports Bonus Wagering Complete!</p>
                            <p className="text-[11px] text-emerald-400/70">Bonus has been added to your wallet 🎉</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/[0.02] border border-emerald-500/25 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                    <Trophy size={13} className="text-emerald-400" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                                        Sports Bonus
                                    </span>
                                    {activeSportsBonus && (
                                        <div className="text-[10px] text-white/50 mt-0.5 truncate max-w-[140px]">
                                            {activeSportsBonus.bonusTitle}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeSportsBonus?.daysLeft !== null && activeSportsBonus?.daysLeft !== undefined && (
                                    <div className="flex items-center gap-1 text-[10px] text-white/50">
                                        <Clock size={9} />
                                        <span>{activeSportsBonus.daysLeft}d left</span>
                                    </div>
                                )}
                                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                                    {sportsPct}%
                                </span>
                                <button
                                    onClick={() => handleRevoke('SPORTS')}
                                    disabled={revoking === 'SPORTS'}
                                    className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                    title="Revoke sports bonus"
                                >
                                    <RotateCcw size={11} className={`text-red-400/60 hover:text-red-400 ${revoking === 'SPORTS' ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500"
                                    style={{ width: `${sportsPct}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-white/50">
                                <span>{activeSymbol}{fmt(sportsBonusWageringDone)} wagered</span>
                                <span>{activeSymbol}{fmt(sportsBonusWageringRequired)} required</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                            <TrendingUp size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                                Place sports bets to wager{' '}
                                <span className="font-black text-emerald-400">{activeSymbol}{fmt(sportsRemaining)}</span>{' '}
                                more to unlock your bonus automatically.
                            </p>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
