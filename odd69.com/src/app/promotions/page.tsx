"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Gift,
  Tag,
  Clock,
  ArrowRight,
  Sparkles,
  Loader2,
  Search,
  LayoutGrid,
  Gamepad2,
  Zap,
  Radio,
  Crown,
  ShieldCheck,
  Star,
  TrendingUp,
  Trophy,
  Circle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import { promotionApi, type Promotion, type BonusPromotion } from "@/services/promotions";

/* ═════════════════════════════════════════════════════════════════════════════
   CATEGORIES
   ═════════════════════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { id: "ALL", label: "All", icon: LayoutGrid },
  { id: "CASINO", label: "Casino", icon: Gamepad2 },
  { id: "SPORTS", label: "Sports", icon: Zap },
  { id: "LIVE", label: "Live", icon: Radio },
  { id: "VIP", label: "VIP", icon: Crown },
] as const;

type CatId = (typeof CATEGORIES)[number]["id"];

/* Gradient accents for cards without custom imagery — all keyed to theme tokens */
const ACCENT_CLASSES = [
  "from-[var(--gold-soft)] to-transparent",
  "from-[var(--emerald-soft)] to-transparent",
  "from-[var(--violet-soft)] to-transparent",
  "from-[var(--ice-soft)] to-transparent",
  "from-[var(--crimson-soft)] to-transparent",
];

/* ═════════════════════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════════════════════ */

