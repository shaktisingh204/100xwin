"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import api from "@/services/api";
import OriginalsShell from "@/components/originals/OriginalsShell";
import OriginalsControls from "@/components/originals/OriginalsControls";
import { useWallet } from "@/context/WalletContext";
import { ChevronUp, ChevronDown, ChevronsRight } from "lucide-react";

interface HiloState {
  gameId: string;
  betAmount: number;
  currentCard: number;
  currentRank: number;
  multiplier: number;
  step: number;
  status: "ACTIVE" | "CASHEDOUT" | "LOST";
  payout: number;
  history: number[];
  nextHigherChance: number;
  nextLowerChance: number;
  nextHigherMultiplier: number;
  nextLowerMultiplier: number;
}

const SUITS = ["♣", "♦", "♥", "♠"];
const RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function cardLabel(card: number) {
  const rank = card % 13;
  const suit = Math.floor(card / 13);
  return {
    rank: RANK_LABELS[rank],
    suit: SUITS[suit],
    red: suit === 1 || suit === 2,
  };
}

export default function HiloPage() {
  const { refreshWallet } = useWallet();
  const [betInput, setBetInput] = useState("10");
  const [walletType, setWalletType] = useState<"fiat" | "crypto">("fiat");
  const [useBonus, setUseBonus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<HiloState | null>(null);

  // Restore in-flight game on mount
  useEffect(() => {
    let cancelled = false;
    api
      .get<HiloState | null>("/originals/hilo/active")
      .then((res) => {
        if (!cancelled && res.data) setGame(res.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(async () => {
    const bet = parseFloat(betInput);
    if (!bet || bet <= 0) return toast.error("Enter a valid bet");
    setBusy(true);
    try {
      const res = await api.post<HiloState>("/originals/hilo/start", {
        betAmount: bet,
        walletType,
        useBonus,
      });
      setGame(res.data);
      await refreshWallet();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not start game");
    } finally {
      setBusy(false);
    }
  }, [betInput, walletType, useBonus, refreshWallet]);

  const action = useCallback(
    async (act: "higher" | "lower" | "skip") => {
      if (!game) return;
      setBusy(true);
      try {
        const res = await api.post<HiloState>("/originals/hilo/action", {
          gameId: game.gameId,
          action: act,
        });
        setGame(res.data);
        if (res.data.status === "LOST") {
          toast.error("Wrong guess — game over");
          await refreshWallet();
        }
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [game, refreshWallet],
  );

  const cashout = useCallback(async () => {
    if (!game) return;
    setBusy(true);
    try {
      const res = await api.post<HiloState>("/originals/hilo/cashout", {
        gameId: game.gameId,
      });
      setGame(res.data);
      toast.success(`Cashed out ₹${res.data.payout.toLocaleString("en-IN")}`);
      await refreshWallet();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Cashout failed");
    } finally {
      setBusy(false);
    }
  }, [game, refreshWallet]);

  const isActive = game?.status === "ACTIVE";
  const card = game ? cardLabel(game.currentCard) : null;

  return (
    <OriginalsShell
      gameKey="hilo"
      title="Hi-Lo"
      tags={["# Hi-Lo", "# Zeero Originals", "# Provably Fair"]}
      controls={
        <OriginalsControls
          betInput={betInput}
          setBetInput={setBetInput}
          walletType={walletType}
          setWalletType={setWalletType}
          useBonus={useBonus}
          setUseBonus={setUseBonus}
          locked={isActive || busy}
          accent="#f59e0b"
          action={
            isActive ? (
              <button
                type="button"
                onClick={cashout}
                disabled={busy || (game?.step ?? 0) === 0}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-[#1a1208] font-black text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Cashout × {game?.multiplier.toFixed(2)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (game && game.status !== "ACTIVE") setGame(null);
                  start();
                }}
                disabled={busy}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-[#1a1208] font-black text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {busy ? "Dealing…" : "Bet"}
              </button>
            )
          }
          footer={
            game && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Step</span>
                  <span className="text-white font-black">{game.step}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Multiplier</span>
                  <span className="text-amber-400 font-black">
                    × {game.multiplier.toFixed(2)}
                  </span>
                </div>
              </div>
            )
          }
        />
      }
    >
      <div
        className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-6"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #1a1208 0%, #0f0a04 40%, #06080c 100%)",
          minHeight: 360,
        }}
      >
        {/* Status */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/[0.08]">
          {!game
            ? "Place a bet to deal a card"
            : game.status === "ACTIVE"
              ? `Step ${game.step + 1} · × ${game.multiplier.toFixed(2)}`
              : game.status === "CASHEDOUT"
                ? `🎉 Cashed out × ${game.multiplier.toFixed(2)}`
                : "💥 Bust"}
        </div>

        {/* Card stage */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 items-center w-full max-w-3xl mt-12">
          {/* Higher */}
          <button
            type="button"
            onClick={() => action("higher")}
            disabled={!isActive || busy}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-amber-400/40 bg-amber-400/5 hover:bg-amber-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <div className="w-14 h-14 rounded-full border-2 border-amber-300/40 flex items-center justify-center">
              <ChevronUp size={32} className="text-amber-300" />
            </div>
            <div className="text-sm font-black text-amber-200">Higher or Same</div>
            <div className="text-[11px] text-amber-200/70">
              × {game?.nextHigherMultiplier?.toFixed(2) ?? "—"} ·{" "}
              {game?.nextHigherChance?.toFixed(1) ?? "—"}%
            </div>
          </button>

          {/* Card */}
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-36 h-52 rounded-2xl border-4 ${
                card?.red ? "border-red-500" : "border-white/40"
              } bg-white shadow-2xl flex flex-col items-center justify-center select-none`}
            >
              {card ? (
                <>
                  <div
                    className={`text-6xl font-black ${
                      card.red ? "text-red-500" : "text-slate-900"
                    }`}
                  >
                    {card.rank}
                  </div>
                  <div
                    className={`text-4xl ${
                      card.red ? "text-red-500" : "text-slate-900"
                    }`}
                  >
                    {card.suit}
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-xs font-bold">
                  Place a bet
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => action("skip")}
              disabled={!isActive || busy}
              className="flex items-center gap-1 text-[11px] font-bold text-white/50 hover:text-white disabled:opacity-30"
            >
              Skip <ChevronsRight size={12} />
            </button>
          </div>

          {/* Lower */}
          <button
            type="button"
            onClick={() => action("lower")}
            disabled={!isActive || busy}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-orange-400/40 bg-orange-400/5 hover:bg-orange-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <div className="w-14 h-14 rounded-full border-2 border-orange-300/40 flex items-center justify-center">
              <ChevronDown size={32} className="text-orange-300" />
            </div>
            <div className="text-sm font-black text-orange-200">Lower or Same</div>
            <div className="text-[11px] text-orange-200/70">
              × {game?.nextLowerMultiplier?.toFixed(2) ?? "—"} ·{" "}
              {game?.nextLowerChance?.toFixed(1) ?? "—"}%
            </div>
          </button>
        </div>

        {/* History strip */}
        {game && game.history.length > 1 && (
          <div className="mt-6 flex gap-1.5 flex-wrap justify-center max-w-3xl">
            {game.history.map((c, i) => {
              const cl = cardLabel(c);
              return (
                <div
                  key={i}
                  className={`w-9 h-12 rounded border ${
                    cl.red
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-white/20 bg-white/[0.04]"
                  } flex flex-col items-center justify-center`}
                >
                  <div
                    className={`text-[12px] font-black ${
                      cl.red ? "text-red-300" : "text-white"
                    }`}
                  >
                    {cl.rank}
                  </div>
                  <div
                    className={`text-[10px] ${
                      cl.red ? "text-red-300" : "text-white/70"
                    }`}
                  >
                    {cl.suit}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OriginalsShell>
  );
}
