'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import api from '@/services/api';
import { getCurrencySymbol } from '@/utils/currency';
import QRCode from 'react-qr-code';
import {
    X,
    Check,
    Copy,
    AlertCircle,
    ShieldCheck,
    Loader2,
    Clock,
    CheckCircle2,
    RefreshCw,
    ArrowLeft,
    ArrowUpRight,
} from 'lucide-react';
import { countries } from '@/config/countries';
import { BonusPromotion } from '@/services/promotions';
import toast from 'react-hot-toast';


interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CryptoOption {
    id: string;
    label: string;
    network: string;
    icon: string;
    color: string;
}

interface GatewayOption {
    id: string;
    label: string;
    sub: string;
    icon: string;
    minDeposit: number;
    badge?: string;
}

const defaultCryptoOptions: CryptoOption[] = [
    { id: 'usdttrc20', label: 'USDT', network: 'TRC20', icon: '₮', color: '#26A17B' },
    { id: 'usdterc20', label: 'USDT', network: 'ERC20', icon: '₮', color: '#26A17B' },
    { id: 'btc', label: 'Bitcoin', network: 'BTC', icon: '₿', color: '#F7931A' },
    { id: 'eth', label: 'Ethereum', network: 'ERC20', icon: 'Ξ', color: '#627EEA' },
    { id: 'bnb', label: 'BNB', network: 'BEP20', icon: 'B', color: '#F3BA2F' },
    { id: 'ltc', label: 'Litecoin', network: 'LTC', icon: 'Ł', color: '#BFBBBB' },
    { id: 'xrp', label: 'XRP', network: 'XRP', icon: '✕', color: '#346AA9' },
    { id: 'trx', label: 'TRON', network: 'TRC20', icon: '◈', color: '#EF0027' },
];

const quickAmountsFiat = ['500', '1000', '2000', '5000', '10000'];
const quickAmountsUPI2 = ['200', '500', '1000', '2000', '5000'];
const quickAmountsCrypto = ['20', '50', '100', '200', '500'];
const manualDepositBonusCodeKey = 'manualDepositBonusCode';

const parseAmountList = (value?: string) => {
    if (!value) return [];
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0 && !Number.isNaN(Number(entry)) && Number(entry) > 0);
};

const buildQuickAmounts = (minimum: number, configuredValue?: string, fallback: string[] = []) => {
    const configured = parseAmountList(configuredValue);
    if (configured.length) return configured;

    const derived = minimum > 0
        ? [minimum, minimum * 2, minimum * 5, minimum * 10, minimum * 20]
        : fallback.map((value) => Number(value));

    return Array.from(new Set(derived.filter((value) => Number.isFinite(value) && value > 0)))
        .slice(0, 5)
        .map((value) => String(Number(value.toFixed(2))).replace(/\.0+$/, ''));
};

const parseCryptoOptionsConfig = (value?: string): CryptoOption[] => {
    if (!value) return defaultCryptoOptions;

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return defaultCryptoOptions;

        const normalized = parsed
            .map((entry) => {
                if (!entry || typeof entry !== 'object') return null;
                const option = entry as Partial<CryptoOption>;
                if (!option.id || !option.label || !option.network || !option.icon || !option.color) return null;
                return {
                    id: String(option.id),
                    label: String(option.label),
                    network: String(option.network),
                    icon: String(option.icon),
                    color: String(option.color),
                };
            })
            .filter(Boolean) as CryptoOption[];

        return normalized.length ? normalized : defaultCryptoOptions;
    } catch {
        return defaultCryptoOptions;
    }
};

type CryptoStep = 'configure' | 'awaiting' | 'success';
type DepositCurrency = 'INR' | 'CRYPTO';

interface PaymentData {
    paymentId: string;
    payAddress: string;
    payAmount: number;
    payCurrency: string;
    expiresAt: string | null;
    transactionDbId: number;
}

interface GatewayRetryState {
    hasPendingGatewayPayment: boolean;
    forceManual: boolean;
    maxGatewayRetries: number;
    gatewayRetryCount: number;
    retryGroupId: string | null;
    suggestedGatewayId: string | null;
    pendingTransaction: {
        id: number;
        utr: string | null;
        amount: number;
        paymentMethod: string | null;
        createdAt: string;
    } | null;
    message: string;
}

interface PromoValidationResult {
    valid: boolean;
    hasConflict: boolean;
    conflictBonus: { applicableTo: string; title: string } | null;
    bonus: {
        id: string;
        code: string;
        title: string;
        description?: string;
        type: string;
        applicableTo: string;
        currency: DepositCurrency | 'BOTH';
        percentage: number;
        amount: number;
        minDeposit: number;
        maxBonus: number;
        wageringRequirement: number;
        depositWagerMultiplier: number;
        expiryDays: number;
        validUntil?: string | null;
        forFirstDepositOnly: boolean;
    };
    estimatedBonus: number;
    wageringRequired: number;
    depositWageringRequired: number;
    eligibility: {
        depositCurrency: DepositCurrency;
        approvedDepositCount: number;
        isFirstDeposit: boolean;
        requiresFirstDeposit: boolean;
        minDeposit: number;
        minDepositMet: boolean;
        minDepositShortfall: number;
    };
}

const sanitizeAmountInput = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const [whole, ...fractionParts] = sanitized.split('.');
    if (!fractionParts.length) return whole;
    return `${whole}.${fractionParts.join('').slice(0, 2)}`;
};

