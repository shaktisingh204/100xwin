"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useModal } from "@/context/ModalContext";
import api from "@/services/api";
import {
  Gift,
  Zap,
  Diamond,
  Flame,
  Star,
  Trophy,
  Crown,
  Target,
  Sparkles,
  Clock,
  TrendingUp,
  Users,
  Lock,
  ChevronRight,
  ChevronDown,
  BarChart3,
  History,
  Award,
  Coins,
  Rocket,
  ShieldCheck,
  Timer,
  Medal,
  ArrowUpRight,
  CircleDollarSign,
  Percent,
  Check,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface DayReward {
  day: number;
  reward: number;
  currency: string;
  claimed: boolean;
  isCurrent: boolean;
}
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  streakRequired?: number;
  totalEarnedRequired?: number;
  reward: number;
}
interface SpinSlice {
  label: string;
  value: number;
  color: string;
  probability: number;
}
interface UserStatus {
  streak: number;
  canClaimToday: boolean;
  cycleDay: number;
  rewards: DayReward[];
  totalEarned: number;
  lastClaimDate: string | null;
  unlockedAchievements: string[];
  countdownMs: number;
  config: {
    cycleDays: number;
    currency: string;
    spinWheelEnabled: boolean;
    spinWheelSlices: SpinSlice[];
    vipMultiplierEnabled: boolean;
    luckyJackpotEnabled: boolean;
    weeklyMegaRewardEnabled: boolean;
    weeklyMegaStreakRequired: number;
    monthlyGrandPrizeEnabled: boolean;
    monthlyGrandPrizeStreakRequired: number;
    achievementsEnabled: boolean;
    achievements: Achievement[];
    leaderboardEnabled: boolean;
    referralBonusEnabled: boolean;
    faqs: { q: string; a: string }[];
  };
}
interface ClaimResult {
  success: boolean;
  reward: number;
  baseReward: number;
  vipMultiplier: number;
  milestoneMultiplier: number;
  referralBonus: number;
  jackpotAmount: number;
  weeklyMegaClaimed: boolean;
  weeklyMegaAmount: number;
  monthlyGrandClaimed: boolean;
  monthlyGrandAmount: number;
  achievementsUnlocked: string[];
  streak: number;
  cycleDay: number;
  rewardType: string;
  spinWheelSlice: string | null;
  currency: string;
}
interface LeaderboardEntry {
  userId: number;
  username: string;
  totalEarned: number;
  totalClaims: number;
  maxStreak: number;
}
type TabId = "rewards" | "spin" | "achievements" | "leaderboard" | "history";

/* ─── Icon map for daily days (gold-leaf tokens, no raw rainbows) ─────── */
const DAY_ICONS: {
  icon: React.ElementType;
  accent: string;
}[] = [
  { icon: Gift, accent: "var(--gold)" },
  { icon: Zap, accent: "var(--gold-bright)" },
  { icon: Diamond, accent: "var(--ice)" },
  { icon: Flame, accent: "var(--crimson)" },
  { icon: Star, accent: "var(--gold-bright)" },
  { icon: Trophy, accent: "var(--gold)" },
  { icon: Crown, accent: "var(--gold-bright)" },
  { icon: Target, accent: "var(--violet)" },
  { icon: Sparkles, accent: "var(--rose)" },
  { icon: Rocket, accent: "var(--ice)" },
  { icon: Award, accent: "var(--emerald)" },
  { icon: Coins, accent: "var(--gold)" },
  { icon: Medal, accent: "var(--ice)" },
  { icon: ShieldCheck, accent: "var(--emerald)" },
];

const ACHIEVEMENT_ICONS: Record<string, { icon: React.ElementType; accent: string }> = {
  first_claim: { icon: Target, accent: "var(--ice)" },
  streak_3: { icon: Flame, accent: "var(--crimson)" },
  streak_7: { icon: Trophy, accent: "var(--gold)" },
  streak_14: { icon: ShieldCheck, accent: "var(--ice)" },
  streak_30: { icon: Crown, accent: "var(--gold-bright)" },
  streak_60: { icon: Diamond, accent: "var(--violet)" },
  streak_100: { icon: Award, accent: "var(--violet)" },
  total_10k: { icon: Coins, accent: "var(--emerald)" },
};

/* ─── Small 3D-ish icon badge (styled with tokens) ─────────────────────── */
function IconBadge({
  index,
  size = 24,
  pulse = false,
}: {
  index: number;
  size?: number;
  pulse?: boolean;
}) {
  const cfg = DAY_ICONS[index % DAY_ICONS.length];
  const IconComp = cfg.icon;
  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      className="relative inline-grid place-items-center rounded-[12px] border"
      style={{
        width: size + 14,
        height: size + 14,
        background: `color-mix(in srgb, ${cfg.accent} 15%, transparent)`,
        borderColor: `color-mix(in srgb, ${cfg.accent} 30%, transparent)`,
        color: cfg.accent,
        boxShadow: `0 4px 16px color-mix(in srgb, ${cfg.accent} 25%, transparent), inset 0 1px 0 color-mix(in srgb, ${cfg.accent} 20%, transparent)`,
      }}
    >
      <IconComp size={size} strokeWidth={2} />
    </motion.div>
  );
}

function AchievementBadgeIcon({
  achievementId,
  size = 28,
}: {
  achievementId: string;
  size?: number;
}) {
  const cfg = ACHIEVEMENT_ICONS[achievementId] || ACHIEVEMENT_ICONS.first_claim;
  const IconComp = cfg.icon;
  return (
    <div
      className="relative inline-grid place-items-center rounded-[14px] border"
      style={{
        width: size + 16,
        height: size + 16,
        background: `color-mix(in srgb, ${cfg.accent} 15%, transparent)`,
        borderColor: `color-mix(in srgb, ${cfg.accent} 30%, transparent)`,
        color: cfg.accent,
        boxShadow: `0 8px 24px color-mix(in srgb, ${cfg.accent} 25%, transparent)`,
      }}
    >
      <IconComp size={size} strokeWidth={2} />
    </div>
  );
}

function formatReward(amount: number, currency: string): string {
  if (currency === "INR") return `₹${amount.toLocaleString()}`;
  if (currency === "USD") return `$${amount.toLocaleString()}`;
  return `${amount} ${currency}`;
}

