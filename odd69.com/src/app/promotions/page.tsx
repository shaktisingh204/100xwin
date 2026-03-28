"use client";

import { useState, useEffect } from "react";
import { Gift, Tag, Clock, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import { promotionApi, type Promotion, type BonusPromotion } from "@/services/promotions";

/* The gradient palette applied round-robin when no custom gradient is set */
const gradients = [
  "from-[#f59e0b] to-[#d97706]",
  "from-emerald-500 to-emerald-700",
  "from-blue-500 to-blue-700",
  "from-purple-500 to-purple-700",
  "from-pink-500 to-rose-700",
  "from-orange-500 to-red-600",
];

export default function PromotionsPage() {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModal();

  const [promos, setPromos] = useState<Promotion[]>([]);
  const [bonuses, setBonuses] = useState<BonusPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "casino" | "sports" | "vip">("all");

  useEffect(() => {
    Promise.all([
      promotionApi.getAll(),
      promotionApi.getBonusConditions(),
    ]).then(([p, b]) => {
      setPromos(p);
      setBonuses(b.filter(x => x.isActive));
    }).finally(() => setLoading(false));
  }, []);

  /* Filter by tab */
  const filteredPromos = tab === "all"
    ? promos
    : promos.filter(p => {
        const cat = (p.category || "ALL").toUpperCase();
        return cat === tab.toUpperCase() || cat === "ALL";
      });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-full mb-4">
          <Tag size={13} className="text-[#f59e0b]" />
          <span className="text-[10px] font-black text-[#f59e0b] uppercase tracking-wider">Promotions</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">
          Bonuses & <span className="text-[#f59e0b]">Promotions</span>
        </h1>
        <p className="text-sm text-white/25 mt-2">Grab the best deals and boost your bankroll</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.02] border border-white/[0.04] rounded-xl mb-8 w-fit">
        {(["all","casino","sports","vip"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === t ? "bg-white/[0.08] text-white border border-white/10" : "text-white/25 hover:text-white/40"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-white/20" />
        </div>
      ) : (
        <>
          {/* Dynamic Promo Cards */}
          {filteredPromos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {filteredPromos.map((p, i) => (
                <div key={p._id} className="bg-white/[0.015] border border-white/[0.04] rounded-2xl overflow-hidden hover:border-white/[0.08] transition-all group">
                  {/* Colored header */}
                  <div className={`bg-gradient-to-r ${p.gradient ? "" : gradients[i % gradients.length]} p-5 relative min-h-[120px]`}
                    style={p.gradient ? { background: p.gradient } : undefined}>
                    {p.bgImage && (
                      <img src={p.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" />
                    )}
                    <div className="relative z-10">
                      {p.badgeLabel && (
                        <div className="absolute top-0 right-0 px-2 py-0.5 bg-black/20 rounded-full text-[9px] font-bold text-white/80 backdrop-blur-sm">
                          {p.badgeLabel}
                        </div>
                      )}
                      <h3 className="text-lg font-black text-white mt-4">{p.title}</h3>
                      {p.subtitle && <p className="text-sm font-bold text-white/70 mt-0.5">{p.subtitle}</p>}
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-5">
                    {p.description && <p className="text-xs text-white/30 leading-relaxed mb-4">{p.description}</p>}
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-white/15 space-y-0.5">
                        {p.promoCode && <span className="flex items-center gap-1"><Tag size={9} /> Code: <span className="text-white/40 font-mono">{p.promoCode}</span></span>}
                        {p.expiryDate && <span className="flex items-center gap-1"><Clock size={9} /> Until {new Date(p.expiryDate).toLocaleDateString()}</span>}
                      </div>
                      <button
                        onClick={() => !isAuthenticated ? openLogin() : null}
                        className="text-[11px] font-bold text-[#f59e0b] hover:text-[#d97706] transition-colors flex items-center gap-1">
                        {isAuthenticated ? (p.buttonText || "Claim Now") : "Login to Claim"} <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bonus Conditions from backend */}
          {bonuses.length > 0 && (
            <>
              <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                <Gift size={16} className="text-emerald-400" /> Active Bonus Offers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
                {bonuses.map((b) => (
                  <div key={b._id} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-5 hover:border-white/[0.08] transition-colors">
                    {b.imageUrl && (
                      <img src={b.imageUrl} alt={b.title} className="w-full h-28 object-cover rounded-lg mb-3" />
                    )}
                    <h3 className="text-sm font-black text-white mb-1">{b.title}</h3>
                    {b.description && <p className="text-[11px] text-white/25 mb-3 line-clamp-2">{b.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {b.percentage > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded-full">
                          {b.percentage}% Bonus
                        </span>
                      )}
                      {b.maxBonus > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold rounded-full">
                          Max ₹{b.maxBonus.toLocaleString()}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-white/[0.03] text-white/25 text-[9px] font-bold rounded-full">
                        {b.wageringRequirement}x wagering
                      </span>
                      <span className="px-2 py-0.5 bg-white/[0.03] text-white/25 text-[9px] font-bold rounded-full">
                        {b.applicableTo}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/15">
                      <span>Min Deposit: ₹{b.minDeposit}</span>
                      <span className="font-mono text-[#f59e0b]/50">{b.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {filteredPromos.length === 0 && bonuses.length === 0 && (
            <div className="text-center py-16">
              <Sparkles size={24} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/25">No promotions available right now. Check back soon!</p>
            </div>
          )}
        </>
      )}

      {/* Info */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 text-center">
        <Sparkles size={18} className="text-[#f59e0b] mx-auto mb-3" />
        <h3 className="text-sm font-black text-white mb-2">Terms & Conditions Apply</h3>
        <p className="text-xs text-white/25 leading-relaxed max-w-lg mx-auto">
          All promotions are subject to wagering requirements and specific terms. Bonus abuse or
          fraudulent activity will result in forfeit of bonus funds and potential account closure.
        </p>
      </div>
    </div>
  );
}
