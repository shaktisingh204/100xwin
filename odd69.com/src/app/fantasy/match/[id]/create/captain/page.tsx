"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Crown,
  Star,
  Users,
} from "lucide-react";
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
      <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">
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
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              {STEPS.map((s, i) => {
                const active = s.n === 3;
                const done = s.n < 3;
                return (
                  <div key={s.n} className="flex-1 flex items-center">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          done
                            ? "bg-emerald-500 text-white"
                            : active
                              ? "bg-amber-500 text-[#1a1208]"
                              : "bg-white/[0.04] text-white/50"
                        }`}
                      >
                        {done ? <Check size={10} strokeWidth={3} /> : s.n}
                      </span>
                      <span
                        className={
                          active
                            ? "text-white"
                            : done
                              ? "text-white/70"
                              : "text-white/50"
                        }
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-[2px] mx-1.5 bg-white/[0.06] rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selection guidance */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div
            className={`rounded-xl p-3 border-2 transition-all ${
              captainId
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-white/[0.03] border-white/[0.06] border-dashed"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Crown
                size={12}
                className={captainId ? "text-amber-400" : "text-white/50"}
              />
              <p
                className={`text-[9px] font-black uppercase tracking-widest ${
                  captainId ? "text-amber-400" : "text-white/50"
                }`}
              >
                Captain
              </p>
              <span
                className={`text-[9px] font-black px-1.5 py-[1px] rounded tracking-wide border border-[#06080c] ${
                  captainId
                    ? "bg-amber-500 text-[#1a1208]"
                    : "bg-white/[0.04] text-white/70"
                }`}
              >
                2x
              </span>
            </div>
            <p
              className={`font-black text-sm mt-0.5 truncate tracking-tight ${
                captainId ? "text-white" : "text-white/70"
              }`}
            >
              {draft.find((p) => p.playerId === captainId)?.name || "Pick one"}
            </p>
          </div>
          <div
            className={`rounded-xl p-3 border-2 transition-all ${
              viceCaptainId
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-white/[0.03] border-white/[0.06] border-dashed"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Star
                size={12}
                className={viceCaptainId ? "text-cyan-400" : "text-white/50"}
              />
              <p
                className={`text-[9px] font-black uppercase tracking-widest ${
                  viceCaptainId ? "text-cyan-400" : "text-white/50"
                }`}
              >
                Vice Captain
              </p>
              <span
                className={`text-[9px] font-black px-1.5 py-[1px] rounded tracking-wide border border-[#06080c] ${
                  viceCaptainId
                    ? "bg-cyan-400 text-[#06080c]"
                    : "bg-white/[0.04] text-white/70"
                }`}
              >
                1.5x
              </span>
            </div>
            <p
              className={`font-black text-sm mt-0.5 truncate tracking-tight ${
                viceCaptainId ? "text-white" : "text-white/70"
              }`}
            >
              {draft.find((p) => p.playerId === viceCaptainId)?.name ||
                "Pick one"}
            </p>
          </div>
        </div>

        {/* Team counts */}
        {(teamA || teamB) && (
          <div className="flex items-center gap-2 mb-3">
            {teamA && (
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1 text-[11px] font-black text-white">
                {teamA.short}
                <span className="text-amber-400">{teamACount}</span>
              </span>
            )}
            {teamB && (
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1 text-[11px] font-black text-white">
                {teamB.short}
                <span className="text-amber-400">{teamBCount}</span>
              </span>
            )}
          </div>
        )}

        {/* Player table */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="sticky top-0 z-20 bg-white/[0.04] px-4 py-2.5 flex items-center text-[10px] font-black text-white/50 uppercase border-b border-white/[0.06] tracking-widest">
            <span className="flex-1">Players ({draft.length})</span>
            <span className="w-10 text-center leading-tight">
              C
              <br />
              <span className="text-[8px] text-amber-400">2x</span>
            </span>
            <span className="w-10 text-center leading-tight">
              VC
              <br />
              <span className="text-[8px] text-cyan-400">1.5x</span>
            </span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {draft.map((p) => {
              const isC = captainId === p.playerId;
              const isVC = viceCaptainId === p.playerId;
              const teamShort =
                p.teamId === teamA?.id ? teamA?.short : teamB?.short;
              return (
                <div
                  key={p.playerId}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isC || isVC ? "bg-amber-500/10 border-amber-500/30" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-white/[0.04] border-2 border-white/[0.06] flex items-center justify-center overflow-hidden">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Users size={15} className="text-white/50" />
                      )}
                    </div>
                    {teamShort && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-black text-white bg-[#06080c] border border-white/[0.06] px-1.5 py-0.5 rounded tracking-wide">
                        {teamShort}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-[13px] truncate tracking-tight">
                      {p.name}
                    </p>
                    <p className="text-white/50 text-[10px] font-bold capitalize">
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
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[13px] font-black transition-all ${
                      isC
                        ? "bg-amber-500 border-[#06080c] text-[#1a1208] scale-110 shadow-md shadow-amber-500/30"
                        : "bg-white/[0.04] border-white/[0.06] text-white/25 hover:border-amber-500 hover:text-amber-400"
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
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[11px] font-black transition-all ${
                      isVC
                        ? "bg-cyan-400 border-[#06080c] text-[#06080c] scale-110 shadow-md shadow-cyan-400/30"
                        : "bg-white/[0.04] border-white/[0.06] text-white/25 hover:border-cyan-400 hover:text-cyan-400"
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
      <div className="fixed bottom-[64px] md:bottom-0 left-0 right-0 z-40 bg-[#06080c]/95 backdrop-blur border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <button
            disabled={!captainId || !viceCaptainId}
            onClick={goPreview}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 disabled:from-white/[0.04] disabled:to-white/[0.04] disabled:text-white/25 text-[#1a1208] font-black text-sm py-3.5 rounded-xl transition-all uppercase tracking-wide"
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
