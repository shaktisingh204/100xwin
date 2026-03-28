type MarketPricingInput = {
    marketType?: string | null;
    marketName?: string | null;
    selectionName?: string | null;
};

type PotentialWinInput = MarketPricingInput & {
    stake: number;
    odds: number;
    rate?: number | null;
};

const DECIMAL_PRICE_MARKET_TYPES = new Set([
    'match',
    'match1',
    'bookmaker',
    'special',
    'bm',
    'khado',
    'oddeven',
]);

const DECIMAL_PRICE_MARKET_KEYWORDS =
    /match[_ ]odds|bookmaker|book maker|odd even|oddeven|khado/i;
const LINE_BASED_MARKET_KEYWORDS = /runs|session|fancy|meter|lambi|over/i;

const roundAmount = (value: number) =>
    parseFloat((Number(value || 0)).toFixed(2));

const normalizePositiveNumber = (value: number | null | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 1 ? parsed : null;
};

export const normalizeMarketType = (marketType?: string | null) =>
    String(marketType || '').trim().toLowerCase();

export const isDecimalPriceMarket = ({
    marketType,
    marketName,
    selectionName,
}: MarketPricingInput = {}) => {
    const normalizedType = normalizeMarketType(marketType);
    if (DECIMAL_PRICE_MARKET_TYPES.has(normalizedType)) {
        return true;
    }

    const haystack = `${marketName || ''} ${selectionName || ''}`;
    return DECIMAL_PRICE_MARKET_KEYWORDS.test(haystack);
};

export const isLineBasedFancyMarket = (input: MarketPricingInput = {}) => {
    if (isDecimalPriceMarket(input)) {
        return false;
    }

    const haystack = `${input.marketName || ''} ${input.selectionName || ''}`;
    return LINE_BASED_MARKET_KEYWORDS.test(haystack);
};

export const getBetPayoutMultiplier = ({
    odds,
    rate,
    marketType,
    marketName,
    selectionName,
}: Omit<PotentialWinInput, 'stake'>) => {
    const normalizedOdds = normalizePositiveNumber(odds) ?? 0;
    const normalizedRate = normalizePositiveNumber(rate);

    if (
        isDecimalPriceMarket({
            marketType,
            marketName,
            selectionName,
        })
    ) {
        return normalizedOdds;
    }

    return normalizedRate ?? normalizedOdds;
};

export const calculatePotentialWin = ({
    stake,
    odds,
    rate,
    marketType,
    marketName,
    selectionName,
}: PotentialWinInput) =>
    roundAmount(
        Number(stake || 0) *
            getBetPayoutMultiplier({
                odds,
                rate,
                marketType,
                marketName,
                selectionName,
            }),
    );
