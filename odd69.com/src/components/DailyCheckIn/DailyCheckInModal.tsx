"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  type Transition,
} from "framer-motion";
import { Flame, Gift, Sparkles, Coins, Lock, Check, X, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import api from "@/services/api";

// Types
interface DayReward {
  day: number;
  reward: number;
  currency: string;
  claimed: boolean;
  isCurrent: boolean;
}

interface CheckInStatus {
  streak: number;
  canClaimToday: boolean;
  lastCheckin: string | null;
  rewards: DayReward[];
  totalEarned: number;
}

interface Props {
  onClose: () => void;
  hasDeposited?: boolean;
}

// Day reward config
const BASE_REWARDS: Omit<DayReward, "claimed" | "isCurrent">[] = [
  { day: 1, reward: 10, currency: "INR" },
  { day: 2, reward: 20, currency: "INR" },
  { day: 3, reward: 30, currency: "INR" },
  { day: 4, reward: 50, currency: "INR" },
  { day: 5, reward: 75, currency: "INR" },
  { day: 6, reward: 100, currency: "INR" },
  { day: 7, reward: 200, currency: "INR" },
];

const DAY_ICONS = ["🎁", "⚡", "💎", "🔥", "⭐", "🏆", "👑"];

function formatReward(amount: number, currency: string): string {
  if (currency === "INR") return `₹${amount}`;
  if (currency === "USD") return `$${amount}`;
  return `${amount} ${currency}`;
}

// Circular Progress
function CircularProgress({
  value,
  max,
  size = 56,
}: {
  value: number;
  max: number;
  size?: number;
}) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={5}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#ciGrad)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
      />
      <defs>
        <linearGradient id="ciGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Framer-motion confetti burst replacement for Lottie
function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        angle: (Math.PI * 2 * i) / 28 + Math.random() * 0.4,
        distance: 120 + Math.random() * 160,
        delay: Math.random() * 0.25,
        color: ["#f59e0b", "#ea580c", "#fbbf24", "#fde68a", "#ef4444"][i % 5],
        size: 5 + Math.random() * 5,
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((p) => {
        const tx = Math.cos(p.angle) * p.distance;
        const ty = Math.sin(p.angle) * p.distance;
        return (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
            animate={{
              x: tx,
              y: ty,
              opacity: 0,
              scale: 1,
              rotate: 360,
            }}
            transition={{
              duration: 1.4,
              delay: p.delay,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: p.size,
              height: p.size,
              borderRadius: 2,
              background: p.color,
              boxShadow: `0 0 8px ${p.color}`,
            }}
          />
        );
      })}
    </div>
  );
}

