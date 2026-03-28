"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, Search } from "lucide-react";

export default function TransactionsPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Wallet size={20} className="text-emerald-400" />
            Transactions
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Deposits and withdrawals</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 md:p-10 min-h-[50vh] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 mb-4 shadow-inner">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-black text-white mb-2">No Transactions</h3>
          <p className="text-sm font-medium text-white/40 leading-relaxed">
            Your deposit and withdrawal history will appear here.
          </p>
        </div>
      </div>
      
      <div className="h-8" />
    </div>
  );
}
