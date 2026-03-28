"use client";

import { useState, useEffect, useCallback } from "react";
import { getPendingBets, manualSettleBet, getSettlementStats } from "@/actions/settlement";

type Outcome = 'WON' | 'LOST' | 'VOID';

interface ConfirmState {
    bet: any;
    outcome: Outcome;
}

const STYLES: Record<Outcome, { btn: string; badge: string; label: string; detail: (bet: any) => string }> = {
    WON:  {
        btn:    'bg-green-600 hover:bg-green-500',
        badge:  'bg-green-500/20 text-green-300 border-green-500/40',
        label:  '✅ WON',
        detail: (b) => `Will credit ₹${b.potentialWin?.toFixed(2)} to user balance.`,
    },
    LOST: {
        btn:    'bg-red-700 hover:bg-red-600',
        badge:  'bg-red-500/20 text-red-300 border-red-500/40',
        label:  '❌ LOST',
        detail: () => `No credit. Exposure released.`,
    },
    VOID: {
        btn:    'bg-zinc-600 hover:bg-zinc-500',
        badge:  'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
        label:  '↩ VOID',
        detail: (b) => `Will refund ₹${b.stake?.toFixed(2)} stake to user.`,
    },
};

export default function SettlementPage() {
    const [bets, setBets]           = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [stats, setStats]         = useState<{ pending: number; wonToday: number; lostToday: number } | null>(null);

    // Confirm modal
    const [confirm, setConfirm]     = useState<ConfirmState | null>(null);
    const [note, setNote]           = useState('');
    const [settling, setSettling]   = useState(false);
    const [settleMsg, setSettleMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const [betsRes, statsRes] = await Promise.all([
            getPendingBets(1, 100),
            getSettlementStats(),
        ]);
        if (!betsRes.success) {
            setError('Failed to load pending bets.');
        } else {
            setBets(betsRes.data);
        }
        if (statsRes.success) setStats(statsRes.data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openConfirm = (bet: any, outcome: Outcome) => {
        setConfirm({ bet, outcome });
        setNote(`Manual ${outcome} by admin`);
        setSettleMsg(null);
    };

    const handleSettle = async () => {
        if (!confirm) return;
        setSettling(true);
        const res = await manualSettleBet(confirm.bet._id, confirm.outcome, note);
        setSettleMsg({ ok: res.success, text: res.message });
        if (res.success) {
            setBets(prev => prev.filter(b => b._id !== confirm.bet._id));
            setStats(prev => prev ? { ...prev, pending: Math.max(0, prev.pending - 1) } : prev);
            setTimeout(() => { setConfirm(null); setSettleMsg(null); }, 1200);
        }
        setSettling(false);
    };

    // Group by event
    const byEvent: Record<string, { name: string; bets: any[] }> = {};
    for (const bet of bets) {
        const key = bet.eventId || 'unknown';
        if (!byEvent[key]) byEvent[key] = { name: bet.eventName || key, bets: [] };
        byEvent[key].bets.push(bet);
    }
    const eventEntries = Object.entries(byEvent);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Settlement Management</h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Auto-settlement cron runs every 2 min. Manually override any pending bet below.
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all disabled:opacity-50"
                >
                    {loading ? "Loading…" : "↺ Refresh"}
                </button>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-500/40 text-red-300 rounded-lg px-4 py-3 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Stats bar */}
            {stats && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Pending', value: stats.pending, color: 'text-orange-400' },
                        { label: 'Won Today', value: stats.wonToday, color: 'text-green-400' },
                        { label: 'Lost Today', value: stats.lostToday, color: 'text-red-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-gray-800 border border-white/10 rounded-xl p-4 text-center">
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Pending bets */}
            <div className="bg-gray-800 rounded-xl border border-white/10 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                    <span className="text-sm font-semibold">⏳ Pending Bets</span>
                    <span className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full">
                        {bets.length}
                    </span>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
                ) : eventEntries.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">✅ No pending bets.</p>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {eventEntries.map(([eventId, { name, bets: evBets }]) => (
                            <div key={eventId}>
                                {/* Event header */}
                                <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-700/40 border-b border-white/[0.04]">
                                    <span className="text-xs font-semibold text-white/80 flex-1 truncate">{name}</span>
                                    <span className="text-[11px] text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                        {evBets.length} bet{evBets.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Bet rows */}
                                {evBets.map((bet: any) => (
                                    <div key={bet._id} className="px-5 py-3 flex flex-col md:flex-row md:items-center gap-3">
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] text-white/85 font-medium truncate">
                                                {bet.marketName}
                                                {bet.selectionName && bet.selectionName !== bet.marketName && (
                                                    <span className="text-white/40 ml-1.5">→ {bet.selectionName}</span>
                                                )}
                                            </p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0 mt-0.5 text-[11px] text-gray-500">
                                                <span className={bet.betType === 'lay' ? 'text-pink-400 font-semibold' : 'text-blue-400 font-semibold'}>
                                                    {bet.betType?.toUpperCase() || 'BACK'}
                                                </span>
                                                <span>@ {bet.odds}</span>
                                                <span>Stake: <span className="text-white/60">₹{bet.stake}</span></span>
                                                <span>Win: <span className="text-green-400">₹{bet.potentialWin?.toFixed(2)}</span></span>
                                                <span className="font-mono text-white/20">{String(bet._id).slice(-8)}</span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-1.5 flex-shrink-0">
                                            {(['WON', 'LOST', 'VOID'] as Outcome[]).map(o => (
                                                <button
                                                    key={o}
                                                    onClick={() => openConfirm(bet, o)}
                                                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${STYLES[o].btn}`}
                                                >
                                                    {STYLES[o].label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Confirm Modal ─────────────────────────────────────────── */}
            {confirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="bg-gray-800 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-base font-bold">
                            Settle bet as{' '}
                            <span className={`inline-block px-2 py-0.5 rounded border text-sm ${STYLES[confirm.outcome].badge}`}>
                                {STYLES[confirm.outcome].label}
                            </span>
                        </h3>

                        {/* Bet summary */}
                        <div className="bg-gray-700/60 rounded-xl p-3 text-xs space-y-1">
                            <p className="text-white/80 font-medium">{confirm.bet.eventName}</p>
                            <p className="text-gray-400">{confirm.bet.marketName}{confirm.bet.selectionName && ` → ${confirm.bet.selectionName}`}</p>
                            <div className="flex gap-4 text-gray-300 pt-1">
                                <span>{confirm.bet.betType?.toUpperCase()} @ {confirm.bet.odds}</span>
                                <span>Stake: ₹{confirm.bet.stake}</span>
                                <span className="text-green-400">Win: ₹{confirm.bet.potentialWin?.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Outcome implication */}
                        <p className={`text-xs px-3 py-2 rounded-lg border ${STYLES[confirm.outcome].badge}`}>
                            {STYLES[confirm.outcome].detail(confirm.bet)}
                        </p>

                        {/* Note */}
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Admin note</label>
                            <input
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                className="w-full bg-gray-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                                placeholder="Reason for manual override…"
                            />
                        </div>

                        {settleMsg && (
                            <p className={`text-xs px-3 py-2 rounded-lg ${settleMsg.ok ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                                {settleMsg.ok ? '✅ ' : '❌ '}{settleMsg.text}
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirm(null)}
                                disabled={settling}
                                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold disabled:opacity-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSettle}
                                disabled={settling}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all ${STYLES[confirm.outcome].btn}`}
                            >
                                {settling ? "Settling…" : `Confirm ${confirm.outcome}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
