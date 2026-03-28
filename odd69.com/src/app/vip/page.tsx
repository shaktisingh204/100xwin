"use client";

import { useState, useEffect } from "react";
import { Crown, Star, Gift, Zap, Shield, TrendingUp, Gem, Award, ArrowRight, Sparkles, Loader2, CheckCircle, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import { vipApi, type VipApplicationStatus } from "@/services/vip";
import toast from "react-hot-toast";

const tiers = [
  {
    name: "Bronze", color: "from-amber-700 to-amber-900", border: "border-amber-700/30",
    badge: "bg-amber-700/20 text-amber-500", wager: "₹0 – ₹50K", cashback: "0.5%",
    perks: ["Daily login bonus", "Standard support", "Weekly promotions"],
  },
  {
    name: "Silver", color: "from-gray-400 to-gray-600", border: "border-gray-400/30",
    badge: "bg-gray-400/20 text-gray-300", wager: "₹50K – ₹5L", cashback: "1%",
    perks: ["Increased limits", "Priority support", "Monthly cashback", "Birthday bonus"],
  },
  {
    name: "Gold", color: "from-[#f59e0b] to-[#d97706]", border: "border-[#f59e0b]/30",
    badge: "bg-[#f59e0b]/20 text-[#f59e0b]", wager: "₹5L – ₹25L", cashback: "2%",
    perks: ["Personal account manager", "Exclusive promotions", "Higher withdrawal limits", "VIP events access", "Weekly cashback"],
    popular: true,
  },
  {
    name: "Platinum", color: "from-cyan-400 to-blue-600", border: "border-cyan-400/30",
    badge: "bg-cyan-400/20 text-cyan-400", wager: "₹25L+", cashback: "3%",
    perks: ["Dedicated VIP host", "Custom bet limits", "Instant withdrawals", "Exclusive tournaments", "Luxury gifts & trips", "Loss rebates"],
  },
];

const benefits = [
  { icon: <Gift size={18} />, title: "Exclusive Bonuses", desc: "Personalized bonus offers based on your playing style." },
  { icon: <Zap size={18} />, title: "Faster Withdrawals", desc: "Priority processing with some withdrawals completed instantly." },
  { icon: <Shield size={18} />, title: "Dedicated Support", desc: "Gold+ members get a personal account manager available 24/7." },
  { icon: <TrendingUp size={18} />, title: "Higher Limits", desc: "Increased deposit, withdrawal, and bet limits." },
  { icon: <Gem size={18} />, title: "Luxury Rewards", desc: "Invitations to exclusive events and luxury experiences." },
  { icon: <Award size={18} />, title: "Cashback Program", desc: "Weekly cashback on net losses, increasing with each tier." },
];

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400",
  UNDER_REVIEW: "bg-blue-500/15 text-blue-400",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  REJECTED: "bg-red-500/15 text-red-400",
  TRANSFER_REQUESTED: "bg-purple-500/15 text-purple-400",
};

