"use client";

import React from 'react';
import { ArrowUpRight, ArrowDownLeft, RotateCcw } from 'lucide-react';

interface CasinoTransaction {
    id: number;
    txn_id: string;
    amount: number;
    type: string;
    provider: string;
    game_code: string;
    game_name?: string;
    round_id?: string;
    wallet_type: string;
    timestamp: string;
}

interface UserCasinoTableProps {
    transactions: CasinoTransaction[];
}

export default function UserCasinoTable({ transactions }: UserCasinoTableProps) {
    if (!transactions || transactions.length === 0) {
        return <div className="p-8 text-center text-slate-500 bg-slate-800 rounded-lg border border-slate-700">No casino transactions found.</div>;
    }

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-[780px] w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900/50 uppercase font-medium text-xs border-b border-slate-700">
                        <tr>
                            <th className="px-4 py-3 sm:px-5">Game</th>
                            <th className="px-4 py-3 sm:px-5">Provider</th>
                            <th className="px-4 py-3 sm:px-5">Type</th>
                            <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                            <th className="px-4 py-3 sm:px-5">Wallet</th>
                            <th className="px-4 py-3 sm:px-5">Round</th>
                            <th className="px-4 py-3 sm:px-5">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {transactions.map((tx) => {
                            const isCredit = tx.type === 'credit';
                            const isRefund = tx.type === 'refund';
                            return (
                                <tr key={tx.id} className="hover:bg-slate-700/20">
                                    <td className="px-4 py-3 sm:px-5">
                                        <p className="text-white font-medium text-xs leading-tight">{tx.game_name || tx.game_code}</p>
                                        <p className="text-xs text-slate-600 mt-0.5">{tx.game_code}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs sm:px-5">{tx.provider}</td>
                                    <td className="px-4 py-3 sm:px-5">
                                        <span className={`flex items-center gap-1 text-xs font-semibold ${isCredit ? 'text-emerald-400' : isRefund ? 'text-amber-400' : 'text-red-400'}`}>
                                            {isCredit ? <ArrowDownLeft size={12} /> : isRefund ? <RotateCcw size={12} /> : <ArrowUpRight size={12} />}
                                            {tx.type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono font-semibold text-sm sm:px-5 ${isCredit ? 'text-emerald-400' : isRefund ? 'text-amber-400' : 'text-red-400'}`}>
                                        {isCredit || isRefund ? '+' : '-'}{tx.amount.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 sm:px-5">
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${tx.wallet_type === 'crypto' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                            {tx.wallet_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[80px] sm:px-5" title={tx.round_id || ''}>
                                        {tx.round_id ? tx.round_id.slice(-8) : '—'}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 sm:px-5">
                                        {new Date(tx.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