// Day Card
function DayCard({
  day,
  reward,
  currency,
  claimed,
  isCurrent,
  index,
  locked,
}: DayReward & { index: number; locked: boolean }) {
  const icon = DAY_ICONS[index] || "🎁";
  const isLastDay = index === 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.05 * index, type: "spring", stiffness: 240, damping: 22 }}
      className="relative flex flex-col items-center gap-1 select-none"
    >
      <div
        className={`
          relative w-full rounded-2xl p-2 flex flex-col items-center gap-1.5 overflow-hidden
          transition-all duration-300 cursor-default
          ${
            claimed
              ? "bg-gradient-to-b from-emerald-500/20 to-emerald-900/20 border border-emerald-400/40"
              : isCurrent && !locked
              ? "bg-gradient-to-b from-amber-500/25 to-orange-900/20 border border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
              : isLastDay && !locked
              ? "bg-gradient-to-b from-yellow-500/15 to-yellow-900/10 border border-yellow-400/30"
              : "bg-white/[0.03] border border-white/[0.06]"
          }
          ${locked ? "opacity-45 grayscale-[0.4]" : ""}
        `}
      >
        {/* Claimed check */}
        {claimed && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg z-10 border-2 border-[#0c0f14]"
          >
            <Check size={10} strokeWidth={3} color="#ffffff" />
          </motion.div>
        )}

        {/* Lock badge */}
        {isCurrent && locked && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center z-10 border-2 border-[#0c0f14]">
            <Lock size={9} strokeWidth={2.5} color="#ffffff" />
          </div>
        )}

        {/* Crown for day 7 */}
        {isLastDay && !claimed && (
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1 left-1 text-[10px] leading-none"
            aria-hidden
          >
            👑
          </motion.div>
        )}

        {/* Current-day pulse ring */}
        {isCurrent && !claimed && !locked && (
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="absolute inset-0 rounded-2xl border-2 border-amber-400/60 pointer-events-none"
          />
        )}

        {/* Day label */}
        <span
          className={`text-[9px] font-black tracking-widest uppercase ${
            claimed
              ? "text-emerald-300"
              : isCurrent && !locked
              ? "text-amber-300"
              : isLastDay
              ? "text-yellow-400/70"
              : "text-white/25"
          }`}
        >
          D{day}
        </span>

        {/* Icon */}
        <span
          className={`text-xl leading-none transition-transform ${
            isCurrent && !locked && !claimed ? "scale-110" : ""
          }`}
          aria-hidden
        >
          {icon}
        </span>

        {/* Reward */}
        <span
          className={`text-[10px] font-black ${
            claimed
              ? "text-emerald-300"
              : isCurrent && !locked
              ? "text-amber-200"
              : isLastDay
              ? "text-yellow-300"
              : "text-white/35"
          }`}
        >
          {formatReward(reward, currency)}
        </span>
      </div>
    </motion.div>
  );
}

