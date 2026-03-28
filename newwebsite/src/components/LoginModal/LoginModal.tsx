"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { X, Eye, EyeOff, PlayCircle, AlertCircle, Mail, Lock, Phone } from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import CountryCodeSelector, { Country, COUNTRIES } from "@/components/shared/CountryCodeSelector";

interface LoginModalProps {
    onClose?: () => void;
    onRegisterClick?: () => void;
}

// Dial codes sorted longest-first so "+1-242" matches before "+1"
const SORTED_DIAL_CODES = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

function detectCountryFromPhone(digits: string): Country | null {
    if (!digits) return null;
    for (const c of SORTED_DIAL_CODES) {
        const bare = c.code.replace(/-/g, ''); // e.g. "+1242"
        if ((`+${digits}`).startsWith(bare)) return c;
    }
    return null;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onRegisterClick }) => {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
    const [identifier, setIdentifier] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES.find(c => c.iso === 'IN')!);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
    const { login } = useAuth();

    const clearErrors = () => {
        setError('');
        setFieldErrors({});
    };

    const handleTabChange = (tab: "email" | "phone") => {
        setActiveTab(tab);
        setIdentifier('');
        clearErrors();
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!identifier.trim()) {
            newErrors.identifier = activeTab === 'email' ? 'Email is required' : 'Phone number is required';
        } else if (activeTab === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
            newErrors.identifier = 'Please enter a valid email address';
        } else if (activeTab === 'phone' && !/^\d{10,15}$/.test(identifier.trim().replace(/\s/g, ''))) {
            newErrors.identifier = 'Please enter a valid phone number (10–15 digits)';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setFieldErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();

        if (!validateForm()) return;

        setLoading(true);
        try {
            // For phone tab: prepend the dial code to match the stored E.164 format
            const resolvedIdentifier = activeTab === 'phone'
                ? `${selectedCountry.code.replace(/-/g, '')}${identifier.trim()}`
                : identifier.trim();

            const res = await api.post('/auth/login', {
                identifier: resolvedIdentifier,
                password
            });
            login(res.data.access_token, res.data.user);
            toast.success('Logged in successfully!');
            if (onClose) onClose();
        } catch (err: any) {
            const status = err.response?.status;
            const rawMsg = err.response?.data?.message;
            let msg: string;

            // Detect banned user — backend returns 401 with specific message
            const msgStr = Array.isArray(rawMsg) ? rawMsg.join(', ') : (rawMsg || '');
            const isBanned = msgStr.toLowerCase().includes('suspended') || status === 403;

            if (isBanned) {
                msg = 'Your account has been suspended. Please contact support for assistance.';
            } else if (status === 429) {
                msg = 'Too many login attempts. Please wait a moment and try again.';
            } else if (rawMsg) {
                msg = msgStr;
            } else {
                msg = 'Something went wrong. Please try again.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            <div className="relative w-full md:max-w-[860px] bg-auth-base rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-divider max-h-[92vh] overflow-y-auto">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-bg-elevated hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
                >
                    <X size={18} />
                </button>

                {/* Left Column: Banner */}
                <div className="hidden md:flex flex-1 relative items-center justify-center p-10 overflow-hidden min-h-[560px]">
                    <div className="absolute inset-0 z-0 opacity-35">
                        <Image
                            src="/assets/images/arjun_banner.png"
                            alt="Banner"
                            fill
                            className="object-cover grayscale"
                            priority
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                    </div>
                    <div className="absolute inset-0 z-10 bg-gradient-to-br from-bg-base via-bg-base/85 to-transparent" />

                    <div className="relative z-20 text-center text-text-primary flex flex-col items-center gap-4">
                        <div className="text-5xl font-extrabold italic tracking-tight">
                            <span className="text-brand-gold">Ze</span>ero
                        </div>
                        <h2 className="font-poppins text-4xl font-bold leading-tight">
                            WELCOME <br /> <span className="text-brand-gold">BACK!</span>
                        </h2>
                        <p className="text-sm text-text-muted max-w-[200px] leading-relaxed">
                            Sign in to the best innovative sportsbook &amp; casino
                        </p>
                    </div>
                </div>

                {/* Right Column: Login Form */}
                <div className="flex-1 bg-auth-base p-8 md:p-12 flex flex-col justify-center">

                    {/* Mobile logo */}
                    <div className="md:hidden text-center mb-6">
                        <span className="text-3xl font-extrabold italic">
                            <span className="text-brand-gold">Ze</span>ero
                        </span>
                    </div>

                    <h3 className="font-poppins text-text-primary text-2xl font-extrabold uppercase tracking-wide mb-1">
                        Log In
                    </h3>
                    <p className="text-[13px] text-text-secondary font-medium mb-6">
                        New user?{" "}
                        <button
                            onClick={onRegisterClick}
                            className="text-brand-gold font-bold cursor-pointer hover:underline ml-1"
                        >
                            Create an account
                        </button>
                    </p>

                    {/* Tabs */}
                    <div className="flex bg-bg-elevated border border-divider rounded-xl p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => handleTabChange("email")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === "email"
                                ? "bg-auth-action text-text-inverse shadow-sm"
                                : "text-text-muted hover:text-text-primary"
                                }`}
                        >
                            <Mail size={15} /> Email
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange("phone")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === "phone"
                                ? "bg-auth-action text-text-inverse shadow-sm"
                                : "text-text-muted hover:text-text-primary"
                                }`}
                        >
                            <Phone size={15} /> Phone
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">

                        {/* Identifier Field */}
                        <div>
                            <div className="relative">
                                {activeTab === 'email' && (
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                )}
                                {activeTab === 'phone' ? (
                                    <div className="flex gap-2">
                                        <CountryCodeSelector
                                            value={selectedCountry}
                                            onChange={setSelectedCountry}
                                        />
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            placeholder="Phone number"
                                            autoComplete="tel"
                                            className={`flex-1 h-[50px] bg-bg-elevated border rounded-xl px-4 text-text-primary text-[15px] font-medium outline-none transition-all focus:ring-[1.5px] placeholder:text-text-muted ${fieldErrors.identifier
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                                : 'border-divider focus:border-brand-gold focus:ring-brand-gold/40'
                                                }`}
                                            value={identifier}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '');
                                                setIdentifier(digits);
                                                setError('');
                                                setFieldErrors(prev => ({ ...prev, identifier: '' }));
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        autoComplete="email"
                                        className={`w-full h-[52px] bg-bg-elevated border rounded-xl pl-11 pr-4 text-text-primary text-[15px] font-medium outline-none transition-all focus:ring-[1.5px] placeholder:text-text-muted ${fieldErrors.identifier
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                            : 'border-divider focus:border-brand-gold focus:ring-brand-gold/40'
                                            }`}
                                        value={identifier}
                                        onChange={(e) => {
                                            setIdentifier(e.target.value);
                                            setError('');
                                            setFieldErrors(prev => ({ ...prev, identifier: '' }));
                                        }}
                                    />
                                )}
                            </div>
                            {fieldErrors.identifier && (
                                <p className="text-red-400 text-xs mt-1.5 ml-1 flex items-center gap-1">
                                    <AlertCircle size={11} /> {fieldErrors.identifier}
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    className={`w-full h-[52px] bg-bg-elevated border rounded-xl pl-11 pr-12 text-text-primary text-[15px] font-medium outline-none transition-all focus:ring-[1.5px] placeholder:text-text-muted ${fieldErrors.password
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                        : 'border-divider focus:border-brand-gold focus:ring-brand-gold/40'
                                        }`}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                        setFieldErrors(prev => ({ ...prev, password: '' }));
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="text-red-400 text-xs mt-1.5 ml-1 flex items-center gap-1">
                                    <AlertCircle size={11} /> {fieldErrors.password}
                                </p>
                            )}
                        </div>

                        {/* Global Error */}
                        {error && (
                            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 animate-in slide-in-from-top-1 duration-200">
                                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-400 text-[13px] font-medium leading-snug">{error}</p>
                            </div>
                        )}

                        {/* Forgot Password */}
                        <div className="flex justify-end -mt-1">
                            <button
                                type="button"
                                onClick={() => { if (onClose) onClose(); router.push('/forgot-password'); }}
                                className="text-[13px] text-brand-gold font-semibold hover:underline"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-auth-action text-text-inverse h-[52px] rounded-xl font-extrabold text-base uppercase tracking-wide transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5 shadow-lg shadow-glow-gold active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : 'Log In'}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-4">
                            <div className="h-px bg-divider flex-1" />
                            <span className="text-text-muted text-xs font-bold uppercase">or</span>
                            <div className="h-px bg-divider flex-1" />
                        </div>

                        {/* Demo Button */}
                        <button
                            type="button"
                            className="w-full bg-transparent border border-divider text-text-primary h-[48px] rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all hover:border-brand-gold hover:text-brand-gold"
                        >
                            <PlayCircle size={18} className="fill-current" /> Continue with Demo ID
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
