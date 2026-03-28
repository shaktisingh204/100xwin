"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, ChevronDown, ChevronUp } from "lucide-react";

const RULES = [
  {
    title: "General Terms & Conditions",
    updated: "March 2026",
    content: "By using odd69.com, you agree to be at least 18 years of age. We reserve the right to suspend accounts involved in fraudulent activity. By participating on this platform, you accept all platform rules and agree to our privacy policy and data handling procedures.",
  },
  {
    title: "Sports Betting Rules",
    updated: "March 2026",
    content: "All bets are settled based on official results. Match-odds markets use decimal odds. Fancy/session markets use whole-number runs. Bets accepted after the event starts are valid only if accepted by our system. Bets on cancelled or abandoned matches are void. Minimum bet: ₹10.",
  },
  {
    title: "Casino Fair Play Policy",
    updated: "February 2026",
    content: "All casino games use certified RNG (Random Number Generator) technology. Bonus wagering requirements must be met before withdrawal. Bonus balances are not cashable — only winnings earned from bonus play are eligible for withdrawal after meeting wagering conditions.",
  },
  {
    title: "Withdrawal Policy",
    updated: "March 2026",
    content: "Minimum withdrawal is ₹200. Withdrawals are processed within 24-48 hours. First-time withdrawals require identity verification (KYC). UPI, IMPS, and crypto are supported. Withdrawals to unverified payment methods may be delayed for security review.",
  },
  {
    title: "Responsible Gaming",
    updated: "January 2026",
    content: "We are committed to responsible gaming. You can set deposit limits, loss limits, and self-exclusion periods at any time via your account settings. If you feel you may have a gambling problem, please contact support to activate self-exclusion immediately.",
  },
  {
    title: "Privacy Policy",
    updated: "March 2026",
    content: "We collect your personal data for account management and security purposes. Your data is never sold to third parties. We use industry-standard encryption for all data transmission. You may request data deletion at any time by contacting support.",
  },
  {
    title: "Bonus & Promotions Terms",
    updated: "March 2026",
    content: "All bonuses are subject to a minimum 8x wagering requirement unless otherwise stated. Bonuses cannot be withdrawn directly — only profits generated from bonus play. Promotional offers may be withdrawn or modified at any time. One bonus per user per promotion.",
  },
];

export default function RulesPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-gray-400" /> Rules & Policies
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Important platform guidelines</p>
        </div>
      </div>

      {/* Rules accordion */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        {RULES.map((rule, idx) => (
          <div key={idx} className="border-b border-white/[0.04] last:border-0">
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group text-left"
            >
              <div>
                <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{rule.title}</p>
                <p className="text-[10px] font-medium text-white/30 tracking-widest uppercase mt-0.5">
                  Updated {rule.updated}
                </p>
              </div>
              {openIdx === idx
                ? <ChevronUp size={16} className="text-white/30 shrink-0" />
                : <ChevronDown size={16} className="text-white/20 group-hover:text-white/40 shrink-0 transition-colors" />}
            </button>
            {openIdx === idx && (
              <div className="px-5 pb-5">
                <p className="text-sm text-white/40 leading-relaxed">{rule.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#0a0d14]/60 border border-white/[0.04] rounded-2xl p-4 text-center">
        <p className="text-xs text-white/30 leading-relaxed">
          For detailed legal documentation, visit our full{" "}
          <Link href="/legal" className="text-[#f59e0b] hover:underline">Legal Center</Link>.
          Questions? Contact our{" "}
          <Link href="/support" className="text-[#f59e0b] hover:underline">24/7 Support</Link>.
        </p>
      </div>

      <div className="h-8" />
    </div>
  );
}
