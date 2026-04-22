'use client';
import { useState } from 'react';
import {
    X, Gamepad2, Trophy, Gift, CheckCircle2, ShieldOff,
    Loader2, Zap, Clock, BadgePercent, Coins, Sparkles, Check,
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function BonusActivationModal({ isOpen, onClose }: Props) {
    const {
        activeCasinoBonus,
        activeSportsBonus,
        selectedWallet,
        refreshWallet,
    } = useWallet();
    const { token } = useAuth();
    const [revoking, setRevoking] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const [casinoEnabled, setCasinoEnabled] = useState<boolean>(
        activeCasinoBonus?.isEnabled === true
    );
    const [sportsEnabled, setSportsEnabled] = useState<boolean>(
        activeSportsBonus?.isEnabled === true
    );

    if (!isOpen) return null;

    // currency filter: fiat bonus shows only on fiat tab, crypto only on crypto tab
    const matchesWallet = (bonusObj: any | null): boolean => {
        if (!bonusObj) return false;
        const bc = (bonusObj.bonusCurrency || 'INR').toUpperCase();
        if (bc === 'BOTH') return true;
        if (selectedWallet === 'crypto') return bc === 'CRYPTO' || bc === 'USD';
        return bc === 'INR' || bc === 'FIAT';
    };

    const showCasino = matchesWallet(activeCasinoBonus);
    const showSports = matchesWallet(activeSportsBonus);
    const hasNoBonuses = !showCasino && !showSports;

    const handleRevoke = async (type: 'CASINO' | 'SPORTS') => {
        setRevoking(type);
        try {
            await api.post('/bonus/forfeit', { type }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success(`${type === 'CASINO' ? 'Casino' : 'Sports'} bonus revoked`);
            await refreshWallet();
        } catch {
            toast.error('Failed to revoke bonus');
        } finally {
            setRevoking(null);
        }
    };

    const handleToggle = async (type: 'CASINO' | 'SPORTS') => {
        setToggling(type);
        try {
            const res = await api.post('/bonus/toggle', { type }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const nowEnabled = res.data.isEnabled;
            if (type === 'CASINO') setCasinoEnabled(nowEnabled);
            else setSportsEnabled(nowEnabled);
            await refreshWallet();
            toast.success(
                nowEnabled
                    ? `${type === 'CASINO' ? 'Casino' : 'Sports'} bonus selected — balance now shows bonus amount`
                    : `${type === 'CASINO' ? 'Casino' : 'Sports'} bonus deselected — balance shows main account`
            );
        } catch {
            toast.error('Failed to update bonus selection');
        } finally {
            setToggling(null);
        }
    };

    /* ── Wagering progress bar ── */
    const ProgressBar = ({ done, required }: { done: number; required: number }) => {
        const pct = required > 0 ? Math.min(100, Math.round((done / required) * 100)) : 0;
        return (
            <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-white/50">
                    <span>Wagering progress</span>
                    <span className="font-black text-white/70">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="flex justify-between text-[9px] text-white/25">
                    <span>₹{(done || 0).toLocaleString()} wagered</span>
                    <span>₹{(required || 0).toLocaleString()} required</span>
                </div>
            </div>
        );
    };

    /* ── Active Bonus Card ── */
    const ActiveBonusCard = ({
        label, icon: Icon, bonusObj, wageringDone, wageringRequired, revokeType, isSelected, onToggle,
    }: {
        label: string; icon: any;
        bonusObj: any; wageringDone: number; wageringRequired: number;
        revokeType: 'CASINO' | 'SPORTS'; isSelected: boolean; onToggle: () => void;
    }) => {
        const balance = bonusObj?.currentBalance ?? bonusObj?.bonusAmount ?? 0;
        const pct = wageringRequired > 0 ? Math.min(100, Math.round((wageringDone / wageringRequired) * 100)) : 0;

        return (
            <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${isSelected ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.12)]' : 'border-white/[0.06]'}`}>
                {/* Card header */}
                <div className="p-4 bg-white/[0.03]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                                <Icon size={16} className="text-amber-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-white">{bonusObj?.bonusTitle || label}</span>
                                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-0.5">
                                        <CheckCircle2 size={7} /> Active
                                    </span>
                                </div>
                                <p className="text-[10px] text-white/50 font-mono">{bonusObj?.bonusCode || ''}</p>
                            </div>
                        </div>

                        {/* Select / Deselect button — hidden for synthetic (direct-credit) bonuses */}
                        {!bonusObj?.isSynthetic && (
                            <button
                                onClick={onToggle}
                                disabled={toggling === revokeType}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all duration-200 ${isSelected
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-500/50 text-[#1a1208] shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                    : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:border-amber-500/40 hover:text-white'
                                    }`}
                            >
                                {toggling === revokeType
                                    ? <Loader2 size={10} className="animate-spin" />
                                    : isSelected
                                        ? <><Check size={10} /> Selected for Bets</>
                                        : 'Select for Bets'
                                }
                            </button>
                        )}
                    </div>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-3 border-t border-white/[0.04]">
                    {/* Balance + wagering side by side */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/30 rounded-lg px-3 py-2 border border-white/[0.04]">
                            <div className="text-[9px] text-white/50 mb-0.5">Bonus Balance</div>
                            <div className="text-base font-black text-white">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-black/30 rounded-lg px-3 py-2 border border-white/[0.04]">
                            <div className="text-[9px] text-white/50 mb-0.5">Wagering</div>
                            <div className="text-base font-black text-white">{pct}%</div>
                        </div>
                    </div>

                    {/* Chips */}
                    <div className="flex gap-1.5 flex-wrap">
                        {bonusObj?.percentage > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                                <BadgePercent size={8} />{bonusObj.percentage}% BONUS
                            </span>
                        )}
                        {bonusObj?.amount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                                <Coins size={8} />₹{Number(bonusObj.amount).toLocaleString()} FLAT
                            </span>
                        )}
                        {bonusObj?.wageringRequired > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-white/50">
                                <Zap size={7} />{bonusObj.wageringRequirement}× wagering
                            </span>
                        )}
                        {bonusObj?.expiresAt && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-white/50">
                                <Clock size={7} />
                                {Math.max(0, Math.ceil((new Date(bonusObj.expiresAt).getTime() - Date.now()) / 86400000))}d left
                            </span>
                        )}
                    </div>

                    {/* Wagering progress bar */}
                    <ProgressBar done={wageringDone} required={wageringRequired} />

                    {/* Revoke — hidden for synthetic (direct-credit) bonuses */}
                    {bonusObj?.isSynthetic ? (
                        <p className="text-[10px] text-white/50 text-center py-1">
                            Credited directly • Use it by placing bets
                        </p>
                    ) : (
                        <button
                            onClick={() => handleRevoke(revokeType)}
                            disabled={revoking === revokeType}
                            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                            {revoking === revokeType ? <Loader2 size={10} className="animate-spin" /> : <ShieldOff size={10} />}
                            Revoke {revokeType === 'CASINO' ? 'Casino' : 'Sports'} Bonus
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99]" onClick={onClose} />

            {/* Panel */}
            <div className="
                fixed z-[100]
                bottom-0 left-0 right-0
                md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                md:max-w-md md:w-full
                bg-gradient-to-br from-[#12161e] to-[#0c0f14] border-t md:border border-white/[0.06]
                md:rounded-2xl rounded-t-2xl
                max-h-[90vh] flex flex-col
                shadow-2xl shadow-black/70
            ">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/25 flex items-center justify-center">
                            <Gift size={16} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white">Active Bonuses</h3>
                            <p className="text-[10px] text-white/50">
                                {selectedWallet === 'crypto' ? '₿ Crypto' : '🏦 Fiat'} · Toggle to enable/disable
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                        <X size={13} className="text-white/70" />
                    </button>
                </div>

                {/* Body */}
                <div
                    className="overflow-y-auto flex-1 p-4 space-y-4"
                    style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 80px))' }}
                >
                    {hasNoBonuses ? (
                        <div className="flex flex-col items-center justify-center py-14 space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                <Sparkles size={24} className="text-white/25" />
                            </div>
                            <p className="text-sm font-black text-white/50">No Active Bonuses</p>
                            <p className="text-[11px] text-white/25 text-center max-w-[220px] leading-relaxed">
                                {selectedWallet === 'crypto'
                                    ? 'No active crypto bonuses. Switch to fiat wallet or claim a crypto bonus.'
                                    : 'Claim a bonus from the Promotions page, then deposit to activate it.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {showCasino && activeCasinoBonus && (
                                <ActiveBonusCard
                                    label="Casino Bonus"
                                    icon={Gamepad2}
                                    bonusObj={activeCasinoBonus}
                                    wageringDone={activeCasinoBonus.wageringDone ?? 0}
                                    wageringRequired={activeCasinoBonus.wageringRequired ?? 0}
                                    revokeType="CASINO"
                                    isSelected={casinoEnabled}
                                    onToggle={() => handleToggle('CASINO')}
                                />
                            )}
                            {showSports && activeSportsBonus && (
                                <ActiveBonusCard
                                    label="Sports Bonus"
                                    icon={Trophy}
                                    bonusObj={activeSportsBonus}
                                    wageringDone={activeSportsBonus.wageringDone ?? 0}
                                    wageringRequired={activeSportsBonus.wageringRequired ?? 0}
                                    revokeType="SPORTS"
                                    isSelected={sportsEnabled}
                                    onToggle={() => handleToggle('SPORTS')}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
