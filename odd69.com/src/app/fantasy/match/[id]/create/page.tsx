"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";

interface Player {
  playerId: number;
  name: string;
  shortName: string;
  role: string;
  roleStr: string;
  teamId: number;
  teamName: string;
  credit: number;
  isPlaying11: boolean;
  isCaptain: boolean;
  image: string;
  nationality: string;
  battingStyle: string;
  bowlingStyle: string;
  bowlingType: string;
}

type RoleFilter = "keeper" | "batsman" | "allrounder" | "bowler";

const ROLES: Array<{
  id: RoleFilter;
  label: string;
  full: string;
  min: number;
}> = [
  { id: "keeper", label: "WK", full: "Wicket-Keeper", min: 1 },
  { id: "batsman", label: "BAT", full: "Batter", min: 1 },
  { id: "allrounder", label: "AR", full: "All-Rounder", min: 1 },
  { id: "bowler", label: "BOWL", full: "Bowler", min: 1 },
];

const TOTAL_PLAYERS = 11;

const STEPS = [
  { n: 1, label: "Contest" },
  { n: 2, label: "Team" },
  { n: 3, label: "C & VC" },
  { n: 4, label: "Preview" },
];

function battingAbbrev(s?: string) {
  if (!s) return null;
  if (/right/i.test(s)) return "RHB";
  if (/left/i.test(s)) return "LHB";
  return s;
}

function bowlingAbbrev(s?: string) {
  if (!s) return null;
  if (/off/i.test(s)) return "OS";
  if (/leg/i.test(s)) return "LS";
  if (/medium/i.test(s)) return /left/i.test(s) ? "LAM" : "RAM";
  if (/fast/i.test(s)) return /left/i.test(s) ? "LAF" : "RAF";
  return s;
}

