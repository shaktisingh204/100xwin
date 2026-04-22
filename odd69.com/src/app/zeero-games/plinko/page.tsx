"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { Zap, Volume2, VolumeX, BarChart3, Clock } from "lucide-react";
import OriginalsShell from "@/components/originals/OriginalsShell";
import OriginalsControls from "@/components/originals/OriginalsControls";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useModal } from "@/context/ModalContext";
import { useOriginalsAccess } from "@/hooks/useOriginalsAccess";
import { useGameSounds } from "@/hooks/useGameSounds";
import { getConfiguredSocketNamespace } from "@/utils/socketUrl";

type WalletType = "fiat" | "crypto";
type PlinkoRisk = "low" | "medium" | "high";
type PlinkoRows = 8 | 12 | 16;

interface PlinkoResult {
  gameId: string;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  path: number[];
  slotIndex: number;
  multiplier: number;
  payout: number;
  status: "WON" | "LOST";
  betAmount: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
}

interface PlinkoHistoryItem {
  gameId: string;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  path: number[];
  slotIndex: number;
  multiplier: number;
  payout: number;
  status: "WON" | "LOST";
  betAmount: number;
  createdAt: string;
}

const ROW_OPTIONS: readonly PlinkoRows[] = [8, 12, 16] as const;
const RISK_OPTIONS: ReadonlyArray<{ key: PlinkoRisk; label: string }> = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
];

const PLINKO_TABLES: Record<PlinkoRows, Record<PlinkoRisk, number[]>> = {
  8: {
    low: [5.6, 2.0, 1.1, 1.0, 0.4, 1.0, 1.1, 2.0, 5.6],
    medium: [13, 3.0, 1.3, 0.7, 0.3, 0.7, 1.3, 3.0, 13],
    high: [29, 4.0, 1.5, 0.3, 0.1, 0.3, 1.5, 4.0, 29],
  },
  12: {
    low: [9.0, 2.9, 1.6, 1.3, 1.1, 0.9, 0.6, 0.9, 1.1, 1.3, 1.6, 2.9, 9.0],
    medium: [20, 6.0, 3.0, 1.8, 1.2, 0.7, 0.3, 0.7, 1.2, 1.8, 3.0, 6.0, 20],
    high: [45, 11, 4.0, 2.5, 1.0, 0.5, 0.2, 0.5, 1.0, 2.5, 4.0, 11, 45],
  },
  16: {
    low: [12, 6.0, 3.0, 1.8, 1.4, 1.1, 1.0, 0.9, 0.7, 0.9, 1.0, 1.1, 1.4, 1.8, 3.0, 6.0, 12],
    medium: [18, 8.0, 4.0, 2.2, 1.6, 1.4, 1.1, 0.8, 0.45, 0.8, 1.1, 1.4, 1.6, 2.2, 4.0, 8.0, 18],
    high: [1000, 162, 38, 9, 3, 1.5, 0.5, 0.2, 0.1, 0.2, 0.5, 1.5, 3, 9, 38, 162, 1000],
  },
};

/** Returns a CSS background color based on multiplier value — amber/green/red risk gradient */
function getSlotGradient(multiplier: number): string {
  if (multiplier >= 100) return "linear-gradient(180deg, #f43f5e 0%, #9f1239 100%)";
  if (multiplier >= 20) return "linear-gradient(180deg, #ef4444 0%, #991b1b 100%)";
  if (multiplier >= 5) return "linear-gradient(180deg, #f97316 0%, #c2410c 100%)";
  if (multiplier >= 2) return "linear-gradient(180deg, #f59e0b 0%, #b45309 100%)";
  if (multiplier >= 1) return "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)";
  if (multiplier >= 0.5) return "linear-gradient(180deg, #84cc16 0%, #4d7c0f 100%)";
  return "linear-gradient(180deg, #10b981 0%, #047857 100%)";
}

function getSlotTextColor(multiplier: number): string {
  if (multiplier >= 2) return "#fff";
  return "#1a1208";
}

