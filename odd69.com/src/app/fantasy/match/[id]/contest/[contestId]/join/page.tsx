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
      <div className="min-h-[60vh] flex items-center justify-center text-[var(--ink-faint)] text-sm">
        Loading...
      </div>
    );
  }

  if (!contest) {
    return (
      <FantasyShell title="Contest" backHref={`/fantasy/match/${id}`} hideSubNav>
        <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-8 text-center">
          <p className="font-display text-[var(--ink)] font-extrabold mb-2 tracking-tight">
            Contest not found
          </p>
          <button
            onClick={() => router.back()}
            className="text-[var(--gold-bright)] hover:text-[var(--gold)] font-bold text-sm uppercase tracking-[0.08em]"
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
        <div className="rounded-[18px] border border-[var(--line-gold)] bg-[var(--gold-soft)] p-4 mb-4 grain">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="t-eyebrow">Prize Pool</p>
              <p className="num font-display text-[var(--gold-bright)] font-extrabold text-2xl tracking-tight">
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
          <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold flex-wrap">
            <span className="inline-flex items-center gap-1 bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[var(--line-gold)] px-2 py-0.5 rounded-md">
              <Trophy size={10} /> 1st{" "}
              <span className="num">
                ₹{(contest.prizeBreakdown[0]?.prize || contest.totalPrize).toLocaleString("en-IN")}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 bg-[var(--bg-surface)] text-[var(--ink-dim)] border border-[var(--line-default)] px-2 py-0.5 rounded-md">
              <Users size={10} />{" "}
              <span className="num">{contest.maxSpots - contest.filledSpots}</span>{" "}
              spots left
            </span>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-3 text-[10px] font-bold uppercase tracking-[0.08em]">
          {[
            { n: 1, label: "Contest", done: true, active: false },
            { n: 2, label: "Team", done: false, active: true },
            { n: 3, label: "C & VC", done: false, active: false },
            { n: 4, label: "Preview", done: false, active: false },
          ].map((s, i) => (
            <div key={s.n} className="flex-1 flex items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className={`num w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    s.done
                      ? "bg-[var(--emerald-soft)] border border-[var(--emerald)]/25 text-[var(--emerald)]"
                      : s.active
                        ? "bg-[var(--gold)] text-[var(--bg-base)]"
                        : "bg-[var(--bg-elevated)] border border-[var(--line-default)] text-[var(--ink-faint)]"
                  }`}
                >
                  {s.done ? <Check size={10} strokeWidth={3} /> : s.n}
                </span>
                <span
                  className={`${
                    s.active
                      ? "text-[var(--ink)]"
                      : s.done
                        ? "text-[var(--emerald)]"
                        : "text-[var(--ink-faint)]"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < 3 && (
                <div className="flex-1 h-[2px] mx-1.5 bg-[var(--ink-ghost)] rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* Team selector */}
        {teams.length === 0 ? (
          <button
            onClick={goCreate}
            className="w-full bg-[var(--bg-surface)] rounded-[16px] border-2 border-dashed border-[var(--line-gold)] hover:border-[var(--gold)] p-8 text-center transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-[var(--gold-soft)] border border-[var(--line-gold)] flex items-center justify-center mx-auto mb-2">
              <Plus size={24} className="text-[var(--gold-bright)]" strokeWidth={2.5} />
            </div>
            <p className="font-display text-[var(--ink)] font-extrabold text-sm tracking-tight">
              Create your first team
            </p>
            <p className="text-[var(--ink-faint)] text-xs mt-0.5">
              Pick 11 players, then choose Captain &amp; Vice Captain
            </p>
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="t-eyebrow">
                My Teams (<span className="num">{teams.length}</span>)
              </p>
              <button
                onClick={goCreate}
                className="inline-flex items-center gap-1 text-[var(--ink-dim)] hover:text-[var(--ink)] text-[11px] font-bold uppercase tracking-[0.08em] min-h-[36px] px-2"
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
                    className={`w-full text-left rounded-[16px] border-2 overflow-hidden transition-all ${
                      isJoined
                        ? "opacity-60 bg-[var(--bg-surface)] border-[var(--line-default)]"
                        : isSelected
                          ? "bg-[var(--gold-soft)] border-[var(--line-gold)]"
                          : "bg-[var(--bg-surface)] border-[var(--line-default)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--line)]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                            isSelected
                              ? "bg-[var(--gold)] border-[var(--gold)]"
                              : "bg-[var(--bg-elevated)] border-[var(--line-strong)]"
                          }`}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              className="text-[var(--bg-base)]"
                              strokeWidth={3}
                            />
                          )}
                        </span>
                        <span className="font-display text-[var(--ink)] font-extrabold text-sm tracking-tight">
                          {t.teamName}
                        </span>
                      </div>
                      {isJoined ? (
                        <span className="chip chip-emerald !text-[9px]">Joined</span>
                      ) : (
                        <span className="chip chip-gold !text-[9px]">
                          <span className="num">{t.players.length}</span> players
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="flex items-center gap-1.5 bg-[var(--gold-soft)] border border-[var(--line-gold)] rounded-[10px] px-2 py-1.5">
                          <Crown size={11} className="text-[var(--gold-bright)]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="t-eyebrow !text-[8px] !text-[var(--gold-bright)] leading-none">
                                Captain
                              </p>
                              <span className="num text-[8px] font-extrabold bg-[var(--gold)] text-[var(--bg-base)] px-1 py-[1px] rounded tracking-wide leading-none">
                                2x
                              </span>
                            </div>
                            <p className="font-display text-[var(--ink)] font-extrabold text-[11px] truncate tracking-tight mt-0.5">
                              {captain?.name || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[var(--ice-soft)] border border-[var(--ice)]/25 rounded-[10px] px-2 py-1.5">
                          <Star size={11} className="text-[var(--ice)]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="t-eyebrow !text-[8px] !text-[var(--ice)] leading-none">
                                Vice Captain
                              </p>
                              <span className="num text-[8px] font-extrabold bg-[var(--ice)] text-[var(--bg-base)] px-1 py-[1px] rounded tracking-wide leading-none">
                                1.5x
                              </span>
                            </div>
                            <p className="font-display text-[var(--ink)] font-extrabold text-[11px] truncate tracking-tight mt-0.5">
                              {viceCaptain?.name || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <RoleCount label="WK" count={roleCounts.keeper || 0} />
                        <RoleCount label="BAT" count={roleCounts.batsman || 0} />
                        <RoleCount label="AR" count={roleCounts.allrounder || 0} />
                        <RoleCount label="BOWL" count={roleCounts.bowler || 0} />
                        <ChevronRight
                          size={14}
                          className="ml-auto text-[var(--ink-whisper)]"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {err && <p className="text-[var(--crimson)] font-bold text-sm mt-3">{err}</p>}
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-[64px] md:bottom-0 left-0 right-0 z-40 glass border-t border-[var(--line-default)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          {selected ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="t-eyebrow !text-[9px]">Selected</p>
                <p className="font-display text-[var(--ink)] font-extrabold text-sm truncate tracking-tight">
                  {selected.teamName}
                </p>
              </div>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="btn btn-gold sweep min-h-[48px] px-5 text-[12px] uppercase tracking-[0.08em] disabled:opacity-50"
              >
                {joining ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    Join ·{" "}
                    {contest.entryFee === 0 ? (
                      "FREE"
                    ) : (
                      <span className="num">₹{contest.entryFee}</span>
                    )}
                    <ChevronRight size={15} strokeWidth={3} />
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={goCreate}
              className="w-full btn btn-gold sweep min-h-[48px] text-[12px] uppercase tracking-[0.08em]"
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
      <span className="text-[var(--ink-whisper)] font-bold text-[9px] tracking-wide">
        {label}
      </span>
      <span className="num text-[var(--ink)] font-extrabold text-[11px]">
        {count}
      </span>
    </div>
  );
}
