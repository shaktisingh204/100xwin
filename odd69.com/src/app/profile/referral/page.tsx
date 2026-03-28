"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Share2, Copy, Check, Users, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

interface ReferralData {
  code: string;
  totalReferrals: number;
  totalEarned: number;
  pendingEarnings: number;
  referrals?: Array<{ username: string; joinedAt: string; deposited: boolean; bonus: number }>;
}

export default function ReferralPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/referral/my")
      .then(res => setData(res.data?.data || res.data))
      .catch(() => {
        // Fallback: use username-based code
        setData({ code: user?.username?.toUpperCase() || "ODD69VIP", totalReferrals: 0, totalEarned: 0, pendingEarnings: 0 });
      })
      .finally(() => setLoading(false));
  }, [user]);

  const referralCode = data?.code || user?.username?.toUpperCase() || "ODD69VIP";
  const referralLink = `${typeof window !== "undefined" ? window.location.origin : "https://odd69.com"}/auth?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <Gift size={20} className="text-amber-400" /> Refer & Earn
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Invite friends and get rewards</p>
        </div>
      </div>

      {/* Hero card */}
      <div className="relative bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-3xl p-6 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] shadow-[0_0_30px_rgba(245,158,11,0.3)] flex items-center justify-center text-[#1a1200] mb-4">
            <Share2 size={28} />
          </div>
          <h3 className="text-2xl font-black text-white mb-2">Earn Together</h3>
          <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
            Invite friends to odd69. When they register and make their first deposit, you both earn a bonus!
          </p>
        </div>
      </div>

      {/* Stats */}
      {!loading && data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Referrals", value: data.totalReferrals, color: "text-blue-400" },
            { icon: TrendingUp, label: "Total Earned", value: `₹${data.totalEarned.toLocaleString("en-IN")}`, color: "text-green-400" },
            { icon: Gift, label: "Pending", value: `₹${data.pendingEarnings.toLocaleString("en-IN")}`, color: "text-amber-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-[#0a0d14]/80 border border-white/[0.06] rounded-2xl p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
              <p className={`text-lg font-black ${color}`}>{value}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Referral Code */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 shadow-2xl space-y-4">
        <h2 className="text-sm font-black text-white/60 uppercase tracking-widest">Your Referral Code</h2>
        <div className="flex items-center gap-3 bg-black/40 border border-white/[0.08] rounded-xl p-4">
          <span className="flex-1 text-white font-black text-xl tracking-widest font-mono">{referralCode}</span>
          <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-sm transition-colors">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <p className="text-xs text-white/30 text-center">Share this link:</p>
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
          <p className="flex-1 text-xs text-white/50 font-mono truncate">{referralLink}</p>
          <button onClick={handleCopy} className="shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/40" />}
          </button>
        </div>
      </div>

      {/* Referral list */}
      {data?.referrals && data.referrals.length > 0 && (
        <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/[0.04]">
            <h2 className="text-sm font-black text-white/60 uppercase tracking-widest">Your Referrals</h2>
          </div>
          {data.referrals.map((ref, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border-b border-white/[0.04] last:border-0">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{ref.username}</p>
                <p className="text-xs text-white/40">{new Date(ref.joinedAt).toLocaleDateString("en-IN")}</p>
              </div>
              <div className="text-right">
                {ref.deposited
                  ? <span className="text-xs text-green-400 font-bold">+₹{ref.bonus}</span>
                  : <span className="text-xs text-white/30">Not deposited</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
