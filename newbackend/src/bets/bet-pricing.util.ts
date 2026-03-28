type MarketPricingInput = {
  marketType?: string | null;
  marketName?: string | null;
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

const normalizePositiveNumber = (value: number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : null;
};

export const roundCurrencyAmount = (value: number) =>
  parseFloat(Number(value || 0).toFixed(2));

export const normalizeMarketType = (marketType?: string | null) =>
  String(marketType || '')
    .trim()
    .toLowerCase();

export const isDecimalPriceMarket = ({
  marketType,
  marketName,
}: MarketPricingInput = {}) => {
  const normalizedType = normalizeMarketType(marketType);
  if (DECIMAL_PRICE_MARKET_TYPES.has(normalizedType)) {
    return true;
  }

  return DECIMAL_PRICE_MARKET_KEYWORDS.test(String(marketName || ''));
};

export const getRateFromSize = (size?: number | null) => {
  const parsedSize = Number(size);
  if (!Number.isFinite(parsedSize) || parsedSize <= 0) {
    return null;
  }

  return roundCurrencyAmount(1 + parsedSize / 100);
};

export const calculatePotentialWinAmount = ({
  stake,
  odds,
  rate,
  marketType,
  marketName,
}: PotentialWinInput) => {
  const normalizedStake = Number(stake || 0);
  const normalizedOdds = normalizePositiveNumber(odds) ?? 0;
  const normalizedRate = normalizePositiveNumber(rate);

  const multiplier = isDecimalPriceMarket({ marketType, marketName })
    ? normalizedOdds
    : (normalizedRate ?? normalizedOdds);

  return roundCurrencyAmount(normalizedStake * multiplier);
};
