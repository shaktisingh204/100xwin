"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Crown,
  Loader2,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import FantasyShell from "@/components/fantasy/FantasyShell";
import CricketField, {
  CricketFieldTeam,
  FieldPlayer,
} from "@/components/fantasy/CricketField";

interface DraftPlayer {
  playerId: number;
  name: string;
  role: string;
  teamId: number;
  teamName: string;
  credit: number;
  image?: string;
}

interface Contest {
  _id: string;
  title: string;
  entryFee: number;
  totalPrize: number;
  maxSpots: number;
  filledSpots: number;
  prizeBreakdown: Array<{ rankFrom: number; rankTo: number; prize: number }>;
}

const STEPS = [
  { n: 1, label: "Contest" },
  { n: 2, label: "Team" },
  { n: 3, label: "C & VC" },
  { n: 4, label: "Preview" },
];

const ROLE_LABEL: Record<string, string> = {
  keeper: "WK",
  batsman: "BAT",
  allrounder: "AR",
  bowler: "BOWL",
};

export default function TeamPreviewCreatePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const contestId = search.get("contestId") || "";
  const { user, loading: authLoading } = useAuth();

  const [draft, setDraft] = useState<DraftPlayer[]>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<number | null>(null);
  const [teamA, setTeamA] = useState<CricketFieldTeam | null>(null);
  const [teamB, setTeamB] = useState<CricketFieldTeam | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!id) return;
    const rawDraft = sessionStorage.getItem(`fantasy:draft:${id}`);
    const rawCaps = sessionStorage.getItem(`fantasy:captains:${id}`);
    if (!rawDraft || !rawCaps) {
      router.replace(
        contestId
          ? `/fantasy/match/${id}/create?contestId=${contestId}`
          : `/fantasy/match/${id}/create`,
      );
      return;
    }
    try {
      setDraft(JSON.parse(rawDraft));
      const caps = JSON.parse(rawCaps);
      setCaptainId(caps.captainId || null);
      setViceCaptainId(caps.viceCaptainId || null);
    } catch {
      router.replace(`/fantasy/match/${id}/create`);
    }
  }, [id, contestId, router]);

  const fetchExtras = useCallback(async () => {
    if (!id) return;
    try {
      const [squadsRes, contestsRes] = await Promise.all([
        api.get(`/fantasy/matches/${id}/squads`),
        contestId
          ? api.get(`/fantasy/matches/${id}/contests`).catch(() => null)
          : Promise.resolve(null),
      ]);
      setTeamA(squadsRes.data?.teamA || null);
      setTeamB(squadsRes.data?.teamB || null);
      if (contestsRes) {
        const found = (contestsRes.data || []).find(
          (c: Contest) => c._id === contestId,
        );
        if (found) setContest(found);
      }
    } catch {
      /* ignore */
    }
  }, [id, contestId]);

  useEffect(() => {
    if (!authLoading && user) fetchExtras();
  }, [authLoading, user, fetchExtras]);

  const fieldPlayers: FieldPlayer[] = useMemo(
    () =>
      draft.map((p) => ({
        playerId: p.playerId,
        name: p.name,
        role: p.role,
        teamId: p.teamId,
        credit: p.credit,
        image: p.image,
        isCaptain: p.playerId === captainId,
        isViceCaptain: p.playerId === viceCaptainId,
      })),
    [draft, captainId, viceCaptainId],
  );

  const totals = useMemo(() => {
    const teamACount = teamA ? draft.filter((p) => p.teamId === teamA.id).length : 0;
    const teamBCount = teamB ? draft.filter((p) => p.teamId === teamB.id).length : 0;
    const roleCounts: Record<string, number> = {};
    for (const p of draft) roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
    const formation = `${roleCounts.keeper || 0}-${roleCounts.batsman || 0}-${
      roleCounts.allrounder || 0
    }-${roleCounts.bowler || 0}`;
    const creditsUsed = draft.reduce((sum, p) => sum + (p.credit || 0), 0);
    return { teamACount, teamBCount, roleCounts, formation, creditsUsed };
  }, [draft, teamA, teamB]);

  const captain = draft.find((p) => p.playerId === captainId);
  const viceCaptain = draft.find((p) => p.playerId === viceCaptainId);

  const handleConfirm = async () => {
    if (!captainId || !viceCaptainId) return;
    setSubmitting(true);
    setErr("");
    try {
      const players = draft.map((p) => ({
        playerId: Number(p.playerId),
        name: String(p.name),
        role: String(p.role),
        teamId: Number(p.teamId),
        credit: Number(p.credit),
        isCaptain: p.playerId === captainId,
        isViceCaptain: p.playerId === viceCaptainId,
      }));
      const res = await api.post("/fantasy/teams", {
        matchId: Number(id),
        players,
      });
      const newTeamId = res.data?._id;

      if (contestId && newTeamId) {
        try {
          await api.post("/fantasy/join-contest", {
            contestId,
            teamId: newTeamId,
            matchId: Number(id),
          });
        } catch (e: any) {
          setErr(
            e?.response?.data?.message ||
              "Team saved but could not join contest.",
          );
          setSubmitting(false);
          return;
        }
      }

      sessionStorage.removeItem(`fantasy:draft:${id}`);
      sessionStorage.removeItem(`fantasy:captains:${id}`);
      router.replace(`/fantasy/match/${id}`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to save team");
      setSubmitting(false);
    }
  };

  if (authLoading || !user || draft.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[var(--ink-faint)] text-sm">
        Loading...
      </div>
    );
  }

  const teamAColor = teamA?.color || "var(--gold)";
  const teamBColor = teamB?.color || "var(--ice)";
  const creditsOver = totals.creditsUsed > 100;

  return (
    <FantasyShell
      title="Team Preview"
      subtitle={
        contestId ? "Step 4 of 4 - Review & join contest" : "Review and save your team"
      }
      backHref={
        contestId
          ? `/fantasy/match/${id}/create/captain?contestId=${contestId}`
          : `/fantasy/match/${id}/create/captain`
      }
      hideSubNav
    >
      <div className="pb-[120px] md:pb-[100px]">
        {contestId && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em]">
              {STEPS.map((s, i) => {
                const active = s.n === 4;
                const done = s.n < 4;
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

        {/* Team split strip */}
        {teamA && teamB && (
          <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-3 mb-3">
            <div className="flex items-center justify-between t-eyebrow !text-[10px] mb-2">
              <span>Team split</span>
              <span className="!text-[var(--ink-faint)]">
                <span className="num">{draft.length}</span> players
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="w-2 h-8 rounded-full"
                  style={{ background: teamAColor }}
                />
                <div>
                  <p className="font-display text-[var(--ink)] font-extrabold text-sm tracking-tight">
                    {teamA.short}
                  </p>
                  <p className="num text-[var(--ink-faint)] text-[10px] font-bold">
                    {totals.teamACount} players
                  </p>
                </div>
              </div>
              <div className="flex-1 h-3 bg-[var(--ink-ghost)] rounded-full overflow-hidden flex">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(totals.teamACount / 11) * 100}%`,
                    background: teamAColor,
                  }}
                />
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(totals.teamBCount / 11) * 100}%`,
                    background: teamBColor,
                  }}
                />
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                <div className="text-right">
                  <p className="font-display text-[var(--ink)] font-extrabold text-sm tracking-tight">
                    {teamB.short}
                  </p>
                  <p className="num text-[var(--ink-faint)] text-[10px] font-bold">
                    {totals.teamBCount} players
                  </p>
                </div>
                <span
                  className="w-2 h-8 rounded-full"
                  style={{ background: teamBColor }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Cricket ground preview */}
        <div className="mb-3">
          <CricketField
            players={fieldPlayers}
            teamA={teamA || undefined}
            teamB={teamB || undefined}
          />
        </div>

        {/* Credits used */}
        <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-3 mb-3">
          <div className="flex items-center justify-between t-eyebrow !text-[10px] mb-2">
            <span>Credits Used</span>
            <span
              className={`num ${
                creditsOver ? "!text-[var(--crimson)]" : "!text-[var(--ink-faint)]"
              }`}
            >
              {totals.creditsUsed.toFixed(1)} / 100
            </span>
          </div>
          <div className="h-2 bg-[var(--ink-ghost)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                creditsOver ? "bg-[var(--crimson)]" : "bg-[var(--emerald)]"
              }`}
              style={{
                width: `${Math.min((totals.creditsUsed / 100) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Formation + role breakdown */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          {(["keeper", "batsman", "allrounder", "bowler"] as const).map((r) => {
            const count = totals.roleCounts[r] || 0;
            const pct = Math.min((count / 8) * 100, 100);
            return (
              <div
                key={r}
                className="rounded-[12px] border border-[var(--line-default)] bg-[var(--bg-surface)] px-2 py-2 text-center"
              >
                <p className="t-eyebrow !text-[9px]">{ROLE_LABEL[r]}</p>
                <p className="num font-display text-[var(--ink)] font-extrabold text-lg tracking-tight">
                  {count}
                </p>
                <div className="h-1 bg-[var(--ink-ghost)] rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-[var(--gold)] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="rounded-[12px] border border-[var(--line-gold)] bg-[var(--gold-soft)] px-2 py-2 text-center">
            <p className="t-eyebrow !text-[9px] !text-[var(--gold-bright)]">XI</p>
            <p className="num font-display text-[var(--gold-bright)] font-extrabold text-lg tracking-tight">
              {totals.formation}
            </p>
          </div>
        </div>

        {/* Captain + Vice captain cards */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-[14px] border border-[var(--line-gold)] bg-[var(--gold-soft)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Crown size={14} className="text-[var(--gold-bright)]" />
              <p className="t-eyebrow !text-[9px] !text-[var(--gold-bright)]">Captain</p>
              <span className="num ml-auto text-[9px] font-extrabold bg-[var(--gold)] text-[var(--bg-base)] px-1.5 py-[1px] rounded tracking-wide">
                2x
              </span>
            </div>
            <p className="font-display text-[var(--ink)] font-extrabold text-sm truncate tracking-tight">
              {captain?.name || "-"}
            </p>
            <p className="text-[var(--ink-faint)] text-[10px] font-bold capitalize mt-0.5">
              {captain?.role} - {captain?.teamName}
            </p>
          </div>
          <div className="rounded-[14px] border border-[var(--ice)]/25 bg-[var(--ice-soft)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Star size={14} className="text-[var(--ice)]" />
              <p className="t-eyebrow !text-[9px] !text-[var(--ice)]">Vice Captain</p>
              <span className="num ml-auto text-[9px] font-extrabold bg-[var(--ice)] text-[var(--bg-base)] px-1.5 py-[1px] rounded tracking-wide">
                1.5x
              </span>
            </div>
            <p className="font-display text-[var(--ink)] font-extrabold text-sm truncate tracking-tight">
              {viceCaptain?.name || "-"}
            </p>
            <p className="text-[var(--ink-faint)] text-[10px] font-bold capitalize mt-0.5">
              {viceCaptain?.role} - {viceCaptain?.teamName}
            </p>
          </div>
        </div>

        {/* Contest summary (if joining) */}
        {contest && (
          <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 mb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="t-eyebrow !text-[9px]">Joining contest</p>
                <p className="font-display text-[var(--ink)] font-extrabold text-sm truncate tracking-tight">
                  {contest.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-[var(--ink-dim)]">
                  <span className="inline-flex items-center gap-1 text-[var(--gold-bright)]">
                    <Trophy size={10} />
                    <span className="num">
                      ₹{contest.totalPrize.toLocaleString("en-IN")}
                    </span>
                  </span>
                  <span className="text-[var(--ink-whisper)]">·</span>
                  <span className="inline-flex items-center gap-1 text-[var(--ink-dim)]">
                    <Users size={10} />
                    <span className="num">
                      {contest.maxSpots - contest.filledSpots}
                    </span>{" "}
                    spots left
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="t-eyebrow !text-[9px]">Entry</p>
                <p className="num font-display text-[var(--gold-bright)] font-extrabold text-2xl tracking-tight">
                  {contest.entryFee === 0 ? "FREE" : `₹${contest.entryFee}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {err && <p className="text-[var(--crimson)] font-bold text-sm mb-2">{err}</p>}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-[64px] md:bottom-0 left-0 right-0 z-40 glass border-t border-[var(--line-default)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="t-eyebrow !text-[9px]">Squad Size</p>
            <p className="num font-extrabold text-sm tracking-tight text-[var(--ink)]">
              {draft.length} / 11 - {totals.formation}
            </p>
          </div>
          <button
            disabled={submitting || !captainId || !viceCaptainId}
            onClick={handleConfirm}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 btn btn-gold sweep min-h-[48px] px-6 text-sm uppercase tracking-[0.08em] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : contest ? (
              <>
                Join Contest
                {contest.entryFee > 0 ? (
                  <>
                    {" "}
                    -<span className="num">₹{contest.entryFee}</span>
                  </>
                ) : (
                  " - FREE"
                )}
                <ChevronRight size={16} strokeWidth={3} />
              </>
            ) : (
              <>
                Save Team
                <Check size={16} strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      </div>
    </FantasyShell>
  );
}
