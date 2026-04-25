"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, AlertCircle, Mail, Lock, Loader2, ShieldCheck } from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import CountryCodeSelector, { Country, COUNTRIES } from "@/components/shared/CountryCodeSelector";

interface LoginModalProps {
    onClose?: () => void;
    onRegisterClick?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onRegisterClick }) => {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);

    // Login modes
    const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
    const [otpStep, setOtpStep] = useState<"form" | "verify">("form");

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');

    // Optional Country Code specifically for phone detection if users want to pick
    const [showCountryCode, setShowCountryCode] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES.find(c => c.iso === 'IN')!);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
    const [resendCooldown, setResendCooldown] = useState(0);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);
    const cooldownRef = useRef<NodeJS.Timeout | null>(null);
    const expiryRef = useRef<NodeJS.Timeout | null>(null);
    const { login } = useAuth();

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

    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            if (expiryRef.current) clearInterval(expiryRef.current);
        };
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
        if (/^\d+$/.test(val)) {
            setShowCountryCode(true);
        } else {
            setShowCountryCode(false);
        }
    };

    const validateForm = () => {
        const errs: { [key: string]: string } = {};
        if (!identifier.trim()) {
            errs.identifier = 'Email, Phone, or Username is required';
        }

        if (loginMode === 'password') {
            if (!password) {
                errs.password = 'Password is required';
            }
        }

        if (loginMode === 'otp' && otpStep === 'verify') {
            if (!otpCode || otpCode.length < 6) {
                errs.otpCode = 'Enter 6-digit OTP';
            }
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
            setFieldErrors({ identifier: 'Enter your Email or Phone Number to receive OTP' });
            return;
        }

        const isEmail = identifier.includes('@');

        setLoading(true);
        try {
            const resolvedIdentifier = getResolvedIdentifier();

            if (isEmail) {
                await api.post('/auth/send-email-otp', { email: resolvedIdentifier, purpose: 'LOGIN' });
            } else {
                const phonePayload = resolvedIdentifier.startsWith('+') ? resolvedIdentifier : `+${resolvedIdentifier}`;
                await api.post('/auth/send-otp', { phoneNumber: phonePayload, purpose: 'LOGIN' });
            }

            setOtpStep("verify");
            setOtpCode('');
            startCooldown();
            startExpiryTimer(isEmail ? 600 : 120);
            toast.success("OTP sent successfully");
        } catch (err: any) {
            const status = err.response?.status;
            const rawMsg = err.response?.data?.message;
            const msgStr = Array.isArray(rawMsg) ? rawMsg.join(', ') : (rawMsg || '');
            if (status === 429) setError('Too many attempts. Please wait and try again.');
            else if (msgStr) setError(msgStr);
            else setError('Failed to send OTP. Please check your details.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loginMode === 'otp' && otpStep === 'form') {
            handleSendOtp();
            return;
        }

        clearErrors();
        if (!validateForm()) return;
        setLoading(true);
        try {
            const resolvedIdentifier = getResolvedIdentifier();
            let res;

            if (loginMode === 'password') {
                res = await api.post('/auth/login', { identifier: resolvedIdentifier, password });
            } else {
                res = await api.post('/auth/login-otp', { identifier: resolvedIdentifier, code: otpCode });
            }

            login(res.data.access_token, res.data.user);
            toast.success('Logged in successfully!');
            if (onClose) onClose();
        } catch (err: any) {
            const status = err.response?.status;
            const rawMsg = err.response?.data?.message;
            const msgStr = Array.isArray(rawMsg) ? rawMsg.join(', ') : (rawMsg || '');
            const isBanned = msgStr.toLowerCase().includes('suspended') || status === 403;
            if (isBanned) setError('Your account has been suspended. Please contact support.');
            else if (status === 429) setError('Too many login attempts. Please wait and try again.');
            else if (msgStr) setError(msgStr);
            else setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
        >
            <div
                className="relative w-full sm:w-[440px] bg-[var(--bg-surface)] rounded-t-[22px] sm:rounded-[22px] border border-[var(--line-gold)] shadow-[var(--shadow-lift)] flex flex-col flex-shrink-0 overflow-hidden grain sm:min-h-[560px]"
                style={{ maxHeight: '92dvh' }}
            >
                {/* Atmospheric halo */}
                <div
                    className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[360px] h-[200px] rounded-full blur-[110px]"
                    style={{ background: "var(--gold-halo)" }}
                />

                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 grid place-items-center rounded-full bg-[var(--bg-inlay)] border border-[var(--line-default)] text-[var(--ink-faint)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] transition-colors"
                    aria-label="Close"
                >
                    <X size={15} />
                </button>

                {/* ── Non-scrolling header ── */}
                <div className="relative z-10 flex-shrink-0 px-6 pt-6 pb-0 sm:px-8 sm:pt-8">
                    {/* Mobile drag handle */}
                    <div className="sm:hidden w-10 h-1 bg-[var(--line-strong)] rounded-full mx-auto mb-5" />

                    {/* Logo */}
                    <div className="text-center mb-5">
                        <span className="font-display text-[28px] font-bold text-[var(--ink)] tracking-tight">
                            odd<span className="text-gold-grad">69</span>
                        </span>
                        <p className="t-eyebrow mt-1.5">Sports · Casino · Originals</p>
                    </div>

                    {/* Heading */}
                    <h2 className="t-section !text-[20px] mb-1">Welcome back</h2>
                    <p className="text-[12.5px] text-[var(--ink-dim)] mb-4">
                        New here?{' '}
                        <button
                            type="button"
                            onClick={onRegisterClick}
                            className="text-[var(--gold-bright)] font-semibold hover:underline"
                        >
                            Create an account
                        </button>
                    </p>

                    {/* Tab toggle */}
                    <div className="flex gap-1 p-1 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[12px]">
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
                </div>

                {/* ── Scrollable form body ── */}
                <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6 pb-2 sm:px-8">
                    <form onSubmit={handleLogin} className="flex flex-col gap-3 pt-4" noValidate>

                        {/* Identifier */}
                        <div className="flex flex-col gap-1">
                            <div className="flex gap-2 h-11">
                                {showCountryCode && (
                                    <div className="flex-shrink-0 h-11">
                                        <CountryCodeSelector
                                            value={selectedCountry}
                                            onChange={setSelectedCountry}
                                        />
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

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { if (onClose) onClose(); router.push('/forgot-password'); }}
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
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setOtpCode(digits);
                                        setError('');
                                        setFieldErrors(p => ({ ...p, otpCode: '' }));
                                    }}
                                    autoFocus
                                />
                                {fieldErrors.otpCode && (
                                    <p className="text-[var(--crimson)] text-[11.5px] flex items-center gap-1 ml-1 mt-1">
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
                    </form>
                </div>

                {/* ── Sticky footer ── */}
                <div className="relative z-10 flex-shrink-0 px-6 pb-6 pt-3 sm:px-8 border-t border-[var(--line-default)] bg-[var(--bg-surface)]">
                    <button
                        type="button"
                        onClick={handleLogin}
                        disabled={loading}
                        className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.08em] text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <><Loader2 size={14} className="animate-spin" /> Please wait…</>
                        ) : loginMode === 'otp' && otpStep === 'form' ? (
                            'Get OTP code'
                        ) : (
                            'Log in'
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default LoginModal;