export default function PromotionsPage() {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModal();

  const [promos, setPromos] = useState<Promotion[]>([]);
  const [bonuses, setBonuses] = useState<BonusPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CatId>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([promotionApi.getAll(), promotionApi.getBonusConditions()])
      .then(([p, b]) => {
        setPromos(p);
        setBonuses(b.filter((x) => x.isActive));
      })
      .finally(() => setLoading(false));
  }, []);

  /* Filtering */
  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      const cat = (p.category || "ALL").toUpperCase();
      const matchCat =
        activeCategory === "ALL" || cat === activeCategory || cat === "ALL";
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.promoCode?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [promos, activeCategory, search]);

  const filteredBonuses = useMemo(() => {
    return activeCategory === "ALL"
      ? bonuses
      : bonuses.filter(
          (b) =>
            b.applicableTo?.toUpperCase() === activeCategory ||
            b.applicableTo?.toUpperCase() === "BOTH"
        );
  }, [bonuses, activeCategory]);

  const featured = filteredPromos.filter((p) => (p as any).isFeatured);

  const expiringCount = useMemo(
    () =>
      promos.filter((p) => {
        if (!p.expiryDate) return false;
        const d = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000);
        return d > 0 && d <= 7;
      }).length,
    [promos]
  );

  const hasAnyContent = filteredPromos.length > 0 || filteredBonuses.length > 0;

  return (
    <div className="max-w-[1680px] mx-auto pt-4 md:pt-6 pb-24 space-y-8 md:space-y-12">
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="relative overflow-hidden rounded-[20px] md:rounded-[24px] border border-[var(--line-gold)] bg-[var(--bg-surface)] grain">
          <div className="absolute inset-0 dotgrid opacity-60" />
          <div
            className="absolute -top-24 -right-24 w-[320px] h-[320px] md:w-[420px] md:h-[420px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--gold-halo), transparent 70%)" }}
          />

          <div className="relative px-5 md:px-10 py-7 md:py-12 flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-6">
            <div>
              <div className="inline-flex items-center gap-2 chip chip-gold mb-3 md:mb-4">
                <Gift size={12} />
                <span>Offers &amp; Rewards</span>
              </div>
              <h1 className="font-display font-extrabold text-[28px] md:text-[52px] leading-[1] md:leading-[0.95] tracking-[-0.03em]">
                <span className="text-gold-grad">Promotions</span> &amp; Bonuses
              </h1>
              <p className="mt-2.5 md:mt-3 text-[var(--ink-dim)] text-[12.5px] md:text-[14px] max-w-xl leading-relaxed">
                Exclusive bonuses, cashback offers, and VIP rewards. All wagering requirements
                on-chip, fully transparent.
              </p>
            </div>

            {/* Quick stats */}
            <div className="flex gap-2.5 md:gap-3">
              <div className="flex-1 md:flex-none rounded-[14px] md:rounded-[16px] border border-[var(--line-gold)] bg-[var(--bg-elevated)] px-4 md:px-5 py-2.5 md:py-3 text-center min-w-[100px] md:min-w-[110px]">
                <span className="num font-display font-extrabold text-[22px] md:text-[26px] text-gold-grad">
                  {promos.length}
                </span>
                <p className="t-eyebrow !text-[9px] mt-0.5 md:mt-1">Active Offers</p>
              </div>
              {expiringCount > 0 && (
                <div
                  className="flex-1 md:flex-none rounded-[14px] md:rounded-[16px] border px-4 md:px-5 py-2.5 md:py-3 text-center min-w-[100px] md:min-w-[110px] animate-pulse-gold"
                  style={{
                    background: "var(--crimson-soft)",
                    borderColor: "rgba(255, 46, 76, 0.25)",
                  }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Circle
                      size={6}
                      fill="currentColor"
                      className="text-[var(--crimson)] animate-live-dot"
                    />
                    <span className="num font-display font-extrabold text-[22px] md:text-[26px] text-[var(--crimson)]">
                      {expiringCount}
                    </span>
                  </div>
                  <p className="t-eyebrow !text-[9px] mt-0.5 md:mt-1 !text-[var(--crimson)]">Expiring soon</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SEARCH + CATEGORIES ════════════════════════════════════════════ */}
      <section className="page-x space-y-3">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-whisper)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search promos or codes..."
            className="w-full rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-inlay)] pl-9 pr-3 py-2.5 text-[13px] placeholder:text-[var(--ink-whisper)] outline-none focus:border-[var(--line-gold)] transition-colors font-body"
          />
        </div>

        {/* Mobile: horizontally scroll-snap rail. md+: flex-wrap. */}
        <div className="-mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto md:overflow-visible no-scrollbar snap-x snap-proximity">
          <div className="flex gap-1.5 md:flex-wrap min-w-max md:min-w-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count =
                cat.id === "ALL"
                  ? promos.length
                  : promos.filter((p) => (p.category || "ALL").toUpperCase() === cat.id).length;
              if (count === 0 && cat.id !== "ALL") return null;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`snap-start inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] font-mono text-[11px] font-semibold uppercase tracking-[0.08em] border transition-all flex-shrink-0 ${
                    active
                      ? "bg-gold-grad !text-[#120c00] border-transparent shadow-[0_6px_20px_var(--gold-halo)]"
                      : "bg-[var(--bg-surface)] text-[var(--ink-dim)] border-[var(--line-default)] hover:border-[var(--line-gold)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon size={12} />
                  {cat.label}
                  {count > 0 && (
                    <span
                      className={`num ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                        active ? "bg-black/20" : "bg-[var(--ink-ghost)]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED ═══════════════════════════════════════════════════════ */}
      {!loading && featured.length > 0 && activeCategory === "ALL" && !search && (
        <section className="page-x">
          <div className="mb-3 md:mb-4 rail-gold">
            <span className="t-eyebrow">Hand-picked</span>
            <h2 className="t-section mt-1">Featured Offers</h2>
            <p className="t-section-sub">The biggest bonuses live right now.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 stagger">
            {featured.map((p, i) => (
              <PromoCard key={p._id || i} p={p} index={i} large isAuthenticated={isAuthenticated} openLogin={openLogin} />
            ))}
          </div>
        </section>
      )}

      {/* ═══ ALL PROMOS ═════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="flex items-end justify-between mb-4">
          <div className="rail-gold">
            <span className="t-eyebrow">
              {activeCategory === "ALL" ? "All promotions" : `${activeCategory.toLowerCase()} only`}
            </span>
            <h2 className="t-section mt-1 flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--gold)]" />
              Live Bonus Board
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton rounded-[16px] h-[260px] md:h-[300px]" />
            ))}
          </div>
        ) : filteredPromos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 stagger">
            {filteredPromos.map((p, i) => (
              <PromoCard
                key={p._id || i}
                p={p}
                index={i}
                isAuthenticated={isAuthenticated}
                openLogin={openLogin}
              />
            ))}
          </div>
        ) : !hasAnyContent ? (
          <EmptyState
            search={search}
            activeCategory={activeCategory}
            onReset={() => {
              setActiveCategory("ALL");
              setSearch("");
            }}
          />
        ) : null}
      </section>

      {/* ═══ BONUS CONDITIONS ═══════════════════════════════════════════════ */}
      {(loading || filteredBonuses.length > 0) && (
        <section className="page-x">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">Fine print, transparent</span>
            <h2 className="t-section mt-1 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[var(--gold)]" />
              Bonus Conditions
            </h2>
            <p className="t-section-sub">
              Full terms, wagering requirements, and eligibility for each active bonus.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton rounded-[16px] h-[220px] md:h-[260px]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 stagger">
              {filteredBonuses.map((b) => (
                <BonusCard key={b._id} b={b} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ T&Cs ═══════════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-6 text-center">
          <Sparkles size={16} className="text-[var(--gold)] mx-auto mb-2" />
          <h3 className="font-display font-bold text-[14px] mb-2">Terms &amp; Conditions Apply</h3>
          <p className="text-[11px] text-[var(--ink-faint)] leading-relaxed max-w-xl mx-auto">
            All promotions are subject to wagering requirements and specific terms. Bonus abuse or
            fraudulent activity will result in forfeiture of bonus funds and potential account closure.
          </p>
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   PROMO CARD
   ═════════════════════════════════════════════════════════════════════════════ */

function PromoCard({
  p,
  index,
  large = false,
  isAuthenticated,
  openLogin,
}: {
  p: Promotion;
  index: number;
  large?: boolean;
  isAuthenticated: boolean;
  openLogin: () => void;
}) {
  // Index-based accent kept available for future variants
  void index;

  /* Extract percentage for big display */
  const bigNumber = (() => {
    const m = (p.title || "").match(/(\d+)\s*%/);
    if (m) return { value: m[1], suffix: "%" };
    const m2 = (p.title || "").match(/(\d+)x/i);
    if (m2) return { value: m2[1], suffix: "x" };
    return null;
  })();

  const expiringSoon = p.expiryDate
    ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000) <= 7
    : false;

  const heroAspect = large ? "aspect-[16/10] md:aspect-[16/8]" : "aspect-[16/10]";
  const fallbackBg = p.gradient || `linear-gradient(135deg, var(--gold-soft), transparent), var(--bg-elevated)`;

  return (
    <div
      className="relative overflow-hidden rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-gold)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] transition-all grain group flex flex-col"
    >
      {/* Full-bleed hero with gradient scrim */}
      <div className={`relative ${heroAspect} overflow-hidden`}>
        {p.bgImage ? (
          <img
            src={p.bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: fallbackBg }} />
        )}
        {/* Scrim for legible title */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,11,15,0.05) 0%, rgba(10,11,15,0.45) 55%, rgba(10,11,15,0.92) 100%)",
          }}
        />

        {/* Top chips */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {p.badgeLabel && <span className="chip chip-gold">{p.badgeLabel}</span>}
            {expiringSoon && (
              <span className="chip chip-crimson">
                <Circle size={6} fill="currentColor" className="animate-live-dot" />
                Ending
              </span>
            )}
          </div>
          {(p as any).isFeatured && (
            <span className="chip chip-gold">
              <Star size={10} fill="currentColor" /> Featured
            </span>
          )}
        </div>

        {/* Big percent / multiplier overlaid */}
        {bigNumber && (
          <div className="absolute top-3 right-3 z-10 text-right pointer-events-none">
            <span
              className={`num font-display font-extrabold text-gold-grad leading-none tracking-[-0.04em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] ${
                large ? "text-[44px] md:text-[56px]" : "text-[34px] md:text-[40px]"
              }`}
            >
              {bigNumber.value}
              <span
                className={`text-[var(--gold-bright)] ml-0.5 ${
                  large ? "text-[22px] md:text-[26px]" : "text-[18px] md:text-[20px]"
                }`}
              >
                {bigNumber.suffix}
              </span>
            </span>
          </div>
        )}

        {/* Bottom-anchored title */}
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <h3
            className={`font-display font-bold text-[var(--ink-strong)] leading-tight line-clamp-2 ${
              large ? "text-[18px] md:text-[22px]" : "text-[14px] md:text-[15px]"
            }`}
          >
            {p.title}
          </h3>
          {p.subtitle && (
            <p className="text-[11px] md:text-[12px] text-[var(--ink-dim)] font-semibold mt-0.5 line-clamp-1">
              {p.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 md:p-5 flex flex-col gap-3 flex-1">
        {p.description && (
          <p className="text-[12px] text-[var(--ink-faint)] leading-relaxed line-clamp-2 md:line-clamp-3">
            {p.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 mt-auto">
          <div className="flex flex-col gap-1 text-[10px] text-[var(--ink-whisper)] min-w-0">
            {p.promoCode && (
              <span className="inline-flex items-center gap-1">
                <Tag size={10} className="text-[var(--gold)]" />
                Code:{" "}
                <span className="num text-[var(--gold-bright)] truncate">{p.promoCode}</span>
              </span>
            )}
            {p.expiryDate && (
              <span className="inline-flex items-center gap-1">
                <Clock size={10} />
                Until{" "}
                <span className="num">
                  {new Date(p.expiryDate).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>

          <button
            onClick={() => (!isAuthenticated ? openLogin() : null)}
            className="btn btn-gold sweep h-8 uppercase tracking-[0.06em] text-[10px] px-3 flex-shrink-0"
          >
            {isAuthenticated ? p.buttonText || "Claim" : "Login"}
            <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   BONUS CARD
   ═════════════════════════════════════════════════════════════════════════════ */

function BonusCard({ b }: { b: BonusPromotion }) {
  return (
    <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-gold)] transition-all overflow-hidden grain">
      {b.imageUrl && (
        <img src={b.imageUrl} alt={b.title} className="w-full h-28 object-cover" />
      )}
      <div className="p-5">
        <h3 className="font-display font-bold text-[14px] mb-1">{b.title}</h3>
        {b.description && (
          <p className="text-[11px] text-[var(--ink-faint)] leading-relaxed mb-3 line-clamp-2">
            {b.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          {b.percentage > 0 && (
            <span className="chip chip-emerald">
              <span className="num">{b.percentage}%</span> Bonus
            </span>
          )}
          {b.maxBonus > 0 && (
            <span className="chip chip-ice">
              Max <span className="num">₹{b.maxBonus.toLocaleString()}</span>
            </span>
          )}
          <span className="chip">
            <span className="num">{b.wageringRequirement}x</span> wagering
          </span>
          <span className="chip chip-violet">{b.applicableTo}</span>
        </div>

        <div className="flex items-center justify-between text-[11px] border-t border-[var(--line)] pt-3 mt-2">
          <span className="text-[var(--ink-whisper)]">
            Min Deposit:{" "}
            <span className="num text-[var(--ink-dim)]">₹{b.minDeposit}</span>
          </span>
          <span className="num text-[var(--gold-bright)] font-semibold">{b.code}</span>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═════════════════════════════════════════════════════════════════════════════ */

function EmptyState({
  search,
  activeCategory,
  onReset,
}: {
  search: string;
  activeCategory: CatId;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center rounded-[20px] border border-[var(--line-default)] bg-[var(--bg-surface)]">
      <div className="w-16 h-16 rounded-[16px] bg-[var(--gold-soft)] border border-[var(--line-gold)] grid place-items-center mb-4">
        <Trophy size={26} className="text-[var(--gold)]" />
      </div>
      <h3 className="font-display font-bold text-[18px] mb-2">No Promotions Found</h3>
      <p className="text-[12px] text-[var(--ink-faint)] max-w-md">
        {search
          ? `No results for "${search}". Try a different search term.`
          : activeCategory !== "ALL"
            ? `No ${activeCategory.toLowerCase()} promotions active right now.`
            : "Check back later for new bonuses and rewards."}
      </p>
      {(activeCategory !== "ALL" || search) && (
        <button
          onClick={onReset}
          className="btn btn-gold sweep mt-4 h-9 uppercase tracking-[0.06em] text-[11px]"
        >
          View All Promotions
        </button>
      )}
    </div>
  );
}
