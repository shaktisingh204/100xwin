"use client";

import React from 'react';

interface Bet {
    id: string;
    eventName: string;
    marketName: string;
    selectionName: string;
    odds: number;
    stake: number;
    potentialWin: number;
    status: string; // PENDING, WON, LOST, VOID
    betType?: string;
    settledReason?: string;
    settledAt?: string;
    cashoutValue?: number;
    createdAt: string;
}

interface UserBetsTableProps {
    bets: Bet[];
}

export default function UserBetsTable({ bets }: UserBetsTableProps) {
    if (!bets || bets.length === 0) {
        return <div className="p-8 text-center text-slate-500 bg-slate-800 rounded-lg">No bets history found.</div>;
    }

    const formatAmount = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    const getBetReason = (bet: Bet) => {
        if (bet.settledReason?.trim()) return bet.settledReason.trim();
        if (bet.status === 'PENDING') return 'Awaiting market settlement.';
        if (bet.status === 'VOID') return 'Bet was voided and the stake was refunded.';
        if (bet.status === 'CASHED_OUT') {
            return bet.cashoutValue
                ? `Bet was cashed out for ${formatAmount(bet.cashoutValue)} before final settlement.`
                : 'Bet was cashed out before final settlement.';
        }

        const selection = bet.selectionName || 'your selection';
        if (bet.status === 'WON') {
            return `Won on ${selection}${bet.betType === 'lay' ? ' (Lay)' : ' (Back)'}.`;
        }
        if (bet.status === 'LOST') {
            return `Lost on ${selection}${bet.betType === 'lay' ? ' (Lay)' : ' (Back)'}.`;
        }
        return 'Settlement details unavailable.';
    };

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white">Recent Bets</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-[1080px] w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900/50 uppercase font-medium text-xs">
                        <tr>
                            <th className="px-4 py-3 sm:px-6">Event / Market</th>
                            <th className="px-4 py-3 sm:px-6">Selection</th>
                            <th className="px-4 py-3 sm:px-6">Reason</th>
                            <th className="px-4 py-3 text-right sm:px-6">Odds</th>
                            <th className="px-4 py-3 text-right sm:px-6">Stake</th>
                            <th className="px-4 py-3 text-right sm:px-6">P/L</th>
                            <th className="px-4 py-3 sm:px-6">Status</th>
                            <th className="px-4 py-3 sm:px-6">Timeline</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {bets.map((bet) => (
                            <tr key={bet.id} className="hover:bg-slate-700/30">
                                <td className="px-4 py-4 sm:px-6">
                                    <p className="text-white font-medium truncate max-w-[200px]">{bet.eventName}</p>
                                    <p className="text-xs text-slate-500">{bet.marketName}</p>
                                </td>
                                <td className="px-4 py-4 text-indigo-300 font-medium sm:px-6">
                                    {bet.selectionName}
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    <p className="max-w-[320px] whitespace-normal text-xs leading-5 text-slate-300">
                                        {getBetReason(bet)}
                                    </p>
                                </td>
                                <td className="px-4 py-4 text-right font-mono text-amber-400 sm:px-6">
                                    {bet.odds.toFixed(2)}
                                </td>
                                <td className="px-4 py-4 text-right font-mono text-white sm:px-6">
                                    {formatAmount(bet.stake)}
                                </td>
                                <td className="px-4 py-4 text-right font-mono sm:px-6">
                                    {bet.status === 'WON' ? (
                                        <span className="text-emerald-400">+{bet.potentialWin - bet.stake}</span>
                                    ) : bet.status === 'LOST' ? (
                                        <span className="text-red-400">-{bet.stake}</span>
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${bet.status === 'WON' ? 'bg-emerald-500/10 text-emerald-400' :
                                            bet.status === 'LOST' ? 'bg-red-500/10 text-red-400' :
                                                bet.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-slate-500/10 text-slate-400'
                                        }`}>
                                        {bet.status}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-xs sm:px-6">
                                    <div className="space-y-1">
                                        <p>Placed: {new Date(bet.createdAt).toLocaleString()}</p>
                                        {bet.settledAt && (
                                            <p className="text-slate-500">Settled: {new Date(bet.settledAt).toLocaleString()}</p>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
