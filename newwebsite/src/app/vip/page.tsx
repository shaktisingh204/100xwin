"use client";

import React, { useState, Suspense, useEffect } from 'react';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import Footer from '@/components/layout/Footer';
import { vipApi, VipApplyDto, VipApplicationStatus } from '@/services/vip';
import { useAuth } from '@/context/AuthContext';

import { ChevronDown, ChevronUp, ArrowRight, Zap, RotateCcw, Gamepad2, Trophy, Wallet, Star, HeartHandshake, Headphones, Shield, Users, Layers, Check, Loader2, Clock, BadgeCheck, XCircle, AlertCircle, Send } from 'lucide-react';

// ─── VIP PERKS DATA ────────────────────────────────────────────────────────────
const VIP_PERKS = [
    { icon: Zap, color: 'from-yellow-500/20 to-orange-500/10', iconColor: 'text-yellow-400', title: 'Instant Lossback', description: 'Earn rewards back instantly as you play — no waiting, no conditions.' },
    { icon: RotateCcw, color: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-400', title: 'Reload Bonuses', description: 'Receive rewards every day — the more you play, the higher you climb.' },
    { icon: Gamepad2, color: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-400', title: 'Gameplay Bonuses', description: 'Play across different game types to unlock richer, exclusive rewards.' },
    { icon: Trophy, color: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-400', title: 'Top Player Bonuses', description: 'Play at the top to unlock exclusive high-roller rewards and recognition.' },
    { icon: Wallet, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-400', title: 'Fee-Free D & W', description: 'All deposits and withdrawals are completely fee-free — fiat and crypto.' },
    { icon: Star, color: 'from-pink-500/20 to-pink-600/10', iconColor: 'text-pink-400', title: 'IRL VIP Events & Rewards', description: 'Exclusive real-world VIP experiences — events, gifts, and beyond.' },
    { icon: Headphones, color: 'from-teal-500/20 to-teal-600/10', iconColor: 'text-teal-400', title: 'Dedicated VIP Host', description: 'Personalised support whenever you need it, available around the clock.' },
];

const FAQS = {
    General: [
        { q: 'How do I become a VIP?', a: 'VIP status is invitation-based. We monitor consistent play and loyalty across all our platforms. If you qualify, our VIP team will reach out to you directly via email or in-platform notification.' },
        { q: 'What is the VIP Transfer?', a: 'If you hold VIP status at another premium gaming platform, you can transfer your status to Zeero instantly and unlock premium perks without having to start from scratch.' },
        { q: 'What makes the Zeero VIP Club different from others?', a: 'Our VIP program is truly personalised. There are no fixed levels or wagering ladders — we evaluate your activity holistically and tailor rewards that make a real difference, including real-world experiences.' },
        { q: 'Is there a minimum level required to apply?', a: 'No. Any player on Zeero can be considered for VIP status. We look at responsible, consistent gameplay rather than highest bets or fixed wager targets.' },
    ],
    Benefits: [
        { q: 'What is Instant Lossback?', a: 'Instant Lossback is a real-time reward that returns a percentage of net losses directly to your wallet as you play — not the next day, instantly.' },
        { q: 'How do Reload Bonuses work?', a: 'VIP members receive ongoing reload bonuses that grow as your activity and loyalty increase. These are credited regularly to your account, no deposit code required.' },
        { q: 'What are IRL VIP Events?', a: 'Real-world events exclusively for Zeero VIP members — sporting events, hospitality experiences, exclusive dinners, and merchandise gifts curated by our VIP team.' },
        { q: 'Are there truly no withdrawal fees for VIPs?', a: 'Yes — all deposits and withdrawals for VIP members are completely fee-free. This applies to all fiat payment methods and all supported cryptocurrencies.' },
    ],
};

// ─── FAQ Accordion ──────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`border rounded-xl transition-all duration-200 cursor-pointer ${open ? 'border-brand-gold/30 bg-bg-elevated' : 'border-white/5 bg-bg-elevated/60 hover:border-white/15'}`} onClick={() => setOpen(!open)}>
            <div className="flex items-center justify-between p-4 gap-3">
                <span className={`font-bold text-sm md:text-base ${open ? 'text-brand-gold' : 'text-text-primary'}`}>{q}</span>
                {open ? <ChevronUp size={18} className="text-brand-gold flex-shrink-0" /> : <ChevronDown size={18} className="text-text-muted flex-shrink-0" />}
            </div>
            {open && <div className="px-4 pb-4 text-text-secondary text-sm leading-relaxed border-t border-white/5 pt-3">{a}</div>}
        </div>
    );
}

// ─── Application Status Badge ────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { icon: any; label: string; color: string; bg: string }> = {
        PENDING: { icon: Clock, label: 'Application Pending', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
        UNDER_REVIEW: { icon: AlertCircle, label: 'Under Review', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        APPROVED: { icon: BadgeCheck, label: 'VIP Approved! 🎉', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        REJECTED: { icon: XCircle, label: 'Application Declined', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        TRANSFER_REQUESTED: { icon: ArrowRight, label: 'Transfer Requested', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    };
    const c = config[status] || config['PENDING'];
    const Icon = c.icon;
    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${c.bg}`}>
            <Icon size={16} className={c.color} />
            <span className={`font-bold text-sm ${c.color}`}>{c.label}</span>
        </div>
    );
}

// ─── Apply Modal ────────────────────────────────────────────────────────────────
function ApplyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (data: any) => void }) {
    const [form, setForm] = useState<VipApplyDto>({ message: '', currentPlatform: '', platformUsername: '', monthlyVolume: undefined });
    const [isTransfer, setIsTransfer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload: VipApplyDto = {
                message: form.message || undefined,
                monthlyVolume: form.monthlyVolume || undefined,
            };
            if (isTransfer) {
                payload.currentPlatform = form.currentPlatform || undefined;
                payload.platformUsername = form.platformUsername || undefined;
            }
            const result = await vipApi.apply(payload);
            onSuccess(result);
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join('. ') : 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-bg-elevated border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
                        <Star size={20} className="text-brand-gold fill-brand-gold" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-text-primary">Apply for VIP</h2>
                        <p className="text-text-muted text-xs">Our team reviews every application personally</p>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* Transfer toggle */}
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-bg-base/50 rounded-xl border border-white/5 hover:border-brand-gold/20 transition-colors">
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${isTransfer ? 'bg-brand-gold' : 'bg-white/10'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isTransfer ? 'left-6' : 'left-1'}`} />
                            <input type="checkbox" checked={isTransfer} onChange={e => setIsTransfer(e.target.checked)} className="sr-only" />
                        </div>
                        <div>
                            <span className="text-text-primary font-bold text-sm">I have VIP status elsewhere</span>
                            <p className="text-text-muted text-xs mt-0.5">Enable VIP Transfer — unlock perks immediately</p>
                        </div>
                    </label>

                    {/* Transfer fields */}
                    {isTransfer && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-text-muted font-bold mb-1">Platform Name</label>
                                <input type="text" maxLength={100} value={form.currentPlatform} onChange={e => setForm({ ...form, currentPlatform: e.target.value })}
                                    placeholder="e.g. BC.Game" className="w-full bg-bg-base border border-white/10 rounded-lg p-2.5 text-text-primary text-sm focus:border-brand-gold/50 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-text-muted font-bold mb-1">Your Username There</label>
                                <input type="text" maxLength={50} value={form.platformUsername} onChange={e => setForm({ ...form, platformUsername: e.target.value })}
                                    placeholder="@username" className="w-full bg-bg-base border border-white/10 rounded-lg p-2.5 text-text-primary text-sm focus:border-brand-gold/50 outline-none" />
                            </div>
                        </div>
                    )}

                    {/* Monthly volume */}
                    <div>
                        <label className="block text-xs text-text-muted font-bold mb-1">Approx. Monthly Wagering Volume (₹) <span className="font-normal opacity-60">— optional</span></label>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" min={0} value={form.monthlyVolume ?? ''} onChange={e => setForm({ ...form, monthlyVolume: e.target.value ? parseFloat(e.target.value.replace(/[^0-9.]/g, '')) : undefined })}
                            placeholder="e.g. 500000" className="w-full bg-bg-base border border-white/10 rounded-lg p-2.5 text-text-primary text-sm focus:border-brand-gold/50 outline-none" />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-xs text-text-muted font-bold mb-1">Why do you want VIP? <span className="font-normal opacity-60">— optional</span></label>
                        <textarea rows={3} maxLength={1000} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                            placeholder="Tell us about your gaming habits, preferences, or why VIP matters to you..."
                            className="w-full bg-bg-base border border-white/10 rounded-lg p-2.5 text-text-primary text-sm focus:border-brand-gold/50 outline-none resize-none" />
                        <p className="text-right text-xs text-text-muted mt-0.5">{(form.message || '').length}/1000</p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-white/5 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-text-muted text-sm transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-60 disabled:cursor-not-allowed text-text-inverse rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-200 hover:scale-[1.02]">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {loading ? 'Submitting...' : 'Submit Application'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────
function VIPContent() {
    const [faqTab, setFaqTab] = useState<'General' | 'Benefits'>('General');
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [application, setApplication] = useState<VipApplicationStatus | null | undefined>(undefined);
    const { user, isAuthenticated } = useAuth();

    // Fetch existing application on load
    useEffect(() => {
        if (isAuthenticated) {
            vipApi.getMyApplication().then(app => setApplication(app));
        } else {
            setApplication(null);
        }
    }, [isAuthenticated]);


    const handleApplySuccess = (data: any) => {
        setShowApplyModal(false);
        setShowTransferModal(false);
        setApplication({ ...data, message: '', createdAt: data.createdAt, updatedAt: data.createdAt });
    };

    const canApply = !application || application.status === 'REJECTED';
    const hasActiveApplication = application && !['REJECTED'].includes(application.status);

    return (
        <div className="h-screen overflow-hidden bg-bg-base flex flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden pt-[110px] md:pt-[64px] pb-[80px] md:pb-0 max-w-[1920px] mx-auto w-full">
                <LeftSidebar />
                <main className="flex-1 min-w-0 bg-bg-base overflow-y-auto overflow-x-hidden flex flex-col">

                    {/* ═══ HERO ═══════════════════════════════════════════════════════ */}
                    <div className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(227,125,50,0.18),_transparent_60%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(123,92,214,0.12),_transparent_60%)]" />
                        <div className="absolute -right-20 top-10 w-80 h-80 rounded-full bg-brand-gold/5 blur-3xl pointer-events-none" />

                        <div className="relative px-4 md:px-8 lg:px-12 pt-10 pb-14 md:pt-16 md:pb-20">
                            <div className="inline-flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/30 rounded-full px-4 py-1.5 mb-5">
                                <Star size={14} className="text-brand-gold fill-brand-gold" />
                                <span className="text-brand-gold text-xs font-bold uppercase tracking-widest">Zeero VIP Club</span>
                            </div>

                            <div className="max-w-3xl">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-text-primary leading-tight mb-3">
                                    Only <span className="text-gradient-gold">Zeero</span> Defines
                                    <br /><span className="text-white">True VIP</span>
                                </h1>
                                <p className="text-text-secondary text-base md:text-lg leading-relaxed max-w-2xl mb-8">
                                    Have VIP status elsewhere? Transfer it and unlock premium perks instantly. Our VIP program is personal, transparent, and built to reward real players.
                                </p>

                                {/* Application Status Banner */}
                                {hasActiveApplication && application && (
                                    <div className="mb-6 p-4 bg-bg-elevated border border-white/10 rounded-2xl inline-flex flex-col gap-2">
                                        <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Your Application</p>
                                        <StatusBadge status={application.status} />
                                        {application.status === 'APPROVED' && (
                                            <p className="text-emerald-400 text-xs mt-1">🎉 Congratulations! Your VIP host will contact you within 24 hours.</p>
                                        )}
                                        {application.status === 'UNDER_REVIEW' && (
                                            <p className="text-text-muted text-xs mt-1">Our team is reviewing your application. We'll update you soon.</p>
                                        )}
                                        {application.reviewNotes && application.status === 'REJECTED' && (
                                            <p className="text-text-muted text-xs mt-1 italic">{application.reviewNotes}</p>
                                        )}
                                    </div>
                                )}

                                {/* CTA Buttons */}
                                <div className="flex flex-wrap gap-3">
                                    {!isAuthenticated ? (
                                        <button onClick={() => window.location.href = '/auth/login'}
                                            className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-text-inverse font-black px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105 text-sm uppercase tracking-wide">
                                            Login to Apply <ArrowRight size={16} />
                                        </button>
                                    ) : canApply ? (
                                        <button onClick={() => setShowApplyModal(true)}
                                            className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-text-inverse font-black px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105 text-sm uppercase tracking-wide">
                                            {application?.status === 'REJECTED' ? 'Re-Apply for VIP' : 'Apply for VIP'} <ArrowRight size={16} />
                                        </button>
                                    ) : null}
                                    {canApply && (
                                        <button onClick={() => { setShowTransferModal(true); setShowApplyModal(true); }}
                                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-gold/30 text-text-primary font-bold px-6 py-3 rounded-xl transition-all duration-200 text-sm uppercase tracking-wide">
                                            Transfer VIP Status
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg">
                                {[{ label: 'Active VIPs', value: '10,000+' }, { label: 'Avg. Lossback', value: 'Up to 20%' }, { label: 'Support', value: '24 / 7' }].map(s => (
                                    <div key={s.label} className="text-center">
                                        <div className="text-xl md:text-2xl font-black text-brand-gold">{s.value}</div>
                                        <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ═══ PERKS ══════════════════════════════════════════════════════ */}
                    <div className="px-4 md:px-8 lg:px-12 py-12">
                        <div className="text-center mb-10">
                            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">Exclusive Benefits</p>
                            <h2 className="text-2xl md:text-3xl font-black text-text-primary">Experience Premium VIP Rewards</h2>
                            <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">Every reward is crafted to make your experience richer, faster, and more personal.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {VIP_PERKS.map((perk) => {
                                const Icon = perk.icon;
                                return (
                                    <div key={perk.title} className="group relative bg-bg-elevated border border-white/5 hover:border-brand-gold/20 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${perk.color} border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon size={22} className={perk.iconColor} />
                                        </div>
                                        <h3 className="font-black text-text-primary text-sm md:text-base mb-1.5">{perk.title}</h3>
                                        <p className="text-text-muted text-xs leading-relaxed">{perk.description}</p>
                                    </div>
                                );
                            })}
                            <div className="relative bg-bg-elevated/40 border border-dashed border-brand-gold/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-[140px]">
                                <div className="w-11 h-11 rounded-xl bg-brand-gold/5 border border-brand-gold/20 flex items-center justify-center mb-3"><span className="text-xl">✨</span></div>
                                <p className="font-black text-brand-gold text-sm">More perks are coming...</p>
                                <p className="text-text-muted text-xs mt-1">Your VIP journey keeps getting better</p>
                            </div>
                        </div>
                    </div>

                    {/* ═══ TRANSFER BANNER ════════════════════════════════════════════ */}
                    <div className="px-4 md:px-8 lg:px-12 pb-12">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-gold/20 via-amber-600/10 to-bg-elevated border border-brand-gold/20 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(227,125,50,0.12),_transparent_70%)]" />
                            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center"><Shield size={28} className="text-brand-gold" /></div>
                            <div className="flex-1 relative">
                                <h3 className="text-lg md:text-xl font-black text-text-primary mb-1">VIP Transfer Available</h3>
                                <p className="text-text-secondary text-sm max-w-xl">Already a VIP somewhere else? Transfer your status to Zeero instantly. Contact our VIP team with proof of your current status and unlock premium perks immediately — no waiting, no grinding.</p>
                            </div>
                            {canApply ? (
                                <button onClick={() => { setShowApplyModal(true); setShowTransferModal(true); }} className="flex-shrink-0 flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-text-inverse font-bold px-5 py-2.5 rounded-xl text-sm uppercase tracking-wide transition-all duration-200 hover:scale-105">
                                    Start Transfer <ArrowRight size={14} />
                                </button>
                            ) : (
                                <div className="flex-shrink-0"><StatusBadge status={application?.status || 'PENDING'} /></div>
                            )}
                        </div>
                    </div>

                    {/* ═══ QUALIFICATIONS ═════════════════════════════════════════════ */}
                    <div className="px-4 md:px-8 lg:px-12 py-12 bg-bg-elevated/30">
                        <div className="text-center mb-10">
                            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">Eligibility</p>
                            <h2 className="text-2xl md:text-3xl font-black text-text-primary">Play and Engage for VIP Access</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            {[
                                { icon: Users, color: 'text-blue-400', bg: 'from-blue-500/15 to-blue-600/5', title: 'Activity', description: 'Consistent and responsible gameplay helps you stand out as a valued player. We watch patterns, not just totals.', bullet: 'Regular, responsible play' },
                                { icon: HeartHandshake, color: 'text-brand-gold', bg: 'from-amber-500/15 to-amber-600/5', title: 'Loyalty', description: 'Stable and ongoing loyalty to Zeero increases your chance of unlocking VIP service and exclusive personal support.', bullet: 'Long-term engagement' },
                                { icon: Layers, color: 'text-emerald-400', bg: 'from-emerald-500/15 to-emerald-600/5', title: 'No Barriers', description: 'No fixed level or specific game requirements — every player has the opportunity to qualify for VIP regardless of what they play.', bullet: 'Open to all players' },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.title} className="relative bg-bg-elevated border border-white/5 rounded-2xl p-6 text-center hover:border-white/15 transition-all duration-300">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.bg} border border-white/5 flex items-center justify-center mx-auto mb-4`}><Icon size={26} className={item.color} /></div>
                                        <h3 className="font-black text-text-primary text-lg mb-2">{item.title}</h3>
                                        <p className="text-text-muted text-sm leading-relaxed mb-4">{item.description}</p>
                                        <div className="inline-flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1">
                                            <Check size={12} className={item.color} />
                                            <span className="text-xs text-text-secondary font-medium">{item.bullet}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ═══ FAQ ════════════════════════════════════════════════════════ */}
                    <div className="px-4 md:px-8 lg:px-12 py-12">
                        <div className="max-w-3xl mx-auto">
                            <div className="text-center mb-8">
                                <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">Got Questions?</p>
                                <h2 className="text-2xl md:text-3xl font-black text-text-primary">Frequently Asked Questions</h2>
                            </div>
                            <div className="flex gap-2 p-1 bg-bg-elevated rounded-xl border border-white/5 mb-6 w-fit mx-auto">
                                {(['General', 'Benefits'] as const).map(tab => (
                                    <button key={tab} onClick={() => setFaqTab(tab)} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${faqTab === tab ? 'bg-brand-gold text-text-inverse shadow' : 'text-text-muted hover:text-text-secondary'}`}>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-3">
                                {FAQS[faqTab].map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
                            </div>
                            <div className="mt-8 text-center p-6 bg-bg-elevated/40 rounded-2xl border border-white/5">
                                <p className="text-text-secondary text-sm mb-3">Still have questions about VIP?</p>
                                <button className="flex items-center gap-2 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 text-brand-gold font-bold px-5 py-2.5 rounded-xl text-sm transition-all duration-200 mx-auto">
                                    <Headphones size={16} /> Contact VIP Support
                                </button>
                            </div>
                        </div>
                    </div>

                    <Footer />
                </main>
            </div>

            {/* Apply Modal */}
            {showApplyModal && (
                <ApplyModal
                    onClose={() => { setShowApplyModal(false); setShowTransferModal(false); }}
                    onSuccess={handleApplySuccess}
                />
            )}
        </div>
    );
}

export default function VIPPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" /></div>}>
            <VIPContent />
        </Suspense>
    );
}
