"use client";

import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { Search, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface Market {
    marketId: string;
    marketName: string;
    eventId: string;
    eventName: string;
    openBets?: number;
    totalStake?: number;
    marketTotalStake?: number;
    selections?: MarketSelection[];
}

interface MarketSelection {
    selectionId: string;
    selectionName: string;
    betCount: number;
    totalStake: number;
    totalPayout: number;
}

interface ExposureApiRow {
    _id: {
        eventId: string;
        marketId: string;
    };
    eventName: string;
    marketName: string;
    marketTotalStake: number;
    selections: MarketSelection[];
}

interface SettledBet {
    id: string;
    userId?: number;
    eventName?: string;
    marketName?: string;
    selectionName?: string;
    status: string;
    stake: number;
    potentialWin: number;
    settledReason?: string;
    settledAt?: string;
    createdAt: string;
}

export default function SettlementPage() {
    const [markets, setMarkets] = useState<Market[]>([]);
    const [settledBets, setSettledBets] = useState<SettledBet[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
    const [selections, setSelections] = useState<MarketSelection[]>([]);
    const [settling, setSettling] = useState(false);

    useEffect(() => {
        void Promise.all([fetchMarkets(), fetchSettledHistory()]);
    }, []);

    const fetchMarkets = async () => {
        setLoading(true);
        try {
            // Need an endpoint to get markets with pending bets.
            // For now, let's list all open bets and aggregate client side or create a new endpoint.
            // Creating a specialized endpoint in RiskController might be better, but let's use what we have.
            // We can fetch exposure endpoint? It groups by market!
            const res = await api.get('/risk/exposure');
            // Transform exposure data to market list
            const marketList = (res.data as ExposureApiRow[]).map((m) => ({
                marketId: m._id.marketId,
                marketName: m.marketName,
                eventId: m._id.eventId,
                eventName: m.eventName,
                marketTotalStake: m.marketTotalStake, // Total Stake
                selections: m.selections // Runners
            }));
            setMarkets(marketList);
        } catch (error) {
            console.error("Failed to fetch markets", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettledHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await api.post('/bets/all', {
                page: 1,
                limit: 100,
                filters: {
                    statusIn: ['WON', 'LOST', 'VOID', 'CASHED_OUT']
                }
            });
            setSettledBets(res.data?.bets || []);
        } catch (error) {
            console.error('Failed to fetch settled bets history', error);
            setSettledBets([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSelectMarket = (market: Market) => {
        if (selectedMarket?.marketId === market.marketId) {
            setSelectedMarket(null);
        } else {
            setSelectedMarket(market);
            setSelections(market.selections || []);
        }
    };

    const handleSettle = async (selectionId: string, selectionName: string) => {
        if (!confirm(`Are you sure you want to declare "${selectionName}" as the WINNER? This will pay out all backers.`)) return;

        setSettling(true);
        try {
            const res = await api.post('/bets/settle', {
                marketId: selectedMarket?.marketId,
                winningSelectionId: selectionId
            });
            alert(`Settled! ${res.data.settled} bets processed.`);
            void Promise.all([fetchMarkets(), fetchSettledHistory()]);
            setSelectedMarket(null);
        } catch (error) {
            console.error("Settlement failed", error);
            alert("Failed to settle market.");
        } finally {
            setSettling(false);
        }
    };

    const filteredMarkets = markets.filter(m =>
        m.eventName.toLowerCase().includes(search.toLowerCase()) ||
        m.marketName.toLowerCase().includes(search.toLowerCase())
    );

    const filteredSettledBets = settledBets.filter((bet) => {
        const term = search.toLowerCase();
        return (
            (bet.eventName || '').toLowerCase().includes(term) ||
            (bet.marketName || '').toLowerCase().includes(term) ||
            (bet.selectionName || '').toLowerCase().includes(term) ||
            String(bet.userId || '').includes(term) ||
            (bet.settledReason || '').toLowerCase().includes(term)
        );
    });

    const formatAmount = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Result Settlement</h1>
                <p className="text-slate-400 mt-1">Manually settle markets and pay out winners.</p>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search for event or market..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">Pending Markets</h2>
                    <p className="mt-1 text-sm text-slate-400">Open markets with active exposure that still need a winner.</p>
                </div>
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading markets with pending bets...</div>
                ) : filteredMarkets.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-800 rounded-lg border border-slate-700">
                        No pending markets found.
                    </div>
                ) : (
                    filteredMarkets.map(market => (
                        <div key={market.marketId} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                            <button
                                onClick={() => handleSelectMarket(market)}
                                className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors text-left"
                            >
                                <div>
                                    <h3 className="font-bold text-white">{market.eventName}</h3>
                                    <p className="text-sm text-slate-400">{market.marketName}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Volume</p>
                                        <p className="font-mono text-emerald-400">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(market.marketTotalStake || 0)}
                                        </p>
                                    </div>
                                    {selectedMarket?.marketId === market.marketId ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                                </div>
                            </button>

                            {selectedMarket?.marketId === market.marketId && (
                                <div className="p-4 border-t border-slate-700 bg-slate-900/50 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-4 text-amber-400 text-sm bg-amber-500/10 p-3 rounded">
                                        <AlertTriangle size={16} />
                                        Warning: This action is irreversible. Ensure the official result is correct.
                                    </div>

                                    <div className="grid gap-3">
                                        {selections.map((sel) => (
                                            <div key={sel.selectionId} className="flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-700">
                                                <div>
                                                    <span className="text-white font-medium">{sel.selectionName}</span>
                                                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                                        <span>Bets: {sel.betCount}</span>
                                                        <span>Stake: {sel.totalStake}</span>
                                                        <span>Payout: {sel.totalPayout}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSettle(sel.selectionId, sel.selectionName)}
                                                    disabled={settling}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-sm font-medium flex items-center gap-2"
                                                >
                                                    {settling ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                                    Set Winner
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">Recently Settled Bets</h2>
                    <p className="mt-1 text-sm text-slate-400">Past settled bets stay visible here with the exact settlement reason.</p>
                </div>

                {historyLoading ? (
                    <div className="rounded-lg border border-slate-700 bg-slate-800 py-12 text-center text-slate-500">
                        Loading settled bets history...
                    </div>
                ) : filteredSettledBets.length === 0 ? (
                    <div className="rounded-lg border border-slate-700 bg-slate-800 py-12 text-center text-slate-500">
                        No settled bets found.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800">
                        <table className="min-w-[1100px] w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900/50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Event / Market</th>
                                    <th className="px-4 py-3">Selection</th>
                                    <th className="px-4 py-3">Reason</th>
                                    <th className="px-4 py-3 text-right">Stake</th>
                                    <th className="px-4 py-3 text-right">Potential Win</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Settled At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredSettledBets.map((bet) => (
                                    <tr key={bet.id} className="hover:bg-slate-700/30">
                                        <td className="px-4 py-4 align-top">
                                            <p className="font-medium text-white">{bet.eventName || 'Unknown event'}</p>
                                            <p className="text-xs text-slate-500">{bet.marketName || 'Unknown market'}</p>
                                            {bet.userId && <p className="mt-1 text-[11px] text-slate-500">User #{bet.userId}</p>}
                                        </td>
                                        <td className="px-4 py-4 align-top text-indigo-300">{bet.selectionName || '-'}</td>
                                        <td className="px-4 py-4 align-top">
                                            <p className="max-w-[360px] whitespace-normal text-xs leading-5 text-slate-300">
                                                {bet.settledReason || 'Settlement recorded without a detailed reason.'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono align-top">{formatAmount(bet.stake)}</td>
                                        <td className="px-4 py-4 text-right font-mono align-top">{formatAmount(bet.potentialWin)}</td>
                                        <td className="px-4 py-4 align-top">
                                            <span className={`rounded px-2 py-1 text-xs font-semibold ${bet.status === 'WON'
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : bet.status === 'LOST'
                                                        ? 'bg-red-500/10 text-red-400'
                                                        : bet.status === 'VOID'
                                                            ? 'bg-slate-500/10 text-slate-300'
                                                            : 'bg-amber-500/10 text-amber-300'
                                                }`}>
                                                {bet.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 align-top text-xs text-slate-400">
                                            {new Date(bet.settledAt || bet.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
