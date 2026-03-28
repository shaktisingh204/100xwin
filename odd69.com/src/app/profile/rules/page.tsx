"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, ChevronRight } from "lucide-react";

export default function RulesPage() {
  const rules = [
    { title: "General Terms & Conditions", updated: "March 2026" },
    { title: "Sports Betting Rules", updated: "March 2026" },
    { title: "Casino Fair Play Policy", updated: "February 2026" },
    { title: "Withdrawal Policy", updated: "January 2026" },
    { title: "Privacy Policy", updated: "March 2026" },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-gray-400" />
            Rules & Policies
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Important platform guidelines</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {rules.map((rule, idx) => (
            <button key={idx} className="flex flex-col items-start w-full p-5 hover:bg-white/[0.02] transition-colors group text-left">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                  {rule.title}
                </span>
                <ChevronRight size={18} className="text-white/20 group-hover:text-white/50 transition-colors group-hover:translate-x-1" />
              </div>
              <span className="text-xs font-medium text-white/30 tracking-widest uppercase mt-1">
                Updated {rule.updated}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-8" />
    </div>
  );
}
