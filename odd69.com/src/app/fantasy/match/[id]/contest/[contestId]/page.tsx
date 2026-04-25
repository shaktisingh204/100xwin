"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Crown,
  Loader2,
  Lock,
  Star,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import CricketField, {
  CricketFieldTeam,
  FieldPlayer,
} from "@/components/fantasy/CricketField";
import api from "@/services/api";

interface Contest {
  _id: string;
  matchId: number;
  title: string;
  type: string;
  entryFee: number;
  totalPrize: number;
  maxSpots: number;
  filledSpots: number;
  prizeBreakdown: Array<{ rankFrom: number; rankTo: number; prize: number }>;
  multiEntry?: number;
  isGuaranteed?: boolean;
  isSettled?: boolean;
}

interface EntryTeamPlayer {
  playerId: number;
  name: string;
  role: string;
  teamId: number;
  credit?: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

interface EntryTeam {
  _id?: string;
  teamName: string;
  captainId?: number;
  viceCaptainId?: number;
  players?: EntryTeamPlayer[];
}

interface Entry {
  _id: string;
  userId: number;
  teamId: string;
  rank: number;
  totalPoints: number;
  winnings: number;
  status: string;
  username?: string;
  team?: EntryTeam;
  teamsVisible?: boolean;
}

export default function ContestDetailPage() {
  const router = useRouter();
  const { id, contestId } = useParams<{ id: string; contestId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [teamA, setTeamA] = useState<CricketFieldTeam | null>(null);
  const [teamB, setTeamB] = useState<CricketFieldTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"leaderboard" | "prizes">("leaderboard");
  const [viewEntry, setViewEntry] = useState<Entry | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!id || !contestId) return;
    (async () => {
      setLoading(true);
      const [contestsRes, lbRes, squadsRes] = await Promise.all([
        api.get(`/fantasy/matches/${id}/contests`).catch(() => null),
        api
          .get(`/fantasy/contests/${contestId}/leaderboard`, {
            params: { limit: 100 },
          })
          .catch(() => null),
        api.get(`/fantasy/matches/${id}/squads`).catch(() => null),
      ]);
      const found = (contestsRes?.data || []).find(
        (c: Contest) => c._id === contestId,
      );
      setContest(found || null);
      setLeaderboard(lbRes?.data || []);
      setTeamA(squadsRes?.data?.teamA || null);
      setTeamB(squadsRes?.data?.teamB || null);
      setLoading(false);
    })();
  }, [id, contestId]);

  const teamsVisible = useMemo(
    () => leaderboard.some((e) => e.teamsVisible),
    [leaderboard],
  );

  const pct = contest
    ? Math.round((contest.filledSpots / contest.maxSpots) * 100)
    : 0;
  const topPrize = contest?.prizeBreakdown?.[0]?.prize ?? contest?.totalPrize ?? 0;

  if (authLoading || !user)
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[var(--ink-faint)] text-sm">
        Loading...
      </div>
    );

  return (
    <FantasyShell
      title={contest?.title || "Contest"}
      subtitle={contest?.type}
      backHref={`/fantasy/match/${id}`}
      hideSubNav
    >
      {loading || !contest ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[var(--gold)]" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[var(--gold-soft)] border border-[var(--line-gold)] p-5 grain">
            <div className="flex items-center justify-between mb-3 gap-3">
              <div>
                <p className="t-eyebrow">Prize Pool</p>
                <p className="num font-display text-[var(--gold-bright)] font-extrabold text-3xl tracking-tight">
                  ₹{contest.totalPrize.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="t-eyebrow">Entry</p>
                <p className="num font-display text-[var(--ink)] font-extrabold text-2xl tracking-tight">
                  {contest.entryFee === 0 ? "FREE" : `₹${contest.entryFee}`}
                </p>
              </div>
            </div>
            <div className="h-2 bg-[var(--ink-ghost)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-grad"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] mt-1.5 font-bold">
              <span className="text-[var(--emerald)]">
                <span className="num">{contest.maxSpots - contest.filledSpots}</span>{" "}
                spots left
              </span>
              <span className="num text-[var(--ink-faint)]">
                {contest.filledSpots}/{contest.maxSpots}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Chip
                icon={Crown}
                text={`1st ₹${topPrize.toLocaleString("en-IN")}`}
              />
              <Chip icon={Users} text={`${contest.multiEntry || 1}x entries`} />
              {contest.isGuaranteed && <Chip icon={Target} text="Guaranteed" />}
            </div>
          </div>

          <div className="flex gap-2">
            {(["leaderboard", "prizes"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-4 min-h-[44px] rounded-full text-xs font-bold uppercase tracking-[0.08em] transition-all ${
                  tab === t
                    ? "bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[var(--line-gold)]"
                    : "bg-[var(--bg-surface)] text-[var(--ink-faint)] border border-[var(--line-default)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "leaderboard" ? (
            <>
              {!teamsVisible && leaderboard.length > 0 && (
                <div className="flex items-center gap-2 bg-[var(--gold-soft)] border border-[var(--line-gold)] rounded-[12px] px-3 py-2 text-[var(--gold-bright)] text-[11px] font-bold">
                  <Lock size={13} />
                  Rival teams unlock once the match starts.
                </div>
              )}
              {leaderboard.length === 0 ? (
                <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-10 text-center text-[var(--ink-whisper)] text-sm">
                  No entries yet. Be the first to join!
                </div>
              ) : (
                <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
                  {leaderboard.map((e, i) => {
                    const isMe = user && Number(user.id) === e.userId;
                    const canView = teamsVisible && !!e.team?.players?.length;
                    const rank = e.rank || i + 1;
                    const medalColor =
                      rank === 1
                        ? "text-[var(--gold-bright)]"
                        : rank === 2
                          ? "text-[var(--ink-dim)]"
                          : rank === 3
                            ? "text-[var(--gold-deep)]"
                            : "text-[var(--ink-faint)]";
                    return (
                      <button
                        key={e._id}
                        onClick={() => {
                          if (canView) setViewEntry(e);
                        }}
                        disabled={!canView}
                        className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--line)] last:border-0 transition-colors text-left ${
                          isMe ? "bg-[var(--gold-soft)]" : ""
                        } ${canView ? "hover:bg-[var(--bg-elevated)] cursor-pointer" : "cursor-default"}`}
                      >
                        <span className={`num w-8 text-xs font-extrabold ${medalColor}`}>
                          #{rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-extrabold text-sm truncate ${
                              isMe ? "text-[var(--gold-bright)]" : "text-[var(--ink)]"
                            }`}
                          >
                            {e.username || `Player #${e.userId}`}
                            {isMe && (
                              <span className="ml-1 text-[var(--gold-bright)]">
                                (you)
                              </span>
                            )}
                          </p>
                          {e.team?.teamName && (
                            <p className="text-[11px] text-[var(--ink-faint)] font-bold truncate">
                              {e.team.teamName}
                            </p>
                          )}
                        </div>
                        {e.winnings > 0 ? (
                          <span className="num text-[var(--emerald)] font-extrabold text-sm">
                            +₹{e.winnings.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-[0.08em] px-2 py-0.5 rounded ${
                              e.status === "settled"
                                ? "bg-[var(--bg-elevated)] text-[var(--ink-faint)]"
                                : "bg-[var(--crimson-soft)] text-[var(--crimson)] border border-[var(--crimson)]/25"
                            }`}
                          >
                            {e.status === "settled" ? (
                              "—"
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--crimson)] animate-live-dot" />
                                Live
                              </span>
                            )}
                          </span>
                        )}
                        {canView ? (
                          <span className="text-[var(--gold-bright)]">
                            <Users size={15} strokeWidth={2.5} />
                          </span>
                        ) : !teamsVisible ? (
                          <Lock size={13} className="text-[var(--ink-whisper)]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
              {(contest.prizeBreakdown || []).length === 0 ? (
                <div className="p-10 text-center text-[var(--ink-whisper)] text-sm">
                  Winner takes ₹{contest.totalPrize.toLocaleString("en-IN")}.
                </div>
              ) : (
                contest.prizeBreakdown.map((p, i) => {
                  const highlight = p.rankFrom === 1;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--line)] last:border-0 ${
                        highlight ? "bg-[var(--gold-soft)]" : ""
                      }`}
                    >
                      <span className="num w-16 text-[var(--ink-faint)] text-xs font-bold">
                        #{p.rankFrom}
                        {p.rankTo !== p.rankFrom ? `–${p.rankTo}` : ""}
                      </span>
                      <span className="flex-1 font-display text-[var(--ink)] font-extrabold text-sm">
                        Rank {p.rankFrom}
                        {p.rankTo !== p.rankFrom ? ` to ${p.rankTo}` : ""}
                      </span>
                      <span className="num text-[var(--gold-bright)] font-extrabold text-base">
                        ₹{p.prize.toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {viewEntry && (
        <EntryTeamModal
          entry={viewEntry}
          teamA={teamA}
          teamB={teamB}
          onClose={() => setViewEntry(null)}
        />
      )}
    </FantasyShell>
  );
}

function EntryTeamModal({
  entry,
  teamA,
  teamB,
  onClose,
}: {
  entry: Entry;
  teamA: CricketFieldTeam | null;
  teamB: CricketFieldTeam | null;
  onClose: () => void;
}) {
  const players = entry.team?.players || [];
  const fieldPlayers: FieldPlayer[] = players.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    role: p.role,
    teamId: p.teamId,
    credit: p.credit,
    isCaptain: p.isCaptain,
    isViceCaptain: p.isViceCaptain,
  }));

  const captain = players.find((p) => p.isCaptain);
  const viceCaptain = players.find((p) => p.isViceCaptain);
  const teamACount = teamA ? players.filter((p) => p.teamId === teamA.id).length : 0;
  const teamBCount = teamB ? players.filter((p) => p.teamId === teamB.id).length : 0;
  const roleCounts: Record<string, number> = {};
  for (const p of players) roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        className="relative w-full md:max-w-lg max-h-[92dvh] bg-[var(--bg-surface)] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[var(--line-gold)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bottom-sheet handle for mobile */}
        <div className="md:hidden flex justify-center pt-2 absolute top-0 left-0 right-0 z-10">
          <span className="w-10 h-1 rounded-full bg-[var(--ink-whisper)]" />
        </div>
        <div className="sticky top-0 z-20 bg-gold-grad px-4 py-3 flex items-center gap-3 text-[var(--bg-base)]">
          <div className="flex-1 min-w-0">
            <p className="t-eyebrow !text-[10px] !text-[var(--bg-base)]/70">
              Rank #{entry.rank || "—"} · {entry.username || `Player #${entry.userId}`}
            </p>
            <p className="font-display text-[var(--bg-base)] font-extrabold text-[15px] tracking-tight truncate">
              {entry.team?.teamName || "Team"}
            </p>
          </div>
          {entry.winnings > 0 && (
            <span className="num text-[var(--bg-base)] font-extrabold text-sm">
              +₹{entry.winnings.toLocaleString("en-IN")}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-[var(--bg-base)]/15 hover:bg-[var(--bg-base)]/25 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {teamA && teamB && (
            <div className="flex items-center justify-center gap-3 px-4 pt-3 text-[11px] font-extrabold text-[var(--ink)]">
              <span className="inline-flex items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--line-default)] rounded-full px-3 py-1">
                {teamA.short}
                <span className="num text-[var(--gold-bright)]">{teamACount}</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--line-default)] rounded-full px-3 py-1">
                {teamB.short}
                <span className="num text-[var(--gold-bright)]">{teamBCount}</span>
              </span>
            </div>
          )}

          <div className="px-3 pt-3">
            <CricketField
              players={fieldPlayers}
              teamA={teamA || undefined}
              teamB={teamB || undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 px-4 pt-3">
            <div className="rounded-[12px] border border-[var(--line-gold)] bg-[var(--gold-soft)] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Crown size={13} className="text-[var(--gold-bright)]" />
                <p className="t-eyebrow !text-[9px] !text-[var(--gold-bright)]">
                  Captain
                </p>
              </div>
              <p className="font-display text-[var(--ink)] font-extrabold text-sm truncate tracking-tight">
                {captain?.name || "—"}
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--ice)]/25 bg-[var(--ice-soft)] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Star size={13} className="text-[var(--ice)]" />
                <p className="t-eyebrow !text-[9px] !text-[var(--ice)]">
                  Vice Captain
                </p>
              </div>
              <p className="font-display text-[var(--ink)] font-extrabold text-sm truncate tracking-tight">
                {viceCaptain?.name || "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 px-4 py-3">
            <RoleTile label="WK" count={roleCounts.keeper || 0} />
            <RoleTile label="BAT" count={roleCounts.batsman || 0} />
            <RoleTile label="AR" count={roleCounts.allrounder || 0} />
            <RoleTile label="BOWL" count={roleCounts.bowler || 0} />
          </div>

          <div className="bg-[var(--bg-elevated)] border-t border-[var(--line)] px-4 py-3 mt-2">
            <p className="t-eyebrow !text-[10px] mb-2">
              Squad (<span className="num">{players.length}</span>)
            </p>
            <div className="divide-y divide-[var(--line)]">
              {players.map((p) => {
                const teamShort =
                  p.teamId === teamA?.id ? teamA?.short : teamB?.short;
                return (
                  <div
                    key={p.playerId}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <span className="num inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-surface)] text-[var(--ink-dim)] text-[10px] font-extrabold">
                      {teamShort || "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-display text-[var(--ink)] font-extrabold text-[13px] truncate tracking-tight">
                          {p.name}
                        </p>
                        {p.isCaptain && (
                          <span className="num text-[8px] font-extrabold text-[var(--gold-bright)] bg-[var(--gold-soft)] border border-[var(--line-gold)] px-1.5 py-px rounded tracking-wide">
                            C
                          </span>
                        )}
                        {p.isViceCaptain && (
                          <span className="num text-[8px] font-extrabold text-[var(--ice)] bg-[var(--ice-soft)] border border-[var(--ice)]/25 px-1.5 py-px rounded tracking-wide">
                            VC
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--ink-faint)] text-[10px] font-bold capitalize">
                        {p.role}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleTile({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] px-2 py-2 text-center">
      <p className="t-eyebrow !text-[9px]">{label}</p>
      <p className="num font-display text-[var(--ink)] font-extrabold text-lg tracking-tight">
        {count}
      </p>
    </div>
  );
}

function Chip({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[var(--bg-surface)] text-[var(--ink-dim)] px-2 py-1 rounded-full border border-[var(--line-default)] text-[10px] font-bold uppercase tracking-[0.08em]">
      <Icon size={10} /> {text}
    </span>
  );
}
