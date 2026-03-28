'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { betsApi, Bet as BetModel } from '@/services/bets';
import { sportsApi } from '@/services/sports';
import { useAuth } from './AuthContext';
import { useModal } from './ModalContext';
import { useWallet } from './WalletContext';
import { calculatePotentialWin } from '@/utils/sportsBetPricing';


export interface Bet {
    id: string; // local ID for slip
    eventId: string;
    eventName: string;
    marketId: string;
    marketName: string;
    selectionId: string;
    selectionName: string;
    odds: number;
    rate?: number;
    marketType?: string;
    betType?: 'back' | 'lay';
    stake: number;
    potentialWin: number;
}

export type BetSelection = Omit<Bet, 'id' | 'stake' | 'potentialWin'>;

interface BetContextType {
    bets: Bet[];
    myBets: BetModel[];
    addBet: (bet: BetSelection) => void;
    removeBet: (id: string) => void;
    updateStake: (id: string, stake: number) => void;
    clearBets: () => void;
    totalStake: number;
    totalPotentialWin: number;
    placeBet: () => Promise<void>;
    placeSingleBet: (bet: BetSelection, stake?: number) => Promise<void>;
    refreshMyBets: () => Promise<void>;
    isBetslipOpen: boolean;
    toggleBetslip: () => void;
    oneClickEnabled: boolean;
    setOneClickEnabled: (enabled: boolean) => void;
    oneClickStake: number;
    setOneClickStake: (stake: number) => void;
    isOneClickPending: (eventId: string, marketId: string, selectionId: string) => boolean;
}

const BetContext = createContext<BetContextType | undefined>(undefined);
const ONE_CLICK_ENABLED_KEY = 'zeero_sports_one_click_enabled';
const ONE_CLICK_STAKE_KEY = 'zeero_sports_one_click_stake';
const DEFAULT_ONE_CLICK_STAKE = 100;

const normalizeStake = (stake: number) => {
    const parsed = Math.floor(Number(stake));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ONE_CLICK_STAKE;
};

const buildBetKey = (eventId: string, marketId: string, selectionId: string) =>
    `${eventId}::${marketId}::${selectionId}`;

