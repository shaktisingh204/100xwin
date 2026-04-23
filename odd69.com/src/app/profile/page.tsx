"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, Copy, Wallet, ArrowDownLeft, ArrowUpRight, History, Settings,
  FileText, Gift, HelpCircle, LogOut, ChevronRight, ShieldCheck, TrendingUp,
  Users, Trophy, Crown, Circle, IdCard, BadgeCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import { useWallet } from "@/context/WalletContext";
import { vipApi, type VipStatus } from "@/services/vip";

/* ─── Identity card ───────────────────────────────────────────────────── */

function IdentityCard({
  user,
  vip,
  onCopyId,
}: {
  user: any;
  vip: VipStatus | null;
  onCopyId: () => void;
}) {
  const initials =
    (user?.username || user?.email || "U")
      .toString()
      .trim()
      .substring(0, 2)
      .toUpperCase();

  const kycStatus: string = user?.kycStatus || user?.kyc_status || "PENDING";
  const kycChip =
    kycStatus === "APPROVED" || kycStatus === "VERIFIED"
      ? "chip chip-emerald"
      : kycStatus === "REJECTED"
      ? "chip chip-crimson"
      : "chip chip-gold";

  const tier = vip?.tier || user?.vipTier || "BRONZE";

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-[var(--line-gold)] bg-gold-soft grain">
      <div className="dotgrid absolute inset-0 opacity-40 pointer-events-none" />

      <div className="relative z-10 p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="h-20 w-20 md:h-24 md:w-24 rounded-[18px] bg-gold-grad p-[2px] shadow-[var(--shadow-gold)]">
            <div className="h-full w-full rounded-[16px] bg-[var(--bg-base)] grid place-items-center font-display font-extrabold text-[28px] md:text-[32px] text-gold-grad">
              {initials}
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gold-grad grid place-items-center shadow-[var(--shadow-gold)] ring-2 ring-[var(--bg-surface)]">
            <BadgeCheck size={14} className="text-[#120c00]" />
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <span className="t-eyebrow">Player profile</span>
          <h1 className="font-display font-bold text-[26px] md:text-[32px] tracking-tight text-[var(--ink)] leading-none mt-1">
            {user?.username || "Player"}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="chip chip-gold">
              <Crown size={10} /> {String(tier).toUpperCase()} TIER
            </span>
            <span className={kycChip}>
              <ShieldCheck size={10} /> KYC {String(kycStatus).toUpperCase()}
            </span>
            {user?.role && String(user.role).toLowerCase().includes("admin") ? (
              <span className="chip chip-violet">Admin</span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--ink-dim)]">
            <span className="inline-flex items-center gap-1.5">
              <IdCard size={12} className="text-[var(--ink-faint)]" />
              ID
              <span className="num text-[var(--ink)] ml-1">{user?.id ?? "—"}</span>
              {user?.id ? (
                <button
                  onClick={onCopyId}
                  className="ml-1 text-[var(--ink-faint)] hover:text-[var(--gold-bright)] transition-colors"
                  aria-label="Copy user ID"
                >
                  <Copy size={12} />
                </button>
              ) : null}
            </span>
            {user?.email ? <span className="truncate">{user.email}</span> : null}
            {user?.phoneNumber || user?.phone ? (
              <span className="num">{user.phoneNumber || user.phone}</span>
            ) : null}
          </div>
        </div>

        {/* Settings quick link */}
        <Link
          href="/settings"
          className="btn btn-ghost h-9 self-start md:self-center uppercase tracking-[0.06em] text-[11px]"
        >
          <Settings size={12} /> Edit
        </Link>
      </div>
    </div>
  );
}

/* ─── Wallet block ────────────────────────────────────────────────────── */

