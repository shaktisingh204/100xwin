"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "@/services/api";

interface CasinoTx {
  id: string;
  gameName?: string;
  gameProvider?: string;
  gameProviderLogo?: string;
  type: "bet" | "win" | "refund";
  amount: number;
  createdAt: string;
  status?: string;
  roundId?: string;
}

const PAGE = 15;

function typeMeta(type: CasinoTx["type"]) {
  if (type === "win")
    return {
      icon: TrendingUp,
      chip: "chip-emerald",
      color: "var(--emerald)",
      sign: "+",
      label: "Win",
    } as const;
  if (type === "refund")
    return {
      icon: RefreshCw,
      chip: "chip-ice",
      color: "var(--ice)",
      sign: "+",
      label: "Refund",
    } as const;
  return {
    icon: TrendingDown,
    chip: "chip-crimson",
    color: "var(--crimson)",
    sign: "-",
    label: "Bet",
  } as const;
}

function ProviderBadge({ tx }: { tx: CasinoTx }) {
  const initial = (tx.gameProvider || "?").charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden shrink-0">
      {tx.gameProviderLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tx.gameProviderLogo}
          alt={tx.gameProvider || "provider"}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="num text-[11px] font-bold text-[var(--gold-bright)]">{initial}</span>
      )}
    </div>
  );
}