/* ─── Countdown Timer ──────────────────────────────────────────────────── */
function CountdownTimer({ targetMs }: { targetMs: number }) {
  const [time, setTime] = useState(targetMs);
  useEffect(() => {
    const id = setInterval(() => setTime((p) => Math.max(0, p - 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(time / 3600000);
  const m = Math.floor((time % 3600000) / 60000);
  const s = Math.floor((time % 60000) / 1000);
  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      {[
        { val: h, label: "HRS" },
        { val: m, label: "MIN" },
        { val: s, label: "SEC" },
      ].map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="num text-[var(--ink-whisper)] text-sm md:text-lg font-bold">:</span>
          )}
          <div className="flex flex-col items-center">
            <motion.div
              key={item.val}
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-10 h-10 md:w-14 md:h-14 rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-elevated)] grid place-items-center"
              style={{
                perspective: "200px",
                boxShadow: "inset 0 1px 0 var(--ink-ghost), 0 4px 16px rgba(0,0,0,0.35)",
              }}
            >
              <span className="num text-lg md:text-2xl font-display font-extrabold text-[var(--gold-bright)]">
                {String(item.val).padStart(2, "0")}
              </span>
            </motion.div>
            <span className="t-eyebrow !text-[8px] !tracking-[0.18em] mt-1">{item.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Progress Ring ─────────────────────────────────────────────────────── */
function ProgressRing({
  value,
  max,
  size = 100,
  strokeWidth = 8,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#goldRingGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="goldRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="55%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={value}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="num font-display font-extrabold text-[22px] md:text-[28px] text-gold-grad"
        >
          {value}
        </motion.span>
        <span className="t-eyebrow !text-[8px]">of {max}</span>
      </div>
    </div>
  );
}

/* ─── Day Card ─────────────────────────────────────────────────────────── */
function DayCard({
  day,
  reward,
  currency,
  claimed,
  isCurrent,
  index,
  onClaim,
  canClaim,
}: DayReward & { index: number; onClaim: () => void; canClaim: boolean }) {
  const isLastDay = index === 6;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      whileHover={{ scale: 1.03 }}
      className="relative"
    >
      <div
        className={`relative rounded-[12px] md:rounded-[14px] p-2 md:p-4 flex flex-col items-center gap-1.5 md:gap-2.5 overflow-hidden min-h-[104px] md:min-h-[150px] transition-all border grain ${
          claimed
            ? "bg-[var(--emerald-soft)] border-[color:var(--emerald)]"
            : isCurrent
            ? "bg-[var(--gold-soft)] border-[color:var(--gold)]"
            : isLastDay
            ? "bg-[var(--bg-surface)] border-[var(--line-gold)]"
            : "bg-[var(--bg-surface)] border-[var(--line-default)]"
        }`}
        style={{
          boxShadow: isCurrent
            ? "0 0 32px var(--gold-halo), 0 10px 40px rgba(0,0,0,0.35)"
            : claimed
            ? "0 0 20px rgba(0, 216, 123, 0.2)"
            : undefined,
        }}
      >
        {claimed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full grid place-items-center z-10"
            style={{ background: "var(--emerald)", boxShadow: "0 4px 10px rgba(0,216,123,0.4)" }}
          >
            <Check size={10} className="text-[#0a0b0f]" strokeWidth={3} />
          </motion.div>
        )}

        {isCurrent && !claimed && (
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-[12px] md:rounded-[14px] border-2 pointer-events-none"
            style={{ borderColor: "var(--gold-bright)" }}
          />
        )}

        <span
          className={`font-mono text-[9px] md:text-[10px] font-semibold tracking-[0.18em] uppercase ${
            claimed
              ? "text-[var(--emerald)]"
              : isCurrent
              ? "text-[var(--gold-bright)]"
              : "text-[var(--ink-whisper)]"
          }`}
        >
          Day {day}
        </span>

        <IconBadge index={index} size={isCurrent ? 22 : 18} pulse={isCurrent && !claimed} />

        <span
          className={`num font-display font-extrabold text-[12px] md:text-[14px] tracking-[-0.02em] ${
            claimed
              ? "text-[var(--emerald)]"
              : isCurrent
              ? "text-[var(--gold-bright)]"
              : "text-[var(--ink-faint)]"
          }`}
        >
          {formatReward(reward, currency)}
        </span>

        {isCurrent && canClaim && !claimed && (
          <motion.button
            onClick={onClaim}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-gold sweep !h-7 !px-3 !text-[10px] uppercase tracking-[0.08em]"
          >
            Claim
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Spin Wheel (gold-theme) ──────────────────────────────────────────── */
function SpinWheel({
  slices,
  onSpin,
  spinning,
  result,
}: {
  slices: SpinSlice[];
  onSpin: () => void;
  spinning: boolean;
  result: string | null;
}) {
  const rotation = useMotionValue(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [ledPhase, setLedPhase] = useState(0);

  useEffect(() => {
    if (spinning) {
      const t = currentRotation + 1800 + Math.random() * 720;
      animate(rotation, t, { duration: 5.5, ease: [0.15, 0.85, 0.25, 1] });
      setCurrentRotation(t);
    }
  }, [spinning]);

  useEffect(() => {
    const id = setInterval(() => setLedPhase((p) => (p + 1) % 24), spinning ? 60 : 250);
    return () => clearInterval(id);
  }, [spinning]);

  const rotateTransform = useTransform(rotation, (v) => `rotate(${v}deg)`);
  const sliceAngle = 360 / slices.length;
  const LED_COUNT = 24;
  const TICK_COUNT = 48;
  const wheelSize = "w-[300px] h-[300px] md:w-[400px] md:h-[400px]";

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="relative">
        <div
          className="absolute -inset-16 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--gold-halo) 0%, transparent 70%)",
          }}
        />
        <motion.div
          animate={spinning ? { opacity: [0.2, 0.5, 0.2] } : { opacity: 0.15 }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="absolute -inset-10 rounded-full pointer-events-none"
          style={{
            background: "conic-gradient(from 0deg, var(--gold-bright), var(--gold), var(--gold-deep), var(--gold))",
            filter: "blur(30px)",
          }}
        />

        <div className={`relative ${wheelSize}`}>
          {/* Outer ring with LEDs */}
          <div className="absolute -inset-5 md:-inset-6">
            <svg viewBox="0 0 440 440" className="w-full h-full">
              <defs>
                <linearGradient id="outerRingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3D3224" />
                  <stop offset="50%" stopColor="#8B7340" />
                  <stop offset="100%" stopColor="#3D3224" />
                </linearGradient>
                <radialGradient id="ledGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="white" stopOpacity="1" />
                  <stop offset="40%" stopColor="#FFCC33" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#F5B70A" stopOpacity="0" />
                </radialGradient>
                <filter id="ledBlur">
                  <feGaussianBlur stdDeviation="1.5" />
                </filter>
              </defs>

              <circle cx="220" cy="220" r="216" fill="none" stroke="url(#outerRingGrad)" strokeWidth="8" />
              <circle cx="220" cy="220" r="212" fill="none" stroke="rgba(243,241,236,0.06)" strokeWidth="1" />

              {Array.from({ length: TICK_COUNT }).map((_, i) => {
                const angle = ((i * 360) / TICK_COUNT - 90) * (Math.PI / 180);
                const isMajor = i % 2 === 0;
                const r1 = isMajor ? 200 : 204;
                const r2 = 210;
                return (
                  <line
                    key={`tick-${i}`}
                    x1={220 + r1 * Math.cos(angle)}
                    y1={220 + r1 * Math.sin(angle)}
                    x2={220 + r2 * Math.cos(angle)}
                    y2={220 + r2 * Math.sin(angle)}
                    stroke={isMajor ? "rgba(245,183,10,0.4)" : "rgba(243,241,236,0.08)"}
                    strokeWidth={isMajor ? 1.5 : 0.5}
                  />
                );
              })}

              {Array.from({ length: LED_COUNT }).map((_, i) => {
                const angle = ((i * 360) / LED_COUNT - 90) * (Math.PI / 180);
                const cx = 220 + 206 * Math.cos(angle);
                const cy = 220 + 206 * Math.sin(angle);
                const isLit = spinning
                  ? (i + ledPhase) % 3 === 0
                  : i % 2 === Math.floor(ledPhase / 3) % 2;
                return (
                  <g key={`led-${i}`}>
                    {isLit && <circle cx={cx} cy={cy} r="6" fill="url(#ledGlow)" filter="url(#ledBlur)" opacity="0.7" />}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="3"
                      fill={isLit ? "#FFCC33" : "#4A3F2F"}
                      stroke={isLit ? "#FDE68A" : "#3D3224"}
                      strokeWidth="0.5"
                    />
                    {isLit && <circle cx={cx} cy={cy} r="1.5" fill="white" opacity="0.9" />}
                  </g>
                );
              })}

              <circle cx="220" cy="220" r="196" fill="none" stroke="#5C4A30" strokeWidth="3" />
            </svg>
          </div>

          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30" style={{ marginTop: "-6px" }}>
            <svg width="36" height="48" viewBox="0 0 36 48">
              <defs>
                <linearGradient id="pointerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="50%" stopColor="#F5B70A" />
                  <stop offset="100%" stopColor="#B37D00" />
                </linearGradient>
                <filter id="pointerShadow">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#F5B70A" floodOpacity="0.5" />
                </filter>
              </defs>
              <path d="M18 0 L32 40 Q18 48 4 40 Z" fill="url(#pointerGrad)" filter="url(#pointerShadow)" />
              <circle cx="18" cy="36" r="4" fill="#B37D00" stroke="#FDE68A" strokeWidth="1" />
              <circle cx="18" cy="36" r="2" fill="#FDE68A" />
            </svg>
          </div>

          {/* Spinning wheel face */}
          <motion.div style={{ rotate: rotateTransform }} className="absolute inset-0 rounded-full overflow-hidden">
            <svg viewBox="0 0 300 300" className="w-full h-full">
              <defs>
                <filter id="sliceShadow">
                  <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="rgba(0,0,0,0.4)" />
                </filter>
                <radialGradient id="centerFade" cx="50%" cy="50%" r="50%">
                  <stop offset="60%" stopColor="transparent" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
                </radialGradient>
              </defs>

              {slices.map((slice, i) => {
                const sa = i * sliceAngle;
                const ea = (i + 1) * sliceAngle;
                const sr = (sa - 90) * (Math.PI / 180);
                const er = (ea - 90) * (Math.PI / 180);
                const x1 = 150 + 148 * Math.cos(sr);
                const y1 = 150 + 148 * Math.sin(sr);
                const x2 = 150 + 148 * Math.cos(er);
                const y2 = 150 + 148 * Math.sin(er);
                const la = sliceAngle > 180 ? 1 : 0;
                const ma = ((sa + ea) / 2 - 90) * (Math.PI / 180);
                const tx = 150 + 100 * Math.cos(ma);
                const ty = 150 + 100 * Math.sin(ma);
                const tr = (sa + ea) / 2;
                const isJackpot = slice.label === "JACKPOT";
                const darken = i % 2 === 0 ? "" : "brightness(0.85)";

                return (
                  <g key={i}>
                    <path
                      d={`M150,150 L${x1},${y1} A148,148 0 ${la},1 ${x2},${y2} Z`}
                      fill={slice.color}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="0.8"
                      filter="url(#sliceShadow)"
                      style={{ filter: darken }}
                    />
                    <path
                      d={`M150,150 L${x1},${y1} A148,148 0 ${la},1 ${x2},${y2} Z`}
                      fill="url(#centerFade)"
                    />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${tr}, ${tx}, ${ty})`}
                      fill="white"
                      fontSize={isJackpot ? "9" : "12"}
                      fontWeight="900"
                      letterSpacing={isJackpot ? "1" : "0"}
                      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
                    >
                      {slice.label}
                    </text>
                    <line x1="150" y1="150" x2={x1} y2={y1} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                  </g>
                );
              })}

              <circle cx="150" cy="150" r="148" fill="none" stroke="rgba(245,183,10,0.25)" strokeWidth="2" />
              <circle cx="150" cy="150" r="38" fill="rgba(0,0,0,0.35)" />
              <circle cx="150" cy="150" r="36" fill="none" stroke="rgba(245,183,10,0.35)" strokeWidth="1" />
            </svg>
          </motion.div>

          {/* Center spin button */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <motion.button
              onClick={onSpin}
              disabled={spinning}
              whileHover={!spinning ? { scale: 1.08 } : {}}
              whileTap={!spinning ? { scale: 0.92 } : {}}
              animate={spinning ? { rotate: [0, 360] } : {}}
              transition={spinning ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
              className="relative w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full disabled:cursor-wait"
              style={{
                background:
                  "conic-gradient(from 0deg, #FDE68A, #F5B70A, #B37D00, #B37D00, #F5B70A, #FDE68A)",
                boxShadow:
                  "0 0 40px var(--gold-halo), 0 0 80px rgba(245,183,10,0.15), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.3)",
              }}
            >
              <div
                className="absolute inset-[4px] rounded-full grid place-items-center"
                style={{
                  background: "radial-gradient(circle at 40% 35%, var(--gold), var(--gold-deep))",
                  boxShadow: "inset 0 2px 6px rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.4)",
                }}
              >
                {spinning ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Sparkles size={14} className="text-white mb-0.5" />
                    <span className="font-display font-extrabold text-white text-[11px] md:text-[13px] tracking-[0.1em]">
                      SPIN
                    </span>
                  </div>
                )}
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Spin info cards */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
        {[
          { label: "Slices", value: String(slices.length), icon: Target, accent: "var(--rose)" },
          {
            label: "Max Prize",
            value: formatReward(Math.max(...slices.map((s) => s.value)), "INR"),
            icon: Trophy,
            accent: "var(--gold-bright)",
          },
          {
            label: "Jackpot Odds",
            value: `${slices.find((s) => s.label === "JACKPOT")?.probability || 0}%`,
            icon: Zap,
            accent: "var(--violet)",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 text-center"
            >
              <div
                className="w-8 h-8 rounded-[8px] grid place-items-center mx-auto mb-2 border"
                style={{
                  background: `color-mix(in srgb, ${s.accent} 12%, transparent)`,
                  borderColor: `color-mix(in srgb, ${s.accent} 25%, transparent)`,
                  color: s.accent,
                }}
              >
                <Icon size={15} />
              </div>
              <p className="num font-display font-bold text-[14px]">{s.value}</p>
              <p className="t-eyebrow !text-[9px] mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Result display */}
      <AnimatePresence>
        {result && !spinning && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="relative w-full max-w-md"
          >
            <div
              className="absolute -inset-4 rounded-[24px] opacity-40 blur-xl pointer-events-none"
              style={{ background: "var(--gold-halo)" }}
            />
            <div
              className="relative rounded-[20px] overflow-hidden border border-[var(--line-gold)] bg-[var(--bg-surface)] grain"
            >
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                  width: "50%",
                }}
              />
              <div className="relative px-8 py-6 text-center">
                <IconBadge index={5} size={24} />
                <p className="t-eyebrow mt-3">Congratulations!</p>
                <p
                  className="num font-display font-extrabold text-[40px] text-gold-grad mt-1"
                  style={{ textShadow: "0 0 30px var(--gold-halo)" }}
                >
                  {result}
                </p>
                <p className="text-[12px] text-[var(--ink-faint)] mt-2">Added to your wallet</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Achievement Card ─────────────────────────────────────────────────── */
function AchievementCard({
  achievement,
  unlocked,
  index,
}: {
  achievement: Achievement;
  unlocked: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.03 }}
      className={`relative rounded-[16px] p-5 flex flex-col items-center gap-3 text-center border transition-all grain ${
        unlocked
          ? "border-[var(--line-gold)] bg-[var(--gold-soft)]"
          : "border-[var(--line-default)] bg-[var(--bg-surface)] opacity-60"
      }`}
      style={{
        boxShadow: unlocked ? "0 10px 30px color-mix(in srgb, var(--gold) 15%, transparent)" : undefined,
      }}
    >
      {unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full grid place-items-center"
          style={{ background: "var(--gold-bright)", boxShadow: "0 4px 10px var(--gold-halo)" }}
        >
          <Check size={12} className="text-[#120c00]" strokeWidth={3} />
        </motion.div>
      )}
      <AchievementBadgeIcon achievementId={achievement.id} size={26} />
      <h4 className="font-display font-bold text-[13px]">{achievement.name}</h4>
      <p className="text-[11px] text-[var(--ink-faint)] leading-relaxed">{achievement.description}</p>
      <span
        className={`num font-display font-semibold text-[12px] ${
          unlocked ? "text-[var(--gold-bright)]" : "text-[var(--ink-whisper)]"
        }`}
      >
        +{formatReward(achievement.reward, "INR")}
      </span>
      {achievement.streakRequired && (
        <span className="chip !text-[9px]">
          <span className="num">{achievement.streakRequired}</span>-day streak
        </span>
      )}
    </motion.div>
  );
}

/* ─── Leaderboard Row ──────────────────────────────────────────────────── */
function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const icons = [Trophy, Medal, Award];
  const accents = ["var(--gold-bright)", "var(--ice)", "var(--gold-deep)"];
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className={`flex items-center gap-4 px-5 py-3.5 rounded-[14px] border transition-all ${
        rank < 3
          ? "border-[var(--line-gold)] bg-[var(--gold-soft)]"
          : "border-[var(--line-default)] bg-[var(--bg-surface)]"
      }`}
    >
      {rank < 3 ? (
        <div
          className="w-10 h-10 rounded-[10px] grid place-items-center border"
          style={{
            background: `color-mix(in srgb, ${accents[rank]} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${accents[rank]} 30%, transparent)`,
            color: accents[rank],
            boxShadow: `0 4px 16px color-mix(in srgb, ${accents[rank]} 25%, transparent)`,
          }}
        >
          {React.createElement(icons[rank], { size: 16 })}
        </div>
      ) : (
        <span className="num w-10 h-10 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--line)] grid place-items-center text-[var(--ink-faint)] text-[12px] font-semibold">
          #{rank + 1}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-[13px] truncate">{entry.username}</p>
        <p className="text-[10px] text-[var(--ink-whisper)] num">
          {entry.totalClaims} claims · Max streak {entry.maxStreak}
        </p>
      </div>
      <span className="num text-[var(--gold-bright)] font-display font-bold text-[13px]">
        {formatReward(entry.totalEarned, "INR")}
      </span>
    </motion.div>
  );
}

/* ─── Confetti burst ───────────────────────────────────────────────────── */
function ConfettiBurst() {
  const pieces = Array.from({ length: 36 });
  const colors = [
    "var(--gold-bright)",
    "var(--gold)",
    "var(--emerald)",
    "var(--violet)",
    "var(--ice)",
    "var(--rose)",
  ];
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {pieces.map((_, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 8;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: dx,
              y: dy,
              scale: [0, 1, 0.6],
              opacity: [1, 1, 0],
              rotate: Math.random() * 720,
            }}
            transition={{ duration: 1.8 + Math.random() * 0.6, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 rounded-sm"
            style={{ width: size, height: size, backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}

/* ─── Claim Result Overlay ─────────────────────────────────────────────── */
function ClaimResultOverlay({
  result,
  onClose,
}: {
  result: ClaimResult;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] grid place-items-center glass"
      style={{ background: "rgba(10, 11, 15, 0.85)" }}
      onClick={onClose}
    >
      <ConfettiBurst />
      <motion.div
        initial={{ scale: 0.8, rotateY: -12 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md mx-4 rounded-[22px] overflow-hidden border border-[var(--line-gold)] bg-[var(--bg-surface)] grain"
        style={{
          boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 60px var(--gold-halo)",
        }}
      >
        <div className="p-8 text-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: 2 }}
            className="mb-4 inline-block"
          >
            <IconBadge
              index={result.jackpotAmount > 0 ? 1 : result.weeklyMegaClaimed ? 5 : 0}
              size={36}
            />
          </motion.div>
          <h2 className="font-display font-extrabold text-[24px] mb-2">
            {result.jackpotAmount > 0
              ? "JACKPOT!"
              : result.weeklyMegaClaimed
              ? "WEEKLY MEGA!"
              : result.monthlyGrandClaimed
              ? "MONTHLY GRAND!"
              : "Reward Claimed!"}
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="num font-display font-extrabold text-[42px] text-gold-grad mb-4"
          >
            +{formatReward(result.reward, result.currency)}
          </motion.p>

          <div className="space-y-1.5 text-left rounded-[12px] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 mb-6">
            <Row label="Base Reward" value={formatReward(result.baseReward, result.currency)} />
            {result.vipMultiplier > 1 && (
              <Row label="VIP Multiplier" value={`x${result.vipMultiplier}`} accent="var(--gold-bright)" />
            )}
            {result.milestoneMultiplier > 1 && (
              <Row label="Milestone Bonus" value={`x${result.milestoneMultiplier}`} accent="var(--violet)" />
            )}
            {result.referralBonus > 0 && (
              <Row
                label="Referral Bonus"
                value={`+${formatReward(result.referralBonus, result.currency)}`}
                accent="var(--ice)"
              />
            )}
            {result.jackpotAmount > 0 && (
              <Row
                label="Lucky Jackpot"
                value={`+${formatReward(result.jackpotAmount, result.currency)}`}
                accent="var(--gold-bright)"
              />
            )}
            {result.weeklyMegaClaimed && (
              <Row
                label="Weekly Mega"
                value={`+${formatReward(result.weeklyMegaAmount, result.currency)}`}
                accent="var(--rose)"
              />
            )}
            {result.monthlyGrandClaimed && (
              <Row
                label="Monthly Grand"
                value={`+${formatReward(result.monthlyGrandAmount, result.currency)}`}
                accent="var(--rose)"
              />
            )}
            <div className="flex justify-between text-[12px] border-t border-[var(--line)] pt-2 mt-2">
              <span className="text-[var(--ink-dim)] font-semibold">Streak</span>
              <span className="num text-[var(--gold-bright)] font-semibold">
                {result.streak} days
              </span>
            </div>
          </div>

          {result.achievementsUnlocked.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-[12px] border border-[var(--line-gold)] bg-[var(--gold-soft)] p-3 mb-4"
            >
              <p className="t-eyebrow !text-[var(--gold-bright)] mb-1">Achievements Unlocked</p>
              <p className="text-[12px] text-[var(--ink-dim)]">
                {result.achievementsUnlocked.join(", ")}
              </p>
            </motion.div>
          )}

          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-gold sweep w-full h-11 uppercase tracking-[0.06em] text-[12px]"
          >
            Awesome
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span style={{ color: accent || "var(--ink-faint)" }}>{label}</span>
      <span className="num" style={{ color: accent || "var(--ink)" }}>
        {value}
      </span>
    </div>
  );
}

/* ─── FAQ Item ─────────────────────────────────────────────────────────── */
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
          className={`font-display font-semibold text-[13px] ${
            open ? "text-[var(--gold-bright)]" : "text-[var(--ink)]"
          }`}
        >
          {q}
        </span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform ${
            open ? "rotate-180 text-[var(--gold-bright)]" : "text-[var(--ink-whisper)]"
          }`}
        />
      </div>
      {open && (
        <div className="px-4 pb-4 pt-3 text-[12px] text-[var(--ink-dim)] leading-relaxed border-t border-[var(--line)]">
          {a}
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN CONTENT
   ═══════════════════════════════════════════════════════════════════════════ */
function DailyRewardsContent() {
  const { isAuthenticated, token } = useAuth();
  const { fiatBalance, depositWageringDone, depositWageringRequired } = useWallet();
  const { openDeposit } = useModal();
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageHidden, setPageHidden] = useState(false);

  useEffect(() => {
    fetch("/api/daily-checkin/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.hidden === true) setPageHidden(true);
      })
      .catch(() => {});
  }, []);

  const [activeTab, setActiveTab] = useState<TabId>("rewards");
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [spinningWheel, setSpinningWheel] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);

  const hasDeposited =
    fiatBalance > 0 || depositWageringDone > 0 || depositWageringRequired > 0;

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/daily-checkin/status");
      setStatus(res.data);
    } catch {
      try {
        await api.get("/daily-checkin/full-config");
      } catch {}
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (activeTab === "leaderboard")
      api
        .get("/daily-checkin/leaderboard?limit=20")
        .then((r) => setLeaderboard(r.data))
        .catch(() => {});
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "history" && isAuthenticated)
      api
        .get(`/daily-checkin/history?page=${historyPage}&limit=20`)
        .then((r) => setHistory(r.data.claims || []))
        .catch(() => {});
  }, [activeTab, historyPage, isAuthenticated]);

  const handleClaim = async (useSpinWheel = false) => {
    if (claiming || !status?.canClaimToday) return;
    setClaiming(true);
    try {
      const res = await api.post("/daily-checkin/claim", { useSpinWheel });
      setClaimResult(res.data);
      await fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to claim reward");
    } finally {
      setClaiming(false);
    }
  };

  const handleSpin = async () => {
    if (spinningWheel || !status?.canClaimToday) return;
    setSpinningWheel(true);
    setSpinResult(null);
    try {
      const res = await api.post("/daily-checkin/claim", { useSpinWheel: true });
      setTimeout(() => {
        setSpinResult(
          res.data.spinWheelSlice || formatReward(res.data.reward, res.data.currency)
        );
        setClaimResult(res.data);
        setSpinningWheel(false);
        fetchStatus();
      }, 4200);
    } catch (err: any) {
      setSpinningWheel(false);
      alert(err.response?.data?.message || "Failed to spin");
    }
  };

  const streak = status?.streak || 0;
  const cycleMax = status?.config?.cycleDays || 7;
  const progressVal = streak % cycleMax === 0 && streak > 0 ? cycleMax : streak % cycleMax;

  const TABS = (
    [
      { id: "rewards" as TabId, label: "Daily Rewards", icon: Gift, show: true },
      { id: "spin" as TabId, label: "Spin Wheel", icon: Target, show: !!status?.config?.spinWheelEnabled },
      { id: "achievements" as TabId, label: "Achievements", icon: Award, show: !!status?.config?.achievementsEnabled },
      {
        id: "leaderboard" as TabId,
        label: "Leaderboard",
        icon: BarChart3,
        show: !!status?.config?.leaderboardEnabled,
      },
      { id: "history" as TabId, label: "History", icon: History, show: isAuthenticated || false },
    ] satisfies {
      id: TabId;
      label: string;
      icon: React.ElementType;
      show: boolean;
    }[]
  ).filter((t) => t.show);

  if (pageHidden) {
    return (
      <div className="max-w-[1680px] mx-auto page-x py-20 text-center">
        <p className="font-display font-bold text-[18px] text-[var(--ink-faint)] mb-2">
          Daily Rewards
        </p>
        <p className="text-[12px] text-[var(--ink-whisper)]">
          This page is currently unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1680px] mx-auto pt-6 pb-24 space-y-10 md:space-y-12">
      {/* ═══ HERO ═══════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="relative overflow-hidden rounded-[24px] border border-[var(--line-gold)] bg-[var(--bg-surface)] grain">
          <div className="absolute inset-0 dotgrid opacity-50" />
          <div
            className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--gold-halo), transparent 70%)" }}
          />
          <div
            className="absolute -bottom-32 -left-24 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--crimson-soft), transparent 70%)" }}
          />

          <div className="relative px-6 md:px-10 py-10 md:py-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 chip chip-gold mb-4">
                  <Sparkles size={12} />
                  <span>Daily Rewards</span>
                </div>

                <h1 className="font-display font-extrabold text-[32px] md:text-[48px] leading-[0.95] tracking-[-0.03em] mb-3">
                  Claim your{" "}
                  <span className="text-gold-grad">daily rewards</span>
                </h1>

                <p className="hidden md:block text-[var(--ink-dim)] text-[13px] md:text-[14px] max-w-xl leading-relaxed mb-4">
                  Log in every day to build your streak, spin the wheel, and unlock achievements. VIP
                  members earn bonus multipliers on every claim.
                </p>

                <div className="hidden md:flex flex-wrap gap-1.5">
                  {[
                    { icon: Target, label: "Spin" },
                    { icon: Flame, label: "Streak" },
                    { icon: Crown, label: "VIP Bonus" },
                    { icon: Zap, label: "Jackpot" },
                    { icon: Award, label: "Badges" },
                  ].map((f) => {
                    const Icon = f.icon;
                    return (
                      <span key={f.label} className="chip">
                        <Icon size={10} />
                        {f.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Right: Streak + Countdown */}
              <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
                <div className="relative rounded-[20px] border border-[var(--line-gold)] bg-[var(--bg-elevated)] p-4 md:p-5 w-full lg:w-auto grain overflow-hidden">
                  <div className="relative flex items-center gap-4 md:gap-6">
                    <div className="flex flex-col items-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-10 h-10 md:w-12 md:h-12 grid place-items-center"
                      >
                        <Flame size={28} className="text-[var(--crimson)]" strokeWidth={2} />
                      </motion.div>
                      <motion.span
                        key={streak}
                        initial={{ scale: 1.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="num font-display font-extrabold text-[26px] md:text-[30px] text-gold-grad"
                      >
                        {streak}
                      </motion.span>
                      <span className="t-eyebrow !text-[9px]">Streak</span>
                    </div>
                    <ProgressRing value={progressVal} max={cycleMax} size={96} strokeWidth={7} />
                  </div>
                  {status && (
                    <div className="relative mt-3 pt-3 border-t border-[var(--line)] flex items-center justify-between gap-4">
                      <div className="text-center flex-1">
                        <p className="t-eyebrow !text-[9px]">Earned</p>
                        <p className="num font-display font-bold text-[14px] text-[var(--emerald)]">
                          {formatReward(status.totalEarned, status.config.currency)}
                        </p>
                      </div>
                      <div className="w-px h-6 bg-[var(--line)]" />
                      <div className="text-center flex-1">
                        <p className="t-eyebrow !text-[9px]">Day</p>
                        <p className="num font-display font-bold text-[14px] text-[var(--gold-bright)]">
                          {status.cycleDay}/{cycleMax}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {status && !status.canClaimToday && (
                  <div className="text-center">
                    <p className="t-eyebrow !text-[9px] mb-1.5">Next Reward In</p>
                    <CountdownTimer targetMs={status.countdownMs} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══════════════════════════════════════════════════════ */}
      <section className="page-x">
        <div className="flex gap-1 p-1 rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 h-9 px-4 rounded-[8px] font-display font-semibold text-[12px] transition-all whitespace-nowrap ${
                  active
                    ? "bg-gold-grad !text-[#120c00] shadow-[0_4px_16px_var(--gold-halo)]"
                    : "text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <TabIcon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ TAB CONTENT ═══════════════════════════════════════════════ */}
      <div className="page-x">
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 rounded-[20px] border border-[var(--line-default)] bg-[var(--bg-surface)]"
          >
            <Lock size={40} className="text-[var(--ink-whisper)] mx-auto mb-4" />
            <h3 className="font-display font-bold text-[18px] mb-2">Login Required</h3>
            <p className="text-[13px] text-[var(--ink-faint)]">
              Please log in to access your daily rewards.
            </p>
          </motion.div>
        )}

        {isAuthenticated && loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-[var(--gold-line)] border-t-[var(--gold-bright)] rounded-full animate-spin" />
          </div>
        )}

        {/* ── REWARDS TAB ─────────────────────────────────────────────── */}
        {isAuthenticated && !loading && status && activeTab === "rewards" && (
          <div className="space-y-6 md:space-y-8">
            {/* Deposit gate */}
            {!hasDeposited && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-[16px] p-5 border border-[color:var(--crimson)] bg-[var(--crimson-soft)] flex flex-col sm:flex-row items-start sm:items-center gap-4 grain overflow-hidden relative"
              >
                <div
                  className="w-11 h-11 rounded-[12px] grid place-items-center flex-shrink-0 border"
                  style={{
                    background: "var(--crimson-soft)",
                    borderColor: "var(--crimson)",
                    color: "var(--crimson)",
                  }}
                >
                  <Lock size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-[14px]">Deposit Required</h3>
                  <p className="text-[12px] text-[var(--ink-faint)] mt-0.5">
                    Make your first deposit to start claiming daily rewards.
                  </p>
                </div>
                <button
                  onClick={() => openDeposit()}
                  className="btn btn-gold sweep h-10 uppercase tracking-[0.06em] text-[11px] px-5 w-full sm:w-auto"
                >
                  Deposit Now
                </button>
              </motion.div>
            )}

            {/* Milestone progress */}
            {status.config.weeklyMegaRewardEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MilestoneBar
                  title="Weekly Mega Reward"
                  subtitle={`${status.config.weeklyMegaStreakRequired}-day streak required`}
                  streak={streak}
                  required={status.config.weeklyMegaStreakRequired}
                  icon={<Trophy size={18} />}
                  accent="var(--gold-bright)"
                />
                {status.config.monthlyGrandPrizeEnabled && (
                  <MilestoneBar
                    title="Monthly Grand Prize"
                    subtitle={`${status.config.monthlyGrandPrizeStreakRequired}-day streak required`}
                    streak={streak}
                    required={status.config.monthlyGrandPrizeStreakRequired}
                    icon={<Crown size={18} />}
                    accent="var(--violet)"
                  />
                )}
              </div>
            )}

            {/* Day cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="rail-gold">
                  <span className="t-eyebrow">7-day cycle</span>
                  <h3 className="t-section !text-[16px] mt-1">Reward Cycle</h3>
                </div>
                <span className="num text-[12px] text-[var(--ink-faint)]">
                  Day {status.cycleDay} of {cycleMax}
                </span>
              </div>

              <div className="relative rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] dotgrid p-3 md:p-4 overflow-hidden">
                <div className="grid grid-cols-7 gap-1.5 md:gap-3">
                  {status.rewards.map((r, i) => (
                    <DayCard
                      key={r.day}
                      {...r}
                      index={i}
                      onClaim={() => handleClaim(false)}
                      canClaim={hasDeposited && status.canClaimToday && !claiming}
                    />
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-[var(--bg-inlay)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(progressVal / cycleMax) * 100}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full bg-gold-grad"
                    />
                  </div>
                  <span className="num text-[11px] text-[var(--ink-faint)]">
                    {progressVal}/{cycleMax}
                  </span>
                </div>
              </div>
            </div>

            {/* Main claim button */}
            {status.canClaimToday && hasDeposited && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <motion.button
                  onClick={() => handleClaim(false)}
                  disabled={claiming}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-gold sweep flex-1 h-12 md:h-14 uppercase tracking-[0.06em] text-[13px] disabled:opacity-60"
                >
                  <Gift size={16} />
                  {claiming ? (
                    "Claiming..."
                  ) : (
                    <>
                      <span className="hidden sm:inline">
                        Claim Day {status.cycleDay} —{" "}
                        <span className="num">
                          {formatReward(
                            status.rewards[status.cycleDay - 1]?.reward ?? 10,
                            status.config.currency
                          )}
                        </span>
                      </span>
                      <span className="sm:hidden num">
                        Claim{" "}
                        {formatReward(
                          status.rewards[status.cycleDay - 1]?.reward ?? 10,
                          status.config.currency
                        )}
                      </span>
                    </>
                  )}
                </motion.button>
                {status.config.spinWheelEnabled && (
                  <motion.button
                    onClick={() => setActiveTab("spin")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-ghost h-12 md:h-14 uppercase tracking-[0.06em] text-[12px] px-6"
                    style={{
                      borderColor: "color-mix(in srgb, var(--rose) 30%, transparent)",
                      color: "var(--rose)",
                    }}
                  >
                    <Target size={15} /> Spin Instead
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Feature spotlight */}
            <div>
              <div className="mb-4 rail-gold">
                <span className="t-eyebrow">What's included</span>
                <h3 className="t-section !text-[16px] mt-1">Reward Features</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
                {[
                  {
                    icon: Target,
                    accent: "var(--rose)",
                    title: "Spin Wheel",
                    desc: "Spin the wheel for randomized rewards. Land on the jackpot slice for massive prizes.",
                    enabled: status.config.spinWheelEnabled,
                  },
                  {
                    icon: Crown,
                    accent: "var(--gold-bright)",
                    title: "VIP Multiplier",
                    desc: "VIP members earn up to 5x multiplier on every daily reward claim.",
                    enabled: status.config.vipMultiplierEnabled,
                  },
                  {
                    icon: Zap,
                    accent: "var(--gold)",
                    title: "Lucky Jackpot",
                    desc: "Every claim has a chance to trigger the lucky jackpot for a mega bonus reward.",
                    enabled: status.config.luckyJackpotEnabled,
                  },
                  {
                    icon: Users,
                    accent: "var(--ice)",
                    title: "Referral Bonus",
                    desc: "Earn extra rewards when your referred friends also claim their daily rewards.",
                    enabled: status.config.referralBonusEnabled,
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className={`rounded-[14px] p-4 border transition-all grain ${
                        f.enabled
                          ? "border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-gold)] hover:-translate-y-0.5"
                          : "border-[var(--line-default)] bg-[var(--bg-surface)] opacity-50"
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-[10px] grid place-items-center mb-3 border"
                        style={{
                          background: `color-mix(in srgb, ${f.accent} 12%, transparent)`,
                          borderColor: `color-mix(in srgb, ${f.accent} 25%, transparent)`,
                          color: f.accent,
                        }}
                      >
                        <Icon size={15} />
                      </div>
                      <p className="font-display font-bold text-[13px] mb-1">{f.title}</p>
                      <p className="text-[11px] text-[var(--ink-faint)] leading-relaxed line-clamp-3">
                        {f.desc}
                      </p>
                      {!f.enabled && (
                        <span className="chip mt-2 !text-[9px]">Coming soon</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* How it works */}
            <div>
              <div className="mb-4 rail-gold">
                <span className="t-eyebrow">3 steps</span>
                <h3 className="t-section !text-[16px] mt-1">How It Works</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 stagger">
                {[
                  {
                    step: "01",
                    title: "Log In Daily",
                    desc: "Visit the Daily Rewards page every day to keep your streak alive. Even one missed day can reset your progress.",
                    icon: Clock,
                  },
                  {
                    step: "02",
                    title: "Claim or Spin",
                    desc: "Choose to claim your fixed daily reward or spin the wheel for a chance at something bigger. The choice is yours.",
                    icon: Gift,
                  },
                  {
                    step: "03",
                    title: "Build Your Streak",
                    desc: "Consecutive days build your streak multiplier. Hit 7-day and 30-day milestones for massive bonus rewards.",
                    icon: TrendingUp,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className="relative rounded-[14px] p-5 border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden hover:border-[var(--line-gold)] transition-all"
                    >
                      <span className="absolute top-2 right-4 num font-display font-extrabold text-[44px] text-[var(--ink-ghost)] leading-none">
                        {item.step}
                      </span>
                      <div className="w-9 h-9 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--line-gold)] grid place-items-center text-[var(--gold-bright)] mb-3 relative">
                        <Icon size={15} />
                      </div>
                      <h4 className="font-display font-bold text-[14px] mb-1 relative">
                        {item.title}
                      </h4>
                      <p className="text-[12px] text-[var(--ink-faint)] leading-relaxed relative">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div>
              <div className="mb-4 rail-gold">
                <span className="t-eyebrow">Your stats</span>
                <h3 className="t-section !text-[16px] mt-1">Performance Overview</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
                {[
                  {
                    label: "Current Streak",
                    value: `${streak} days`,
                    icon: Flame,
                    color: "var(--crimson)",
                  },
                  {
                    label: "Total Earned",
                    value: formatReward(status.totalEarned, status.config.currency),
                    icon: CircleDollarSign,
                    color: "var(--emerald)",
                  },
                  {
                    label: "Achievements",
                    value: `${status.unlockedAchievements.length}/${status.config.achievements.length}`,
                    icon: Award,
                    color: "var(--gold-bright)",
                  },
                  {
                    label: "Next Milestone",
                    value:
                      streak < 7
                        ? "7-day"
                        : streak < 30
                        ? "30-day"
                        : streak < 100
                        ? "100-day"
                        : "MAX",
                    icon: ArrowUpRight,
                    color: "var(--violet)",
                  },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="rounded-[14px] p-4 border border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-gold)] transition-all"
                    >
                      <Icon size={14} style={{ color: s.color }} className="mb-2" />
                      <p
                        className="num font-display font-bold text-[16px] md:text-[18px]"
                        style={{ color: s.color }}
                      >
                        {s.value}
                      </p>
                      <p className="t-eyebrow !text-[9px] mt-0.5">{s.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FAQ */}
            {status.config.faqs && status.config.faqs.length > 0 && (
              <div>
                <div className="mb-4 rail-gold">
                  <span className="t-eyebrow">Need help?</span>
                  <h3 className="t-section !text-[16px] mt-1">Frequently Asked Questions</h3>
                </div>
                <div className="space-y-2">
                  {status.config.faqs.map((faq, i) => (
                    <FAQItem key={i} q={faq.q} a={faq.a} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SPIN TAB ───────────────────────────────────────────────── */}
        {isAuthenticated && !loading && status && activeTab === "spin" && (
          <div className="flex flex-col items-center py-8 space-y-10">
            {!status.canClaimToday ? (
              <div className="text-center py-12">
                <Timer size={44} className="text-[var(--ink-whisper)] mx-auto mb-4" />
                <h3 className="font-display font-bold text-[18px] mb-2">Already Claimed Today</h3>
                <p className="text-[13px] text-[var(--ink-faint)] mb-5">
                  Come back tomorrow to spin the wheel.
                </p>
                <CountdownTimer targetMs={status.countdownMs} />
              </div>
            ) : !hasDeposited ? (
              <div className="text-center py-12">
                <Lock size={44} className="text-[var(--ink-whisper)] mx-auto mb-4" />
                <h3 className="font-display font-bold text-[18px] mb-2">Deposit Required</h3>
                <p className="text-[13px] text-[var(--ink-faint)] mb-5">
                  Make a deposit to spin the wheel.
                </p>
                <button
                  onClick={() => openDeposit()}
                  className="btn btn-gold sweep h-10 uppercase tracking-[0.06em] text-[11px] px-6"
                >
                  Deposit Now
                </button>
              </div>
            ) : (
              <SpinWheel
                slices={status.config.spinWheelSlices}
                onSpin={handleSpin}
                spinning={spinningWheel}
                result={spinResult}
              />
            )}

            <div className="max-w-2xl w-full">
              <div className="mb-4 rail-gold">
                <span className="t-eyebrow">Mechanics</span>
                <h3 className="t-section !text-[16px] mt-1">How the Spin Wheel Works</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    icon: Percent,
                    title: "Weighted Probabilities",
                    desc: "Each slice has a different chance of landing. Smaller prizes are more common, the jackpot is rare.",
                  },
                  {
                    icon: Zap,
                    title: "Jackpot Slice",
                    desc: "The golden JACKPOT slice offers the biggest reward — lowest probability, highest payout.",
                  },
                  {
                    icon: Crown,
                    title: "VIP Boost Applies",
                    desc: "VIP multipliers stack on top of your spin result. VIP members get even more from spinning.",
                  },
                  {
                    icon: Rocket,
                    title: "One Spin Per Day",
                    desc: "Either claim your fixed reward or spin the wheel — the choice resets daily.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex gap-3 p-4 rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)]"
                    >
                      <Icon size={16} className="text-[var(--rose)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-display font-bold text-[13px]">{item.title}</p>
                        <p className="text-[11px] text-[var(--ink-faint)] mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── ACHIEVEMENTS TAB ────────────────────────────────────────── */}
        {isAuthenticated && !loading && status && activeTab === "achievements" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="rail-gold">
                <span className="t-eyebrow">Unlock, collect, climb</span>
                <h3 className="t-section !text-[18px] mt-1">Achievement Badges</h3>
              </div>
              <span className="chip chip-gold !py-1.5 !px-3">
                <span className="num">
                  {status.unlockedAchievements.length}/{status.config.achievements.length}
                </span>{" "}
                Unlocked
              </span>
            </div>

            <div className="rounded-[16px] p-5 border border-[var(--line-default)] bg-[var(--bg-surface)] grain">
              <div className="relative flex items-center gap-4">
                <ProgressRing
                  value={status.unlockedAchievements.length}
                  max={status.config.achievements.length}
                  size={72}
                  strokeWidth={6}
                />
                <div>
                  <p className="font-display font-bold text-[16px]">Achievement Progress</p>
                  <p className="text-[12px] text-[var(--ink-faint)]">
                    Complete milestones to unlock badges and earn bonus rewards.
                  </p>
                  <p className="num text-[12px] text-[var(--gold-bright)] font-semibold mt-1">
                    {status.config.achievements.length - status.unlockedAchievements.length}{" "}
                    remaining
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 stagger">
              {status.config.achievements.map((ach, i) => (
                <AchievementCard
                  key={ach.id}
                  achievement={ach}
                  unlocked={status.unlockedAchievements.includes(ach.id)}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── LEADERBOARD TAB ────────────────────────────────────────── */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <div className="rail-gold">
              <span className="t-eyebrow">Top earners</span>
              <h3 className="t-section !text-[18px] mt-1">Leaderboard</h3>
            </div>
            {leaderboard.length === 0 ? (
              <div className="text-center py-16 rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)]">
                <p className="text-[13px] text-[var(--ink-faint)]">
                  No data yet. Be the first to claim!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-w-2xl">
                {leaderboard.map((entry, i) => (
                  <LeaderboardRow key={entry.userId} entry={entry} rank={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────── */}
        {isAuthenticated && activeTab === "history" && (
          <div className="space-y-3">
            <div className="rail-gold">
              <span className="t-eyebrow">Your claims</span>
              <h3 className="t-section !text-[18px] mt-1">Reward History</h3>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-16 rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)]">
                <p className="text-[13px] text-[var(--ink-faint)]">
                  No claims yet. Start your streak today.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {history.map((claim: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-gold)] transition-colors"
                    >
                      <IconBadge index={(claim.cycleDay - 1) % DAY_ICONS.length} size={16} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold">
                          Day <span className="num">{claim.cycleDay}</span> · Streak{" "}
                          <span className="num">{claim.streak}</span>
                        </p>
                        <p className="text-[10px] text-[var(--ink-whisper)] num">
                          {claim.claimDate} · {claim.rewardType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="num text-[var(--emerald)] font-semibold text-[13px]">
                          +{formatReward(claim.totalReward, claim.currency)}
                        </p>
                        {claim.jackpotAmount > 0 && (
                          <span className="chip chip-gold !text-[9px] !py-0.5">Jackpot</span>
                        )}
                        {claim.weeklyMegaClaimed && (
                          <span className="chip chip-violet !text-[9px] !py-0.5">Mega</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex justify-center gap-3 mt-4">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage <= 1}
                    className="btn btn-ghost h-9 text-[11px] disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="num text-[12px] text-[var(--ink-faint)] flex items-center px-3">
                    Page {historyPage}
                  </span>
                  <button
                    onClick={() => setHistoryPage((p) => p + 1)}
                    disabled={history.length < 20}
                    className="btn btn-ghost h-9 text-[11px] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {claimResult && (
          <ClaimResultOverlay result={claimResult} onClose={() => setClaimResult(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Milestone Bar ────────────────────────────────────────────────────── */
function MilestoneBar({
  title,
  subtitle,
  streak,
  required,
  icon,
  accent,
}: {
  title: string;
  subtitle: string;
  streak: number;
  required: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className="relative rounded-[16px] p-4 border grain overflow-hidden"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
        background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 10%, transparent), var(--bg-surface))`,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-[10px] grid place-items-center border"
          style={{
            background: `color-mix(in srgb, ${accent} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
            color: accent,
            boxShadow: `0 4px 14px color-mix(in srgb, ${accent} 25%, transparent)`,
          }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-[14px]">{title}</p>
          <p className="text-[11px] text-[var(--ink-whisper)]">{subtitle}</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--bg-inlay)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (streak / required) * 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${accent}, var(--gold))` }}
        />
      </div>
      <p className="num text-[11px] text-[var(--ink-faint)] mt-1.5 font-semibold">
        {streak}/{required} days
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function DailyRewardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-[var(--gold-line)] border-t-[var(--gold-bright)] rounded-full animate-spin" />
        </div>
      }
    >
      <DailyRewardsContent />
    </Suspense>
  );
}
