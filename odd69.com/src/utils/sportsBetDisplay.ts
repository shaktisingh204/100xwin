import type { Bet } from '@/services/bets';

const roundAmount = (value: number) => parseFloat((Number(value || 0)).toFixed(2));

export const getBetOriginalStake = (bet: Partial<Bet>) =>
    roundAmount(bet.originalStake ?? bet.stake ?? 0);

export const getBetOriginalPotentialWin = (bet: Partial<Bet>) =>
    roundAmount(bet.originalPotentialWin ?? bet.potentialWin ?? 0);

export const getBetPartialCashoutValue = (bet: Partial<Bet>) =>
    roundAmount(bet.partialCashoutValue ?? 0);

export const hasPartialCashout = (bet: Partial<Bet>) =>
    getBetPartialCashoutValue(bet) > 0;

export const getBetSettledReturn = (bet: Partial<Bet>) => {
    const partialCashout = getBetPartialCashoutValue(bet);
    const originalStake = getBetOriginalStake(bet);

    switch (bet.status) {
        case 'WON':
            return roundAmount(partialCashout + (bet.potentialWin ?? 0));
        case 'LOST':
            return partialCashout;
        case 'VOID':
            return roundAmount(partialCashout + (bet.stake ?? originalStake));
        case 'CASHED_OUT':
            return roundAmount(bet.cashoutValue ?? partialCashout);
        default:
            return null;
    }
};

export const getBetNetPnL = (bet: Partial<Bet>) => {
    const settledReturn = getBetSettledReturn(bet);
    if (settledReturn === null) return null;

    return roundAmount(settledReturn - getBetOriginalStake(bet));
};

export const getBetPendingMaxReturn = (bet: Partial<Bet>) =>
    roundAmount(getBetPartialCashoutValue(bet) + (bet.potentialWin ?? 0));
