"use client";

import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Transaction {
    id: number;
    amount: number;
    type: string;
    status: string;
    paymentMethod: string;
    utr?: string;
    createdAt: string;
}

interface UserTransactionsTableProps {
    transactions: Transaction[];
}

export default function UserTransactionsTable({ transactions }: UserTransactionsTableProps) {
    if (!transactions || transactions.length === 0) {
        return <div className="p-8 text-center text-slate-500 bg-slate-800 rounded-lg">No transactions found.</div>;
    }

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900/50 uppercase font-medium text-xs">
                        <tr>
                            <th className="px-4 py-3 sm:px-6">Type</th>
                            <th className="px-4 py-3 sm:px-6">Amount</th>
                            <th className="px-4 py-3 sm:px-6">Method</th>
                            <th className="px-4 py-3 sm:px-6">Status</th>
                            <th className="px-4 py-3 sm:px-6">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-700/30">
                                <td className="px-4 py-4 sm:px-6">
                                    <span className={`flex items-center gap-2 font-medium ${tx.type === 'DEPOSIT' || tx.type === 'ADMIN_DEPOSIT' ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                        {tx.type === 'DEPOSIT' || tx.type === 'ADMIN_DEPOSIT' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                        {tx.type}
                                    </span>
                                </td>
                                <td className="px-4 py-4 font-mono text-white sm:px-6">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tx.amount)}
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    {tx.paymentMethod}
                                    {tx.utr && <span className="block text-xs text-slate-500 truncate max-w-[100px]" title={tx.utr}>UTR: {tx.utr}</span>}
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 w-fit ${tx.status === 'COMPLETED' || tx.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                                            tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-red-500/10 text-red-400'
                                        }`}>
                                        {tx.status === 'COMPLETED' || tx.status === 'APPROVED' ? <CheckCircle size={12} /> :
                                            tx.status === 'PENDING' ? <Clock size={12} /> : <XCircle size={12} />}
                                        {tx.status}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-xs sm:px-6">
                                    {new Date(tx.createdAt).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
