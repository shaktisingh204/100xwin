"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check, Loader2, Share2, Shield, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

export default function InviteLandingPage() {
  const router = useRouter();
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const [contest, setContest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!code) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/fantasy/private-contests/invite/${code}`);
        setContest(res.data);
      } catch (e: any) {
        setErr(e?.response?.data?.message || "Invite not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const inviteLink = useMemo(
    () =>
      typeof window !== "undefined"
        ? `${window.location.origin}/fantasy/invite/${code}`
        : "",
    [code],
  );

  const copy = () => {
    if (!inviteLink) return;
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    if (!inviteLink) return;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Join my fantasy contest",
          text: contest?.title || "Fantasy contest invite",
          url: inviteLink,
        });
      } catch {
        copy();
      }
    } else {
      copy();
    }
  };

  if (authLoading || !user)
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[var(--ink-faint)] text-sm">
        Loading...
      </div>
    );

  return (
    <FantasyShell
      title="Private Contest"
      subtitle="Invite"
      backHref="/fantasy"
      hideSubNav
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[var(--gold)]" />
        </div>
      ) : err ? (
        <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-10 text-center">
          <Shield className="mx-auto text-[var(--ink-whisper)] mb-3" size={40} />
          <p className="text-[var(--ink-faint)] font-bold">{err}</p>
        </div>
      ) : (
        contest && (
          <div className="space-y-3">
            <div className="rounded-[18px] grain border border-[var(--line-gold)] bg-[var(--gold-soft)] p-4">
              <p className="t-eyebrow">You&apos;ve been invited to</p>
              <p className="font-display text-[var(--ink)] font-extrabold text-2xl tracking-tight mt-1">
                {contest.title}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Stat v={`₹${contest.entryFee}`} l="Entry" />
                <Stat
                  v={`₹${Number(contest.totalPrize).toLocaleString("en-IN")}`}
                  l="Prize"
                />
                <Stat v={`${contest.filledSpots}/${contest.maxSpots}`} l="Filled" />
              </div>
            </div>

            {/* Copy link visible without scroll on 320px */}
            <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-3">
              <p className="t-eyebrow mb-1.5">Invite link</p>
              <div className="flex items-center gap-2">
                <p className="num text-[var(--ink-dim)] text-[11px] break-all flex-1 leading-snug">
                  {inviteLink}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={copy}
                  className="inline-flex items-center justify-center gap-1.5 bg-[var(--bg-elevated)] border border-[var(--line-default)] hover:bg-[var(--bg-raised)] text-[var(--ink)] font-bold text-[12px] min-h-[44px] rounded-[10px] uppercase tracking-[0.08em]"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={share}
                  className="btn btn-gold sweep min-h-[44px] text-[12px] uppercase tracking-[0.08em]"
                >
                  <Share2 size={14} /> Share
                </button>
              </div>
            </div>

            <Link
              href={`/fantasy/match/${contest.matchId}`}
              className="btn btn-gold sweep w-full min-h-[48px] text-sm uppercase tracking-[0.08em]"
            >
              <Trophy size={16} /> Build a team to join
            </Link>
          </div>
        )
      )}
    </FantasyShell>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="bg-[var(--bg-base)]/40 border border-[var(--line-default)] rounded-[10px] px-3 py-2 text-center">
      <p className="t-eyebrow !text-[9px]">{l}</p>
      <p className="num text-[var(--ink)] font-extrabold text-sm tracking-tight">
        {v}
      </p>
    </div>
  );
}