function formatMultiplier(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(0)}k`;
  if (m >= 100) return m.toFixed(0);
  if (m >= 10) return m.toFixed(1);
  return m.toFixed(2);
}

function getWalletSymbol(walletType: WalletType) {
  return walletType === "crypto" ? "$" : "₹";
}

export default function PlinkoPage() {
  const { token, loading: authLoading } = useAuth();
  const { canAccessOriginals, loading: accessLoading } = useOriginalsAccess();
  const { fiatBalance, cryptoBalance, refreshWallet, selectedWallet, setSelectedWallet } = useWallet();
  const { openLogin } = useModal();
  const { playBet, playCrash, playTick, playWin, muted, toggleMute } = useGameSounds();

  const socketRef = useRef<Socket | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const hasSession = !!token;

  const [walletType, setWalletType] = useState<WalletType>(selectedWallet);
  const [useBonus, setUseBonus] = useState(false);
  const [betInput, setBetInput] = useState("10");
  const [rows, setRows] = useState<PlinkoRows>(16);
  const [risk, setRisk] = useState<PlinkoRisk>("high");
  const [history, setHistory] = useState<PlinkoHistoryItem[]>([]);
  const [isDropping, setIsDropping] = useState(false);
  const [lastResult, setLastResult] = useState<PlinkoResult | null>(null);
  const [ball, setBall] = useState({ visible: false, x: 50, y: 2 });
  const [hyperMode, setHyperMode] = useState(false);
  const [resultBannerKey, setResultBannerKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  // Trail of ball positions for glow effect
  const [ballTrail, setBallTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const trailCounter = useRef(0);

  const betAmount = parseFloat(betInput) || 0;
  const activeBalance = walletType === "crypto" ? cryptoBalance : fiatBalance;
  const activeSymbol = getWalletSymbol(walletType);
  const multiplierTable = useMemo(() => PLINKO_TABLES[rows][risk], [risk, rows]);

  useEffect(() => { setWalletType(selectedWallet); }, [selectedWallet]);

  useEffect(() => {
    if (!authLoading && !accessLoading && (!hasSession || !canAccessOriginals)) {
      window.location.href = "/";
    }
  }, [authLoading, accessLoading, canAccessOriginals, hasSession]);

  const clearDropTimers = useCallback(() => {
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
  }, []);

  const animateDrop = useCallback((result: PlinkoResult, isDemo = false) => {
    clearDropTimers();
    setBallTrail([]);
    setBall({ visible: true, x: 50, y: 2 });
    setIsDropping(true);

    const pegSpacing = 75 / result.rows;
    let rights = 0;
    const stepDelay = hyperMode ? 45 : 110;

    result.path.forEach((step, index) => {
      const id = window.setTimeout(() => {
        rights += step;
        const stepCount = index + 1;
        const x = 50 + (rights - stepCount / 2) * pegSpacing;
        const y = 6 + (stepCount / result.rows) * 74;
        setBall({ visible: true, x, y });
        // Add trail point
        const trailId = trailCounter.current++;
        setBallTrail((prev) => [...prev.slice(-4), { x, y, id: trailId }]);
        if (!isDemo) playTick(1 + stepCount / 4);
      }, index * stepDelay);
      timeoutRefs.current.push(id);
    });

    const settleId = window.setTimeout(() => {
      const x = 50 + (result.slotIndex - result.rows / 2) * pegSpacing;
      setBall({ visible: true, x, y: 88 });
      setBallTrail([]);
    }, result.path.length * stepDelay + (hyperMode ? 15 : 35));
    timeoutRefs.current.push(settleId);

    const finishId = window.setTimeout(() => {
      setLastResult(result);
      setResultBannerKey((k) => k + 1);
      setIsDropping(false);
      if (!isDemo) {
        if (result.multiplier >= 1) {
          playWin();
        } else {
          playCrash();
        }
      }
    }, result.path.length * stepDelay + (hyperMode ? 80 : 480));
    timeoutRefs.current.push(finishId);
  }, [clearDropTimers, hyperMode, playCrash, playTick, playWin]);

  useEffect(() => {
    const endpoint = getConfiguredSocketNamespace("originals");
    if (!endpoint) return;
    const authToken = localStorage.getItem("token") || "";
    const socket = io(endpoint.url, {
      path: endpoint.path,
      auth: { token: authToken },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-originals", { game: "plinko" });
      socket.emit("plinko:history");
    });

    socket.on("plinko:result", (result: PlinkoResult) => {
      void refreshWallet();
      setHistory((prev) => [
        {
          gameId: result.gameId, rows: result.rows, risk: result.risk, path: result.path,
          slotIndex: result.slotIndex, multiplier: result.multiplier, payout: result.payout,
          status: result.status, betAmount: result.betAmount, createdAt: new Date().toISOString(),
        },
        ...prev.slice(0, 29),
      ]);
      animateDrop(result, false);
    });

    socket.on("plinko:history", (items: PlinkoHistoryItem[]) => { setHistory(items); });

    socket.on("plinko:error", (payload: { message: string }) => {
      clearDropTimers();
      setIsDropping(false);
      setBall((c) => ({ ...c, visible: false }));
      setBallTrail([]);
      void refreshWallet();
      toast.error(payload.message);
    });

    return () => { clearDropTimers(); socket.disconnect(); };
  }, [animateDrop, clearDropTimers, refreshWallet]);

  const handleWalletTypeChange = useCallback((next: WalletType) => {
    setWalletType(next);
    void setSelectedWallet(next);
  }, [setSelectedWallet]);

  const handleDrop = useCallback(() => {
    if (!hasSession) return openLogin();
    if (isDropping) return;
    if (betAmount <= 0) return toast.error("Enter a bet amount");
    if (betAmount > activeBalance) return toast.error("Insufficient balance");
    if (!socketRef.current) return toast.error("Connecting to server…");
    setLastResult(null);
    setBall({ visible: true, x: 50, y: 2 });
    playBet();
    socketRef.current.emit("plinko:play", { betAmount, rows, risk, walletType, useBonus });
  }, [activeBalance, betAmount, hasSession, isDropping, openLogin, playBet, risk, rows, useBonus, walletType]);

  const pegNodes = useMemo(() => {
    return Array.from({ length: rows }, (_, rowIndex) => {
      const cols = rowIndex + 1;
      return Array.from({ length: cols }, (_, colIndex) => {
        const x = 50 + (colIndex - (cols - 1) / 2) * (75 / rows);
        const y = 8 + ((rowIndex + 1) / rows) * 73;
        return { key: `${rowIndex}-${colIndex}`, x, y };
      });
    }).flat();
  }, [rows]);

  const sliderPct = ((rows - 8) / 8) * 100;

  if (authLoading || accessLoading || !hasSession || !canAccessOriginals) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#06080c]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-t-amber-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-white/50 text-sm font-medium">Loading Plinko…</p>
        </div>
      </div>
    );
  }

  return (
    <OriginalsShell
      gameKey="plinko"
      title="Plinko"
      tags={["# Plinko", "# Zeero Originals", "# Provably Fair"]}
      controls={
        <OriginalsControls
          betInput={betInput}
          setBetInput={setBetInput}
          walletType={walletType}
          setWalletType={handleWalletTypeChange}
          useBonus={useBonus}
          setUseBonus={setUseBonus}
          locked={isDropping}
          accent="#f59e0b"
          action={
            <button
              type="button"
              onClick={handleDrop}
              disabled={isDropping}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-[#1a1208] font-black text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isDropping ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-[#1a1208]/60 border-t-[#1a1208] animate-spin" />
                  Dropping…
                </span>
              ) : "Bet"}
            </button>
          }
        >
          {/* Risk Mode */}
          <div>
            <label className="text-[11px] text-white/50 font-bold uppercase tracking-wider mb-2 block">
              Risk Level
            </label>
            <div className="grid grid-cols-3 gap-1">
              {RISK_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => !isDropping && setRisk(opt.key)}
                  disabled={isDropping}
                  className={`py-2 rounded text-[10px] font-bold uppercase transition-all disabled:opacity-50 ${
                    risk === opt.key
                      ? opt.key === "low"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50"
                        : opt.key === "medium"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                        : "bg-red-500/20 text-red-300 border border-red-400/50"
                      : "bg-white/[0.02] border border-white/[0.06] text-white/50 hover:text-white/70"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-white/50 font-bold uppercase tracking-wider">
                Rows
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-white tabular-nums">{rows}</span>
                <span className="text-[10px] text-white/25">pegs</span>
              </div>
            </div>

            {/* Visual slider with labeled stops */}
            <div className="relative h-1.5 mt-3 mb-2">
              <div className="absolute inset-0 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-200"
                  style={{ width: `${sliderPct}%` }}
                />
              </div>
              <input
                type="range" min={8} max={16} step={4} value={rows}
                onChange={(e) => !isDropping && setRows(Number(e.target.value) as PlinkoRows)}
                disabled={isDropping}
                className="w-full absolute inset-0 z-20 opacity-0 cursor-pointer h-1.5 disabled:cursor-not-allowed"
              />
              {/* Thumb indicator */}
              <div
                className="absolute top-[-7px] h-5 w-5 bg-white rounded-md shadow-lg pointer-events-none z-10 flex items-center justify-center transition-all duration-200"
                style={{ left: `calc(${sliderPct}% - 10px)` }}
              >
                <div className="flex gap-[2px]">
                  <div className="w-px h-2.5 bg-white/40" />
                  <div className="w-px h-2.5 bg-white/40" />
                </div>
              </div>
            </div>
            {/* Stop labels */}
            <div className="flex justify-between px-1 mt-1">
              {ROW_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => !isDropping && setRows(r)}
                  className={`text-[10px] font-bold transition-colors ${
                    rows === r ? "text-amber-400" : "text-white/25 hover:text-white/50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet balance display */}
          <div className="text-[10px] text-white/50 text-center">
            Balance: <span className="text-white/80 font-bold">{activeSymbol}{activeBalance.toFixed(2)}</span>
          </div>

          {/* Hyper / Mute / History row */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/50 hover:text-white transition-all"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
                  showHistory
                    ? "bg-amber-500/15 border-amber-400/40 text-amber-300"
                    : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:text-white"
                }`}
                title="Bet history"
              >
                <BarChart3 size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setHyperMode(!hyperMode)}
              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                hyperMode
                  ? "bg-amber-500/15 border-amber-400/40 text-amber-300"
                  : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:text-white"
              }`}
            >
              <Zap size={11} className={hyperMode ? "animate-pulse" : ""} />
              Hyper
            </button>
          </div>
        </OriginalsControls>
      }
    >
      <div
        className="relative w-full h-full flex flex-col"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #1a1208 0%, #0f0a04 40%, #06080c 100%)",
          minHeight: 520,
        }}
      >
        {/* Result Banner */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[80%] max-w-[540px] h-11 z-30">
          {lastResult ? (
            <div
              key={resultBannerKey}
              className={`w-full h-full rounded-lg flex items-center justify-center gap-3 border backdrop-blur-md transition-all animate-[fadeSlideIn_0.3s_ease] ${
                lastResult.multiplier >= 1
                  ? "bg-emerald-500/15 border-emerald-400/30"
                  : "bg-red-500/10 border-red-400/20"
              }`}
            >
              <span className={`text-lg font-black ${lastResult.multiplier >= 1 ? "text-emerald-300" : "text-red-300"}`}>
                {lastResult.multiplier >= 1 ? "+" : ""}{activeSymbol}{lastResult.payout.toFixed(2)}
              </span>
              <span className="text-white/25 text-xs font-semibold">·</span>
              <span className={`text-sm font-black ${lastResult.multiplier >= 1 ? "text-white" : "text-red-300"}`}>
                {lastResult.multiplier.toFixed(2)}×
              </span>
            </div>
          ) : (
            <div className="w-full h-full rounded-lg bg-black/40 border border-white/[0.06] backdrop-blur-md flex items-center justify-center">
              <span className="text-white/50 text-xs font-semibold">Drop the ball to play</span>
            </div>
          )}
        </div>

        {/* History Panel Overlay */}
        {showHistory && (
          <div className="absolute inset-0 z-40 bg-[#06080c]/95 backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Clock size={14} className="text-amber-400" /> Bet History
              </h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-white/50 hover:text-white transition-colors text-xs font-bold"
              >
                Close ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
              {history.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-white/25 text-sm">No bets yet</div>
              ) : history.map((h, i) => (
                <div key={h.gameId + i} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        h.status === "WON" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/10 text-red-300"
                      }`}>{h.status}</span>
                      <span className="text-[11px] text-white/50">{h.rows}R · {h.risk}</span>
                    </div>
                    <p className="text-[11px] text-white/25 mt-0.5">{activeSymbol}{h.betAmount.toFixed(2)} bet</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${h.status === "WON" ? "text-emerald-300" : "text-red-300"}`}>
                      {h.multiplier.toFixed(2)}×
                    </p>
                    <p className="text-[11px] text-white/50">{activeSymbol}{h.payout.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plinko Board */}
        <div className="flex-1 flex items-center justify-center mt-16 p-3 relative z-10">
          <div className="w-full max-w-[680px] aspect-[1/1.05] relative">

            {/* Pegs */}
            {pegNodes.map((peg) => (
              <div
                key={peg.key}
                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 bg-white/10"
                style={{
                  left: `${peg.x}%`,
                  top: `${peg.y}%`,
                  width: `${Math.max(5, 9 - rows * 0.15)}px`,
                  height: `${Math.max(5, 9 - rows * 0.15)}px`,
                  boxShadow: "0 0 4px rgba(245,158,11,0.25)",
                }}
              />
            ))}

            {/* Ball Trail */}
            {ballTrail.map((pt, i) => (
              <div
                key={pt.id}
                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  width: "14px",
                  height: "14px",
                  background: "rgba(245,158,11,0.2)",
                  opacity: (i + 1) / ballTrail.length * 0.6,
                }}
              />
            ))}

            {/* Ball */}
            {ball.visible && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                style={{
                  left: `${ball.x}%`,
                  top: `${ball.y}%`,
                  width: `${Math.max(14, 20 - rows * 0.2)}px`,
                  height: `${Math.max(14, 20 - rows * 0.2)}px`,
                  transition: hyperMode
                    ? "left 45ms ease-out, top 45ms ease-out"
                    : "left 100ms cubic-bezier(0.25,0.1,0.25,1), top 100ms cubic-bezier(0.25,0.1,0.25,1)",
                }}
              >
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: "radial-gradient(circle at 35% 35%, #fde68a, #f59e0b 50%, #b45309)",
                    boxShadow: "0 0 12px rgba(245,158,11,0.9), 0 0 24px rgba(245,158,11,0.5)",
                  }}
                />
              </div>
            )}

            {/* Multiplier Slots */}
            <div className="absolute inset-x-[1%] bottom-[1%] h-[30px] sm:h-[36px] flex items-end gap-[2px]">
              {multiplierTable.map((multiplier, index) => {
                const isLast = lastResult?.slotIndex === index;
                return (
                  <div
                    key={`${rows}-${risk}-${index}`}
                    className="flex-1 h-full rounded-[4px] flex items-center justify-center relative overflow-hidden transition-all duration-200"
                    style={{
                      background: getSlotGradient(multiplier),
                      transform: isLast ? "translateY(2px) scaleY(0.95)" : "translateY(0)",
                      boxShadow: isLast
                        ? "none"
                        : "0 3px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                    }}
                  >
                    {isLast && (
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    )}
                    <span
                      className="tabular-nums leading-none font-black relative z-10"
                      style={{
                        color: getSlotTextColor(multiplier),
                        fontSize: multiplierTable.length > 14
                          ? "8px"
                          : multiplierTable.length > 10
                          ? "10px"
                          : "12px",
                      }}
                    >
                      {formatMultiplier(multiplier)}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* CSS for the result banner animation */}
        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(-6px) translateX(-50%); }
            to { opacity: 1; transform: translateY(0) translateX(-50%); }
          }
        `}</style>
      </div>
    </OriginalsShell>
  );
}
