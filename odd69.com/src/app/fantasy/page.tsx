"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

// EntitySport status codes: 1=Upcoming, 2=Result, 3=Live, 4=Cancelled
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

// Sub-tabs within Upcoming
const UPCOMING_SUBTABS = [
  { id: "managed", label: "Pre-Squad", desc: "Credits locked" },
  { id: "all", label: "All Upcoming" },
] as const;
type UpcomingSubTab = (typeof UPCOMING_SUBTABS)[number]["id"];

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

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
      // EntitySport status: 1=Upcoming, 2=Result, 3=Live, 4=Cancelled
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

  // Fetch on tab / sub-tab change
  useEffect(() => {
    if (!authLoading && user) {
      fetchData(false);
    }
  }, [authLoading, user, fetchData]);

  // Auto-refresh every 5 minutes
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
      <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <FantasyShell
      title="Fantasy Cricket"
      subtitle="Pick. Play. Win real cash."
    >
      {/* Main tabs: Upcoming / Live / Completed */}
      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] px-1 flex items-center mb-3 overflow-hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-[13px] font-black py-3 transition-all relative ${
              tab === t.id ? "text-amber-400" : "text-white/50 hover:text-white"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-amber-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Sub-tabs for Upcoming only */}
      {tab === "upcoming" && (
        <div className="flex gap-2 mb-4">
          {UPCOMING_SUBTABS.map((st) => (
            <button
              key={st.id}
              onClick={() => setUpcomingSubTab(st.id)}
              className={`flex-1 py-2 rounded-lg border text-[12px] font-black transition-all ${
                upcomingSubTab === st.id
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                  : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:border-amber-500/30 hover:text-white/70"
              }`}
            >
              {st.id === "managed" && (
                <ShieldCheck size={11} className="inline-block mr-1 mb-0.5" />
              )}
              {st.label}
            </button>
          ))}
        </div>
      )}

      {loadingMatches ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
            <span className="text-3xl">🏏</span>
          </div>
          <p className="text-white font-black text-sm mb-1">
            {tab === "upcoming" && upcomingSubTab === "managed"
              ? "No pre-squad matches yet"
              : `No ${tab} matches`}
          </p>
          <p className="text-white/50 text-xs">
            {tab === "upcoming" && upcomingSubTab === "managed"
              ? "Pre-squad matches have locked player credits. Check All Upcoming."
              : "Check back soon for new fixtures."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {matches.map((m) => (
            <MatchCard key={m._id} match={m} />
          ))}
        </div>
      )}
    </FantasyShell>
  );
}

function MatchCard({ match }: { match: FantasyMatch }) {
  const startDate = new Date(match.startDate);
  const now = Date.now();
  const diffMs = startDate.getTime() - now;

  // EntitySport: 1=Upcoming, 2=Result/Completed, 3=Live, 4=Cancelled
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

  const dateStr = startDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

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
      className="block bg-white/[0.02] rounded-xl border border-white/[0.06] hover:border-white/[0.12] hover:shadow-lg hover:shadow-amber-500/10 transition-all overflow-hidden"
    >
      {/* Header: series name + badges */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] gap-2">
        <span className="text-[11px] font-black text-white/50 uppercase tracking-wider truncate flex-1">
          {match.competitionTitle || match.format}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {match.isManaged && isUpcoming && (
            <span className="flex items-center gap-1 text-[9px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
              <ShieldCheck size={8} />
              Pre-Squad
            </span>
          )}
          {match.playing11Announced && isUpcoming && (
            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Lineups Out
            </span>
          )}
          {isLive && (
            <span className="flex items-center gap-1 text-[9px] font-black text-red-300 bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Teams + countdown row */}
      <div className="px-4 py-5">
        <div className="flex items-center justify-between">
          {/* Team A */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <TeamAvatar team={match.teamA} />
            <div className="min-w-0">
              <p className="text-white font-black text-[15px] truncate">
                {match.teamA.short}
              </p>
              {scoreAStr && (
                <p className="text-white/50 text-[11px] font-bold truncate">{scoreAStr}</p>
              )}
            </div>
          </div>

          {/* Center countdown */}
          <div className="flex flex-col items-center shrink-0 px-3">
            {isUpcoming && countdown ? (
              <>
                <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">
                  Starts in
                </span>
                <span className="text-amber-400 font-black text-[15px] mt-0.5">
                  {countdown}
                </span>
              </>
            ) : isLive ? (
              <>
                <span className="text-[9px] font-black text-red-300 uppercase tracking-widest">
                  In Play
                </span>
                <Clock size={16} className="text-red-300 mt-0.5" strokeWidth={2.5} />
              </>
            ) : (
              <>
                <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">
                  VS
                </span>
                <span className="text-white/50 text-[11px] font-bold mt-0.5">{dateStr}</span>
              </>
            )}
          </div>

          {/* Team B */}
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-white font-black text-[15px] truncate">
                {match.teamB.short}
              </p>
              {scoreBStr && (
                <p className="text-white/50 text-[11px] font-bold truncate">{scoreBStr}</p>
              )}
            </div>
            <TeamAvatar team={match.teamB} />
          </div>
        </div>
      </div>

      {/* Footer: mega prize + CTA */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🏆</span>
          <div>
            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest leading-none">
              Mega Prize
            </p>
            <p className="text-amber-400 font-black text-sm leading-tight mt-0.5">₹5 Lakhs</p>
          </div>
        </div>
        <span
          className={`text-[11px] font-black uppercase tracking-wide px-4 py-1.5 rounded-md border ${
            isCompleted
              ? "bg-white/[0.05] text-white/50 border-white/[0.06]"
              : isLive
                ? "bg-red-500/20 text-red-300 border-red-500/30"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          }`}
        >
          {isCompleted ? "View" : isLive ? "Track" : "Join"}
        </span>
      </div>
    </Link>
  );
}

function TeamAvatar({ team }: { team: FantasyMatch["teamA"] }) {
  const img = team.thumb || team.logo;
  return (
    <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
      {img ? (
        <img
          src={img}
          alt={team.short}
          className="w-8 h-8 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            if (e.target instanceof HTMLImageElement && e.target.parentElement) {
              e.target.parentElement.innerHTML = `<span class="text-white/70 font-black text-[10px]">${team.short}</span>`;
            }
          }}
        />
      ) : (
        <span className="text-white/70 font-black text-[10px]">{team.short}</span>
      )}
    </div>
  );
}
