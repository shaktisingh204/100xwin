"use client";

import React, { useState } from 'react';
import { userService, User } from '../../../../services/user.service';
import { Search, Wallet, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function ManualAdjustmentPage() {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'credit' | 'debit'>('credit');
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleSearch = async (val: string) => {
        setSearch(val);
        if (val.length > 2) {
            try {
                const data = await userService.getUsers(1, 5, val);
                setUsers(data.users);
            } catch (e) {
                console.error(e);
            }
        } else {
            setUsers([]);
        }
    };

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setUsers([]);
        setSearch(user.username);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !amount) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await userService.addFunds(selectedUser.id, parseFloat(amount), type);
            setSuccess(`Successfully ${type === 'credit' ? 'credited' : 'debited'} ${amount} to ${selectedUser.username}`);
            setAmount('');
            setRemarks('');
            // Refresh user balance display if we were to show it updated
        } catch (err: any) {
            setError(err.response?.data?.message || 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Manual Adjustment</h1>
                <p className="text-slate-400 mt-1">Credit or debit user balances manually.</p>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* User Search */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Select User</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search by username..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        {users.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {users.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-800 flex justify-between items-center transition-colors border-b border-slate-800 last:border-0"
                                    >
                                        <div>
                                            <p className="font-medium text-white">{user.username}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">Balance</p>
                                            <p className="font-mono text-emerald-400">
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(user.balance)}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedUser && (
                            <div className="mt-2 text-sm text-emerald-400 flex items-center gap-2">
                                <CheckCircle size={14} /> Selected: <span className="font-bold">{selectedUser.username}</span>
                                <span className="text-slate-500">(Balance: {selectedUser.balance})</span>
                            </div>
                        )}
                    </div>

                    {/* Transaction Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setType('credit')}
                            className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${type === 'credit'
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
                        >
                            <ArrowRight className="rotate-45" size={24} />
                            <span className="font-medium">Credit (Deposit)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('debit')}
                            className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${type === 'debit'
                                    ? 'bg-red-500/10 border-red-500 text-red-400'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
                        >
                            <ArrowRight className="-rotate-45" size={24} />
                            <span className="font-medium">Debit (Withdrawal)</span>
                        </button>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Amount</label>
                        <div className="relative">
                            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xl focus:outline-none focus:border-indigo-500"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="1"
                            />
                        </div>
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Remarks</label>
                        <textarea
                            placeholder="Reason for adjustment..."
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 h-24"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        ></textarea>
                    </div>

                    {/* Feedback */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2 text-sm">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2 text-sm">
                            <CheckCircle size={16} /> {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !selectedUser || !amount}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Confirm Transaction'}
                    </button>
                </form>
            </div>
        </div>
    );
}