const formatAmount = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null) {
        const maybeError = error as {
            response?: { data?: { message?: string } };
            message?: string;
        };
        return maybeError.response?.data?.message || maybeError.message || fallback;
    }
    return fallback;
};

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
    const { user } = useAuth();
    const { openManualDeposit } = useModal();

    // STRICT: fiat is ONLY for users whose registered country is exactly 'IN'.
    // Do NOT use a fallback of 'IN' — missing/null country means NOT India.
    const isIndia = user?.country === 'IN';
    // Dynamic fiat currency symbol
    const fiatSymbol = getCurrencySymbol(user?.currency || 'INR');
    const currentCountry = countries.find((country) => country.code === user?.country) ?? countries[0];

    // Indian users default to fiat; everyone else defaults to crypto
    const [activeTab, setActiveTab] = useState<'fiat' | 'crypto'>(isIndia ? 'fiat' : 'crypto');
    const [selectedMethod, setSelectedMethod] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [publicSettings, setPublicSettings] = useState<Record<string, string>>({});
    const [gatewayRetryState, setGatewayRetryState] = useState<GatewayRetryState | null>(null);
    const [gatewayRetryStateLoading, setGatewayRetryStateLoading] = useState(false);

    // Promo code state
    const [promoCode, setPromoCode] = useState<string>('');
    const [promoValidating, setPromoValidating] = useState(false);
    const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
    const [promoError, setPromoError] = useState<string>('');
    const promoTimerRef = useRef<NodeJS.Timeout | null>(null);
    const promoRequestRef = useRef(0);

    const [minDeposit, setMinDeposit] = useState<number>(100);
    const [minDepositUPI2, setMinDepositUPI2] = useState<number>(200);
    const [minDepositUPI0, setMinDepositUPI0] = useState<number>(100);
    const [minDepositCrypto, setMinDepositCrypto] = useState<number>(10);

    // Gateway config from SystemConfig
    const [upi1Enabled, setUpi1Enabled] = useState<boolean>(true);
    const [upi2Enabled, setUpi2Enabled] = useState<boolean>(true);
    // Gateway display names & taglines (admin-configurable)
    const [upi1Name, setUpi1Name] = useState('UPI Gateway 1');
    const [upi1Tag, setUpi1Tag] = useState('NekPay · Instant');
    const [upi2Name, setUpi2Name] = useState('UPI Gateway 2');
    const [upi2Tag, setUpi2Tag] = useState('UPI / Bank · Fast');
    // Admin-controlled display order
    const [upiOrder, setUpiOrder] = useState<string[]>(['UPI1', 'UPI2']);

    // Amount validation
    const [selectedMethodError, setSelectedMethodError] = useState<string>('');
    const [amountError, setAmountError] = useState<string>('');
    const [cryptoAmountError, setCryptoAmountError] = useState<string>('');

    // Available bonuses for visual picker (filtered by currency tab)
    const [availableBonuses, setAvailableBonuses] = useState<BonusPromotion[]>([]);
    const [selectedBonusId, setSelectedBonusId] = useState<string | null>(null);

    const [cryptoOptions, setCryptoOptions] = useState<CryptoOption[]>(defaultCryptoOptions);
    const [selectedCoin, setSelectedCoin] = useState<CryptoOption>(defaultCryptoOptions[0]);
    const [cryptoStep, setCryptoStep] = useState<CryptoStep>('configure');
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<string>('waiting');
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [copied, setCopied] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);


    // STRICT enforcement: whenever user data loads/changes, force the correct tab.
    // Non-India users MUST be on crypto; India users default to fiat.
    useEffect(() => {
        if (!isIndia) {
            setActiveTab('crypto');
        } else {
            setActiveTab('fiat');
        }
    }, [isIndia]);

    useEffect(() => {
        if (isOpen) {
            // Fetch min deposit from system config
            api.get('/settings/public')
                .then(res => {
                    const d = res.data || {};
                    setPublicSettings(d);
                    const min = parseFloat(d.MIN_DEPOSIT);
                    if (!isNaN(min) && min > 0) setMinDeposit(min);
                    const minU2 = parseFloat(d.MIN_DEPOSIT_UPI2);
                    if (!isNaN(minU2) && minU2 > 0) setMinDepositUPI2(minU2);
                    const minU0 = parseFloat(d.MIN_DEPOSIT_UPI0);
                    if (!isNaN(minU0) && minU0 > 0) setMinDepositUPI0(minU0);
                    const minCrypto = parseFloat(d.MIN_DEPOSIT_CRYPTO);
                    if (!isNaN(minCrypto) && minCrypto > 0) setMinDepositCrypto(minCrypto);

                    // Gateway enable/disable
                    const u1 = d.UPI1_ENABLED !== 'false';
                    const u2 = d.UPI2_ENABLED !== 'false';
                    setUpi1Enabled(u1);
                    setUpi2Enabled(u2);
                    // Gateway display names & taglines
                    if (d.UPI1_NAME) setUpi1Name(d.UPI1_NAME);
                    if (d.UPI1_TAGLINE) setUpi1Tag(d.UPI1_TAGLINE);
                    if (d.UPI2_NAME) setUpi2Name(d.UPI2_NAME);
                    if (d.UPI2_TAGLINE) setUpi2Tag(d.UPI2_TAGLINE);
                    // Display order (UPI1/UPI2 only)
                    if (d.UPI_GATEWAY_ORDER) {
                        const ord = (d.UPI_GATEWAY_ORDER as string).split(',').map((s: string) => s.trim()).filter((s) => s === 'UPI1' || s === 'UPI2');
                        if (ord.length) setUpiOrder(ord);
                    }
                    setCryptoOptions(parseCryptoOptionsConfig(d.DEPOSIT_CRYPTO_OPTIONS));
                    // Manual payment gateway toggle (not used here — handled in ManualDepositScreen)
                })
                .catch(() => { });

            // Auto-fill bonus code from MongoDB (pending deposit bonus set during registration)
            api.get('/bonus/pending')
                .then(res => {
                    if (res.data?.bonusCode) {
                        handlePromoCodeChange(res.data.bonusCode, { immediate: true });
                    }
                })
                .catch(() => { }); // silent if not logged in / no pending bonus

            // Fetch available bonuses for visual picker
            api.get('/bonus/promotions')
                .then(res => { setAvailableBonuses(Array.isArray(res.data) ? res.data : []); })
                .catch(() => { });

        } else {
            // Clear amount error when modal closes
            setSelectedMethodError('');
            setAmountError('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (!cryptoOptions.find((coin) => coin.id === selectedCoin.id)) {
            setSelectedCoin(cryptoOptions[0] ?? defaultCryptoOptions[0]);
        }
    }, [cryptoOptions, selectedCoin.id]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'ZEERO_PAY_SUCCESS') {
                onClose();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onClose]);

    useEffect(() => {
        const enabledMethods = (currentCountry.paymentMethods || []).filter((method) => {
            if (method.id === 'UPI1' && !upi1Enabled) return false;
            if (method.id === 'UPI2' && !upi2Enabled) return false;
            if (method.id === 'UPI0') return false;
            return method.id === 'UPI1' || method.id === 'UPI2';
        });

        const exists = enabledMethods.find((method) => method.id === selectedMethod);
        if (!exists) {
            setSelectedMethodError('');
            setSelectedMethod('');
        }
    }, [currentCountry.paymentMethods, selectedMethod, upi1Enabled, upi2Enabled]);

    useEffect(() => {
        if (!isOpen) {
            stopPolling();
            stopTimer();
            resetCryptoState();
            setIframeUrl(null);
        }
    }, [isOpen]);

    const stopPolling = () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
    const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

    const resetCryptoState = () => {
        setCryptoStep('configure'); setPaymentData(null);
        setPaymentStatus('waiting'); setTimeLeft(0); setCopied(false);
    };

    const startTimer = (expiresAt: string | null) => {
        if (!expiresAt) return;
        const expiry = new Date(expiresAt).getTime();
        timerRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) stopTimer();
        }, 1000);
    };

    const startPolling = useCallback((paymentId: string) => {
        pollingRef.current = setInterval(async () => {
            try {
                setStatusLoading(true);
                const res = await api.get(`/nowpayments/status/${paymentId}`);
                const status = res.data?.data?.status;
                setPaymentStatus(status);
                if (status === 'finished' || status === 'confirmed') {
                    stopPolling(); stopTimer(); setCryptoStep('success');
                    toast.success('🎉 Crypto payment confirmed! Balance credited.');
                } else if (status === 'expired' || status === 'failed') {
                    stopPolling(); stopTimer();
                    toast.error(`Payment ${status}. Please try again.`);
                    resetCryptoState();
                }
            } catch { } finally { setStatusLoading(false); }
        }, 12000);
    }, []);

    const isFiatFlow = isIndia && activeTab === 'fiat';
    const depositCurrency: DepositCurrency = isFiatFlow ? 'INR' : 'CRYPTO';

    const handleManualFallback = useCallback((manualMessage?: string, allowBack = false) => {
        if (typeof window !== 'undefined') {
            if (promoCode.trim()) {
                window.sessionStorage.setItem(manualDepositBonusCodeKey, promoCode.trim().toUpperCase());
            } else {
                window.sessionStorage.removeItem(manualDepositBonusCodeKey);
            }
        }
        if (manualMessage) toast(manualMessage);
        onClose();
        openManualDeposit({ allowBack });
    }, [onClose, openManualDeposit, promoCode]);

    const fetchGatewayRetryState = useCallback(async () => {
        if (!isOpen || !isFiatFlow || !user) {
            setGatewayRetryState(null);
            setGatewayRetryStateLoading(false);
            return;
        }

        setGatewayRetryStateLoading(true);
        try {
            const res = await api.get('/manual-deposit/retry-state');
            setGatewayRetryState(res.data);
        } catch {
            setGatewayRetryState(null);
        } finally {
            setGatewayRetryStateLoading(false);
        }
    }, [isOpen, isFiatFlow, user?.id]);

    useEffect(() => {
        void fetchGatewayRetryState();
    }, [fetchGatewayRetryState]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true); toast.success('Copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const findBonusByCode = (code: string) => availableBonuses.find((bonus) => bonus.code.toUpperCase() === code.toUpperCase());

    const validatePromoCodePreview = async (code: string) => {
        const requestId = ++promoRequestRef.current;
        setPromoValidating(true);
        try {
            const res = await api.post('/bonus/validate', {
                code: code.toUpperCase(),
                depositAmount: parseFloat(amount) || 0,
                depositCurrency,
            });
            if (requestId !== promoRequestRef.current) return;
            setPromoResult(res.data);
            setPromoError('');
        } catch (err: unknown) {
            if (requestId !== promoRequestRef.current) return;
            setPromoResult(null);
            setPromoError(getApiErrorMessage(err, 'Invalid promo code'));
        } finally {
            if (requestId === promoRequestRef.current) setPromoValidating(false);
        }
    };

    const queuePromoValidation = (code: string, immediate = false) => {
        if (promoTimerRef.current) clearTimeout(promoTimerRef.current);
        if (!code.trim()) return;
        setPromoValidating(true);
        if (immediate) {
            void validatePromoCodePreview(code);
            return;
        }
        promoTimerRef.current = setTimeout(() => {
            void validatePromoCodePreview(code);
        }, 250);
    };

    const handlePromoCodeChange = (code: string, options: { immediate?: boolean; selectedBonusId?: string | null } = {}) => {
        const normalizedCode = code.toUpperCase();
        setPromoCode(normalizedCode);
        setPromoResult(null);
        setPromoError('');
        if (options.selectedBonusId !== undefined) {
            setSelectedBonusId(options.selectedBonusId);
        } else {
            const matchedBonus = findBonusByCode(normalizedCode);
            setSelectedBonusId(matchedBonus?._id ?? null);
        }
        if (!normalizedCode.trim()) {
            if (promoTimerRef.current) clearTimeout(promoTimerRef.current);
            promoRequestRef.current += 1;
            setPromoValidating(false);
            return;
        }
        queuePromoValidation(normalizedCode, options.immediate);
    };

    useEffect(() => {
        if (!promoCode.trim()) return;
        queuePromoValidation(promoCode);
        return () => {
            if (promoTimerRef.current) clearTimeout(promoTimerRef.current);
        };
    }, [amount, activeTab]);

    useEffect(() => {
        if (!promoCode.trim() || selectedBonusId) return;
        const matchedBonus = findBonusByCode(promoCode);
        if (matchedBonus) setSelectedBonusId(matchedBonus._id);
    }, [availableBonuses, promoCode, selectedBonusId]);

    const selectedBonus = (selectedBonusId
        ? availableBonuses.find((bonus) => bonus._id === selectedBonusId)
        : findBonusByCode(promoCode)) ?? null;
    const parsedAmount = parseFloat(amount) || 0;
    const bonusMinDeposit = promoResult?.eligibility?.minDeposit ?? selectedBonus?.minDeposit ?? 0;
    const bonusMinDepositShortfall = promoResult?.eligibility?.minDepositShortfall ?? Math.max(0, bonusMinDeposit - parsedAmount);
    const bonusMinDepositMet = promoResult?.eligibility?.minDepositMet ?? parsedAmount >= bonusMinDeposit;
    const bonusRequiresFirstDeposit = promoResult?.eligibility?.requiresFirstDeposit ?? !!selectedBonus?.forFirstDepositOnly;
    const selectedBonusSymbol = depositCurrency === 'CRYPTO' ? '$' : fiatSymbol;
    const hasPromoSelection = !!promoCode.trim();
    const hasBonusQualificationIssue = hasPromoSelection && parsedAmount > 0 && bonusMinDeposit > 0 && !bonusMinDepositMet;
    const bonusQualificationMessage = hasBonusQualificationIssue
        ? `Increase your deposit by ${selectedBonusSymbol}${formatAmount(bonusMinDepositShortfall)} to unlock this bonus.`
        : '';
    const promoBlockingError = promoError || bonusQualificationMessage;

    const ensurePromoSelectionIsValid = () => {
        if (!hasPromoSelection) return true;
        if (promoValidating) {
            toast.error('Checking bonus eligibility. Please wait a moment.');
            return false;
        }
        if (promoError) {
            toast.error(promoError);
            return false;
        }
        if (hasBonusQualificationIssue) {
            toast.error(bonusQualificationMessage);
            return false;
        }
        if (!promoResult) {
            toast.error('Please wait for bonus validation to finish.');
            return false;
        }
        return true;
    };

    const handleGenerateCryptoAddress = async () => {
        const enteredAmount = parseFloat(amount);
        if (!amount || enteredAmount <= 0) {
            const errorMessage = 'Please enter a valid amount (USD).';
            setCryptoAmountError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        if (enteredAmount < minDepositCrypto) {
            const errorMessage = `Minimum crypto deposit is $${minDepositCrypto}`;
            setCryptoAmountError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        if (!ensurePromoSelectionIsValid()) return;
        setLoading(true); setMessage(null);
        try {
            const res = await api.post('/nowpayments/create', {
                amount: parseFloat(amount),
                payCurrency: selectedCoin.id,
                priceCurrency: 'usd',
                bonusCode: promoCode || undefined,
            });
            const data: PaymentData = res.data.data;
            api.delete('/bonus/pending').catch(() => { });
            setPaymentData(data); setPaymentStatus('waiting');
            setCryptoStep('awaiting'); startTimer(data.expiresAt); startPolling(data.paymentId);
        } catch (error: unknown) {
            const msg = getApiErrorMessage(error, 'Failed to generate payment address');
            toast.error(msg); setMessage({ type: 'error', text: msg });
        } finally { setLoading(false); }
    };

    const handleFiatSubmit = async () => {
        setMessage(null);
        if (gatewayRetryState?.forceManual) {
            handleManualFallback(gatewayRetryState.message, false);
            return;
        }
        if (!selectedMethod) {
            const gatewayError = 'Please select a payment gateway.';
            setSelectedMethodError(gatewayError);
            toast.error(gatewayError);
            return;
        }

        setSelectedMethodError('');
        const numAmt = parseFloat(amount);
        const isUPI2 = selectedMethod === 'UPI2';
        const isUPI0 = selectedMethod === 'UPI0';
        const minAmt = activeGatewayMinDeposit ?? (isUPI0 ? minDepositUPI0 : (isUPI2 ? minDepositUPI2 : minDeposit));

        if (!amount || numAmt <= 0) {
            setAmountError('Please enter a valid amount.');
            toast.error('Please enter a valid amount.');
            return;
        }
        if (numAmt < minAmt) {
            setAmountError(`Minimum deposit for ${activeGatewayLabel || (isUPI0 ? 'UPI Gateway 0' : (isUPI2 ? upi2Name : upi1Name))} is ${fiatSymbol}${minAmt}.`);
            toast.error(`Minimum deposit is ${fiatSymbol}${minAmt}.`);
            return;
        }
        if (!ensurePromoSelectionIsValid()) return;
        setAmountError('');
        setLoading(true);
        try {
            const now = new Date();

            if (isUPI0) {
                const orderNo = `DEP0${now.getTime()}${Math.floor(Math.random() * 100)}`;
                const response = await api.post('/payment0/create', {
                    orderNo,
                    amount: parseFloat(amount).toFixed(2),
                    userId: user?.id,
                    bonusCode: promoCode || undefined,
                    returnUrl: window.location.origin + '/profile/transactions'
                });
                const { success, payUrl, message: errMsg } = response.data;
                if (success && payUrl) {
                    api.delete('/bonus/pending').catch(() => { });
                    setIframeUrl(payUrl);
                    void fetchGatewayRetryState();
                    if (promoCode) toast.success(`🎁 Bonus code ${promoCode} will be applied on payment confirmation!`);
                } else if (success) {
                    toast.success('Payment initiated!'); onClose();
                } else {
                    throw new Error(errMsg || 'UPI 0 gateway rejected the request');
                }
            } else if (isUPI2) {
                // ── UPI 2 Gateway (new API format) ──────────────────────────
                const orderNo = `DEP2${now.getTime()}${Math.floor(Math.random() * 100)}`;
                const response = await api.post('/payment2/create', {
                    orderNo,
                    amount: parseFloat(amount).toFixed(2),
                    currency: 'INR',
                    payType: 'UPI',
                    userId: user?.id,
                    bonusCode: promoCode || undefined,
                });
                const { success, payUrl, message: errMsg } = response.data;
                if (success && payUrl) {
                    // Clear MongoDB pending bonus — it's been submitted with this deposit
                    api.delete('/bonus/pending').catch(() => { });
                    setIframeUrl(payUrl);
                    void fetchGatewayRetryState();
                    if (promoCode) toast.success(`🎁 Bonus code ${promoCode} will be applied on payment confirmation!`);
                } else if (success) {
                    toast.success('Payment initiated!'); onClose();
                } else {
                    throw new Error(errMsg || 'UPI 2 gateway rejected the request');
                }
            } else {
                // ── UPI 1 / NekPay Gateway (existing format) ────────────────
                const mch_order_no = `DEP${now.getTime()}${Math.floor(Math.random() * 100)}`;
                const order_date =
                    now.getFullYear() + '-' +
                    String(now.getMonth() + 1).padStart(2, '0') + '-' +
                    String(now.getDate()).padStart(2, '0') + ' ' +
                    String(now.getHours()).padStart(2, '0') + ':' +
                    String(now.getMinutes()).padStart(2, '0') + ':' +
                    String(now.getSeconds()).padStart(2, '0');

                let pay_type = '105'; // UPI 1
                if (selectedMethod === 'NETBANKING') pay_type = '153';

                const orderData = {
                    page_url: window.location.origin + '/profile/transactions',
                    mch_order_no, pay_type,
                    trade_amount: parseFloat(amount).toString(),
                    order_date, goods_name: 'Wallet Deposit',
                    userId: user?.id,
                    bonusCode: promoCode || undefined,
                };

                const response = await api.post('/payment/create', orderData);
                const nekpayData = response.data?.data ?? response.data;
                const payInfo = nekpayData?.payInfo || nekpayData?.pay_info || nekpayData?.payUrl || nekpayData?.pay_url;

                if (payInfo) {
                    // Clear MongoDB pending bonus — it's been submitted with this deposit
                    api.delete('/bonus/pending').catch(() => { });
                    setIframeUrl(payInfo);
                    void fetchGatewayRetryState();
                    if (promoCode) toast.success(`🎁 Bonus code ${promoCode} will be applied on payment confirmation!`);
                } else if (nekpayData?.respCode === 'SUCCESS' || nekpayData?.tradeResult === '1') {
                    toast.success('Payment initiated!'); onClose();
                } else {
                    throw new Error(nekpayData?.tradeMsg || response.data?.message || 'Payment gateway rejected the request');
                }
            }
        } catch (error: unknown) {
            const gatewayError = error as {
                response?: {
                    data?: {
                        manualRequired?: boolean;
                        message?: string;
                        retryState?: GatewayRetryState;
                    };
                };
            };

            if (gatewayError.response?.data?.manualRequired) {
                if (gatewayError.response.data.retryState) setGatewayRetryState(gatewayError.response.data.retryState);
                handleManualFallback(gatewayError.response.data.message || gatewayError.response.data.retryState?.message, false);
                return;
            }

            const msg = getApiErrorMessage(error, 'Deposit failed. Please try again.');
            setMessage({ type: 'error', text: msg }); toast.error(msg);
        } finally { setLoading(false); }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const statusMap: Record<string, { label: string; color: string }> = {
        waiting: { label: 'Waiting for payment…', color: 'text-brand-gold' },
        confirming: { label: 'Confirming…', color: 'text-brand-gold' },
        confirmed: { label: 'Confirmed!', color: 'text-green-400' },
        sending: { label: 'Sending funds…', color: 'text-brand-gold' },
        finished: { label: 'Complete!', color: 'text-green-400' },
        partially_paid: { label: 'Partial — contact support', color: 'text-brand-gold' },
        failed: { label: 'Failed', color: 'text-red-400' },
        expired: { label: 'Expired', color: 'text-red-400' },
    };

    const fiatSubmitHint = gatewayRetryState?.forceManual
        ? gatewayRetryState.message || 'Please continue with Manual UPI.'
        : !selectedMethod
            ? gatewayRetryStateLoading
                ? 'Checking pending payment status...'
                : 'Choose a gateway to continue.'
        : !amount
            ? 'Enter your deposit amount.'
            : amountError
                ? amountError
                : promoValidating
                    ? 'Checking bonus eligibility...'
                    : promoBlockingError || 'Ready to continue to the secure payment page.';

    const cryptoSubmitHint = !amount
        ? 'Enter your deposit amount in USD.'
        : cryptoAmountError
            ? cryptoAmountError
            : promoValidating
                ? 'Checking bonus eligibility...'
                : promoBlockingError || 'A unique wallet address will be generated for this payment.';

    const isFiatSubmitDisabled = loading;
    const isCryptoSubmitDisabled = loading;
    const isForcedManualFlow = isFiatFlow && !!gatewayRetryState?.forceManual;

    const gatewayOptions = (() => {
        const allGateways = (currentCountry.paymentMethods || [])
            .map((method) => {
                if (method.id === 'UPI0') return null;
                if (method.id === 'UPI1' && !upi1Enabled) return null;
                if (method.id === 'UPI2' && !upi2Enabled) return null;
                if (method.id !== 'UPI1' && method.id !== 'UPI2') return null;

                const isGatewayOne = method.id === 'UPI1';

                return {
                    id: method.id,
                    label: isGatewayOne ? upi1Name : upi2Name,
                    sub: method.subLabel || (isGatewayOne ? upi1Tag : upi2Tag),
                    icon: method.icon && method.icon !== 'UPI'
                        ? method.icon
                        : isGatewayOne
                            ? '🏦'
                            : '📲',
                    minDeposit: isGatewayOne ? minDeposit : minDepositUPI2,
                    badge: method.badge,
                };
            })
            .filter(Boolean) as GatewayOption[];

        const sorted = [...upiOrder]
            .map((gatewayId) => allGateways.find((gateway) => gateway.id === gatewayId))
            .filter(Boolean) as typeof allGateways;

        allGateways.forEach((gateway) => {
            if (!sorted.find((sortedGateway) => sortedGateway.id === gateway.id)) sorted.push(gateway);
        });

        return sorted;
    })();
    useEffect(() => {
        if (!isFiatFlow || gatewayRetryState?.forceManual || selectedMethod) return;
        if (!gatewayRetryState?.suggestedGatewayId) return;

        const suggestedGatewayExists = gatewayOptions.some((gateway) => gateway.id === gatewayRetryState.suggestedGatewayId);
        if (suggestedGatewayExists) {
            setSelectedMethod(gatewayRetryState.suggestedGatewayId);
        }
    }, [gatewayOptions, gatewayRetryState, isFiatFlow, selectedMethod]);
    const selectedGateway = gatewayOptions.find((gateway) => gateway.id === selectedMethod) ?? null;
    const activeGatewayLabel = selectedGateway?.label || null;
    const activeGatewayMinDeposit = selectedGateway?.minDeposit ?? null;
    const modalTitle = publicSettings.DEPOSIT_MODAL_TITLE || 'Deposit';
    const cryptoTabLabel = publicSettings.DEPOSIT_TAB_CRYPTO_LABEL || 'Crypto';
    const fiatTabLabel = publicSettings.DEPOSIT_TAB_FIAT_LABEL || 'Fiat';
    const bonusHeading = publicSettings.DEPOSIT_AUTO_BONUS_LABEL || 'Applied Bonus';
    const depositMethodHeading = publicSettings.DEPOSIT_METHOD_TITLE || 'Deposit Method';
    const amountHeading = publicSettings.DEPOSIT_AMOUNT_TITLE || 'Amount';
    const currentQuickAmounts = isFiatFlow
        ? buildQuickAmounts(
            selectedMethod === 'UPI2' ? minDepositUPI2 : minDeposit,
            selectedMethod === 'UPI2'
                ? publicSettings.DEPOSIT_QUICK_AMOUNTS_UPI2 || publicSettings.DEPOSIT_QUICK_AMOUNTS_FIAT
                : publicSettings.DEPOSIT_QUICK_AMOUNTS_UPI1 || publicSettings.DEPOSIT_QUICK_AMOUNTS_FIAT,
            selectedMethod === 'UPI2' ? quickAmountsUPI2 : quickAmountsFiat,
        )
        : buildQuickAmounts(
            minDepositCrypto,
            publicSettings.DEPOSIT_QUICK_AMOUNTS_CRYPTO,
            quickAmountsCrypto,
        );

    const currentAmountError = isFiatFlow ? amountError : cryptoAmountError;
    const currentSubmitDisabled = isFiatFlow
        ? isForcedManualFlow ? false : isFiatSubmitDisabled
        : isCryptoSubmitDisabled;
    const currentSubmitHint = isFiatFlow ? fiatSubmitHint : cryptoSubmitHint;
    const currentMinimumLabel = isFiatFlow
        ? activeGatewayMinDeposit
            ? `${fiatSymbol}${formatAmount(activeGatewayMinDeposit)}`
            : 'Select gateway'
        : `$${formatAmount(minDepositCrypto)}`;
    const currentRouteLabel = isFiatFlow
        ? activeGatewayLabel || 'Choose gateway'
        : `${selectedCoin.label} · ${selectedCoin.network}`;
    const appliedBonusTitle = promoResult?.bonus.title || selectedBonus?.title || (promoCode ? `Promo ${promoCode}` : '');
    const appliedBonusValueLabel = promoResult
        ? `${isFiatFlow ? fiatSymbol : '$'}${formatAmount(promoResult.estimatedBonus)}`
        : selectedBonus
            ? selectedBonus.percentage > 0
                ? `${selectedBonus.percentage}% match`
                : `${isFiatFlow ? fiatSymbol : '$'}${formatAmount(selectedBonus.amount)} flat`
            : '';
    const appliedBonusMeta = promoBlockingError
        ? promoBlockingError
        : promoValidating
            ? 'Checking bonus eligibility for this deposit.'
            : promoResult?.valid
                ? `Estimated bonus ${appliedBonusValueLabel}${bonusRequiresFirstDeposit ? ' · First deposit only' : ''}`
                : promoCode
                    ? 'This bonus will stay attached to your deposit request.'
                    : '';
    const appliedBonusToneClass = promoBlockingError
        ? 'border-red-500/30 bg-red-500/10 text-red-100'
        : promoValidating
            ? 'border-brand-gold/25 bg-brand-gold/10 text-text-primary'
            : 'border-brand-gold/25 bg-brand-gold/10 text-text-primary';
    const recommendedGatewayId = publicSettings.DEPOSIT_RECOMMENDED_GATEWAY
        || gatewayOptions.find((gateway) => gateway.badge?.toLowerCase() === 'recommended')?.id
        || gatewayOptions[0]?.id;

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5 pointer-events-none">
                <div
                    className={`pointer-events-auto relative w-full overflow-hidden border border-white/[0.06] bg-bg-section text-text-primary shadow-hard ${iframeUrl
                        ? 'h-[100dvh] max-h-[100dvh] rounded-none sm:h-[92vh] sm:max-h-[92vh] sm:max-w-5xl sm:rounded-[32px]'
                        : 'h-[100dvh] max-h-[100dvh] rounded-none sm:h-[92vh] sm:max-h-[92vh] sm:max-w-5xl sm:rounded-[32px]'
                        }`}
                >
                    <div className="relative flex h-full flex-col">
                        <div className="shrink-0 border-b border-white/[0.06] bg-bg-card">
                            <div className="sm:hidden absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20" />
                            <div className="px-3 pb-3 pt-4 sm:px-6 sm:pb-5 sm:pt-6">
                                <div className="grid grid-cols-[40px_1fr_40px] items-center">
                                    <button
                                        onClick={onClose}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-elevated text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>
                                    <h2 className="text-center text-[1.65rem] font-semibold text-text-primary sm:text-[2.1rem]">
                                        {modalTitle}
                                    </h2>
                                    <div />
                                </div>

                                {isIndia && (
                                    <div className="mt-5 grid grid-cols-2 border-b border-white/[0.06]">
                                        <button
                                            onClick={() => { setActiveTab('crypto'); setMessage(null); }}
                                            className={`border-b-4 px-3 py-2.5 text-base font-semibold transition-colors sm:px-4 sm:py-3 sm:text-xl ${activeTab === 'crypto'
                                                ? 'border-brand-gold text-brand-gold'
                                                : 'border-transparent text-text-muted hover:text-text-primary'
                                                }`}
                                        >
                                            {cryptoTabLabel}
                                        </button>
                                        <button
                                            onClick={() => { setActiveTab('fiat'); resetCryptoState(); setMessage(null); setIframeUrl(null); }}
                                            className={`border-b-4 px-3 py-2.5 text-base font-semibold transition-colors sm:px-4 sm:py-3 sm:text-xl ${activeTab === 'fiat'
                                                ? 'border-brand-gold text-brand-gold'
                                                : 'border-transparent text-text-muted hover:text-text-primary'
                                                }`}
                                        >
                                            {fiatTabLabel}
                                        </button>
                                    </div>
                                )}
                                {!isIndia && (
                                    <div className="mt-5 border-b border-white/[0.06]">
                                        <div className="border-b-4 border-brand-gold px-3 py-2.5 text-center text-base font-semibold text-brand-gold sm:px-4 sm:py-3 sm:text-xl">
                                            {cryptoTabLabel}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isIndia && (
                            <div className="shrink-0 border-b border-brand-gold/20 bg-brand-gold/10 px-4 py-3 text-sm text-text-secondary sm:px-6">
                                UPI and fiat routes are available for India registrations only right now. Your deposit stays in crypto mode here.
                            </div>
                        )}

                        {iframeUrl ? (
                            <div className="flex min-h-0 flex-1 flex-col bg-white">
                                <div className="flex items-center justify-between border-b border-white/[0.06] bg-bg-card px-4 py-3 text-sm text-text-secondary">
                                    <span>Secure payment gateway</span>
                                    <button
                                        onClick={() => setIframeUrl(null)}
                                        className="rounded-full border border-white/[0.06] bg-bg-elevated px-3 py-1 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                                    >
                                        Back to checkout
                                    </button>
                                </div>
                                <iframe src={iframeUrl} className="min-h-0 flex-1 border-0 bg-white" title="Secure Payment" allow="payment" />
                            </div>
                        ) : (
                            <>
                                {(isFiatFlow || cryptoStep === 'configure') && (
                                    <div className="flex min-h-0 flex-1 flex-col">
                                        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5 sm:px-6 sm:py-6">
                                            <div className="mx-auto w-full max-w-5xl rounded-[20px] bg-bg-card p-2.5 sm:rounded-[28px] sm:p-6">
                                                <div className="space-y-2.5 sm:space-y-5">
                                                    {promoCode && (
                                                        <div className={`rounded-xl border px-2.5 py-2 sm:px-4 ${appliedBonusToneClass}`}>
                                                            <div className="flex items-center justify-between gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                                                                            {bonusHeading}
                                                                        </p>
                                                                        <p className="text-[13px] font-semibold text-text-primary sm:text-base">{appliedBonusTitle}</p>
                                                                    </div>
                                                                    {appliedBonusMeta && (
                                                                        <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-text-secondary sm:mt-1 sm:text-[11px]">{appliedBonusMeta}</p>
                                                                    )}
                                                                </div>
                                                                {promoValidating ? (
                                                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-gold" />
                                                                ) : promoBlockingError ? (
                                                                    <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />
                                                                ) : (
                                                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-gold" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isFiatFlow && gatewayRetryState?.hasPendingGatewayPayment && (
                                                        <div className={`rounded-xl border px-3 py-3 sm:rounded-2xl sm:px-4 sm:py-4 ${gatewayRetryState.forceManual
                                                            ? 'border-orange-500/30 bg-orange-500/10'
                                                            : 'border-brand-gold/25 bg-brand-gold/10'
                                                            }`}>
                                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <AlertCircle className={`h-4 w-4 shrink-0 ${gatewayRetryState.forceManual ? 'text-orange-300' : 'text-brand-gold'}`} />
                                                                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                                                                            Pending Payment Detected
                                                                        </p>
                                                                    </div>
                                                                    <p className="mt-2 text-sm font-semibold text-text-primary">{gatewayRetryState.message}</p>
                                                                    <p className="mt-1 text-[11px] text-text-secondary">
                                                                        Ref {gatewayRetryState.pendingTransaction?.utr || 'Pending'} · {fiatSymbol}{formatAmount(gatewayRetryState.pendingTransaction?.amount || 0)}
                                                                    </p>
                                                                </div>

                                                                {gatewayRetryState.forceManual ? (
                                                                    <button
                                                                        onClick={() => handleManualFallback(gatewayRetryState.message, false)}
                                                                        className="inline-flex items-center justify-center rounded-[14px] border border-orange-300/30 bg-orange-500/15 px-4 py-2 text-xs font-semibold text-orange-100 transition-colors hover:bg-orange-500/20"
                                                                    >
                                                                        Open Manual UPI
                                                                    </button>
                                                                ) : (
                                                                    <div className="inline-flex shrink-0 items-center justify-center rounded-full border border-brand-gold/20 bg-brand-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-gold">
                                                                        {Math.max(0, gatewayRetryState.maxGatewayRetries - gatewayRetryState.gatewayRetryCount)} gateway retry left
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {promoResult?.hasConflict && (
                                                        <div className="rounded-xl border border-brand-gold/25 bg-brand-gold/10 px-3 py-2 text-[11px] text-text-primary sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                                                            This deposit bonus will replace your active {promoResult.conflictBonus?.title || 'bonus'} after approval.
                                                        </div>
                                                    )}

                                                    {bonusRequiresFirstDeposit && promoResult?.eligibility && (
                                                        <div className={`rounded-xl border px-3 py-2 text-[11px] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${promoResult.eligibility.isFirstDeposit
                                                            ? 'border-brand-gold/25 bg-brand-gold/10 text-text-primary'
                                                            : 'border-red-500/25 bg-red-500/10 text-red-100'
                                                            }`}>
                                                            {promoResult.eligibility.isFirstDeposit
                                                                ? 'This account is still eligible for this first-deposit offer.'
                                                                : 'This offer is only for first deposit, so it will not apply to this account.'}
                                                        </div>
                                                    )}

                                                    <div className="rounded-[18px] bg-bg-elevated p-2.5 sm:rounded-[26px] sm:p-4">
                                                        <div className="flex items-center justify-between gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="min-w-0">
                                                                <h3 className="text-[15px] font-semibold text-text-primary sm:text-xl">
                                                                    {isFiatFlow ? 'Deposit Currency' : 'Deposit Asset'}
                                                                </h3>
                                                                <p className="mt-0.5 text-[11px] text-text-secondary sm:mt-1 sm:text-sm">
                                                                    {isFiatFlow
                                                                        ? 'Your fiat deposit will use your registered currency.'
                                                                        : 'Choose the network you want to deposit with.'}
                                                                </p>
                                                            </div>
                                                            {isFiatFlow ? (
                                                                <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.06] bg-bg-hover px-2.5 py-2 sm:w-auto sm:gap-3 sm:rounded-xl sm:px-3 sm:py-2.5">
                                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gold text-base font-semibold text-text-inverse sm:h-9 sm:w-9 sm:text-lg">
                                                                        {fiatSymbol}
                                                                    </span>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-text-primary sm:text-base">{user?.currency || 'INR'}</p>
                                                                        <p className="text-[10px] text-text-muted sm:text-xs">Fiat wallet</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="shrink-0 rounded-lg border border-white/[0.06] bg-bg-hover px-2.5 py-2 text-left sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-right">
                                                                    <p className="text-sm font-semibold text-text-primary sm:text-base">{selectedCoin.label}</p>
                                                                    <p className="text-[10px] text-text-muted sm:text-xs">{selectedCoin.network}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {!isFiatFlow && (
                                                            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                                                                {cryptoOptions.map((coin) => (
                                                                    <button
                                                                        key={coin.id}
                                                                        onClick={() => { if (cryptoStep !== 'configure') return; setSelectedCoin(coin); }}
                                                                        disabled={cryptoStep !== 'configure'}
                                                                        className={`min-h-[96px] rounded-[16px] border p-3 text-left transition-all sm:min-h-[108px] sm:rounded-[20px] sm:p-3.5 ${selectedCoin.id === coin.id
                                                                            ? 'border-brand-gold/60 bg-brand-gold/10'
                                                                            : 'border-white/[0.06] bg-bg-hover hover:border-brand-gold/30 hover:bg-bg-card'
                                                                            } ${cryptoStep !== 'configure' ? 'cursor-not-allowed opacity-50' : ''}`}
                                                                    >
                                                                        <div className="flex h-full flex-col justify-between gap-3">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <span
                                                                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-bg-card text-lg font-bold sm:h-10 sm:w-10 sm:text-xl"
                                                                                    style={{ color: coin.color }}
                                                                                >
                                                                                    {coin.icon}
                                                                                </span>
                                                                                {selectedCoin.id === coin.id && (
                                                                                    <span className="rounded-full bg-brand-gold px-2 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-text-inverse sm:text-[9px]">
                                                                                        Active
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <div className="min-w-0">
                                                                                <p className="truncate text-[13px] font-semibold text-text-primary sm:text-sm">{coin.label}</p>
                                                                                <p className="mt-1 text-[10px] text-text-muted sm:text-[11px]">{coin.network}</p>
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isFiatFlow && (
                                                        <div className="rounded-[18px] bg-bg-elevated p-2.5 sm:rounded-[26px] sm:p-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <h3 className="text-[15px] font-semibold text-text-primary sm:text-xl">{depositMethodHeading}</h3>
                                                                    <p className="mt-0.5 text-[11px] text-text-secondary sm:mt-1 sm:text-sm">
                                                                        Select a gateway before continuing.
                                                                    </p>
                                                                </div>
                                                                <span className="shrink-0 rounded-full bg-bg-hover px-2.5 py-1 text-[10px] font-semibold text-text-secondary sm:px-3 sm:text-[11px]">
                                                                    {currentRouteLabel}
                                                                </span>
                                                            </div>

                                                            <div className="mt-2.5 rounded-[16px] bg-bg-base p-1.5 sm:mt-3 sm:rounded-[24px] sm:p-2.5">
                                                                <div className="space-y-1.5 sm:space-y-2">
                                                                    {gatewayOptions.map((gateway) => (
                                                                        <button
                                                                            key={gateway.id}
                                                                            onClick={() => {
                                                                                setSelectedMethod(gateway.id);
                                                                                setSelectedMethodError('');
                                                                                setAmountError('');
                                                                            }}
                                                                            className={`w-full rounded-[14px] border px-2.5 py-2 text-left transition-all sm:rounded-[20px] sm:px-3 sm:py-2.5 ${selectedMethod === gateway.id
                                                                                ? 'border-brand-gold/60 bg-brand-gold/10'
                                                                                : selectedMethodError
                                                                                    ? 'border-red-500/30 bg-red-500/8'
                                                                                    : 'border-white/[0.06] bg-bg-hover hover:border-brand-gold/30'
                                                                                }`}
                                                                        >
                                                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                                                <div className="flex min-w-0 items-center gap-3">
                                                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-card text-base text-text-primary sm:h-10 sm:w-10 sm:rounded-xl sm:text-lg">
                                                                                        {gateway.icon}
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                                            <p className="truncate text-[13px] font-semibold text-text-primary sm:text-base">{gateway.label}</p>
                                                                                            {recommendedGatewayId === gateway.id && (
                                                                                                <span className="rounded-full bg-brand-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-inverse">
                                                                                                    {gateway.badge || 'Recommend'}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-text-muted sm:mt-1 sm:text-[11px]">
                                                                                            <span>{gateway.sub}</span>
                                                                                            <span className="text-text-disabled">•</span>
                                                                                            <span>{gateway.id}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="shrink-0 text-left sm:text-right">
                                                                                    <p className="text-[13px] font-semibold text-text-primary sm:text-base">
                                                                                        {fiatSymbol}{formatAmount(gateway.minDeposit)}+
                                                                                    </p>
                                                                                    <p className="text-[10px] text-text-muted sm:text-xs">Minimum deposit</p>
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {selectedMethodError && (
                                                                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                                                                    <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />
                                                                    <span>{selectedMethodError}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="rounded-[18px] bg-bg-elevated p-2.5 sm:rounded-[26px] sm:p-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <h3 className="text-[15px] font-semibold text-text-primary sm:text-xl">{amountHeading}</h3>
                                                                <p className="mt-0.5 text-[11px] text-text-secondary sm:mt-1 sm:text-sm">
                                                                    {isFiatFlow
                                                                        ? 'Enter the amount you want to deposit.'
                                                                        : 'Enter the USD value you want to deposit.'}
                                                                </p>
                                                            </div>
                                                            <span className="shrink-0 rounded-full bg-bg-hover px-2.5 py-1 text-[10px] font-semibold text-text-secondary sm:px-3 sm:text-[11px]">
                                                                Min {currentMinimumLabel}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2.5 rounded-[16px] border border-white/[0.06] bg-bg-hover p-2.5 sm:mt-3 sm:rounded-[24px] sm:p-4">
                                                            <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                                                                {isFiatFlow ? 'Deposit Amount' : 'Amount In USD'}
                                                            </label>
                                                            <div className="mt-2.5 flex items-end gap-2.5 sm:mt-3 sm:gap-3">
                                                                <span className="text-xl font-semibold text-brand-gold sm:text-2xl">{isFiatFlow ? fiatSymbol : '$'}</span>
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    pattern="[0-9]*"
                                                                    value={amount}
                                                                    onChange={(e) => {
                                                                        const value = sanitizeAmountInput(e.target.value);
                                                                        setAmount(value);
                                                                        setMessage(null);
                                                                        const numericValue = parseFloat(value);
                                                                        if (isFiatFlow) {
                                                                            if (value && activeGatewayMinDeposit && numericValue < activeGatewayMinDeposit) {
                                                                                setAmountError(`Minimum deposit is ${fiatSymbol}${activeGatewayMinDeposit}`);
                                                                            } else {
                                                                                setAmountError('');
                                                                            }
                                                                        } else {
                                                                            if (value && numericValue < minDepositCrypto) {
                                                                                setCryptoAmountError(`Minimum crypto deposit is $${minDepositCrypto}`);
                                                                            } else {
                                                                                setCryptoAmountError('');
                                                                            }
                                                                        }
                                                                    }}
                                                                    placeholder="0"
                                                                    className="w-full bg-transparent text-[28px] font-semibold text-text-primary placeholder:text-text-disabled focus:outline-none sm:text-4xl"
                                                                />
                                                                {amount && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setAmount('');
                                                                            setAmountError('');
                                                                            setCryptoAmountError('');
                                                                        }}
                                                                        className="mb-0.5 rounded-full border border-white/[0.06] bg-bg-card p-1.5 text-text-muted transition-colors hover:bg-bg-base hover:text-text-primary sm:mb-1 sm:p-2"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                                                            {currentQuickAmounts.map((value) => (
                                                                <button
                                                                    key={value}
                                                                    onClick={() => {
                                                                        setAmount(value);
                                                                        setMessage(null);
                                                                        if (isFiatFlow) {
                                                                            if (activeGatewayMinDeposit && parseFloat(value) < activeGatewayMinDeposit) {
                                                                                setAmountError(`Minimum deposit is ${fiatSymbol}${activeGatewayMinDeposit}`);
                                                                            } else {
                                                                                setAmountError('');
                                                                            }
                                                                        } else {
                                                                            if (parseFloat(value) < minDepositCrypto) {
                                                                                setCryptoAmountError(`Minimum crypto deposit is $${minDepositCrypto}`);
                                                                            } else {
                                                                                setCryptoAmountError('');
                                                                            }
                                                                        }
                                                                    }}
                                                                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all sm:px-4 sm:py-2 sm:text-sm ${amount === value
                                                                        ? 'border-brand-gold bg-brand-gold text-text-inverse'
                                                                        : 'border-white/[0.06] bg-bg-hover text-text-secondary hover:border-brand-gold/30 hover:text-text-primary'
                                                                        }`}
                                                                >
                                                                    {isFiatFlow ? fiatSymbol : '$'}{value}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {currentAmountError && (
                                                            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                                                                <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />
                                                                <span>{currentAmountError}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {message && (
                                                        <div className={`flex items-start gap-2.5 rounded-[16px] border p-2.5 text-[11px] sm:rounded-[24px] sm:gap-3 sm:p-4 sm:text-sm ${message.type === 'error'
                                                            ? 'border-red-500/25 bg-red-500/10 text-red-200'
                                                            : 'border-brand-gold/25 bg-brand-gold/10 text-text-primary'
                                                            }`}>
                                                            {message.type === 'error'
                                                                ? <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                                                                : <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0" />}
                                                            <span>{message.text}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 border-t border-white/[0.06] bg-bg-card px-3 py-3 sm:px-6 sm:py-4">
                                            <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-text-primary">Deposit</p>
                                                    <p className={`mt-1 text-[11px] ${promoBlockingError || currentAmountError || selectedMethodError ? 'text-red-200' : 'text-text-secondary'}`}>
                                                        {currentSubmitHint}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={isFiatFlow
                                                        ? isForcedManualFlow
                                                            ? () => handleManualFallback(gatewayRetryState?.message, false)
                                                            : handleFiatSubmit
                                                        : handleGenerateCryptoAddress}
                                                    disabled={currentSubmitDisabled}
                                                    className="inline-flex w-full min-w-[180px] items-center justify-center gap-2 rounded-[18px] bg-gradient-gold px-6 py-3.5 text-sm font-semibold text-text-inverse shadow-glow-gold transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Processing…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowUpRight className="h-4 w-4" />
                                                            {isForcedManualFlow ? 'Continue to Manual UPI' : 'Deposit'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isFiatFlow && cryptoStep === 'awaiting' && paymentData && (
                                    <div className="flex min-h-0 flex-1 flex-col">
                                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                                            <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
                                                <div className="rounded-[32px] border border-white/[0.06] bg-bg-card p-5 text-center">
                                                    <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-gold">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        Awaiting Payment
                                                    </div>
                                                    <div className="mx-auto mt-5 inline-flex rounded-[28px] border border-white/[0.06] bg-white p-4 shadow-hard">
                                                        <QRCode value={paymentData.payAddress} size={168} bgColor="#FFFFFF" fgColor="#07111b" />
                                                    </div>
                                                    <p className="mt-4 text-sm font-semibold text-text-primary">Scan with your {selectedCoin.label} wallet</p>
                                                    <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                                                        Use the exact amount and network below. This address is unique to the current deposit session.
                                                    </p>
                                                    {timeLeft > 0 && (
                                                        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/10 px-4 py-2 text-sm font-semibold text-brand-gold">
                                                            <Clock className="h-4 w-4" />
                                                            {formatTime(timeLeft)} left
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="rounded-[32px] border border-white/[0.06] bg-bg-card p-5">
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                            <div>
                                                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-gold">Transfer Details</p>
                                                                <h3 className="mt-2 text-xl font-semibold text-text-primary">Send exactly this payment</h3>
                                                            </div>
                                                            <div className={`rounded-full border border-white/[0.06] bg-bg-hover px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${statusMap[paymentStatus]?.color || 'text-text-secondary'}`}>
                                                                {statusMap[paymentStatus]?.label || paymentStatus}
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                            <div className="rounded-[24px] border border-white/[0.06] bg-bg-elevated p-4">
                                                                <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted">Send Exactly</p>
                                                                <p className="mt-2 text-2xl font-semibold text-text-primary">
                                                                    {paymentData.payAmount} <span className="text-brand-gold">{paymentData.payCurrency}</span>
                                                                </p>
                                                                <p className="mt-1 text-xs text-text-secondary">Approx. ${amount} USD</p>
                                                            </div>
                                                            <div className="rounded-[24px] border border-white/[0.06] bg-bg-elevated p-4">
                                                                <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted">Network</p>
                                                                <p className="mt-2 text-2xl font-semibold text-text-primary">{selectedCoin.network}</p>
                                                                <p className="mt-1 text-xs text-text-secondary">{selectedCoin.label} route</p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4">
                                                            <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                                                                {selectedCoin.label} Address
                                                            </label>
                                                            <div className="relative mt-2">
                                                                <input
                                                                    readOnly
                                                                    value={paymentData.payAddress}
                                                                    className="w-full rounded-[22px] border border-white/[0.06] bg-bg-elevated py-3 pl-4 pr-12 text-xs font-mono text-text-primary focus:outline-none"
                                                                />
                                                                <button
                                                                    onClick={() => handleCopy(paymentData.payAddress)}
                                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                                                                >
                                                                    {copied ? <Check className="h-4 w-4 text-brand-gold" /> : <Copy className="h-4 w-4" />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 rounded-[22px] border border-brand-gold/25 bg-brand-gold/10 p-4 text-sm leading-relaxed text-text-primary">
                                                            Send <span className="font-semibold text-text-primary">{paymentData.payAmount} {paymentData.payCurrency}</span> only on <span className="font-semibold text-text-primary">{selectedCoin.network}</span>. Wrong network transfers cannot be recovered.
                                                        </div>
                                                    </div>

                                                    <div className="rounded-[30px] border border-white/[0.06] bg-bg-card p-5">
                                                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-gold">
                                                            <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
                                                            Live Monitoring
                                                        </div>
                                                        <p className="mt-3 text-sm text-text-secondary">
                                                            We check the network status every 12 seconds and auto-credit your balance when the payment is confirmed.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 border-t border-white/[0.06] bg-bg-card px-4 py-3 backdrop-blur-xl sm:px-6">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <button
                                                    onClick={() => { stopPolling(); stopTimer(); resetCryptoState(); }}
                                                    className="inline-flex items-center gap-2 rounded-[18px] border border-white/[0.06] bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                                                >
                                                    <ArrowLeft className="h-4 w-4" />
                                                    Back
                                                </button>
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-text-primary">{statusMap[paymentStatus]?.label || paymentStatus}</p>
                                                    <p className="mt-1 text-[11px] text-text-secondary">Waiting for confirmation on the network.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isFiatFlow && cryptoStep === 'success' && (
                                    <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
                                        <div className="w-full max-w-xl rounded-[36px] border border-brand-gold/25 bg-bg-card p-8 text-center shadow-hard">
                                            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-gold/10">
                                                <CheckCircle2 className="h-12 w-12 text-brand-gold" />
                                            </div>
                                            <h3 className="mt-6 text-3xl font-semibold text-text-primary">Deposit Confirmed</h3>
                                            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                                                Your crypto deposit of <span className="font-semibold text-text-primary">${amount} USD</span> has been credited and your balance is ready.
                                            </p>
                                            <button
                                                onClick={() => { resetCryptoState(); onClose(); }}
                                                className="mt-8 inline-flex items-center justify-center rounded-[20px] bg-gradient-gold px-8 py-3 text-sm font-semibold text-text-inverse shadow-glow-gold transition-all hover:opacity-95"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
