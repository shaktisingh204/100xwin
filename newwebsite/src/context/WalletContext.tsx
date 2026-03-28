'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { useAuth } from './AuthContext';
import { getCurrencySymbol } from '@/utils/currency';
import { useSocket } from './SocketContext';

export type WalletType = 'fiat' | 'crypto';
export type SubWalletType =
    | 'fiat-main'
    | 'fiat-casino'
    | 'fiat-sports'
    | 'crypto-main'
    | 'crypto-casino'
    | 'crypto-sports';

export interface ActiveBonus {
    id: number | null;
    bonusId?: string;
    bonusCode: string;
    bonusTitle: string;
    bonusCurrency: string;
    applicableTo: string;
    bonusAmount: number;
    currentBalance?: number;
    wageringRequired: number;
    wageringDone: number;
    wageringRemaining?: number;
    progressPercent?: number;
    daysLeft?: number | null;
    isEnabled?: boolean;
    status?: string;
    isSynthetic?: boolean;
    percentage?: number;
    amount?: number;
    wageringRequirement?: number;
    expiresAt?: string | null;
    [key: string]: unknown; // allow extra API fields without breaking type checks
}


interface WalletData {
    fiatBalance: number;
    fiatCurrency: string;
    cryptoBalance: number;
    cryptoCurrency: string;
    exposure: number;
    // Dual bonus wallets
    fiatBonus: number;
    cryptoBonus: number;
    casinoBonus: number;
    sportsBonus: number;
    bonus: number;              // legacy compat (= fiatBonus)
    balance: number;            // legacy compat
    currency: string;           // legacy compat
    // Deposit wagering (1x lock)
    depositWageringRequired: number;
    depositWageringDone: number;
    // Bonus wagering (Nx admin-set) — global
    bonusWageringRequired: number;
    bonusWageringDone: number;
    // Per-type bonus wagering
    casinoBonusWageringRequired: number;
    casinoBonusWageringDone: number;
    sportsBonusWageringRequired: number;
    sportsBonusWageringDone: number;
    // Active bonus objects (populated from /bonus/active)
    activeCasinoBonus: ActiveBonus | null;
    activeSportsBonus: ActiveBonus | null;
    // Active wallet preference
    activeWallet: WalletType;
}

