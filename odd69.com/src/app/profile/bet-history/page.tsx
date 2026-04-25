"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  History,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "@/services/api";

interface Bet {
  id: string;
  eventName?: string;
  marketName?: string;
  selection?: string;
  odds: number;
  stake: number;
  potentialWin: number;
  status: "open" | "won" | "lost" | "void" | "settled";
  createdAt: string;
  settledAt?: string;
  profit?: number;
  type?: string;
}

type StatusKey = "open" | "won" | "lost" | "void" | "settled";

const STATUS_CFG: Record<
  StatusKey,
  { label: string; chip: string; icon: React.ComponentType<any> }
> = {
  won: { label: "Won", chip: "chip-emerald", icon: TrendingUp },
  lost: { label: "Lost", chip: "chip-crimson", icon: TrendingDown },
  open: { label: "Open", chip: "chip-gold", icon: Clock },
  void: { label: "Void", chip: "chip", icon: Minus },
  settled: { label: "Settled", chip: "chip-ice", icon: Minus },
};

const PAGE = 12;

function netResult(bet: Bet): { value: number; sign: 1 | -1 | 0 } {
  if (bet.status === "won") {
    const v = bet.profit ?? bet.potentialWin - bet.stake;
    return { value: Math.abs(v), sign: 1 };
  }
  if (bet.status === "lost") return { value: bet.stake, sign: -1 };
  return { value: bet.stake, sign: 0 };
}

