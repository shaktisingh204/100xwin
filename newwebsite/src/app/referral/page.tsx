"use client";

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useModal } from '@/context/ModalContext';
import { Users, Gift, TrendingUp, ShieldCheck, ArrowRight, ArrowLeft, Home } from 'lucide-react';

// Force dynamic for search params
export const dynamic = 'force-dynamic';

function ReferralContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const refCode = searchParams.get('ref');
    const { openRegister } = useModal();
    const router = useRouter();

    useEffect(() => {
        if (token) {
            // Save token to local storage for persistence during signup
            localStorage.setItem('referralToken', token);
        }
        if (refCode) {
            localStorage.setItem('referralCode', refCode);
        }
    }, [token, refCode]);

    const handleStartEarning = (e: React.MouseEvent) => {
        e.preventDefault();
        // If we have a token, we might want to ensure it's passed.
        // Opening register modal is a good user experience.
        openRegister();
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white">
            {/* Navigation / Back Button */}
            <div className="absolute top-0 left-0 w-full z-50 p-6 md:p-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-black/20 hover:bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5"
                >
                    <Home size={16} />
                    <span>Back to Main Website</span>
                </Link>
            </div>

            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#201E22] via-[#1a1a1a] to-[#000000] py-24 sm:py-32">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 opacity-10 blur-3xl">
                    <div className="w-[600px] h-[600px] rounded-full bg-[#E37D32]"></div>
                </div>

                <div className="container mx-auto px-6 md:px-12 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E37D32]/10 text-[#E37D32] text-sm font-bold mb-6 border border-[#E37D32]/20">
                        <Gift size={16} />
                        <span>Refer & Earn Program</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-adx-bold text-white mb-6 tracking-tight">
                        Invite Friends,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E37D32] to-[#FFB775]">Earn Real Rewards</span>
                    </h1>

                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        Join our referral program and earn commissions for every friend you invite.
                        Get rewarded for their deposits and betting activity!
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={handleStartEarning}
                            className="bg-[#E37D32] hover:bg-[#EFA05B] text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
                        >
                            Start Earning Now <ArrowRight size={20} />
                        </button>
                        <Link
                            href="/profile/referral"
                            className="bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-8 rounded-xl transition-all border border-white/10"
                        >
                            View My Dashboard
                        </Link>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="py-24 bg-[#0a0a0a]">
                <div className="container mx-auto px-6 md:px-12">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-adx-bold text-white mb-4">How It Works</h2>
                        <p className="text-gray-400">Simple steps to start generating passive income.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <div className="bg-[#1e1e1e] p-8 rounded-2xl border border-white/5 hover:border-[#E37D32]/30 transition-colors group">
                            <div className="w-16 h-16 rounded-2xl bg-[#E37D32]/10 flex items-center justify-center text-[#E37D32] mb-6 group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">1. Invite Friends</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Share your unique referral link via social media, email, or directly with friends.
                            </p>
                        </div>

                        <div className="bg-[#1e1e1e] p-8 rounded-2xl border border-white/5 hover:border-[#E37D32]/30 transition-colors group">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                                <TrendingUp size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">2. They Play</h3>
                            <p className="text-gray-400 leading-relaxed">
                                When your friends sign up and start depositing or placing bets on our platform.
                            </p>
                        </div>

                        <div className="bg-[#1e1e1e] p-8 rounded-2xl border border-white/5 hover:border-[#E37D32]/30 transition-colors group">
                            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform">
                                <Gift size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">3. You Earn</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Automatically receive commissions and bonuses directly into your wallet.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Benefits Section */}
            <div className="py-24 border-t border-white/5">
                <div className="container mx-auto px-6 md:px-12">
                    <div className="rounded-3xl bg-gradient-to-r from-[#201E22] to-[#2A2A2E] p-8 md:p-16 border border-white/5 relative overflow-hidden">
                        <div className="relative z-10 max-w-2xl">
                            <h2 className="text-3xl md:text-4xl font-adx-bold text-white mb-6">Why Join Our Referral Program?</h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <ShieldCheck className="text-[#E37D32] mt-1 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-white text-lg">Transparent Tracking</h4>
                                        <p className="text-gray-400">Monitor every click, sign-up, and reward in real-time from your dashboard.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <Gift className="text-[#E37D32] mt-1 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-white text-lg">Unlimited Earning Potential</h4>
                                        <p className="text-gray-400">There is no cap on how many friends you can invite or how much you can earn.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10">
                                <button
                                    onClick={handleStartEarning}
                                    className="inline-block bg-[#E37D32] hover:bg-[#EFA05B] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                                >
                                    Get Your Referral Link
                                </button>
                            </div>
                        </div>

                        {/* Decorative Background */}
                        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4 translate-x-1/4">
                            <Users size={400} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PublicReferralPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">Loading...</div>}>
            <ReferralContent />
        </Suspense>
    );
}
