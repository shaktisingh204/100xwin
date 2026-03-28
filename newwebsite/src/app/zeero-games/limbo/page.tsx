"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import Image from "next/image";
import Header from "@/components/layout/Header";
import LeftSidebar from "@/components/layout/LeftSidebar";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useModal } from "@/context/ModalContext";
import { useOriginalsAccess } from "@/hooks/useOriginalsAccess";
import { useGameSounds } from "@/hooks/useGameSounds";
import { getConfiguredSocketNamespace } from "@/utils/socketUrl";

const FIRE_FRAME_H = 96;
const FIRE_TOTAL_FRAMES = 27;

interface LimboResult { resultMultiplier: number; targetMultiplier: number; result: "WIN" | "LOSE"; payout: number; betAmount: number; }
interface ManualStart { betId: string; crashPoint: number; betAmount: number; }
interface LiveBet { username: string; betAmount: number; targetMultiplier: number; resultMultiplier: number; result: "WIN" | "LOSE"; payout: number; }
interface LimboHistoryBet { cashedOutAt?: number; resultMultiplier: number; result: "WIN" | "LOSE" | "ACTIVE"; }
interface StarDot { width: number; height: number; top: string; left: string; opacity: number; animation: string; animationDelay: string; }
type WalletType = "fiat" | "crypto";

function getWalletSymbol(walletType: WalletType) {
  return walletType === "crypto" ? "$" : "₹";
}

function buildStarField(): StarDot[] {
  return Array.from({ length: 30 }, (_, index) => ({
    width: 1 + ((index * 7) % 3),
    height: 1 + ((index * 11) % 3),
    top: `${(index * 17) % 100}%`,
    left: `${(index * 29) % 100}%`,
    opacity: 0.25 + (((index * 13) % 50) / 100),
    animation: `twinkle ${2 + (index % 5) * 0.6}s ease-in-out infinite`,
    animationDelay: `${(index % 7) * 0.35}s`,
  }));
}

function ResultPill({ r }: { r: { multiplier: number; isWin: boolean } }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 100,
      background: r.isWin ? "#0a2a0a" : "#2a0a0a",
      color: r.isWin ? "#2ecc71" : "#e74c3c",
      border: `1px solid ${r.isWin ? "#2ecc7133" : "#e74c3c33"}`,
      whiteSpace: "nowrap",
    }}>
      {r.multiplier.toFixed(2)}×
    </span>
  );
}