export default function VIPPage() {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModal();

  // VIP application state
  const [existing, setExisting] = useState<VipApplicationStatus | null>(null);
  const [loadingApp, setLoadingApp] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ message: "", currentPlatform: "", platformUsername: "", monthlyVolume: "" });

  // Fetch existing application on mount
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingApp(true);
      vipApi.getMyApplication()
        .then(app => setExisting(app))
        .finally(() => setLoadingApp(false));
    }
  }, [isAuthenticated]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await vipApi.apply({
        message: form.message || undefined,
        currentPlatform: form.currentPlatform || undefined,
        platformUsername: form.platformUsername || undefined,
        monthlyVolume: form.monthlyVolume ? Number(form.monthlyVolume) : undefined,
      });
      setExisting({ ...result, updatedAt: result.createdAt } as VipApplicationStatus);
      setShowForm(false);
      toast.success("VIP application submitted!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 pb-24">
      {/* Hero */}
      <div className="text-center mb-12 relative">
        <div className="absolute inset-0 flex justify-center -mt-8 pointer-events-none">
          <div className="w-72 h-72 rounded-full bg-[#f59e0b]/5 blur-[100px]" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-full mb-4">
            <Crown size={13} className="text-[#f59e0b]" />
            <span className="text-[10px] font-black text-[#f59e0b] uppercase tracking-wider">VIP Program</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3">VIP <span className="text-[#f59e0b]">Club</span></h1>
          <p className="text-sm text-white/25 max-w-lg mx-auto leading-relaxed">
            Play your favourite games and automatically climb through our exclusive tiers. The more you play, the more rewards you unlock.
          </p>

          {/* CTA / Application Status */}
          <div className="mt-6">
            {!isAuthenticated ? (
              <button onClick={openLogin} className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-black text-sm uppercase tracking-wider px-8 py-3 rounded-xl hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] transition-all">
                Join VIP Club <ArrowRight size={14} />
              </button>
            ) : loadingApp ? (
              <Loader2 size={20} className="animate-spin text-white/20 mx-auto" />
            ) : existing ? (
              <div className="inline-flex flex-col items-center gap-2">
                <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${statusColors[existing.status] || "bg-white/[0.05] text-white/40"}`}>
                  {existing.status === "APPROVED" && <CheckCircle size={14} />}
                  VIP Application: {existing.status.replace(/_/g, " ")}
                </div>
                {existing.reviewNotes && (
                  <p className="text-xs text-white/25 max-w-sm">{existing.reviewNotes}</p>
                )}
                {existing.status === "REJECTED" && (
                  <button onClick={() => setShowForm(true)} className="text-[#f59e0b] text-xs font-bold hover:underline mt-1">
                    Re-apply →
                  </button>
                )}
              </div>
            ) : (
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-black text-sm uppercase tracking-wider px-8 py-3 rounded-xl hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] transition-all">
                Apply for VIP <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIP Application Form */}
      {showForm && (
        <div className="max-w-md mx-auto mb-10">
          <form onSubmit={handleApply} className="bg-white/[0.02] border border-[#f59e0b]/15 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2"><Crown size={14} className="text-[#f59e0b]" /> VIP Application</h3>
            <input placeholder="Current betting platform (optional)" value={form.currentPlatform} onChange={e => setForm(p => ({ ...p, currentPlatform: e.target.value }))}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors" />
            <input placeholder="Username on that platform (optional)" value={form.platformUsername} onChange={e => setForm(p => ({ ...p, platformUsername: e.target.value }))}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors" />
            <input type="number" placeholder="Monthly volume in ₹ (optional)" value={form.monthlyVolume} onChange={e => setForm(p => ({ ...p, monthlyVolume: e.target.value }))}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors" />
            <textarea placeholder="Why should you be a VIP? (optional)" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors resize-none" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-white/30 hover:text-white/50 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#f59e0b]/20 text-[#f59e0b] text-xs font-bold rounded-lg hover:bg-[#f59e0b]/30 transition-colors disabled:opacity-40">
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Submit Application
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {tiers.map((t, i) => (
          <div key={i} className={`relative bg-white/[0.015] border ${t.border} rounded-2xl p-5 ${t.popular ? "ring-1 ring-[#f59e0b]/30" : ""}`}>
            {t.popular && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#f59e0b] rounded-full text-[9px] font-black text-black uppercase tracking-wider">Popular</div>}
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-3`}><Crown size={18} className="text-white" /></div>
            <h3 className="text-lg font-black text-white mb-0.5">{t.name}</h3>
            <div className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold ${t.badge} mb-3`}>{t.wager} wagered</div>
            <div className="text-xs text-white/40 mb-3"><span className="text-white font-bold text-lg">{t.cashback}</span> cashback</div>
            <ul className="space-y-1.5">
              {t.perks.map((p, j) => (
                <li key={j} className="flex items-center gap-2 text-[11px] text-white/25">
                  <Sparkles size={8} className="text-[#f59e0b]/50 flex-shrink-0" />{p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="mb-10">
        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          <Star size={16} className="text-[#f59e0b]" fill="currentColor" /> VIP Benefits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {benefits.map((b, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 hover:border-white/[0.08] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#f59e0b]/8 border border-[#f59e0b]/15 flex items-center justify-center text-[#f59e0b] mb-3">{b.icon}</div>
              <h3 className="text-xs font-black text-white mb-1">{b.title}</h3>
              <p className="text-[11px] text-white/25 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <h3 className="text-sm font-black text-white mb-4">How do I join?</h3>
        <p className="text-xs text-white/30 leading-relaxed mb-4">
          Click &quot;Apply for VIP&quot; above and fill in your details. Our team will review your application
          and you&apos;ll be notified of the outcome. High-volume players are automatically considered.
        </p>
        <p className="text-xs text-white/20">
          For VIP inquiries, contact our <a href="/support" className="text-[#f59e0b] hover:underline">VIP Support Team</a>.
        </p>
      </div>
    </div>
  );
}
