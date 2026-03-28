"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getAllOriginalsGGR, getAllOriginalsConfigs,
  getOriginalsSessions, getOriginalsAccessControl,
  updateOriginalsAccessControl, searchOriginalsAccessUsers,
} from "@/actions/originals";
import {
  RefreshCcw, Bomb, Zap, Dice5, TrendingUp, Users,
  Activity, Settings, BarChart2, Plane,
  ImageIcon, CheckCircle2, XCircle, AlertTriangle, Loader2,
  ShieldCheck, Search, UserPlus, Ban,
} from "lucide-react";
import toast from "react-hot-toast";

const GAMES = [
  {
    key: "mines", name: "Mines", emoji: "💣",
    color: "text-emerald-400", border: "border-emerald-500/20",
    bg: "bg-emerald-500/10", glow: "shadow-emerald-500/10",
    icon: Bomb,
  },
  {
    key: "crash", name: "Crash", emoji: "🚀",
    color: "text-orange-400", border: "border-orange-500/20",
    bg: "bg-orange-500/10", glow: "shadow-orange-500/10",
    icon: Zap,
  },
  {
    key: "dice", name: "Dice", emoji: "🎲",
    color: "text-violet-400", border: "border-violet-500/20",
    bg: "bg-violet-500/10", glow: "shadow-violet-500/10",
    icon: Dice5,
  },
  {
    key: "limbo", name: "Limbo", emoji: "✈️",
    color: "text-indigo-300", border: "border-indigo-400/20",
    bg: "bg-indigo-500/10", glow: "shadow-indigo-500/10",
    icon: Plane,
  },
];

interface AccessUser {
  id: number;
  username: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: string | null;
  isBanned: boolean;
}

function GGRMeter({ actual, target }: { actual: number; target: number }) {
  const ratio = Math.min(actual / Math.max(target, 0.01), 1.5);
  const pct = Math.min(ratio * 100, 100);
  const color = actual >= target ? "bg-emerald-500" : actual >= target * 0.6 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className={`font-black ${actual >= target ? "text-emerald-400" : "text-amber-400"}`}>{actual.toFixed(1)}%</span>
        <span className="text-slate-500">target {target.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-xs text-white font-bold">{value}</span>
    </div>
  );
}

