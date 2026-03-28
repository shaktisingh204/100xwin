'use client';
import { ChevronLeft, Shield, Scale, Gamepad2, Heart } from 'lucide-react';
import Link from 'next/link';

const sections = [
    {
        icon: Scale,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        title: '1. General Terms',
        items: [
            'You must be at least 18 years of age to use this service.',
            'One account per person/household is allowed. Multiple accounts will be suspended.',
            'It is your responsibility to ensure that online gambling is legal in your jurisdiction.',
            'We reserve the right to suspend accounts suspicious of fraudulent activity.',
        ]
    },
    {
        icon: Shield,
        color: 'text-[#3BC117]',
        bg: 'bg-[#3BC117]/10',
        title: '2. Sports Betting Rules',
        items: [
            'Result Settlement: All bets are settled based on the official result at the end of the event.',
            'Postponed Matches: Bets on matches postponed by more than 48 hours will be voided and stakes returned.',
            'Live Betting: We reserve the right to void bets placed on incorrect odds due to delayed feeds.',
            'Maximum Payout: The maximum payout for a single bet slip is capped at $50,000 (or currency equivalent).',
        ]
    },
    {
        icon: Gamepad2,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        title: '3. Casino Rules',
        items: [
            'Game Malfunction: A malfunction voids all pays and plays.',
            'Bonus Abuse: Any attempt to abuse deposit bonuses or free spins will result in forfeiture of winnings.',
            'Disconnection: If you are disconnected during a game, the state will be saved and restored upon reconnection where possible.',
        ]
    },
    {
        icon: Heart,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        title: '4. Responsible Gaming',
        items: [
            'We are committed to responsible gaming. If you feel you have a problem, please use our self-exclusion tools or contact support.',
            'You can set daily, weekly, or monthly deposit limits in your account settings.',
        ]
    }
];

export default function RulesPage() {
    return (
        <div className="space-y-6">
            {/* Back + Title */}
            <div>
                <Link href="/profile" className="inline-flex items-center gap-1 text-white/30 hover:text-white text-xs font-medium mb-3 transition-colors">
                    <ChevronLeft size={14} /> Back to Profile
                </Link>
                <h1 className="text-xl font-bold text-white">Rules & Regulations</h1>
                <p className="text-xs text-white/30 mt-1">Please read our platform rules carefully for a fair gaming environment.</p>
            </div>

            {/* Sections */}
            <div className="space-y-3">
                {sections.map((section, i) => (
                    <div key={i} className="bg-[#1a1d21] rounded-xl border border-white/[0.06] overflow-hidden">
                        <div className="px-4 py-3 flex items-center gap-3 border-b border-white/[0.04]">
                            <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center flex-shrink-0`}>
                                <section.icon size={16} className={section.color} />
                            </div>
                            <h2 className="text-sm font-bold text-white">{section.title}</h2>
                        </div>
                        <div className="px-4 py-3 space-y-2.5">
                            {section.items.map((item, j) => (
                                <div key={j} className="flex gap-2.5 text-[13px] text-white/50 leading-relaxed">
                                    <span className="text-white/15 mt-0.5 flex-shrink-0">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-center text-[10px] text-white/15 py-2">
                Last updated: February 10, 2026
            </div>
        </div>
    );
}
