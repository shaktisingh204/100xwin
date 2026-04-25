"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronRight, Crown, Star, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

interface DraftPlayer {
  playerId: number;
  name: string;
  role: string;
  teamId: number;
  teamName: string;
  credit: number;
  image?: string;
  battingStyle?: string;
}

const STEPS = [
  { n: 1, label: "Contest" },
  { n: 2, label: "Team" },
  { n: 3, label: "C & VC" },
  { n: 4, label: "Preview" },
];

export default function CaptainSelectionPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const contestId = search.get("contestId") || "";
  const { user, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState<DraftPlayer[]>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<number | null>(null);
  const [teamA, setTeamA] = useState<any>(null);
  const [teamB, setTeamB] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!id) return;
    const stored = sessionStorage.getItem(`fantasy:draft:${id}`);
    if (!stored) {
      router.replace(
        contestId
          ? `/fantasy/match/${id}/create?contestId=${contestId}`
          : `/fantasy/match/${id}/create`,
      );
      return;
    }
    try {
      setDraft(JSON.parse(stored));
    } catch {
      router.replace(`/fantasy/match/${id}/create`);
    }
    api
      .get(`/fantasy/matches/${id}/squads`)
      .then((res) => {
        setTeamA(res.data?.teamA);
        setTeamB(res.data?.teamB);
      })
      .catch(() => {});
  }, [id, contestId, router]);

  const teamACount = useMemo(
    () => (teamA ? draft.filter((p) => p.teamId === teamA?.id).length : 0),
    [draft, teamA],
  );
  const teamBCount = useMemo(
    () => (teamB ? draft.filter((p) => p.teamId === teamB?.id).length : 0),
    [draft, teamB],
  );

  const goPreview = () => {
    if (!captainId || !viceCaptainId) return;
    sessionStorage.setItem(
      `fantasy:captains:${id}`,
      JSON.stringify({ captainId, viceCaptainId }),
    );
    const next = contestId
      ? `/fantasy/match/${id}/create/preview?contestId=${contestId}`
      : `/fantasy/match/${id}/create/preview`;
    router.push(next);
  };

  if (authLoading || !user || draft.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[var(--ink-faint)] text-sm">
        Loading...
      </div>
    );
  }

  return (
    <FantasyShell
      title="Choose Captain & Vice Captain"
      subtitle={
        contestId
          ? "Step 3 of 4 · Tap C then VC"
          : "Tap C then VC for your team leaders"
      }
      backHref={`/fantasy/match/${id}/create${contestId ? `?contestId=${contestId}` : ""}`}
      hideSubNav
    >
      <div className="pb-[140px] md:pb-[100px]">
        {contestId && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em]">
              {STEPS.map((s, i) => {
                const active = s.n === 3;
                const done = s.n < 3;
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

        {/* Captain & VC summary cards */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div
            className={`rounded-[14px] p-3 border-2 transition-all ${
              captainId
                ? "bg-[var(--gold-soft)] border-[var(--line-gold)]"
                : "bg-[var(--bg-surface)] border-[var(--line-default)] border-dashed"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Crown
                size={12}
                className={captainId ? "text-[var(--gold-bright)]" : "text-[var(--ink-faint)]"}
              />
              <p
                className={`t-eyebrow !text-[9px] ${
                  captainId ? "!text-[var(--gold-bright)]" : ""
                }`}
              >
                Captain
              </p>
              <span
                className={`num text-[9px] font-extrabold px-1.5 py-[1px] rounded tracking-wide ml-auto ${
                  captainId
                    ? "bg-[var(--gold)] text-[var(--bg-base)]"
                    : "bg-[var(--bg-elevated)] text-[var(--ink-dim)]"
                }`}
              >
                2x
              </span>
            </div>
            <p
              className={`font-display font-extrabold text-sm mt-0.5 truncate tracking-tight ${
                captainId ? "text-[var(--ink)]" : "text-[var(--ink-dim)]"
              }`}
            >
              {draft.find((p) => p.playerId === captainId)?.name || "Pick one"}
            </p>
          </div>
          <div
            className={`rounded-[14px] p-3 border-2 transition-all ${
              viceCaptainId
                ? "bg-[var(--ice-soft)] border-[var(--ice)]/30"
                : "bg-[var(--bg-surface)] border-[var(--line-default)] border-dashed"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Star
                size={12}
                className={viceCaptainId ? "text-[var(--ice)]" : "text-[var(--ink-faint)]"}
              />
              <p
                className={`t-eyebrow !text-[9px] ${
                  viceCaptainId ? "!text-[var(--ice)]" : ""
                }`}
              >
                Vice Captain
              </p>
              <span
                className={`num text-[9px] font-extrabold px-1.5 py-[1px] rounded tracking-wide ml-auto ${
                  viceCaptainId
                    ? "bg-[var(--ice)] text-[var(--bg-base)]"
                    : "bg-[var(--bg-elevated)] text-[var(--ink-dim)]"
                }`}
              >
                1.5x
              </span>
            </div>
            <p
              className={`font-display font-extrabold text-sm mt-0.5 truncate tracking-tight ${
                viceCaptainId ? "text-[var(--ink)]" : "text-[var(--ink-dim)]"
              }`}
            >
              {draft.find((p) => p.playerId === viceCaptainId)?.name || "Pick one"}
            </p>
          </div>
        </div>

        {/* Team counts */}
        {(teamA || teamB) && (
          <div className="flex items-center gap-2 mb-3">
            {teamA && (
              <span className="inline-flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--line-default)] rounded-full px-3 h-8 text-[11px] font-extrabold text-[var(--ink)]">
                {teamA.short}
                <span className="num text-[var(--gold-bright)]">{teamACount}</span>
              </span>
            )}
            {teamB && (
              <span className="inline-flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--line-default)] rounded-full px-3 h-8 text-[11px] font-extrabold text-[var(--ink)]">
                {teamB.short}
                <span className="num text-[var(--gold-bright)]">{teamBCount}</span>
              </span>
            )}
          </div>
        )}

        {/* Player table */}
        <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="sticky top-0 z-20 bg-[var(--bg-elevated)] px-4 py-2.5 flex items-center text-[10px] font-bold text-[var(--ink-faint)] uppercase border-b border-[var(--line)] tracking-[0.08em]">
            <span className="flex-1">
              Players (<span className="num">{draft.length}</span>)
            </span>
            <span className="w-11 text-center leading-tight">
              C
              <br />
              <span className="num text-[8px] text-[var(--gold-bright)]">2x</span>
            </span>
            <span className="w-11 text-center leading-tight">
              VC
              <br />
              <span className="num text-[8px] text-[var(--ice)]">1.5x</span>
            </span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {draft.map((p) => {
              const isC = captainId === p.playerId;
              const isVC = viceCaptainId === p.playerId;
              const teamShort =
                p.teamId === teamA?.id ? teamA?.short : teamB?.short;
              return (
                <div
                  key={p.playerId}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isC
                      ? "bg-[var(--gold-soft)]"
                      : isVC
                        ? "bg-[var(--ice-soft)]"
                        : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--line-default)] flex items-center justify-center overflow-hidden">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Users size={15} className="text-[var(--ink-faint)]" />
                      )}
                    </div>
                    {teamShort && (
                      <span className="num absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-extrabold text-[var(--ink)] bg-[var(--bg-base)] border border-[var(--line-default)] px-1.5 py-0.5 rounded tracking-wide">
                        {teamShort}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[var(--ink)] font-extrabold text-[13px] truncate tracking-tight">
                      {p.name}
                    </p>
                    <p className="text-[var(--ink-faint)] text-[10px] font-bold capitalize">
                      {p.role} · {p.teamName || ""}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (isC) setCaptainId(null);
                      else {
                        if (viceCaptainId === p.playerId) setViceCaptainId(null);
                        setCaptainId(p.playerId);
                      }
                    }}
                    aria-label="Set captain"
                    className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-[13px] font-extrabold transition-all ${
                      isC
                        ? "bg-[var(--gold)] border-[var(--bg-base)] text-[var(--bg-base)] scale-110 shadow-md shadow-[var(--gold-halo)]"
                        : "bg-[var(--bg-elevated)] border-[var(--line-default)] text-[var(--ink-whisper)] hover:border-[var(--gold)] hover:text-[var(--gold-bright)]"
                    }`}
                  >
                    C
                  </button>
                  <button
                    onClick={() => {
                      if (isVC) setViceCaptainId(null);
                      else {
                        if (captainId === p.playerId) setCaptainId(null);
                        setViceCaptainId(p.playerId);
                      }
                    }}
                    aria-label="Set vice captain"
                    className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-[11px] font-extrabold transition-all ${
                      isVC
                        ? "bg-[var(--ice)] border-[var(--bg-base)] text-[var(--bg-base)] scale-110 shadow-md"
                        : "bg-[var(--bg-elevated)] border-[var(--line-default)] text-[var(--ink-whisper)] hover:border-[var(--ice)] hover:text-[var(--ice)]"
                    }`}
                  >
                    VC
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky next button */}
      <div className="fixed bottom-[64px] md:bottom-0 left-0 right-0 z-40 glass border-t border-[var(--line-default)]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <button
            disabled={!captainId || !viceCaptainId}
            onClick={goPreview}
            className={`w-full flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-[12px] text-sm font-extrabold uppercase tracking-[0.08em] transition-all ${
              !captainId || !viceCaptainId
                ? "bg-[var(--bg-elevated)] text-[var(--ink-whisper)] border border-[var(--line-default)] cursor-not-allowed"
                : "btn btn-gold sweep"
            }`}
          >
            {!captainId
              ? "Pick a Captain"
              : !viceCaptainId
                ? "Pick a Vice Captain"
                : "Preview Team"}
            {captainId && viceCaptainId && (
              <ChevronRight size={16} strokeWidth={3} />
            )}
          </button>
        </div>
      </div>
    </FantasyShell>
  );
}