// Main Modal
export default function DailyCheckInModal({ onClose, hasDeposited = false }: Props) {
  const { user, token, isAuthenticated } = useAuth();
  const { openDeposit } = useModal();

  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimedReward, setClaimedReward] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Build status from API (fallback to localStorage)
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated && token) {
        try {
          const res = await api.get("/daily-checkin/status");
          const d = res.data;
          const rewards: DayReward[] = (d.rewards || []).map((r: {
            day: number;
            reward: number;
            currency?: string;
            claimed: boolean;
            isCurrent: boolean;
          }) => ({
            day: r.day,
            reward: r.reward,
            currency: r.currency || "INR",
            claimed: r.claimed,
            isCurrent: r.isCurrent,
          }));
          setStatus({
            streak: d.streak,
            canClaimToday: d.canClaimToday,
            lastCheckin: d.lastClaimDate,
            rewards,
            totalEarned: d.totalEarned || 0,
          });
          setIsLoading(false);
          return;
        } catch {
          /* fall through to localStorage */
        }
      }

      // Fallback to localStorage
      const storedKey = `checkin_${user?.id || "guest"}`;
      const stored = localStorage.getItem(storedKey);
      let sd: { streak: number; lastCheckin: string | null } = {
        streak: 0,
        lastCheckin: null,
      };
      if (stored) {
        try {
          sd = JSON.parse(stored);
        } catch {
          /* ignore malformed */
        }
      }

      const today = new Date().toDateString();
      const canClaimToday =
        !sd.lastCheckin || new Date(sd.lastCheckin).toDateString() !== today;
      const cycleDay = sd.streak === 0 ? 1 : ((sd.streak - 1) % 7) + 1;

      const rewards: DayReward[] = BASE_REWARDS.map((r, i) => ({
        ...r,
        claimed: i + 1 < cycleDay || (!canClaimToday && i + 1 === cycleDay),
        isCurrent: canClaimToday && i + 1 === cycleDay,
      }));

      if (!canClaimToday && sd.streak > 0) {
        const prev = cycleDay === 1 ? 7 : cycleDay - 1;
        rewards.forEach((r, i) => {
          if (i + 1 <= prev) r.claimed = true;
        });
      }

      setStatus({
        streak: sd.streak,
        canClaimToday,
        lastCheckin: sd.lastCheckin,
        rewards,
        totalEarned: 0,
      });
    } catch {
      setError("Failed to load.");
    } finally {
      setIsLoading(false);
    }
  }, [user, token, isAuthenticated]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Claim
  const handleClaim = useCallback(async () => {
    if (!status?.canClaimToday || isClaiming || claimed || !hasDeposited) return;
    setIsClaiming(true);
    setError(null);
    try {
      let earned = 0;
      let newStreak = 1;

      if (token) {
        try {
          const r = await api.post("/daily-checkin/claim", { useSpinWheel: false });
          earned = r.data?.reward ?? 0;
          newStreak = r.data?.streak ?? 1;
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } };
          const msg = e?.response?.data?.message;
          if (msg) {
            setError(msg);
            setIsClaiming(false);
            return;
          }
        }
      }

      // Fallback calculation if API didn't return a reward
      if (earned === 0) {
        const storedKey = `checkin_${user?.id || "guest"}`;
        const stored = localStorage.getItem(storedKey);
        let sd: { streak: number; lastCheckin: string | null } = {
          streak: 0,
          lastCheckin: null,
        };
        if (stored) {
          try {
            sd = JSON.parse(stored);
          } catch {
            /* ignore */
          }
        }
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const lastDay = sd.lastCheckin ? new Date(sd.lastCheckin).toDateString() : null;
        newStreak = lastDay === yesterday ? sd.streak + 1 : 1;
        if (newStreak > 7) newStreak = 1;
        earned = BASE_REWARDS[newStreak - 1]?.reward ?? 10;
      }

      // Sync localStorage
      const storedKey = `checkin_${user?.id || "guest"}`;
      localStorage.setItem(
        storedKey,
        JSON.stringify({
          streak: newStreak,
          lastCheckin: new Date().toDateString(),
        })
      );

      setClaimedReward(earned);
      setClaimed(true);
      await fetchStatus();
    } catch {
      setError("Failed to claim. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  }, [status, isClaiming, claimed, hasDeposited, token, user, fetchStatus]);

  // Derived
  const displayStreak = status?.streak ?? 0;
  const cycleDay = displayStreak === 0 ? 1 : ((displayStreak - 1) % 7) + 1;
  const displayDay = status?.canClaimToday ? cycleDay : Math.min(cycleDay, 7);
  const progressVal =
    displayStreak % 7 === 0 && displayStreak > 0 ? 7 : displayStreak % 7;

  const handleDepositRedirect = () => {
    onClose();
    openDeposit();
  };

  // Animation variants
  const desktopVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 32 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.92, y: 20 },
  };

  const bottomSheetVariants = {
    hidden: { y: "100%", opacity: 1 },
    visible: { y: "0%", opacity: 1 },
    exit: { y: "100%", opacity: 1 },
  };

  const variants = isMobile ? bottomSheetVariants : desktopVariants;
  const transition: Transition = isMobile
    ? { type: "spring" as const, damping: 30, stiffness: 300 }
    : { type: "spring" as const, stiffness: 260, damping: 24 };

  // Inner content
  const renderContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Confetti burst on claim */}
      {claimed && (
        <div className="absolute inset-0 z-50 pointer-events-none rounded-3xl overflow-hidden">
          <ConfettiBurst />
        </div>
      )}

      {/* Mobile drag handle */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
        {/* Header */}
        <div className="relative text-center pt-5 pb-3">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily rewards"
            className="absolute top-4 right-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.12] transition-colors z-10"
          >
            <X size={14} strokeWidth={2} color="rgba(255,255,255,0.65)" />
          </button>

          {/* Animated gift icon */}
          <motion.div
            animate={{ rotate: [-6, 6, -6], y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3"
            style={{
              background:
                "linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(234,88,12,0.15) 100%)",
              border: "1px solid rgba(245,158,11,0.35)",
              boxShadow: "0 0 30px rgba(245,158,11,0.25)",
            }}
          >
            <Gift size={30} color="#fbbf24" strokeWidth={2.2} />
          </motion.div>

          <h2 className="text-[18px] font-black text-white tracking-tight">
            Daily Rewards
          </h2>
          <p className="text-[12px] text-white/50 mt-0.5">
            {hasDeposited
              ? "Check in every day to build your streak!"
              : "Deposit once to unlock daily bonuses!"}
          </p>
        </div>

        {/* Streak banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl mb-4 overflow-hidden"
          style={{
            background:
              "linear-gradient(120deg, rgba(245,158,11,0.12) 0%, rgba(234,88,12,0.06) 100%)",
            border: "1px solid rgba(245,158,11,0.18)",
            opacity: hasDeposited ? 1 : 0.5,
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.55))" }}
              >
                <Flame size={30} color="#f59e0b" fill="#f59e0b" strokeWidth={1.6} />
              </motion.div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/45 uppercase tracking-widest font-semibold mb-0.5">
                Current Streak
              </p>
              <div className="flex items-baseline gap-1.5">
                <motion.span
                  key={displayStreak}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-black"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {displayStreak}
                </motion.span>
                <span className="text-white/45 text-xs">
                  day{displayStreak !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Progress ring */}
            <div className="relative flex-shrink-0">
              <CircularProgress value={progressVal} max={7} size={52} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-amber-300">
                  {progressVal}/7
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Deposit gate banner */}
        {!hasDeposited && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl mb-4 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(30,15,15,0.9) 100%)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Lock size={18} color="#ef4444" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-red-400 mb-0.5">
                  Deposit Required
                </p>
                <p className="text-[11px] text-white/55 leading-relaxed">
                  Make your first deposit to unlock daily reward collection.
                </p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <motion.button
                type="button"
                onClick={handleDepositRedirect}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2.5 rounded-xl font-bold text-[13px] text-[#1A1208] relative overflow-hidden flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                  boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
                }}
              >
                <motion.span
                  aria-hidden
                  animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",
                    backgroundSize: "200% 100%",
                  }}
                />
                <CreditCard size={14} strokeWidth={2.4} className="relative" />
                <span className="relative">Deposit Now</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Day reward grid */}
        <div className="mb-4">
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse"
                />
              ))}
            </div>
          ) : status ? (
            <div className="grid grid-cols-7 gap-1.5">
              {status.rewards.map((r, i) => (
                <DayCard key={r.day} {...r} index={i} locked={!hasDeposited} />
              ))}
            </div>
          ) : null}

          {/* Week progress bar */}
          {status && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(progressVal / 7) * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #f59e0b, #ea580c)",
                  }}
                />
              </div>
              <span className="text-[10px] text-white/35 font-semibold">
                {progressVal}/7
              </span>
            </div>
          )}
        </div>

        {/* Claimed success */}
        <AnimatePresence>
          {claimed && claimedReward !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="rounded-2xl p-4 flex items-center gap-3 mb-4"
              style={{
                background:
                  "linear-gradient(120deg, rgba(16,185,129,0.18) 0%, rgba(6,78,59,0.6) 100%)",
                border: "1px solid rgba(16,185,129,0.4)",
              }}
            >
              <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: [0, 14, -14, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Coins size={22} color="#fbbf24" strokeWidth={2} />
                </motion.div>
              </div>
              <div>
                <p className="text-[10px] text-emerald-300/80 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1">
                  <Sparkles size={10} strokeWidth={2.5} /> Reward Claimed!
                </p>
                <p className="text-lg font-black text-emerald-300">
                  +{formatReward(claimedReward, "INR")}
                  <span className="text-[12px] text-emerald-300/70 font-medium ml-1.5">
                    added to wallet
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-400 text-center mb-3 px-2"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky CTA footer */}
      <div
        className="flex-shrink-0 px-4 pt-2 pb-4"
        style={{
          paddingBottom: isMobile ? "max(16px, env(safe-area-inset-bottom))" : "16px",
        }}
      >
        {!hasDeposited ? (
          <button
            type="button"
            onClick={handleDepositRedirect}
            className="w-full py-3.5 rounded-2xl font-bold text-[13px] text-center text-white/50 border border-white/[0.08] bg-white/[0.03] flex items-center justify-center gap-2 hover:bg-white/[0.05] transition-colors"
          >
            <Lock size={13} strokeWidth={2.2} /> Deposit first to unlock rewards
          </button>
        ) : !claimed && status?.canClaimToday ? (
          <motion.button
            type="button"
            onClick={handleClaim}
            disabled={isClaiming || isLoading}
            whileHover={{ scale: isClaiming ? 1 : 1.015 }}
            whileTap={{ scale: isClaiming ? 1 : 0.975 }}
            className="w-full py-4 rounded-2xl font-black text-[15px] relative overflow-hidden disabled:opacity-60"
            style={{
              background:
                "linear-gradient(135deg, #f59e0b 0%, #ea580c 60%, #f59e0b 100%)",
              backgroundSize: "200% 100%",
              color: "#1A1208",
              boxShadow:
                "0 10px 32px rgba(245,158,11,0.5), 0 2px 8px rgba(234,88,12,0.3)",
            }}
          >
            <motion.span
              aria-hidden
              animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)",
                backgroundSize: "200% 100%",
              }}
            />
            <span className="relative flex items-center justify-center gap-2">
              {isClaiming ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="31.4"
                      strokeDashoffset="10"
                    />
                  </svg>
                  Claiming…
                </>
              ) : (
                <>
                  <Gift size={16} strokeWidth={2.4} />
                  Claim Day {displayDay} Reward —{" "}
                  {formatReward(BASE_REWARDS[displayDay - 1]?.reward ?? 10, "INR")}
                </>
              )}
            </span>
          </motion.button>
        ) : claimed ? (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClose}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.975 }}
            className="w-full py-4 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2"
            style={{
              background: "rgba(16,185,129,0.14)",
              border: "1px solid rgba(16,185,129,0.4)",
              color: "#34d399",
            }}
          >
            <Check size={16} strokeWidth={2.6} /> Claimed! Come back tomorrow
          </motion.button>
        ) : (
          <div
            className="w-full py-4 rounded-2xl font-bold text-[13px] text-center text-white/40 flex items-center justify-center gap-2"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Check size={14} strokeWidth={2.4} /> Already claimed today
          </div>
        )}

        {/* Next reward teaser */}
        {hasDeposited && !status?.canClaimToday && !claimed && status && (
          <p className="text-[11px] text-center text-white/35 mt-2.5">
            Next:{" "}
            <span className="text-amber-300 font-bold">
              {formatReward(BASE_REWARDS[cycleDay % 7]?.reward ?? 10, "INR")}
            </span>{" "}
            in 24h
          </p>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="ci-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex bg-black/70 backdrop-blur-md"
        style={{
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          padding: isMobile ? 0 : 16,
        }}
        onClick={onClose}
      >
        <motion.div
          key="ci-modal"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          onClick={(e) => e.stopPropagation()}
          className="relative overflow-hidden bg-gradient-to-br from-[#12161e] to-[#0c0f14] border border-white/[0.06]"
          style={
            isMobile
              ? {
                  width: "100%",
                  maxHeight: "92dvh",
                  borderRadius: "24px 24px 0 0",
                  borderBottom: "none",
                  boxShadow:
                    "0 -20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
                  display: "flex",
                  flexDirection: "column",
                }
              : {
                  width: "100%",
                  maxWidth: 380,
                  maxHeight: "90dvh",
                  borderRadius: 28,
                  boxShadow:
                    "0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
                  display: "flex",
                  flexDirection: "column",
                }
          }
        >
          {renderContent()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