function WalletBlock({
  mainBalance,
  mainSymbol,
  currency,
  bonus,
  exposure,
  openDeposit,
  openWithdraw,
}: {
  mainBalance: number;
  mainSymbol: string;
  currency: string;
  bonus: number;
  exposure: number;
  openDeposit: () => void;
  openWithdraw: () => void;
}) {
  const fmt = (n: number) =>
    Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
      {/* Primary balance */}
      <div className="md:col-span-2 relative overflow-hidden rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 md:p-6 hover:border-[var(--line-gold)] transition-colors">
        <div className="dotgrid absolute inset-0 opacity-25 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="t-eyebrow">Main balance</span>
            <span className="chip chip-gold !py-0.5 !px-2 !text-[9px]">{currency}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="num text-gold-grad font-display font-extrabold text-[36px] md:text-[44px] leading-none tracking-tight">
              {mainSymbol}
              {fmt(mainBalance)}
            </span>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={openDeposit}
              className="btn btn-gold sweep h-11 flex-1 uppercase tracking-[0.08em] text-[11px]"
            >
              <ArrowDownLeft size={14} /> Deposit
            </button>
            <button
              onClick={openWithdraw}
              className="btn btn-ghost h-11 flex-1 uppercase tracking-[0.08em] text-[11px]"
            >
              <ArrowUpRight size={14} /> Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        <div className="rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 hover:border-[var(--line-gold)] transition-colors relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="t-eyebrow">Bonus</span>
            <Gift size={14} className="text-[var(--gold-bright)]" />
          </div>
          <p className="num text-[var(--ink)] font-display font-bold text-[22px] mt-1.5 leading-none">
            <span className="text-[var(--gold-bright)] mr-0.5">{mainSymbol}</span>
            {fmt(bonus)}
          </p>
        </div>

        <div className="rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 hover:border-[var(--line-gold)] transition-colors relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="t-eyebrow">Exposure</span>
            <TrendingUp size={14} className="text-[var(--ice)]" />
          </div>
          <p className="num text-[var(--ink-dim)] font-display font-bold text-[22px] mt-1.5 leading-none">
            <span className="text-[var(--ink-faint)] mr-0.5">{mainSymbol}</span>
            {fmt(exposure)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── VIP progress strip ──────────────────────────────────────────────── */

function VipStrip({ vip }: { vip: VipStatus | null }) {
  if (!vip) return null;
  const current = vip.tierConfig;
  const next = vip.nextTier;
  const totalWagered = Number(vip.totalWagered || 0);
  const target = Number(next?.minDeposit || 0);
  const progress = target > 0 ? Math.min(100, (totalWagered / target) * 100) : 100;

  return (
    <div className="rounded-[16px] border border-[var(--line-gold)] bg-gold-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="rail-gold">
          <span className="t-eyebrow">VIP Programme</span>
          <h3 className="t-section mt-1 text-[16px]">
            {current?.name || vip.tier}{" "}
            {next ? (
              <span className="text-[var(--ink-faint)] font-normal text-[13px]">
                → {next.name}
              </span>
            ) : (
              <span className="chip chip-gold ml-2">Max tier</span>
            )}
          </h3>
        </div>
        <Link href="/vip" className="chip chip-gold !py-1.5 !px-3">
          Details →
        </Link>
      </div>

      {next ? (
        <>
          <div className="mt-3 h-2 rounded-full bg-[var(--bg-inlay)] overflow-hidden">
            <div
              className="h-full bg-gold-grad shadow-[var(--shadow-gold)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="t-eyebrow !text-[10px]">Wagered</span>
            <span className="num text-[var(--ink-dim)]">
              {totalWagered.toLocaleString("en-IN")} / {target.toLocaleString("en-IN")}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ─── Menu ────────────────────────────────────────────────────────────── */

const MENU = [
  {
    href: "/profile/info",
    icon: User,
    label: "Personal Information",
    desc: "Name, contacts, member details",
    accent: "text-[var(--ice)]",
    bg: "bg-[var(--ice-soft)]",
  },
  {
    href: "/profile/bet-history",
    icon: TrendingUp,
    label: "Sports Bet History",
    desc: "Exchange bets, settled and open",
    accent: "text-[var(--gold-bright)]",
    bg: "bg-[var(--gold-soft)]",
  },
  {
    href: "/profile/casino-transactions",
    icon: History,
    label: "Casino Transactions",
    desc: "Casino game logs and results",
    accent: "text-[var(--violet)]",
    bg: "bg-[var(--violet-soft)]",
  },
  {
    href: "/fantasy/history",
    icon: Trophy,
    label: "Fantasy History",
    desc: "Contests, ranks, winnings",
    accent: "text-[var(--emerald)]",
    bg: "bg-[var(--emerald-soft)]",
  },
  {
    href: "/profile/transactions",
    icon: Wallet,
    label: "Deposits & Withdrawals",
    desc: "Fund movement and status",
    accent: "text-[var(--gold-bright)]",
    bg: "bg-[var(--gold-soft)]",
  },
  {
    href: "/profile/referral",
    icon: Users,
    label: "Refer & Earn",
    desc: "Invite friends, earn rewards",
    accent: "text-[var(--rose)]",
    bg: "bg-[var(--gold-soft)]",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
    desc: "Password, preferences, security",
    accent: "text-[var(--gold-bright)]",
    bg: "bg-[var(--gold-soft)]",
  },
  {
    href: "/profile/rules",
    icon: FileText,
    label: "Rules & Regulations",
    desc: "Platform policies and guidelines",
    accent: "text-[var(--ink-dim)]",
    bg: "bg-[var(--bg-inlay)]",
  },
  {
    href: "/support",
    icon: HelpCircle,
    label: "24/7 Support",
    desc: "Live chat and help centre",
    accent: "text-[var(--crimson)]",
    bg: "bg-[var(--crimson-soft)]",
  },
];

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { openDeposit, openWithdraw, openLogin } = useModal();
  const {
    fiatBalance,
    fiatCurrency,
    activeSymbol,
    exposure,
    bonus,
    activeBalance,
    selectedWallet,
  } = useWallet();

  const [vip, setVip] = useState<VipStatus | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      openLogin();
      router.push("/");
    }
  }, [loading, isAuthenticated, openLogin, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    vipApi.getMyVipStatus().then((v) => {
      if (!cancelled) setVip(v);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(String(user.id));
    toast.success("User ID copied");
  };

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    router.push("/");
  };

  if (loading || !user) {
    return (
      <section className="page-x max-w-[1680px] mx-auto py-8 md:py-12">
        <div className="space-y-4">
          <div className="skeleton h-28 rounded-[20px]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="skeleton h-36 rounded-[18px] md:col-span-2" />
            <div className="skeleton h-36 rounded-[18px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-[14px]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const primaryBalance = selectedWallet === "crypto" ? activeBalance : fiatBalance;

  return (
    <section className="page-x max-w-[1680px] mx-auto py-6 md:py-10 space-y-6 md:space-y-8">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="rail-gold">
          <span className="t-eyebrow">Account</span>
          <h1 className="t-section mt-1 !text-[22px] md:!text-[26px]">My Profile</h1>
          <p className="t-section-sub">Your identity, balances, and history.</p>
        </div>
        <button
          onClick={handleLogout}
          className="hidden md:inline-flex btn btn-ghost h-9 uppercase tracking-[0.06em] text-[11px]"
        >
          <LogOut size={12} /> Log out
        </button>
      </div>

      {/* Identity */}
      <IdentityCard user={user} vip={vip} onCopyId={handleCopyId} />

      {/* Wallet */}
      <WalletBlock
        mainBalance={primaryBalance}
        mainSymbol={activeSymbol}
        currency={selectedWallet === "crypto" ? "USD" : fiatCurrency}
        bonus={bonus}
        exposure={exposure}
        openDeposit={openDeposit}
        openWithdraw={openWithdraw}
      />

      {/* VIP */}
      <VipStrip vip={vip} />

      {/* Navigation grid */}
      <div>
        <div className="flex items-end justify-between mb-4">
          <div className="rail-gold">
            <span className="t-eyebrow">Navigate</span>
            <h2 className="t-section mt-1">Account tools</h2>
          </div>
          <span className="chip chip-gold !py-1.5 !px-3">
            <Circle size={6} fill="currentColor" className="animate-live-dot" /> Live
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 hover:border-[var(--line-gold)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] transition-all"
            >
              <div
                className={`h-10 w-10 rounded-[10px] ${item.bg} border border-[var(--line-default)] grid place-items-center flex-shrink-0`}
              >
                <item.icon size={16} className={item.accent} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-semibold text-[var(--ink)] group-hover:text-[var(--gold-bright)] transition-colors">
                  {item.label}
                </h3>
                <p className="text-[11px] text-[var(--ink-faint)] truncate mt-0.5">{item.desc}</p>
              </div>
              <ChevronRight
                size={14}
                className="text-[var(--ink-whisper)] group-hover:text-[var(--gold-bright)] group-hover:translate-x-1 transition-all flex-shrink-0"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Logout (mobile + bottom) */}
      <button
        onClick={handleLogout}
        className="w-full h-12 rounded-[12px] border border-[rgba(255,46,76,0.25)] bg-[var(--crimson-soft)] text-[var(--crimson)] hover:bg-[rgba(255,46,76,0.16)] transition-colors flex items-center justify-center gap-2 uppercase tracking-[0.08em] text-[11.5px] font-bold"
      >
        <LogOut size={14} /> Secure log out
      </button>

      <div className="h-6" />
    </section>
  );
}
