"use client";

import { useState, useEffect } from "react";
import {
  Crown,
  Star,
  Gift,
  Zap,
  Shield,
  TrendingUp,
  Gem,
  Award,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  BadgeCheck,
  XCircle,
  AlertCircle,
  Check,
  Lock,
  Wallet,
  RotateCcw,
  Gamepad2,
  Trophy,
  Headphones,
  HeartHandshake,
  Layers,
  Users,
  Diamond,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import {
  vipApi,
  type VipApplicationStatus,
  type VipStatus,
  type VipApplyDto,
} from "@/services/vip";
import toast from "react-hot-toast";

/* ═════════════════════════════════════════════════════════════════════════════
   TIER METADATA — mapped to gold-leaf semantic tokens
   SILVER → ice, GOLD → gold, PLATINUM → violet, DIAMOND → emerald
   ═════════════════════════════════════════════════════════════════════════════ */

type TierKey = "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";

const TIER_META: Record<
  TierKey,
  {
    name: string;
    color: string;
    soft: string;
    line: string;
    icon: React.ElementType;
  }
> = {
  SILVER: {
    name: "Silver",
    color: "var(--ice)",
    soft: "var(--ice-soft)",
    line: "rgba(100, 211, 255, 0.25)",
    icon: Award,
  },
  GOLD: {
    name: "Gold",
    color: "var(--gold-bright)",
    soft: "var(--gold-soft)",
    line: "var(--gold-line)",
    icon: Crown,
  },
  PLATINUM: {
    name: "Platinum",
    color: "var(--violet)",
    soft: "var(--violet-soft)",
    line: "rgba(139, 92, 255, 0.25)",
    icon: Gem,
  },
  DIAMOND: {
    name: "Diamond",
    color: "var(--emerald)",
    soft: "var(--emerald-soft)",
    line: "rgba(0, 216, 123, 0.25)",
    icon: Diamond,
  },
};

const TIER_ORDER: TierKey[] = ["SILVER", "GOLD", "PLATINUM", "DIAMOND"];

const TIER_BENEFITS: Record<
  TierKey,
  { lossback: string; reload: string; freeWd: boolean; priority: boolean; host: boolean; events: boolean }
> = {
  SILVER: { lossback: "5%", reload: "2%", freeWd: false, priority: false, host: false, events: false },
  GOLD: { lossback: "10%", reload: "5%", freeWd: true, priority: true, host: false, events: false },
  PLATINUM: { lossback: "15%", reload: "8%", freeWd: true, priority: true, host: true, events: true },
  DIAMOND: { lossback: "20%", reload: "12%", freeWd: true, priority: true, host: true, events: true },
};

const VIP_PERKS = [
  {
    icon: Zap,
    accent: "var(--gold)",
    title: "Instant Lossback",
    description: "Earn rewards back instantly as you play — no waiting, no conditions.",
  },
  {
    icon: RotateCcw,
    accent: "var(--ice)",
    title: "Reload Bonuses",
    description: "Receive rewards every day — the more you play, the higher you climb.",
  },
  {
    icon: Gamepad2,
    accent: "var(--violet)",
    title: "Gameplay Bonuses",
    description: "Play across different game types to unlock richer, exclusive rewards.",
  },
  {
    icon: Trophy,
    accent: "var(--gold-bright)",
    title: "Top Player Bonuses",
    description: "Play at the top to unlock exclusive high-roller rewards and recognition.",
  },
  {
    icon: Wallet,
    accent: "var(--emerald)",
    title: "Fee-Free D&W",
    description: "All deposits and withdrawals are completely fee-free — fiat and crypto.",
  },
  {
    icon: Star,
    accent: "var(--rose)",
    title: "IRL VIP Events",
    description: "Exclusive real-world VIP experiences — events, gifts, and beyond.",
  },
  {
    icon: Headphones,
    accent: "var(--ice)",
    title: "Dedicated VIP Host",
    description: "Personalised support whenever you need it, available around the clock.",
  },
];

const FAQS: Record<"General" | "Benefits", { q: string; a: string }[]> = {
  General: [
    {
      q: "How do I become a VIP?",
      a: "VIP status is invitation-based. We monitor consistent play and loyalty across all our platforms. If you qualify, our VIP team will reach out to you directly via email or in-platform notification.",
    },
    {
      q: "What is the VIP Transfer?",
      a: "If you hold VIP status at another premium gaming platform, you can transfer your status to odd69 instantly and unlock premium perks without starting from scratch.",
    },
    {
      q: "What makes the odd69 VIP Club different?",
      a: "Our VIP program is truly personalised. There are no fixed wagering ladders — we evaluate your activity holistically and tailor rewards that make a real difference, including real-world experiences.",
    },
    {
      q: "Is there a minimum level required to apply?",
      a: "No. Any player on odd69 can be considered for VIP status. We look at responsible, consistent gameplay rather than highest bets or fixed wager targets.",
    },
  ],
  Benefits: [
    {
      q: "What is Instant Lossback?",
      a: "Instant Lossback is a real-time reward that returns a percentage of net losses directly to your wallet as you play — not the next day, instantly.",
    },
    {
      q: "How do Reload Bonuses work?",
      a: "VIP members receive ongoing reload bonuses that grow as your activity and loyalty increase. These are credited regularly to your account, no deposit code required.",
    },
    {
      q: "What are IRL VIP Events?",
      a: "Real-world events exclusively for odd69 VIP members — sporting events, hospitality experiences, exclusive dinners, and curated merchandise gifts.",
    },
    {
      q: "Are there truly no withdrawal fees for VIPs?",
      a: "Yes — all deposits and withdrawals for VIP members are completely fee-free. This applies to all fiat payment methods and all supported cryptocurrencies.",
    },
  ],
};

/* ═════════════════════════════════════════════════════════════════════════════
   STATUS BADGE
   ═════════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { icon: React.ElementType; label: string; chipClass: string }
  > = {
    PENDING: { icon: Clock, label: "Application Pending", chipClass: "chip chip-gold" },
    UNDER_REVIEW: { icon: AlertCircle, label: "Under Review", chipClass: "chip chip-gold" },
    APPROVED: { icon: BadgeCheck, label: "VIP Approved", chipClass: "chip chip-emerald" },
    REJECTED: { icon: XCircle, label: "Application Declined", chipClass: "chip chip-crimson" },
    TRANSFER_REQUESTED: { icon: ArrowRight, label: "Transfer Requested", chipClass: "chip chip-violet" },
  };
  const c = config[status] || config.PENDING;
  const Icon = c.icon;
  return (
    <span className={`${c.chipClass} !py-1.5 !px-3`}>
      <Icon size={12} />
      {c.label}
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════════════════════ */

export default function VIPPage() {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModal();

  const [application, setApplication] = useState<VipApplicationStatus | null | undefined>(undefined);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [loadingApp, setLoadingApp] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  const [faqTab, setFaqTab] = useState<"General" | "Benefits">("General");

  useEffect(() => {
    if (isAuthenticated) {
      setLoadingApp(true);
      Promise.all([
        vipApi.getMyApplication().then((a) => setApplication(a)),
        vipApi.getMyVipStatus?.().then((s) => setVipStatus(s)) ?? Promise.resolve(),
      ]).finally(() => setLoadingApp(false));
    } else {
      setApplication(null);
      setVipStatus(null);
    }
  }, [isAuthenticated]);

  const canApply = !application || application.status === "REJECTED";
  const hasActive = application && !["REJECTED"].includes(application.status);
  const isVipMember =
    vipStatus && (vipStatus.tier as string) && (vipStatus.tier as string) !== "NONE";
  const currentTier =
    isVipMember && TIER_ORDER.includes(vipStatus!.tier as TierKey)
      ? (vipStatus!.tier as TierKey)
      : undefined;
  const currentIdx = currentTier ? TIER_ORDER.indexOf(currentTier) : -1;

  const handleApplySuccess = (data: any) => {
    setShowApplyModal(false);
    setApplication({
      ...data,
      updatedAt: data.createdAt,
    } as VipApplicationStatus);
    toast.success("VIP application submitted!");
  };

  return (
    <div className="max-w-[1680px] mx-auto pt-6 pb-24 space-y-10 md:space-y-12">
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="relative overflow-hidden rounded-[24px] border border-[var(--line-gold)] bg-[var(--bg-surface)] grain">
          <div className="absolute inset-0 dotgrid opacity-40" />
          <div
            className="absolute -top-32 -right-24 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--gold-halo), transparent 70%)" }}
          />
          <div
            className="absolute -bottom-32 -left-20 w-[380px] h-[380px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--violet-soft), transparent 70%)" }}
          />

          <div className="relative px-6 md:px-12 py-12 md:py-16">
            <div className="inline-flex items-center gap-2 chip chip-gold mb-5">
              <Crown size={12} />
              <span>odd69 VIP Club</span>
            </div>

            <h1 className="font-display font-extrabold text-[40px] md:text-[68px] leading-[0.92] tracking-[-0.035em] max-w-3xl">
              Only <span className="text-gold-grad">odd69</span> defines
              <br />
              true VIP.
            </h1>

            <p className="mt-4 text-[var(--ink-dim)] text-[14px] md:text-[16px] max-w-2xl leading-relaxed">
              Have VIP status elsewhere? Transfer it and unlock premium perks instantly. Our VIP program
              is personal, transparent, and built to reward real players.
            </p>

            {/* Application status */}
            {loadingApp ? (
              <div className="mt-6">
                <Loader2 size={18} className="animate-spin text-[var(--ink-whisper)]" />
              </div>
            ) : hasActive && application ? (
              <div className="mt-6 inline-flex flex-col gap-2 rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-elevated)] p-4">
                <span className="t-eyebrow">Your application</span>
                <StatusBadge status={application.status} />
                {application.status === "APPROVED" && (application as any).assignedTier && (
                  <p className="text-[11px] text-[var(--emerald)] flex items-center gap-1.5">
                    <BadgeCheck size={12} /> Assigned to{" "}
                    <strong>
                      {TIER_META[(application as any).assignedTier as TierKey]?.name ||
                        (application as any).assignedTier}
                    </strong>{" "}
                    tier
                  </p>
                )}
                {application.status === "UNDER_REVIEW" && (
                  <p className="text-[11px] text-[var(--ink-faint)]">
                    Our team is reviewing your application. We&apos;ll update you soon.
                  </p>
                )}
                {application.reviewNotes && application.status === "REJECTED" && (
                  <p className="text-[11px] text-[var(--ink-faint)] italic">{application.reviewNotes}</p>
                )}
              </div>
            ) : null}

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <button
                  onClick={openLogin}
                  className="btn btn-gold sweep h-11 uppercase tracking-[0.06em] text-[12px] px-6"
                >
                  Login to Apply <ArrowRight size={14} />
                </button>
              ) : canApply ? (
                <>
                  <button
                    onClick={() => {
                      setIsTransfer(false);
                      setShowApplyModal(true);
                    }}
                    className="btn btn-gold sweep h-11 uppercase tracking-[0.06em] text-[12px] px-6"
                  >
                    {application?.status === "REJECTED" ? "Re-Apply for VIP" : "Apply for VIP"}
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setIsTransfer(true);
                      setShowApplyModal(true);
                    }}
                    className="btn btn-ghost h-11 uppercase tracking-[0.06em] text-[12px] px-6"
                  >
                    Transfer VIP Status
                  </button>
                </>
              ) : null}
            </div>

            {/* Stats row */}
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
              {[
                { icon: Users, label: "Active VIPs", value: "10,000+" },
                { icon: Zap, label: "Max Lossback", value: "Up to 20%" },
                { icon: Headphones, label: "Support", value: "24 / 7" },
              ].map((s) => {
                const StatIcon = s.icon;
                return (
                  <div key={s.label} className="text-center">
                    <StatIcon size={14} className="text-[var(--gold)] mx-auto mb-1.5" />
                    <div className="num font-display font-extrabold text-[20px] md:text-[24px] text-gold-grad">
                      {s.value}
                    </div>
                    <div className="t-eyebrow !text-[9px] mt-0.5">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MEMBER DASHBOARD (if VIP) ══════════════════════════════════════ */}
      {isVipMember && vipStatus && currentTier && (
        <section className="page-x">
          <VipDashboard vipStatus={vipStatus} tierKey={currentTier} />
        </section>
      )}

      {/* ═══ TIER PROGRESSION ═══════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="mb-6 rail-gold text-center md:text-left">
          <span className="t-eyebrow">VIP Tiers</span>
          <h2 className="t-section mt-1">
            {currentTier ? (
              <>
                You are at{" "}
                <span style={{ color: TIER_META[currentTier].color }}>
                  {TIER_META[currentTier].name}
                </span>{" "}
                level
              </>
            ) : (
              "Unlock exclusive VIP levels"
            )}
          </h2>
          <p className="t-section-sub">
            {currentTier
              ? "Your tier is set by our VIP team based on your activity, deposits, and loyalty. Keep playing to unlock the next level."
              : "Each tier is unlocked by our VIP team based on your stats and loyalty. Apply now and start your journey."}
          </p>
        </div>

        {/* Progress rail */}
        <div className="relative max-w-3xl mx-auto mb-8">
          <div className="relative flex items-start justify-between">
            <div className="absolute top-6 left-[12.5%] right-[12.5%] h-[3px] rounded-full bg-[var(--line)]" />
            <div
              className="absolute top-6 left-[12.5%] h-[3px] rounded-full transition-all duration-1000"
              style={{
                width:
                  currentIdx >= 0
                    ? `${(currentIdx / (TIER_ORDER.length - 1)) * 75}%`
                    : "0%",
                background:
                  "linear-gradient(90deg, var(--gold-bright), var(--gold))",
                boxShadow: currentIdx >= 0 ? "0 0 12px var(--gold-halo)" : undefined,
              }}
            />
            {TIER_ORDER.map((key, i) => {
              const meta = TIER_META[key];
              const Icon = meta.icon;
              const isActive = i <= currentIdx;
              const isCurrent = key === currentTier;
              return (
                <div key={key} className="relative flex flex-col items-center flex-1 z-10">
                  {isCurrent && (
                    <Crown
                      size={16}
                      className="absolute -top-6"
                      style={{ color: meta.color }}
                      fill={meta.color}
                    />
                  )}
                  <div
                    className={`w-12 h-12 rounded-[12px] grid place-items-center border-2 transition-all ${
                      isCurrent ? "scale-110" : ""
                    }`}
                    style={{
                      background: isActive ? meta.soft : "var(--bg-surface)",
                      borderColor: isActive ? meta.line : "var(--line-default)",
                      color: isActive ? meta.color : "var(--ink-whisper)",
                      boxShadow: isCurrent
                        ? `0 6px 24px ${meta.color}40`
                        : undefined,
                    }}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold mt-2.5"
                    style={{
                      color: isCurrent
                        ? meta.color
                        : isActive
                        ? "var(--ink-dim)"
                        : "var(--ink-whisper)",
                    }}
                  >
                    {meta.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier cards grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 stagger">
          {TIER_ORDER.map((key) => (
            <TierCard
              key={key}
              tierKey={key}
              isCurrent={key === currentTier}
              isPast={currentIdx >= 0 && TIER_ORDER.indexOf(key) < currentIdx}
            />
          ))}
        </div>
      </section>

      {/* ═══ PERKS ══════════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="mb-6 rail-gold">
          <span className="t-eyebrow">Exclusive benefits</span>
          <h2 className="t-section mt-1">Experience Premium VIP Rewards</h2>
          <p className="t-section-sub">
            Every reward is crafted to make your experience richer, faster, and more personal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
          {VIP_PERKS.map((perk) => {
            const Icon = perk.icon;
            return (
              <div
                key={perk.title}
                className="relative rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 hover:border-[var(--line-gold)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] transition-all"
              >
                <div
                  className="w-10 h-10 rounded-[10px] grid place-items-center mb-4 border"
                  style={{
                    background: `color-mix(in srgb, ${perk.accent} 12%, transparent)`,
                    borderColor: `color-mix(in srgb, ${perk.accent} 25%, transparent)`,
                    color: perk.accent,
                  }}
                >
                  <Icon size={18} />
                </div>
                <h3 className="font-display font-bold text-[14px] mb-1.5">{perk.title}</h3>
                <p className="text-[12px] text-[var(--ink-faint)] leading-relaxed">
                  {perk.description}
                </p>
              </div>
            );
          })}

          {/* More coming tile */}
          <div className="rounded-[16px] border border-dashed border-[var(--line-gold)] bg-[var(--bg-surface)] p-5 flex flex-col items-center justify-center text-center min-h-[140px]">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--line-gold)] grid place-items-center text-[var(--gold-bright)] mb-3">
              <Sparkles size={18} />
            </div>
            <p className="font-display font-bold text-[13px] text-gold-grad">More perks coming</p>
            <p className="text-[11px] text-[var(--ink-faint)] mt-1">Your VIP journey keeps growing</p>
          </div>
        </div>
      </section>

      {/* ═══ TRANSFER BANNER ════════════════════════════════════════════════ */}
      <section className="page-x">
        <div
          className="relative overflow-hidden rounded-[20px] border border-[var(--line-gold)] bg-gradient-to-r from-[var(--gold-soft)] via-[var(--bg-surface)] to-[var(--bg-surface)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 grain"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 100% at 100% 50%, var(--gold-halo), transparent 70%)",
            }}
          />
          <div className="relative w-14 h-14 rounded-full bg-[var(--gold-soft)] border border-[var(--line-gold)] grid place-items-center flex-shrink-0">
            <Shield size={26} className="text-[var(--gold-bright)]" />
          </div>
          <div className="relative flex-1 min-w-0">
            <h3 className="font-display font-bold text-[18px] md:text-[20px] mb-1">
              VIP Transfer Available
            </h3>
            <p className="text-[13px] text-[var(--ink-dim)] max-w-2xl leading-relaxed">
              Already a VIP somewhere else? Transfer your status to odd69 instantly. Contact our VIP
              team with proof of your current status and unlock premium perks immediately.
            </p>
          </div>
          {isAuthenticated && canApply ? (
            <button
              onClick={() => {
                setIsTransfer(true);
                setShowApplyModal(true);
              }}
              className="btn btn-gold sweep h-10 uppercase tracking-[0.06em] text-[11px] px-5 flex-shrink-0"
            >
              Start Transfer <ArrowRight size={12} />
            </button>
          ) : !isAuthenticated ? (
            <button
              onClick={openLogin}
              className="btn btn-gold sweep h-10 uppercase tracking-[0.06em] text-[11px] px-5 flex-shrink-0"
            >
              Login to Transfer
            </button>
          ) : application ? (
            <div className="flex-shrink-0">
              <StatusBadge status={application.status} />
            </div>
          ) : null}
        </div>
      </section>

      {/* ═══ QUALIFICATIONS ═════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="mb-6 rail-gold">
          <span className="t-eyebrow">Eligibility</span>
          <h2 className="t-section mt-1">Play &amp; engage for VIP access</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger">
          {[
            {
              icon: Users,
              accent: "var(--ice)",
              title: "Activity",
              desc: "Consistent and responsible gameplay helps you stand out as a valued player. We watch patterns, not just totals.",
              bullet: "Regular, responsible play",
            },
            {
              icon: HeartHandshake,
              accent: "var(--gold)",
              title: "Loyalty",
              desc: "Stable and ongoing loyalty to odd69 increases your chance of unlocking VIP service and exclusive support.",
              bullet: "Long-term engagement",
            },
            {
              icon: Layers,
              accent: "var(--emerald)",
              title: "No Barriers",
              desc: "No fixed level or specific game requirements — every player has the opportunity to qualify, regardless of what they play.",
              bullet: "Open to all players",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-6 text-center hover:border-[var(--line-gold)] transition-all"
              >
                <div
                  className="w-14 h-14 rounded-[14px] grid place-items-center mx-auto mb-4 border"
                  style={{
                    background: `color-mix(in srgb, ${item.accent} 12%, transparent)`,
                    borderColor: `color-mix(in srgb, ${item.accent} 25%, transparent)`,
                    color: item.accent,
                  }}
                >
                  <Icon size={24} />
                </div>
                <h3 className="font-display font-bold text-[16px] mb-2">{item.title}</h3>
                <p className="text-[12px] text-[var(--ink-faint)] leading-relaxed mb-4">
                  {item.desc}
                </p>
                <span className="chip">
                  <Check size={11} style={{ color: item.accent }} />
                  {item.bullet}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ FAQ ════════════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="mb-6 text-center">
          <span className="t-eyebrow">Got questions?</span>
          <h2 className="t-section mt-1">Frequently Asked Questions</h2>
        </div>

        <div className="flex gap-1 p-1 rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] mb-6 w-fit mx-auto">
          {(["General", "Benefits"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFaqTab(tab)}
              className={`h-9 px-5 rounded-[8px] font-display font-bold text-[13px] transition-all ${
                faqTab === tab
                  ? "bg-gold-grad !text-[#120c00]"
                  : "text-[var(--ink-dim)] hover:text-[var(--ink)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-2 max-w-3xl mx-auto">
          {FAQS[faqTab].map((f) => (
            <FAQItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>

        <div className="mt-8 text-center rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-6 max-w-2xl mx-auto">
          <p className="text-[13px] text-[var(--ink-dim)] mb-3">Still have questions about VIP?</p>
          <a
            href="/support"
            className="btn btn-ghost h-9 uppercase tracking-[0.06em] text-[11px] inline-flex"
          >
            <Headphones size={13} /> Contact VIP Support
          </a>
        </div>
      </section>

      {/* ═══ APPLY MODAL ════════════════════════════════════════════════════ */}
      {showApplyModal && (
        <ApplyModal
          initialIsTransfer={isTransfer}
          onClose={() => setShowApplyModal(false)}
          onSuccess={handleApplySuccess}
        />
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   VIP DASHBOARD
   ═════════════════════════════════════════════════════════════════════════════ */

function VipDashboard({
  vipStatus,
  tierKey,
}: {
  vipStatus: VipStatus;
  tierKey: TierKey;
}) {
  const meta = TIER_META[tierKey];
  const TierIcon = meta.icon;
  const tier = (vipStatus as any).tierConfig;

  return (
    <div
      className="relative overflow-hidden rounded-[20px] border bg-[var(--bg-surface)] p-6 md:p-8 grain"
      style={{ borderColor: meta.line, boxShadow: `0 10px 40px ${meta.color}15` }}
    >
      <div
        className="absolute -top-20 -right-20 w-[320px] h-[320px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${meta.soft}, transparent 70%)` }}
      />

      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-[16px] grid place-items-center border"
            style={{
              background: meta.soft,
              borderColor: meta.line,
              color: meta.color,
              boxShadow: `inset 0 1px 0 ${meta.color}25`,
            }}
          >
            <TierIcon size={28} strokeWidth={1.8} />
          </div>
          <div>
            <span className="t-eyebrow">Your VIP tier</span>
            <h2
              className="font-display font-extrabold text-[26px] md:text-[32px] tracking-[-0.03em] mt-1"
              style={{ color: meta.color }}
            >
              {meta.name}
            </h2>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 md:ml-auto w-full">
          {tier && (
            <>
              <DashStat
                label="Lossback"
                value={`${tier.lossbackPct}%`}
                color={meta.color}
              />
              <DashStat
                label="Reload Bonus"
                value={`${tier.reloadBonusPct}%`}
                color={meta.color}
              />
            </>
          )}
          <DashStat
            label="Total Deposited"
            value={(vipStatus as any).totalDeposited?.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }) || "₹0"}
            color="var(--ink)"
          />
          <DashStat
            label="Total Wagered"
            value={(vipStatus as any).totalWagered?.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }) || "₹0"}
            color="var(--ink)"
          />
        </div>
      </div>

      {tier && (
        <div className="relative flex flex-wrap gap-2 mt-6">
          {tier.freeWithdrawals && (
            <span className="chip chip-emerald">
              <Check size={11} /> Free Withdrawals
            </span>
          )}
          {tier.priorityWithdrawal && (
            <span className="chip chip-gold">
              <Zap size={11} /> Priority Withdrawal
            </span>
          )}
          {tier.dedicatedHost && (
            <span className="chip chip-violet">
              <Headphones size={11} /> Dedicated Host
            </span>
          )}
        </div>
      )}

      {(vipStatus as any).nextTier && (
        <div className="relative mt-6 pt-5 border-t border-[var(--line)] flex items-center gap-2">
          <TrendingUp size={14} className="text-[var(--gold)] flex-shrink-0" />
          <p className="text-[12px] text-[var(--ink-faint)]">
            <span className="text-[var(--ink)] font-semibold">
              Next: {(vipStatus as any).nextTier.name}
            </span>{" "}
            —{" "}
            <span className="num">{(vipStatus as any).nextTier.lossbackPct}%</span> lossback,{" "}
            <span className="num">{(vipStatus as any).nextTier.reloadBonusPct}%</span> reload bonus
          </p>
        </div>
      )}
    </div>
  );
}

function DashStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="text-center rounded-[12px] border border-[var(--line)] bg-[var(--bg-elevated)] p-3">
      <div
        className="num font-display font-extrabold text-[18px] tracking-[-0.02em]"
        style={{ color }}
      >
        {value}
      </div>
      <div className="t-eyebrow !text-[9px] mt-1">{label}</div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   TIER CARD
   ═════════════════════════════════════════════════════════════════════════════ */

function TierCard({
  tierKey,
  isCurrent,
  isPast,
}: {
  tierKey: TierKey;
  isCurrent: boolean;
  isPast: boolean;
}) {
  const meta = TIER_META[tierKey];
  const TierIcon = meta.icon;
  const t = TIER_BENEFITS[tierKey];

  return (
    <div
      className={`relative rounded-[18px] border transition-all overflow-hidden grain ${
        isCurrent ? "scale-[1.02]" : isPast ? "opacity-75" : ""
      }`}
      style={{
        borderColor: isCurrent ? meta.line : "var(--line-default)",
        boxShadow: isCurrent
          ? `0 20px 60px -12px ${meta.color}35, 0 0 0 1px ${meta.line}`
          : undefined,
        background: `linear-gradient(180deg, ${meta.soft}, var(--bg-surface))`,
      }}
    >
      <div className="relative p-5">
        <div
          className="absolute -right-6 -top-6 w-20 h-20 rounded-full blur-[40px] pointer-events-none opacity-50"
          style={{ background: meta.color }}
        />

        {isCurrent && (
          <span
            className="absolute top-3 right-3 chip !border-[color:var(--line-gold)]"
            style={{ background: meta.soft, color: meta.color, borderColor: meta.line }}
          >
            <BadgeCheck size={10} /> Current
          </span>
        )}
        {isPast && (
          <span className="absolute top-3 right-3 chip">
            <Check size={10} /> Achieved
          </span>
        )}

        {/* Icon + Name */}
        <div className="relative flex flex-col items-center text-center mb-5">
          <div
            className="w-14 h-14 rounded-[14px] grid place-items-center mb-3 border"
            style={{
              background: meta.soft,
              borderColor: meta.line,
              color: meta.color,
              boxShadow: `0 8px 24px -4px ${meta.color}30, inset 0 1px 0 ${meta.color}15`,
            }}
          >
            <TierIcon size={26} strokeWidth={1.8} />
          </div>
          <h3
            className="font-display font-extrabold text-[18px] tracking-[-0.02em]"
            style={{ color: meta.color }}
          >
            {meta.name}
          </h3>
        </div>

        {/* Benefits list */}
        <div className="relative space-y-2">
          <BenefitRow icon={<Zap size={11} />} label="Lossback" value={t.lossback} />
          <BenefitRow icon={<Gift size={11} />} label="Reload Bonus" value={t.reload} />
          <BenefitRow
            icon={<Wallet size={11} />}
            label="Free W/D"
            value={t.freeWd ? "check" : "lock"}
          />
          <BenefitRow
            icon={<Sparkles size={11} />}
            label="Priority"
            value={t.priority ? "check" : "lock"}
          />
          <BenefitRow
            icon={<Headphones size={11} />}
            label="VIP Host"
            value={t.host ? "check" : "lock"}
          />
          <BenefitRow
            icon={<Star size={11} />}
            label="IRL Events"
            value={t.events ? "check" : "lock"}
          />
        </div>
      </div>
    </div>
  );
}

function BenefitRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[8px] bg-[var(--bg-base)] border border-[var(--line)] px-3 py-2">
      <span className="flex items-center gap-1.5 text-[11px] text-[var(--ink-faint)] font-medium">
        <span className="text-[var(--ink-whisper)]">{icon}</span>
        {label}
      </span>
      {value === "check" ? (
        <Check size={14} className="text-[var(--emerald)]" />
      ) : value === "lock" ? (
        <Lock size={12} className="text-[var(--ink-whisper)]" />
      ) : (
        <span className="num font-display font-bold text-[13px] text-[var(--ink)]">{value}</span>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   FAQ ITEM
   ═════════════════════════════════════════════════════════════════════════════ */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className={`w-full text-left rounded-[14px] border transition-all ${
        open
          ? "border-[var(--line-gold)] bg-[var(--bg-elevated)]"
          : "border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-strong)]"
      }`}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <span
          className={`font-display font-semibold text-[13px] md:text-[14px] ${
            open ? "text-[var(--gold-bright)]" : "text-[var(--ink)]"
          }`}
        >
          {q}
        </span>
        {open ? (
          <ChevronUp size={16} className="text-[var(--gold-bright)] flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[var(--ink-whisper)] flex-shrink-0" />
        )}
      </div>
      {open && (
        <div className="px-4 pb-4 pt-3 text-[12px] text-[var(--ink-dim)] leading-relaxed border-t border-[var(--line)]">
          {a}
        </div>
      )}
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   APPLY MODAL
   ═════════════════════════════════════════════════════════════════════════════ */

function ApplyModal({
  initialIsTransfer,
  onClose,
  onSuccess,
}: {
  initialIsTransfer: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}) {
  const [isTransfer, setIsTransfer] = useState(initialIsTransfer);
  const [form, setForm] = useState<VipApplyDto>({
    message: "",
    currentPlatform: "",
    platformUsername: "",
    monthlyVolume: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: VipApplyDto = {
        message: form.message || undefined,
        monthlyVolume: form.monthlyVolume || undefined,
      };
      if (isTransfer) {
        payload.currentPlatform = form.currentPlatform || undefined;
        payload.platformUsername = form.platformUsername || undefined;
      }
      const result = await vipApi.apply(payload);
      onSuccess(result);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        typeof msg === "string"
          ? msg
          : Array.isArray(msg)
          ? msg.join(". ")
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] grid place-items-center p-4 glass"
      style={{ background: "rgba(10, 11, 15, 0.8)" }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[20px] border border-[var(--line-gold)] bg-[var(--bg-surface)] grain overflow-hidden shadow-[var(--shadow-lift)]"
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 p-5 border-b border-[var(--line)]">
          <div className="w-10 h-10 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--line-gold)] grid place-items-center">
            <Star size={18} className="text-[var(--gold-bright)]" fill="currentColor" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-extrabold text-[18px]">Apply for VIP</h2>
            <p className="text-[11px] text-[var(--ink-faint)]">
              Our team reviews every application personally
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-[8px] hover:bg-[var(--bg-elevated)] text-[var(--ink-faint)] hover:text-[var(--ink)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Transfer toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-base)] hover:border-[var(--line-gold)] transition-colors">
            <div
              className={`w-10 h-5 rounded-full relative transition-colors ${
                isTransfer ? "bg-gold-grad" : "bg-[var(--bg-inlay)]"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-[var(--ink)] rounded-full transition-all ${
                  isTransfer ? "left-[22px]" : "left-0.5"
                }`}
              />
              <input
                type="checkbox"
                checked={isTransfer}
                onChange={(e) => setIsTransfer(e.target.checked)}
                className="sr-only"
              />
            </div>
            <div>
              <span className="font-display font-semibold text-[13px]">
                I have VIP status elsewhere
              </span>
              <p className="text-[11px] text-[var(--ink-faint)]">Enable VIP Transfer</p>
            </div>
          </label>

          {isTransfer && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block t-eyebrow mb-1.5">Platform</label>
                <input
                  type="text"
                  maxLength={100}
                  value={form.currentPlatform || ""}
                  onChange={(e) =>
                    setForm({ ...form, currentPlatform: e.target.value })
                  }
                  placeholder="e.g. BC.Game"
                  className="w-full rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-inlay)] p-2.5 text-[13px] outline-none focus:border-[var(--line-gold)]"
                />
              </div>
              <div>
                <label className="block t-eyebrow mb-1.5">Username</label>
                <input
                  type="text"
                  maxLength={50}
                  value={form.platformUsername || ""}
                  onChange={(e) =>
                    setForm({ ...form, platformUsername: e.target.value })
                  }
                  placeholder="@username"
                  className="w-full rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-inlay)] p-2.5 text-[13px] outline-none focus:border-[var(--line-gold)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block t-eyebrow mb-1.5">Monthly volume (optional)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.monthlyVolume ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  monthlyVolume: e.target.value
                    ? parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
                    : undefined,
                })
              }
              placeholder="e.g. 500000"
              className="w-full rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-inlay)] p-2.5 text-[13px] num outline-none focus:border-[var(--line-gold)]"
            />
          </div>

          <div>
            <label className="block t-eyebrow mb-1.5">Why VIP? (optional)</label>
            <textarea
              rows={3}
              maxLength={1000}
              value={form.message || ""}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Tell us about your gaming habits..."
              className="w-full rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-inlay)] p-2.5 text-[13px] outline-none focus:border-[var(--line-gold)] resize-none"
            />
            <p className="text-right text-[10px] text-[var(--ink-whisper)] num mt-1">
              {(form.message || "").length}/1000
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-[10px] p-3 border border-[color:var(--crimson)] bg-[var(--crimson-soft)]">
              <XCircle size={14} className="text-[var(--crimson)] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[var(--crimson)]">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--line)] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn btn-ghost h-10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn btn-gold sweep h-10 uppercase tracking-[0.06em] text-[11px] disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </form>
    </div>
  );
}
