"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Crown,
  Loader2,
  Plus,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import FantasyShell from "@/components/fantasy/FantasyShell";

interface Contest {
  _id: string;
  title: string;
  type: string;
  entryFee: number;
  totalPrize: number;
  maxSpots: number;
  filledSpots: number;
  prizeBreakdown: Array<{ rankFrom: number; rankTo: number; prize: number }>;
}

interface TeamDoc {
  _id: string;
  teamName: string;
  totalCredits?: number;
  captainId?: number;
  viceCaptainId?: number;
  players: Array<{
    playerId: number;
    name: string;
    role: string;
    teamId: number;
    credit: number;
    isCaptain?: boolean;
    isViceCaptain?: boolean;
  }>;
}

export default function ContestJoinPage() {
  const router = useRouter();
  const { id, contestId } = useParams<{ id: string; contestId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [teams, setTeams] = useState<TeamDoc[]>([]);
  const [joinedTeamIds, setJoinedTeamIds] = useState<Set<string>>(new Set());
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    if (!id || !contestId) return;
    try {
      const [contestsRes, teamsRes, historyRes] = await Promise.all([
        api.get(`/fantasy/matches/${id}/contests`),
        api.get(`/fantasy/my-teams/${id}`),
        api
          .get("/fantasy/history", { params: { limit: 100 } })
          .catch(() => null),
      ]);
      const found = (contestsRes.data || []).find(
        (c: Contest) => c._id === contestId,
      );
      setContest(found || null);
      const teamList: TeamDoc[] = teamsRes.data || [];
      setTeams(teamList);
      const joinedSet = new Set<string>();
      for (const e of historyRes?.data?.entries || []) {
        if (String(e.contestId) === contestId) joinedSet.add(e.teamId);
      }
      setJoinedTeamIds(joinedSet);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id, contestId]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user, fetchData]);

  const goCreate = () => {
    if (!id || !contestId) return;
    router.push(`/fantasy/match/${id}/create?contestId=${contestId}`);
  };

  const handleJoin = async () => {
    if (!selectedTeamId || !contest) return;
    setJoining(true);
    setErr("");
    try {
      await api.post("/fantasy/join-contest", {
        contestId: contest._id,
        teamId: selectedTeamId,
        matchId: Number(id),
      });
      router.replace(`/fantasy/match/${id}`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to join contest");
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">
        Loading...
      </div>
    );
  }

  if (!contest) {
    return (
      <FantasyShell
        title="Contest"
        backHref={`/fantasy/match/${id}`}
        hideSubNav
      >
        <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-8 text-center">
          <p className="text-white font-black mb-2 tracking-tight">
            Contest not found
          </p>
          <button
            onClick={() => router.back()}
            className="text-amber-400 hover:text-amber-300 font-black text-sm"
          >
            ← Go back
          </button>
        </div>
      </FantasyShell>
    );
  }

  const selected = teams.find((t) => t._id === selectedTeamId) || null;

  return (
    <FantasyShell
      title={contest.title || "Join Contest"}
      subtitle="Step 1 of 4 · Pick a team"
      backHref={`/fantasy/match/${id}`}
      hideSubNav
    >
      <div className="pb-[120px]">
        {/* Contest summary card */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
                Prize Pool
              </p>
              <p className="text-2xl font-black text-amber-400 tracking-tight">
                ₹{contest.totalPrize.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
                Entry
              </p>
              <p className="text-2xl font-black text-white tracking-tight">
                {contest.entryFee === 0 ? "FREE" : `₹${contest.entryFee}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] font-black text-white/70 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
              <Trophy size={10} /> 1st ₹
              {(
                contest.prizeBreakdown[0]?.prize || contest.totalPrize
              ).toLocaleString("en-IN")}
            </span>
            <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/70 border border-white/[0.06] px-2 py-0.5 rounded-md">
              <Users size={10} /> {contest.maxSpots - contest.filledSpots} spots
              left
            </span>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-widest">
          {[
            { n: 1, label: "Contest", done: true, active: false },
            { n: 2, label: "Team", done: false, active: true },
            { n: 3, label: "C & VC", done: false, active: false },
            { n: 4, label: "Preview", done: false, active: false },
          ].map((s, i) => (
            <div key={s.n} className="flex-1 flex items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    s.done
                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                      : s.active
                        ? "bg-amber-500 text-[#1a1208]"
                        : "bg-white/[0.04] border border-white/[0.06] text-white/50"
                  }`}
                >
                  {s.done ? <Check size={10} strokeWidth={3} /> : s.n}
                </span>
                <span
                  className={`${
                    s.active
                      ? "text-white"
                      : s.done
                        ? "text-emerald-400"
                        : "text-white/50"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < 3 && (
                <div className="flex-1 h-[2px] mx-1.5 bg-white/[0.06] rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* Team selector */}
        {teams.length === 0 ? (
          <button
            onClick={goCreate}
            className="w-full bg-white/[0.03] rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-500 p-8 text-center transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
              <Plus size={24} className="text-amber-400" strokeWidth={2.5} />
            </div>
            <p className="text-white font-black text-sm tracking-tight">
              Create your first team
            </p>
            <p className="text-white/50 text-xs mt-0.5">
              Pick 11 players, then choose Captain &amp; Vice Captain
            </p>
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-black text-xs uppercase tracking-widest">
                My Teams ({teams.length})
              </p>
              <button
                onClick={goCreate}
                className="inline-flex items-center gap-1 text-white/70 hover:text-white text-[11px] font-black uppercase tracking-wide"
              >
                <Plus size={12} strokeWidth={3} /> Create New
              </button>
            </div>
            <div className="space-y-2">
              {teams.map((t) => {
                const isJoined = joinedTeamIds.has(t._id);
                const isSelected = selectedTeamId === t._id;
                const captain = t.players.find((p) => p.isCaptain);
                const viceCaptain = t.players.find((p) => p.isViceCaptain);
                const roleCounts: Record<string, number> = {};
                for (const p of t.players)
                  roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
                return (
                  <button
                    key={t._id}
                    onClick={() => {
                      if (isJoined) return;
                      setSelectedTeamId(t._id);
                    }}
                    disabled={isJoined}
                    className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all ${
                      isJoined
                        ? "opacity-60 bg-white/[0.03] border-white/[0.06]"
                        : isSelected
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                            isSelected
                              ? "bg-amber-500 border-amber-500"
                              : "bg-white/[0.04] border-white/[0.12]"
                          }`}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              className="text-[#1a1208]"
                              strokeWidth={3}
                            />
                          )}
                        </span>
                        <span className="text-white font-black text-sm tracking-tight">
                          {t.teamName}
                        </span>
                      </div>
                      {isJoined ? (
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Joined
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md tracking-wider uppercase">
                          {t.players.length} players
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5">
                          <Crown size={11} className="text-amber-400" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-[8px] font-black uppercase text-amber-300 tracking-widest leading-none">
                                Captain
                              </p>
                              <span className="text-[8px] font-black bg-amber-500 text-[#1a1208] px-1 py-[1px] rounded tracking-wide leading-none">
                                2x
                              </span>
                            </div>
                            <p className="text-white font-black text-[11px] truncate tracking-tight mt-0.5">
                              {captain?.name || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5">
                          <Star size={11} className="text-amber-300" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-[8px] font-black uppercase text-amber-300 tracking-widest leading-none">
                                Vice Captain
                              </p>
                              <span className="text-[8px] font-black bg-amber-500/60 text-[#1a1208] px-1 py-[1px] rounded tracking-wide leading-none">
                                1.5x
                              </span>
                            </div>
                            <p className="text-white font-black text-[11px] truncate tracking-tight mt-0.5">
                              {viceCaptain?.name || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <RoleCount label="WK" count={roleCounts.keeper || 0} />
                        <RoleCount label="BAT" count={roleCounts.batsman || 0} />
                        <RoleCount
                          label="AR"
                          count={roleCounts.allrounder || 0}
                        />
                        <RoleCount label="BOWL" count={roleCounts.bowler || 0} />
                        <ChevronRight
                          size={14}
                          className="ml-auto text-white/25"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {err && (
          <p className="text-red-400 font-black text-sm mt-3">{err}</p>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-[64px] md:bottom-0 left-0 right-0 z-40 bg-[#06080c]/95 backdrop-blur-md border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          {selected ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">
                  Selected
                </p>
                <p className="text-white font-black text-sm truncate tracking-tight">
                  {selected.teamName}
                </p>
              </div>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] disabled:bg-white/[0.04] disabled:text-white/30 disabled:bg-none font-black text-[13px] px-5 py-3 rounded-lg hover:brightness-110 transition-all flex items-center gap-1.5 tracking-wide uppercase"
              >
                {joining ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    Join ·{" "}
                    {contest.entryFee === 0 ? "FREE" : `₹${contest.entryFee}`}
                    <ChevronRight size={15} strokeWidth={3} />
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={goCreate}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] font-black text-[13px] px-6 py-3.5 rounded-lg hover:brightness-110 transition-all tracking-wide uppercase"
            >
              <Plus size={16} strokeWidth={3} />
              {teams.length === 0
                ? "Create Team to Continue"
                : "Create Another Team"}
            </button>
          )}
        </div>
      </div>
    </FantasyShell>
  );
}

function RoleCount({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-white/25 font-black text-[9px] tracking-wide">
        {label}
      </span>
      <span className="text-white font-black text-[11px]">{count}</span>
    </div>
  );
}
