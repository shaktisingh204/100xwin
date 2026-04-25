"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  MapPin,
  Plus,
  Trophy,
  Users,
  Award,
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

  const joinedContestIds = useMemo(
    () => new Set(myEntries.map((e) => e.contestId)),
    [myEntries],
  );

  const startDate = match ? new Date(match.startDate) : new Date();
  const diffMs = startDate.getTime() - Date.now();
  const isLive = match?.status === 3;
  const isUpcoming = match?.status === 1;
  const isCompleted = match?.status === 2;

  const visibleContests = useMemo(() => {
    const base = isCompleted
      ? contests.filter((c) => joinedContestIds.has(c._id))
      : contests;
    return base.filter((c) => (c.phase ?? "full") === phase);
  }, [contests, joinedContestIds, isCompleted, phase]);

  const phaseCounts = useMemo(() => {
    const counts: Record<ContestPhase, number> = {
      full: 0,
      innings1: 0,
      innings2: 0,
      powerplay: 0,
    };
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!match) {
    return (
      <FantasyShell title="Match Not Found" backHref="/fantasy">
        <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-10 text-center">
          <p className="text-[var(--ink-faint)] text-sm font-semibold">
            Match not found or not yet synced.
          </p>
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
      {/* Sticky hero / score panel — sits under the shell header on mobile */}
      <div className="sticky top-0 z-30 -mx-4 md:mx-0 px-4 md:px-0 pt-2 pb-3 bg-[var(--bg-base)]/85 backdrop-blur-md">
        <div
          className="relative grain overflow-hidden rounded-[18px] border border-[var(--line-gold)] p-4 md:p-5"
          style={{
            background:
              "radial-gradient(ellipse 90% 100% at 0% 0%, rgba(245,183,10,0.18) 0%, rgba(245,183,10,0.02) 60%), linear-gradient(180deg, var(--bg-surface), var(--bg-base))",
          }}
        >
          <div className="absolute inset-0 dotgrid opacity-20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="t-eyebrow truncate">
                {match.competitionTitle}
              </span>
              {isLive && (
                <span className="chip chip-crimson !text-[9px]">
                  <Circle
                    size={5}
                    fill="currentColor"
                    className="animate-live-dot"
                  />{" "}
                  Live
                </span>
              )}
              {isUpcoming && (
                <span className="chip chip-emerald !text-[9px]">Open</span>
              )}
              {isCompleted && (
                <span className="chip !text-[9px]">Result</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <TeamHero team={match.teamA} score={match.scoreA} />

              <div className="flex flex-col items-center shrink-0 px-1">
                {isUpcoming && typeof countdown !== "string" ? (
                  <>
                    <span className="t-eyebrow !text-[8.5px]">Starts in</span>
                    <div className="flex items-center gap-1 mt-1.5">
                      <CountdownBlock label="H" value={countdown.h} />
                      <span className="num text-[var(--ink-faint)] font-extrabold">
                        :
                      </span>
                      <CountdownBlock label="M" value={countdown.m} />
                      <span className="num text-[var(--ink-faint)] font-extrabold">
                        :
                      </span>
                      <CountdownBlock label="S" value={countdown.s} />
                    </div>
                  </>
                ) : isLive ? (
                  <>
                    <span className="t-eyebrow !text-[8.5px] !text-[var(--crimson)]">
                      Status
                    </span>
                    <span className="font-display font-extrabold text-base mt-1 tracking-tight text-[var(--ink)]">
                      In Play
                    </span>
                  </>
                ) : (
                  <>
                    <span className="t-eyebrow !text-[8.5px]">Result</span>
                    <span className="font-display font-extrabold text-[11px] mt-1 text-center max-w-[140px] leading-tight text-[var(--ink-dim)]">
                      {match.statusNote || "Completed"}
                    </span>
                  </>
                )}
              </div>

              <TeamHero team={match.teamB} score={match.scoreB} />
            </div>

            <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--ink-faint)] font-semibold mt-3">
              <MapPin size={11} strokeWidth={2.5} />
              <span className="truncate">{match.venue || "TBD"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create-team CTA */}
      {isUpcoming && myTeams.length === 0 && (
        <div className="rounded-[16px] border border-[var(--line-gold)] bg-gold-soft grain p-4 mb-3">
          <div className="flex items-start gap-3">
            <div className="grid place-items-center w-11 h-11 rounded-full bg-[var(--gold-soft)] border border-[var(--line-gold)] shrink-0">
              <Users size={20} strokeWidth={2.5} className="text-[var(--gold-bright)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-[var(--ink)] font-extrabold text-[15px] tracking-tight">
                Create your first team
              </p>
              <p className="text-[var(--ink-dim)] text-[12px] mt-0.5">
                Pick 11 players, then choose a contest to join.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/fantasy/match/${id}/create`)}
            className="mt-4 w-full btn btn-gold sweep h-11 uppercase tracking-[0.08em] text-[12px]"
          >
            <Plus size={14} strokeWidth={3} /> Create Team
          </button>
        </div>
      )}

      {/* My Teams summary */}
      {myTeams.length > 0 && (
        <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-3 mb-3 flex items-center justify-between">
          <div>
            <p className="font-display text-[var(--ink)] font-extrabold text-sm tracking-tight">
              <span className="num">{myTeams.length}</span> Team
              {myTeams.length > 1 ? "s" : ""} created
            </p>
            <p className="text-[var(--ink-faint)] text-[11px] font-semibold">
              <span className="num">{myEntries.length}</span> contest
              {myEntries.length !== 1 ? "s" : ""} joined
            </p>
          </div>
          <button
            onClick={() => setTab("my-teams")}
            className="inline-flex items-center gap-1 chip chip-gold !py-1.5 !px-3 min-h-9"
          >
            View <ChevronRight size={12} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] px-1 flex items-center mb-3 overflow-hidden">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-[12px] font-bold py-3 transition-all relative uppercase tracking-[0.08em] min-h-[44px] ${
                active
                  ? "text-[var(--gold-bright)]"
                  : "text-[var(--ink-faint)] hover:text-[var(--ink)]"
              }`}
            >
              {t.label}
              {t.id === "my-teams" && myTeams.length > 0 && (
                <span
                  className={`num ml-1 text-[10px] font-extrabold ${
                    active ? "text-[var(--gold-bright)]" : "text-[var(--ink-whisper)]"
                  }`}
                >
                  ({myTeams.length})
                </span>
              )}
              {active && (
                <span
                  className="absolute bottom-0 left-1/4 right-1/4 h-[2.5px] rounded-t-full"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--gold-bright), var(--gold))",
                    boxShadow: "0 0 10px var(--gold-halo)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === "contests" &&
        (isUpcoming && myTeams.length === 0 ? (
          <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-10 text-center">
            <Users size={32} className="text-[var(--ink-whisper)] mx-auto mb-2" strokeWidth={1.5} />
            <p className="font-display text-[var(--ink)] font-extrabold text-sm mb-1">
              Create a team to see contests
            </p>
            <p className="text-[var(--ink-faint)] text-xs">
              Contests unlock once you&apos;ve built your first team for this match.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar -mx-1 px-1">
              {PHASE_TABS.map((p) => {
                const active = phase === p.id;
                const count = phaseCounts[p.id];
                return (
                  <button
                    key={p.id}
                    onClick={() => setPhase(p.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] px-3 h-9 rounded-full border transition-all ${
                      active
                        ? "bg-[var(--gold-soft)] border-[var(--line-gold)] text-[var(--gold-bright)]"
                        : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-faint)] hover:border-[var(--line-gold)]"
                    }`}
                  >
                    {p.label}
                    <span
                      className={`num text-[10px] font-extrabold ${
                        active
                          ? "text-[var(--gold-bright)]/80"
                          : "text-[var(--ink-whisper)]"
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
              canJoin={!!isUpcoming}
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
        ))}

      {tab === "my-teams" && (
        <MyTeamsList teams={myTeams} matchId={match.externalMatchId} disabled={!isUpcoming} />
      )}

      {tab === "winnings" && <MyWinningsList entries={myEntries} />}

      {isUpcoming && tab === "contests" && (
        <div className="fixed bottom-[80px] md:bottom-6 left-0 right-0 z-40 px-4 md:max-w-sm md:mx-auto md:px-0 pointer-events-none">
          <div className="flex items-center justify-center gap-2 glass border border-[var(--line-gold)] text-[var(--gold-bright)] rounded-[14px] py-3 font-bold text-[12px] uppercase tracking-[0.08em] shadow-xl">
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
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] border border-[var(--line-default)] flex items-center justify-center overflow-hidden shrink-0">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={team.short}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              if (e.target instanceof HTMLImageElement && e.target.parentElement) {
                e.target.parentElement.innerHTML = `<span class='font-mono font-extrabold text-[11px] text-[var(--ink-dim)]'>${team.short}</span>`;
              }
            }}
          />
        ) : (
          <span className="font-mono font-extrabold text-[11px] text-[var(--ink-dim)]">
            {team.short}
          </span>
        )}
      </div>
      <p className="font-display text-[var(--ink)] font-extrabold text-[14px] tracking-tight truncate max-w-full">
        {team.short}
      </p>
      {scoreStr && (
        <p className="num text-[var(--gold-bright)] font-bold text-[11px] truncate">
          {scoreStr}
        </p>
      )}
    </div>
  );
}

function CountdownBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-[var(--bg-elevated)] border border-[var(--line-default)] rounded-md px-2 py-1 min-w-[28px] text-center">
        <span className="num font-extrabold text-base tracking-tight text-[var(--ink)]">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="t-eyebrow !text-[8px] mt-0.5">{label}</span>
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
      <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-10 text-center">
        <p className="text-[var(--ink-faint)] font-semibold text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-24">
      {contests.map((c) => {
        const isJoined = joined.has(c._id);
        const pct =
          c.maxSpots > 0
            ? Math.min(100, Math.round((c.filledSpots / c.maxSpots) * 100))
            : 0;
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
            className="block rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden hover:border-[var(--line-gold)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] transition-all"
          >
            <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="t-eyebrow !text-[9px] mb-1">Prize Pool</p>
                <p className="num font-display text-[var(--ink)] font-extrabold text-2xl leading-none tracking-tight">
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
                className={`shrink-0 text-[12px] font-extrabold px-4 min-h-[44px] rounded-[10px] transition-all min-w-[88px] uppercase tracking-[0.08em] inline-flex items-center justify-center gap-1.5 ${
                  isJoined
                    ? "bg-[var(--emerald-soft)] border border-[var(--emerald)]/25 text-[var(--emerald)]"
                    : !canJoin
                      ? "bg-[var(--bg-elevated)] text-[var(--ink-whisper)] border border-[var(--line-default)] cursor-not-allowed"
                      : "btn btn-gold sweep"
                }`}
              >
                {isJoined ? (
                  "View"
                ) : !canJoin ? (
                  "Closed"
                ) : c.entryFee === 0 ? (
                  "FREE"
                ) : (
                  <span className="num">₹{c.entryFee}</span>
                )}
              </button>
            </div>

            <div className="px-4 pb-2.5">
              <div className="w-full h-1.5 rounded-full bg-[var(--ink-ghost)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-gold-grad"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] font-bold">
                <span className="text-[var(--gold-bright)]">
                  {c.maxSpots - c.filledSpots > 0 ? (
                    <>
                      <span className="num">
                        {(c.maxSpots - c.filledSpots).toLocaleString("en-IN")}
                      </span>{" "}
                      spots left
                    </>
                  ) : (
                    "Contest Full"
                  )}
                </span>
                <span className="num text-[var(--ink-faint)]">
                  {c.maxSpots.toLocaleString("en-IN")} spots
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-[var(--line)] bg-[var(--bg-elevated)] text-[10px] flex-wrap">
              <Badge label={`1st ₹${firstPrize.toLocaleString("en-IN")}`} icon={<Trophy size={9} className="text-[var(--gold)]" />} />
              <Badge
                label={`${winnerCount || 1} Winner${winnerCount > 1 ? "s" : ""}`}
                icon={<Users size={9} className="text-[var(--ice)]" />}
              />
              {c.maxSpots === 2 && <Badge label="H2H" />}
              {c.entryFee === 0 && <Badge label="Free" />}
              {c.phase === "innings1" && <Badge label="1st Inn" />}
              {c.phase === "innings2" && <Badge label="2nd Inn" />}
              {c.phase === "powerplay" && <Badge label="Powerplay" />}
            </div>

            {c.prizeBreakdown.length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle(c._id);
                }}
                className="w-full flex items-center justify-center gap-1 px-4 py-2.5 border-t border-[var(--line)] text-[var(--gold-bright)] font-bold text-[11px] hover:bg-[var(--gold-soft)] transition-colors uppercase tracking-[0.08em] min-h-[44px]"
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
              <div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--gold-soft)]">
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px]">
                  <div className="t-eyebrow !text-[9px]">Rank</div>
                  <div className="t-eyebrow !text-[9px] text-right">Prize</div>
                  {c.prizeBreakdown.map((t, i) => (
                    <React.Fragment key={i}>
                      <div className="num text-[var(--ink-dim)] font-bold">
                        #{t.rankFrom}
                        {t.rankTo > t.rankFrom ? ` – #${t.rankTo}` : ""}
                      </div>
                      <div className="num text-[var(--ink)] font-extrabold text-right">
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

function Badge({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--line-default)] rounded-md px-2 py-0.5 font-bold text-[var(--ink-dim)] text-[10px]">
      {icon}
      {label}
    </span>
  );
}

function MyTeamsList({
  teams,
  matchId,
}: {
  teams: any[];
  matchId: number;
  disabled: boolean;
}) {
  if (teams.length === 0) {
    return (
      <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-10 text-center">
        <Users size={32} className="text-[var(--ink-whisper)] mx-auto mb-2" strokeWidth={1.5} />
        <p className="font-display text-[var(--ink)] font-extrabold text-sm mb-1">
          No teams created yet
        </p>
        <p className="text-[var(--ink-faint)] text-xs mb-4">
          Create your first dream team to start playing
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-24">
      {teams.map((team) => {
        const captain = team.players?.find(
          (p: any) => p.playerId === team.captainId,
        );
        const viceCaptain = team.players?.find(
          (p: any) => p.playerId === team.viceCaptainId,
        );
        const roleCounts: Record<string, number> = {};
        for (const p of team.players || [])
          roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;

        return (
          <Link
            key={team._id}
            href={`/fantasy/match/${matchId}/team/${team._id}`}
            className="block rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-gold)] transition-all overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--line)]">
              <span className="font-display text-[var(--ink)] font-extrabold text-sm tracking-tight truncate">
                {team.teamName}
              </span>
              <span className="chip chip-gold !text-[9px]">
                <span className="num">{team.players?.length || 0}</span> Players
              </span>
            </div>
            <div className="px-4 py-3">
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div className="bg-[var(--gold-soft)] border border-[var(--line-gold)] rounded-[10px] p-2">
                  <div className="flex items-center justify-between">
                    <p className="t-eyebrow !text-[8px]">Captain</p>
                    <span className="num text-[8px] font-extrabold bg-[var(--gold)] text-[var(--bg-base)] px-1 py-[1px] rounded tracking-wide">
                      2x
                    </span>
                  </div>
                  <p className="text-[var(--ink)] font-extrabold text-xs truncate tracking-tight">
                    {captain?.name || "—"}
                  </p>
                </div>
                <div className="bg-[var(--ice-soft)] border border-[var(--ice)]/25 rounded-[10px] p-2">
                  <div className="flex items-center justify-between">
                    <p className="t-eyebrow !text-[8px] !text-[var(--ice)]">
                      Vice Captain
                    </p>
                    <span className="num text-[8px] font-extrabold bg-[var(--ice)] text-[var(--bg-base)] px-1 py-[1px] rounded tracking-wide">
                      1.5x
                    </span>
                  </div>
                  <p className="text-[var(--ink)] font-extrabold text-xs truncate tracking-tight">
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
                <ChevronRight size={15} className="text-[var(--ink-whisper)]" />
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
      <span className="text-[var(--ink-whisper)] font-bold text-[9px] tracking-wide">
        {label}
      </span>
      <span className="num text-[var(--ink)] font-extrabold text-[11px]">
        {count}
      </span>
    </div>
  );
}

function MyWinningsList({ entries }: { entries: any[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-10 text-center">
        <Award size={32} className="text-[var(--ink-whisper)] mx-auto mb-2" strokeWidth={1.5} />
        <p className="font-display text-[var(--ink)] font-extrabold text-sm mb-1">
          No contests joined yet
        </p>
        <p className="text-[var(--ink-faint)] text-xs">
          Your winnings will appear here after you join contests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-24">
      {entries.map((e) => {
        const isWon = e.winnings > 0;
        const isSettled = e.status === "settled";
        return (
          <div
            key={e._id}
            className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-3.5"
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="t-eyebrow truncate">
                {e.contest?.title || "Contest"}
              </span>
              <span
                className={`chip !text-[9px] ${
                  isWon
                    ? "chip-emerald"
                    : isSettled
                      ? "chip-crimson"
                      : "chip-gold"
                }`}
              >
                {isWon ? "WON" : isSettled ? "LOST" : "LIVE"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="t-eyebrow !text-[10px]">Rank</p>
                <p className="num font-extrabold text-sm tracking-tight text-[var(--ink)]">
                  {e.rank > 0 ? `#${e.rank.toLocaleString("en-IN")}` : "—"}
                </p>
              </div>
              <div>
                <p className="t-eyebrow !text-[10px]">Entry</p>
                <p className="num font-extrabold text-sm tracking-tight text-[var(--ink)]">
                  ₹{e.entryFee}
                </p>
              </div>
              <div>
                <p className="t-eyebrow !text-[10px] text-right">
                  {isWon ? "Winnings" : isSettled ? "Result" : "Status"}
                </p>
                <p
                  className={`num font-extrabold text-sm text-right tracking-tight ${
                    isWon
                      ? "text-[var(--emerald)]"
                      : isSettled
                        ? "text-[var(--crimson)]"
                        : "text-[var(--gold-bright)]"
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
