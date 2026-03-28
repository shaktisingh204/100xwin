"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import Header from "@/components/layout/Header";
import LeftSidebar from "@/components/layout/LeftSidebar";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useModal } from "@/context/ModalContext";
import { useOriginalsAccess } from "@/hooks/useOriginalsAccess";
import { useGameSounds } from "@/hooks/useGameSounds";
import { getConfiguredSocketNamespace } from "@/utils/socketUrl";

type Phase = "BETTING" | "FLYING" | "CRASHED" | "IDLE";
interface LiveBet { username: string; betAmount: number; cashedOut?: boolean; multiplier?: number; payout?: number; }
interface HistoryRound { roundId: number; crashPoint: number; }
type WalletType = "fiat" | "crypto";

function getWalletSymbol(walletType: WalletType) {
  return walletType === "crypto" ? "$" : "₹";
}

/* ═══ History pill ═══════════════════════════════════════════════════════ */
function HistoryPill({ h }: { h: HistoryRound }) {
  const color = h.crashPoint < 2 ? "#e74c3c" : h.crashPoint < 5 ? "#2ecc71" : h.crashPoint < 10 ? "#3498db" : "#f39c12";
  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 64 }}>
      <span className="text-[10px] text-zinc-600 tabular-nums">{h.roundId}</span>
      <span className="font-extrabold text-xs tabular-nums" style={{ color }}>{h.crashPoint.toFixed(2)}x</span>
    </div>
  );
}

