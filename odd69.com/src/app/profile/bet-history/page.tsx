"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, History, Search, TrendingUp, TrendingDown, Minus, Clock, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/services/api";

interface Bet {
  id: string;
  eventName?: string;
  marketName?: string;
  selection?: string;
  odds: number;
  stake: number;
  potentialWin: number;
  status: "open" | "won" | "lost" | "void" | "settled";
  createdAt: string;
  settledAt?: string;
  profit?: number;
  type?: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  won:     { label: "Won",     color: "text-green-400",  icon: TrendingUp   },
  lost:    { label: "Lost",    color: "text-red-400",    icon: TrendingDown },
  open:    { label: "Open",    color: "text-yellow-400", icon: Clock        },
  void:    { label: "Void",    color: "text-gray-400",   icon: Minus        },
  settled: { label: "Settled", color: "text-blue-400",   icon: Minus        },
};

function BetRow({ bet }: { bet: Bet }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[bet.status] ?? STATUS_CFG.open;
  const Icon = cfg.icon;

  return (
    <div className="border-b border-white/[0.04] last:border-0">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${bet.status === "won" ? "bg-green-500/10" : bet.status === "lost" ? "bg-red-500/10" : "bg-white/[0.04]"}`}>
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{bet.eventName || "Sports Bet"}</p>
          <p className="text-xs text-white/40 mt-0.5 truncate">
            {bet.selection || bet.marketName || "—"} · {new Date(bet.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold ${bet.status === "won" ? "text-green-400" : bet.status === "lost" ? "text-red-400" : "text-white"}`}>
            {bet.status === "won" ? `+₹${(bet.profit ?? bet.potentialWin - bet.stake).toFixed(0)}` :
             bet.status === "lost" ? `-₹${bet.stake}` :
             `₹${bet.stake}`}
          </p>
          <div className={`text-[10px] mt-0.5 ${cfg.color}`}>{cfg.label}</div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
      </button>

      {expanded && (
        <div className="mx-4 mb-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: "Stake", value: `₹${bet.stake.toLocaleString("en-IN")}` },
            { label: "Odds",  value: bet.odds.toFixed(2) },
            { label: "Win",   value: `₹${bet.potentialWin.toLocaleString("en-IN")}` },
            { label: "Type",  value: bet.type || "Standard" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BetHistoryPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "won" | "lost">("all");

  useEffect(() => {
    setLoading(true);
    api.get("/bets/my?limit=50")
      .then(res => setBets(res.data?.data || res.data?.bets || res.data || []))
      .catch(() => setBets([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? bets : bets.filter(b => b.status === filter);

  const stats = {
    total: bets.length,
    won: bets.filter(b => b.status === "won").length,
    lost: bets.filter(b => b.status === "lost").length,
    profit: bets.reduce((acc, b) => acc + (b.status === "won" ? (b.profit ?? b.potentialWin - b.stake) : b.status === "lost" ? -b.stake : 0), 0),
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <History size={20} className="text-purple-400" /> Bet History
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Your sports betting activity</p>
        </div>
      </div>

      {/* Stats */}
      {bets.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Bets", value: stats.total, color: "text-white" },
            { label: "Won", value: stats.won, color: "text-green-400" },
            { label: "Lost", value: stats.lost, color: "text-red-400" },
            { label: "P&L", value: `${stats.profit >= 0 ? "+" : ""}₹${Math.abs(stats.profit).toFixed(0)}`, color: stats.profit >= 0 ? "text-green-400" : "text-red-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#0a0d14]/80 border border-white/[0.06] rounded-2xl p-3 text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 bg-[#0a0d14]/80 border border-white/[0.06] rounded-xl p-1">
        {(["all", "open", "won", "lost"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Bet list */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 mb-4">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-black text-white mb-2">No Bets Found</h3>
            <p className="text-sm text-white/40 mb-6">Place your first sports bet to see it here.</p>
            <Link href="/sports" className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-black font-bold rounded-xl text-sm">
              Go to Sports
            </Link>
          </div>
        ) : (
          <div>{filtered.map(b => <BetRow key={b.id} bet={b} />)}</div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}
