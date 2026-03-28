"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Rocket, Dice1, Target, Bomb, ArrowRight, Star, Zap, Crown, Flame, Loader2, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import api from "@/services/api";

interface OriginalGame {
  gameKey: string;
  gameName: string;
  gameDescription: string;
  emoji: string;
  isActive: boolean;
  displayRtpPercent: number;
  minBet: number;
  maxBet: number;
  thumbnailUrl: string | null;
  fakePlayerMin: number;
  fakePlayerMax: number;
}

const iconMap: Record<string, React.ReactNode> = {
  crash: <Rocket size={28} />,
  dice: <Dice1 size={28} />,
  mines: <Bomb size={28} />,
  limbo: <Target size={28} />,
};

const colorMap: Record<string, { gradient: string; border: string }> = {
  crash: { gradient: "from-red-500 to-orange-500", border: "border-red-500/20" },
  dice: { gradient: "from-blue-500 to-cyan-500", border: "border-blue-500/20" },
  mines: { gradient: "from-emerald-500 to-green-600", border: "border-emerald-500/20" },
  limbo: { gradient: "from-purple-500 to-violet-600", border: "border-purple-500/20" },
};

export default function ZeeroGamesPage() {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModal();
  const [games, setGames] = useState<OriginalGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/originals/games")
      .then(res => setGames(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeGames = games.filter(g => g.isActive);

  // Compute stats from live data
  const avgRtp = activeGames.length > 0
    ? (activeGames.reduce((sum, g) => sum + g.displayRtpPercent, 0) / activeGames.length).toFixed(1)
    : "96.0";
  const houseEdge = activeGames.length > 0
    ? (100 - activeGames.reduce((sum, g) => sum + g.displayRtpPercent, 0) / activeGames.length).toFixed(1)
    : "4.0";

  const stats = [
    { label: "House Edge", value: `${houseEdge}%`, icon: <Star size={14} /> },
    { label: "Avg RTP", value: `${avgRtp}%`, icon: <Zap size={14} /> },
    { label: "Max Win", value: "1000x", icon: <Crown size={14} /> },
    { label: "Auto Bet", value: "Available", icon: <Flame size={14} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 pb-24">
      {/* Hero */}
      <div className="text-center mb-10 relative">
        <div className="absolute inset-0 flex justify-center -mt-8 pointer-events-none">
          <div className="w-72 h-72 rounded-full bg-purple-500/5 blur-[100px]" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4">
            <Sparkles size={13} className="text-purple-400" />
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Originals</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3">
            Odd69 <span className="text-purple-400">Originals</span>
          </h1>
          <p className="text-sm text-white/25 max-w-lg mx-auto">
            Our in-house games with the lowest house edge, provably fair outcomes, and instant payouts.
            No middlemen — just pure, transparent gaming.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {stats.map((s, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 text-center">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mx-auto mb-2">
              {s.icon}
            </div>
            <p className="text-lg font-black text-white">{s.value}</p>
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Game cards — from backend */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-white/20" /></div>
      ) : activeGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {activeGames.map((g) => {
            const colors = colorMap[g.gameKey] || { gradient: "from-gray-500 to-gray-700", border: "border-gray-500/20" };
            const icon = iconMap[g.gameKey] || <Sparkles size={28} />;
            const href = `/zeero-games/${g.gameKey}`;
            // Fake players count
            const fakePlayers = Math.floor(Math.random() * (g.fakePlayerMax - g.fakePlayerMin + 1)) + g.fakePlayerMin;

            return (
              <Link
                key={g.gameKey}
                href={isAuthenticated ? href : "#"}
                onClick={(e) => { if (!isAuthenticated) { e.preventDefault(); openLogin(); } }}
              >
                <div className={`bg-white/[0.015] border ${colors.border} rounded-2xl p-6 hover:border-white/[0.12] transition-all cursor-pointer group relative overflow-hidden`}>
                  {/* Thumbnail or icon */}
                  {g.thumbnailUrl ? (
                    <img src={g.thumbnailUrl} alt={g.gameName} className="w-14 h-14 rounded-2xl object-cover mb-4 group-hover:scale-110 transition-transform" />
                  ) : (
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                      {icon}
                    </div>
                  )}
                  <h3 className="text-xl font-black text-white mb-1">{g.gameName}</h3>
                  <p className="text-xs text-white/25 mb-3">{g.gameDescription}</p>

                  {/* Dynamic details */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded-full">
                      RTP {g.displayRtpPercent}%
                    </span>
                    <span className="px-2 py-0.5 bg-white/[0.03] text-white/25 text-[9px] font-bold rounded-full">
                      Min ₹{g.minBet}
                    </span>
                    <span className="px-2 py-0.5 bg-white/[0.03] text-white/25 text-[9px] font-bold rounded-full">
                      Max ₹{g.maxBet.toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] font-bold rounded-full flex items-center gap-1">
                      <Users size={8} /> {fakePlayers} playing
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[#f59e0b] text-xs font-bold group-hover:gap-2 transition-all">
                    Play Now <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Sparkles size={24} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/25">Games are being configured. Check back soon!</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/10 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white mb-2">Why Play Originals?</h3>
            <p className="text-xs text-white/30 leading-relaxed">
              Our original games are built in-house with transparent house edges — among the lowest in the industry.
              Every outcome is provably fair and verifiable. With instant payouts, auto-bet features, and mobile-optimized
              gameplay, Odd69 Originals offer the purest gaming experience available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