/* ═══ Canvas — crash graph with green curve + grid ══════════════════════ */
function useCrashCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  phase: Phase,
  multiplier: number,
  startTime: number,
) {
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth * 2;
      canvas.height = p.clientHeight * 2;
      canvas.style.width = p.clientWidth + "px";
      canvas.style.height = p.clientHeight + "px";
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const W = canvas.width / 2;
      const H = canvas.height / 2;
      if (W === 0 || H === 0) { rafRef.current = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, W, H);

      const padL = 45;
      const padR = 15;
      const padT = 20;
      const padB = 30;
      const gW = W - padL - padR;
      const gH = H - padT - padB;

      /* ── Grid lines ─────────────────────────────────────── */
      ctx.strokeStyle = "#1a1f2e";
      ctx.lineWidth = 1;

      // Horizontal grid + Y labels
      const maxMulti = Math.max(2, multiplier * 1.3);
      const ySteps = Math.max(2, Math.ceil(maxMulti));
      for (let i = 0; i <= ySteps; i++) {
        const val = 1 + (maxMulti - 1) * (i / ySteps);
        const y = padT + gH - (gH * i / ySteps);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
        // Label
        ctx.fillStyle = "#555";
        ctx.font = "11px Roboto, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(1) + "x", padL - 6, y + 4);
      }

      // Vertical grid + X labels (time in seconds)
      const elapsed = (phase === "FLYING" || phase === "CRASHED") ? (Date.now() - startTime) / 1000 : 0;
      const maxTime = Math.max(5, elapsed * 1.2);
      const xSteps = Math.min(8, Math.max(3, Math.ceil(maxTime)));
      for (let i = 0; i <= xSteps; i++) {
        const x = padL + gW * (i / xSteps);
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + gH);
        ctx.strokeStyle = "#1a1f2e";
        ctx.stroke();
        // Label
        const tVal = (maxTime * i / xSteps).toFixed(0);
        ctx.fillStyle = "#555";
        ctx.font = "11px Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(tVal + "s", x, padT + gH + 18);
      }

      /* ── Curve ──────────────────────────────────────────── */
      if ((phase === "FLYING" || phase === "CRASHED") && multiplier > 1) {
        // Generate curve points using exponential growth
        const points: [number, number][] = [];
        const numPts = 80;
        for (let i = 0; i <= numPts; i++) {
          const t = i / numPts;
          // Exponential: mult = e^(k*time), where time maps to t
          const m = 1 + (multiplier - 1) * (Math.exp(t * 2.5) - 1) / (Math.exp(2.5) - 1);
          const x = padL + gW * (t * elapsed / maxTime);
          const y = padT + gH - gH * ((m - 1) / (maxMulti - 1));
          points.push([x, y]);
        }

        // Filled area under curve
        ctx.beginPath();
        ctx.moveTo(padL, padT + gH);
        points.forEach(([x, y]) => ctx.lineTo(x, y));
        const lastPt = points[points.length - 1];
        ctx.lineTo(lastPt[0], padT + gH);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, padT, 0, padT + gH);
        if (phase === "CRASHED") {
          grad.addColorStop(0, "rgba(231,76,60,0.25)");
          grad.addColorStop(1, "rgba(231,76,60,0.02)");
        } else {
          grad.addColorStop(0, "rgba(46,204,113,0.25)");
          grad.addColorStop(1, "rgba(46,204,113,0.02)");
        }
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke
        ctx.beginPath();
        points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.strokeStyle = phase === "CRASHED" ? "#e74c3c" : "#2ecc71";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.stroke();

        // Dot at end
        if (phase === "FLYING") {
          ctx.beginPath();
          ctx.arc(lastPt[0], lastPt[1], 5, 0, Math.PI * 2);
          ctx.fillStyle = "#2ecc71";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(lastPt[0], lastPt[1], 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(46,204,113,0.4)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, phase, multiplier, startTime]);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function CrashPage() {
  const { token, loading: authLoading } = useAuth();
  const { canAccessOriginals, loading: accessLoading } = useOriginalsAccess();
  const {
    fiatBalance,
    cryptoBalance,
    refreshWallet,
    selectedWallet,
    setSelectedWallet,
  } = useWallet();
  const { openLogin } = useModal();
  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { playBet, playTick, playWin, playCrash, muted, toggleMute } = useGameSounds();
  const hasSession = !!token;

  useEffect(() => {
    if (!authLoading && !accessLoading && (!hasSession || !canAccessOriginals)) {
      window.location.href = "/";
    }
  }, [hasSession, authLoading, accessLoading, canAccessOriginals]);

  const multiplierRef = useRef(1.0);
  const roundIdRef = useRef(0);
  const [startTime, setStartTime] = useState(0);
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [multiplier, setMultiplier] = useState(1.0);
  const [betInput, setBetInput] = useState("100.00");
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutMulti, setCashoutMulti] = useState(0);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const [history, setHistory] = useState<HistoryRound[]>([]);
  const [betTab, setBetTab] = useState<"manual" | "auto">("manual");
  const [autoCashOut, setAutoCashOut] = useState(false);
  const [autoCashOutAt, setAutoCashOutAt] = useState("2.00");
  const [walletType, setWalletType] = useState<WalletType>(selectedWallet);

  // Auto-bet state
  const [autoRounds, setAutoRounds] = useState("10");
  const [autoStopWin, setAutoStopWin] = useState("");
  const [autoStopLoss, setAutoStopLoss] = useState("");
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRoundsLeft, setAutoRoundsLeft] = useState(0);
  const [autoProfit, setAutoProfit] = useState(0);
  const autoRunningRef = useRef(false);
  const autoProfitRef = useRef(0);
  const lastBetAmountRef = useRef(0);
  const betInputRef = useRef(betInput);
  const autoCashOutAtRef = useRef(autoCashOutAt);
  const autoStopWinRef = useRef(autoStopWin);
  const autoStopLossRef = useRef(autoStopLoss);
  const walletTypeRef = useRef<WalletType>(walletType);

  useEffect(() => { betInputRef.current = betInput; }, [betInput]);
  useEffect(() => { autoCashOutAtRef.current = autoCashOutAt; }, [autoCashOutAt]);
  useEffect(() => { autoStopWinRef.current = autoStopWin; }, [autoStopWin]);
  useEffect(() => { autoStopLossRef.current = autoStopLoss; }, [autoStopLoss]);
  useEffect(() => { walletTypeRef.current = walletType; }, [walletType]);
  useEffect(() => { setWalletType(selectedWallet); }, [selectedWallet]);

  useCrashCanvas(canvasRef, phase, multiplier, startTime);

  /* ── Socket — /aviator (crash engine) ───────────────────────────────── */
  useEffect(() => {
    const endpoint = getConfiguredSocketNamespace("aviator");
    if (!endpoint) {
      return;
    }

    const token = localStorage.getItem("token") || "";
    const s = io(endpoint.url, { path: endpoint.path, auth: { token }, transports: ["websocket"] });
    socketRef.current = s;

    s.on("aviator:state", (d: { status: string; roundId: number; multiplier: number }) => {
      roundIdRef.current = d.roundId;
      const p = d.status as Phase;
      setPhase(p);
      if (p === "FLYING") { multiplierRef.current = d.multiplier; setMultiplier(d.multiplier); setStartTime(Date.now() - 1000); }
    });
    s.on("aviator:betting", (d: { roundId: number }) => {
      roundIdRef.current = d.roundId;
      setPhase("BETTING"); multiplierRef.current = 1.0; setMultiplier(1.0);
      setHasBet(false); setCashedOut(false); setCashoutMulti(0); setLiveBets([]);

      // Auto-bet: place bet automatically when new round starts
      if (autoRunningRef.current) {
        setAutoRoundsLeft(prev => {
          if (prev <= 0) { autoRunningRef.current = false; setAutoRunning(false); return 0; }
          // Check stop limits
          const sw = parseFloat(autoStopWinRef.current) || 0;
          const sl = parseFloat(autoStopLossRef.current) || 0;
          if (sw > 0 && autoProfitRef.current >= sw) { autoRunningRef.current = false; setAutoRunning(false); toast.success("Auto stopped: profit target reached"); return 0; }
          if (sl > 0 && autoProfitRef.current <= -sl) { autoRunningRef.current = false; setAutoRunning(false); toast.error("Auto stopped: loss limit reached"); return 0; }
          // Fire bet
          const ba = parseFloat(betInputRef.current) || 100;
          const acAt = parseFloat(autoCashOutAtRef.current) || 0;
          lastBetAmountRef.current = ba;
          setTimeout(() => {
            if (autoRunningRef.current) {
              s.emit("aviator:bet", { roundId: d.roundId, betAmount: ba, autoCashoutAt: acAt, walletType: walletTypeRef.current });
            }
          }, 500);
          return prev - 1;
        });
      }
    });
    s.on("aviator:start", (d: { roundId: number }) => {
      roundIdRef.current = d.roundId;
      setPhase("FLYING"); setStartTime(Date.now());
    });
    s.on("aviator:tick", (d: { roundId: number; multiplier: number }) => {
      multiplierRef.current = d.multiplier; setMultiplier(d.multiplier);
      playTick(d.multiplier);
    });
    s.on("aviator:crash", (d: { roundId: number; crashPoint: number }) => {
      setPhase("CRASHED"); multiplierRef.current = d.crashPoint; setMultiplier(d.crashPoint);
      playCrash();
      setHistory(prev => [{ roundId: d.roundId, crashPoint: d.crashPoint }, ...prev.slice(0, 29)]);
      // Auto-bet: track loss if we had a bet and didn't cash out
      if (autoRunningRef.current && lastBetAmountRef.current > 0) {
        // Will be corrected if cashout-success fires before crash
      }
    });
    s.on("aviator:bet-placed", () => {
      setHasBet(true);
      playBet();
      void refreshWallet();
    });
    s.on("aviator:cashout-success", (d: { multiplier: number; payout: number }) => {
      setCashedOut(true);
      setCashoutMulti(d.multiplier || multiplierRef.current);
      playWin();
      void refreshWallet();
      toast.success(`Won ${getWalletSymbol(walletTypeRef.current)}${d.payout.toFixed(2)} at ${(d.multiplier || multiplierRef.current).toFixed(2)}×`);
      // Auto: track profit
      if (autoRunningRef.current) {
        const net = d.payout - lastBetAmountRef.current;
        autoProfitRef.current += net;
        setAutoProfit(autoProfitRef.current);
        lastBetAmountRef.current = 0;
      }
    });
    s.on("aviator:player-bet", (d: { username: string; betAmount: number }) => {
      setLiveBets(prev => [...prev, { username: d.username, betAmount: d.betAmount }]);
    });
    s.on("aviator:player-cashout", (d: { username: string; multiplier: number; payout: number }) => {
      setLiveBets(prev => prev.map(b => b.username === d.username && !b.cashedOut ? { ...b, cashedOut: true, multiplier: d.multiplier, payout: d.payout } : b));
    });
    s.on("aviator:history", (d: HistoryRound[]) => setHistory(d));
    // Track auto loss when round crashes and we had an active bet
    s.on("aviator:crash", () => {
      if (autoRunningRef.current && lastBetAmountRef.current > 0) {
        autoProfitRef.current -= lastBetAmountRef.current;
        setAutoProfit(autoProfitRef.current);
        lastBetAmountRef.current = 0;
      }
    });
    s.on("aviator:error", (d: { message: string }) => {
      toast.error(d.message);
      setHasBet(false);
      autoRunningRef.current = false;
      setAutoRunning(false);
      void refreshWallet();
    });
    return () => { s.disconnect(); };
  }, [playBet, playCrash, playTick, playWin, refreshWallet]);

  const betAmount = parseFloat(betInput) || 0;
  const activeBalance = walletType === "crypto" ? cryptoBalance : fiatBalance;
  const activeSymbol = getWalletSymbol(walletType);

  const handleWalletTypeChange = useCallback((nextWallet: WalletType) => {
    setWalletType(nextWallet);
    void setSelectedWallet(nextWallet);
  }, [setSelectedWallet]);

  const handleBet = useCallback(() => {
    if (!hasSession) { openLogin(); return; }
    if (betAmount <= 0) { toast.error("Enter a bet amount"); return; }
    if (betAmount > activeBalance) { toast.error("Insufficient balance"); return; }
    const acAt = autoCashOut ? parseFloat(autoCashOutAt) || 0 : 0;
    socketRef.current?.emit("aviator:bet", { roundId: roundIdRef.current, betAmount, autoCashoutAt: acAt, walletType: walletTypeRef.current });
  }, [activeBalance, autoCashOut, autoCashOutAt, betAmount, hasSession, openLogin]);

  const handleCashout = useCallback(() => {
    socketRef.current?.emit("aviator:cashout", { roundId: roundIdRef.current });
  }, []);

  const handleStartAuto = useCallback(() => {
    if (!hasSession) { openLogin(); return; }
    if (betAmount <= 0) { toast.error("Enter a bet amount"); return; }
    if (betAmount > activeBalance) { toast.error("Insufficient balance"); return; }
    const rounds = parseInt(autoRounds) || 10;
    autoProfitRef.current = 0;
    setAutoProfit(0);
    setAutoRoundsLeft(rounds);
    autoRunningRef.current = true;
    setAutoRunning(true);
    lastBetAmountRef.current = 0;
    // If currently in BETTING phase, place bet immediately
    if (phase === "BETTING") {
      const acAt = parseFloat(autoCashOutAtRef.current) || 0;
      lastBetAmountRef.current = betAmount;
      socketRef.current?.emit("aviator:bet", { roundId: roundIdRef.current, betAmount, autoCashoutAt: acAt, walletType: walletTypeRef.current });
      setAutoRoundsLeft(rounds - 1);
    }
  }, [activeBalance, autoRounds, betAmount, hasSession, openLogin, phase]);

  const handleStopAuto = useCallback(() => {
    autoRunningRef.current = false;
    setAutoRunning(false);
  }, []);

  const adjustBet = (dir: "up" | "down") => {
    const cur = parseFloat(betInput) || 0;
    setBetInput(dir === "down" ? Math.max(10, cur - 10).toFixed(2) : (cur + 10).toFixed(2));
  };

  const chance = autoCashOut && parseFloat(autoCashOutAt) > 1
    ? (99 / parseFloat(autoCashOutAt)).toFixed(2)
    : "—";

  return (
    <div className="min-h-screen md:h-screen overflow-y-auto md:overflow-hidden flex flex-col" style={{ background: "#0e0e0e", fontFamily: "'Roboto', sans-serif" }}>
      <Header />
      <div className="flex flex-1 md:overflow-hidden pt-[110px] md:pt-[64px] pb-[80px] md:pb-0 max-w-[1920px] mx-auto w-full">
        <LeftSidebar />
        <main className="flex-1 min-w-0 flex flex-col md:flex-row md:overflow-hidden" style={{ borderLeft: "1px solid #1a1a1a" }}>

          {/* ═══ LEFT — Graph + Controls ═════════════════════════════════ */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ── History strip ─────────────────────────────────────────── */}
            <div className="flex items-center px-2" style={{ minHeight: 40, maxHeight: 40, background: "#111216", borderBottom: "1px solid #1a1f2e" }}>
              <div className="flex-1 overflow-hidden relative">
                <div className="flex gap-0 items-center overflow-x-auto no-scrollbar">
                  {history.length === 0
                    ? <span className="text-zinc-700 text-xs px-2">Waiting…</span>
                    : history.slice(0, 12).map(h => <HistoryPill key={h.roundId} h={h} />)}
                </div>
                <div style={{ position: "absolute", right: 0, top: 0, width: 30, height: "100%", background: "linear-gradient(to left, #111216, transparent)", pointerEvents: "none" }} />
              </div>
              <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.7, flexShrink: 0 }}>
                {muted ? "🔇" : "🔊"}
              </button>
            </div>

            {/* ── Game area — canvas + multiplier ──────────────────────── */}
            <div className="flex-1 relative min-h-0" style={{ background: "#0f1117" }}>
              {/* Canvas */}
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

              {/* Multiplier overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 2, pointerEvents: "none" }}>
                {phase === "FLYING" && (
                  <div className="font-black tabular-nums" style={{
                    color: "#fff", fontSize: "clamp(48px, 12vw, 100px)", lineHeight: 1,
                    textShadow: "0 2px 20px rgba(46,204,113,0.3)",
                  }}>
                    {multiplier.toFixed(2)}<span style={{ fontSize: "0.65em", color: "#2ecc71" }}>×</span>
                  </div>
                )}
                {phase === "CRASHED" && (
                  <div className="text-center">
                    <div className="font-black tabular-nums" style={{
                      color: "#e74c3c", fontSize: "clamp(48px, 12vw, 100px)", lineHeight: 1,
                      textShadow: "0 2px 20px rgba(231,76,60,0.3)",
                    }}>
                      {multiplier.toFixed(2)}<span style={{ fontSize: "0.65em" }}>×</span>
                    </div>
                    <div className="text-zinc-500 text-sm font-bold uppercase tracking-[0.2em] mt-2">Crashed</div>
                  </div>
                )}
                {phase === "BETTING" && (
                  <div className="text-center">
                    <div className="text-zinc-500 font-bold text-sm uppercase tracking-[0.15em] mb-1">Starting in…</div>
                    <div className="text-zinc-400 font-black tabular-nums" style={{ fontSize: "clamp(30px, 8vw, 60px)", lineHeight: 1 }}>
                      1.00<span style={{ fontSize: "0.65em" }}>×</span>
                    </div>
                  </div>
                )}
                {phase === "IDLE" && (
                  <div className="text-zinc-600 font-bold text-sm uppercase tracking-[0.2em]">Connecting…</div>
                )}

                {/* Network status */}
                <div className="absolute bottom-2 right-3 flex items-center gap-1">
                  <span className="text-[10px] text-zinc-600">Network Status</span>
                  <div className="flex gap-0.5">
                    <div className="w-1 h-2 rounded-sm" style={{ background: "#2ecc71" }} />
                    <div className="w-1 h-3 rounded-sm" style={{ background: "#2ecc71" }} />
                    <div className="w-1 h-4 rounded-sm" style={{ background: "#2ecc71" }} />
                    <div className="w-1 h-5 rounded-sm" style={{ background: "#2ecc71" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bet controls ──────────────────────────────────────────── */}
            <div style={{ background: "#14161b", borderTop: "1px solid #1a1f2e", padding: "0 8px 8px" }}>
              {/* Manual / Auto tab */}
              <div className="flex" style={{ borderBottom: "1px solid #1a1f2e" }}>
                {(["manual", "auto"] as const).map(t => (
                  <button key={t} onClick={() => { if (!autoRunning) setBetTab(t); }}
                    className="flex-1 py-2 text-xs font-bold uppercase tracking-[0.12em]" style={{
                    color: betTab === t ? "#fff" : "#555",
                    borderBottom: betTab === t ? "2px solid #2ecc71" : "2px solid transparent",
                    background: "transparent", cursor: autoRunning ? "not-allowed" : "pointer",
                  }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Main action button */}
              <div className="py-2">
                {betTab === "manual" ? (
                  <>
                    {!hasBet && (phase === "BETTING" || phase === "IDLE") && (
                      <button onClick={handleBet} style={{
                        width: "100%", height: 52, borderRadius: 8, cursor: "pointer",
                        backgroundColor: "#1a1d27", color: "#fff", fontWeight: 700, fontSize: 15,
                        border: "1px solid #2a2d3a", transition: "all 0.15s",
                      }}>
                        Bet<br /><span className="text-[10px] text-zinc-500">(Next Round)</span>
                      </button>
                    )}
                    {hasBet && phase === "BETTING" && (
                      <div style={{
                        width: "100%", minHeight: 52, borderRadius: 8,
                        backgroundColor: "#1f2937", color: "#fff", fontWeight: 700, fontSize: 15,
                        border: "1px solid #374151", display: "flex", alignItems: "center", justifyContent: "center",
                        flexDirection: "column", gap: 2,
                      }}>
                        <span>Bet Queued</span>
                        <span className="text-[10px] text-zinc-400">Locked for the next round</span>
                      </div>
                    )}
                    {hasBet && !cashedOut && phase === "FLYING" && (
                      <button onClick={handleCashout} style={{
                        width: "100%", height: 52, borderRadius: 8, border: 0, cursor: "pointer",
                        backgroundColor: "#2ecc71", color: "#000", fontWeight: 800, fontSize: 16,
                        boxShadow: "0 4px 15px rgba(46,204,113,0.3)",
                      }}>
                        Cash Out ({activeSymbol}{(betAmount * multiplier).toFixed(2)})
                      </button>
                    )}
                    {cashedOut && phase === "FLYING" && (
                      <div className="text-center py-3" style={{ background: "#123405", borderRadius: 8, border: "1px solid #4EAF11" }}>
                        <div className="text-[#4EAF11] text-xs font-bold">CASHED OUT</div>
                        <div className="text-white text-lg font-extrabold">{cashoutMulti.toFixed(2)}×</div>
                      </div>
                    )}
                    {phase === "CRASHED" && (
                      <button disabled style={{
                        width: "100%", height: 52, borderRadius: 8, border: "1px solid #2a2d3a",
                        backgroundColor: "#1a1d27", color: "#555", fontWeight: 700, fontSize: 14,
                        cursor: "not-allowed",
                      }}>
                        Waiting…
                      </button>
                    )}
                    {!hasBet && phase === "FLYING" && (
                      <button disabled style={{
                        width: "100%", height: 52, borderRadius: 8, border: "1px solid #2a2d3a",
                        backgroundColor: "#1a1d27", color: "#555", fontWeight: 700, fontSize: 14,
                        cursor: "not-allowed",
                      }}>
                        Bet (Next Round)
                      </button>
                    )}
                  </>
                ) : autoRunning ? (
                  <button onClick={handleStopAuto} style={{
                    width: "100%", height: 52, borderRadius: 8, border: 0, cursor: "pointer",
                    backgroundColor: "#c53030", color: "#fff", fontWeight: 800, fontSize: 15,
                    textTransform: "uppercase", transition: "all 0.15s",
                  }}>
                    STOP AUTO ({autoRoundsLeft} left)
                  </button>
                ) : (
                  <button onClick={handleStartAuto} style={{
                    width: "100%", height: 52, borderRadius: 8, border: 0, cursor: "pointer",
                    backgroundColor: "#e69308", color: "#fff", fontWeight: 800, fontSize: 15,
                    textTransform: "uppercase", transition: "all 0.15s",
                    boxShadow: "0 4px 15px rgba(230,147,8,0.3)",
                  }}>
                    START AUTO
                  </button>
                )}
              </div>

              {/* Amount row */}
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[11px] text-zinc-500 flex items-center gap-1 flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                  Amount
                </div>
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
                  {(["fiat", "crypto"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleWalletTypeChange(type)}
                      disabled={autoRunning}
                      className="px-2 py-0.5 text-[10px] font-black rounded-full transition-colors disabled:opacity-40"
                      style={{
                        color: walletType === type ? "#fff" : "#71717a",
                        background: walletType === type ? "rgba(46,204,113,0.18)" : "transparent",
                      }}
                    >
                      {type === "fiat" ? "₹" : "$"}
                    </button>
                  ))}
                </div>
                <div className="flex-1 flex items-center" style={{ height: 34, borderRadius: 6, background: "#1a1d27", border: "1px solid #2a2d3a", paddingLeft: 8, paddingRight: 4 }}>
                  <span style={{ color: "#e74c3c", marginRight: 6, fontSize: 14 }}>{activeSymbol}</span>
                  <input type="text" value={betInput}
                    onChange={e => setBetInput(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1"))}
                    className="flex-1 bg-transparent text-white font-bold text-sm outline-none min-w-0" />
                  <div className="flex items-center gap-1 ml-1 border-l border-[#2a2d3a] pl-1">
                    <button onClick={() => setBetInput((betAmount / 2).toFixed(2))} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#252830", color: "#888", border: "1px solid #2a2d3a", cursor: "pointer" }}>1/2</button>
                    <button onClick={() => setBetInput((betAmount * 2).toFixed(2))} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#252830", color: "#888", border: "1px solid #2a2d3a", cursor: "pointer" }}>2×</button>
                    <div className="flex flex-col gap-0">
                      <button onClick={() => adjustBet("up")} style={{ width: 18, height: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#252830", border: "1px solid #2a2d3a", borderRadius: "3px 3px 0 0", cursor: "pointer", color: "#888", fontSize: 8, lineHeight: 1 }}>▲</button>
                      <button onClick={() => adjustBet("down")} style={{ width: 18, height: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#252830", border: "1px solid #2a2d3a", borderRadius: "0 0 3px 3px", cursor: "pointer", color: "#888", fontSize: 8, lineHeight: 1, marginTop: -1 }}>▼</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto cash out row */}
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[11px] text-zinc-500 flex-shrink-0">Auto cash out</div>
                <div className="flex-1 flex items-center" style={{ height: 34, borderRadius: 6, background: "#1a1d27", border: "1px solid #2a2d3a", paddingLeft: 8, paddingRight: 4 }}>
                  <input type="text" value={autoCashOutAt}
                    onChange={e => { setAutoCashOutAt(e.target.value); setAutoCashOut(true); }}
                    className="flex-1 bg-transparent text-white font-bold text-sm outline-none min-w-0" />
                  <span className="text-zinc-500 text-sm font-bold mr-1">×</span>
                  <div className="flex items-center gap-1 ml-1 border-l border-[#2a2d3a] pl-1">
                    <button onClick={() => { setAutoCashOutAt(Math.max(1.01, parseFloat(autoCashOutAt) - 0.1).toFixed(2)); setAutoCashOut(true); }} style={{ width: 20, height: 20, borderRadius: 4, background: "#252830", border: "1px solid #2a2d3a", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>‹</button>
                    <button onClick={() => { setAutoCashOutAt((parseFloat(autoCashOutAt) + 0.1).toFixed(2)); setAutoCashOut(true); }} style={{ width: 20, height: 20, borderRadius: 4, background: "#252830", border: "1px solid #2a2d3a", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>›</button>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-500 flex-shrink-0">Chance {chance}%</div>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-1 mb-2">
                {[10, 100, 1000, 10000].map(v => (
                  <button key={v} onClick={() => setBetInput(v.toFixed(2))} style={{
                    flex: 1, height: 26, borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: "#1a1d27", border: "1px solid #2a2d3a", color: "#888", cursor: "pointer",
                    transition: "all 0.1s",
                  }}>
                    {v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}
                  </button>
                ))}
              </div>

              {/* Auto cashout quick values */}
              <div className="flex gap-1 mb-2">
                {[1.01, 2, 10, 100].map(v => (
                  <button key={v} onClick={() => { setAutoCashOutAt(v.toFixed(2)); setAutoCashOut(true); }} style={{
                    flex: 1, height: 26, borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: autoCashOutAt === v.toFixed(2) ? "#2a3a2a" : "#1a1d27",
                    border: autoCashOutAt === v.toFixed(2) ? "1px solid #2ecc71" : "1px solid #2a2d3a",
                    color: autoCashOutAt === v.toFixed(2) ? "#2ecc71" : "#888",
                    cursor: "pointer", transition: "all 0.1s",
                  }}>
                    {v}×
                  </button>
                ))}
              </div>

              {/* Auto settings — only shown when Auto tab selected */}
              {betTab === "auto" && (
                <div className="flex flex-wrap gap-2 mb-2">
                  <div className="flex flex-col gap-0.5" style={{ minWidth: 70 }}>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase">Rounds</div>
                    <input type="text" value={autoRounds} disabled={autoRunning}
                      onChange={e => setAutoRounds(e.target.value.replace(/[^0-9]/g, ""))}
                      className="bg-transparent text-white font-bold text-xs outline-none"
                      style={{ height: 26, borderRadius: 4, background: "#1a1d27", border: "1px solid #2a2d3a", paddingLeft: 6, paddingRight: 6 }} />
                    <div className="flex gap-0.5">
                      {[10, 25, 50, 100].map(v => (
                        <button key={v} onClick={() => { if (!autoRunning) setAutoRounds(String(v)); }}
                          style={{ fontSize: 9, padding: "1px 3px", borderRadius: 4, background: "#252830", border: "1px solid #2a2d3a", color: "#888", cursor: autoRunning ? "not-allowed" : "pointer", flex: 1 }}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5" style={{ minWidth: 70 }}>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase">Stop Profit ₹</div>
                    <input type="text" value={autoStopWin} disabled={autoRunning} placeholder="0"
                      onChange={e => setAutoStopWin(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="bg-transparent text-white font-bold text-xs outline-none placeholder:text-zinc-700"
                      style={{ height: 26, borderRadius: 4, background: "#1a1d27", border: "1px solid #2a2d3a", paddingLeft: 6, paddingRight: 6 }} />
                  </div>
                  <div className="flex flex-col gap-0.5" style={{ minWidth: 70 }}>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase">Stop Loss ₹</div>
                    <input type="text" value={autoStopLoss} disabled={autoRunning} placeholder="0"
                      onChange={e => setAutoStopLoss(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="bg-transparent text-white font-bold text-xs outline-none placeholder:text-zinc-700"
                      style={{ height: 26, borderRadius: 4, background: "#1a1d27", border: "1px solid #2a2d3a", paddingLeft: 6, paddingRight: 6 }} />
                  </div>
                  {autoRunning && (
                    <div className="flex flex-col gap-0.5 ml-auto text-right">
                      <div className="text-[9px] text-zinc-600 font-bold uppercase">Profit</div>
                      <div className="font-bold text-sm tabular-nums" style={{ color: autoProfit >= 0 ? "#2ecc71" : "#e74c3c" }}>
                        {autoProfit >= 0 ? "+" : ""}₹{autoProfit.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Balance */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-zinc-600">Balance: <span className="text-white font-bold">{activeSymbol}{activeBalance?.toFixed(2) ?? "—"}</span></span>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT SIDEBAR — Player bets ════════════════════════════ */}
          <div className="hidden md:flex flex-col w-[320px] flex-shrink-0" style={{ background: "#111318", borderLeft: "1px solid #1a1f2e" }}>
            {/* Tabs */}
            <div className="flex" style={{ borderBottom: "1px solid #1a1f2e" }}>
              {["Classic", "Trenball", "Betting Strategy"].map((t, i) => (
                <button key={t} className="flex-1 py-2 text-[11px] font-bold uppercase tracking-[0.1em]" style={{
                  color: i === 0 ? "#fff" : "#444",
                  borderBottom: i === 0 ? "2px solid #2ecc71" : "2px solid transparent",
                  background: i === 0 ? "#1a1d22" : "transparent",
                }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Player count + total bet */}
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid #1a1f2e" }}>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[11px] text-zinc-400">{liveBets.length} / {liveBets.length} Players</span>
              </div>
              <span className="text-[11px] text-white font-bold">₹{liveBets.reduce((s, b) => s + b.betAmount, 0).toFixed(2)}</span>
            </div>

            {/* Column headers */}
            <div className="flex items-center px-3 py-1 text-[10px] text-zinc-600 font-bold uppercase" style={{ borderBottom: "1px solid #1a1f2e" }}>
              <div className="flex-1">Player</div>
              <div style={{ width: 60, textAlign: "center" }}>Cashout</div>
              <div style={{ width: 90, textAlign: "right" }}>Amount</div>
            </div>

            {/* Players list */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
              {liveBets.length === 0 ? (
                <div className="text-center text-zinc-700 text-xs py-10">Waiting for bets…</div>
              ) : liveBets.map((b, i) => (
                <div key={i} className="flex items-center px-3 py-[6px] hover:bg-[#1a1d22] transition-colors" style={{ borderBottom: "1px solid #111318" }}>
                  <div className="flex-1 text-[12px] text-zinc-300 font-medium truncate">{b.username}</div>
                  <div style={{ width: 60, textAlign: "center" }}>
                    {b.cashedOut
                      ? <span className="text-[12px] font-bold text-green-400">{(b.multiplier || 0).toFixed(2)}x</span>
                      : <span className="text-zinc-700 text-[12px]">—</span>}
                  </div>
                  <div style={{ width: 90, textAlign: "right" }} className="flex items-center justify-end gap-1">
                    <div className="w-3 h-3 rounded-full" style={{
                      background: ["#e74c3c", "#3498db", "#f39c12", "#2ecc71", "#9b59b6", "#e67e22"][i % 6],
                    }} />
                    <span className="text-[12px] text-white font-bold tabular-nums">₹{(b.cashedOut ? (b.payout || 0) : b.betAmount).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
