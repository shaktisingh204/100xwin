'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getCurrencySymbol } from '@/utils/currency';
import {
    X,
    Check,
    Copy,
    Loader2,
    CheckCircle2,
    MessageCircle,
    Send,
    ShieldCheck,
    AlertCircle,
    ArrowLeft,
    Wallet,
    Sparkles,
    Download,
    QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ManualConfig {
    accountId: string;
    accountTag: string;
    accountCount: number;
    upiId: string;
    qrImageUrl: string;
    whatsappNumber: string;
    telegramHandle: string;
    telegramLink: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Called when user wants to go back to UPI gateways */
    onBackToGateway: () => void;
    /** Whether to show the back button (first attempt → can go back; second+ → cannot) */
    allowBack: boolean;
}

const QUICK_AMOUNTS = ['300', '500', '1000', '2000', '5000', '10000'];
const manualDepositBonusCodeKey = 'manualDepositBonusCode';

export default function ManualDepositScreen({ isOpen, onClose, onBackToGateway, allowBack }: Props) {
    const { user } = useAuth();
    const fiatSymbol = getCurrencySymbol(user?.currency || 'INR');
    const qrRef = useRef<HTMLDivElement>(null);

    const [config, setConfig] = useState<ManualConfig | null>(null);
    const [configLoading, setConfigLoading] = useState(true);

    const [amount, setAmount] = useState('');
    const [utr, setUtr] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [upiCopied, setUpiCopied] = useState(false);
    const [error, setError] = useState('');
    const [bonusCode, setBonusCode] = useState('');

    // Fetch config on mount
    useEffect(() => {
        if (!isOpen) return;
        setConfigLoading(true);
        api.get('/manual-deposit/config')
            .then(r => setConfig(r.data))
            .catch(() => {})
            .finally(() => setConfigLoading(false));

        const sessionBonus =
            typeof window !== 'undefined'
                ? window.sessionStorage.getItem(manualDepositBonusCodeKey) || ''
                : '';

        if (sessionBonus) {
            setBonusCode(sessionBonus.toUpperCase());
        } else {
            api.get('/bonus/pending')
                .then(res => setBonusCode((res.data?.bonusCode || '').toUpperCase()))
                .catch(() => setBonusCode(''));
        }
    }, [isOpen]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setUtr('');
            setSuccess(false);
            setError('');
            setUpiCopied(false);
            setBonusCode('');
            if (typeof window !== 'undefined') {
                window.sessionStorage.removeItem(manualDepositBonusCodeKey);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSaveQr = async () => {
        if (!config) return;
        if (config.qrImageUrl) {
            // Fetch the image and download it
            try {
                const res = await fetch(config.qrImageUrl);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'upi-qr.png';
                a.click();
                URL.revokeObjectURL(url);
                toast.success('QR saved!');
            } catch {
                toast.error('Could not save QR image.');
            }
        } else {
            toast.error('No QR image available. Use the UPI ID instead.');
        }
    };

    const handleCopyUpi = () => {
        if (!config?.upiId) return;
        navigator.clipboard.writeText(config.upiId);
        setUpiCopied(true);
        toast.success('UPI ID copied!');
        setTimeout(() => setUpiCopied(false), 2000);
    };

    const handleSubmit = async () => {
        setError('');
        const numAmt = parseFloat(amount);
        if (!amount || numAmt <= 0) { setError('Please enter the amount you paid.'); return; }
        if (!utr.trim()) { setError('Please enter your UTR / Transaction ID.'); return; }
        setSubmitting(true);
        try {
            await api.post('/manual-deposit/submit', {
                amount: numAmt,
                utr: utr.trim().toUpperCase(),
                accountId: config?.accountId || undefined,
                upiId: config?.upiId || undefined,
                accountTag: config?.accountTag || undefined,
                bonusCode: bonusCode || undefined,
            });
            if (bonusCode) {
                api.delete('/bonus/pending').catch(() => {});
            }
            // Pre-refresh retry state so DepositModal knows the gateway flow is unlocked
            // on the NEXT deposit attempt (backend auto-cancelled stale PENDING gateway txns)
            api.get('/manual-deposit/retry-state').catch(() => {});
            setSuccess(true);
            toast.success('Payment submitted! Approval usually within 5–15 minutes.');
        } catch (error: unknown) {
            const msg =
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
                    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Submission failed'
                    : error instanceof Error
                        ? error.message
                        : 'Submission failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const waLink = config?.whatsappNumber
        ? `https://wa.me/${config.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I made a manual UPI payment of ₹${amount || '?'}. My UTR is: ${utr || 'PENDING'}`)}`
        : null;
    const tgLink = config?.telegramLink || (config?.telegramHandle ? `https://t.me/${config.telegramHandle}` : null);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md" onClick={onClose} />

            {/* Sheet */}
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                <div className="pointer-events-auto w-full sm:max-w-lg flex flex-col overflow-hidden shadow-xl max-h-[95dvh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl bg-gradient-to-br from-[#12161e] to-[#0c0f14] border border-white/[0.06]">
                    {/* ── HEADER ── */}
                    <div className="relative flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
                        {/* Drag handle */}
                        <div className="sm:hidden absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-white/20" />

                        {allowBack ? (
                            <button
                                onClick={onBackToGateway}
                                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back
                            </button>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600">
                                    <Wallet className="w-4 h-4 text-[#1a1208]" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white leading-tight">Manual UPI Deposit</h2>
                                    <p className="text-[10px] text-white/50">Scan · Pay · Submit UTR</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {/* Manual badge */}
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-amber-500/15 border-amber-500/30 text-amber-300">
                                Manual UPI
                            </span>
                            <button onClick={onClose} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* ── BODY ── */}
                    <div className="flex-1 overflow-y-auto px-5 pb-6">
                        {success ? (
                            /* ══ SUCCESS ══ */
                            <div className="flex flex-col items-center gap-5 py-8 text-center">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-emerald-500/20">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-300" />
                                    </div>
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-emerald-500/40" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white mb-1">Payment Submitted!</h3>
                                    <p className="text-sm text-white/70 leading-relaxed">
                                        We&apos;ll verify your payment and credit <span className="text-white font-black">{fiatSymbol}{amount}</span> to your balance within 5–15 minutes.
                                    </p>
                                </div>

                                {/* Support CTA */}
                                <div className="w-full p-4 rounded-2xl border space-y-3 bg-white/[0.03] border-white/[0.08]">
                                    <p className="text-[11px] text-white/50 font-black uppercase tracking-widest">Need faster approval?</p>
                                    <div className="flex gap-2.5">
                                        {waLink && (
                                            <a href={waLink} target="_blank" rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95 bg-gradient-to-br from-[#25D366] to-[#1aad52] text-white">
                                                <MessageCircle className="w-4 h-4" /> WhatsApp
                                            </a>
                                        )}
                                        {tgLink && (
                                            <a href={tgLink} target="_blank" rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95 bg-gradient-to-br from-[#229ED9] to-[#1177aa] text-white">
                                                <Send className="w-4 h-4" /> Telegram
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <button onClick={onClose}
                                    className="w-full py-3 rounded-xl text-sm font-bold text-white/70 hover:text-white border border-white/[0.08] hover:border-white/[0.16] transition-all">
                                    Close
                                </button>

                                <button
                                    onClick={() => {
                                        setSuccess(false);
                                        setAmount('');
                                        setUtr('');
                                        onBackToGateway();
                                    }}
                                    className="w-full py-3 rounded-xl text-sm font-black transition-all border bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/15"
                                >
                                    Make Another Deposit
                                </button>
                            </div>
                        ) : (
                            /* ══ FORM ══ */
                            <div className="flex flex-col gap-5">

                                {/* ── QR + UPI section ── */}
                                <div className="rounded-2xl overflow-hidden border bg-amber-500/[0.04] border-amber-500/20">
                                    {configLoading ? (
                                        <div className="flex items-center justify-center h-40">
                                            <Loader2 className="w-6 h-6 text-amber-500/60 animate-spin" />
                                        </div>
                                    ) : config?.upiId ? (
                                        <div className="flex flex-col sm:flex-row items-center gap-4 p-4">
                                            {/* QR */}
                                            <div className="shrink-0 flex flex-col items-center gap-2" ref={qrRef}>
                                                <div className="p-2.5 bg-white rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.25)]">
                                                    {config.qrImageUrl ? (
                                                        <img
                                                            src={config.qrImageUrl}
                                                            alt="UPI QR Code"
                                                            width={120}
                                                            height={120}
                                                            className="rounded-xl object-contain"
                                                            style={{ width: 120, height: 120 }}
                                                        />
                                                    ) : (
                                                        <img
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&bgcolor=ffffff&color=07111b&margin=0&data=${encodeURIComponent(`upi://pay?pa=${config.upiId}&pn=Odd69&cu=INR${amount ? `&am=${amount}` : ''}`)}`}
                                                            alt="UPI QR Code"
                                                            width={120}
                                                            height={120}
                                                            className="rounded-xl object-contain"
                                                            style={{ width: 120, height: 120 }}
                                                        />
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-white/50">Scan with any UPI app</p>
                                                {config.qrImageUrl && (
                                                    <button
                                                        onClick={handleSaveQr}
                                                        className="flex items-center gap-1 text-[10px] font-black text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10"
                                                    >
                                                        <Download className="w-3 h-3" /> Save QR
                                                    </button>
                                                )}
                                            </div>

                                            {/* Divider */}
                                            <div className="hidden sm:block w-px self-stretch bg-white/[0.06]" />
                                            <div className="sm:hidden w-full h-px bg-white/[0.06]" />

                                            {/* UPI details */}
                                            <div className="flex-1 w-full flex flex-col gap-3">
                                                <div>
                                                    {config.accountTag && (
                                                        <div className="mb-2 inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-black bg-amber-500/15 border-amber-500/30 text-amber-300">
                                                            <span className="truncate">{config.accountTag}</span>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Pay to UPI ID</p>
                                                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                                        <span className="flex-1 text-sm font-mono font-black text-white truncate">{config.upiId}</span>
                                                        <button onClick={handleCopyUpi}
                                                            className={`shrink-0 p-1.5 rounded-lg transition-all border ${
                                                                upiCopied
                                                                    ? 'bg-emerald-500/15 border-emerald-500/30'
                                                                    : 'bg-amber-500/15 border-amber-500/30'
                                                            }`}>
                                                            {upiCopied
                                                                ? <Check className="w-3.5 h-3.5 text-emerald-300" />
                                                                : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                                                        </button>
                                                    </div>
                                                    {config.accountCount > 1 && (
                                                        <p className="mt-2 text-[10px] text-white/50">
                                                            Randomly selected from {config.accountCount} configured manual UPI accounts.
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Steps */}
                                                <div className="space-y-1.5">
                                                    {[
                                                        'Open any UPI app (GPay, PhonePe, Paytm…)',
                                                        'Scan QR or enter UPI ID',
                                                        'Pay the exact amount',
                                                        'Copy UTR and submit below',
                                                    ].map((step, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <span className="shrink-0 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center mt-0.5 bg-amber-500/20 text-amber-300">{i + 1}</span>
                                                            <span className="text-[10px] text-white/70 leading-tight">{step}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-24">
                                            <p className="text-xs text-white/50">UPI not configured. Contact support.</p>
                                        </div>
                                    )}
                                </div>

                                {/* ── Amount input ── */}
                                <div>
                                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 block">Amount You Paid</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-white/50 pointer-events-none">{fiatSymbol}</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                            placeholder="0"
                                            className="w-full rounded-xl py-3.5 pl-14 pr-4 text-2xl font-black text-white placeholder-white/20 focus:outline-none focus:border-amber-500/60 transition-all bg-white/[0.03] border border-white/[0.08] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        />
                                    </div>
                                    {/* Quick amounts */}
                                    <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-hide">
                                        {QUICK_AMOUNTS.map(v => (
                                            <button key={v} onClick={() => setAmount(v)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all shrink-0 border ${
                                                    amount === v
                                                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-transparent text-[#1a1208] shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                                                        : 'bg-white/[0.03] border-white/[0.08] text-white/70 hover:text-white hover:border-white/[0.16]'
                                                }`}>
                                                +{v}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ── UTR input ── */}
                                <div>
                                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 block">
                                        UTR / Transaction ID
                                    </label>
                                    <input
                                        type="text"
                                        value={utr}
                                        onChange={e => setUtr(e.target.value)}
                                        placeholder="e.g. 123456789012"
                                        className="w-full rounded-xl py-3 px-4 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-amber-500/60 transition-all bg-white/[0.03] border border-white/[0.08]"
                                    />
                                    <p className="text-[9px] text-white/50 mt-1">Find this in your UPI app under payment history</p>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs border bg-red-500/10 border-red-500/30 text-red-300">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Security badge */}
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                    <p className="text-[10px] text-emerald-300/90">SSL encrypted · Admin-verified · Credited within 15 min</p>
                                </div>

                                {/* ── Submit ── */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !utr.trim() || !amount}
                                    className={`w-full py-4 rounded-2xl font-black text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                                        submitting || !utr.trim() || !amount
                                            ? 'bg-amber-500/30 text-[#1a1208]'
                                            : 'bg-gradient-to-br from-amber-500 to-orange-600 text-[#1a1208] shadow-[0_0_30px_rgba(245,158,11,0.45)] hover:brightness-110'
                                    }`}
                                >
                                    {submitting
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                                        : <><Sparkles className="w-4 h-4" /> Submit Payment</>}
                                </button>

                                {/* ── Support buttons ── */}
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-white/[0.06]" />
                                        <p className="text-[10px] text-white/50 shrink-0">Instant approval? Contact support</p>
                                        <div className="flex-1 h-px bg-white/[0.06]" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {waLink ? (
                                            <a href={waLink} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all hover:opacity-90 active:scale-95 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                                                <MessageCircle className="w-4 h-4" /> WhatsApp
                                            </a>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black opacity-40 cursor-not-allowed bg-white/[0.03] border border-white/[0.08] text-white/50">
                                                <MessageCircle className="w-4 h-4" /> WhatsApp
                                            </div>
                                        )}
                                        {tgLink ? (
                                            <a href={tgLink} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all hover:opacity-90 active:scale-95 bg-sky-500/10 border border-sky-500/30 text-sky-300">
                                                <Send className="w-4 h-4" /> Telegram
                                            </a>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black opacity-40 cursor-not-allowed bg-white/[0.03] border border-white/[0.08] text-white/50">
                                                <Send className="w-4 h-4" /> Telegram
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
