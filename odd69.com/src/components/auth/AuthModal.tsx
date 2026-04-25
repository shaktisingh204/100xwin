"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    X, Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, Sparkles,
    Smartphone, User, ChevronDown, Search, Globe, ShieldCheck, Gift, Check,
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import CountryCodeSelector, { Country, COUNTRIES } from "@/components/shared/CountryCodeSelector";
import { getCurrencySymbol } from "@/utils/currency";
import { getStoredUtm, clearStoredUtm } from "@/lib/utm";

/* ── Country → currency map (used only in registration) ──────────────── */
const COUNTRY_CURRENCY_MAP: Record<string, { currency: string; name: string; flag: string }> = {
    AF: { currency: 'AFN', name: 'Afghanistan', flag: '🇦🇫' }, AL: { currency: 'ALL', name: 'Albania', flag: '🇦🇱' }, DZ: { currency: 'DZD', name: 'Algeria', flag: '🇩🇿' },
    AD: { currency: 'EUR', name: 'Andorra', flag: '🇦🇩' }, AO: { currency: 'AOA', name: 'Angola', flag: '🇦🇴' }, AG: { currency: 'XCD', name: 'Antigua & Barbuda', flag: '🇦🇬' },
    AR: { currency: 'ARS', name: 'Argentina', flag: '🇦🇷' }, AM: { currency: 'AMD', name: 'Armenia', flag: '🇦🇲' }, AU: { currency: 'AUD', name: 'Australia', flag: '🇦🇺' },
    AT: { currency: 'EUR', name: 'Austria', flag: '🇦🇹' }, AZ: { currency: 'AZN', name: 'Azerbaijan', flag: '🇦🇿' }, BS: { currency: 'BSD', name: 'Bahamas', flag: '🇧🇸' },
    BH: { currency: 'BHD', name: 'Bahrain', flag: '🇧🇭' }, BD: { currency: 'BDT', name: 'Bangladesh', flag: '🇧🇩' }, BB: { currency: 'BBD', name: 'Barbados', flag: '🇧🇧' },
    BY: { currency: 'BYN', name: 'Belarus', flag: '🇧🇾' }, BE: { currency: 'EUR', name: 'Belgium', flag: '🇧🇪' }, BZ: { currency: 'BZD', name: 'Belize', flag: '🇧🇿' },
    BJ: { currency: 'XOF', name: 'Benin', flag: '🇧🇯' }, BT: { currency: 'BTN', name: 'Bhutan', flag: '🇧🇹' }, BO: { currency: 'BOB', name: 'Bolivia', flag: '🇧🇴' },
    BA: { currency: 'BAM', name: 'Bosnia & Herzegovina', flag: '🇧🇦' }, BW: { currency: 'BWP', name: 'Botswana', flag: '🇧🇼' }, BR: { currency: 'BRL', name: 'Brazil', flag: '🇧🇷' },
    BN: { currency: 'BND', name: 'Brunei', flag: '🇧🇳' }, BG: { currency: 'BGN', name: 'Bulgaria', flag: '🇧🇬' }, BF: { currency: 'XOF', name: 'Burkina Faso', flag: '🇧🇫' },
    BI: { currency: 'BIF', name: 'Burundi', flag: '🇧🇮' }, CV: { currency: 'CVE', name: 'Cabo Verde', flag: '🇨🇻' }, KH: { currency: 'KHR', name: 'Cambodia', flag: '🇰🇭' },
    CM: { currency: 'XAF', name: 'Cameroon', flag: '🇨🇲' }, CA: { currency: 'CAD', name: 'Canada', flag: '🇨🇦' }, CF: { currency: 'XAF', name: 'Central African Rep.', flag: '🇨🇫' },
    TD: { currency: 'XAF', name: 'Chad', flag: '🇹🇩' }, CL: { currency: 'CLP', name: 'Chile', flag: '🇨🇱' }, CN: { currency: 'CNY', name: 'China', flag: '🇨🇳' },
    CO: { currency: 'COP', name: 'Colombia', flag: '🇨🇴' }, KM: { currency: 'KMF', name: 'Comoros', flag: '🇰🇲' }, CD: { currency: 'CDF', name: 'Congo (DR)', flag: '🇨🇩' },
    CG: { currency: 'XAF', name: 'Congo (Rep.)', flag: '🇨🇬' }, CR: { currency: 'CRC', name: 'Costa Rica', flag: '🇨🇷' }, HR: { currency: 'EUR', name: 'Croatia', flag: '🇭🇷' },
    CU: { currency: 'CUP', name: 'Cuba', flag: '🇨🇺' }, CY: { currency: 'EUR', name: 'Cyprus', flag: '🇨🇾' }, CZ: { currency: 'CZK', name: 'Czech Republic', flag: '🇨🇿' },
    DK: { currency: 'DKK', name: 'Denmark', flag: '🇩🇰' }, DJ: { currency: 'DJF', name: 'Djibouti', flag: '🇩🇯' }, DM: { currency: 'XCD', name: 'Dominica', flag: '🇩🇲' },
    DO: { currency: 'DOP', name: 'Dominican Republic', flag: '🇩🇴' }, TL: { currency: 'USD', name: 'East Timor', flag: '🇹🇱' }, EC: { currency: 'USD', name: 'Ecuador', flag: '🇪🇨' },
    EG: { currency: 'EGP', name: 'Egypt', flag: '🇪🇬' }, SV: { currency: 'USD', name: 'El Salvador', flag: '🇸🇻' }, GQ: { currency: 'XAF', name: 'Equatorial Guinea', flag: '🇬🇶' },
    ER: { currency: 'ERN', name: 'Eritrea', flag: '🇪🇷' }, EE: { currency: 'EUR', name: 'Estonia', flag: '🇪🇪' }, SZ: { currency: 'SZL', name: 'Eswatini', flag: '🇸🇿' },
    ET: { currency: 'ETB', name: 'Ethiopia', flag: '🇪🇹' }, FJ: { currency: 'FJD', name: 'Fiji', flag: '🇫🇯' }, FI: { currency: 'EUR', name: 'Finland', flag: '🇫🇮' },
    FR: { currency: 'EUR', name: 'France', flag: '🇫🇷' }, GA: { currency: 'XAF', name: 'Gabon', flag: '🇬🇦' }, GM: { currency: 'GMD', name: 'Gambia', flag: '🇬🇲' },
    GE: { currency: 'GEL', name: 'Georgia', flag: '🇬🇪' }, DE: { currency: 'EUR', name: 'Germany', flag: '🇩🇪' }, GH: { currency: 'GHS', name: 'Ghana', flag: '🇬🇭' },
    GR: { currency: 'EUR', name: 'Greece', flag: '🇬🇷' }, GD: { currency: 'XCD', name: 'Grenada', flag: '🇬🇩' }, GT: { currency: 'GTQ', name: 'Guatemala', flag: '🇬🇹' },
    GN: { currency: 'GNF', name: 'Guinea', flag: '🇬🇳' }, GW: { currency: 'XOF', name: 'Guinea-Bissau', flag: '🇬🇼' }, GY: { currency: 'GYD', name: 'Guyana', flag: '🇬🇾' },
    HT: { currency: 'HTG', name: 'Haiti', flag: '🇭🇹' }, HN: { currency: 'HNL', name: 'Honduras', flag: '🇭🇳' }, HU: { currency: 'HUF', name: 'Hungary', flag: '🇭🇺' },
    IS: { currency: 'ISK', name: 'Iceland', flag: '🇮🇸' }, IN: { currency: 'INR', name: 'India', flag: '🇮🇳' }, ID: { currency: 'IDR', name: 'Indonesia', flag: '🇮🇩' },
    IR: { currency: 'IRR', name: 'Iran', flag: '🇮🇷' }, IQ: { currency: 'IQD', name: 'Iraq', flag: '🇮🇶' }, IE: { currency: 'EUR', name: 'Ireland', flag: '🇮🇪' },
    IL: { currency: 'ILS', name: 'Israel', flag: '🇮🇱' }, IT: { currency: 'EUR', name: 'Italy', flag: '🇮🇹' }, JM: { currency: 'JMD', name: 'Jamaica', flag: '🇯🇲' },
    JP: { currency: 'JPY', name: 'Japan', flag: '🇯🇵' }, JO: { currency: 'JOD', name: 'Jordan', flag: '🇯🇴' }, KZ: { currency: 'KZT', name: 'Kazakhstan', flag: '🇰🇿' },
    KE: { currency: 'KES', name: 'Kenya', flag: '🇰🇪' }, KI: { currency: 'AUD', name: 'Kiribati', flag: '🇰🇮' }, KW: { currency: 'KWD', name: 'Kuwait', flag: '🇰🇼' },
    KG: { currency: 'KGS', name: 'Kyrgyzstan', flag: '🇰🇬' }, LA: { currency: 'LAK', name: 'Laos', flag: '🇱🇦' }, LV: { currency: 'EUR', name: 'Latvia', flag: '🇱🇻' },
    LB: { currency: 'LBP', name: 'Lebanon', flag: '🇱🇧' }, LS: { currency: 'LSL', name: 'Lesotho', flag: '🇱🇸' }, LR: { currency: 'LRD', name: 'Liberia', flag: '🇱🇷' },
    LY: { currency: 'LYD', name: 'Libya', flag: '🇱🇾' }, LI: { currency: 'CHF', name: 'Liechtenstein', flag: '🇱🇮' }, LT: { currency: 'EUR', name: 'Lithuania', flag: '🇱🇹' },
    LU: { currency: 'EUR', name: 'Luxembourg', flag: '🇱🇺' }, MG: { currency: 'MGA', name: 'Madagascar', flag: '🇲🇬' }, MW: { currency: 'MWK', name: 'Malawi', flag: '🇲🇼' },
    MY: { currency: 'MYR', name: 'Malaysia', flag: '🇲🇾' }, MV: { currency: 'MVR', name: 'Maldives', flag: '🇲🇻' }, ML: { currency: 'XOF', name: 'Mali', flag: '🇲🇱' },
    MT: { currency: 'EUR', name: 'Malta', flag: '🇲🇹' }, MH: { currency: 'USD', name: 'Marshall Islands', flag: '🇲🇭' }, MR: { currency: 'MRU', name: 'Mauritania', flag: '🇲🇷' },
    MU: { currency: 'MUR', name: 'Mauritius', flag: '🇲🇺' }, MX: { currency: 'MXN', name: 'Mexico', flag: '🇲🇽' }, FM: { currency: 'USD', name: 'Micronesia', flag: '🇫🇲' },
    MD: { currency: 'MDL', name: 'Moldova', flag: '🇲🇩' }, MC: { currency: 'EUR', name: 'Monaco', flag: '🇲🇨' }, MN: { currency: 'MNT', name: 'Mongolia', flag: '🇲🇳' },
    ME: { currency: 'EUR', name: 'Montenegro', flag: '🇲🇪' }, MA: { currency: 'MAD', name: 'Morocco', flag: '🇲🇦' }, MZ: { currency: 'MZN', name: 'Mozambique', flag: '🇲🇿' },
    MM: { currency: 'MMK', name: 'Myanmar', flag: '🇲🇲' }, NA: { currency: 'NAD', name: 'Namibia', flag: '🇳🇦' }, NR: { currency: 'AUD', name: 'Nauru', flag: '🇳🇷' },
    NP: { currency: 'NPR', name: 'Nepal', flag: '🇳🇵' }, NL: { currency: 'EUR', name: 'Netherlands', flag: '🇳🇱' }, NZ: { currency: 'NZD', name: 'New Zealand', flag: '🇳🇿' },
    NI: { currency: 'NIO', name: 'Nicaragua', flag: '🇳🇮' }, NE: { currency: 'XOF', name: 'Niger', flag: '🇳🇪' }, NG: { currency: 'NGN', name: 'Nigeria', flag: '🇳🇬' },
    KP: { currency: 'KPW', name: 'North Korea', flag: '🇰🇵' }, MK: { currency: 'MKD', name: 'North Macedonia', flag: '🇲🇰' }, NO: { currency: 'NOK', name: 'Norway', flag: '🇳🇴' },
    OM: { currency: 'OMR', name: 'Oman', flag: '🇴🇲' }, PK: { currency: 'PKR', name: 'Pakistan', flag: '🇵🇰' }, PW: { currency: 'USD', name: 'Palau', flag: '🇵🇼' },
    PS: { currency: 'ILS', name: 'Palestine', flag: '🇵🇸' }, PA: { currency: 'PAB', name: 'Panama', flag: '🇵🇦' }, PG: { currency: 'PGK', name: 'Papua New Guinea', flag: '🇵🇬' },
    PY: { currency: 'PYG', name: 'Paraguay', flag: '🇵🇾' }, PE: { currency: 'PEN', name: 'Peru', flag: '🇵🇪' }, PH: { currency: 'PHP', name: 'Philippines', flag: '🇵🇭' },
    PL: { currency: 'PLN', name: 'Poland', flag: '🇵🇱' }, PT: { currency: 'EUR', name: 'Portugal', flag: '🇵🇹' }, QA: { currency: 'QAR', name: 'Qatar', flag: '🇶🇦' },
    RO: { currency: 'RON', name: 'Romania', flag: '🇷🇴' }, RU: { currency: 'RUB', name: 'Russia', flag: '🇷🇺' }, RW: { currency: 'RWF', name: 'Rwanda', flag: '🇷🇼' },
    KN: { currency: 'XCD', name: 'Saint Kitts & Nevis', flag: '🇰🇳' }, LC: { currency: 'XCD', name: 'Saint Lucia', flag: '🇱🇨' }, VC: { currency: 'XCD', name: 'Saint Vincent', flag: '🇻🇨' },
    WS: { currency: 'WST', name: 'Samoa', flag: '🇼🇸' }, SM: { currency: 'EUR', name: 'San Marino', flag: '🇸🇲' }, ST: { currency: 'STN', name: 'Sao Tome & Principe', flag: '🇸🇹' },
    SA: { currency: 'SAR', name: 'Saudi Arabia', flag: '🇸🇦' }, SN: { currency: 'XOF', name: 'Senegal', flag: '🇸🇳' }, RS: { currency: 'RSD', name: 'Serbia', flag: '🇷🇸' },
    SC: { currency: 'SCR', name: 'Seychelles', flag: '🇸🇨' }, SL: { currency: 'SLL', name: 'Sierra Leone', flag: '🇸🇱' }, SG: { currency: 'SGD', name: 'Singapore', flag: '🇸🇬' },
    SK: { currency: 'EUR', name: 'Slovakia', flag: '🇸🇰' }, SI: { currency: 'EUR', name: 'Slovenia', flag: '🇸🇮' }, SB: { currency: 'SBD', name: 'Solomon Islands', flag: '🇸🇧' },
    SO: { currency: 'SOS', name: 'Somalia', flag: '🇸🇴' }, ZA: { currency: 'ZAR', name: 'South Africa', flag: '🇿🇦' }, KR: { currency: 'KRW', name: 'South Korea', flag: '🇰🇷' },
    SS: { currency: 'SSP', name: 'South Sudan', flag: '🇸🇸' }, ES: { currency: 'EUR', name: 'Spain', flag: '🇪🇸' }, LK: { currency: 'LKR', name: 'Sri Lanka', flag: '🇱🇰' },
    SD: { currency: 'SDG', name: 'Sudan', flag: '🇸🇩' }, SR: { currency: 'SRD', name: 'Suriname', flag: '🇸🇷' }, SE: { currency: 'SEK', name: 'Sweden', flag: '🇸🇪' },
    CH: { currency: 'CHF', name: 'Switzerland', flag: '🇨🇭' }, SY: { currency: 'SYP', name: 'Syria', flag: '🇸🇾' }, TW: { currency: 'TWD', name: 'Taiwan', flag: '🇹🇼' },
    TJ: { currency: 'TJS', name: 'Tajikistan', flag: '🇹🇯' }, TZ: { currency: 'TZS', name: 'Tanzania', flag: '🇹🇿' }, TH: { currency: 'THB', name: 'Thailand', flag: '🇹🇭' },
    TG: { currency: 'XOF', name: 'Togo', flag: '🇹🇬' }, TO: { currency: 'TOP', name: 'Tonga', flag: '🇹🇴' }, TT: { currency: 'TTD', name: 'Trinidad & Tobago', flag: '🇹🇹' },
    TN: { currency: 'TND', name: 'Tunisia', flag: '🇹🇳' }, TR: { currency: 'TRY', name: 'Turkey', flag: '🇹🇷' }, TM: { currency: 'TMT', name: 'Turkmenistan', flag: '🇹🇲' },
    TV: { currency: 'AUD', name: 'Tuvalu', flag: '🇹🇻' }, UG: { currency: 'UGX', name: 'Uganda', flag: '🇺🇬' }, UA: { currency: 'UAH', name: 'Ukraine', flag: '🇺🇦' },
    AE: { currency: 'AED', name: 'United Arab Emirates', flag: '🇦🇪' }, GB: { currency: 'GBP', name: 'United Kingdom', flag: '🇬🇧' }, US: { currency: 'USD', name: 'United States', flag: '🇺🇸' },
    UY: { currency: 'UYU', name: 'Uruguay', flag: '🇺🇾' }, UZ: { currency: 'UZS', name: 'Uzbekistan', flag: '🇺🇿' }, VU: { currency: 'VUV', name: 'Vanuatu', flag: '🇻🇺' },
    VE: { currency: 'VES', name: 'Venezuela', flag: '🇻🇪' }, VN: { currency: 'VND', name: 'Vietnam', flag: '🇻🇳' }, YE: { currency: 'YER', name: 'Yemen', flag: '🇾🇪' },
    ZM: { currency: 'ZMW', name: 'Zambia', flag: '🇿🇲' }, ZW: { currency: 'USD', name: 'Zimbabwe', flag: '🇿🇼' },
};

