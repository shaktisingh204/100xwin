"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import GamePlayInterface from "@/components/casino/GamePlayInterface";
import { casinoService } from "@/services/casino";
import { BiErrorAlt } from "react-icons/bi";
import { IoGameController } from "react-icons/io5";

export default function CasinoPlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = params.id as string;
  const provider = searchParams.get("provider") || "";
  const gameName = searchParams.get("name") || "Casino Game";
  const isLobby = searchParams.get("isLobby") === "true";

  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<{
    id: string; name: string; provider: string; url: string;
  } | null>(null);

  useEffect(() => {
    const launch = async () => {
      if (!gameId || !provider) {
        setError("Missing game parameters");
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const userString = localStorage.getItem("user");
        const user = userString ? JSON.parse(userString) : null;
        const username = user?.username;

        if (!username || !token) {
          setError("Please login to play games");
          setLoading(false);
          return;
        }

        const res = await casinoService.launchGame({
          username, provider, gameId, isLobby,
        });

        if (res?.url) {
          setGameUrl(res.url);
          setActiveGame({ id: gameId, name: gameName, provider, url: res.url });
        } else {
          setError("Failed to launch game");
        }
      } catch (err: any) {
        console.error("Launch Error:", err);
        setError(err.response?.data?.message || err.message || "Error launching game");
      } finally {
        setLoading(false);
      }
    };
    launch();
  }, [gameId, provider, isLobby, gameName]);

  /* Loading */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="relative w-16 h-16">
          <div className="w-16 h-16 rounded-full border-2 border-[#f59e0b]/20 border-t-[#f59e0b] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl"><IoGameController size={20} className="text-[#f59e0b]" /></div>
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-sm">{gameName}</p>
          <p className="text-white/40 text-xs mt-1 font-semibold tracking-widest uppercase animate-pulse">
            Launching game…
          </p>
        </div>
        <div className="w-48 h-1 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-[#f59e0b] to-[#ef4444] rounded-full animate-[shimmerBar_1.6s_ease-in-out_infinite]" />
        </div>
      </div>
    );
  }

  /* Error */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl"><BiErrorAlt size={28} className="text-red-400" /></div>
        <div className="text-center">
          <h2 className="text-white font-bold text-xl mb-1">Unable to Launch</h2>
          <p className="text-white/40 text-sm max-w-sm">{error}</p>
        </div>
        <div className="flex gap-3 mt-1">
          <button onClick={() => router.back()} className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm font-bold hover:bg-white/[0.08] transition-colors">
            Go Back
          </button>
          <button onClick={() => router.push("/casino")} className="px-5 py-2.5 rounded-xl bg-[#f59e0b] text-black text-sm font-bold hover:brightness-110 transition-all">
            Casino Lobby
          </button>
        </div>
      </div>
    );
  }

  /* Game loaded */
  if (activeGame) {
    return (
      <GamePlayInterface
        game={activeGame}
        onClose={() => router.push("/casino")}
        isEmbedded={true}
        key={activeGame.id}
      />
    );
  }

  return null;
}
