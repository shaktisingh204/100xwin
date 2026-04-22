"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import api from "@/services/api";
import OriginalsShell from "@/components/originals/OriginalsShell";
import OriginalsControls from "@/components/originals/OriginalsControls";
import { useWallet } from "@/context/WalletContext";

type Difficulty = "easy" | "medium" | "hard" | "expert";

interface TowersState {
  gameId: string;
  betAmount: number;
  difficulty: Difficulty;
  tilesPerFloor: number;
  safePerFloor: number;
  totalFloors: number;
  currentFloor: number;
  multiplier: number;
  picks: number[];
  status: "ACTIVE" | "CASHEDOUT" | "LOST";
  payout: number;
  nextMultiplier: number | null;
  floorTraps?: number[][];
}

const DIFFS: Difficulty[] = ["easy", "medium", "hard", "expert"];

export default function TowersPage() {
  const { refreshWallet } = useWallet();
  const [betInput, setBetInput] = useState("10");
  const [walletType, setWalletType] = useState<"fiat" | "crypto">("fiat");
  const [useBonus, setUseBonus] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<TowersState | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<TowersState | null>("/originals/towers/active")
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
    if (!bet || bet <= 0) return toast.error("Invalid bet");
    setBusy(true);
    try {
      const res = await api.post<TowersState>("/originals/towers/start", {
        betAmount: bet,
        difficulty,
        walletType,
        useBonus,
      });
      setGame(res.data);
      await refreshWallet();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not start");
    } finally {
      setBusy(false);
    }
  }, [betInput, difficulty, walletType, useBonus, refreshWallet]);

  const pick = useCallback(
    async (tile: number) => {
      if (!game || game.status !== "ACTIVE") return;
      setBusy(true);
      try {
        const res = await api.post<TowersState>("/originals/towers/pick", {
          gameId: game.gameId,
          tile,
        });
        setGame(res.data);
        if (res.data.status === "LOST") {
          toast.error("Trap! Game over");
          await refreshWallet();
        } else if (res.data.status === "CASHEDOUT") {
          toast.success(`Tower complete × ${res.data.multiplier}`);
          await refreshWallet();
        }
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Pick failed");
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
      const res = await api.post<TowersState>("/originals/towers/cashout", {
        gameId: game.gameId,
      });
      setGame(res.data);
      toast.success(`Cashed out × ${res.data.multiplier}`);
      await refreshWallet();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Cashout failed");
    } finally {
      setBusy(false);
    }
  }, [game, refreshWallet]);

  const isActive = game?.status === "ACTIVE";
  const isFinished = !!game && game.status !== "ACTIVE";
  const tiles = game?.tilesPerFloor ?? 3;
  const totalFloors = game?.totalFloors ?? 8;

  return (
    <OriginalsShell
      gameKey="towers"
      title="Towers"
      tags={["# Towers", "# Zeero Originals", "# Provably Fair"]}
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
                disabled={busy || (game?.currentFloor ?? 0) === 0}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-[#1a1208] font-black text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Cashout × {game?.multiplier.toFixed(2)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isFinished) setGame(null);
                  start();
                }}
                disabled={busy}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-[#1a1208] font-black text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {busy ? "Building…" : "Bet"}
              </button>
            )
          }
          footer={
            game && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Floor</span>
                  <span className="text-white font-black">
                    {game.currentFloor}/{totalFloors}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Multiplier</span>
                  <span className="text-amber-400 font-black">
                    × {game.multiplier.toFixed(2)}
                  </span>
                </div>
                {isActive && game.nextMultiplier !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Next</span>
                    <span className="text-emerald-400 font-black">
                      × {game.nextMultiplier.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )
          }
        >
          {/* Difficulty */}
          <div>
            <label className="text-[11px] text-white/50 font-bold uppercase tracking-wider mb-2 block">
              Difficulty
            </label>
            <div className="grid grid-cols-2 gap-1">
              {DIFFS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => !isActive && setDifficulty(d)}
                  disabled={isActive}
                  className={`py-1.5 rounded text-[10px] font-bold uppercase ${
                    difficulty === d
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-white/[0.03] border border-white/[0.06] text-white/50"
                  } ${isActive ? "opacity-40" : ""}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </OriginalsControls>
      }
    >
      <div
        className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-6"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #1a1208 0%, #0e0a06 40%, #06080c 100%)",
          minHeight: 360,
        }}
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/[0.06]">
          {!game
            ? "Pick a difficulty and bet"
            : isActive
              ? `Floor ${game.currentFloor + 1}/${totalFloors} · pick a tile`
              : game.status === "CASHEDOUT"
                ? `+₹${game.payout.toLocaleString("en-IN")}`
                : "Tower collapsed"}
        </div>

        {/* Tower board */}
        <div className="relative z-10 w-full max-w-md mt-12 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
          {Array.from({ length: totalFloors }, (_, i) => totalFloors - 1 - i).map(
            (floor) => {
              const isCurrent = game?.currentFloor === floor;
              const isClimbed = (game?.currentFloor ?? 0) > floor;
              const playerPick = game?.picks[floor];
              const traps = game?.floorTraps?.[floor] || [];
              return (
                <div key={floor} className="flex items-center gap-2">
                  <div className="w-8 text-[10px] font-bold text-white/50 text-right">
                    {floor + 1}
                  </div>
                  <div
                    className="flex-1 grid gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: tiles }, (_, t) => {
                      const isPicked = playerPick === t;
                      const isTrap = traps.includes(t);
                      const reveal = isFinished;
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={!isCurrent || busy}
                          onClick={() => pick(t)}
                          className={`h-10 rounded-md text-xs font-bold transition-colors ${
                            isPicked && (isTrap && reveal)
                              ? "bg-red-500/40 border border-red-400 text-white"
                              : isPicked
                                ? "bg-emerald-500/40 border border-emerald-400 text-white"
                                : isClimbed
                                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300/40"
                                  : reveal && isTrap
                                    ? "bg-red-500/10 border border-red-500/30 text-red-300/60"
                                    : isCurrent
                                      ? "bg-amber-500/10 border border-amber-500/40 text-amber-200 hover:bg-amber-500/20"
                                      : "bg-white/[0.03] border border-white/[0.06] text-white/25"
                          }`}
                        >
                          {(isPicked || (reveal && isTrap)) && (isTrap ? "X" : "OK")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </OriginalsShell>
  );
}