export function BetProvider({ children }: { children: React.ReactNode }) {
    const [bets, setBets] = useState<Bet[]>([]);
    const [myBets, setMyBets] = useState<BetModel[]>([]);
    const [isBetslipOpen, setIsBetslipOpen] = useState(false);
    const [oneClickEnabledState, setOneClickEnabledState] = useState(false);
    const [oneClickStakeState, setOneClickStakeState] = useState(DEFAULT_ONE_CLICK_STAKE);
    const [pendingOneClickKeys, setPendingOneClickKeys] = useState<Set<string>>(new Set());
    const pendingOneClickKeysRef = useRef<Set<string>>(new Set());
    const { isAuthenticated } = useAuth();
    const { openLogin } = useModal();
    const { selectedWallet, refreshWallet: refreshWalletBalance } = useWallet();

    const toggleBetslip = () => setIsBetslipOpen(prev => !prev);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedEnabled = localStorage.getItem(ONE_CLICK_ENABLED_KEY);
        const storedStake = localStorage.getItem(ONE_CLICK_STAKE_KEY);

        setOneClickEnabledState(storedEnabled === '1');
        setOneClickStakeState(storedStake ? normalizeStake(Number(storedStake)) : DEFAULT_ONE_CLICK_STAKE);
    }, []);

    const setOneClickEnabled = (enabled: boolean) => {
        setOneClickEnabledState(enabled);
        if (typeof window !== 'undefined') {
            localStorage.setItem(ONE_CLICK_ENABLED_KEY, enabled ? '1' : '0');
        }
    };

    const setOneClickStake = (stake: number) => {
        const normalized = normalizeStake(stake);
        setOneClickStakeState(normalized);
        if (typeof window !== 'undefined') {
            localStorage.setItem(ONE_CLICK_STAKE_KEY, String(normalized));
        }
    };

    const isOneClickPending = (eventId: string, marketId: string, selectionId: string) =>
        pendingOneClickKeys.has(buildBetKey(eventId, marketId, selectionId));

    const refreshMyBets = useCallback(async () => {
        if (!isAuthenticated) {
            setMyBets([]);
            return;
        }
        try {
            const data = await betsApi.getMyBets();
            setMyBets(data);
        } catch (error) {
            console.error("Failed to fetch my bets", error);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refreshMyBets();
    }, [refreshMyBets]);

    const buildSlipBet = (newBet: BetSelection, stake: number): Bet => ({
        ...newBet,
        id: buildBetKey(newBet.eventId, newBet.marketId, newBet.selectionId),
        stake,
        potentialWin: calculatePotentialWin({
            stake,
            odds: newBet.odds,
            rate: newBet.rate,
            marketType: newBet.marketType,
            marketName: newBet.marketName,
            selectionName: newBet.selectionName,
        }),
    });

    const addBet = (newBet: BetSelection) => {
        const nextId = buildBetKey(newBet.eventId, newBet.marketId, newBet.selectionId);
        const existing = bets.find(b => b.id === nextId);
        if (existing) return;

        setBets(prev => [...prev, buildSlipBet(newBet, DEFAULT_ONE_CLICK_STAKE)]);
    };

    const removeBet = (id: string) => {
        setBets(prev => prev.filter(b => b.id !== id));
    };

    const updateStake = (id: string, stake: number) => {
        setBets(prev => prev.map(b => {
            if (b.id === id) {
                return {
                    ...b,
                    stake,
                    potentialWin: calculatePotentialWin({
                        stake,
                        odds: b.odds,
                        rate: b.rate,
                        marketType: b.marketType,
                        marketName: b.marketName,
                        selectionName: b.selectionName,
                    }),
                };
            }
            return b;
        }));
    };

    const clearBets = () => setBets([]);

    const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);
    const totalPotentialWin = bets.reduce((sum, b) => sum + b.potentialWin, 0);

    const validateOddsBeforePlacement = async (betsToValidate: Bet[], syncSlipOdds: boolean) => {
        // ── Odds Validation ──────────────────────────────────────────────────
        // Before submitting, re-check current live odds for every selection.
        // If any changed, update the betslip and throw so the user reviews.
        try {
            const checkPayload = betsToValidate.map(b => ({
                eventId: b.eventId,
                marketId: b.marketId,
                selectionId: b.selectionId,
                odds: b.odds,
            }));

            const { success, results } = await sportsApi.checkOdds(checkPayload);

            if (success && results.length > 0) {
                const changed = results.filter(r => r.changed);

                if (changed.length > 0) {
                    if (syncSlipOdds) {
                        // Update bets state with fresh odds so user sees new values
                        setBets(prev => prev.map(b => {
                            const update = changed.find(
                                r => r.marketId === b.marketId && r.selectionId === b.selectionId
                            );
                            if (!update) return b;
                            const newOdds = update.currentOdds ?? b.odds;
                            // Preserve rate for fancy markets: rate is the actual money multiplier,
                            // odds is the session target value (e.g. 4 runs). Never overwrite rate.
                            const effectiveMultiplier = b.rate ?? newOdds;
                            return {
                                ...b,
                                odds: newOdds,
                                potentialWin: calculatePotentialWin({
                                    stake: b.stake,
                                    odds: newOdds,
                                    rate: effectiveMultiplier,
                                    marketType: b.marketType,
                                    marketName: b.marketName,
                                    selectionName: b.selectionName,
                                }),
                            };
                        }));
                    }

                    const suspendedCount = changed.filter(r => r.suspended).length;
                    if (suspendedCount > 0) {
                        throw new Error('Market Suspended — one or more markets are currently suspended.');
                    }
                    throw new Error('Odds changed — please review the updated odds and place again.');
                }
            }
        } catch (oddsError: any) {
            // Re-throw odds errors so the UI can display them
            if (oddsError.message?.includes('Odds changed') || oddsError.message?.includes('Suspended')) {
                throw oddsError;
            }
            // Network/other error during check — fail open, proceed with bet
            console.warn('Odds check failed, proceeding with placement:', oddsError.message);
        }
        // ────────────────────────────────────────────────────────────────────
    };

    const submitPlacedBets = async (betsToPlace: Bet[]) => {
        for (const bet of betsToPlace) {
            await betsApi.placeBet({
                eventId: bet.eventId,
                marketId: bet.marketId,
                selectionId: bet.selectionId,
                odds: bet.odds,
                rate: bet.rate,
                stake: bet.stake,
                walletType: selectedWallet,
                betType: bet.betType,
            });
        }
    };

    const refreshAfterPlacement = async () => {
        await refreshMyBets();
        await refreshWalletBalance();
    };

    const ensureAuthenticated = () => {
        if (!isAuthenticated) {
            openLogin();
            throw new Error('Login required');
        }
    };

    const placeBet = async () => {
        ensureAuthenticated();

        if (bets.length === 0) return;

        await validateOddsBeforePlacement(bets, true);

        try {
            await submitPlacedBets(bets);
            clearBets();
            await refreshAfterPlacement();
        } catch (error) {
            console.error("Failed to place bets", error);
            throw error;
        }
    };

    const placeSingleBet = async (selection: BetSelection, stake = oneClickStakeState) => {
        ensureAuthenticated();

        const singleBet = buildSlipBet(selection, normalizeStake(stake));
        const pendingKey = buildBetKey(selection.eventId, selection.marketId, selection.selectionId);

        if (pendingOneClickKeysRef.current.has(pendingKey)) return;

        pendingOneClickKeysRef.current.add(pendingKey);

        setPendingOneClickKeys(prev => {
            const next = new Set(prev);
            next.add(pendingKey);
            return next;
        });

        try {
            await validateOddsBeforePlacement([singleBet], false);
            await submitPlacedBets([singleBet]);
            await refreshAfterPlacement();
        } catch (error) {
            console.error('Failed to place one-click bet', error);
            throw error;
        } finally {
            pendingOneClickKeysRef.current.delete(pendingKey);
            setPendingOneClickKeys(prev => {
                const next = new Set(prev);
                next.delete(pendingKey);
                return next;
            });
        }
    };

    return (
        <BetContext.Provider value={{
            bets,
            myBets,
            addBet,
            removeBet,
            updateStake,
            clearBets,
            totalStake,
            totalPotentialWin,
            placeBet,
            placeSingleBet,
            refreshMyBets,
            isBetslipOpen,
            toggleBetslip,
            oneClickEnabled: oneClickEnabledState,
            setOneClickEnabled,
            oneClickStake: oneClickStakeState,
            setOneClickStake,
            isOneClickPending,
        }}>
            {children}
        </BetContext.Provider>
    );
}

export function useBets() {
    const context = useContext(BetContext);
    if (context === undefined) {
        throw new Error('useBets must be used within a BetProvider');
    }
    return context;
}