export default function CreateTeamPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const contestId = search.get("contestId") || "";
  const { user, loading: authLoading } = useAuth();
  const [squads, setSquads] = useState<Player[]>([]);
  const [teamA, setTeamA] = useState<any>(null);
  const [teamB, setTeamB] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("keeper");
  const [selected, setSelected] = useState<Map<number, Player>>(new Map());

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  const fetchSquads = useCallback(async () => {
    if (!id) return;
    try {
      const [squadsRes, matchRes] = await Promise.all([
        api.get(`/fantasy/matches/${id}/squads`),
        api.get(`/fantasy/matches/${id}`),
      ]);
      if (matchRes.data?.status !== 1) {
        router.replace(`/fantasy/match/${id}`);
        return;
      }
      setSquads(squadsRes.data?.squads || []);
      setTeamA(squadsRes.data?.teamA);
      setTeamB(squadsRes.data?.teamB);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!authLoading && user) fetchSquads();
  }, [authLoading, user, fetchSquads]);

  const selectedByTeam = useMemo(() => {
    const c: Record<number, number> = {};
    for (const p of selected.values())
      c[p.teamId] = (c[p.teamId] || 0) + 1;
    return c;
  }, [selected]);

  const selectedByRole = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of selected.values())
      c[p.role] = (c[p.role] || 0) + 1;
    return c;
  }, [selected]);

  const filteredPlayers = useMemo(() => {
    return squads
      .filter((p) => p.role === roleFilter)
      .sort((a, b) => {
        if (a.isPlaying11 !== b.isPlaying11) return a.isPlaying11 ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [squads, roleFilter]);

  const canSelect = (player: Player): boolean => {
    if (selected.has(player.playerId)) return true;
    if (selected.size >= TOTAL_PLAYERS) return false;

    // Role-min feasibility: picking this player must leave enough slots
    // to still reach every role's minimum.
    const afterSize = selected.size + 1;
    const slotsLeft = TOTAL_PLAYERS - afterSize;
    let unmetAfter = 0;
    for (const r of ROLES) {
      const bump = r.id === player.role ? 1 : 0;
      const after = (selectedByRole[r.id] || 0) + bump;
      unmetAfter += Math.max(0, r.min - after);
    }
    if (unmetAfter > slotsLeft) return false;

    return true;
  };

  const unmetRoles = useMemo(
    () =>
      ROLES.filter(
        (r) => (selectedByRole[r.id] || 0) < r.min,
      ).map((r) => ({
        ...r,
        need: r.min - (selectedByRole[r.id] || 0),
      })),
    [selectedByRole],
  );

  const togglePlayer = (player: Player) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(player.playerId)) next.delete(player.playerId);
      else if (canSelect(player)) next.set(player.playerId, player);
      return next;
    });
  };

  const isComplete = useMemo(() => {
    if (selected.size !== TOTAL_PLAYERS) return false;
    return ROLES.every((r) => (selectedByRole[r.id] || 0) >= r.min);
  }, [selected.size, selectedByRole]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">
        Loading...
      </div>
    );
  }

  const teamACount = teamA ? selectedByTeam[teamA.id] || 0 : 0;
  const teamBCount = teamB ? selectedByTeam[teamB.id] || 0 : 0;
  const remainingToPick = TOTAL_PLAYERS - selected.size;
  const currentRoleCfg = ROLES.find((r) => r.id === roleFilter)!;

  return (
    <div className="h-dvh overflow-hidden bg-[#06080c] flex flex-col pb-[64px] md:pb-0">
      {/* Amber header */}
      <div className="relative overflow-hidden border-b border-white/[0.06] bg-[#0b0e14] flex-shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.15),_transparent_60%)]" />
        <div className="relative">
          <div className="max-w-3xl mx-auto px-3 py-3 flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.08] flex items-center justify-center text-white transition-colors"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-[15px] tracking-tight">
                Create Team
              </p>
              <p className="text-white/70 text-[11px] font-semibold">
                {contestId ? "Step 2 of 4 · Pick 11 players" : "Pick 11 players"}
              </p>
            </div>
            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Map())}
                className="inline-flex items-center gap-1 bg-white/[0.05] hover:bg-white/[0.08] text-white px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide"
              >
                <Trash2 size={12} strokeWidth={2.5} /> Clear
              </button>
            )}
          </div>

          {contestId && (
            <div className="max-w-3xl mx-auto px-3 pb-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                {STEPS.map((s, i) => {
                  const done = s.n < 2;
                  const active = s.n === 2;
                  return (
                    <div key={s.n} className="flex-1 flex items-center">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            done
                              ? "bg-emerald-500 text-white"
                              : active
                                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208]"
                                : "bg-white/[0.05] text-white/40"
                          }`}
                        >
                          {done ? <Check size={10} strokeWidth={3} /> : s.n}
                        </span>
                        <span
                          className={
                            active
                              ? "text-white"
                              : done
                                ? "text-white/70"
                                : "text-white/40"
                          }
                        >
                          {s.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="flex-1 h-[2px] mx-1.5 bg-white/[0.06] rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team split + players progress card */}
          <div className="max-w-3xl mx-auto px-3 pb-3">
            <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                {teamA && (
                  <TeamSplit
                    short={teamA.short}
                    count={teamACount}
                    logo={teamA.thumb || teamA.logo}
                  />
                )}
                <div className="text-center shrink-0 px-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/50 leading-none">
                    Players
                  </p>
                  <p className="text-white font-black text-[22px] leading-none tracking-tight mt-1">
                    {selected.size}
                    <span className="text-white/40 text-sm"> / {TOTAL_PLAYERS}</span>
                  </p>
                </div>
                {teamB && (
                  <TeamSplit
                    short={teamB.short}
                    count={teamBCount}
                    logo={teamB.thumb || teamB.logo}
                    reverse
                  />
                )}
              </div>

              {/* Segmented progress pips */}
              <div className="mt-3 flex items-center gap-1">
                {Array.from({ length: TOTAL_PLAYERS }).map((_, i) => (
                  <span
                    key={i}
                    className={`flex-1 h-1.5 rounded-full transition-all ${
                      i < selected.size
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        : "bg-white/[0.06]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* Role tabs */}
        <div className="bg-[#0b0e14] border-b border-white/[0.06] sticky top-0 z-20 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-stretch">
              {ROLES.map((r) => {
                const count = selectedByRole[r.id] || 0;
                const active = roleFilter === r.id;
                const minMet = count >= r.min;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRoleFilter(r.id)}
                    className={`flex-1 py-3 relative transition-all ${
                      active
                        ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30"
                        : "bg-white/[0.02] hover:text-white/70"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className={`text-[13px] font-black tracking-tight ${
                          active ? "text-amber-300" : "text-white/40"
                        }`}
                      >
                        {r.label}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-md text-[10px] font-black ${
                          minMet
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : count > 0
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-white/[0.04] text-white/25"
                        }`}
                      >
                        {minMet ? (
                          <Check size={11} strokeWidth={3} />
                        ) : (
                          count
                        )}
                      </span>
                    </div>
                    <p
                      className={`text-[9px] mt-0.5 font-bold uppercase tracking-wide ${
                        active ? "text-amber-300/80" : "text-white/25"
                      }`}
                    >
                      Min {r.min}
                    </p>
                    {active && (
                      <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-gradient-to-r from-amber-500 to-orange-600 rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section info */}
        <div className="bg-white/[0.04] border-b border-white/[0.04] py-2.5 flex-shrink-0">
          <div className="max-w-3xl mx-auto px-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UserCheck
                size={13}
                className="text-amber-300"
                strokeWidth={2.5}
              />
              <span className="text-white font-black text-[11px] uppercase tracking-widest">
                Select {currentRoleCfg.full}
              </span>
            </div>
            <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">
              {selectedByRole[roleFilter] || 0} picked · min {currentRoleCfg.min}
            </span>
          </div>
        </div>

        {/* Players */}
        <div className="flex-1 bg-white/[0.03]">
          <div className="max-w-3xl mx-auto">
            {filteredPlayers.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-white/25 text-sm">No squad data yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filteredPlayers.map((player) => {
                  const isSel = selected.has(player.playerId);
                  const dis = !isSel && !canSelect(player);
                  const team =
                    player.teamId === teamA?.id ? teamA : teamB;
                  const teamColor = team?.color || "#f59e0b";
                  const bat = battingAbbrev(player.battingStyle);
                  const bowl = bowlingAbbrev(player.bowlingStyle);

                  return (
                    <button
                      key={player.playerId}
                      onClick={() => togglePlayer(player)}
                      disabled={dis}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                        isSel
                          ? "bg-amber-500/10 border border-amber-500/30"
                          : dis
                            ? "opacity-40"
                            : "hover:bg-white/[0.04] active:bg-white/[0.06]"
                      }`}
                    >
                      {/* Avatar + team ring */}
                      <div className="relative shrink-0">
                        <div
                          className="w-12 h-12 rounded-full bg-white/[0.05] shadow-sm flex items-center justify-center overflow-hidden"
                          style={{
                            boxShadow: `0 0 0 2.5px ${teamColor}, 0 1px 2px rgba(0,0,0,0.3)`,
                          }}
                        >
                          {player.image ? (
                            <img
                              src={player.image}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <Users size={18} className="text-white/25" />
                          )}
                        </div>
                        <span
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-white px-1.5 py-0.5 rounded-sm tracking-wide shadow"
                          style={{ background: teamColor }}
                        >
                          {team?.short ||
                            player.teamName?.substring(0, 3).toUpperCase()}
                        </span>
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-black text-sm truncate tracking-tight">
                            {player.name}
                          </p>
                          {player.isPlaying11 && (
                            <span className="text-[8px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1 py-px rounded tracking-wide">
                              XI
                            </span>
                          )}
                          {player.isCaptain && (
                            <span className="text-[8px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1 py-px rounded tracking-wide">
                              C
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold">
                          <span className="text-white/50 capitalize">
                            {player.roleStr || player.role}
                          </span>
                          {bat && (
                            <>
                              <span className="text-white/25">·</span>
                              <span className="text-white/50">{bat}</span>
                            </>
                          )}
                          {bowl && bowl !== bat && (
                            <>
                              <span className="text-white/25">·</span>
                              <span className="text-white/50">{bowl}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Toggle */}
                      <div
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isSel
                            ? "bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] shadow-md shadow-amber-500/30"
                            : dis
                              ? "bg-white/[0.04] text-white/25"
                              : "bg-emerald-500 text-white shadow-md shadow-emerald-700/20"
                        }`}
                      >
                        {isSel ? (
                          <Minus size={17} strokeWidth={3} />
                        ) : (
                          <Plus size={17} strokeWidth={3} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex-shrink-0 bg-[#0b0e14] border-t border-white/[0.06] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.5)]">
        <div className="max-w-3xl mx-auto px-3 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              {isComplete ? (
                <>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Team is ready
                  </span>
                  <Check size={12} strokeWidth={3} className="text-emerald-400" />
                </>
              ) : remainingToPick > 0 ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  {remainingToPick === TOTAL_PLAYERS
                    ? "Pick 11 players"
                    : `Pick ${remainingToPick} more`}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (unmetRoles[0]) setRoleFilter(unmetRoles[0].id);
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-amber-300 hover:underline text-left truncate"
                >
                  Need {unmetRoles[0]?.need} more{" "}
                  {unmetRoles[0]?.full}
                  {unmetRoles[0]?.need && unmetRoles[0].need > 1 ? "s" : ""}
                </button>
              )}
            </div>
            <div className="flex items-center gap-[3px]">
              {Array.from({ length: TOTAL_PLAYERS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 max-w-[18px] rounded-full transition-all ${
                    i < selected.size
                      ? isComplete
                        ? "bg-emerald-500"
                        : remainingToPick === 0
                          ? "bg-amber-400"
                          : "bg-gradient-to-r from-amber-500 to-orange-600"
                      : "bg-white/[0.06]"
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            disabled={!isComplete}
            onClick={() => {
              if (!isComplete) return;
              sessionStorage.setItem(
                `fantasy:draft:${id}`,
                JSON.stringify(Array.from(selected.values())),
              );
              const next = contestId
                ? `/fantasy/match/${id}/create/captain?contestId=${contestId}`
                : `/fantasy/match/${id}/create/captain`;
              router.push(next);
            }}
            className={`font-black text-[13px] px-6 py-3 rounded-lg transition-all flex items-center gap-1 tracking-wide uppercase ${
              isComplete
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] shadow-md shadow-amber-500/30"
                : "bg-white/[0.04] text-white/30 cursor-not-allowed"
            }`}
          >
            Next <ChevronRight size={15} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamSplit({
  short,
  count,
  logo,
  reverse = false,
}: {
  short: string;
  count: number;
  logo?: string;
  reverse?: boolean;
}) {
  const logoNode = (
    <div className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
      {logo ? (
        <img
          src={logo}
          alt={short}
          className="w-6 h-6 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-white/70 font-black text-[9px]">{short}</span>
      )}
    </div>
  );
  return (
    <div
      className={`flex items-center gap-2 min-w-0 flex-1 ${
        reverse ? "justify-end" : ""
      }`}
    >
      {!reverse && logoNode}
      <div className={reverse ? "text-right" : ""}>
        <p className="text-white font-black text-[13px] tracking-tight leading-none">
          {short}
        </p>
        <p className="text-[10px] font-black leading-none mt-1 text-amber-300">
          {count}
        </p>
      </div>
      {reverse && logoNode}
    </div>
  );
}
