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
    for (const p of selected.values()) c[p.teamId] = (c[p.teamId] || 0) + 1;
    return c;
  }, [selected]);

  const selectedByRole = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of selected.values()) c[p.role] = (c[p.role] || 0) + 1;
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
      ROLES.filter((r) => (selectedByRole[r.id] || 0) < r.min).map((r) => ({
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
      <div className="min-h-[60vh] flex items-center justify-center text-[var(--ink-faint)] text-sm">
        Loading...
      </div>
    );
  }

  const teamACount = teamA ? selectedByTeam[teamA.id] || 0 : 0;
  const teamBCount = teamB ? selectedByTeam[teamB.id] || 0 : 0;
  const remainingToPick = TOTAL_PLAYERS - selected.size;
  const currentRoleCfg = ROLES.find((r) => r.id === roleFilter)!;

  return (
    <div className="h-dvh overflow-hidden bg-[var(--bg-base)] flex flex-col pb-[64px] md:pb-0">
      {/* Header — sticky panel under shell */}
      <div className="relative overflow-hidden border-b border-[var(--line-default)] bg-[var(--bg-surface)] flex-shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--gold-soft),_transparent_60%)]" />
        <div className="relative">
          <div className="max-w-3xl mx-auto px-3 py-3 flex items-center gap-2">
            <button
              onClick={() => router.back()}
              aria-label="Back"
              className="w-11 h-11 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-raised)] border border-[var(--line-default)] flex items-center justify-center text-[var(--ink)] transition-colors"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-display text-[var(--ink)] font-extrabold text-[15px] tracking-tight">
                Create Team
              </p>
              <p className="text-[var(--ink-dim)] text-[11px] font-semibold">
                {contestId ? "Step 2 of 4 · Pick 11 players" : "Pick 11 players"}
              </p>
            </div>
            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Map())}
                className="inline-flex items-center gap-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-raised)] text-[var(--ink)] px-3 min-h-[36px] rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] border border-[var(--line-default)]"
              >
                <Trash2 size={12} strokeWidth={2.5} /> Clear
              </button>
            )}
          </div>

          {contestId && (
            <div className="max-w-3xl mx-auto px-3 pb-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em]">
                {STEPS.map((s, i) => {
                  const done = s.n < 2;
                  const active = s.n === 2;
                  return (
                    <div key={s.n} className="flex-1 flex items-center">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`num w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            done
                              ? "bg-[var(--emerald)] text-[var(--bg-base)]"
                              : active
                                ? "bg-[var(--gold)] text-[var(--bg-base)]"
                                : "bg-[var(--bg-elevated)] text-[var(--ink-faint)]"
                          }`}
                        >
                          {done ? <Check size={10} strokeWidth={3} /> : s.n}
                        </span>
                        <span
                          className={
                            active
                              ? "text-[var(--ink)]"
                              : done
                                ? "text-[var(--ink-dim)]"
                                : "text-[var(--ink-faint)]"
                          }
                        >
                          {s.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="flex-1 h-[2px] mx-1.5 bg-[var(--ink-ghost)] rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team split + player count */}
          <div className="max-w-3xl mx-auto px-3 pb-3">
            <div className="bg-[var(--bg-surface)] backdrop-blur-sm border border-[var(--line-default)] rounded-[14px] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                {teamA && (
                  <TeamSplit
                    short={teamA.short}
                    count={teamACount}
                    logo={teamA.thumb || teamA.logo}
                  />
                )}
                <div className="text-center shrink-0 px-1">
                  <p className="t-eyebrow !text-[9px] leading-none">Players</p>
                  <p className="num font-display text-[var(--ink)] font-extrabold text-[22px] leading-none tracking-tight mt-1">
                    {selected.size}
                    <span className="text-[var(--ink-faint)] text-sm">
                      {" "}
                      / {TOTAL_PLAYERS}
                    </span>
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

              <div className="mt-3 flex items-center gap-1">
                {Array.from({ length: TOTAL_PLAYERS }).map((_, i) => (
                  <span
                    key={i}
                    className={`flex-1 h-1.5 rounded-full transition-all ${
                      i < selected.size
                        ? "bg-[var(--gold-bright)] shadow-[0_0_8px_var(--gold-halo)]"
                        : "bg-[var(--ink-ghost)]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body — player picker as bottom-sheet style sheet */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* Mobile bottom-sheet handle */}
        <div className="md:hidden flex justify-center pt-2">
          <span className="w-10 h-1 rounded-full bg-[var(--ink-whisper)]" />
        </div>

        {/* Role tabs */}
        <div className="bg-[var(--bg-surface)] border-b border-[var(--line-default)] sticky top-0 z-20 flex-shrink-0">
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
                    className={`flex-1 py-3 relative transition-all min-h-[56px] ${
                      active
                        ? "bg-[var(--gold-soft)]"
                        : "bg-transparent hover:text-[var(--ink-dim)]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className={`text-[13px] font-extrabold tracking-tight ${
                          active ? "text-[var(--gold-bright)]" : "text-[var(--ink-faint)]"
                        }`}
                      >
                        {r.label}
                      </span>
                      <span
                        className={`num inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-md text-[10px] font-extrabold ${
                          minMet
                            ? "bg-[var(--emerald-soft)] text-[var(--emerald)] border border-[var(--emerald)]/25"
                            : count > 0
                              ? "bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[var(--line-gold)]"
                              : "bg-[var(--bg-elevated)] text-[var(--ink-whisper)]"
                        }`}
                      >
                        {minMet ? <Check size={11} strokeWidth={3} /> : count}
                      </span>
                    </div>
                    <p
                      className={`text-[9px] mt-0.5 font-bold uppercase tracking-[0.08em] ${
                        active ? "text-[var(--gold-bright)]/80" : "text-[var(--ink-whisper)]"
                      }`}
                    >
                      Min {r.min}
                    </p>
                    {active && (
                      <div className="absolute bottom-0 left-1/4 right-1/4 h-[2.5px] bg-gold-grad rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section info */}
        <div className="bg-[var(--bg-elevated)] border-b border-[var(--line)] py-2.5 flex-shrink-0">
          <div className="max-w-3xl mx-auto px-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UserCheck size={13} className="text-[var(--gold-bright)]" strokeWidth={2.5} />
              <span className="t-eyebrow">Select {currentRoleCfg.full}</span>
            </div>
            <span className="t-eyebrow !text-[10px]">
              <span className="num">{selectedByRole[roleFilter] || 0}</span> picked · min{" "}
              <span className="num">{currentRoleCfg.min}</span>
            </span>
          </div>
        </div>

        {/* Players list */}
        <div className="flex-1 bg-[var(--bg-surface)]">
          <div className="max-w-3xl mx-auto">
            {filteredPlayers.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[var(--ink-whisper)] text-sm">No squad data yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {filteredPlayers.map((player) => {
                  const isSel = selected.has(player.playerId);
                  const dis = !isSel && !canSelect(player);
                  const team = player.teamId === teamA?.id ? teamA : teamB;
                  const teamColor = team?.color || "var(--gold)";
                  const bat = battingAbbrev(player.battingStyle);
                  const bowl = bowlingAbbrev(player.bowlingStyle);

                  return (
                    <button
                      key={player.playerId}
                      onClick={() => togglePlayer(player)}
                      disabled={dis}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left min-h-[64px] ${
                        isSel
                          ? "bg-[var(--gold-soft)] border-l-2 border-[var(--gold)]"
                          : dis
                            ? "opacity-40"
                            : "hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-raised)]"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] shadow-sm flex items-center justify-center overflow-hidden"
                          style={{
                            boxShadow: `0 0 0 2.5px ${teamColor}, 0 1px 2px rgba(0,0,0,0.3)`,
                          }}
                        >
                          {player.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={player.image}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Users size={16} className="text-[var(--ink-whisper)]" />
                          )}
                        </div>
                        <span
                          className="num absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-extrabold text-[var(--ink)] px-1.5 py-0.5 rounded-sm tracking-wide shadow"
                          style={{ background: teamColor }}
                        >
                          {team?.short ||
                            player.teamName?.substring(0, 3).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-display text-[var(--ink)] font-extrabold text-sm truncate tracking-tight">
                            {player.name}
                          </p>
                          {player.isPlaying11 && (
                            <span className="text-[8px] font-extrabold text-[var(--emerald)] bg-[var(--emerald-soft)] border border-[var(--emerald)]/25 px-1 py-px rounded tracking-wide">
                              XI
                            </span>
                          )}
                          {player.isCaptain && (
                            <span className="text-[8px] font-extrabold text-[var(--gold-bright)] bg-[var(--gold-soft)] border border-[var(--line-gold)] px-1 py-px rounded tracking-wide">
                              C
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold">
                          <span className="text-[var(--ink-faint)] capitalize">
                            {player.roleStr || player.role}
                          </span>
                          {bat && (
                            <>
                              <span className="text-[var(--ink-whisper)]">·</span>
                              <span className="num text-[var(--ink-faint)]">{bat}</span>
                            </>
                          )}
                          {bowl && bowl !== bat && (
                            <>
                              <span className="text-[var(--ink-whisper)]">·</span>
                              <span className="num text-[var(--ink-faint)]">{bowl}</span>
                            </>
                          )}
                          <span className="num ml-auto text-[var(--gold-bright)] font-extrabold">
                            {player.credit?.toFixed?.(1) ?? player.credit}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                          isSel
                            ? "bg-gold-grad text-[var(--bg-base)] shadow-md shadow-[var(--gold-halo)]"
                            : dis
                              ? "bg-[var(--bg-elevated)] text-[var(--ink-whisper)]"
                              : "bg-[var(--emerald)] text-[var(--bg-base)] shadow-md"
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
      <div className="flex-shrink-0 glass border-t border-[var(--line-default)] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.5)]">
        <div className="max-w-3xl mx-auto px-3 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              {isComplete ? (
                <>
                  <span className="t-eyebrow !text-[10px] !text-[var(--emerald)]">
                    Team is ready
                  </span>
                  <Check size={12} strokeWidth={3} className="text-[var(--emerald)]" />
                </>
              ) : remainingToPick > 0 ? (
                <span className="t-eyebrow !text-[10px]">
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
                  className="t-eyebrow !text-[10px] !text-[var(--gold-bright)] hover:underline text-left truncate"
                >
                  Need {unmetRoles[0]?.need} more {unmetRoles[0]?.full}
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
                        ? "bg-[var(--emerald)]"
                        : "bg-gold-grad"
                      : "bg-[var(--ink-ghost)]"
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
            className={`min-h-[44px] px-6 rounded-[12px] flex items-center gap-1 font-extrabold text-[12px] uppercase tracking-[0.08em] transition-all ${
              isComplete
                ? "btn btn-gold sweep"
                : "bg-[var(--bg-elevated)] text-[var(--ink-whisper)] border border-[var(--line-default)] cursor-not-allowed"
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
    <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--line-default)] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={short}
          className="w-6 h-6 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="font-mono text-[var(--ink-dim)] font-extrabold text-[9px]">
          {short}
        </span>
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
        <p className="font-display text-[var(--ink)] font-extrabold text-[13px] tracking-tight leading-none">
          {short}
        </p>
        <p className="num text-[10px] font-extrabold leading-none mt-1 text-[var(--gold-bright)]">
          {count}
        </p>
      </div>
      {reverse && logoNode}
    </div>
  );
}
