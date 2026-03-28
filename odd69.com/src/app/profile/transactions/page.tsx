"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, Search, ArrowDownLeft, ArrowUpRight, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import api from "@/services/api";
import { useModal } from "@/context/ModalContext";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: "pending" | "approved" | "rejected" | "processing";
  createdAt: string;
  utr?: string;
  method?: string;
  note?: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; label: string }> = {
  approved:   { icon: CheckCircle,  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20", label: "Approved" },
  pending:    { icon: Clock,        color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Pending"  },
  processing: { icon: RefreshCw,    color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",   label: "Processing" },
  rejected:   { icon: XCircle,      color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",     label: "Rejected"  },
};

function TxRow({ tx }: { tx: Transaction }) {
  const isDeposit = tx.type === "deposit";
  const cfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const date = new Date(tx.createdAt);

  return (
    <div className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDeposit ? "bg-green-500/10" : "bg-red-500/10"}`}>
        {isDeposit
          ? <ArrowDownLeft className="w-5 h-5 text-green-400" />
          : <ArrowUpRight  className="w-5 h-5 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white capitalize">{tx.type}</p>
          {tx.method && <span className="text-[10px] text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{tx.method}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-white/40">{date.toLocaleDateString("en-IN")} · {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
          {tx.utr && <span className="text-[10px] text-white/30 font-mono">UTR: {tx.utr}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${isDeposit ? "text-green-400" : "text-red-400"}`}>
          {isDeposit ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
        </p>
        <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
          <Icon className="w-2.5 h-2.5" />
          {cfg.label}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { openDeposit, openWithdraw } = useModal();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "deposit" | "withdrawal">("all");

  useEffect(() => {
    setLoading(true);
    api.get("/transactions/my")
      .then(res => setTxns(res.data?.data || res.data || []))
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? txns : txns.filter(t => t.type === filter);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Wallet size={20} className="text-emerald-400" /> Transactions
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Deposits and withdrawals</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openDeposit} className="px-3 py-1.5 text-xs font-bold bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors">
            + Deposit
          </button>
          <button onClick={openWithdraw} className="px-3 py-1.5 text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
            Withdraw
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#0a0d14]/80 border border-white/[0.06] rounded-xl p-1">
        {(["all", "deposit", "withdrawal"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
            {f === "all" ? "All" : f === "deposit" ? "Deposits" : "Withdrawals"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 mb-4">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-black text-white mb-2">No Transactions Found</h3>
            <p className="text-sm text-white/40 mb-6">Your deposit and withdrawal history will appear here.</p>
            <button onClick={openDeposit} className="px-6 py-2.5 bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-black font-bold rounded-xl text-sm">
              Make a Deposit
            </button>
          </div>
        ) : (
          <div>
            {filtered.map(tx => <TxRow key={tx.id} tx={tx} />)}
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}
