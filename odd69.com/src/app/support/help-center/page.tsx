"use client";

import Link from "next/link";
import { HelpCircle, Search, ChevronRight, BookOpen, CreditCard, Shield, Gamepad2, UserCheck, Settings, AlertTriangle, Gift } from "lucide-react";
import { useState } from "react";

const categories = [
  {
    icon: <UserCheck size={20} />,
    title: "Account & Registration",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    articles: [
      "How to create an account",
      "KYC verification process",
      "How to change your password",
      "Updating your profile information",
      "Managing notification preferences",
    ],
  },
  {
    icon: <CreditCard size={20} />,
    title: "Deposits & Withdrawals",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    articles: [
      "Available deposit methods (UPI, Crypto)",
      "Minimum & maximum deposit limits",
      "How to withdraw your winnings",
      "Withdrawal processing times",
      "How to set deposit limits",
    ],
  },
  {
    icon: <Gamepad2 size={20} />,
    title: "Casino Games",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    articles: [
      "Game loading issues & troubleshooting",
      "Understanding RTP & game rules",
      "How provably fair works",
      "Autoplay and turbo mode features",
      "Progressive jackpot rules",
    ],
  },
  {
    icon: <BookOpen size={20} />,
    title: "Sports Betting",
    color: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20",
    articles: [
      "How to place a bet",
      "Understanding odds formats",
      "Cash Out feature guide",
      "Live & in-play betting rules",
      "Fancy & session market rules",
    ],
  },
  {
    icon: <Gift size={20} />,
    title: "Bonuses & Promotions",
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    articles: [
      "How welcome bonuses work",
      "Understanding wagering requirements",
      "How to apply a promo code",
      "Referral program details",
      "VIP tier benefits explained",
    ],
  },
  {
    icon: <Shield size={20} />,
    title: "Security & Responsible Gaming",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    articles: [
      "Two-factor authentication setup",
      "Self-exclusion & time limits",
      "Setting deposit & loss limits",
      "Reporting suspicious activity",
      "Account closure process",
    ],
  },
];

export default function HelpCenterPage() {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? categories.map((c) => ({
        ...c,
        articles: c.articles.filter((a) => a.toLowerCase().includes(search.toLowerCase())),
      })).filter((c) => c.articles.length > 0)
    : categories;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 pb-24">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-full mb-4">
          <HelpCircle size={13} className="text-[#f59e0b]" />
          <span className="text-[10px] font-black text-[#f59e0b] uppercase tracking-wider">Help Center</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-3">How can we help?</h1>
        <p className="text-sm text-white/25 mb-6">Search our knowledge base or browse by category</p>

        {/* Search */}
        <div className="max-w-md mx-auto relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            placeholder="Search for help..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((cat, i) => (
          <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-2xl overflow-hidden hover:border-white/[0.08] transition-colors">
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${cat.color}`}>
                {cat.icon}
              </div>
              <h2 className="text-sm font-black text-white">{cat.title}</h2>
              <span className="ml-auto text-[10px] font-bold text-white/15 bg-white/[0.03] px-2 py-0.5 rounded-full">
                {cat.articles.length}
              </span>
            </div>
            <div className="p-2">
              {cat.articles.map((article, j) => (
                <button key={j} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.02] transition-colors text-left">
                  <ChevronRight size={11} className="text-white/10 flex-shrink-0" />
                  {article}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <AlertTriangle size={24} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/25 mb-1">No results found for &quot;{search}&quot;</p>
          <p className="text-xs text-white/15">Try a different search term or <Link href="/support" className="text-[#f59e0b] hover:underline">contact support</Link></p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-10 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 text-center">
        <h3 className="text-sm font-black text-white mb-2">Still need help?</h3>
        <p className="text-xs text-white/25 mb-4">Our support team is available 24/7 to assist you.</p>
        <Link href="/support" className="inline-flex items-center gap-2 bg-[#f59e0b]/15 text-[#f59e0b] font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-[#f59e0b]/25 transition-colors">
          Contact Support <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
