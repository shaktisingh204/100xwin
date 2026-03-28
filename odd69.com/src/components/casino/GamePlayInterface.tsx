"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, RefreshCw, Heart, Maximize2, Minimize2,
  ChevronLeft, Share2, Info,
} from "lucide-react";
import { BiErrorAlt } from "react-icons/bi";
import { IoGameController } from "react-icons/io5";
import { useRouter } from "next/navigation";

interface GamePlayInterfaceProps {
  game: { id: string; name: string; provider: string; url: string };
  onClose: () => void;
  isEmbedded?: boolean;
  onLaunch?: (game: any) => void;
}

export default function GamePlayInterface({ game, onClose, isEmbedded = false }: GamePlayInterfaceProps) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const resetHideTimer = useCallback(() => {
    if (!isMobile) return;
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3500);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [isMobile, resetHideTimer]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleRefresh = () => {
    setIframeLoaded(false);
    setIframeError(false);
    setIframeKey((k) => k + 1);
  };

  const handleShare = async () => {
    try { await navigator.share({ title: game.name, url: window.location.href }); }
    catch { await navigator.clipboard.writeText(window.location.href); }
  };

  /* ── MOBILE ── */
  if (isMobile) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-[500] bg-black flex flex-col" style={{ touchAction: "none" }} onClick={resetHideTimer}>
        {/* Header */}
        <div className={`absolute top-0 left-0 right-0 z-[501] flex items-center gap-2 px-3 py-2 transition-all duration-300 ${controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"}`}
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)", paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }}>
          <button onClick={onClose} className="flex items-center justify-center w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white active:scale-95 transition-transform">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0 px-1">
            <p className="text-white font-bold text-sm leading-tight truncate">{game.name}</p>
            <p className="text-[#f59e0b] text-[10px] font-semibold uppercase tracking-wider truncate">{game.provider}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setIsFavorite((f) => !f)} className={`flex items-center justify-center w-9 h-9 rounded-xl backdrop-blur-md border transition-all active:scale-95 ${isFavorite ? "bg-[#f59e0b]/20 border-[#f59e0b]/50 text-[#f59e0b]" : "bg-black/60 border-white/10 text-white"}`}>
              <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button onClick={handleRefresh} className="flex items-center justify-center w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white active:scale-95 transition-transform">
              <RefreshCw size={16} />
            </button>
            <button onClick={toggleFullscreen} className="flex items-center justify-center w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white active:scale-95 transition-transform">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Iframe */}
        <div className="flex-1 relative">
          {iframeError && (
            <div className="absolute inset-0 bg-[#06080c] z-20 flex flex-col items-center justify-center gap-4 px-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl"><BiErrorAlt size={28} className="text-red-400" /></div>
              <p className="text-white font-bold text-base">Failed to load game</p>
              <div className="flex gap-3">
                <button onClick={handleRefresh} className="px-4 py-2 rounded-xl bg-[#f59e0b] text-black text-sm font-bold">Retry</button>
                <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-bold">Close</button>
              </div>
            </div>
          )}
          {!iframeLoaded && !iframeError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#06080c] z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-14 h-14">
                  <div className="w-14 h-14 rounded-full border-2 border-[#f59e0b]/20 border-t-[#f59e0b] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-xl"><IoGameController size={20} className="text-[#f59e0b]" /></div>
                </div>
                <p className="text-white/50 text-xs font-semibold tracking-widest uppercase animate-pulse">Loading...</p>
              </div>
            </div>
          )}
          <iframe key={iframeKey} src={game.url} className="w-full h-full border-0" allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts" onLoad={() => setIframeLoaded(true)} onError={() => { setIframeLoaded(true); setIframeError(true); }} style={{ display: "block" }} />
        </div>

        {!controlsVisible && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md text-white/40 text-[10px] font-semibold px-3 py-1.5 rounded-full border border-white/10 z-[501] pointer-events-none">
            Tap to show controls
          </div>
        )}
      </div>
    );
  }

  /* ── DESKTOP ── */
  return (
    <div ref={containerRef} className={isEmbedded ? "w-full flex flex-col" : "fixed inset-0 z-[500] bg-[#06080c] flex flex-col"} style={{ padding: isEmbedded ? "12px 12px 0" : "0" }}>
      {/* Header bar */}
      <div className={`flex items-center gap-3 px-4 py-2.5 ${isEmbedded ? "bg-[#0c0f14] border border-white/[0.04] rounded-t-2xl" : "bg-[#0c0f14] border-b border-white/[0.04]"}`}>
        <button onClick={onClose} className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-[12px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] border border-white/[0.04]">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="h-5 w-px bg-white/[0.06]" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 border border-[#f59e0b]/15 flex items-center justify-center text-[10px] font-black text-[#f59e0b]">
            {game.provider.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold text-[13px] leading-tight">{game.name}</p>
            <p className="text-[#f59e0b]/50 text-[9px] font-bold uppercase tracking-wider">{game.provider}</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          {[
            { icon: Info, label: "Info", active: showInfo, onClick: () => setShowInfo((v) => !v) },
            { icon: Share2, label: "Share", onClick: handleShare },
            { icon: Heart, label: isFavorite ? "Saved" : "Fav", active: isFavorite, onClick: () => setIsFavorite((f) => !f) },
            { icon: RefreshCw, label: "Reload", onClick: handleRefresh },
            { icon: isFullscreen ? Minimize2 : Maximize2, label: isFullscreen ? "Exit" : "Full", onClick: toggleFullscreen },
          ].map((btn) => {
            const Icon = btn.icon;
            return (
              <button key={btn.label} onClick={btn.onClick} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${btn.active ? "bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]" : "bg-white/[0.02] border-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.04]"}`}>
                <Icon size={12} fill={btn.label === "Fav" || btn.label === "Saved" ? (isFavorite ? "currentColor" : "none") : "none"} /> {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Iframe */}
      <div className={`relative flex-1 bg-black overflow-hidden ${isEmbedded ? "rounded-b-2xl border-x border-b border-white/[0.04]" : ""} ${isFullscreen ? "rounded-none border-0" : ""}`}
        style={!isFullscreen && isEmbedded ? { height: "calc(100dvh - 180px)", minHeight: "420px" } : !isFullscreen ? { height: "calc(100dvh - 120px)", minHeight: "420px" } : { position: "fixed", inset: 0, zIndex: 1000 }}>
        {!iframeLoaded && !iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#06080c] z-10 gap-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-2 border-[#f59e0b]/20 border-t-[#f59e0b] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl"><IoGameController size={20} className="text-[#f59e0b]" /></div>
            </div>
            <p className="text-white font-bold text-sm">{game.name}</p>
            <p className="text-white/40 text-xs font-semibold tracking-widest uppercase animate-pulse">Launching game…</p>
            <div className="w-48 h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-[#f59e0b] to-[#ef4444] rounded-full animate-[shimmerBar_1.6s_ease-in-out_infinite]" />
            </div>
          </div>
        )}
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#06080c] z-10 gap-4 px-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl"><BiErrorAlt size={28} className="text-red-400" /></div>
            <p className="text-white font-bold text-base">Failed to load game</p>
            <div className="flex gap-3">
              <button onClick={handleRefresh} className="px-5 py-2.5 rounded-xl bg-[#f59e0b] text-black font-bold text-sm">Retry</button>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white font-bold text-sm">Close</button>
            </div>
          </div>
        )}
        <iframe key={iframeKey} src={game.url} className="w-full h-full border-0" allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts" onLoad={() => setIframeLoaded(true)} onError={() => { setIframeLoaded(true); setIframeError(true); }} style={{ display: "block" }} />
        {isFullscreen && (
          <button onClick={toggleFullscreen} className="absolute top-4 right-4 z-[1001] bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10 text-sm font-bold">
            <Minimize2 size={16} /> Exit Fullscreen
          </button>
        )}
        {showInfo && !isFullscreen && (
          <div className="absolute top-0 right-0 h-full w-64 bg-[#0c0f14]/95 backdrop-blur-xl border-l border-white/[0.04] z-20 flex flex-col p-4 gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-[13px]">Game Info</h3>
              <button onClick={() => setShowInfo(false)} className="text-white/30 hover:text-white transition-colors"><X size={14} /></button>
            </div>
            {[{ label: "Game", value: game.name, color: "text-white" }, { label: "Provider", value: game.provider, color: "text-[#f59e0b]" }, { label: "Game ID", value: game.id, color: "text-white/50 font-mono text-[10px] break-all" }].map((r) => (
              <div key={r.label} className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <p className="text-white/20 text-[8px] uppercase tracking-widest mb-0.5">{r.label}</p>
                <p className={`${r.color} font-bold text-[12px]`}>{r.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      {!isFullscreen && (
        <div className={`flex items-center justify-between px-4 py-2 ${isEmbedded ? "mt-2" : "border-t border-white/[0.04] bg-[#06080c]"}`}>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
            <span className="text-white/10 text-xs">·</span>
            <span className="text-white/15 text-[9px]">RNG Certified · Provably Fair</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-white/10 uppercase tracking-widest font-bold">
            <span>18+ Only</span><span>·</span><span>Gamble Responsibly</span>
          </div>
        </div>
      )}
    </div>
  );
}
