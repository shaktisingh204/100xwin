"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Copy,
  CheckCircle,
  Gift,
  ArrowRight,
  TrendingUp,
  Coins,
  Users2,
  Loader2,
  Star,
  Sparkles,
  ShieldCheck,
  Share2,
  Trophy,
  Clock,
} from "lucide-react";
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

/* ═════════════════════════════════════════════════════════════════════════════
   STATIC COPY
   ═════════════════════════════════════════════════════════════════════════════ */

const steps = [
  {
    icon: <Share2 size={18} />,
    title: "Share Your Link",
    desc: "Send your unique referral link to friends and family across social, chat, or email.",
  },
  {
    icon: <Users size={18} />,
    title: "Friend Signs Up",
    desc: "They register through your link and instantly get linked to your account.",
  },
  {
    icon: <Coins size={18} />,
    title: "They Play",
    desc: "Deposits, bets and wagering on their account start counting towards your rewards.",
  },
  {
    icon: <TrendingUp size={18} />,
    title: "You Earn",
    desc: "Commissions credit to your wallet in real-time — no caps, no cooldowns.",
  },
];

const perks = [
  {
    icon: <ShieldCheck size={16} />,
    title: "Transparent Tracking",
    desc: "Monitor every click, signup and commission in real-time from your dashboard.",
  },
  {
    icon: <Trophy size={16} />,
    title: "Unlimited Earnings",
    desc: "No cap on invites. No cap on commission. The bigger the tree, the bigger the harvest.",
  },
  {
    icon: <Clock size={16} />,
    title: "Lifetime Commission",
    desc: "Earn for as long as your referrals stay active. Revenue share never expires.",
  },
];

const faq = [
  {
    q: "How do I get my referral link?",
    a: "Log in, generate your code with a single tap, and share your unique link. Every signup through that link is automatically attributed to you.",
  },
  {
    q: "When are commissions paid out?",
    a: "Commissions credit to your wallet in real-time as your referred users wager. Pending balances clear once wagering requirements are met.",
  },
  {
    q: "Is there a minimum payout?",
    a: "No. Once commissions clear, they're available for withdrawal immediately alongside the rest of your balance.",
  },
];

/* ═════════════════════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════════════════════ */

