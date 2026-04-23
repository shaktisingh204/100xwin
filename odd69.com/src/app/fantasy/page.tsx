"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Circle,
  Clock,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

// ════════════════════════════════════════════════════════════════════════════
// TYPES (EntitySport status: 1=Upcoming, 2=Result, 3=Live, 4=Cancelled)
// ════════════════════════════════════════════════════════════════════════════

interface FantasyMatch {
  _id: string;
  externalMatchId: number;
  title: string;
  shortTitle?: string;
  competitionTitle: string;
  format: string;
  teamA: { id: number; name: string; short: string; logo: string; thumb?: string; color: string };
  teamB: { id: number; name: string; short: string; logo: string; thumb?: string; color: string };
  startDate: string;
  status: number;
  venue: string;
  scoreA: any;
  scoreB: any;
  playing11Announced?: boolean;
  isManaged?: boolean;
}

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "Live" },
  { id: "completed", label: "Completed" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const UPCOMING_SUBTABS = [
  { id: "managed", label: "Pre-Squad", desc: "Credits locked" },
  { id: "all", label: "All Upcoming" },
] as const;
type UpcomingSubTab = (typeof UPCOMING_SUBTABS)[number]["id"];

const AUTO_REFRESH_MS = 5 * 60 * 1000;

// ════════════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════════════

export default function FantasyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<TabId>("upcoming");
  const [upcomingSubTab, setUpcomingSubTab] = useState<UpcomingSubTab>("managed");
  const [matches, setMatches] = useState<FantasyMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoadingMatches(true);
    try {
      const statusMap: Record<TabId, number> = { upcoming: 1, live: 3, completed: 2 };
      const params: Record<string, any> = { status: statusMap[tab], limit: 50 };
      if (tab === "upcoming" && upcomingSubTab === "managed") {
        params.managed = true;
      }
      const matchRes = await api.get("/fantasy/matches", { params }).catch(() => null);
      setMatches(matchRes?.data?.matches || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingMatches(false);
    }
  }, [tab, upcomingSubTab]);

  useEffect(() => {
    if (!authLoading && user) fetchData(false);
  }, [authLoading, user, fetchData]);

  useEffect(() => {
    if (!authLoading && user) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => fetchData(true), AUTO_REFRESH_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [authLoading, user, fetchData]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  const liveCount = matches.filter((m) => m.status === 3).length;
  const upcomingCount = matches.filter((m) => m.status === 1).length;

  return (
    <FantasyShell title="Fantasy Cricket" subtitle="Pick. Play. Win real cash.">
      {/* ──────────────────────────────────────────────────────────────── */}
      {/* HERO / PRIZE POOL BANNER                                         */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <div
          className="relative grain overflow-hidden rounded-[22px] border border-[var(--line-gold)] p-5 md:p-7"
          style={{
            background:
              "radial-gradient(ellipse 90% 100% at 0% 0%, rgba(245,183,10,0.22) 0%, rgba(245,183,10,0.02) 60%), linear-gradient(180deg, var(--bg-surface), var(--bg-base))",
          }}
        >
          <div className="absolute inset-0 dotgrid opacity-25" />
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="absolute -right-10 bottom-0 opacity-[0.06]">
            <Trophy size={180} className="text-[var(--gold-bright)]" />
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="chip chip-gold">
                <Sparkles size={10} /> Mega prize pool
              </span>
              <span className="chip chip-emerald">
                <Circle size={6} fill="currentColor" className="animate-live-dot" />
                <span className="num">{upcomingCount}</span> open
              </span>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-[42px] leading-[0.95] tracking-[-0.035em] text-[var(--ink)]">
              Win up to{" "}
              <span className="num text-gold-grad">₹5,00,000</span>
            </h2>
            <p className="text-[13px] text-[var(--ink-faint)] mt-3 leading-relaxed max-w-md">
              Build your XI, lock the captain, out-score the room. New contests
              drop every match day — guaranteed payouts, instant withdrawals.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                href="#contests"
                className="btn btn-gold sweep h-10 uppercase tracking-[0.08em] text-[11px]"
              >
                Join contest <ArrowRight size={13} strokeWidth={3} />
              </Link>
              <Link
                href="/fantasy/leaderboard"
                className="btn btn-ghost h-10 uppercase tracking-[0.08em] text-[11px]"
              >
                <Crown size={13} /> Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* STATS RIBBON                                                      */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 stagger">
          {[
            {
              icon: <Users size={13} className="text-[var(--ice)]" />,
              label: "Players today",
              value: "42,180",
              chip: "chip-ice",
            },
            {
              icon: <Trophy size={13} className="text-[var(--gold)]" />,
              label: "Paid out",
              value: "₹1.8Cr",
              chip: "chip-gold",
            },
            {
              icon: <Activity size={13} className="text-[var(--emerald)]" />,
              label: "Live contests",
              value: String(liveCount),
              chip: "chip-emerald",
            },
            {
              icon: <Zap size={13} className="text-[var(--violet)]" />,
              label: "Avg. payout",
              value: "92s",
              chip: "chip-violet",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-3 flex items-center gap-2.5"
            >
              <div className="grid place-items-center w-8 h-8 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--line-default)]">
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="t-eyebrow !text-[9px]">{s.label}</p>
                <p className="num text-[15px] font-bold text-[var(--ink)] tracking-tight leading-tight mt-0.5">
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* MAIN TABS                                                         */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section id="contests" className="mb-3">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="rail-gold">
            <span className="t-eyebrow">Contests</span>
            <h2 className="t-section mt-1">Match lobby</h2>
            <p className="t-section-sub">
              Filter by stage — {tab === "live" ? "matches in play" : tab === "upcoming" ? "locks open" : "results in"}
            </p>
          </div>
          <Link href="/fantasy/history" className="chip chip-gold !py-1.5 !px-3">
            My matches <ArrowRight size={10} />
          </Link>
        </div>

        <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] px-1 flex items-center mb-3 overflow-hidden">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 text-[12px] font-bold py-3 transition-all relative uppercase tracking-[0.08em] ${
                  active
                    ? "text-[var(--gold-bright)]"
                    : "text-[var(--ink-faint)] hover:text-[var(--ink)]"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {t.id === "live" && (
                    <Circle
                      size={6}
                      fill="currentColor"
                      className={active ? "animate-live-dot text-[var(--crimson)]" : ""}
                    />
                  )}
                  {t.label}
                </span>
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

        {/* Sub-tabs — upcoming only */}
        {tab === "upcoming" && (
          <div className="flex gap-2 mb-4">
            {UPCOMING_SUBTABS.map((st) => {
              const active = upcomingSubTab === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setUpcomingSubTab(st.id)}
                  className={`flex-1 py-2.5 rounded-[10px] border text-[11px] font-bold transition-all uppercase tracking-[0.08em] ${
                    active
                      ? "bg-[var(--gold-soft)] border-[var(--line-gold)] text-[var(--gold-bright)]"
                      : "bg-[var(--bg-surface)] border-[var(--line-default)] text-[var(--ink-faint)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                  }`}
                >
                  {st.id === "managed" && (
                    <ShieldCheck size={11} className="inline-block mr-1.5 mb-0.5" />
                  )}
                  {st.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* MATCH LIST / SKELETON / EMPTY                                     */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {loadingMatches ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchSkeleton key={i} />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <EmptyState tab={tab} upcomingSubTab={upcomingSubTab} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger">
          {matches.map((m) => (
            <MatchCard key={m._id} match={m} />
          ))}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* LEADERBOARD TEASER                                                */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="mb-4 rail-gold">
          <span className="t-eyebrow">This week</span>
          <h2 className="t-section mt-1">Top captains</h2>
          <p className="t-section-sub">Leaderboard resets every Sunday 23:59 IST</p>
        </div>

        <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
          {[
            { rank: 1, user: "sur***42", score: "9,124", prize: "₹1,00,000", chip: "chip-gold" },
            { rank: 2, user: "pri***08", score: "8,902", prize: "₹50,000", chip: "chip-violet" },
            { rank: 3, user: "vik***55", score: "8,781", prize: "₹25,000", chip: "chip-ice" },
            { rank: 4, user: "anu***17", score: "8,640", prize: "₹10,000", chip: "chip" },
            { rank: 5, user: "kar***94", score: "8,512", prize: "₹5,000", chip: "chip" },
          ].map((row, i, arr) => (
            <div
              key={row.rank}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < arr.length - 1 ? "border-b border-[var(--line)]" : ""
              } hover:bg-[var(--bg-elevated)] transition-colors`}
            >
              <span className={`chip ${row.chip} w-10 justify-center !py-1`}>
                <span className="num">#{row.rank}</span>
              </span>
              <div className="grid place-items-center w-8 h-8 rounded-full bg-gradient-to-br from-[var(--violet)]/40 to-[var(--gold)]/30 text-[9px] font-extrabold text-[var(--ink)]">
                {row.user.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[12px] font-semibold text-[var(--ink-dim)] flex-1 truncate">
                {row.user}
              </span>
              <span className="num text-[12px] font-bold text-[var(--ink)] tabular-nums">
                {row.score}
              </span>
              <span className="num text-[12px] font-extrabold text-[var(--gold-bright)] w-20 text-right">
                {row.prize}
              </span>
            </div>
          ))}
          <Link
            href="/fantasy/leaderboard"
            className="flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--gold-bright)] hover:bg-[var(--bg-elevated)] border-t border-[var(--line-default)] transition-colors"
          >
            See full leaderboard <ArrowRight size={11} strokeWidth={3} />
          </Link>
        </div>
      </section>
    </FantasyShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MATCH CARD
// ════════════════════════════════════════════════════════════════════════════

function MatchCard({ match }: { match: FantasyMatch }) {
  const startDate = new Date(match.startDate);
  const now = Date.now();
  const diffMs = startDate.getTime() - now;

  const isLive = match.status === 3;
  const isCompleted = match.status === 2;
  const isUpcoming = match.status === 1;

  const countdown = useMemo(() => {
    if (!isUpcoming || diffMs <= 0) return null;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ${mins % 60}m`;
    const days = Math.floor(hrs / 24);
    return `${days}d ${hrs % 24}h`;
  }, [diffMs, isUpcoming]);

  const dateStr = startDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const scoreAStr =
    match.scoreA && typeof match.scoreA === "object"
      ? match.scoreA.scores_full || match.scoreA.scores || ""
      : "";
  const scoreBStr =
    match.scoreB && typeof match.scoreB === "object"
      ? match.scoreB.scores_full || match.scoreB.scores || ""
      : "";

  return (
    <Link
      href={`/fantasy/match/${match.externalMatchId}`}
      className="group block rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-gold)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] gap-2">
        <span className="t-eyebrow !text-[9px] truncate flex-1">
          {match.competitionTitle || match.format}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {match.isManaged && isUpcoming && (
            <span className="chip chip-violet !py-0.5 !px-2 !text-[8.5px]">
              <ShieldCheck size={8} /> Pre-Squad
            </span>
          )}
          {match.playing11Announced && isUpcoming && (
            <span className="chip chip-emerald !py-0.5 !px-2 !text-[8.5px]">
              <Circle size={5} fill="currentColor" /> Lineups
            </span>
          )}
          {isLive && (
            <span className="chip chip-crimson !py-0.5 !px-2 !text-[8.5px]">
              <Circle size={5} fill="currentColor" className="animate-live-dot" /> Live
            </span>
          )}
          {isCompleted && (
            <span className="chip !py-0.5 !px-2 !text-[8.5px]">Result</span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <TeamAvatar team={match.teamA} />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-bold text-[var(--ink)] truncate tracking-tight">
                {match.teamA.short}
              </p>
              {scoreAStr && (
                <p className="num text-[11px] font-semibold text-[var(--ink-faint)] truncate mt-0.5">
                  {scoreAStr}
                </p>
              )}
            </div>
          </div>

          {/* Center countdown / status */}
          <div className="flex flex-col items-center shrink-0 px-3">
            {isUpcoming && countdown ? (
              <>
                <span className="t-eyebrow !text-[8.5px]">Starts in</span>
                <span className="num text-[15px] font-extrabold text-[var(--gold-bright)] mt-0.5">
                  {countdown}
                </span>
              </>
            ) : isLive ? (
              <>
                <span className="t-eyebrow !text-[8.5px] !text-[var(--crimson)]">
                  In play
                </span>
                <Clock
                  size={16}
                  className="text-[var(--crimson)] mt-0.5 animate-live-dot"
                  strokeWidth={2.5}
                />
              </>
            ) : (
              <>
                <span className="t-eyebrow !text-[8.5px]">VS</span>
                <span className="num text-[11px] font-semibold text-[var(--ink-faint)] mt-0.5">
                  {dateStr}
                </span>
              </>
            )}
          </div>

          {/* Team B */}
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <p className="font-display text-[15px] font-bold text-[var(--ink)] truncate tracking-tight">
                {match.teamB.short}
              </p>
              {scoreBStr && (
                <p className="num text-[11px] font-semibold text-[var(--ink-faint)] truncate mt-0.5">
                  {scoreBStr}
                </p>
              )}
            </div>
            <TeamAvatar team={match.teamB} />
          </div>
        </div>
      </div>

      {/* Footer: prize + CTA */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t border-[var(--line)]"
        style={{
          background:
            "linear-gradient(90deg, var(--gold-soft) 0%, rgba(0,0,0,0) 60%)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-7 h-7 rounded-[8px] bg-[var(--gold-soft)] border border-[var(--line-gold)]">
            <Trophy size={12} className="text-[var(--gold-bright)]" />
          </div>
          <div className="leading-none">
            <p className="t-eyebrow !text-[8.5px]">Mega prize</p>
            <p className="num text-[13px] font-extrabold text-[var(--gold-bright)] mt-0.5">
              ₹5,00,000
            </p>
          </div>
        </div>
        <span
          className={`chip !py-1.5 !px-3.5 ${
            isCompleted
              ? "chip"
              : isLive
                ? "chip-crimson"
                : "chip-emerald"
          }`}
        >
          {isCompleted ? "View" : isLive ? "Track" : "Join"}
          <ArrowRight
            size={10}
            strokeWidth={3}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </span>
      </div>
    </Link>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TEAM AVATAR
// ════════════════════════════════════════════════════════════════════════════

function TeamAvatar({ team }: { team: FantasyMatch["teamA"] }) {
  const img = team.thumb || team.logo;
  return (
    <div className="w-11 h-11 rounded-full bg-[var(--bg-elevated)] border border-[var(--line-default)] flex items-center justify-center overflow-hidden shrink-0">
      {img ? (
        <img
          src={img}
          alt={team.short}
          className="w-8 h-8 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            if (
              e.target instanceof HTMLImageElement &&
              e.target.parentElement
            ) {
              e.target.parentElement.innerHTML = `<span class="font-mono font-extrabold text-[10px] text-[var(--ink-dim)]">${team.short}</span>`;
            }
          }}
        />
      ) : (
        <span className="font-mono font-extrabold text-[10px] text-[var(--ink-dim)]">
          {team.short}
        </span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SKELETON
// ════════════════════════════════════════════════════════════════════════════

function MatchSkeleton() {
  return (
    <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-4 w-14 rounded-full" />
      </div>
      <div className="px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="skeleton w-11 h-11 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-2.5 w-10" />
          </div>
        </div>
        <div className="skeleton h-4 w-12" />
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="space-y-2 text-right">
            <div className="skeleton h-3 w-16 ml-auto" />
            <div className="skeleton h-2.5 w-10 ml-auto" />
          </div>
          <div className="skeleton w-11 h-11 rounded-full" />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--line)]">
        <div className="flex items-center gap-2.5">
          <div className="skeleton w-7 h-7 rounded-[8px]" />
          <div className="space-y-1.5">
            <div className="skeleton h-2 w-14" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════

function EmptyState({
  tab,
  upcomingSubTab,
}: {
  tab: TabId;
  upcomingSubTab: UpcomingSubTab;
}) {
  const isManaged = tab === "upcoming" && upcomingSubTab === "managed";
  return (
    <div className="rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-10 md:p-14 text-center">
      <div className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-[var(--gold-soft)] border border-[var(--line-gold)] mb-4">
        <Trophy size={24} className="text-[var(--gold-bright)]" />
      </div>
      <p className="font-display font-bold text-[15px] text-[var(--ink)] tracking-tight mb-1.5">
        {isManaged ? "No pre-squad matches yet" : `No ${tab} matches`}
      </p>
      <p className="text-[12px] text-[var(--ink-faint)] max-w-sm mx-auto leading-relaxed">
        {isManaged
          ? "Pre-squad matches have locked player credits. Check All Upcoming for the full slate."
          : "Check back soon for new fixtures — new contests drop every match day."}
      </p>
      {isManaged && (
        <button
          className="mt-5 btn btn-ghost h-9 uppercase tracking-[0.08em] text-[11px]"
          onClick={() =>
            (document.activeElement as HTMLElement | null)?.blur()
          }
        >
          See all upcoming
        </button>
      )}
    </div>
  );
}
