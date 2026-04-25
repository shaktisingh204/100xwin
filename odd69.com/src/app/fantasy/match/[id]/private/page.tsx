"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Shield, Copy, Share2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

export default function CreatePrivateContestPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState("Friends Contest");
  const [entryFee, setEntryFee] = useState(49);
  const [maxSpots, setMaxSpots] = useState(10);
  const [totalPrize, setTotalPrize] = useState(400);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<{ _id: string; inviteCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  const submit = async () => {
    setSaving(true);
    setErr("");
    try {
      const res = await api.post("/fantasy/private-contests", {
        matchId: Number(id),
        title,
        entryFee,
        maxSpots,
        totalPrize,
        prizeBreakdown: [{ rankFrom: 1, rankTo: 1, prize: totalPrize }],
      });
      setCreated(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const inviteLink = useMemo(
    () =>
      created
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/fantasy/invite/${created.inviteCode}`
        : "",
    [created],
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
          text: title,
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

  const maxPool = entryFee * maxSpots;
  const overPool = totalPrize > maxPool;

  return (
    <FantasyShell
      title="Create Private Contest"
      subtitle="Invite-only, for friends"
      backHref={`/fantasy/match/${id}`}
      hideSubNav
    >
      {created ? (
        // Success view — copy-link visible without scroll on 320px viewports
        <div className="rounded-[18px] bg-[var(--bg-surface)] border border-[var(--line-gold)] p-4 text-center grain">
          <div className="grid place-items-center w-12 h-12 rounded-full bg-[var(--emerald-soft)] border border-[var(--emerald)]/25 mx-auto mb-2">
            <Shield className="text-[var(--emerald)]" size={24} />
          </div>
          <p className="t-eyebrow">Invite Code</p>
          <p className="num font-display text-[var(--gold-bright)] font-extrabold text-3xl tracking-[0.15em] mt-1">
            {created.inviteCode}
          </p>
          <div className="mt-2 px-2 py-1.5 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--line-default)]">
            <p className="text-[var(--ink-dim)] text-[11px] break-all leading-snug">
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
          <button
            onClick={() => router.push(`/fantasy/match/${id}`)}
            className="mt-3 text-[var(--ink-faint)] hover:text-[var(--ink)] text-xs font-bold underline min-h-[44px] inline-flex items-center justify-center"
          >
            Back to match
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 space-y-3">
            <F label="Contest Name">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] px-3 h-11 text-sm font-semibold focus:border-[var(--line-gold)] text-[var(--ink)] placeholder-[var(--ink-whisper)] outline-none"
              />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Entry Fee (₹)">
                <input
                  type="number"
                  inputMode="numeric"
                  value={entryFee}
                  onChange={(e) => setEntryFee(Number(e.target.value))}
                  className="w-full bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] px-3 h-11 text-sm num font-bold focus:border-[var(--line-gold)] text-[var(--ink)] outline-none"
                />
              </F>
              <F label="Spots (2-100)">
                <input
                  type="number"
                  inputMode="numeric"
                  value={maxSpots}
                  onChange={(e) => setMaxSpots(Number(e.target.value))}
                  className="w-full bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] px-3 h-11 text-sm num font-bold focus:border-[var(--line-gold)] text-[var(--ink)] outline-none"
                />
              </F>
              <F label="Total Prize (₹)">
                <input
                  type="number"
                  inputMode="numeric"
                  value={totalPrize}
                  onChange={(e) => setTotalPrize(Number(e.target.value))}
                  className={`w-full bg-[var(--bg-inlay)] border rounded-[10px] px-3 h-11 text-sm num font-bold focus:border-[var(--line-gold)] text-[var(--ink)] outline-none ${
                    overPool
                      ? "border-[var(--crimson)]/40"
                      : "border-[var(--line-default)]"
                  }`}
                />
              </F>
            </div>
            <p className="text-[11px] text-[var(--ink-faint)]">
              Max pool:{" "}
              <span className="num font-bold text-[var(--ink)]">
                ₹{maxPool.toLocaleString("en-IN")}
              </span>
              . Prize can&apos;t exceed this.
            </p>
            {err && <p className="text-xs text-[var(--crimson)] font-bold">{err}</p>}
          </div>
          <button
            onClick={submit}
            disabled={saving || overPool}
            className="w-full btn btn-gold sweep min-h-[48px] text-sm uppercase tracking-[0.08em] disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Create Contest
          </button>
        </div>
      )}
    </FantasyShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="t-eyebrow mb-1 block">{label}</label>
      {children}
    </div>
  );
}
