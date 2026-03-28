"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Share2 } from "lucide-react";

export default function ReferralPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Gift size={20} className="text-amber-400" />
            Refer & Earn
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Invite friends and get rewards</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 md:p-10 min-h-[50vh] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] shadow-[0_0_30px_rgba(245,158,11,0.3)] flex items-center justify-center text-[#1a1200] mb-6">
            <Share2 size={32} />
          </div>
          <h3 className="text-2xl font-black text-white mb-3">Earn Together</h3>
          <p className="text-sm font-medium text-white/50 leading-relaxed mb-6">
            Invite your friends to odd69. When they register and deposit, you both get a special bonus reward directly into your wallet.
          </p>
          
          <div className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 flex items-center justify-between">
            <span className="text-white/40 text-sm font-bold font-mono">ODD69-VIP</span>
            <button className="text-[#f59e0b] text-sm font-bold uppercase tracking-wider hover:text-amber-300 transition-colors">
              Copy Link
            </button>
          </div>
        </div>
      </div>
      
      <div className="h-8" />
    </div>
  );
}
