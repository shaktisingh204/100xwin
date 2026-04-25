"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import api from "@/services/api";
import { useModal } from "@/context/ModalContext";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: "pending" | "approved" | "rejected" | "processing";
  createdAt: string;
  utr?: string;
  method?: string;
  note?: string;
}

type StatusKey = "approved" | "pending" | "processing" | "rejected";

const STATUS_CONFIG: Record<
  StatusKey,
  { icon: React.ComponentType<any>; chip: string; label: string }
> = {
  approved: { icon: CheckCircle, chip: "chip-emerald", label: "Approved" },
  pending: { icon: Clock, chip: "chip-gold", label: "Pending" },
  processing: { icon: RefreshCw, chip: "chip-ice", label: "Processing" },
  rejected: { icon: XCircle, chip: "chip-crimson", label: "Rejected" },
};

const PAGE = 15;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/* ---------- Mobile card ---------- */
function TxCard({ tx }: { tx: Transaction }) {
  const isDeposit = tx.type === "deposit";
  const cfg = STATUS_CONFIG[(tx.status as StatusKey) ?? "pending"] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const date = new Date(tx.createdAt);
  const amountColor = isDeposit ? "var(--emerald)" : "var(--crimson)";

  return (
    <div className="card p-3 hover:border-[var(--line-gold)] transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: isDeposit
                ? "color-mix(in srgb, var(--emerald) 14%, transparent)"
                : "color-mix(in srgb, var(--crimson) 14%, transparent)",
            }}
          >
            {isDeposit ? (
              <ArrowDownLeft className="w-4 h-4" style={{ color: "var(--emerald)" }} />
            ) : (
              <ArrowUpRight className="w-4 h-4" style={{ color: "var(--crimson)" }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ink-strong)] capitalize leading-tight">
              {tx.type}
            </p>
            <p className="num text-[11px] text-[var(--ink-faint)] mt-0.5">
              {formatDate(date)} · {formatTime(date)}
            </p>
          </div>
        </div>
        <span className={`chip ${cfg.chip} shrink-0`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="num text-[20px] font-bold leading-none" style={{ color: amountColor }}>
          {isDeposit ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
        </p>
        {tx.method && (
          <span className="chip text-[10px] uppercase tracking-[0.06em]">{tx.method}</span>
        )}
      </div>

      {(tx.utr || tx.note) && (
        <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
          {tx.utr ? (
            <p className="num text-[10px] text-[var(--ink-faint)] truncate">
              <span className="text-[var(--ink-whisper)]">UTR</span> {tx.utr}
            </p>
          ) : (
            <span />
          )}
          {tx.note && (
            <p className="text-[10px] text-[var(--ink-faint)] truncate text-right">{tx.note}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Desktop row (table) ---------- */
function TxTableRow({ tx }: { tx: Transaction }) {
  const isDeposit = tx.type === "deposit";
  const cfg = STATUS_CONFIG[(tx.status as StatusKey) ?? "pending"] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const date = new Date(tx.createdAt);
  const amountColor = isDeposit ? "var(--emerald)" : "var(--crimson)";

  return (
    <tr className="border-b border-[var(--line)] hover:bg-[var(--bg-elevated)] transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: isDeposit
                ? "color-mix(in srgb, var(--emerald) 14%, transparent)"
                : "color-mix(in srgb, var(--crimson) 14%, transparent)",
            }}
          >
            {isDeposit ? (
              <ArrowDownLeft className="w-4 h-4" style={{ color: "var(--emerald)" }} />
            ) : (
              <ArrowUpRight className="w-4 h-4" style={{ color: "var(--crimson)" }} />
            )}
          </div>
          <span className="text-sm capitalize text-[var(--ink-strong)] font-medium">
            {tx.type}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 num text-sm text-[var(--ink-dim)]">
        {formatDate(date)}{" "}
        <span className="text-[var(--ink-whisper)]">{formatTime(date)}</span>
      </td>
      <td className="py-3 px-4 text-sm text-[var(--ink-dim)]">{tx.method || "—"}</td>
      <td className="py-3 px-4 num text-sm text-[var(--ink-faint)] truncate max-w-[160px]">
        {tx.utr || "—"}
      </td>
      <td className="py-3 px-4 text-right">
        <span className="num text-sm font-bold" style={{ color: amountColor }}>
          {isDeposit ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
        </span>
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

export default function TransactionsPage() {
  const { openDeposit, openWithdraw } = useModal();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    setLoading(true);
    api
      .get("/transactions/my")
      .then((res) => setTxns(res.data?.data || res.data || []))
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      txns.filter(
        (t) =>
          (typeFilter === "all" || t.type === typeFilter) &&
          (statusFilter === "all" || t.status === statusFilter),
      ),
    [txns, typeFilter, statusFilter],
  );

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  useEffect(() => {
    setVisible(PAGE);
  }, [typeFilter, statusFilter]);

  const TYPE_FILTERS: Array<{ key: typeof typeFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "deposit", label: "Deposits" },
    { key: "withdrawal", label: "Withdrawals" },
  ];
  const STATUS_FILTERS: Array<{ key: typeof statusFilter; label: string }> = [
    { key: "all", label: "Any status" },
    { key: "approved", label: "Approved" },
    { key: "pending", label: "Pending" },
    { key: "processing", label: "Processing" },
    { key: "rejected", label: "Rejected" },
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
          <span className="t-eyebrow">Wallet ledger</span>
          <h1 className="t-section mt-0.5 flex items-center gap-2">
            <Wallet size={20} className="text-[var(--gold-bright)]" /> Transactions
          </h1>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={openDeposit}
          className="btn btn-gold sweep flex-1 h-11 uppercase tracking-[0.06em] text-[11px]"
        >
          + Deposit
        </button>
        <button onClick={openWithdraw} className="btn btn-ghost flex-1 h-11">
          Withdraw
        </button>
      </div>

      {/* Filter bar — horizontal scroll chips on mobile */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`chip whitespace-nowrap shrink-0 h-8 ${active ? "chip-gold" : ""}`}
            >
              {f.label}
            </button>
          );
        })}
        <span className="w-px self-stretch bg-[var(--line)] mx-1" />
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-[88px] rounded-[16px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card border-[var(--line-gold)] p-8 text-center bg-gold-soft">
          <div className="w-14 h-14 mx-auto rounded-2xl border border-[var(--line-gold)] bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--gold-bright)] mb-3">
            <Search size={24} />
          </div>
          <h3 className="t-section text-lg">No transactions yet</h3>
          <p className="t-section-sub mt-1 mb-5">
            Your deposits and withdrawals will land here. Start with a deposit to fund your wallet.
          </p>
          <button
            onClick={openDeposit}
            className="btn btn-gold sweep h-11 px-6 uppercase tracking-[0.06em] text-[11px]"
          >
            Make a deposit
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-2 stagger">
            {shown.map((tx) => (
              <TxCard key={tx.id} tx={tx} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left t-eyebrow border-b border-[var(--line-default)]">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((tx) => (
                  <TxTableRow key={tx.id} tx={tx} />
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
