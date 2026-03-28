import React from 'react';
import Link from 'next/link';
import { Home, FileText } from 'lucide-react';

export const metadata = {
    title: 'Terms of Service | Zeero',
    description: 'Read the Terms of Service governing the use of the Zeero gaming platform.',
};

const SECTIONS = [
    {
        title: '1. Acceptance of Terms',
        content: [
            'By accessing or using Zeero ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the Platform.',
            'Zeero is operated by BlockDance B.V. (Commercial register of Curaçao no. 158182). These Terms constitute a legally binding agreement between you and BlockDance B.V.',
        ]
    },
    {
        title: '2. Eligibility',
        content: [
            'You must be at least 18 years of age (or the legal gambling age in your jurisdiction, whichever is higher) to use the Platform.',
            'It is your responsibility to ensure that online gambling is legal in your country of residence before using the Platform. Zeero is not responsible for any illegality resulting from use of the Platform in prohibited jurisdictions.',
            'Only one account per person is permitted. Duplicate accounts may result in permanent suspension and forfeiture of funds.',
        ]
    },
    {
        title: '3. Account Registration & Security',
        content: [
            'You are responsible for maintaining the confidentiality of your account credentials. All activity conducted through your account is your responsibility.',
            'You must provide accurate and current information during registration. Providing false information may lead to account suspension and forfeiture of winnings.',
            'Zeero reserves the right to request identity verification (KYC) at any time. Failure to comply may result in account restriction.',
        ]
    },
    {
        title: '4. Deposits & Withdrawals',
        content: [
            'All deposits and withdrawals are subject to our payment terms and applicable processing times.',
            'Zeero reserves the right to apply transaction limits and perform enhanced due diligence on large transactions.',
            'Withdrawals are subject to wagering requirements where applicable. Bonus funds may not be withdrawn until wagering requirements are met.',
            'We reserve the right to void any transaction that is deemed fraudulent or in violation of these Terms.',
        ]
    },
    {
        title: '5. Bonuses & Promotions',
        content: [
            'All bonuses and promotions are subject to individual terms and conditions, including wagering requirements, validity periods, and eligible games.',
            'Abuse of bonus offers, including but not limited to multi-accounting or bonus exploitation, may result in account suspension and forfeiture of bonuses and associated winnings.',
            'Zeero reserves the right to modify, cancel, or reclaim any bonus at its discretion if abuse or fraud is suspected.',
        ]
    },
    {
        title: '6. Responsible Gaming',
        content: [
            'Zeero is committed to responsible gaming. We provide tools such as deposit limits, session limits, self-exclusion, and cooling-off periods to help you maintain control.',
            'If you believe you have a gambling problem, please contact our support team or visit a responsible gaming organisation such as GambleAware (www.gambleaware.org) or BeGambleAware.',
            'Zeero reserves the right to impose account restrictions if we identify signs of problem gambling behaviour.',
        ]
    },
    {
        title: '7. Prohibited Activities',
        content: [
            'You must not use the Platform for any unlawful purpose or in any manner inconsistent with these Terms.',
            'Prohibited activities include: using automated bots, scripts or software to interact with the Platform; colluding with other players; arbitrage betting; money laundering; or any form of fraud or manipulation.',
            'Zeero reserves the right to investigate suspected violations and, where confirmed, to suspend accounts, withhold funds, and refer matters to relevant authorities.',
        ]
    },
    {
        title: '8. Intellectual Property',
        content: [
            'All content on the Platform, including but not limited to graphics, text, logos, and software, is the property of BlockDance B.V. or its licensors and is protected by applicable intellectual property laws.',
            'You may not reproduce, distribute, or create derivative works from any Platform content without express written permission.',
        ]
    },
    {
        title: '9. Limitation of Liability',
        content: [
            'To the maximum extent permitted by applicable law, Zeero shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.',
            'Zeero does not guarantee uninterrupted or error-free service and shall not be liable for losses caused by technical failures, maintenance, or circumstances beyond our reasonable control.',
        ]
    },
    {
        title: '10. Amendments',
        content: [
            'Zeero reserves the right to modify these Terms at any time. We will notify users of material changes via email or platform notice.',
            'Continued use of the Platform following any changes constitutes your acceptance of the revised Terms. You are encouraged to review these Terms periodically.',
        ]
    },
    {
        title: '11. Governing Law',
        content: [
            'These Terms are governed by the laws of Curaçao. Any disputes arising from or relating to these Terms shall be subject to the exclusive jurisdiction of the courts of Curaçao.',
        ]
    },
];

export default function TermsPage() {
    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#0E0F11] text-white pb-24">

            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-b from-blue-500/6 via-[#111315] to-[#0E0F11] border-b border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.08),transparent_60%)]" />
                <div className="relative max-w-3xl mx-auto px-4 pt-10 pb-8 text-center">
                    <div className="hidden md:flex absolute top-6 left-4">
                        <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2 rounded-full">
                            <Home size={14} /> Back to Home
                        </Link>
                    </div>
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-400 text-xs font-black uppercase tracking-widest mb-5">
                        <FileText size={13} /> Legal
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                        Terms of <span className="text-brand-gold">Service</span>
                    </h1>
                    <p className="text-text-muted text-sm">Last updated: March 2026</p>
                    <p className="text-text-muted text-sm mt-2 max-w-xl mx-auto">
                        Please read these Terms carefully before using the Zeero platform. These terms are legally binding.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
                {SECTIONS.map(({ title, content }) => (
                    <div key={title} className="rounded-2xl border border-white/5 bg-[#111315] overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5">
                            <h2 className="text-white font-bold text-base">{title}</h2>
                        </div>
                        <div className="px-6 py-5 space-y-3">
                            {content.map((p, i) => (
                                <p key={i} className="text-text-muted text-sm leading-relaxed">{p}</p>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Link href="/legal/privacy-policy" className="flex-1 text-center py-3 rounded-xl border border-white/10 text-text-muted hover:text-white hover:border-brand-gold/30 text-sm font-bold transition-all">
                        Privacy Policy →
                    </Link>
                    <Link href="/legal/rules" className="flex-1 text-center py-3 rounded-xl border border-white/10 text-text-muted hover:text-white hover:border-brand-gold/30 text-sm font-bold transition-all">
                        Betting Rules →
                    </Link>
                </div>
            </div>
        </div>
    );
}
