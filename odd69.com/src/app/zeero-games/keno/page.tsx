"use client";

import React, { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import api from "@/services/api";
import OriginalsShell from "@/components/originals/OriginalsShell";
import OriginalsControls from "@/components/originals/OriginalsControls";
import { useWallet } from "@/context/WalletContext";
import { Sparkles, RotateCcw, Hash } from "lucide-react";

type Risk = "low" | "classic" | "medium" | "high";

interface KenoResult {
  gameId: string;
  selected: number[];
  drawn: number[];
  hits: number;
  multiplier: number;
  payout: number;
  status: "WON" | "LOST";
  betAmount: number;
}

const RISKS: Risk[] = ["low", "classic", "medium", "high"];
const POOL = Array.from({ length: 40 }, (_, i) => i + 1);
const MAX_PICK = 10;

export default function KenoPage() {
  const { refreshWallet } = useWallet();
  const [betInput, setBetInput] = useState("10");
  const [walletType, setWalletType] = useState<"fiat" | "crypto">("fiat");
  const [useBonus, setUseBonus] = useState(false);
  const [risk, setRisk] = useState<Risk>("classic");
  const [picks, setPicks] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<KenoResult | null>(null);

  const togglePick = (n: number) => {
    if (busy) return;
    setResult(null);
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
      } else {
        if (next.size >= MAX_PICK) {
          toast.error("Max 10 numbers");
          return prev;
        }
        next.add(n);
      }
      return next;
    });
  };
  const clear = () => {
    if (busy) return;
    setPicks(new Set());
    setResult(null);
  };
  const autoPick = () => {
    if (busy) return;
    setResult(null);
    const target = picks.size > 0 ? picks.size : 5;
    const next = new Set<number>();
    while (next.size < target) next.add(1 + Math.floor(Math.random() * 40));
    setPicks(next);
  };

  const play = useCallback(async () => {
    const bet = parseFloat(betInput);
    if (!bet || bet <= 0) return toast.error("Enter a valid bet");
    if (picks.size === 0) return toast.error("Pick 1–10 numbers");
    setBusy(true);
    setResult(null);
    try {
      const res = await api.post<KenoResult>("/originals/keno/play", {
        betAmount: bet,
        selected: Array.from(picks),
        risk,
        walletType,
        useBonus,
      });
      setResult(res.data);
      if (res.data.status === "WON")
        toast.success(`+₹${res.data.payout.toLocaleString("en-IN")}`);
      await refreshWallet();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Play failed");
    } finally {
      setBusy(false);
    }
  }, [betInput, picks, risk, walletType, useBonus, refreshWallet]);

  const drawnSet = new Set(result?.drawn || []);
  const hitSet = new Set(result ? result.drawn.filter((n) => picks.has(n)) : []);

  return (
    <OriginalsShell
      gameKey="keno"
      title="Keno"
      tags={["# Keno", "# Zeero Originals", "# Provably Fair"]}
      controls={
        <OriginalsControls
          betInput={betInput}
          setBetInput={setBetInput}
          walletType={walletType}
          setWalletType={setWalletType}
          useBonus={useBonus}
          setUseBonus={setUseBonus}
          locked={busy}
          accent="#f59e0b"
          action={
            <button
              type="button"
              onClick={play}
              disabled={busy || picks.size === 0}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-[#1a1208] font-black text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {busy ? "Drawing…" : "Bet"}
            </button>
          }
          footer={
            <div className="text-[10px] text-white/50 text-center">
              {picks.size === 0
                ? "Select 1–10 numbers to play"
                : `${picks.size} selected`}
            </div>
          }
        >
          {/* Risk picker */}
          <div>
            <label className="text-[11px] text-white/50 font-bold uppercase tracking-wider mb-2 block">
              Risk
            </label>
            <div className="grid grid-cols-4 gap-1">
              {RISKS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => !busy && setRisk(r)}
                  className={`py-1.5 rounded text-[10px] font-bold uppercase ${
                    risk === r
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-white/[0.03] border border-white/[0.06] text-white/50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              <button
                type="button"
                onClick={autoPick}
                disabled={busy}
                className="flex items-center justify-center gap-1 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded text-[11px] text-white/50 hover:text-white hover:border-white/[0.12]"
              >
                <Sparkles size={11} /> Auto Pick
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={busy}
                className="flex items-center justify-center gap-1 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded text-[11px] text-white/50 hover:text-white hover:border-white/[0.12]"
              >
                <RotateCcw size={11} /> Clear
              </button>
            </div>
          </div>
        </OriginalsControls>
      }
    >
      {/* GAME AREA */}
      <div
        className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-6"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #1a1208 0%, #0e0a06 40%, #06080c 100%)",
          minHeight: 360,
        }}
      >
        {/* Status bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/[0.06] flex items-center gap-2">
          <Hash size={11} className="text-amber-400" />
          {result
            ? result.status === "WON"
              ? `${result.hits}/${picks.size} hits · ×${result.multiplier} · +₹${result.payout.toLocaleString("en-IN")}`
              : `${result.hits}/${picks.size} hits · no payout`
            : picks.size === 0
              ? "Pick 1–10 numbers to play"
              : `${picks.size} number${picks.size === 1 ? "" : "s"} selected`}
        </div>

        {/* Number board */}
        <div className="relative z-10 w-full max-w-2xl mt-12">
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
            {POOL.map((n) => {
              const isPicked = picks.has(n);
              const isDrawn = drawnSet.has(n);
              const isHit = hitSet.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => togglePick(n)}
                  className={`aspect-square rounded-lg text-[11px] sm:text-sm font-black transition-all ${
                    isHit
                      ? "bg-emerald-500 border border-emerald-300 text-white scale-105 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                      : isDrawn && !isPicked
                        ? "bg-white/[0.1] border border-white/30 text-white/60"
                        : isPicked
                          ? "bg-amber-500/30 border border-amber-400 text-white"
                          : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[10px] text-white/50 justify-center mt-4">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-amber-500/30 border border-amber-400" />
              Pick
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-emerald-500 border border-emerald-300" />
              Hit
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-white/[0.1] border border-white/30" />
              Drawn (miss)
            </span>
          </div>
        </div>
      </div>
    </OriginalsShell>
  );
}
