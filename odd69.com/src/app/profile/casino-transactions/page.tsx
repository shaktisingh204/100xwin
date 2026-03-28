"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Search } from "lucide-react";

export default function CasinoTransactionsPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck size={20} className="text-indigo-400" />
            Casino Transactions
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Your casino betting activity</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 md:p-10 min-h-[50vh] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 mb-4 shadow-inner">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-black text-white mb-2">No Records Found</h3>
          <p className="text-sm font-medium text-white/40 leading-relaxed">
            You haven't played any casino games yet. Jump in and try your luck!
          </p>
          
          <Link href="/casino" className="mt-6 h-12 px-6 rounded-xl font-black text-sm uppercase tracking-widest text-[#1a1200] overflow-hidden transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] bg-[length:200%_auto] group-hover:bg-[position:right_center] transition-all duration-500" />
            <div className="relative h-full flex items-center justify-center gap-2">
              Play Casino
            </div>
          </Link>
        </div>
      </div>
      
      <div className="h-8" />
    </div>
  );
}
