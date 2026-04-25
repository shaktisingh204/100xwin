"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Users,
  Award,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

interface MatchDetail {
  _id: string;
  externalMatchId: number;
  title: string;
  competitionTitle: string;
  format: string;
  teamA: any;
  teamB: any;
  startDate: string;
  status: number;
  statusNote: string;
  venue: string;
  scoreA: any;
  scoreB: any;
  playing11Announced?: boolean;
}

type ContestPhase = "full" | "innings1" | "innings2" | "powerplay";

interface Contest {
  _id: string;
  title: string;
  type: string;
  phase?: ContestPhase;
  entryFee: number;
  totalPrize: number;
  maxSpots: number;
  filledSpots: number;
  prizeBreakdown: Array<{ rankFrom: number; rankTo: number; prize: number }>;
}

const PHASE_TABS: Array<{ id: ContestPhase; label: string }> = [
  { id: "full", label: "Full Match" },
  { id: "innings1", label: "1st Inn" },
  { id: "innings2", label: "2nd Inn" },
  { id: "powerplay", label: "Powerplay" },
];

const TABS = [
  { id: "contests", label: "Contests" },
  { id: "my-teams", label: "My Teams" },
  { id: "winnings", label: "Winnings" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function FantasyMatchPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<TabId>("contests");
  const [phase, setPhase] = useState<ContestPhase>("full");
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [matchRes, contestsRes, teamsRes, historyRes] = await Promise.all([
        api.get(`/fantasy/matches/${id}`),
        api.get(`/fantasy/matches/${id}/contests`),
        user ? api.get(`/fantasy/my-teams/${id}`).catch(() => null) : null,
        user ? api.get("/fantasy/history", { params: { limit: 100 } }).catch(() => null) : null,
      ]);
      setMatch(matchRes.data);
      setContests(contestsRes.data || []);
      if (teamsRes?.data) setMyTeams(teamsRes.data);
      if (historyRes?.data?.entries) {
        setMyEntries(historyRes.data.entries.filter((e: any) => String(e.matchId) === String(id)));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user, fetchData]);

  const joinedContestIds = useMemo(() => new Set(myEntries.map((e) => e.contestId)), [myEntries]);

  const startDate = match ? new Date(match.startDate) : new Date();
  const diffMs = startDate.getTime() - Date.now();
  const isLive = match?.status === 3;   // EntitySport: 3=Live
  const isUpcoming = match?.status === 1; // EntitySport: 1=Upcoming
  const isCompleted = match?.status === 2; // EntitySport: 2=Result/Completed

  // After the match, the Contests tab only shows contests the user joined.
  // Before/during the match, also filter by the selected phase tab.
  const visibleContests = useMemo(() => {
    const base = isCompleted
      ? contests.filter((c) => joinedContestIds.has(c._id))
      : contests;
    return base.filter((c) => (c.phase ?? "full") === phase);
  }, [contests, joinedContestIds, isCompleted, phase]);

  const phaseCounts = useMemo(() => {
    const counts: Record<ContestPhase, number> = { full: 0, innings1: 0, innings2: 0, powerplay: 0 };
    const base = isCompleted
      ? contests.filter((c) => joinedContestIds.has(c._id))
      : contests;
    for (const c of base) counts[(c.phase ?? "full") as ContestPhase]++;
    return counts;
  }, [contests, joinedContestIds, isCompleted]);

  const countdown = useMemo(() => {
    if (!isUpcoming || diffMs <= 0) return "Started";
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);
    return { h, m, s };
  }, [diffMs, isUpcoming]);

  const handleJoin = (contest: Contest) => {
    if (!isUpcoming) return;
    if (joinedContestIds.has(contest._id)) return;
    router.push(`/fantasy/match/${id}/contest/${contest._id}/join`);
  };

  const toggleExpand = (cid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">Loading...</div>
    );
  }

  if (!match) {
    return (
      <FantasyShell title="Match Not Found" backHref="/fantasy">
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-10 text-center">
          <p className="text-white/50 text-sm font-semibold">Match not found or not yet synced.</p>
        </div>
      </FantasyShell>
    );
  }

  return (
    <FantasyShell
      title={match.teamA.short + " vs " + match.teamB.short}
      subtitle={match.competitionTitle}
      backHref="/fantasy"
      hideSubNav
    >
      {/* Hero — dark navy band with teams + countdown (Dream11 style) */}
      <div className="bg-gradient-to-br from-[#1a1f3a] via-[#151a32] to-[#0f1428] rounded-2xl p-5 md:p-6 mb-4 text-white shadow-xl shadow-black/10 relative overflow-hidden">
        {/* subtle stripe pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent 0 18px, rgba(255,255,255,0.8) 18px 19px)",
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
              {match.competitionTitle}
            </span>
            {isLive && (
              <span className="flex items-center gap-1.5 text-[10px] font-black bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-md uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Live
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <TeamHero team={match.teamA} score={match.scoreA} />

            <div className="flex flex-col items-center shrink-0">
              {isUpcoming && typeof countdown !== "string" ? (
                <>
                  <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">
                    Starts in
                  </span>
                  <div className="flex items-center gap-1 mt-1.5">
                    <CountdownBlock label="H" value={countdown.h} />
                    <span className="text-white/40 font-black">:</span>
                    <CountdownBlock label="M" value={countdown.m} />
                    <span className="text-white/40 font-black">:</span>
                    <CountdownBlock label="S" value={countdown.s} />
                  </div>
                </>
              ) : isLive ? (
                <>
                  <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">
                    Status
                  </span>
                  <span className="font-black text-base mt-1 tracking-tight">In Play</span>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">
                    Result
                  </span>
                  <span className="font-black text-xs mt-1 text-center max-w-[140px] leading-tight">
                    {match.statusNote || "Completed"}
                  </span>
                </>
              )}
            </div>

            <TeamHero team={match.teamB} score={match.scoreB} />
          </div>

          <div className="flex items-center justify-center gap-1 text-[10px] text-white/70 font-bold mt-4">
            <MapPin size={11} strokeWidth={2.5} />
            <span className="truncate">{match.venue || "TBD"}</span>
          </div>
        </div>
      </div>

      {/* Create-team CTA — shown first when user has no teams and the match
          is still open. The user must create a team before seeing contests. */}
      {isUpcoming && myTeams.length === 0 && (
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 mb-3 text-white shadow-xl shadow-amber-500/15">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Users size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[15px] tracking-tight">
                Create your first team
              </p>
              <p className="text-white/80 text-[11px] font-semibold mt-0.5">
                Pick 11 players, then choose a contest to join.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/fantasy/match/${id}/create`)}
            className="mt-4 w-full bg-white text-amber-600 font-black text-[13px] py-3 rounded-lg uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm hover:bg-white/90 transition-colors"
          >
            <Plus size={15} strokeWidth={3} /> Create Team
          </button>
        </div>
      )}

      {/* My Teams summary */}
      {myTeams.length > 0 && (
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5 mb-3 flex items-center justify-between">
          <div>
            <p className="text-white font-black text-sm tracking-tight">
              {myTeams.length} Team{myTeams.length > 1 ? "s" : ""} Created
            </p>
            <p className="text-white/50 text-[11px] font-semibold">
              {myEntries.length} contest{myEntries.length !== 1 ? "s" : ""} joined
            </p>
          </div>
          <button
            onClick={() => setTab("my-teams")}
            className="flex items-center gap-1 text-amber-400 font-black text-xs hover:text-amber-300 uppercase tracking-wide"
          >
            View <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] px-1 flex items-center mb-3 sticky top-2 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-[13px] font-black py-3 transition-all relative tracking-tight ${
              tab === t.id ? "text-amber-400" : "text-white/50"
            }`}
          >
            {t.label}
            {t.id === "my-teams" && myTeams.length > 0 && (
              <span className={`ml-1 text-[10px] font-black ${tab === t.id ? "text-amber-400" : "text-white/25"}`}>
                ({myTeams.length})
              </span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-amber-400 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {tab === "contests" && (
        isUpcoming && myTeams.length === 0 ? (
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-10 text-center">
            <Users size={32} className="text-white/25 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-white font-black text-sm mb-1">Create a team to see contests</p>
            <p className="text-white/50 text-xs">Contests unlock once you&apos;ve built your first team for this match.</p>
          </div>
        ) : (
          <>
            {/* Phase filter pills — full match / innings / powerplay */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto -mx-1 px-1 no-scrollbar">
              {PHASE_TABS.map((p) => {
                const active = phase === p.id;
                const count = phaseCounts[p.id];
                return (
                  <button
                    key={p.id}
                    onClick={() => setPhase(p.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all ${
                      active
                        ? "bg-amber-500/20 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10"
                        : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:border-amber-500/30"
                    }`}
                  >
                    {p.label}
                    <span
                      className={`text-[10px] font-black ${
                        active ? "text-amber-300/80" : "text-white/25"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <ContestsList
              contests={visibleContests}
              joined={joinedContestIds}
              expanded={expanded}
              canJoin={isUpcoming}
              onJoin={handleJoin}
              onToggle={toggleExpand}
              matchId={match.externalMatchId}
              emptyLabel={
                isCompleted
                  ? "You didn't join any contest in this phase."
                  : `No ${PHASE_TABS.find((p) => p.id === phase)?.label ?? ""} contests yet.`
              }
            />
          </>
        )
      )}

      {tab === "my-teams" && (
        <MyTeamsList teams={myTeams} matchId={match.externalMatchId} disabled={!isUpcoming} />
      )}

      {tab === "winnings" && <MyWinningsList entries={myEntries} />}

      {/* Sticky helper hint */}
      {isUpcoming && tab === "contests" && (
        <div className="fixed bottom-[80px] md:bottom-6 left-0 right-0 z-40 px-4 md:max-w-sm md:mx-auto md:px-0 pointer-events-none">
          <div className="flex items-center justify-center gap-2 bg-[#1a1f3a]/95 backdrop-blur-sm text-white rounded-xl py-3 font-black text-[12px] shadow-xl tracking-wide uppercase">
            <Plus size={15} strokeWidth={2.75} />
            {myTeams.length === 0 ? "Create a Team to start" : "Pick a Contest to join"}
          </div>
        </div>
      )}
    </FantasyShell>
  );
}

function TeamHero({ team, score }: { team: any; score: any }) {
  const img = team.thumb || team.logo;
  const scoreStr =
    score && typeof score === "object"
      ? score.scores_full || score.scores || ""
      : "";
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden ring-2 ring-white/20 shadow-lg">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={team.short}
            className="w-11 h-11 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              if (e.target instanceof HTMLImageElement && e.target.parentElement) {
                e.target.parentElement.innerHTML = `<span class='text-[#1a1f3a] font-black text-sm'>${team.short}</span>`;
              }
            }}
          />
        ) : (
          <span className="text-[#1a1f3a] font-black text-sm">{team.short}</span>
        )}
      </div>
      <p className="text-white font-black text-base tracking-tight">{team.short}</p>
      {scoreStr && <p className="text-amber-300 font-black text-[11px]">{scoreStr}</p>}
    </div>
  );
}

function CountdownBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-md px-2 py-1 min-w-[28px] text-center">
        <span className="font-black text-base tracking-tight">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[8px] font-black text-white/50 uppercase mt-0.5 tracking-widest">
        {label}
      </span>
    </div>
  );
}

function ContestsList({
  contests,
  joined,
  expanded,
  canJoin,
  onJoin,
  onToggle,
  matchId,
  emptyLabel,
}: {
  contests: Contest[];
  joined: Set<string>;
  expanded: Set<string>;
  canJoin: boolean;
  onJoin: (c: Contest) => void;
  onToggle: (id: string) => void;
  matchId: number;
  emptyLabel: string;
}) {
  if (contests.length === 0) {
    return (
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-10 text-center">
        <p className="text-white/50 font-semibold text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-24">
      {contests.map((c) => {
        const isJoined = joined.has(c._id);
        const pct = c.maxSpots > 0 ? Math.min(100, Math.round((c.filledSpots / c.maxSpots) * 100)) : 0;
        const firstPrize = c.prizeBreakdown[0]?.prize || c.totalPrize;
        const winnerCount = c.prizeBreakdown.reduce(
          (s, t) => s + (t.rankTo - t.rankFrom + 1),
          0,
        );
        const isExpanded = expanded.has(c._id);

        return (
          <Link
            key={c._id}
            href={`/fantasy/match/${matchId}/contest/${c._id}`}
            className="block bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden hover:border-amber-500/30 hover:shadow-md transition-all"
          >
            {/* Top: prize pool + entry */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
                  Prize Pool
                </p>
                <p className="text-white font-black text-2xl leading-none tracking-tight">
                  ₹{c.totalPrize.toLocaleString("en-IN")}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onJoin(c);
                }}
                disabled={!canJoin || isJoined}
                className={`shrink-0 text-[13px] font-black px-5 py-2.5 rounded-lg transition-all min-w-[84px] tracking-wide ${
                  isJoined
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : !canJoin
                      ? "bg-white/[0.04] text-white/25 border border-white/[0.06] cursor-not-allowed"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 shadow-sm"
                }`}
              >
                {isJoined
                  ? "View"
                  : !canJoin
                    ? "Closed"
                    : c.entryFee === 0
                      ? "FREE"
                      : `₹${c.entryFee}`}
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-2.5">
              <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-amber-500" : "bg-amber-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] font-black">
                <span className="text-amber-400">
                  {c.maxSpots - c.filledSpots > 0
                    ? `${(c.maxSpots - c.filledSpots).toLocaleString("en-IN")} spots left`
                    : "Contest Full"}
                </span>
                <span className="text-white/50">
                  {c.maxSpots.toLocaleString("en-IN")} spots
                </span>
              </div>
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/[0.04] bg-white/[0.04] text-[10px] flex-wrap">
              <Badge icon="🏆" label={`1st ₹${firstPrize.toLocaleString("en-IN")}`} />
              <Badge icon="👥" label={`${winnerCount || 1} Winner${winnerCount > 1 ? "s" : ""}`} />
              {c.maxSpots === 2 && <Badge icon="⚔️" label="H2H" />}
              {c.entryFee === 0 && <Badge icon="🎁" label="Free" />}
              {c.phase === "innings1" && <Badge icon="🏏" label="1st Inn" />}
              {c.phase === "innings2" && <Badge icon="🎯" label="2nd Inn" />}
              {c.phase === "powerplay" && <Badge icon="⚡" label="Powerplay" />}
            </div>

            {c.prizeBreakdown.length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle(c._id);
                }}
                className="w-full flex items-center justify-center gap-1 px-4 py-2.5 border-t border-white/[0.04] text-amber-400 font-black text-[11px] hover:bg-amber-500/10 transition-colors uppercase tracking-wide"
              >
                {isExpanded ? "Hide" : "View"} Prize Breakup
                <ChevronDown
                  size={13}
                  strokeWidth={2.75}
                  className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
            )}

            {isExpanded && c.prizeBreakdown.length > 0 && (
              <div className="px-4 py-3 border-t border-white/[0.04] bg-amber-500/10">
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px]">
                  <div className="font-black text-white/50 uppercase text-[9px] tracking-widest">Rank</div>
                  <div className="font-black text-white/50 uppercase text-[9px] text-right tracking-widest">Prize</div>
                  {c.prizeBreakdown.map((t, i) => (
                    <React.Fragment key={i}>
                      <div className="text-white/70 font-bold">
                        #{t.rankFrom}
                        {t.rankTo > t.rankFrom ? ` – #${t.rankTo}` : ""}
                      </div>
                      <div className="text-white font-black text-right">
                        ₹{t.prize.toLocaleString("en-IN")}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function Badge({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-0.5 font-black text-white/70 text-[10px]">
      <span className="text-[10px]">{icon}</span>
      {label}
    </span>
  );
}

function MyTeamsList({
  teams,
  matchId,
  disabled,
}: {
  teams: any[];
  matchId: number;
  disabled: boolean;
}) {
  if (teams.length === 0) {
    return (
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-10 text-center">
        <Users size={32} className="text-white/25 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-white font-black text-sm mb-1">No teams created yet</p>
        <p className="text-white/50 text-xs mb-4">Create your first dream team to start playing</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-24">
      {teams.map((team) => {
        const captain = team.players?.find((p: any) => p.playerId === team.captainId);
        const viceCaptain = team.players?.find((p: any) => p.playerId === team.viceCaptainId);
        const roleCounts: Record<string, number> = {};
        for (const p of team.players || []) roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;

        return (
          <Link
            key={team._id}
            href={`/fantasy/match/${matchId}/team/${team._id}`}
            className="block bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-amber-500/30 transition-all overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.04]">
              <span className="text-white font-black text-sm tracking-tight">
                {team.teamName}
              </span>
              <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {team.players?.length || 0} Players
              </span>
            </div>
            <div className="px-4 py-3">
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black uppercase text-amber-300 tracking-widest">
                      Captain
                    </p>
                    <span className="text-[8px] font-black bg-amber-500 text-white px-1 py-[1px] rounded tracking-wide">
                      2x
                    </span>
                  </div>
                  <p className="text-white font-black text-xs truncate tracking-tight">
                    {captain?.name || "—"}
                  </p>
                </div>
                <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black uppercase text-amber-400 tracking-widest">
                      Vice Captain
                    </p>
                    <span className="text-[8px] font-black bg-amber-500 text-white px-1 py-[1px] rounded tracking-wide">
                      1.5x
                    </span>
                  </div>
                  <p className="text-white font-black text-xs truncate tracking-tight">
                    {viceCaptain?.name || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-3">
                  <RoleCount label="WK" count={roleCounts.keeper || 0} />
                  <RoleCount label="BAT" count={roleCounts.batsman || 0} />
                  <RoleCount label="AR" count={roleCounts.allrounder || 0} />
                  <RoleCount label="BOWL" count={roleCounts.bowler || 0} />
                </div>
                <ChevronRight size={15} className="text-white/25" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function RoleCount({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-white/25 font-black text-[9px] tracking-wide">{label}</span>
      <span className="text-white font-black text-[11px]">{count}</span>
    </div>
  );
}

function MyWinningsList({ entries }: { entries: any[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-10 text-center">
        <Award size={32} className="text-white/25 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-white font-black text-sm mb-1">No contests joined yet</p>
        <p className="text-white/50 text-xs">Your winnings will appear here after you join contests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-24">
      {entries.map((e) => {
        const isWon = e.winnings > 0;
        const isSettled = e.status === "settled";
        return (
          <div key={e._id} className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-white/50 truncate tracking-wide">
                {e.contest?.title || "Contest"}
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide ${
                  isWon
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : isSettled
                      ? "bg-red-500/15 text-red-300 border border-red-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {isWon ? "WON" : isSettled ? "LOST" : "LIVE"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wide">Rank</p>
                <p className="text-white font-black text-sm tracking-tight">
                  {e.rank > 0 ? `#${e.rank.toLocaleString("en-IN")}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wide">Entry</p>
                <p className="text-white font-black text-sm tracking-tight">
                  ₹{e.entryFee}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/50 text-right font-bold uppercase tracking-wide">
                  {isWon ? "Winnings" : isSettled ? "Result" : "Status"}
                </p>
                <p
                  className={`font-black text-sm text-right tracking-tight ${
                    isWon ? "text-emerald-400" : isSettled ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {isWon ? `+₹${e.winnings}` : isSettled ? "No win" : "Live"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