/* ---------- Mobile card ---------- */
function CasinoCard({
  tx,
  expanded,
  onToggle,
}: {
  tx: CasinoTx;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = typeMeta(tx.type);
  const Icon = meta.icon;
  const date = new Date(tx.createdAt);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <ProviderBadge tx={tx} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-[var(--ink-strong)] truncate flex-1">
              {tx.gameName || "Casino Game"}
            </p>
            <span className={`chip ${meta.chip} shrink-0`}>
              <Icon className="w-3 h-3" />
              {meta.label}
            </span>
          </div>
          <p className="text-[11px] text-[var(--ink-faint)] mt-0.5 truncate">
            {tx.gameProvider || "—"}
            <span className="text-[var(--ink-whisper)]"> · </span>
            <span className="num">
              {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </span>
          </p>
        </div>
      </div>

      <div className="px-3 pb-3 flex items-end justify-between gap-2">
        <p className="num text-[18px] font-bold leading-none" style={{ color: meta.color }}>
          {meta.sign}₹{tx.amount.toLocaleString("en-IN")}
        </p>
        {tx.roundId && (
          <button
            onClick={onToggle}
            className="text-[10px] uppercase tracking-[0.06em] text-[var(--ink-faint)] hover:text-[var(--gold-bright)] flex items-center gap-1"
            aria-expanded={expanded}
          >
            {expanded ? "Hide" : "Round"}
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {expanded && tx.roundId && (
        <div className="px-3 pb-3 -mt-1 animate-fade-up">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-1.5">
            <p className="t-eyebrow text-[9px]">Round ID</p>
            <p className="num text-[11px] text-[var(--ink-dim)] truncate mt-0.5">{tx.roundId}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Desktop table row ---------- */
function CasinoTableRow({ tx }: { tx: CasinoTx }) {
  const meta = typeMeta(tx.type);
  const Icon = meta.icon;
  const date = new Date(tx.createdAt);

  return (
    <tr className="border-b border-[var(--line)] hover:bg-[var(--bg-elevated)] transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <ProviderBadge tx={tx} />
          <div className="min-w-0">
            <p className="text-sm text-[var(--ink-strong)] font-medium truncate max-w-[220px]">
              {tx.gameName || "Casino Game"}
            </p>
            <p className="text-[11px] text-[var(--ink-faint)] truncate max-w-[220px]">
              {tx.gameProvider || "—"}
            </p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 num text-sm text-[var(--ink-dim)]">
        {date.toLocaleDateString("en-IN")}
      </td>
      <td className="py-3 px-4 num text-[11px] text-[var(--ink-faint)] truncate max-w-[160px]">
        {tx.roundId || "—"}
      </td>
      <td className="py-3 px-4 text-right">
        <span className={`chip ${meta.chip}`}>
          <Icon className="w-3 h-3" />
          {meta.label}
        </span>
      </td>
      <td
        className="py-3 px-4 text-right num text-sm font-bold"
        style={{ color: meta.color }}
      >
        {meta.sign}₹{tx.amount.toLocaleString("en-IN")}
      </td>
    </tr>
  );
}

export default function CasinoTransactionsPage() {
  const [txns, setTxns] = useState<CasinoTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "bet" | "win" | "refund">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    setLoading(true);
    api
      .get("/casino/transactions?limit=50")
      .then((res) => setTxns(res.data?.data || res.data || []))
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? txns : txns.filter((t) => t.type === filter)),
    [txns, filter],
  );
  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  useEffect(() => {
    setVisible(PAGE);
  }, [filter]);

  const totalBet = useMemo(
    () => txns.filter((t) => t.type === "bet").reduce((a, t) => a + t.amount, 0),
    [txns],
  );
  const totalWin = useMemo(
    () => txns.filter((t) => t.type === "win").reduce((a, t) => a + t.amount, 0),
    [txns],
  );
  const netPnl = totalWin - totalBet;

  const FILTERS: Array<{ key: typeof filter; label: string }> = [
    { key: "all", label: "All" },
    { key: "bet", label: "Bets" },
    { key: "win", label: "Wins" },
    { key: "refund", label: "Refunds" },
  ];

  return (
    <div className="page-x py-5 md:py-10 max-w-[1100px] mx-auto space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="w-10 h-10 rounded-xl border border-[var(--line-default)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--ink-dim)] hover:text-[var(--gold-bright)] hover:border-[var(--line-gold)] transition-all shrink-0"
          aria-label="Back to profile"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 rail-gold">
          <span className="t-eyebrow">Casino ledger</span>
          <h1 className="t-section mt-0.5 flex items-center gap-2">
            <ShieldCheck size={20} className="text-[var(--gold-bright)]" /> Casino transactions
          </h1>
        </div>
      </div>

      {/* Stats */}
      {txns.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {[
            {
              label: "Total bet",
              value: `₹${totalBet.toLocaleString("en-IN")}`,
              color: "var(--crimson)",
            },
            {
              label: "Total won",
              value: `₹${totalWin.toLocaleString("en-IN")}`,
              color: "var(--emerald)",
            },
            {
              label: "Net P&L",
              value: `${netPnl >= 0 ? "+" : "-"}₹${Math.abs(netPnl).toLocaleString("en-IN")}`,
              color: netPnl >= 0 ? "var(--emerald)" : "var(--crimson)",
            },
          ].map((s) => (
            <div key={s.label} className="card p-3">
              <p className="t-eyebrow">{s.label}</p>
              <p
                className="num text-[15px] md:text-[20px] font-bold mt-1 truncate"
                style={{ color: s.color }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`chip whitespace-nowrap shrink-0 h-8 ${active ? "chip-gold" : ""}`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-[88px] rounded-[16px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card border-[var(--line-gold)] p-8 text-center bg-gold-soft">
          <div className="w-14 h-14 mx-auto rounded-2xl border border-[var(--line-gold)] bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--gold-bright)] mb-3">
            <Search size={24} />
          </div>
          <h3 className="t-section text-lg">No casino activity</h3>
          <p className="t-section-sub mt-1 mb-5">
            Spin, deal, or roll — your casino plays will appear here.
          </p>
          <Link
            href="/casino"
            className="btn btn-gold sweep h-11 px-6 uppercase tracking-[0.06em] text-[11px] inline-flex"
          >
            Go to Casino
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2 stagger">
            {shown.map((tx) => (
              <CasinoCard
                key={tx.id}
                tx={tx}
                expanded={expanded === tx.id}
                onToggle={() => setExpanded(expanded === tx.id ? null : tx.id)}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left t-eyebrow border-b border-[var(--line-default)]">
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Round</th>
                  <th className="py-3 px-4 text-right">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((tx) => (
                  <CasinoTableRow key={tx.id} tx={tx} />
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisible((v) => v + PAGE)}
                className="btn btn-ghost h-11 px-8 uppercase tracking-[0.06em] text-[11px]"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}

      <div className="h-6" />
    </div>
  );
}
