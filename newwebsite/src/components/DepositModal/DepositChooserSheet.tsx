'use client';

import { useEffect, useState } from 'react';
import { Wallet, QrCode, ShieldCheck, Zap, X, Loader2 } from 'lucide-react';
import api from '@/services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onChooseUPI: () => void;
    onChooseManual: () => void;
}

export default function DepositChooserSheet({ isOpen, onClose, onChooseUPI, onChooseManual }: Props) {
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (!isOpen) { setChecking(true); return; }
        // Check if manual payment is enabled in admin config
        api.get('/settings/public')
            .then(res => {
                const manualEnabled = res.data?.MANUAL_PAYMENT_ENABLED !== 'false';
                if (!manualEnabled) {
                    // Admin disabled manual — skip chooser, go straight to UPI gateway
                    onChooseUPI();
                } else {
                    setChecking(false);
                }
            })
            .catch(() => {
                // On error, default to showing the chooser
                setChecking(false);
            });
    }, [isOpen]);

    if (!isOpen || checking) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Bottom sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
                <div
                    className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
                    style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #0f1923 60%, #12131a 100%)' }}
                >
                    {/* Drag handle */}
                    <div className="sm:hidden flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-white/20" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-5">
                        <div>
                            <h2 className="text-lg font-bold text-white">Add Funds</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Choose how you want to deposit</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/8 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Cards */}
                    <div className="px-5 pb-7 flex flex-col gap-3">
                        {/* UPI Gateway card */}
                        <button
                            onClick={onChooseUPI}
                            className="group relative w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0.04) 100%)',
                                borderColor: 'rgba(249,115,22,0.3)',
                            }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-white">UPI Gateway</p>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                                            INSTANT
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                                        Pay with GPay, PhonePe, Paytm or any UPI app. Auto-credited in seconds.
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3 text-orange-400" />
                                            <span className="text-[10px] text-gray-500">Secure</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-orange-400" />
                                            <span className="text-[10px] text-gray-500">Auto-credited</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 self-center text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity text-lg">›</div>
                            </div>
                        </button>

                        {/* Manual UPI card */}
                        <button
                            onClick={onChooseManual}
                            className="group relative w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)',
                                borderColor: 'rgba(99,102,241,0.3)',
                            }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                                    <QrCode className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-white">Manual UPI</p>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                                            5–15 MIN
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                                        Scan QR code, pay via UPI, submit your UTR for admin approval.
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="flex items-center gap-1">
                                            <QrCode className="w-3 h-3 text-indigo-400" />
                                            <span className="text-[10px] text-gray-500">Scan & pay</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Wallet className="w-3 h-3 text-indigo-400" />
                                            <span className="text-[10px] text-gray-500">Always available</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 self-center text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity text-lg">›</div>
                            </div>
                        </button>

                        <p className="text-center text-[10px] text-gray-700 mt-1">
                            All deposits are encrypted and secure.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
