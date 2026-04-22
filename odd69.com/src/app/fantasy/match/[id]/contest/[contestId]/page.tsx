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
      <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">
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
          <Loader2 className="animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/25 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">
                  Prize Pool
                </p>
                <p className="text-3xl font-black text-amber-500">
                  ₹{contest.totalPrize.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">
                  Entry
                </p>
                <p className="text-2xl font-black text-white">
                  {contest.entryFee === 0 ? "FREE" : `₹${contest.entryFee}`}
                </p>
              </div>
            </div>
            <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-600"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] mt-1.5">
              <span className="text-emerald-400 font-bold">
                {contest.maxSpots - contest.filledSpots} spots left
              </span>
              <span className="text-white/25 font-semibold">
                {contest.filledSpots}/{contest.maxSpots}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-black uppercase tracking-widest">
              <Chip
                icon={Crown}
                text={`1st ₹${topPrize.toLocaleString("en-IN")}`}
              />
              <Chip
                icon={Users}
                text={`${contest.multiEntry || 1}x entries`}
              />
              {contest.isGuaranteed && <Chip icon={Target} text="Guaranteed" />}
            </div>
          </div>

          <div className="flex gap-2">
            {(["leaderboard", "prizes"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                  tab === t
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300 border border-amber-500/30"
                    : "bg-white/[0.02] text-white/40 border border-white/[0.06]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "leaderboard" ? (
            <>
              {!teamsVisible && leaderboard.length > 0 && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-amber-300 text-[11px] font-black">
                  <Lock size={13} />
                  Rival teams unlock once the match starts.
                </div>
              )}
              {leaderboard.length === 0 ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center text-white/25 text-sm">
                  No entries yet. Be the first to join!
                </div>
              ) : (
                <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
                  {leaderboard.map((e, i) => {
                    const isMe = user && Number(user.id) === e.userId;
                    const canView = teamsVisible && !!e.team?.players?.length;
                    const rank = e.rank || i + 1;
                    const medalColor =
                      rank === 1
                        ? "text-yellow-400"
                        : rank === 2
                          ? "text-slate-300"
                          : rank === 3
                            ? "text-amber-600"
                            : "text-white/50";
                    return (
                      <button
                        key={e._id}
                        onClick={() => {
                          if (canView) setViewEntry(e);
                        }}
                        disabled={!canView}
                        className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0 transition-colors text-left ${
                          isMe ? "bg-amber-500/10 border-amber-500/30" : ""
                        } ${canView ? "hover:bg-white/[0.04] cursor-pointer" : "cursor-default"}`}
                      >
                        <span className={`w-8 font-mono text-xs font-black ${medalColor}`}>
                          #{rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black text-sm truncate ${isMe ? "text-amber-300" : "text-white"}`}>
                            {e.username || `Player #${e.userId}`}
                            {isMe && (
                              <span className="ml-1 text-amber-300">(you)</span>
                            )}
                          </p>
                          {e.team?.teamName && (
                            <p className="text-[11px] text-white/50 font-bold truncate">
                              {e.team.teamName}
                            </p>
                          )}
                        </div>
                        {e.winnings > 0 ? (
                          <span className="text-emerald-400 font-black text-sm">
                            +₹{e.winnings.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              e.status === "settled"
                                ? "bg-white/[0.04] text-white/50"
                                : "bg-red-500/10 text-red-300 border border-red-500/20"
                            }`}
                          >
                            {e.status === "settled" ? "—" : (
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                Live
                              </span>
                            )}
                          </span>
                        )}
                        {canView ? (
                          <span className="text-amber-400">
                            <Users size={15} strokeWidth={2.5} />
                          </span>
                        ) : !teamsVisible ? (
                          <Lock size={13} className="text-white/25" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
              {(contest.prizeBreakdown || []).length === 0 ? (
                <div className="p-10 text-center text-white/25 text-sm">
                  Winner takes ₹{contest.totalPrize.toLocaleString("en-IN")}.
                </div>
              ) : (
                contest.prizeBreakdown.map((p, i) => {
                  const highlight = p.rankFrom === 1;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0 ${
                        highlight
                          ? "bg-gradient-to-r from-amber-500/15 to-orange-500/5 border-amber-500/25"
                          : ""
                      }`}
                    >
                      <span className="w-16 text-white/50 font-mono text-xs font-bold">
                        #{p.rankFrom}
                        {p.rankTo !== p.rankFrom ? `–${p.rankTo}` : ""}
                      </span>
                      <span className="flex-1 text-white font-black text-sm">
                        Rank {p.rankFrom}
                        {p.rankTo !== p.rankFrom ? ` to ${p.rankTo}` : ""}
                      </span>
                      <span className="text-amber-500 font-black text-base">
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
        className="relative w-full md:max-w-lg max-h-[92dvh] bg-gradient-to-b from-[#1a1208] via-[#120c05] to-[#0a0703] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 flex items-center gap-3 text-[#1a1208]">
          <div className="flex-1 min-w-0">
            <p className="text-[#1a1208]/70 text-[10px] font-black uppercase tracking-widest">
              Rank #{entry.rank || "—"} · {entry.username || `Player #${entry.userId}`}
            </p>
            <p className="text-[#1a1208] font-black text-[15px] tracking-tight truncate">
              {entry.team?.teamName || "Team"}
            </p>
          </div>
          {entry.winnings > 0 && (
            <span className="text-emerald-900 font-black text-sm">
              +₹{entry.winnings.toLocaleString("en-IN")}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#1a1208]/15 hover:bg-[#1a1208]/25 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {teamA && teamB && (
            <div className="flex items-center justify-center gap-3 px-4 pt-3 text-[11px] font-black text-white">
              <span className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1">
                {teamA.short}
                <span className="text-amber-300">{teamACount}</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1">
                {teamB.short}
                <span className="text-amber-300">{teamBCount}</span>
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
            <div className="bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/25 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Crown size={13} className="text-amber-400" />
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-300">
                  Captain
                </p>
              </div>
              <p className="text-white font-black text-sm truncate tracking-tight">
                {captain?.name || "—"}
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Star size={13} className="text-amber-300" />
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-300">
                  Vice Captain
                </p>
              </div>
              <p className="text-white font-black text-sm truncate tracking-tight">
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

          <div className="bg-white/[0.03] border-t border-white/[0.06] px-4 py-3 mt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
              Squad ({players.length})
            </p>
            <div className="divide-y divide-white/[0.06]">
              {players.map((p) => {
                const teamShort =
                  p.teamId === teamA?.id ? teamA?.short : teamB?.short;
                return (
                  <div
                    key={p.playerId}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.04] text-white/70 text-[10px] font-black">
                      {teamShort || "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-black text-[13px] truncate tracking-tight">
                          {p.name}
                        </p>
                        {p.isCaptain && (
                          <span className="text-[8px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-px rounded tracking-wide">
                            C
                          </span>
                        )}
                        {p.isViceCaptain && (
                          <span className="text-[8px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-px rounded tracking-wide">
                            VC
                          </span>
                        )}
                      </div>
                      <p className="text-white/50 text-[10px] font-bold capitalize">
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
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-2 text-center">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
        {label}
      </p>
      <p className="text-white font-black text-lg tracking-tight">{count}</p>
    </div>
  );
}

function Chip({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/70 px-2 py-1 rounded-full border border-white/[0.06]">
      <Icon size={10} /> {text}
    </span>
  );
}
