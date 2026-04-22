"use client";

import React, { useState } from "react";
import { X, Mail, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

interface BindEmailModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const BindEmailModal: React.FC<BindEmailModalProps> = ({ onClose, onSuccess }) => {
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    type Step = 'form' | 'verify_otp';
    const [step, setStep] = useState<Step>('form');
    const [otpCode, setOtpCode] = useState('');
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);

    React.useEffect(() => {
        if (otpExpiresIn <= 0) return;
        const t = setTimeout(() => setOtpExpiresIn(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [otpExpiresIn]);

    const handleSendOtp = async () => {
        setError('');
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError('Email address is required');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setError('Enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/send-email-otp', {
                email: trimmedEmail,
                purpose: 'BIND_EMAIL',
            });
            setStep('verify_otp');
            setOtpCode('');
            setOtpExpiresIn(600); // email: 10min
            toast.success('OTP sent to your email address');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setError(typeof msg === 'string' ? msg : 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndBind = async () => {
        setError('');
        if (otpCode.length !== 6) {
            setError('Enter the 6-digit OTP.');
            return;
        }

        const trimmedEmail = email.trim();

        setLoading(true);
        try {
            await api.post('/auth/bind-email', {
                email: trimmedEmail,
                code: otpCode,
                purpose: 'BIND_EMAIL'
            });

            toast.success('Email bound successfully!');
            // Reload user profile in AuthContext
            try {
                const res = await api.get('/auth/profile');
                if (res.data) {
                    const currentToken = localStorage.getItem('token');
                    if (currentToken) {
                        login(currentToken, res.data);
                    }
                }
            } catch (e) {
                // Ignore profile reload errors
            }
            onSuccess();
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setError(typeof msg === 'string' ? msg : 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md" onClick={onClose} />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto relative w-full max-w-md bg-gradient-to-br from-[#12161e] to-[#0c0f14] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] border border-white/[0.06] overflow-hidden">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white"
                    >
                        <X size={18} />
                    </button>

                    <div className="p-6 sm:p-8">
                        {step === 'verify_otp' ? (
                            <div className="text-center animate-in fade-in duration-300">
                                <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck size={30} className="text-amber-400" />
                                </div>
                                <h4 className="text-white font-black text-xl mb-2 tracking-tight">Verify Your Email</h4>
                                <p className="text-white/50 text-sm mb-6">
                                    Enter the 6-digit OTP sent to <br />
                                    <strong className="text-white mt-1 inline-block">{email}</strong>
                                </p>

                                <div className="mb-6">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="— — — — — —"
                                        value={otpCode}
                                        onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                        className={`w-full h-[60px] bg-white/[0.03] border-2 rounded-xl px-4 text-white text-[28px] font-black tracking-[0.5em] text-center outline-none transition-all focus:ring-[1.5px] placeholder:text-white/20 placeholder:text-2xl placeholder:tracking-[0.3em] ${error ? 'border-red-500' : 'border-white/[0.08] focus:border-amber-500/60 focus:ring-amber-500/30'}`}
                                    />
                                    {error && <p className="text-red-400 text-xs mt-2 flex items-center justify-center gap-1"><AlertCircle size={12} />{error}</p>}
                                </div>

                                <button
                                    onClick={handleVerifyAndBind}
                                    disabled={loading || otpCode.length !== 6}
                                    className="w-full h-[50px] bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] font-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 tracking-tight"
                                >
                                    {loading ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : 'Verify & Bind'}
                                </button>

                                {otpExpiresIn > 0 ? (
                                    <p className={`text-center text-[11px] mt-3 ${otpExpiresIn <= 30 ? 'text-red-400' : 'text-white/50'}`}>
                                        OTP expires in {Math.floor(otpExpiresIn / 60)}:{String(otpExpiresIn % 60).padStart(2, '0')}
                                    </p>
                                ) : step === 'verify_otp' && (
                                    <p className="text-center text-[11px] mt-3 text-red-400 font-medium">
                                        OTP expired — please resend
                                    </p>
                                )}
                                <p className="text-xs text-white/50 mt-2">
                                    Didn't receive it? <button className="text-amber-400 font-black hover:underline" onClick={() => { setStep('form'); setOtpExpiresIn(0); }}>Change email</button>
                                </p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-300">
                                <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                                    <Mail size={30} className="text-amber-400" />
                                </div>
                                <h3 className="text-xl font-black text-white text-center mb-2 tracking-tight">Bind Email Address</h3>
                                <p className="text-sm text-white/50 text-center mb-6">
                                    A verified email address is required to secure your account and recover your password.
                                </p>

                                <div className="mb-2">
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        autoFocus
                                        className={`w-full h-[50px] bg-white/[0.03] border rounded-xl px-4 text-white outline-none transition-all focus:ring-[1.5px] placeholder-white/20 font-medium ${error
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                            : 'border-white/[0.08] focus:border-amber-500/60 focus:ring-amber-500/30'
                                            }`}
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setError('');
                                        }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                                    />
                                </div>
                                {error && (
                                    <p className="text-red-400 text-xs mb-4 ml-1 flex items-center gap-1">
                                        <AlertCircle size={11} /> {error}
                                    </p>
                                )}

                                <button
                                    onClick={handleSendOtp}
                                    disabled={loading || !email}
                                    className="w-full h-[50px] mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] font-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm tracking-tight"
                                >
                                    {loading ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : 'Send OTP'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default BindEmailModal;