export default function LimboPage() {
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
  const { playBet, playLimboRise, playWin, playCrash, muted, toggleMute } = useGameSounds();
  const lastRiseSoundRef = useRef(0);
  const hasSession = !!token;

  useEffect(() => {
    if (!authLoading && !accessLoading && (!hasSession || !canAccessOriginals)) {
      window.location.href = "/";
    }
  }, [hasSession, authLoading, accessLoading, canAccessOriginals]);

  const [betInput, setBetInput] = useState("100.00");
  const [playing, setPlaying] = useState(false);
  const [historyItems, setHistoryItems] = useState<{ multiplier: number; isWin: boolean }[]>([]);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const [walletType, setWalletType] = useState<WalletType>(selectedWallet);

  // Manual / Auto
  const [betTab, setBetTab] = useState<"manual" | "auto">("manual");

  // === MANUAL MODE state ===
  const [manualBetId, setManualBetId] = useState("");
  const manualCrashRef = useRef(0);
  const [manualMulti, setManualMulti] = useState(1.0);
  const manualMultiRef = useRef(1.0);
  const [manualPhase, setManualPhase] = useState<"idle" | "flying" | "won" | "bust">("idle");
  const manualStartRef = useRef(0);
  const manualRafRef = useRef(0);
  const manualBetIdRef = useRef("");

  // === AUTO MODE state ===
  const [targetInput, setTargetInput] = useState("2.00");
  const [autoRounds, setAutoRounds] = useState("10");
  const [autoStopWin, setAutoStopWin] = useState("");
  const [autoStopLoss, setAutoStopLoss] = useState("");
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRoundsLeft, setAutoRoundsLeft] = useState(0);
  const [autoProfit, setAutoProfit] = useState(0);
  const autoRunningRef = useRef(false);
  const autoProfitRef = useRef(0);
  const betInputRef = useRef(betInput);
  const targetInputRef = useRef(targetInput);
  const autoStopWinRef = useRef(autoStopWin);
  const autoStopLossRef = useRef(autoStopLoss);
  const walletTypeRef = useRef<WalletType>(walletType);
  useEffect(() => { betInputRef.current = betInput; }, [betInput]);
  useEffect(() => { targetInputRef.current = targetInput; }, [targetInput]);
  useEffect(() => { autoStopWinRef.current = autoStopWin; }, [autoStopWin]);
  useEffect(() => { autoStopLossRef.current = autoStopLoss; }, [autoStopLoss]);
  useEffect(() => { walletTypeRef.current = walletType; }, [walletType]);
  useEffect(() => { setWalletType(selectedWallet); }, [selectedWallet]);

  // Animation
  const [rocketY, setRocketY] = useState(5);
  const [fireFrame, setFireFrame] = useState(0);
  const stars = useMemo<StarDot[]>(() => buildStarField(), []);

  // Fire animation
  useEffect(() => {
    if (manualPhase !== "flying") return;
    let raf: number;
    let lastT = 0;
    const tick = (ts: number) => {
      if (ts - lastT > 60) { setFireFrame(f => (f + 1) % FIRE_TOTAL_FRAMES); lastT = ts; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [manualPhase]);

  // Manual multiplier growth loop
  const startManualGrowth = useCallback((crashPoint: number) => {
    manualStartRef.current = Date.now();
    manualCrashRef.current = crashPoint;
    setManualPhase("flying");
    setManualMulti(1.0);
    manualMultiRef.current = 1.0;

    const grow = () => {
      const elapsed = Date.now() - manualStartRef.current;
      const m = parseFloat(Math.pow(Math.E, 0.00006 * elapsed).toFixed(2));
      manualMultiRef.current = m;
      setManualMulti(m);
      setRocketY(Math.min(55, 5 + Math.min((m - 1) / 4, 1) * 50));

      // Play rising sound every ~200ms
      const now = Date.now();
      if (now - lastRiseSoundRef.current > 200) {
        playLimboRise(m);
        lastRiseSoundRef.current = now;
      }

      if (m >= manualCrashRef.current) {
        // BUST
        playCrash();
        setManualPhase("bust");
        setManualMulti(manualCrashRef.current);
        setHistoryItems(prev => [{ multiplier: manualCrashRef.current, isWin: false }, ...prev.slice(0, 29)]);
        socketRef.current?.emit("limbo:bust", { betId: manualBetIdRef.current });
        setPlaying(false);
        setTimeout(() => { setManualPhase("idle"); setRocketY(5); setManualMulti(1.0); }, 1500);
        return;
      }
      manualRafRef.current = requestAnimationFrame(grow);
    };
    manualRafRef.current = requestAnimationFrame(grow);
  }, [playCrash, playLimboRise]);

  /* ── Socket ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const endpoint = getConfiguredSocketNamespace("limbo");
    if (!endpoint) {
      return;
    }

    const token = localStorage.getItem("token") || "";
    const s = io(endpoint.url, { path: endpoint.path, auth: { token }, transports: ["websocket"] });
    socketRef.current = s;

    s.on("limbo:connected", () => {});

    // Manual: server sends crash point
    s.on("limbo:manual-started", (d: ManualStart) => {
      setManualBetId(d.betId);
      manualBetIdRef.current = d.betId;
      startManualGrowth(d.crashPoint);
      void refreshWallet();
    });

    // Manual: cashout success
    s.on("limbo:cashout-success", (d: { payout: number; multiplier: number }) => {
      cancelAnimationFrame(manualRafRef.current);
      setManualPhase("won");
      setManualMulti(d.multiplier);
      setHistoryItems(prev => [{ multiplier: d.multiplier, isWin: true }, ...prev.slice(0, 29)]);
      setPlaying(false);
      playWin();
      void refreshWallet();
      toast.success(`Won ${getWalletSymbol(walletTypeRef.current)}${d.payout.toFixed(2)} at ${d.multiplier.toFixed(2)}×`);
      setTimeout(() => { setManualPhase("idle"); setRocketY(5); setManualMulti(1.0); }, 1500);
    });

    // Auto: instant result
    s.on("limbo:result", (d: LimboResult) => {
      setHistoryItems(prev => [{ multiplier: d.resultMultiplier, isWin: d.result === "WIN" }, ...prev.slice(0, 29)]);
      setPlaying(false);
      if (d.result === "WIN") playWin(); else playCrash();
      void refreshWallet();

      const netGain = d.result === "WIN" ? d.payout - d.betAmount : -d.betAmount;
      autoProfitRef.current += netGain;
      setAutoProfit(autoProfitRef.current);

      // Auto: animate briefly then fire next
      setManualMulti(d.resultMultiplier);
      setManualPhase(d.result === "WIN" ? "won" : "bust");
      setRocketY(d.result === "WIN" ? 55 : 5);

      setTimeout(() => {
        setManualPhase("idle");
        setRocketY(5);
        setManualMulti(1.0);

        if (autoRunningRef.current) {
          setAutoRoundsLeft(prev => {
            const left = prev - 1;
            if (left <= 0) { autoRunningRef.current = false; setAutoRunning(false); return 0; }
            const sw = parseFloat(autoStopWinRef.current) || 0;
            const sl = parseFloat(autoStopLossRef.current) || 0;
            if (sw > 0 && autoProfitRef.current >= sw) { autoRunningRef.current = false; setAutoRunning(false); toast.success("Auto stopped: profit target reached"); return 0; }
            if (sl > 0 && autoProfitRef.current <= -sl) { autoRunningRef.current = false; setAutoRunning(false); toast.error("Auto stopped: loss limit reached"); return 0; }
            setTimeout(() => {
              if (autoRunningRef.current && socketRef.current) {
                setPlaying(true);
                const ba = parseFloat(betInputRef.current) || 100;
                const tm = parseFloat(targetInputRef.current) || 2;
                socketRef.current.emit("limbo:play", { betAmount: ba, targetMultiplier: tm, walletType: walletTypeRef.current });
              }
            }, 300);
            return left;
          });
        }
      }, autoRunningRef.current ? 800 : 1200);
    });

    s.on("limbo:live-bet", (d: LiveBet) => setLiveBets(prev => [d, ...prev.slice(0, 49)]));
    s.on("limbo:history", (d: LimboHistoryBet[]) => {
      setHistoryItems(d.map((bet) => ({
        multiplier: bet.cashedOutAt || bet.resultMultiplier,
        isWin: bet.result === "WIN",
      })));
    });
    s.on("limbo:error", (d: { message: string }) => {
      toast.error(d.message);
      setPlaying(false);
      autoRunningRef.current = false;
      setAutoRunning(false);
      void refreshWallet();
    });

    return () => { s.disconnect(); };
  }, [playCrash, playWin, refreshWallet, startManualGrowth]);

  const betAmount = parseFloat(betInput) || 0;
  const targetMultiplier = parseFloat(targetInput) || 2;
  const winChance = targetMultiplier > 1 ? (99 / targetMultiplier).toFixed(2) : "99.00";
  const activeBalance = walletType === "crypto" ? cryptoBalance : fiatBalance;
  const activeSymbol = getWalletSymbol(walletType);

  const handleWalletTypeChange = useCallback((nextWallet: WalletType) => {
    setWalletType(nextWallet);
    void setSelectedWallet(nextWallet);
  }, [setSelectedWallet]);

  // Manual: bet
  const handleManualBet = useCallback(() => {
    if (!hasSession) { openLogin(); return; }
    if (betAmount <= 0) { toast.error("Enter a bet amount"); return; }
    if (betAmount > activeBalance) { toast.error("Insufficient balance"); return; }
    if (playing) return;
    setPlaying(true);
    playBet();
    lastRiseSoundRef.current = 0;
    socketRef.current?.emit("limbo:play-manual", { betAmount, walletType: walletTypeRef.current });
  }, [activeBalance, betAmount, hasSession, openLogin, playBet, playing]);

  // Manual: cashout
  const handleCashout = useCallback(() => {
    if (!manualBetId || manualPhase !== "flying") return;
    cancelAnimationFrame(manualRafRef.current);
    socketRef.current?.emit("limbo:cashout", { betId: manualBetId, cashoutAt: manualMultiRef.current });
  }, [manualBetId, manualPhase]);

  // Auto: start
  const handleStartAuto = useCallback(() => {
    if (!hasSession) { openLogin(); return; }
    if (betAmount <= 0) { toast.error("Enter a bet amount"); return; }
    if (betAmount > activeBalance) { toast.error("Insufficient balance"); return; }
    if (targetMultiplier < 1.01) { toast.error("Target must be ≥ 1.01×"); return; }
    const rounds = parseInt(autoRounds) || 10;
    autoProfitRef.current = 0; setAutoProfit(0);
    setAutoRoundsLeft(rounds);
    autoRunningRef.current = true; setAutoRunning(true);
    setPlaying(true);
    playBet();
    socketRef.current?.emit("limbo:play", { betAmount, targetMultiplier, walletType: walletTypeRef.current });
  }, [activeBalance, autoRounds, betAmount, hasSession, openLogin, playBet, targetMultiplier]);

  const handleStopAuto = useCallback(() => { autoRunningRef.current = false; setAutoRunning(false); }, []);

  const adjustBet = (dir: "up" | "down") => {
    const cur = parseFloat(betInput) || 0;
    setBetInput(dir === "down" ? Math.max(10, cur - 10).toFixed(2) : (cur + 10).toFixed(2));
  };
  const adjustTarget = (dir: "up" | "down") => {
    const cur = parseFloat(targetInput) || 2;
    setTargetInput(dir === "down" ? Math.max(1.01, cur - 0.1).toFixed(2) : (cur + 0.1).toFixed(2));
  };

  return (
    <div className="min-h-screen md:h-screen overflow-y-auto md:overflow-hidden flex flex-col" style={{ background: "#0e0e0e", fontFamily: "'Roboto', sans-serif" }}>
      <Header />
      <div className="flex flex-1 md:overflow-hidden pt-[110px] md:pt-[64px] pb-[80px] md:pb-0 max-w-[1920px] mx-auto w-full">
        <LeftSidebar />
        <main className="flex-1 min-w-0 flex flex-col md:flex-row md:overflow-hidden" style={{ borderLeft: "1px solid #1a1a1a" }}>

          {/* ═══ LEFT — Live bets ═══════════════════════════════════════ */}
          <div className="hidden md:flex flex-col w-[280px] flex-shrink-0" style={{ background: "#141516" }}>
            <div className="px-3 py-2" style={{ borderBottom: "1px solid #1e1e1e" }}>
              <span className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold">
                Live Bets <span className="text-green-500">{liveBets.length}</span>
              </span>
            </div>
            <div className="flex px-2 py-1 text-[10px] text-zinc-600 font-bold uppercase" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <div style={{ width: "28%" }}>User</div>
              <div style={{ width: "22%", textAlign: "center" }}>Target</div>
              <div style={{ width: "22%", textAlign: "center" }}>Result</div>
              <div style={{ width: "28%", textAlign: "right" }}>Payout</div>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
              {liveBets.length === 0 ? (
                <div className="text-center text-zinc-700 text-xs py-10">No bets yet</div>
              ) : liveBets.map((b, i) => (
                <div key={i} className="flex items-center px-2" style={{
                  height: 32, margin: "1px 2px", borderRadius: 16, fontSize: 11, fontWeight: 600,
                  background: b.result === "WIN" ? "linear-gradient(85deg,#0a2a0a,#0f1214)" : "linear-gradient(85deg,#1a0a0a,#0f1214)",
                  border: b.result === "WIN" ? "1px solid #2ecc7133" : "1px solid #1a1a1a",
                }}>
                  <div style={{ width: "28%" }} className="truncate text-zinc-400">{b.username}</div>
                  <div style={{ width: "22%", textAlign: "center" }} className="text-zinc-300">{b.targetMultiplier.toFixed(2)}×</div>
                  <div style={{ width: "22%", textAlign: "center" }}>
                    <span style={{ color: b.result === "WIN" ? "#2ecc71" : "#e74c3c", fontWeight: 800 }}>{b.resultMultiplier.toFixed(2)}×</span>
                  </div>
                  <div style={{ width: "28%", textAlign: "right" }} className="text-zinc-300">
                    {b.result === "WIN" ? `+₹${b.payout.toFixed(0)}` : `−₹${b.betAmount.toFixed(0)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ CENTER — Game + Controls ═══════════════════════════════ */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ padding: "0 10px 10px" }}>

            {/* History strip */}
            <div className="flex items-center" style={{ minHeight: 36, maxHeight: 36 }}>
              <div className="flex-1 overflow-hidden relative">
                <div className="flex gap-1 items-center overflow-x-auto no-scrollbar py-1">
                  {historyItems.length === 0
                    ? <span className="text-zinc-700 text-xs">Place a bet…</span>
                    : historyItems.slice(0, 25).map((h, i) => <ResultPill key={i} r={h} />)}
                </div>
                <div style={{ position: "absolute", right: 0, top: 0, width: 30, height: "100%", background: "linear-gradient(to left, #0e0e0e, transparent)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Stage */}
            <div className="flex-1 relative min-h-0" style={{
              background: "linear-gradient(180deg, #1a1d23 0%, #12141a 50%, #0e1016 100%)",
              borderRadius: 16, border: "1px solid #2A2B2E", overflow: "hidden",
            }}>
              <div className="absolute inset-0" style={{ opacity: 0.4 }}>
                {stars.map((star, i) => (
                  <div key={i} className="absolute rounded-full bg-white" style={star} />
                ))}
              </div>

              {/* Multiplier display */}
              <div className="absolute inset-0 flex items-start justify-center pt-8 md:pt-12" style={{ zIndex: 3, pointerEvents: "none" }}>
                {manualPhase === "idle" && (
                  <div className="text-center mt-4">
                    <div className="text-zinc-500 font-bold text-sm uppercase tracking-[0.15em] mb-2">
                      {betTab === "manual" ? "Place bet & cash out" : "Set target & bet"}
                    </div>
                    <div className="text-zinc-600 font-black tabular-nums" style={{ fontSize: "clamp(36px, 10vw, 80px)", lineHeight: 1 }}>
                      1.00<span style={{ fontSize: "0.65em" }}>×</span>
                    </div>
                  </div>
                )}
                {manualPhase === "flying" && (
                  <div className="text-center font-black tabular-nums" style={{
                    color: "#ff8c00", fontSize: "clamp(40px, 10vw, 90px)", lineHeight: 1,
                    textShadow: "0 0 30px rgba(255,140,0,0.4)",
                  }}>
                    {manualMulti.toFixed(2)}<span style={{ fontSize: "0.65em" }}>×</span>
                  </div>
                )}
                {manualPhase === "won" && (
                  <div className="text-center">
                    <div className="font-black tabular-nums" style={{
                      color: "#2ecc71", fontSize: "clamp(40px, 10vw, 90px)", lineHeight: 1,
                      textShadow: "0 0 30px rgba(46,204,113,0.4)",
                    }}>
                      {manualMulti.toFixed(2)}<span style={{ fontSize: "0.65em" }}>×</span>
                    </div>
                    <div className="mt-2 font-bold text-sm uppercase tracking-[0.2em]" style={{ color: "#2ecc71" }}>CASHED OUT</div>
                  </div>
                )}
                {manualPhase === "bust" && (
                  <div className="text-center">
                    <div className="font-black tabular-nums" style={{
                      color: "#e74c3c", fontSize: "clamp(40px, 10vw, 90px)", lineHeight: 1,
                      textShadow: "0 0 30px rgba(231,76,60,0.4)",
                    }}>
                      {manualMulti.toFixed(2)}<span style={{ fontSize: "0.65em" }}>×</span>
                    </div>
                    <div className="mt-2 font-bold text-sm uppercase tracking-[0.2em]" style={{ color: "#e74c3c" }}>BUST</div>
                  </div>
                )}
              </div>

              {/* Rocket + flame */}
              <div style={{
                position: "absolute", left: "50%", bottom: `${rocketY}%`,
                transform: "translateX(-50%)", zIndex: 2,
                transition: manualPhase === "flying" ? "none" : "bottom 600ms ease-out",
                display: "flex", flexDirection: "column", alignItems: "center",
              }}>
                <Image
                  src="/limbo/rocket.png"
                  alt="Limbo Rocket"
                  width={110}
                  height={110}
                  style={{
                    width: "clamp(70px, 12vw, 110px)", height: "auto", display: "block",
                    filter: manualPhase === "bust" ? "grayscale(0.7) brightness(0.5)" : "drop-shadow(0 10px 30px rgba(0,0,0,0.5))",
                    transition: "filter 0.3s, transform 0.3s",
                    transform: manualPhase === "bust" ? "rotate(15deg)" : "rotate(0deg)",
                  }}
                />
                {(manualPhase === "flying" || manualPhase === "idle") && (
                  <div style={{
                    width: 81, height: 96, marginTop: -10,
                    backgroundRepeat: "no-repeat", backgroundSize: "81px auto",
                    backgroundImage: "url('/limbo/fire.png')",
                    backgroundPosition: `0px -${fireFrame * FIRE_FRAME_H}px`,
                  }} />
                )}
              </div>
            </div>

            {/* ── Bet controls ──────────────────────────────────────────── */}
            <div className="flex-shrink-0 pt-2">
              <div style={{ borderRadius: 16, border: "1px solid #2A2B2E", overflow: "hidden", background: "#191a1b" }}>

                {/* Manual / Auto tabs */}
                <div className="flex" style={{ borderBottom: "1px solid #2A2B2E" }}>
                  {(["manual", "auto"] as const).map(t => (
                    <button key={t} onClick={() => { if (!autoRunning && manualPhase === "idle") setBetTab(t); }}
                      className="flex-1 py-2 text-xs font-bold uppercase tracking-[0.12em]"
                      style={{
                        color: betTab === t ? "#fff" : "#555",
                        borderBottom: betTab === t ? "2px solid #28a909" : "2px solid transparent",
                        background: "transparent",
                      }}>
                      {t}
                    </button>
                  ))}
                </div>

                <div className="flex items-start gap-3 p-3 flex-wrap">
                  {/* Amount */}
                  <div className="flex flex-col gap-1" style={{ minWidth: 130 }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Amount</div>
                      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
                        {(["fiat", "crypto"] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => handleWalletTypeChange(type)}
                            disabled={playing || autoRunning}
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
                    </div>
                    <div className="flex items-center" style={{ height: 34, borderRadius: 22, background: "#000", border: "1px solid #3C3C42", paddingLeft: 10, paddingRight: 4 }}>
                      <span style={{ color: "#e74c3c", marginRight: 4, fontSize: 13, fontWeight: 700 }}>{activeSymbol}</span>
                      <input type="text" value={betInput} disabled={playing || autoRunning}
                        onChange={e => setBetInput(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1"))}
                        className="flex-1 bg-transparent text-white font-bold text-sm outline-none min-w-0" />
                      <div className="flex items-center gap-0.5 ml-1">
                        <button onClick={() => { if (!playing && !autoRunning) adjustBet("down"); }} className="spin-btn">−</button>
                        <button onClick={() => { if (!playing && !autoRunning) adjustBet("up"); }} className="spin-btn">+</button>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[100, 200, 500, 1000].map(v => (
                        <button key={v} onClick={() => { if (!playing && !autoRunning) setBetInput(v.toFixed(2)); }} className="quick-btn">{activeSymbol}{v}</button>
                      ))}
                    </div>
                  </div>

                  {/* Target (AUTO only) */}
                  {betTab === "auto" && (
                    <div className="flex flex-col gap-1" style={{ minWidth: 130 }}>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Target Multiplier</div>
                      <div className="flex items-center" style={{ height: 34, borderRadius: 22, background: "#000", border: "1px solid #3C3C42", paddingLeft: 10, paddingRight: 4 }}>
                        <input type="text" value={targetInput} disabled={autoRunning}
                          onChange={e => setTargetInput(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1"))}
                          className="flex-1 bg-transparent text-white font-bold text-sm outline-none min-w-0" />
                        <span className="text-zinc-500 font-bold text-sm mr-1">×</span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => { if (!autoRunning) adjustTarget("down"); }} className="spin-btn">‹</button>
                          <button onClick={() => { if (!autoRunning) adjustTarget("up"); }} className="spin-btn">›</button>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1.5, 2, 5, 10, 100].map(v => (
                          <button key={v} onClick={() => { if (!autoRunning) setTargetInput(v.toFixed(2)); }}
                            className="quick-btn" style={targetInput === v.toFixed(2) ? { background: "#1a2a1a", borderColor: "#2ecc71", color: "#2ecc71" } : {}}>
                            {v}×
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="flex-1 min-w-[120px] flex flex-col justify-end gap-1">
                    {betTab === "manual" ? (
                      <>
                        {manualPhase === "flying" ? (
                          <button onClick={handleCashout} style={{
                            width: "100%", height: 64, borderRadius: 20, border: 0, cursor: "pointer",
                            backgroundColor: "#2ecc71", color: "#000", fontWeight: 800, fontSize: 18,
                            textTransform: "uppercase", transition: "all 0.15s",
                            boxShadow: "0 10px 15px -10px #2ecc71, inset 0 1px 1px rgba(255,255,255,0.5)",
                          }}>
                            CASH OUT ({activeSymbol}{(betAmount * manualMulti).toFixed(2)})
                          </button>
                        ) : (
                          <button onClick={handleManualBet} disabled={playing} style={{
                            width: "100%", height: 64, borderRadius: 20, border: 0,
                            cursor: playing ? "not-allowed" : "pointer",
                            backgroundColor: playing ? "#555" : "#28a909",
                            color: "#fff", fontWeight: 800, fontSize: 20,
                            textShadow: "0 1px 2px rgba(0,0,0,0.5)", textTransform: "uppercase",
                            boxShadow: playing ? "none" : "0 10px 15px -10px #28a909, inset 0 1px 1px rgba(255,255,255,0.5)",
                            transition: "all 0.15s",
                          }}>
                            {playing ? "Playing…" : "BET"}
                          </button>
                        )}
                      </>
                    ) : autoRunning ? (
                      <button onClick={handleStopAuto} style={{
                        width: "100%", height: 64, borderRadius: 20, border: 0, cursor: "pointer",
                        backgroundColor: "#c53030", color: "#fff", fontWeight: 800, fontSize: 16,
                        textTransform: "uppercase", transition: "all 0.15s",
                      }}>
                        STOP ({autoRoundsLeft} left)
                      </button>
                    ) : (
                      <button onClick={handleStartAuto} style={{
                        width: "100%", height: 64, borderRadius: 20, border: 0, cursor: "pointer",
                        backgroundColor: "#e69308", color: "#fff", fontWeight: 800, fontSize: 18,
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)", textTransform: "uppercase",
                        boxShadow: "0 10px 15px -10px #e69308, inset 0 1px 1px rgba(255,255,255,0.5)",
                        transition: "all 0.15s",
                      }}>
                        START AUTO
                      </button>
                    )}
                  </div>
                </div>

                {/* Auto settings (only in auto tab) */}
                {betTab === "auto" && (
                  <div className="px-3 pb-2 flex flex-wrap gap-2">
                    <div className="flex flex-col gap-0.5" style={{ minWidth: 80 }}>
                      <div className="text-[9px] text-zinc-600 font-bold uppercase">Rounds</div>
                      <input type="text" value={autoRounds} disabled={autoRunning}
                        onChange={e => setAutoRounds(e.target.value.replace(/[^0-9]/g, ""))}
                        className="bg-transparent text-white font-bold text-xs outline-none"
                        style={{ height: 28, borderRadius: 6, background: "#000", border: "1px solid #3C3C42", paddingLeft: 8, paddingRight: 8 }} />
                      <div className="flex gap-0.5">
                        {[10, 25, 50, 100].map(v => (
                          <button key={v} onClick={() => { if (!autoRunning) setAutoRounds(String(v)); }}
                            className="quick-btn" style={{ fontSize: 9, padding: "1px 3px" }}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5" style={{ minWidth: 80 }}>
                      <div className="text-[9px] text-zinc-600 font-bold uppercase">Stop on Profit ₹</div>
                      <input type="text" value={autoStopWin} disabled={autoRunning} placeholder="0"
                        onChange={e => setAutoStopWin(e.target.value.replace(/[^0-9.]/g, ""))}
                        className="bg-transparent text-white font-bold text-xs outline-none placeholder:text-zinc-700"
                        style={{ height: 28, borderRadius: 6, background: "#000", border: "1px solid #3C3C42", paddingLeft: 8, paddingRight: 8 }} />
                    </div>
                    <div className="flex flex-col gap-0.5" style={{ minWidth: 80 }}>
                      <div className="text-[9px] text-zinc-600 font-bold uppercase">Stop on Loss ₹</div>
                      <input type="text" value={autoStopLoss} disabled={autoRunning} placeholder="0"
                        onChange={e => setAutoStopLoss(e.target.value.replace(/[^0-9.]/g, ""))}
                        className="bg-transparent text-white font-bold text-xs outline-none placeholder:text-zinc-700"
                        style={{ height: 28, borderRadius: 6, background: "#000", border: "1px solid #3C3C42", paddingLeft: 8, paddingRight: 8 }} />
                    </div>
                    {autoRunning && (
                      <div className="flex flex-col gap-0.5 ml-auto text-right">
                        <div className="text-[9px] text-zinc-600 font-bold uppercase">Profit</div>
                        <div className="font-bold text-sm tabular-nums" style={{ color: autoProfit >= 0 ? "#2ecc71" : "#e74c3c" }}>
                          {autoProfit >= 0 ? "+" : ""}{activeSymbol}{autoProfit.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom row */}
                <div className="flex items-center justify-between px-3 py-2" style={{ background: "#111215", borderRadius: "0 0 16px 16px" }}>
                  <div className="text-[10px] text-zinc-600">
                    {betTab === "auto" ? <>Win Chance: <span className="text-green-400 font-bold">{winChance}%</span></> : <span>Manual cashout</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, opacity: 0.7 }}>
                      {muted ? "🔇" : "🔊"}
                    </button>
                    <div className="text-[10px] text-zinc-500">
                      Balance: <span className="text-white font-bold">{activeSymbol}{activeBalance?.toFixed(2) ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .spin-btn { width: 18px; height: 18px; border-radius: 18px; background: #747474; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #000; font-size: 14px; font-weight: 700; line-height: 1; }
        .quick-btn { font-size: 10px; padding: 2px 4px; border: 1px solid #36363C; border-radius: 100px; background: #252528; color: #83878e; text-align: center; cursor: pointer; flex: 1; white-space: nowrap; transition: all 0.1s; }
        .quick-btn:hover { border-color: #555; color: #ccc; }
      `}</style>
    </div>
  );
}
