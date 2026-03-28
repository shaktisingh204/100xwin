"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Search, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "@/services/api";

interface CasinoTx {
  id: string;
  gameName?: string;
  gameProvider?: string;
  type: "bet" | "win" | "refund";
  amount: number;
  createdAt: string;
  status?: string;
  roundId?: string;
}

export default function CasinoTransactionsPage() {
  const [txns, setTxns] = useState<CasinoTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "bet" | "win">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get("/casino/transactions?limit=50")
      .then(res => setTxns(res.data?.data || res.data || []))
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? txns : txns.filter(t => t.type === filter);

  const totalBet  = txns.filter(t => t.type === "bet").reduce((a, t) => a + t.amount, 0);
  const totalWin  = txns.filter(t => t.type === "win").reduce((a, t) => a + t.amount, 0);
  const netPnl    = totalWin - totalBet;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck size={20} className="text-indigo-400" /> Casino Transactions
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Your casino game activity</p>
        </div>
      </div>

      {/* Stats */}
      {txns.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Bet", value: `₹${totalBet.toLocaleString("en-IN")}`, color: "text-red-400" },
            { label: "Total Won", value: `₹${totalWin.toLocaleString("en-IN")}`, color: "text-green-400" },
            { label: "Net P&L",  value: `${netPnl >= 0 ? "+" : ""}₹${Math.abs(netPnl).toLocaleString("en-IN")}`, color: netPnl >= 0 ? "text-green-400" : "text-red-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#0a0d14]/80 border border-white/[0.06] rounded-2xl p-3 text-center">
              <p className={`text-base font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 bg-[#0a0d14]/80 border border-white/[0.06] rounded-xl p-1">
        {(["all", "bet", "win"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
            {f === "all" ? "All" : f === "bet" ? "Bets" : "Wins"}
          </button>
        ))}
      </div>

      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 mb-4">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-black text-white mb-2">No Casino Activity</h3>
            <p className="text-sm text-white/40 mb-6">Play casino games to see your activity here.</p>
            <Link href="/casino" className="inline-flex px-6 py-2.5 bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-black font-bold rounded-xl text-sm">
              Go to Casino
            </Link>
          </div>
        ) : (
          <div>
            {filtered.map(tx => {
              const isWin = tx.type === "win";
              const isExp = expanded === tx.id;
              return (
                <div key={tx.id} className="border-b border-white/[0.04] last:border-0">
                  <button onClick={() => setExpanded(isExp ? null : tx.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${isWin ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {isWin ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{tx.gameName || "Casino Game"}</p>
                      <p className="text-xs text-white/40 mt-0.5">{tx.gameProvider || "—"} · {new Date(tx.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="text-right shrink-0 mr-1">
                      <p className={`text-sm font-bold ${isWin ? "text-green-400" : "text-red-400"}`}>
                        {isWin ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-white/30 capitalize mt-0.5">{tx.type}</p>
                    </div>
                    {isExp ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </button>
                  {isExp && tx.roundId && (
                    <div className="mx-4 mb-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <p className="text-xs text-white/40">Round ID: <span className="font-mono text-white/60">{tx.roundId}</span></p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
}
