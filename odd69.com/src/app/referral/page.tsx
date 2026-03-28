"use client";

import { useState, useEffect } from "react";
import { Users, Copy, CheckCircle, Gift, ArrowRight, TrendingUp, Coins, Users2, Loader2, Star, Sparkles, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import { ReferralService, type ReferralStats } from "@/services/referral.service";
import api from "@/services/api";
import toast from "react-hot-toast";

interface RewardRule {
  id: number;
  rewardName: string;
  eventType: string;
  amount: number;
  isActive: boolean;
}

const steps = [
  { icon: <Users size={16} />, title: "Share Your Link", desc: "Send your unique referral link to friends and family." },
  { icon: <Gift size={16} />, title: "Friend Signs Up", desc: "They register using your link and create an account." },
  { icon: <Coins size={16} />, title: "They Play", desc: "When they start playing and meet the requirements." },
  { icon: <TrendingUp size={16} />, title: "You Earn", desc: "Get rewarded for each qualifying referral!" },
];

export default function ReferralPage() {
  const { isAuthenticated, token } = useAuth();
  const { openLogin } = useModal();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rewards, setRewards] = useState<RewardRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rewardResp] = await Promise.allSettled([
          api.get("/referral/rewards"),
        ]);
        if (rewardResp.status === "fulfilled") setRewards(rewardResp.value.data || []);

        if (isAuthenticated) {
          const s = await ReferralService.getStats(token);
          setStats(s);
        }
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, [isAuthenticated, token]);

  const handleCopy = () => {
    if (!stats?.referralCode) return;
    const link = `${window.location.origin}/auth/signup?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleGenerateCode = async () => {
    if (!token) return;
    setGeneratingCode(true);
    try {
      const { code } = await ReferralService.generateCode(token);
      setStats(prev => prev ? { ...prev, referralCode: code } : { referralCode: code, totalInvited: 0, totalEarnings: 0, pendingEarnings: 0, recentReferrals: [], recentHistory: [] });
      toast.success("Referral code generated!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const referralLink = stats?.referralCode ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${stats.referralCode}` : "";

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 pb-24">
      {/* Header */}
      <div className="text-center mb-10 relative">
        <div className="absolute inset-0 flex justify-center -mt-8 pointer-events-none"><div className="w-72 h-72 rounded-full bg-emerald-500/5 blur-[100px]" /></div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
            <Users2 size={13} className="text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Refer & Earn</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            Invite Friends, <span className="text-emerald-400">Earn Rewards</span>
          </h1>
          <p className="text-sm text-white/25">Share your referral link and earn for each friend who joins!</p>
        </div>
      </div>

      {/* Stats / Link */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-white/20" /></div>
      ) : !isAuthenticated ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 text-center mb-10">
          <Users size={28} className="text-white/10 mx-auto mb-3" />
          <h3 className="text-sm font-black text-white mb-2">Log in to start earning</h3>
          <p className="text-xs text-white/25 mb-5">Create an account or log in to get your referral link.</p>
          <button onClick={openLogin} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-sm uppercase tracking-wider px-6 py-3 rounded-xl hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] transition-all">
            Get Started <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="mb-10">
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 text-center">
              <p className="text-xl font-black text-white">{stats?.totalInvited || 0}</p>
              <p className="text-[10px] text-white/20 uppercase font-bold mt-1">Referrals</p>
            </div>
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 text-center">
              <p className="text-xl font-black text-emerald-400">₹{stats?.totalEarnings?.toLocaleString() || "0"}</p>
              <p className="text-[10px] text-white/20 uppercase font-bold mt-1">Total Earned</p>
            </div>
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 text-center">
              <p className="text-xl font-black text-[#f59e0b]">₹{stats?.pendingEarnings?.toLocaleString() || "0"}</p>
              <p className="text-[10px] text-white/20 uppercase font-bold mt-1">Pending</p>
            </div>
          </div>

          {/* Referral link */}
          {stats?.referralCode ? (
            <div className="bg-white/[0.02] border border-emerald-500/15 rounded-2xl p-5">
              <p className="text-[10px] text-white/20 uppercase font-bold mb-2">Your Referral Link</p>
              <div className="flex gap-2 items-center">
                <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-xs text-white/50 font-mono truncate select-all">
                  {referralLink}
                </div>
                <button onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-lg text-xs font-bold transition-all ${copied ? "bg-emerald-500/20 text-emerald-400" : "bg-[#f59e0b]/15 text-[#f59e0b] hover:bg-[#f59e0b]/25"}`}>
                  {copied ? <><CheckCircle size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <p className="text-[10px] text-white/15 mt-2">Code: <span className="text-white/30 font-mono">{stats.referralCode}</span></p>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 text-center">
              <p className="text-xs text-white/25 mb-3">You don&apos;t have a referral code yet.</p>
              <button onClick={handleGenerateCode} disabled={generatingCode}
                className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-5 py-2.5 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-40">
                {generatingCode ? <Loader2 size={12} className="animate-spin" /> : <Gift size={14} />} Generate Referral Code
              </button>
            </div>
          )}

          {/* Recent referrals */}
          {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2"><Users size={13} className="text-emerald-400" /> Recent Referrals</h3>
              <div className="space-y-1.5">
                {stats.recentReferrals.slice(0, 5).map(r => (
                  <div key={r.id} className="bg-white/[0.015] border border-white/[0.04] rounded-lg px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-white/50 font-bold">{r.username}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">₹{r.totalEarned}</span>
                      <span className="text-white/15">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="mb-10">
        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          <Sparkles size={16} className="text-[#f59e0b]" /> How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((s, i) => (
            <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-5 text-center relative">
              <div className="absolute top-3 right-3 text-[10px] font-black text-white/8">0{i + 1}</div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">{s.icon}</div>
              <h3 className="text-xs font-black text-white mb-1">{s.title}</h3>
              <p className="text-[10px] text-white/25 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reward Milestones — from backend */}
      {rewards.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <Star size={16} className="text-[#f59e0b]" fill="currentColor" /> Reward Milestones
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rewards.filter(r => r.isActive).map(r => (
              <div key={r.id} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-5 hover:border-emerald-500/15 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-white">{r.rewardName}</h3>
                  <span className="text-emerald-400 font-black text-sm">₹{r.amount}</span>
                </div>
                <p className="text-[10px] text-white/20">
                  Trigger: <span className="text-white/35 font-mono">{r.eventType.replace(/_/g, " ").toLowerCase()}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terms */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 text-center">
        <p className="text-xs text-white/20 leading-relaxed">
          Referral rewards are subject to our terms and conditions. Self-referrals or fraudulent activity will result
          in forfeiture of earnings. Minimum requirements may apply before earnings are credited.
        </p>
      </div>
    </div>
  );
}
