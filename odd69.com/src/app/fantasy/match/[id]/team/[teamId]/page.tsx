"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Crown, Star, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import FantasyShell from "@/components/fantasy/FantasyShell";
import CricketField, { FieldPlayer } from "@/components/fantasy/CricketField";

export default function TeamPreviewPage() {
  const router = useRouter();
  const { id, teamId } = useParams<{ id: string; teamId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [teamA, setTeamA] = useState<any>(null);
  const [teamB, setTeamB] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!id || !teamId) return;
    (async () => {
      try {
        const [teamsRes, squadsRes] = await Promise.all([
          api.get(`/fantasy/my-teams/${id}`),
          api.get(`/fantasy/matches/${id}/squads`),
        ]);
        const found = (teamsRes.data || []).find((t: any) => t._id === teamId);
        setTeam(found || null);
        setTeamA(squadsRes.data?.teamA);
        setTeamB(squadsRes.data?.teamB);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [id, teamId]);

  if (authLoading || loading) {
    return (
      <FantasyShell>
        <div className="min-h-[60vh] flex items-center justify-center text-[var(--ink-faint)] text-sm">
          Loading...
        </div>
      </FantasyShell>
    );
  }

  if (!team) {
    return (
      <FantasyShell title="Team" backHref={`/fantasy/match/${id}`}>
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-8 text-center">
            <p className="font-display text-[var(--ink)] font-extrabold mb-2 tracking-tight">
              Team not found
            </p>
            <button
              onClick={() => router.back()}
              className="text-[var(--gold-bright)] font-bold text-sm uppercase tracking-[0.08em]"
            >
              ← Go back
            </button>
          </div>
        </div>
      </FantasyShell>
    );
  }

  const fieldPlayers: FieldPlayer[] = (team.players || []).map((p: any) => ({
    playerId: p.playerId,
    name: p.name,
    role: p.role,
    teamId: p.teamId,
    credit: p.credit,
    isCaptain: p.isCaptain,
    isViceCaptain: p.isViceCaptain,
  }));

  const roleCounts: Record<string, number> = {};
  for (const p of team.players || [])
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;

  const captain = team.players?.find((p: any) => p.isCaptain);
  const viceCaptain = team.players?.find((p: any) => p.isViceCaptain);

  const subtitle = `${team.players?.length || 0} players · formation ${
    roleCounts.keeper || 0
  }-${roleCounts.batsman || 0}-${roleCounts.allrounder || 0}-${
    roleCounts.bowler || 0
  }`;

  return (
    <FantasyShell
      title={team.teamName}
      subtitle={subtitle}
      backHref={`/fantasy/match/${id}`}
      rightSlot={
        <Link
          prefetch
          href={`/fantasy/match/${id}/create`}
          className="px-4 min-h-[40px] inline-flex items-center rounded-md bg-[var(--bg-elevated)] border border-[var(--line-default)] text-[var(--ink-dim)] hover:bg-[var(--bg-raised)] hover:text-[var(--ink)] font-bold text-[11px] uppercase tracking-[0.08em] transition-colors"
        >
          Edit
        </Link>
      }
    >
      {/* Role count strip */}
      <div className="bg-[var(--bg-elevated)] border-b border-[var(--line)] py-2.5">
        <div className="max-w-3xl mx-auto px-3 flex items-center justify-around">
          <RoleStat label="WK" count={roleCounts.keeper || 0} />
          <RoleStat label="BAT" count={roleCounts.batsman || 0} />
          <RoleStat label="AR" count={roleCounts.allrounder || 0} />
          <RoleStat label="BOWL" count={roleCounts.bowler || 0} />
        </div>
      </div>

      {/* Cricket field */}
      <div className="px-3 pt-4 pb-6 max-w-3xl mx-auto">
        <CricketField
          players={fieldPlayers}
          teamA={teamA}
          teamB={teamB}
          showCredits
        />
      </div>

      {/* Bottom info cards */}
      <div className="bg-[var(--bg-surface)] border-t border-[var(--line-default)] rounded-t-3xl min-h-[40vh] pb-10">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="rounded-[14px] border border-[var(--line-gold)] bg-[var(--gold-soft)] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Crown size={13} className="text-[var(--gold-bright)]" />
                <p className="t-eyebrow !text-[9px] !text-[var(--gold-bright)]">
                  Captain
                </p>
                <span className="num ml-auto text-[9px] font-extrabold bg-[var(--gold)] text-[var(--bg-base)] px-1.5 py-[1px] rounded tracking-wide">
                  2x
                </span>
              </div>
              <p className="font-display text-[var(--ink)] font-extrabold text-sm truncate tracking-tight">
                {captain?.name || "—"}
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--ice)]/25 bg-[var(--ice-soft)] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Star size={13} className="text-[var(--ice)]" />
                <p className="t-eyebrow !text-[9px] !text-[var(--ice)]">
                  Vice Captain
                </p>
                <span className="num ml-auto text-[9px] font-extrabold bg-[var(--ice)] text-[var(--bg-base)] px-1.5 py-[1px] rounded tracking-wide">
                  1.5x
                </span>
              </div>
              <p className="font-display text-[var(--ink)] font-extrabold text-sm truncate tracking-tight">
                {viceCaptain?.name || "—"}
              </p>
            </div>
          </div>

          {/* Player list */}
          <h3 className="font-display text-[var(--ink)] font-extrabold text-base mb-2 tracking-tight">
            Squad Details
          </h3>
          <div className="divide-y divide-[var(--line)]">
            {(team.players || []).map((p: any) => {
              const teamShort =
                p.teamId === teamA?.id ? teamA?.short : teamB?.short;
              return (
                <div key={p.playerId} className="flex items-center gap-3 py-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] border border-[var(--line-default)] flex items-center justify-center overflow-hidden shrink-0">
                    <Users size={15} className="text-[var(--ink-faint)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-display text-[var(--ink)] font-extrabold text-[13px] truncate tracking-tight">
                        {p.name}
                      </p>
                      {p.isCaptain && (
                        <span className="num text-[8px] font-extrabold text-[var(--bg-base)] bg-[var(--gold)] px-1.5 py-px rounded tracking-wide">
                          C · 2x
                        </span>
                      )}
                      {p.isViceCaptain && (
                        <span className="num text-[8px] font-extrabold text-[var(--bg-base)] bg-[var(--ice)] px-1.5 py-px rounded tracking-wide">
                          VC · 1.5x
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--ink-faint)] text-[10px] font-bold capitalize mt-0.5">
                      {p.role} · {teamShort || "—"}
                    </p>
                  </div>
                  {p.credit != null && (
                    <span className="num text-[var(--gold-bright)] font-extrabold text-[12px] shrink-0">
                      {Number(p.credit).toFixed(1)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FantasyShell>
  );
}

function RoleStat({ label, count }: { label: string; count: number | string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="t-eyebrow !text-[9px]">{label}</span>
      <span className="num text-sm font-extrabold text-[var(--ink)] tracking-tight">
        {count}
      </span>
    </div>
  );
}
