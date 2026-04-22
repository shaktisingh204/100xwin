"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Gift, Loader2, Plus, Timer } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

interface Txn { id: number; type: string; amount: number; status: string; remarks: string; createdAt: string; paymentMethod: string; }

export default function FantasyWalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState(0);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [fantasyWinnings, setFantasyWinnings] = useState(0);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) router.replace("/"); }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([api.get("/auth/profile"), api.get("/fantasy/stats").catch(() => null)]);
      if (profileRes.data) { setBalance(parseFloat(profileRes.data.balance || 0)); setTotalDeposited(parseFloat(profileRes.data.totalDeposited || 0)); }
      if (statsRes?.data) setFantasyWinnings(statsRes.data.totalWinnings || 0);
      const txnRes = await api.get("/transactions/my", { params: { limit: 20 } }).catch(() => null);
      if (txnRes?.data) {
        const all = Array.isArray(txnRes.data) ? txnRes.data : txnRes.data.transactions || [];
        setTransactions(all.filter((t: any) => t.type?.includes('FANTASY') || t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL' || t.type === 'ADMIN_DEPOSIT' || t.type === 'BONUS').slice(0, 10));
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading && user) fetchData(); }, [authLoading, user, fetchData]);

  if (authLoading || !user) return <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">Loading...</div>;

  return (
    <FantasyShell title="Fantasy Wallet" subtitle="Your main Zeero wallet powers fantasy" backHref="/fantasy">
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-amber-500" /></div>
      ) : (
        <>
          {/* Balance card — amber gradient */}
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 rounded-2xl p-5 md:p-7 mb-4 shadow-xl shadow-amber-500/25 text-white relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(120deg, transparent 0 20px, rgba(255,255,255,0.9) 20px 21px)",
              }}
            />
            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Total Balance</p>
              <p className="text-3xl md:text-4xl font-black mb-5 tracking-tight">
                ₹{Math.floor(balance).toLocaleString("en-IN")}
                <span className="text-lg text-white/60 font-bold">.{((balance % 1) * 100).toFixed(0).padStart(2, "0")}</span>
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-3">
                  <p className="text-[9px] font-black uppercase text-white/60 tracking-widest">Deposited</p>
                  <p className="text-white font-black text-base mt-0.5 tracking-tight">₹{totalDeposited.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-3">
                  <p className="text-[9px] font-black uppercase text-white/60 tracking-widest">Fantasy Winnings</p>
                  <p className="text-amber-300 font-black text-base mt-0.5 tracking-tight">₹{fantasyWinnings.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link prefetch href="/deposit" className="flex items-center justify-center gap-2 rounded-xl bg-white text-[#1a1208] py-3 font-black text-xs transition-all hover:bg-amber-50 shadow-md uppercase tracking-wide">
                  <Plus size={16} strokeWidth={3} /> Add Cash
                </Link>
                <Link prefetch href="/withdraw" className="flex items-center justify-center gap-2 rounded-xl bg-white/15 text-white border border-white/25 py-3 font-black text-xs hover:bg-white/25 transition-all uppercase tracking-wide">
                  <ArrowUpRight size={16} strokeWidth={2.75} /> Withdraw
                </Link>
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4 mb-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Gift size={17} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-white font-black text-sm mb-0.5 tracking-tight">Same Wallet, More Fun</p>
              <p className="text-white/40 text-[11px] font-semibold leading-relaxed">Your main Zeero wallet powers fantasy. Deposit once, play everywhere.</p>
            </div>
          </div>

          {/* Transactions */}
          <h2 className="text-white font-black text-lg mb-3 tracking-tight">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-10 text-center">
              <p className="text-white/40 font-semibold text-sm">No transactions yet.</p>
            </div>
          ) : (
            <div className="space-y-1.5 pb-6">
              {transactions.map((t) => <TxnRow key={t.id} txn={t} />)}
            </div>
          )}
        </>
      )}
    </FantasyShell>
  );
}

function TxnRow({ txn }: { txn: Txn }) {
  const type = txn.type || '';
  const isEntry = type.includes('FANTASY_ENTRY');
  const isWin = type.includes('FANTASY_WINNING');
  const isDeposit = type.includes('DEPOSIT');
  const isWithdraw = type.includes('WITHDRAWAL');
  const isNeg = isEntry || isWithdraw;

  const icon = isDeposit ? <ArrowDownLeft size={15} strokeWidth={2.5} /> : isWithdraw ? <ArrowUpRight size={15} strokeWidth={2.5} /> : isWin ? <CheckCircle2 size={15} strokeWidth={2.5} /> : isEntry ? <ArrowUpRight size={15} strokeWidth={2.5} /> : <Gift size={15} strokeWidth={2.5} />;
  const iconBg = isDeposit ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : isWithdraw ? "bg-red-500/15 text-red-400 border-red-500/30" : isWin ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : isEntry ? "bg-white/[0.04] text-white/40 border-white/[0.06]" : "bg-purple-500/15 text-purple-400 border-purple-500/30";
  const dateStr = txn.createdAt ? new Date(txn.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const isPending = txn.status === 'PENDING';
  const amount = parseFloat(String(txn.amount)) || 0;

  return (
    <div className="flex items-center gap-3 p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-black text-[13px] truncate tracking-tight">{txn.remarks || type.replace(/_/g, ' ')}</p>
        <p className="text-white/40 text-[10px] font-bold mt-0.5 flex items-center gap-1">
          {isPending && <Timer size={10} />} {dateStr} {isPending && " · Pending"}
        </p>
      </div>
      <span className={`text-[15px] font-black tracking-tight ${isNeg ? "text-red-400" : "text-emerald-400"}`}>
        {isNeg ? "-" : "+"}₹{Math.abs(amount).toLocaleString("en-IN")}
      </span>
    </div>
  );
}