export default function OriginalsAdminPage() {
  const [ggrAll, setGgrAll] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [accessMode, setAccessMode] = useState<"ALL" | "ALLOW_LIST">("ALLOW_LIST");
  const [allowedUserIds, setAllowedUserIds] = useState<number[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<AccessUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AccessUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, c, s, access] = await Promise.all([
        getAllOriginalsGGR(),
        getAllOriginalsConfigs(),
        getOriginalsSessions(),
        getOriginalsAccessControl(),
      ]);
      if (g.success) setGgrAll(g.data || []);
      if (c.success) setConfigs(c.data || []);
      if (s.success) setSessions(s.data || []);
      if (access.success && access.data) {
        setAccessMode(access.data.accessMode === "ALL" ? "ALL" : "ALLOW_LIST");
        setAllowedUserIds(access.data.allowedUserIds || []);
        setAllowedUsers(access.data.allowedUsers || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const trimmed = userSearch.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchingUsers(false);
      return;
    }

    let cancelled = false;
    setSearchingUsers(true);

    const timeoutId = window.setTimeout(async () => {
      const result = await searchOriginalsAccessUsers(trimmed);
      if (cancelled) {
        return;
      }
      setSearchResults(result.success ? (result.data || []) : []);
      setSearchingUsers(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [userSearch]);

  const addAllowedUser = (user: AccessUser) => {
    setAllowedUserIds((prev) => prev.includes(user.id) ? prev : [...prev, user.id]);
    setAllowedUsers((prev) => prev.some((entry) => entry.id === user.id) ? prev : [...prev, user]);
  };

  const removeAllowedUser = (userId: number) => {
    setAllowedUserIds((prev) => prev.filter((id) => id !== userId));
    setAllowedUsers((prev) => prev.filter((user) => user.id !== userId));
  };

  const saveAccess = async () => {
    setSavingAccess(true);
    const result = await updateOriginalsAccessControl({ accessMode, allowedUserIds });
    setSavingAccess(false);

    if (!result.success || !result.data) {
      toast.error(result.error || "Failed to save Originals access");
      return;
    }

    setAccessMode(result.data.accessMode === "ALL" ? "ALL" : "ALLOW_LIST");
    setAllowedUserIds(result.data.allowedUserIds || []);
    setAllowedUsers(result.data.allowedUsers || []);
    toast.success("Originals access updated");
  };

  const gameData = GAMES.map((gm) => ({
    ...gm,
    ggr: ggrAll.find((g) => g.gameKey === gm.key),
    config: configs.find((c: any) => c.gameKey === gm.key),
    livePlayers: sessions.filter((s: any) => s.gameKey === gm.key).length,
  }));

  const totalWagered = ggrAll.reduce((s, g) => s + (g.totalWagered || 0), 0);
  const totalPaidOut = ggrAll.reduce((s, g) => s + (g.totalPaidOut || 0), 0);
  const totalGGR = totalWagered - totalPaidOut;
  const totalGames = ggrAll.reduce((s, g) => s + (g.totalGames || 0), 0);
  const totalLive = sessions.length;
  const visibleSearchResults = searchResults.filter((user) => !allowedUserIds.includes(user.id));

  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K`
    : `₹${n.toFixed(0)}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <span className="text-2xl">🎮</span> Zeero Originals
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Live GGR control · Game settings · Real-time monitoring</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-all disabled:opacity-60 hover:bg-slate-700 sm:w-auto">
          <RefreshCcw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "24h Wagered", value: fmt(totalWagered), icon: TrendingUp, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "24h House Revenue", value: fmt(totalGGR), icon: BarChart2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Live Players", value: String(totalLive), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "24h Games Played", value: String(totalGames), icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
        ].map((k) => (
          <div key={k.label} className={`border rounded-2xl p-4 flex items-center gap-4 ${k.bg}`}>
            <div className={`p-2.5 rounded-xl bg-black/20 flex-shrink-0`}>
              <k.icon size={20} className={k.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-white leading-none">{k.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-sky-500/20 bg-[#141720] p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <h2 className="flex items-center gap-2 text-sm font-black text-white">
              <ShieldCheck size={16} className="text-sky-400" />
              Originals Player Access
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Choose whether Zeero Originals are open to all logged-in users or only to the allow-list below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "ALLOW_LIST", label: "Allowed Users Only" },
              { key: "ALL", label: "All Logged-in Users" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setAccessMode(option.key as "ALL" | "ALLOW_LIST")}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  accessMode === option.key
                    ? "border-sky-500 bg-sky-500/20 text-sky-300"
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Search size={12} />
              Search Users
            </div>
            <div className="mt-3">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search username, email, or phone"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-sky-500"
              />
            </div>

            <div className="mt-3 space-y-2">
              {searchingUsers && (
                <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-900 px-3 py-3 text-xs text-slate-400">
                  <Loader2 size={13} className="animate-spin" />
                  Looking up users…
                </div>
              )}

              {!searchingUsers && userSearch.trim().length >= 2 && visibleSearchResults.length === 0 && (
                <div className="rounded-xl border border-white/5 bg-slate-900 px-3 py-3 text-xs text-slate-500">
                  No matching users left to add.
                </div>
              )}

              {!searchingUsers && visibleSearchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900 px-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-white">{user.username || `User #${user.id}`}</span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        #{user.id}
                      </span>
                      {user.isBanned && (
                        <span className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          <Ban size={10} />
                          Banned
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                    <p className="truncate text-[11px] text-slate-600">{user.phoneNumber || "No phone number"}</p>
                  </div>
                  <button
                    onClick={() => addAllowedUser(user)}
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-300 transition-all hover:bg-sky-500/20"
                  >
                    <UserPlus size={12} />
                    Allow
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Allowed Users</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {accessMode === "ALL" ? "Everyone with a logged-in account can play." : `${allowedUsers.length} user${allowedUsers.length === 1 ? "" : "s"} can play Originals.`}
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                accessMode === "ALL"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-sky-500/30 bg-sky-500/10 text-sky-300"
              }`}>
                {accessMode === "ALL" ? "OPEN" : "ALLOW LIST"}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {allowedUsers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-slate-500">
                  No allowed users selected yet.
                </div>
              ) : (
                allowedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900 px-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-white">{user.username || `User #${user.id}`}</span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          #{user.id}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                    </div>
                    <button
                      onClick={() => removeAllowedUser(user.id)}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-slate-500">
                Website access checks and game socket bets both use this same list.
              </p>
              <button
                onClick={saveAccess}
                disabled={savingAccess}
                className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-4 py-2.5 text-xs font-black text-sky-200 transition-all hover:bg-sky-500/25 disabled:opacity-60"
              >
                {savingAccess ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                {savingAccess ? "Saving…" : "Save Access"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
        {gameData.map((gm) => {
          const Icon = gm.icon;
          const config = gm.config;
          const ggr = gm.ggr;
          const actualGgr = ggr?.actualGgrPercent ?? 0;
          const targetGgr = ggr?.targetGgrPercent ?? config?.targetGgrPercent ?? 5;
          const isActive = config?.isActive;
          const hasThumbnail = !!config?.thumbnailUrl;

          return (
            <div key={gm.key}
              className={`bg-[#141720] border rounded-2xl overflow-hidden shadow-lg ${gm.border}`}
              style={{ boxShadow: `0 4px 24px rgba(0,0,0,0.3)` }}>

              {/* Card Top — Thumbnail or gradient */}
              <div className="relative h-28 overflow-hidden">
                {hasThumbnail ? (
                  <img src={config.thumbnailUrl} alt={gm.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${gm.bg}`}
                    style={{ background: `radial-gradient(ellipse at 30% 40%, rgba(0,0,0,0.1), rgba(0,0,0,0.5))` }}>
                    <span className="text-5xl select-none">{gm.emoji}</span>
                  </div>
                )}
                {/* Status badge */}
                <div className="absolute top-2 right-2">
                  {isActive === undefined ? (
                    <span className="text-[10px] px-2 py-0.5 bg-black/60 text-slate-400 rounded-full border border-white/10 font-bold">NOT SET UP</span>
                  ) : isActive ? (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-500 rounded-full border border-slate-700 font-bold">DISABLED</span>
                  )}
                </div>
                {/* Maint badge */}
                {config?.maintenanceMode && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 font-bold">MAINTENANCE</span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${gm.bg}`}>
                      <Icon size={14} className={gm.color} />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-sm leading-tight">Zeero {gm.name}</h3>
                      {config?.gameName && config.gameName !== `Zeero ${gm.name}` && (
                        <p className="text-[10px] text-slate-500">{config.gameName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Users size={11} />
                    <span>{gm.livePlayers > 0 ? <span className="text-white font-bold">{gm.livePlayers}</span> : "0"}</span>
                  </div>
                </div>

                {/* GGR meter */}
                {config ? (
                  <GGRMeter actual={actualGgr} target={targetGgr} />
                ) : (
                  <div className="text-[11px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Not configured yet
                  </div>
                )}

                {/* Stats */}
                {config && (
                  <div className="mt-3 space-y-0.5">
                    <StatRow label="24h Wagered" value={fmt(ggr?.totalWagered ?? 0)} />
                    <StatRow label="24h Games" value={`${ggr?.totalGames ?? 0} (${ggr?.totalWins ?? 0}W/${ggr?.totalLosses ?? 0}L)`} />
                    <StatRow label="Bet Range" value={`₹${config.minBet}–₹${config.maxBet}`} />
                    <StatRow label="Player Range" value={`${config.fakePlayerMin ?? 200}–${config.fakePlayerMax ?? 300}`} />
                    <StatRow label="Display RTP" value={`${config.displayRtpPercent ?? 95}%`} />
                  </div>
                )}

                {/* Quick checks */}
                {config && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {hasThumbnail ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 size={10} /> thumbnail set</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500"><ImageIcon size={10} /> no thumbnail</span>
                    )}
                    <span className={`flex items-center gap-1 text-[10px] ${config.nearMissEnabled ? "text-emerald-400" : "text-slate-500"}`}>
                      {config.nearMissEnabled ? <CheckCircle2 size={10} /> : <XCircle size={10} />} near-miss
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] ${config.engagementMode !== "OFF" ? "text-purple-400" : "text-slate-500"}`}>
                      <Activity size={10} /> {config.engagementMode ?? "–"}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <Link href={`/dashboard/originals/${gm.key}`}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl text-center transition-all flex items-center justify-center gap-1.5
                    ${config ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"}`}>
                  <Settings size={12} /> {config ? "Configure" : "Set Up Now"}
                </Link>
                <Link href={`/dashboard/originals/${gm.key}/history`}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all">
                  <Activity size={12} /> History
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live sessions table */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="bg-[#141720] border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live Sessions ({sessions.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase border-b border-white/5 bg-black/20">
                  {["User", "Game", "Connected", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-bold tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessions.slice(0, 25).map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-2.5 text-white text-xs font-bold">{s.user?.username || `#${s.userId}`}</td>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs capitalize font-bold ${GAMES.find(g => g.key === s.gameKey)?.color ?? "text-slate-300"}`}>
                        {s.gameKey}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-400 text-[11px]">
                      {new Date(s.connectedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 font-bold">LIVE</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-8 text-slate-600 text-sm">
          <Users size={24} className="mx-auto mb-2 opacity-30" />
          No active player sessions right now
        </div>
      )}
    </div>
  );
}