/* ---------- Bet card (mobile mini-bet-slip) ---------- */
function BetCard({ bet }: { bet: Bet }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[bet.status] ?? STATUS_CFG.open;
  const Icon = cfg.icon;
  const result = netResult(bet);
  const resultColor =
    result.sign === 1
      ? "var(--emerald)"
      : result.sign === -1
        ? "var(--crimson)"
        : "var(--ink-strong)";

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`chip ${cfg.chip}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
          <span className="num text-[11px] text-[var(--ink-faint)]">
            {new Date(bet.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        </div>
        {bet.type && (
          <span className="chip text-[10px] uppercase tracking-[0.06em]">{bet.type}</span>
        )}
      </div>

      <div className="px-3 pt-2 pb-3">
        <p className="text-[13px] font-semibold text-[var(--ink-strong)] truncate leading-tight">
          {bet.eventName || "Sports Bet"}
        </p>
        <p className="text-[11px] text-[var(--ink-faint)] mt-0.5 truncate">
          {bet.marketName || "Market"}
          {bet.selection && (
            <>
              {" · "}
              <span className="text-[var(--ink-dim)]">{bet.selection}</span>
            </>
          )}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-1.5">
            <p className="t-eyebrow text-[9px]">Stake</p>
            <p className="num text-[13px] font-bold text-[var(--ink-strong)] mt-0.5">
              ₹{bet.stake.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-1.5">
            <p className="t-eyebrow text-[9px]">Odds</p>
            <p className="num text-[13px] font-bold text-[var(--gold-bright)] mt-0.5">
              {bet.odds.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-1.5">
            <p className="t-eyebrow text-[9px]">Returns</p>
            <p
              className="num text-[13px] font-bold mt-0.5"
              style={{ color: resultColor }}
            >
              {result.sign === 1 ? "+" : result.sign === -1 ? "-" : ""}₹
              {result.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-center gap-1 py-2 border-t border-[var(--line)] text-[11px] text-[var(--ink-faint)] hover:text-[var(--gold-bright)] transition-colors uppercase tracking-[0.06em]"
        aria-expanded={expanded}
      >
        {expanded ? "Hide details" : "Market details"}
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 text-[11px] animate-fade-up">
          <div className="flex justify-between gap-2">
            <span className="text-[var(--ink-faint)]">Bet ID</span>
            <span className="num text-[var(--ink-dim)] truncate max-w-[60%]">{bet.id}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--ink-faint)]">Potential win</span>
            <span className="num text-[var(--ink-strong)]">
              ₹{bet.potentialWin.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--ink-faint)]">Placed</span>
            <span className="num text-[var(--ink-dim)]">
              {new Date(bet.createdAt).toLocaleString("en-IN")}
            </span>
          </div>
          {bet.settledAt && (
            <div className="flex justify-between gap-2">
              <span className="text-[var(--ink-faint)]">Settled</span>
              <span className="num text-[var(--ink-dim)]">
                {new Date(bet.settledAt).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Desktop table row ---------- */
function BetTableRow({ bet }: { bet: Bet }) {
  const cfg = STATUS_CFG[bet.status] ?? STATUS_CFG.open;
  const Icon = cfg.icon;
  const result = netResult(bet);
  const resultColor =
    result.sign === 1
      ? "var(--emerald)"
      : result.sign === -1
        ? "var(--crimson)"
        : "var(--ink-strong)";

  return (
    <tr className="border-b border-[var(--line)] hover:bg-[var(--bg-elevated)] transition-colors">
      <td className="py-3 px-4">
        <p className="text-sm text-[var(--ink-strong)] font-medium truncate max-w-[260px]">
          {bet.eventName || "Sports Bet"}
        </p>
        <p className="text-[11px] text-[var(--ink-faint)] mt-0.5 truncate max-w-[260px]">
          {bet.marketName || "—"}
        </p>
      </td>
      <td className="py-3 px-4 text-sm text-[var(--ink-dim)] truncate max-w-[180px]">
        {bet.selection || "—"}
      </td>
      <td className="py-3 px-4 text-right num text-sm text-[var(--ink-strong)]">
        ₹{bet.stake.toLocaleString("en-IN")}
      </td>
      <td className="py-3 px-4 text-right num text-sm text-[var(--gold-bright)]">
        {bet.odds.toFixed(2)}
      </td>
      <td
        className="py-3 px-4 text-right num text-sm font-bold"
        style={{ color: resultColor }}
      >
        {result.sign === 1 ? "+" : result.sign === -1 ? "-" : ""}₹
        {result.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </td>
      <td className="py-3 px-4 text-right">
        <span className={`chip ${cfg.chip}`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </td>
    </tr>
  );
}

export default function BetHistoryPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "won" | "lost" | "void">("all");
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    setLoading(true);
    api
      .get("/bets/my?limit=50")
      .then((res) => setBets(res.data?.data || res.data?.bets || res.data || []))
      .catch(() => setBets([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? bets : bets.filter((b) => b.status === filter)),
    [bets, filter],
  );

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  useEffect(() => {
    setVisible(PAGE);
  }, [filter]);

  const stats = useMemo(() => {
    const won = bets.filter((b) => b.status === "won").length;
    const lost = bets.filter((b) => b.status === "lost").length;
    const profit = bets.reduce((acc, b) => {
      if (b.status === "won") return acc + (b.profit ?? b.potentialWin - b.stake);
      if (b.status === "lost") return acc - b.stake;
      return acc;
    }, 0);
    return { total: bets.length, won, lost, profit };
  }, [bets]);

  const FILTERS: Array<{ key: typeof filter; label: string }> = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "won", label: "Won" },
    { key: "lost", label: "Lost" },
    { key: "void", label: "Void" },
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
          <span className="t-eyebrow">Sportsbook</span>
          <h1 className="t-section mt-0.5 flex items-center gap-2">
            <History size={20} className="text-[var(--gold-bright)]" /> Bet history
          </h1>
        </div>
      </div>

      {/* Stats */}
      {bets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {[
            { label: "Total bets", value: stats.total.toString(), color: "var(--ink-strong)" },
            { label: "Won", value: stats.won.toString(), color: "var(--emerald)" },
            { label: "Lost", value: stats.lost.toString(), color: "var(--crimson)" },
            {
              label: "P&L",
              value: `${stats.profit >= 0 ? "+" : "-"}₹${Math.abs(stats.profit).toLocaleString(
                "en-IN",
                { maximumFractionDigits: 0 },
              )}`,
              color: stats.profit >= 0 ? "var(--emerald)" : "var(--crimson)",
            },
          ].map((s) => (
            <div key={s.label} className="card p-3">
              <p className="t-eyebrow">{s.label}</p>
              <p
                className="num text-[18px] md:text-[22px] font-bold mt-1"
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

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[150px] rounded-[16px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card border-[var(--line-gold)] p-8 text-center bg-gold-soft">
          <div className="w-14 h-14 mx-auto rounded-2xl border border-[var(--line-gold)] bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--gold-bright)] mb-3">
            <Search size={24} />
          </div>
          <h3 className="t-section text-lg">No bets yet</h3>
          <p className="t-section-sub mt-1 mb-5">
            Place your first sports bet and your slips will be tracked here.
          </p>
          <Link
            href="/sports"
            className="btn btn-gold sweep h-11 px-6 uppercase tracking-[0.06em] text-[11px] inline-flex"
          >
            Go to Sports
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: mini-bet-slip cards */}
          <div className="md:hidden space-y-2 stagger">
            {shown.map((b) => (
              <BetCard key={b.id} bet={b} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left t-eyebrow border-b border-[var(--line-default)]">
                  <th className="py-3 px-4">Match</th>
                  <th className="py-3 px-4">Selection</th>
                  <th className="py-3 px-4 text-right">Stake</th>
                  <th className="py-3 px-4 text-right">Odds</th>
                  <th className="py-3 px-4 text-right">Returns</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => (
                  <BetTableRow key={b.id} bet={b} />
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