interface WalletContextType {
    // Selection
    selectedWallet: WalletType;
    setSelectedWallet: (w: WalletType) => void;
    // Sub-wallet selection (6-way)
    selectedSubWallet: SubWalletType;
    setSelectedSubWallet: (sw: SubWalletType) => void;
    // Balances
    fiatBalance: number;
    fiatCurrency: string;
    cryptoBalance: number;
    cryptoCurrency: string;
    exposure: number;
    // Dual bonus wallets
    fiatBonus: number;
    cryptoBonus: number;
    casinoBonus: number;
    sportsBonus: number;
    bonus: number;
    // Active wallet shortcuts
    activeBalance: number;
    activeCurrency: string;
    activeSymbol: string;
    // Wagering — deposit lock
    depositWageringRequired: number;
    depositWageringDone: number;
    // Wagering — bonus (global)
    bonusWageringRequired: number;
    bonusWageringDone: number;
    // Wagering — per type
    casinoBonusWageringRequired: number;
    casinoBonusWageringDone: number;
    sportsBonusWageringRequired: number;
    sportsBonusWageringDone: number;
    // Active bonuses
    activeCasinoBonus: ActiveBonus | null;
    activeSportsBonus: ActiveBonus | null;
    // Actions
    refreshWallet: () => Promise<void>;
    loading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const LS_KEY = 'zeero_selected_wallet';
const LS_SUB_KEY = 'zeero_selected_sub_wallet';

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, token, user } = useAuth();
    const { socket } = useSocket();

    const [selectedWallet, _setSelectedWallet] = useState<WalletType>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LS_KEY);
            if (saved === 'crypto' || saved === 'fiat') return saved;
        }
        return 'fiat';
    });

    const validSubWallets: SubWalletType[] = [
        'fiat-main', 'fiat-casino', 'fiat-sports',
        'crypto-main', 'crypto-casino', 'crypto-sports',
    ];

    const [selectedSubWallet, _setSelectedSubWallet] = useState<SubWalletType>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LS_SUB_KEY) as SubWalletType | null;
            if (saved && validSubWallets.includes(saved)) return saved;
        }
        return 'fiat-main';
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LS_KEY) as WalletType | null;
            document.documentElement.setAttribute('data-wallet', saved || 'fiat');
        }
    }, []);

    const [walletData, setWalletData] = useState<WalletData>({
        fiatBalance: 0,
        fiatCurrency: 'INR',
        cryptoBalance: 0,
        cryptoCurrency: 'USD',
        exposure: 0,
        fiatBonus: 0,
        cryptoBonus: 0,
        casinoBonus: 0,
        sportsBonus: 0,
        bonus: 0,
        balance: 0,
        currency: 'INR',
        depositWageringRequired: 0,
        depositWageringDone: 0,
        bonusWageringRequired: 0,
        bonusWageringDone: 0,
        casinoBonusWageringRequired: 0,
        casinoBonusWageringDone: 0,
        sportsBonusWageringRequired: 0,
        sportsBonusWageringDone: 0,
        activeCasinoBonus: null,
        activeSportsBonus: null,
        activeWallet: 'fiat',
    });

    const [loading, setLoading] = useState(false);

    const setSelectedWallet = async (w: WalletType) => {
        _setSelectedWallet(w);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LS_KEY, w);
            document.documentElement.setAttribute('data-wallet', w);
        }
        if (isAuthenticated && token) {
            try {
                await api.patch('/user/wallet-preference', { wallet: w }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch (e) {
                console.error('Failed to persist wallet preference:', e);
            }
        }
    };

    const setSelectedSubWallet = (sw: SubWalletType) => {
        _setSelectedSubWallet(sw);
        // Keep the parent WalletType in sync
        const parentWallet: WalletType = sw.startsWith('crypto') ? 'crypto' : 'fiat';
        _setSelectedWallet(parentWallet);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LS_SUB_KEY, sw);
            localStorage.setItem(LS_KEY, parentWallet);
            document.documentElement.setAttribute('data-wallet', parentWallet);
        }
    };

    const refreshWallet = useCallback(async () => {
        if (!isAuthenticated || !token) return;
        setLoading(true);
        try {
            const res = await api.get('/user/wallet', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = res.data;
            // Fetch active bonuses in parallel
            let casinoBonus = null;
            let sportsBonus = null;
            try {
                const bonusRes = await api.get('/bonus/active', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                casinoBonus = bonusRes.data?.casino || null;
                sportsBonus = bonusRes.data?.sports || null;
            } catch { /* non-critical */ }

            setWalletData({
                fiatBalance: d.fiatBalance ?? d.balance ?? 0,
                fiatCurrency: d.fiatCurrency || d.currency || 'INR',
                cryptoBalance: d.cryptoBalance ?? 0,
                cryptoCurrency: d.cryptoCurrency || 'USD',
                exposure: d.exposure ?? 0,
                fiatBonus: d.fiatBonus ?? 0,
                cryptoBonus: d.cryptoBonus ?? 0,
                casinoBonus: d.casinoBonus ?? 0,
                sportsBonus: d.sportsBonus ?? 0,
                bonus: d.bonus ?? ((d.casinoBonus ?? 0) + (d.sportsBonus ?? 0) + (d.fiatBonus ?? 0)),
                balance: d.balance ?? 0,
                currency: d.currency ?? 'INR',
                depositWageringRequired: d.depositWageringRequired ?? 0,
                depositWageringDone: d.depositWageringDone ?? 0,
                bonusWageringRequired: d.bonusWageringRequired ?? 0,
                bonusWageringDone: d.bonusWageringDone ?? 0,
                casinoBonusWageringRequired: d.casinoBonusWageringRequired ?? 0,
                casinoBonusWageringDone: d.casinoBonusWageringDone ?? 0,
                sportsBonusWageringRequired: d.sportsBonusWageringRequired ?? 0,
                sportsBonusWageringDone: d.sportsBonusWageringDone ?? 0,
                activeCasinoBonus: casinoBonus,
                activeSportsBonus: sportsBonus,
                activeWallet: d.activeWallet === 'crypto' ? 'crypto' : 'fiat',
            });
            if (d.activeWallet === 'crypto' || d.activeWallet === 'fiat') {
                _setSelectedWallet(d.activeWallet);
                if (typeof window !== 'undefined') {
                    localStorage.setItem(LS_KEY, d.activeWallet);
                    document.documentElement.setAttribute('data-wallet', d.activeWallet);
                }
            }
        } catch (e) {
            console.error('WalletContext: failed to fetch wallet', e);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, token]);

    useEffect(() => {
        if (isAuthenticated) {
            refreshWallet();
            const interval = setInterval(refreshWallet, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, refreshWallet]);

    useEffect(() => {
        if (!socket || !isAuthenticated) return;

        const currentUserId = Number(user?.id ?? user?.userId);
        if (!currentUserId) return;

        const handleWalletEvent = (data?: { userId?: number | string }) => {
            if (data?.userId && Number(data.userId) !== currentUserId) return;
            refreshWallet();
        };

        const events = ['connect', 'walletUpdate', 'balanceUpdate', 'bonusUpdate', 'bonusConverted', 'depositWageringComplete'];
        events.forEach((eventName) => socket.on(eventName, handleWalletEvent));

        return () => {
            events.forEach((eventName) => socket.off(eventName, handleWalletEvent));
        };
    }, [socket, isAuthenticated, user, refreshWallet]);

    const activeBalance = (() => {
        switch (selectedSubWallet) {
            case 'fiat-main':    return walletData.fiatBalance;
            case 'fiat-casino':  return walletData.casinoBonus;
            case 'fiat-sports':  return walletData.sportsBonus;
            case 'crypto-main':  return walletData.cryptoBalance;
            case 'crypto-casino':return walletData.cryptoBonus;  // reuse cryptoBonus as crypto-casino bonus
            case 'crypto-sports':return walletData.cryptoBonus;  // placeholder until backend splits
            default:             return walletData.fiatBalance;
        }
    })();
    const activeCurrency =
        selectedWallet === 'crypto' ? walletData.cryptoCurrency : walletData.fiatCurrency;
    const activeSymbol = selectedWallet === 'crypto' ? '$' : getCurrencySymbol(walletData.fiatCurrency);

    return (
        <WalletContext.Provider
            value={{
                selectedWallet,
                setSelectedWallet,
                selectedSubWallet,
                setSelectedSubWallet,
                fiatBalance: walletData.fiatBalance,
                fiatCurrency: walletData.fiatCurrency,
                cryptoBalance: walletData.cryptoBalance,
                cryptoCurrency: walletData.cryptoCurrency,
                exposure: walletData.exposure,
                fiatBonus: walletData.fiatBonus,
                cryptoBonus: walletData.cryptoBonus,
                casinoBonus: walletData.casinoBonus,
                sportsBonus: walletData.sportsBonus,
                bonus: walletData.bonus,
                activeBalance,
                activeCurrency,
                activeSymbol,
                depositWageringRequired: walletData.depositWageringRequired,
                depositWageringDone: walletData.depositWageringDone,
                bonusWageringRequired: walletData.bonusWageringRequired,
                bonusWageringDone: walletData.bonusWageringDone,
                casinoBonusWageringRequired: walletData.casinoBonusWageringRequired,
                casinoBonusWageringDone: walletData.casinoBonusWageringDone,
                sportsBonusWageringRequired: walletData.sportsBonusWageringRequired,
                sportsBonusWageringDone: walletData.sportsBonusWageringDone,
                activeCasinoBonus: walletData.activeCasinoBonus,
                activeSportsBonus: walletData.activeSportsBonus,
                refreshWallet,
                loading,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const ctx = useContext(WalletContext);
    if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
    return ctx;
}