export default function ReferralPage() {
  const { isAuthenticated, token } = useAuth();
  const { openLogin } = useModal();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rewards, setRewards] = useState<RewardRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rewardResp] = await Promise.allSettled([api.get("/referral/rewards")]);
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

  const referralLink = stats?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${stats.referralCode}`
    : "";

  const handleCopyLink = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCopyCode = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode).then(() => {
      setCodeCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCodeCopied(false), 2500);
    });
  };

  const handleGenerateCode = async () => {
    if (!token) return;
    setGeneratingCode(true);
    try {
      const { code } = await ReferralService.generateCode(token);
      setStats((prev) =>
        prev
          ? { ...prev, referralCode: code }
          : {
              referralCode: code,
              totalInvited: 0,
              totalEarnings: 0,
              pendingEarnings: 0,
              recentReferrals: [],
              recentHistory: [],
            }
      );
      toast.success("Referral code generated!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate code");
    } finally {
      setGeneratingCode(false);
    }
  };

  return (
    <div className="max-w-[1680px] mx-auto pt-6 pb-24 space-y-10 md:space-y-12">
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="relative overflow-hidden rounded-[24px] border border-[var(--line-gold)] bg-[var(--bg-surface)] grain">
          <div className="absolute inset-0 dotgrid opacity-60" />
          <div
            className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--gold-halo), transparent 70%)" }}
          />
          <div
            className="absolute -bottom-32 -left-16 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--emerald-soft), transparent 70%)" }}
          />

          <div className="relative px-6 md:px-10 py-10 md:py-14 grid md:grid-cols-[1.4fr_1fr] gap-8 md:gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 chip chip-gold mb-4">
                <Users2 size={12} />
                <span>Refer &amp; Earn</span>
              </div>

              <h1 className="font-display font-extrabold text-[36px] md:text-[56px] leading-[0.95] tracking-[-0.03em]">
                Invite friends.
                <br />
                <span className="text-gold-grad">Earn real rewards.</span>
              </h1>

              <p className="mt-4 text-[var(--ink-dim)] text-[14px] md:text-[15px] leading-relaxed max-w-xl">
                Share your unique link and earn commissions every time your friends deposit or place a bet.
                No caps, no cooldowns, lifetime revenue share.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {!isAuthenticated ? (
                  <button
                    onClick={openLogin}
                    className="btn btn-gold sweep h-11 uppercase tracking-[0.06em] text-[12px] px-6"
                  >
                    Start Earning <ArrowRight size={14} />
                  </button>
                ) : stats?.referralCode ? (
                  <button
                    onClick={handleCopyLink}
                    className="btn btn-gold sweep h-11 uppercase tracking-[0.06em] text-[12px] px-6"
                  >
                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy My Link"}
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                    className="btn btn-gold sweep h-11 uppercase tracking-[0.06em] text-[12px] px-6 disabled:opacity-40"
                  >
                    {generatingCode ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                    Generate My Code
                  </button>
                )}
                <a
                  href="#how-it-works"
                  className="btn btn-ghost h-11 uppercase tracking-[0.06em] text-[12px] px-6"
                >
                  How it works
                </a>
              </div>
            </div>

            {/* Right: referral code card */}
            <div className="relative">
              {loading ? (
                <div className="h-[220px] skeleton rounded-[20px]" />
              ) : !isAuthenticated ? (
                <div className="rounded-[20px] border border-[var(--line-default)] bg-[var(--bg-elevated)] p-6 text-center">
                  <Users size={24} className="text-[var(--ink-whisper)] mx-auto mb-3" />
                  <p className="font-display font-bold text-[15px] mb-1">Sign in to unlock your link</p>
                  <p className="text-[12px] text-[var(--ink-faint)] mb-4">
                    Get your unique referral code and start earning commission.
                  </p>
                  <button
                    onClick={openLogin}
                    className="btn btn-gold h-9 uppercase tracking-[0.06em] text-[11px]"
                  >
                    Sign In
                  </button>
                </div>
              ) : stats?.referralCode ? (
                <div className="relative rounded-[20px] border border-[var(--line-gold)] bg-[var(--bg-elevated)] p-5 overflow-hidden">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(ellipse 80% 60% at 50% 0%, var(--gold-soft), transparent 70%)",
                    }}
                  />
                  <div className="relative">
                    <span className="t-eyebrow">Your referral code</span>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="num text-gold-grad font-display font-extrabold text-[30px] md:text-[38px] tracking-[0.04em]">
                        {stats.referralCode}
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className={`btn h-9 px-3 ${
                          codeCopied ? "btn-ghost !text-[var(--emerald)]" : "btn-ghost"
                        }`}
                        title="Copy code"
                      >
                        {codeCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div className="mt-5">
                      <span className="t-eyebrow">Referral link</span>
                      <div className="mt-2 flex items-stretch gap-2">
                        <div className="flex-1 min-w-0 rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-inlay)] px-3 py-2.5 text-[12px] num text-[var(--ink-dim)] truncate select-all">
                          {referralLink}
                        </div>
                        <button
                          onClick={handleCopyLink}
                          className={`btn h-auto px-3 text-[11px] uppercase tracking-[0.06em] ${
                            copied ? "btn-ghost !text-[var(--emerald)]" : "btn-gold sweep"
                          }`}
                        >
                          {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                          {copied ? "Done" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[20px] border border-[var(--line-default)] bg-[var(--bg-elevated)] p-6 text-center">
                  <Gift size={24} className="text-[var(--gold)] mx-auto mb-3" />
                  <p className="font-display font-bold text-[15px] mb-1">No code yet</p>
                  <p className="text-[12px] text-[var(--ink-faint)] mb-4">
                    Generate your referral code to start inviting friends.
                  </p>
                  <button
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                    className="btn btn-gold h-9 uppercase tracking-[0.06em] text-[11px] disabled:opacity-40"
                  >
                    {generatingCode ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Gift size={14} /> Generate Code
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS ══════════════════════════════════════════════════════════ */}
      {isAuthenticated && (
        <section className="page-x">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">Your performance</span>
            <h2 className="t-section mt-1">Referral Dashboard</h2>
            <p className="t-section-sub">Track invites, earnings and pending payouts in real-time.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[104px] skeleton rounded-[16px]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
              {[
                {
                  label: "Total Invited",
                  value: stats?.totalInvited ?? 0,
                  icon: <Users size={14} />,
                  accent: "var(--ice)",
                  prefix: "",
                },
                {
                  label: "Total Earnings",
                  value: `₹${(stats?.totalEarnings ?? 0).toLocaleString()}`,
                  icon: <TrendingUp size={14} />,
                  accent: "var(--emerald)",
                  prefix: "",
                },
                {
                  label: "Pending",
                  value: `₹${(stats?.pendingEarnings ?? 0).toLocaleString()}`,
                  icon: <Clock size={14} />,
                  accent: "var(--gold-bright)",
                  prefix: "",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="relative rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 hover:border-[var(--line-gold)] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="grid place-items-center w-7 h-7 rounded-[8px] border border-[var(--line-default)] bg-[var(--bg-elevated)]"
                      style={{ color: s.accent }}
                    >
                      {s.icon}
                    </span>
                    <span className="t-eyebrow">{s.label}</span>
                  </div>
                  <p
                    className="num font-display font-extrabold text-[28px] mt-3 tracking-[-0.02em]"
                    style={{ color: s.accent }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Recent referrals */}
          {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
            <div className="mt-6">
              <div className="flex items-end justify-between mb-3">
                <div className="rail-gold">
                  <span className="t-eyebrow">Latest activity</span>
                  <h3 className="t-section !text-[16px] mt-1">Recent Referrals</h3>
                </div>
                <span className="chip chip-emerald">{stats.recentReferrals.length} active</span>
              </div>
              <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] divide-y divide-[var(--line)] overflow-hidden">
                {stats.recentReferrals.slice(0, 6).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid place-items-center w-8 h-8 rounded-full bg-[var(--gold-soft)] border border-[var(--line-gold)] text-[var(--gold-bright)]">
                        <Users size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{r.username}</p>
                        <p className="text-[11px] text-[var(--ink-whisper)] num">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="num text-[var(--emerald)] font-semibold text-[13px]">
                      ₹{r.totalEarned?.toLocaleString() ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="page-x">
        <div className="mb-4 rail-gold">
          <span className="t-eyebrow">4 simple steps</span>
          <h2 className="t-section mt-1">How It Works</h2>
          <p className="t-section-sub">Share, play, earn — repeat. Revenue share, lifetime.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 overflow-hidden hover:border-[var(--line-gold)] transition-all"
            >
              <span className="absolute top-3 right-4 num font-display font-extrabold text-[42px] text-[var(--ink-ghost)] leading-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative">
                <span className="grid place-items-center w-10 h-10 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--line-gold)] text-[var(--gold-bright)] mb-4">
                  {s.icon}
                </span>
                <h3 className="font-display font-bold text-[14px] mb-1">{s.title}</h3>
                <p className="text-[12px] text-[var(--ink-faint)] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ REWARD MILESTONES ══════════════════════════════════════════════ */}
      {rewards.filter((r) => r.isActive).length > 0 && (
        <section className="page-x">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">Commission schedule</span>
            <h2 className="t-section mt-1">Reward Milestones</h2>
            <p className="t-section-sub">What you earn, when you earn it.</p>
          </div>

          <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1fr_0.7fr] px-5 py-3 border-b border-[var(--line)] text-[var(--ink-faint)] text-[11px] font-mono uppercase tracking-[0.1em]">
              <span>Trigger</span>
              <span>Reward</span>
              <span className="text-right">Amount</span>
            </div>
            {rewards
              .filter((r) => r.isActive)
              .map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[1.4fr_1fr_0.7fr] px-5 py-4 border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-elevated)] transition-colors items-center"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={12} className="text-[var(--gold)] flex-shrink-0" />
                    <span className="num text-[12px] text-[var(--ink-dim)] uppercase tracking-[0.06em]">
                      {r.eventType.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--ink-strong)] truncate">
                    {r.rewardName}
                  </span>
                  <span className="num text-right text-[var(--emerald)] font-display font-bold text-[16px]">
                    ₹{r.amount.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ═══ WHY JOIN / PERKS ═══════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="mb-4 rail-gold">
          <span className="t-eyebrow">Why refer</span>
          <h2 className="t-section mt-1">Built for passive income</h2>
          <p className="t-section-sub">Transparent tracking, real-time payouts, unlimited upside.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger">
          {perks.map((p) => (
            <div
              key={p.title}
              className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 hover:border-[var(--line-gold)] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="grid place-items-center w-9 h-9 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--line-gold)] text-[var(--gold-bright)]">
                  {p.icon}
                </span>
                <h3 className="font-display font-bold text-[14px]">{p.title}</h3>
              </div>
              <p className="text-[12px] text-[var(--ink-faint)] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FAQ ════════════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="mb-4 rail-gold">
          <span className="t-eyebrow">Got questions?</span>
          <h2 className="t-section mt-1">FAQ</h2>
        </div>
        <div className="space-y-2">
          {faq.map((f) => (
            <FAQItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ═══ TERMS ══════════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 text-center">
          <Star size={14} className="text-[var(--gold)] mx-auto mb-2" fill="currentColor" />
          <p className="text-[11px] text-[var(--ink-faint)] leading-relaxed max-w-xl mx-auto">
            Referral rewards are subject to platform terms. Self-referrals or fraudulent activity result
            in forfeiture of earnings. Minimum wagering requirements may apply before commissions clear.
          </p>
        </div>
      </section>
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
        <ArrowRight
          size={14}
          className={`transition-transform flex-shrink-0 ${
            open ? "rotate-90 text-[var(--gold-bright)]" : "text-[var(--ink-whisper)]"
          }`}
        />
      </div>
      {open && (
        <div className="px-4 pb-4 pt-0 text-[12px] text-[var(--ink-dim)] leading-relaxed border-t border-[var(--line)]">
          <div className="pt-3">{a}</div>
        </div>
      )}
    </button>
  );
}