const ALL_COUNTRIES = Object.entries(COUNTRY_CURRENCY_MAP)
    .map(([iso, v]) => ({ iso, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name));

/* ──────────────────────────────────────────────────────────────────────
   LOGIN FORM — password / OTP, identifier auto-detect, country code,
   send + verify OTP with cooldown & expiry, suspended/429 messaging.
   ────────────────────────────────────────────────────────────────────── */

function LoginForm({ onSwitchToRegister, onClose }: { onSwitchToRegister: () => void; onClose: () => void }) {
    const router = useRouter();
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
    const [otpStep, setOtpStep] = useState<"form" | "verify">("form");

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');

    const [showCountryCode, setShowCountryCode] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES.find(c => c.iso === 'IN')!);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [resendCooldown, setResendCooldown] = useState(0);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);

    const cooldownRef = useRef<NodeJS.Timeout | null>(null);
    const expiryRef = useRef<NodeJS.Timeout | null>(null);

    const startCooldown = useCallback(() => {
        setResendCooldown(60);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current!);
                    cooldownRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const startExpiryTimer = useCallback((seconds: number) => {
        setOtpExpiresIn(seconds);
        if (expiryRef.current) clearInterval(expiryRef.current);
        expiryRef.current = setInterval(() => {
            setOtpExpiresIn(prev => {
                if (prev <= 1) {
                    clearInterval(expiryRef.current!);
                    expiryRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    useEffect(() => () => {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        if (expiryRef.current) clearInterval(expiryRef.current);
    }, []);

    const clearErrors = () => { setError(''); setFieldErrors({}); };

    const handleModeChange = (mode: "password" | "otp") => {
        setLoginMode(mode);
        setOtpStep("form");
        clearErrors();
    };

    const handleIdentifierChange = (val: string) => {
        setIdentifier(val);
        clearErrors();
        setShowCountryCode(/^\d+$/.test(val));
    };

    const validateForm = () => {
        const errs: Record<string, string> = {};
        if (!identifier.trim()) errs.identifier = 'Email, phone, or username is required';
        if (loginMode === 'password' && !password) errs.password = 'Password is required';
        if (loginMode === 'otp' && otpStep === 'verify' && (!otpCode || otpCode.length < 6)) {
            errs.otpCode = 'Enter the 6-digit OTP';
        }
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const getResolvedIdentifier = () => {
        const raw = identifier.trim();
        if (showCountryCode && /^\d+$/.test(raw)) {
            return `${selectedCountry.code.replace(/-/g, '')}${raw}`;
        }
        return raw;
    };

    const handleSendOtp = async () => {
        clearErrors();
        if (!identifier.trim()) {
            setFieldErrors({ identifier: 'Enter your email or phone to receive an OTP' });
            return;
        }
        const isEmail = identifier.includes('@');
        setLoading(true);
        try {
            const resolved = getResolvedIdentifier();
            if (isEmail) {
                await api.post('/auth/send-email-otp', { email: resolved, purpose: 'LOGIN' });
            } else {
                const phonePayload = resolved.startsWith('+') ? resolved : `+${resolved}`;
                await api.post('/auth/send-otp', { phoneNumber: phonePayload, purpose: 'LOGIN' });
            }
            setOtpStep("verify");
            setOtpCode('');
            startCooldown();
            startExpiryTimer(isEmail ? 600 : 120);
            toast.success("OTP sent");
        } catch (err: any) {
            const status = err.response?.status;
            const raw = err.response?.data?.message;
            const msg = Array.isArray(raw) ? raw.join(', ') : (raw || '');
            if (status === 429) setError('Too many attempts. Please wait and try again.');
            else if (msg) setError(msg);
            else setError('Failed to send OTP. Please check your details.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loginMode === 'otp' && otpStep === 'form') { handleSendOtp(); return; }
        clearErrors();
        if (!validateForm()) return;
        setLoading(true);
        try {
            const resolved = getResolvedIdentifier();
            const res = loginMode === 'password'
                ? await api.post('/auth/login', { identifier: resolved, password })
                : await api.post('/auth/login-otp', { identifier: resolved, code: otpCode });

            login(res.data.access_token, res.data.user);
            toast.success('Logged in successfully!');
            onClose();
        } catch (err: any) {
            const status = err.response?.status;
            const raw = err.response?.data?.message;
            const msg = Array.isArray(raw) ? raw.join(', ') : (raw || '');
            const banned = msg.toLowerCase().includes('suspended') || status === 403;
            if (banned) setError('Your account has been suspended. Please contact support.');
            else if (status === 429) setError('Too many login attempts. Please wait and try again.');
            else if (msg) setError(msg);
            else setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Heading */}
            <div className="text-center mb-5">
                <h2 className="t-section !text-[20px] mb-1">Welcome back</h2>
                <p className="text-[12.5px] text-[var(--ink-dim)]">
                    New here?{' '}
                    <button type="button" onClick={onSwitchToRegister} className="text-[var(--gold-bright)] font-semibold hover:underline">
                        Create an account
                    </button>
                </p>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 p-1 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[12px] mb-4">
                {(["password", "otp"] as const).map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => handleModeChange(tab)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                            loginMode === tab
                                ? "bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[var(--line-gold)]"
                                : "text-[var(--ink-faint)] hover:text-[var(--ink-dim)]"
                        }`}
                    >
                        {tab === "password" ? <Lock size={12} /> : <Mail size={12} />}
                        {tab === "password" ? "Password" : "OTP"}
                    </button>
                ))}
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-3" noValidate>
                {/* Identifier */}
                <div className="flex flex-col gap-1">
                    <div className="flex gap-2 h-11">
                        {showCountryCode && (
                            <div className="flex-shrink-0 h-11">
                                <CountryCodeSelector value={selectedCountry} onChange={setSelectedCountry} />
                            </div>
                        )}
                        <div className="relative flex-1 h-11">
                            {!showCountryCode && (
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                            )}
                            <input
                                type="text"
                                placeholder="Email / Phone / Username"
                                autoComplete="username"
                                className={`w-full h-11 bg-[var(--bg-inlay)] border rounded-[10px] ${showCountryCode ? 'px-3.5' : 'pl-9 pr-3.5'} text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:outline-none transition-colors ${
                                    fieldErrors.identifier
                                        ? 'border-[var(--crimson)]'
                                        : 'border-[var(--line-default)] focus:border-[var(--line-gold)]'
                                }`}
                                value={identifier}
                                onChange={e => handleIdentifierChange(e.target.value)}
                                disabled={loginMode === 'otp' && otpStep === 'verify'}
                            />
                        </div>
                    </div>
                    {fieldErrors.identifier && (
                        <p className="text-[var(--crimson)] text-[11.5px] flex items-center gap-1 ml-1">
                            <AlertCircle size={11} /> {fieldErrors.identifier}
                        </p>
                    )}
                </div>

                {/* Password mode */}
                {loginMode === 'password' && (
                    <>
                        <div className="flex flex-col gap-1">
                            <div className="relative h-11">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    className={`w-full h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-10 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:outline-none transition-colors ${
                                        fieldErrors.password
                                            ? 'border-[var(--crimson)]'
                                            : 'border-[var(--line-default)] focus:border-[var(--line-gold)]'
                                    }`}
                                    value={password}
                                    onChange={e => {
                                        setPassword(e.target.value);
                                        setError('');
                                        setFieldErrors(p => ({ ...p, password: '' }));
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="text-[var(--crimson)] text-[11.5px] flex items-center gap-1 ml-1">
                                    <AlertCircle size={11} /> {fieldErrors.password}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end -mt-1">
                            <button
                                type="button"
                                onClick={() => { onClose(); router.push('/forgot-password'); }}
                                className="text-[11.5px] text-[var(--gold-bright)]/80 font-semibold hover:text-[var(--gold-bright)] transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </>
                )}

                {/* OTP verify */}
                {loginMode === 'otp' && otpStep === 'verify' && (
                    <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <ShieldCheck size={13} className="text-[var(--gold-bright)]" />
                            <label className="text-[11.5px] font-medium text-[var(--ink-dim)]">
                                Enter the 6-digit code we just sent
                            </label>
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            className={`w-full h-12 bg-[var(--bg-inlay)] border rounded-[10px] px-4 text-[var(--ink)] text-[20px] tracking-[0.45em] text-center font-bold num focus:outline-none transition-colors placeholder:text-[var(--ink-whisper)] placeholder:tracking-normal placeholder:font-normal ${
                                fieldErrors.otpCode
                                    ? 'border-[var(--crimson)]'
                                    : 'border-[var(--line-default)] focus:border-[var(--line-gold)]'
                            }`}
                            value={otpCode}
                            onChange={e => {
                                setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                setError('');
                                setFieldErrors(p => ({ ...p, otpCode: '' }));
                            }}
                            autoFocus
                        />
                        {fieldErrors.otpCode && (
                            <p className="text-[var(--crimson)] text-[11.5px] flex items-center gap-1 ml-1">
                                <AlertCircle size={11} /> {fieldErrors.otpCode}
                            </p>
                        )}
                        <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[11.5px] text-[var(--ink-faint)]">Didn&apos;t receive the code?</span>
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={resendCooldown > 0 || loading}
                                className={`text-[11.5px] font-semibold transition-colors ${
                                    resendCooldown > 0 || loading
                                        ? 'text-[var(--ink-whisper)] cursor-not-allowed'
                                        : 'text-[var(--gold-bright)] hover:text-[var(--gold)]'
                                }`}
                            >
                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                            </button>
                        </div>
                        {otpExpiresIn > 0 ? (
                            <p className={`text-center text-[11px] mt-1 num ${otpExpiresIn <= 30 ? 'text-[var(--crimson)]' : 'text-[var(--ink-faint)]'}`}>
                                OTP expires in {Math.floor(otpExpiresIn / 60)}:{String(otpExpiresIn % 60).padStart(2, '0')}
                            </p>
                        ) : (
                            <p className="text-center text-[11px] mt-1 text-[var(--crimson)] font-medium">
                                OTP expired — please resend
                            </p>
                        )}
                    </div>
                )}

                {/* Global error */}
                {error && (
                    <div className="flex items-start gap-2.5 bg-[var(--crimson-soft)] border border-[rgba(255,46,76,0.25)] rounded-[10px] px-4 py-3 mt-1">
                        <AlertCircle size={14} className="text-[var(--crimson)] shrink-0 mt-0.5" />
                        <p className="text-[var(--crimson)] text-[12.5px] font-medium leading-snug">{error}</p>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.08em] text-[12px] disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                >
                    {loading ? (
                        <><Loader2 size={14} className="animate-spin" /> Please wait…</>
                    ) : loginMode === 'otp' && otpStep === 'form' ? (
                        'Get OTP code'
                    ) : (
                        'Log in'
                    )}
                </button>
            </form>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────
   REGISTER FORM — country picker, phone/email, country code, username,
   password+confirm, bonus selector, promo, referral, terms, OTP step,
   UTM forwarding, post-signup bonus redemption.
   ────────────────────────────────────────────────────────────────────── */

function RegisterForm({ onSwitchToLogin, onClose }: { onSwitchToLogin: () => void; onClose: () => void }) {
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        currency: 'INR',
        promoCode: '',
    });
    const [referralCode, setReferralCode] = useState('');
    const [isPhone, setIsPhone] = useState(true);
    const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES.find(c => c.iso === 'IN')!);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(true);
    const [hasPromo, setHasPromo] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [registrationCountry, setRegistrationCountry] = useState<string | null>(null);
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    type RegStep = 'form' | 'verify_otp';
    const [regStep, setRegStep] = useState<RegStep>('form');
    const [otpCode, setOtpCode] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendLoading, setResendLoading] = useState(false);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);

    const [signupBonuses, setSignupBonuses] = useState<any[]>([]);
    const [selectedBonusCode, setSelectedBonusCode] = useState<string | null>(null);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    useEffect(() => {
        if (otpExpiresIn <= 0) return;
        const t = setTimeout(() => setOtpExpiresIn(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [otpExpiresIn]);

    useEffect(() => {
        const stored = localStorage.getItem('referralCode');
        if (stored) setReferralCode(stored.trim().toUpperCase());
        api.get('/bonus/signup-options')
            .then(res => setSignupBonuses(res.data || []))
            .catch(() => { });
    }, []);

    const handleResendOtp = async () => {
        setError('');
        setResendLoading(true);
        try {
            if (isPhone) {
                const fullPhone = `${selectedCountry.code.replace(/-/g, '')}${formData.phoneNumber.trim()}`;
                await api.post('/auth/send-otp', {
                    phoneNumber: fullPhone.startsWith('+') ? fullPhone : `+${fullPhone}`,
                    purpose: 'REGISTER',
                });
            } else {
                await api.post('/auth/send-email-otp', { email: formData.email.trim(), purpose: 'REGISTER' });
            }
            setResendCooldown(60);
            setOtpExpiresIn(isPhone ? 120 : 600);
            setOtpCode('');
            toast.success('OTP resent');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setError(typeof msg === 'string' ? msg : 'Failed to resend OTP. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleTabChange = (phone: boolean) => {
        setIsPhone(phone);
        setFieldErrors({});
        setError('');
    };

    const handleRegistrationCountrySelect = (iso: string) => {
        const info = COUNTRY_CURRENCY_MAP[iso];
        if (!info) return;
        setRegistrationCountry(iso);
        setFormData(prev => ({ ...prev, currency: info.currency }));
        const phoneCountry = COUNTRIES.find(c => c.iso === iso);
        if (phoneCountry) setSelectedCountry(phoneCountry);
        setShowCountryDropdown(false);
        setCountrySearch('');
        setFieldErrors(prev => ({ ...prev, registrationCountry: '' }));
    };

    const filteredCountries = ALL_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.iso.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.currency.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const validateForm = () => {
        const errs: Record<string, string> = {};

        if (!registrationCountry) errs.registrationCountry = 'Please select your country';

        if (isPhone) {
            const phone = formData.phoneNumber.trim().replace(/\s/g, '');
            if (!phone) errs.phoneNumber = 'Phone number is required';
            else if (!/^\d{10,15}$/.test(phone)) errs.phoneNumber = 'Enter a valid phone number (10–15 digits)';
        } else {
            const e = formData.email.trim();
            if (!e) errs.email = 'Email is required';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errs.email = 'Please enter a valid email address';
        }

        const u = formData.username.trim();
        if (u && !/^[a-zA-Z0-9_]{3,15}$/.test(u)) {
            errs.username = 'Username must be 3-15 chars (letters, numbers, underscores)';
        }

        if (!formData.password) errs.password = 'Password is required';
        else if (formData.password.length < 8) errs.password = 'Password must be at least 8 characters';
        else if (!/[A-Za-z]/.test(formData.password) || !/\d/.test(formData.password)) errs.password = 'Password must contain letters and numbers';

        if (!formData.confirmPassword) errs.confirmPassword = 'Please confirm your password';
        else if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';

        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        setError('');
        if (!validateForm()) return;
        if (!termsAccepted) { setError('Please accept the terms and conditions'); return; }

        if (regStep === 'form') {
            setLoading(true);
            try {
                if (isPhone) {
                    const fullPhone = `${selectedCountry.code.replace(/-/g, '')}${formData.phoneNumber.trim()}`;
                    await api.post('/auth/send-otp', {
                        phoneNumber: fullPhone.startsWith('+') ? fullPhone : `+${fullPhone}`,
                        purpose: 'REGISTER',
                    });
                } else {
                    await api.post('/auth/send-email-otp', { email: formData.email.trim(), purpose: 'REGISTER' });
                }
                setRegStep('verify_otp');
                setOtpCode('');
                setResendCooldown(60);
                setOtpExpiresIn(isPhone ? 120 : 600);
            } catch (err: any) {
                const msg = err.response?.data?.message;
                setError(typeof msg === 'string' ? msg : 'Failed to send OTP. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleVerifyOtpAndRegister = async () => {
        setError('');
        if (otpCode.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
        setOtpLoading(true);
        try {
            if (isPhone) {
                const fullPhone = `${selectedCountry.code.replace(/-/g, '')}${formData.phoneNumber.trim()}`;
                const phoneNumber = fullPhone.startsWith('+') ? fullPhone : `+${fullPhone}`;
                await api.post('/auth/verify-otp', { phoneNumber, code: otpCode, purpose: 'REGISTER' });
            } else {
                await api.post('/auth/verify-email-otp', { email: formData.email.trim(), code: otpCode, purpose: 'REGISTER' });
            }
            const utmData = getStoredUtm();
            const fullPhone = isPhone ? `${selectedCountry.code.replace(/-/g, '')}${formData.phoneNumber.trim()}` : '';
            const phoneNumber = fullPhone.startsWith('+') ? fullPhone : `+${fullPhone}`;
            const payload = {
                ...(isPhone ? { phoneNumber } : { email: formData.email.trim() }),
                password: formData.password,
                ...(formData.username.trim() ? { username: formData.username.trim() } : {}),
                currency: formData.currency || 'USD',
                country: registrationCountry,
                ...(formData.promoCode.trim() ? { promoCode: formData.promoCode.trim().toUpperCase() } : {}),
                ...(referralCode ? { referralCode } : {}),
                ...(utmData?.utm_source ? { utm_source: utmData.utm_source } : {}),
                ...(utmData?.utm_medium ? { utm_medium: utmData.utm_medium } : {}),
                ...(utmData?.utm_campaign ? { utm_campaign: utmData.utm_campaign } : {}),
                ...(utmData?.utm_content ? { utm_content: utmData.utm_content } : {}),
                ...(utmData?.utm_term ? { utm_term: utmData.utm_term } : {}),
                ...(utmData?.referrerUrl ? { referrerUrl: utmData.referrerUrl } : {}),
                ...(utmData?.landingPage ? { landingPage: utmData.landingPage } : {}),
            };
            const res = await api.post('/auth/signup', payload);
            login(res.data.access_token, res.data.user);

            if (selectedBonusCode) {
                const bonus = signupBonuses.find((b: any) => b.code === selectedBonusCode);
                if (bonus) {
                    const path = bonus.forFirstDepositOnly ? '/bonus/pending' : '/bonus/redeem-signup';
                    try {
                        await api.post(path, { bonusCode: selectedBonusCode }, { headers: { Authorization: `Bearer ${res.data.access_token}` } });
                    } catch { /* non-blocking */ }
                }
            }

            if (referralCode) localStorage.removeItem('referralCode');
            clearStoredUtm();
            toast.success('Registration successful! Welcome to Odd69.');
            onClose();
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('show-signup-deposit-prompt'));
            }, 500);
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setError(typeof msg === 'string' ? msg : 'Verification failed. Please try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Heading */}
            <div className="text-center mb-5">
                <h2 className="t-section !text-[20px] mb-1">
                    {regStep === 'verify_otp' ? 'Verify your account' : 'Create account'}
                </h2>
                <p className="text-[12.5px] text-[var(--ink-dim)]">
                    Already have one?{' '}
                    <button type="button" onClick={onSwitchToLogin} className="text-[var(--gold-bright)] font-semibold hover:underline">
                        Log in
                    </button>
                </p>
            </div>

            {regStep === 'verify_otp' ? (
                <div className="flex flex-col gap-5">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--gold-soft)] border border-[var(--line-gold)] grid place-items-center mx-auto mb-3 animate-pulse-gold">
                            <ShieldCheck size={26} className="text-[var(--gold-bright)]" />
                        </div>
                        <h4 className="t-section !text-[18px]">{isPhone ? 'Verify your number' : 'Verify your email'}</h4>
                        <p className="text-[12.5px] text-[var(--ink-dim)] mt-2">
                            Enter the 6-digit code we sent to{' '}
                            {isPhone ? (
                                <strong className="text-[var(--ink)] num">+{selectedCountry.code.replace(/-/g, '').replace('+', '')}{formData.phoneNumber}</strong>
                            ) : (
                                <strong className="text-[var(--ink)]">{formData.email}</strong>
                            )}
                        </p>
                    </div>

                    <div>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={otpCode}
                            onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                            autoFocus
                            className={`w-full h-14 bg-[var(--bg-inlay)] border rounded-[10px] px-4 text-[var(--ink)] text-[26px] font-bold tracking-[0.5em] text-center num focus:outline-none transition-colors placeholder:text-[var(--ink-whisper)] placeholder:tracking-[0.3em] placeholder:font-normal ${
                                error ? 'border-[var(--crimson)]' : 'border-[var(--line-default)] focus:border-[var(--line-gold)]'
                            }`}
                        />
                        {error && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 ml-1 flex items-center gap-1">
                                <AlertCircle size={11} />{error}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleVerifyOtpAndRegister}
                        disabled={otpLoading || otpCode.length !== 6}
                        className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.08em] text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {otpLoading ? <><Loader2 size={14} className="animate-spin" />Verifying &amp; creating…</> : 'Verify & create account'}
                    </button>

                    <div className="flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => { setRegStep('form'); setOtpCode(''); setError(''); setResendCooldown(0); }}
                            className="text-[11.5px] text-[var(--ink-faint)] hover:text-[var(--gold-bright)] transition-colors"
                        >
                            ← Edit {isPhone ? 'number' : 'email'}
                        </button>
                        <span className="text-[var(--line-strong)]">|</span>
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendCooldown > 0 || resendLoading}
                            className={`text-[11.5px] transition-colors ${
                                resendCooldown > 0 || resendLoading
                                    ? 'text-[var(--ink-whisper)] cursor-not-allowed'
                                    : 'text-[var(--ink-faint)] hover:text-[var(--gold-bright)]'
                            }`}
                        >
                            {resendLoading ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                        </button>
                    </div>

                    {otpExpiresIn > 0 ? (
                        <p className={`text-center text-[11px] -mt-2 num ${otpExpiresIn <= 30 ? 'text-[var(--crimson)]' : 'text-[var(--ink-faint)]'}`}>
                            OTP expires in {Math.floor(otpExpiresIn / 60)}:{String(otpExpiresIn % 60).padStart(2, '0')}
                        </p>
                    ) : (
                        <p className="text-center text-[11px] -mt-2 text-[var(--crimson)] font-medium">OTP expired — please resend</p>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3.5">
                    {/* Country */}
                    <div>
                        <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">
                            Country <span className="text-[var(--crimson)]">*</span>
                        </span>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => { setShowCountryDropdown(!showCountryDropdown); setCountrySearch(''); }}
                                className={`w-full h-11 bg-[var(--bg-inlay)] border rounded-[10px] px-3.5 flex items-center gap-3 text-left transition-colors ${
                                    fieldErrors.registrationCountry
                                        ? 'border-[var(--crimson)]'
                                        : registrationCountry
                                            ? 'border-[var(--line-default)] hover:border-[var(--line-gold)]'
                                            : 'border-dashed border-[var(--line-gold)] hover:border-[var(--gold-bright)]'
                                }`}
                            >
                                <Globe size={15} className="text-[var(--ink-faint)] shrink-0" />
                                {registrationCountry ? (
                                    <>
                                        <span className="text-base leading-none">{COUNTRY_CURRENCY_MAP[registrationCountry]?.flag}</span>
                                        <span className="flex-1 font-semibold text-[var(--ink)] text-[13px]">{COUNTRY_CURRENCY_MAP[registrationCountry]?.name}</span>
                                        <span className="text-[11px] text-[var(--ink-faint)] num">{COUNTRY_CURRENCY_MAP[registrationCountry]?.currency}</span>
                                    </>
                                ) : (
                                    <span className="flex-1 text-[var(--ink-faint)] text-[13px]">Select your country</span>
                                )}
                                <ChevronDown size={13} className={`text-[var(--ink-faint)] transition-transform shrink-0 ${showCountryDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showCountryDropdown && (
                                <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-[var(--bg-elevated)] border border-[var(--line-strong)] rounded-[12px] shadow-[var(--shadow-lift)] overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--line-default)]">
                                        <Search size={13} className="text-[var(--ink-faint)] shrink-0" />
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Search country or currency…"
                                            className="flex-1 bg-transparent text-[var(--ink)] text-[13px] outline-none placeholder:text-[var(--ink-whisper)]"
                                            value={countrySearch}
                                            onChange={(e) => setCountrySearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {filteredCountries.length === 0 ? (
                                            <div className="px-4 py-3 text-[var(--ink-faint)] text-[13px] text-center">No results</div>
                                        ) : filteredCountries.map((c) => (
                                            <button
                                                key={c.iso}
                                                type="button"
                                                onClick={() => handleRegistrationCountrySelect(c.iso)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-left transition-colors hover:bg-[var(--bg-inlay)] ${
                                                    registrationCountry === c.iso ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)]' : 'text-[var(--ink)]'
                                                }`}
                                            >
                                                <span className="text-base leading-none">{c.flag}</span>
                                                <span className="flex-1 truncate">{c.name}</span>
                                                <span className="text-[var(--ink-faint)] num text-[11px] shrink-0">{c.currency}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {fieldErrors.registrationCountry && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 ml-1 flex items-center gap-1">
                                <AlertCircle size={11} /> {fieldErrors.registrationCountry}
                            </p>
                        )}
                    </div>

                    {/* Phone / Email tabs */}
                    <div className="flex gap-1 p-1 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[12px]">
                        <button
                            type="button"
                            onClick={() => handleTabChange(true)}
                            className={`flex-1 py-2.5 rounded-[10px] flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                                isPhone
                                    ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[var(--line-gold)]'
                                    : 'text-[var(--ink-faint)] hover:text-[var(--ink-dim)]'
                            }`}
                        >
                            <Smartphone size={13} /> Phone
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange(false)}
                            className={`flex-1 py-2.5 rounded-[10px] flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                                !isPhone
                                    ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[var(--line-gold)]'
                                    : 'text-[var(--ink-faint)] hover:text-[var(--ink-dim)]'
                            }`}
                        >
                            <Mail size={13} /> Email
                        </button>
                    </div>

                    {/* Phone / Email field */}
                    <div>
                        {isPhone ? (
                            <div className="flex gap-2">
                                <CountryCodeSelector value={selectedCountry} onChange={setSelectedCountry} />
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="Phone number"
                                    autoFocus
                                    className={`flex-1 h-11 bg-[var(--bg-inlay)] border rounded-[10px] px-3.5 text-[var(--ink)] text-[13.5px] focus:outline-none transition-colors placeholder:text-[var(--ink-whisper)] num ${
                                        fieldErrors.phoneNumber
                                            ? 'border-[var(--crimson)]'
                                            : 'border-[var(--line-default)] focus:border-[var(--line-gold)]'
                                    }`}
                                    value={formData.phoneNumber}
                                    onChange={(e) => {
                                        setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') });
                                        setFieldErrors(prev => ({ ...prev, phoneNumber: '' }));
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    autoFocus
                                    autoComplete="email"
                                    className={`w-full h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-3.5 text-[var(--ink)] text-[13.5px] focus:outline-none transition-colors placeholder:text-[var(--ink-whisper)] ${
                                        fieldErrors.email
                                            ? 'border-[var(--crimson)]'
                                            : 'border-[var(--line-default)] focus:border-[var(--line-gold)]'
                                    }`}
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value });
                                        setFieldErrors(prev => ({ ...prev, email: '' }));
                                    }}
                                />
                            </div>
                        )}
                        {fieldErrors.phoneNumber && isPhone && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 ml-1 flex items-center gap-1">
                                <AlertCircle size={11} /> {fieldErrors.phoneNumber}
                            </p>
                        )}
                        {fieldErrors.email && !isPhone && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 ml-1 flex items-center gap-1">
                                <AlertCircle size={11} /> {fieldErrors.email}
                            </p>
                        )}
                    </div>

                    {/* Username (optional) */}
                    <div>
                        <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Username (optional)"
                                autoComplete="username"
                                className={`w-full h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-3.5 text-[var(--ink)] text-[13.5px] focus:outline-none transition-colors placeholder:text-[var(--ink-whisper)] ${
                                    fieldErrors.username
                                        ? 'border-[var(--crimson)]'
                                        : 'border-[var(--line-default)] focus:border-[var(--line-gold)]'
                                }`}
                                value={formData.username}
                                onChange={(e) => {
                                    setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') });
                                    setFieldErrors(prev => ({ ...prev, username: '' }));
                                }}
                            />
                        </div>
                        {fieldErrors.username && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 ml-1 flex items-center gap-1">
                                <AlertCircle size={11} /> {fieldErrors.username}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password (min. 8 characters)"
                                autoComplete="new-password"
                                className={`w-full h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-10 text-[var(--ink)] text-[13.5px] focus:outline-none transition-colors placeholder:text-[var(--ink-whisper)] ${
                                    fieldErrors.password
                                        ? 'border-[var(--crimson)]'
                                        : 'border-[var(--line-default)] focus:border-[var(--line-gold)]'
                                }`}
                                value={formData.password}
                                onChange={(e) => {
                                    setFormData({ ...formData, password: e.target.value });
                                    setFieldErrors(prev => ({ ...prev, password: '' }));
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        {fieldErrors.password && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 ml-1 flex items-center gap-1">
                                <AlertCircle size={11} /> {fieldErrors.password}
                            </p>
                        )}
                    </div>

                    {/* Confirm password */}
                    <div>
                        <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm password"
                                autoComplete="new-password"
                                className={`w-full h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-10 text-[var(--ink)] text-[13.5px] focus:outline-none transition-colors placeholder:text-[var(--ink-whisper)] ${
                                    fieldErrors.confirmPassword
                                        ? 'border-[var(--crimson)]'
                                        : 'border-[var(--line-default)] focus:border-[var(--line-gold)]'
                                }`}
                                value={formData.confirmPassword}
                                onChange={(e) => {
                                    setFormData({ ...formData, confirmPassword: e.target.value });
                                    setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 ml-1 flex items-center gap-1">
                                <AlertCircle size={11} /> {fieldErrors.confirmPassword}
                            </p>
                        )}
                    </div>

                    {/* Welcome bonus selector */}
                    {signupBonuses.length > 0 && (
                        <div className="mt-1">
                            <label className="flex items-center gap-2 text-[12px] font-bold text-[var(--ink)] mb-2 uppercase tracking-[0.08em]">
                                <Gift size={13} className="text-[var(--gold-bright)]" />
                                Welcome bonus
                            </label>
                            <div className="grid gap-2">
                                {[null, ...signupBonuses].map((bonus: any) => {
                                    const isNone = bonus === null;
                                    const isSelected = isNone ? selectedBonusCode === null : selectedBonusCode === bonus.code;
                                    return (
                                        <button
                                            key={isNone ? 'none' : bonus.code}
                                            type="button"
                                            onClick={() => setSelectedBonusCode(isNone ? null : bonus.code)}
                                            className={`w-full flex items-center gap-3 rounded-[10px] px-3.5 py-3 border transition-all text-left ${
                                                isSelected
                                                    ? 'border-[var(--line-gold)] bg-[var(--gold-soft)]'
                                                    : 'border-[var(--line-default)] bg-[var(--bg-inlay)] hover:border-[var(--line-strong)]'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                                isSelected ? 'border-[var(--gold-bright)]' : 'border-[var(--line-strong)]'
                                            }`}>
                                                {isSelected && <div className="w-2 h-2 rounded-full bg-[var(--gold-bright)]" />}
                                            </div>

                                            {isNone ? (
                                                <span className="text-[12.5px] text-[var(--ink-dim)] font-medium">No bonus — I&apos;ll decide later</span>
                                            ) : (
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[13px] font-bold text-[var(--ink)]">{bonus.title}</span>
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-[0.1em] ${
                                                            bonus.forFirstDepositOnly
                                                                ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)]'
                                                                : 'bg-[var(--emerald-soft)] text-[var(--emerald)]'
                                                        }`}>
                                                            {bonus.forFirstDepositOnly ? 'On deposit' : 'Instant'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11.5px] text-[var(--ink-faint)] mt-0.5 leading-relaxed">
                                                        {(() => {
                                                            const sym = getCurrencySymbol(COUNTRY_CURRENCY_MAP[registrationCountry || 'IN']?.currency || 'INR');
                                                            const fiatMin = bonus.minDepositFiat ?? bonus.minDeposit ?? 0;
                                                            const cryptoMin = bonus.minDepositCrypto ?? bonus.minDeposit ?? 0;
                                                            const minLabel = bonus.currency === 'CRYPTO'
                                                                ? (cryptoMin > 0 ? ` (min $${cryptoMin})` : '')
                                                                : bonus.currency === 'BOTH'
                                                                    ? ((fiatMin > 0 || cryptoMin > 0)
                                                                        ? ` (min ${fiatMin > 0 ? `${sym}${fiatMin} fiat` : 'no fiat min'} / ${cryptoMin > 0 ? `$${cryptoMin} crypto` : 'no crypto min'})`
                                                                        : '')
                                                                    : (fiatMin > 0 ? ` (min ${sym}${fiatMin})` : '');
                                                            return bonus.percentage > 0
                                                                ? `${bonus.percentage}% match${bonus.maxBonus > 0 ? ` up to ${sym}${bonus.maxBonus}` : ''}${minLabel}`
                                                                : `${sym}${bonus.amount} bonus`;
                                                        })()} &bull; <span className="num">{bonus.wageringRequirement}x</span> wagering
                                                    </div>
                                                </div>
                                            )}

                                            {isSelected && !isNone && (
                                                <Sparkles size={14} className="text-[var(--gold-bright)] shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Promo toggle */}
                    <button
                        type="button"
                        onClick={() => setHasPromo(!hasPromo)}
                        className={`w-full h-11 border rounded-[10px] px-4 flex items-center justify-center font-semibold text-[12px] uppercase tracking-[0.08em] transition-all ${
                            hasPromo
                                ? 'border-[var(--line-gold)] text-[var(--gold-bright)] bg-[var(--gold-soft)]'
                                : 'border-[var(--line-default)] text-[var(--ink-faint)] hover:text-[var(--ink)] bg-[var(--bg-inlay)] hover:border-[var(--line-strong)]'
                        }`}
                    >
                        {hasPromo ? '✓ Promo code' : '+ Promo code'}
                    </button>

                    {/* Referral code chip */}
                    {referralCode && (
                        <div className="flex items-center gap-2 bg-[var(--emerald-soft)] border border-[rgba(0,216,123,0.25)] rounded-[10px] px-3 py-2 text-[11.5px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-pulse" />
                            <span className="text-[var(--emerald)] font-medium">Referral code applied:</span>
                            <span className="text-[var(--ink)] num font-bold tracking-widest">{referralCode}</span>
                            <button
                                type="button"
                                onClick={() => { setReferralCode(''); localStorage.removeItem('referralCode'); }}
                                className="ml-auto text-[var(--ink-faint)] hover:text-[var(--crimson)] transition-colors"
                                title="Remove referral"
                                aria-label="Remove referral"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Promo code input */}
                    {hasPromo && (
                        <input
                            type="text"
                            placeholder="Enter promo code"
                            className="w-full h-11 bg-[var(--bg-inlay)] border-2 border-dashed border-[var(--line-gold)] rounded-[10px] px-3.5 text-[var(--gold-bright)] text-[13.5px] focus:outline-none focus:border-[var(--gold-bright)] transition-colors placeholder:text-[rgba(255,204,51,0.35)] font-bold uppercase tracking-[0.12em]"
                            value={formData.promoCode}
                            onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                        />
                    )}

                    {/* Terms */}
                    <label className="flex items-start gap-3 cursor-pointer group mt-1">
                        <div
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors mt-0.5 shrink-0 ${
                                termsAccepted
                                    ? 'bg-[var(--emerald)] border-[var(--emerald)]'
                                    : 'border-[var(--line-strong)] bg-transparent'
                            }`}
                        >
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                            />
                            {termsAccepted && <Check size={13} className="text-[#0a0b0f] stroke-[3px]" />}
                        </div>
                        <span className="text-[11.5px] text-[var(--ink-faint)] leading-snug group-hover:text-[var(--ink-dim)] transition-colors">
                            I confirm all the{' '}
                            <Link href="/legal/terms" onClick={onClose} className="text-[var(--ink)] font-semibold underline decoration-dotted">
                                Terms of user agreement
                            </Link>{' '}
                            and that I am over 18 years of age.
                        </span>
                    </label>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2.5 bg-[var(--crimson-soft)] border border-[rgba(255,46,76,0.25)] rounded-[10px] px-4 py-3">
                            <AlertCircle size={14} className="text-[var(--crimson)] shrink-0 mt-0.5" />
                            <p className="text-[var(--crimson)] text-[12.5px] font-medium leading-snug">{error}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !termsAccepted}
                        className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.08em] text-[12px] disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                    >
                        {loading ? (
                            <><Loader2 size={14} className="animate-spin" />Sending OTP…</>
                        ) : 'Continue with OTP →'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─────────────────── MODAL SHELL ─────────────────── */
export default function AuthModal() {
    const { isLoginOpen, isRegisterOpen, closeLogin, closeRegister, openLogin, openRegister } = useModal();
    const isOpen = isLoginOpen || isRegisterOpen;

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { closeLogin(); closeRegister(); }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, closeLogin, closeRegister]);

    if (!isOpen) return null;

    const handleClose = () => { closeLogin(); closeRegister(); };
    const toLogin = () => { closeRegister(); openLogin(); };
    const toRegister = () => { closeLogin(); openRegister(); };

    return (
        <div
            className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className={`relative w-full ${isRegisterOpen ? 'sm:max-w-[480px]' : 'sm:max-w-[440px]'} bg-[var(--bg-surface)] rounded-t-[22px] sm:rounded-[22px] border border-[var(--line-gold)] shadow-[var(--shadow-lift)] overflow-hidden grain`}
                style={{ maxHeight: '92dvh' }}
            >
                {/* Atmospheric halo */}
                <div
                    className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[360px] h-[200px] rounded-full blur-[110px]"
                    style={{ background: "var(--gold-halo)" }}
                />

                {/* Close */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 grid place-items-center rounded-full bg-[var(--bg-inlay)] border border-[var(--line-default)] text-[var(--ink-faint)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] transition-colors"
                    aria-label="Close"
                >
                    <X size={15} />
                </button>

                {/* Logo */}
                <div className="relative z-10 pt-6 pb-2 sm:pt-8 px-6 sm:px-8 flex justify-center">
                    {/* Mobile drag handle */}
                    <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-[var(--line-strong)] rounded-full" />
                    <div className="text-center mt-2 sm:mt-0">
                        <span className="font-display text-[28px] font-bold text-[var(--ink)] tracking-tight">
                            odd<span className="text-gold-grad">69</span>
                        </span>
                        <p className="t-eyebrow mt-1.5">Sports · Casino · Originals</p>
                    </div>
                </div>

                {/* Body */}
                <div
                    className="relative z-10 px-6 sm:px-8 pb-6 sm:pb-8 pt-2 overflow-y-auto"
                    style={{ maxHeight: 'calc(92dvh - 110px)', scrollbarWidth: "thin" }}
                >
                    {isLoginOpen ? (
                        <LoginForm onSwitchToRegister={toRegister} onClose={handleClose} />
                    ) : (
                        <RegisterForm onSwitchToLogin={toLogin} onClose={handleClose} />
                    )}
                </div>
            </div>
        </div>
    );
}
