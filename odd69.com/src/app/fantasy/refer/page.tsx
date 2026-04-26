"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Gift, Loader2, Share2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

const HOW_IT_WORKS = [
  { step: "1", title: "Share your code", desc: "Invite friends with your unique referral code via WhatsApp, SMS or link." },
  { step: "2", title: "Friend joins & plays", desc: "They sign up with your code and enter their first paid contest." },
  { step: "3", title: "Earn ₹100 + 25% lifetime", desc: "Get ₹100 instantly plus 25% lifetime commission on their fees." },
];

export default function ReferEarnPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) router.replace("/"); }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    try {
      const profileRes = await api.get("/auth/profile");
      if (profileRes.data) setReferralCode(profileRes.data.referralCode || profileRes.data.username || "");
      const statsRes = await api.get("/referral/stats").catch(() => null);
      if (statsRes?.data) setReferralStats(statsRes.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading && user) fetchData(); }, [authLoading, user, fetchData]);

  const code = referralCode || user?.username || "ZEERO";

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Zeero Fantasy",
          text: `Join me on Zeero Fantasy! Use code ${code} for ₹100 bonus.`,
          url: "https://odd69.com/fantasy",
        });
        return;
      } catch { /* fall through */ }
    }
    await copyCode();
  };

  if (authLoading || !user) return <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">Loading...</div>;

  const invites = referralStats?.totalReferrals || 0;
  const joined = referralStats?.successfulReferrals || 0;
  const pending = invites - joined;
  const earned = referralStats?.totalEarned || 0;

  return (
    <FantasyShell title="Refer & Earn" subtitle="Invite friends and earn real cash" backHref="/fantasy">
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-[#f59e0b]" /></div>
      ) : (
        <>
          {/* Hero — amber/orange gradient */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 md:p-8 mb-4 shadow-xl shadow-amber-500/25 text-[#1a1208] relative overflow-hidden">
            <Gift size={200} className="absolute -right-8 -bottom-10 text-white/10" strokeWidth={1.5} />
            <div className="relative flex flex-col md:flex-row md:items-center gap-5">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0 mx-auto md:mx-0">
                <Gift size={42} className="text-[#1a1208]" strokeWidth={2} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="font-black text-2xl md:text-3xl leading-tight mb-2 tracking-tight">
                  Refer & Earn <span className="text-[#1a1208]">₹100</span>
                </h2>
                <p className="text-[#1a1208]/80 text-xs md:text-sm font-semibold leading-relaxed mb-4 max-w-md mx-auto md:mx-0">
                  Plus earn 25% lifetime commission on every contest fee your friends pay.
                </p>

                {/* Code box */}
                <div className="rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm p-3 flex items-center gap-3 max-w-sm mx-auto md:mx-0">
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase text-[#1a1208]/60 mb-0.5 tracking-widest">Your code</p>
                    <p className="font-black text-xl tracking-[0.2em] text-[#1a1208]">{code.toUpperCase()}</p>
                  </div>
                  <button onClick={copyCode} className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] flex items-center justify-center hover:opacity-90 transition-all shadow-md" aria-label="Copy">
                    {copied ? <Check size={17} strokeWidth={3} /> : <Copy size={17} strokeWidth={2.5} />}
                  </button>
                  <button onClick={share} className="w-10 h-10 rounded-lg bg-white/15 border border-white/20 text-[#1a1208] flex items-center justify-center hover:bg-white/25 transition-all" aria-label="Share">
                    <Share2 size={17} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4 mb-4">
            <h3 className="text-white font-black text-sm mb-3 tracking-tight">Your Invites</h3>
            <div className="grid grid-cols-4 gap-2">
              <StatBlock label="Invites" value={String(invites)} />
              <StatBlock label="Joined" value={String(joined)} />
              <StatBlock label="Pending" value={String(Math.max(0, pending))} />
              <StatBlock label="Earned" value={`₹${earned}`} color="text-green-400" />
            </div>
          </div>

          <button onClick={share} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-[#1a1208] py-4 font-black text-sm transition-all shadow-lg shadow-amber-500/25 mb-6 uppercase tracking-wide">
            <Share2 size={17} strokeWidth={2.75} /> Refer a Friend
          </button>

          {/* How it works */}
          <h3 className="text-white font-black text-lg mb-3 tracking-tight">How does it work?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4 hover:border-amber-500/40 transition-all">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-500/40 flex items-center justify-center mb-2.5">
                  <span className="text-[#1a1208] font-black text-sm">{s.step}</span>
                </div>
                <p className="text-white font-black text-sm mb-0.5 tracking-tight">{s.title}</p>
                <p className="text-white/50 text-[11px] font-semibold leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </FantasyShell>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
      <p className={`font-black text-base tracking-tight ${color || "text-white"}`}>{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mt-0.5">{label}</p>
    </div>
  );
}
