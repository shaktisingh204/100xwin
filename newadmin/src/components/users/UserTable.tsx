"use client";

import React from 'react';
import { Eye, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';

interface UserTableProps {
    users: any[];
    loading: boolean;
    selectedUsers: number[];
    onToggleSelect: (userId: number) => void;
    onToggleAll: () => void;
}

export default function UserTable({ users, loading, selectedUsers, onToggleSelect, onToggleAll }: UserTableProps) {
    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading users...</div>;
    }

    if (users.length === 0) {
        return <div className="p-8 text-center text-slate-500">No users found.</div>;
    }

    const allSelected = users.length > 0 && selectedUsers.length === users.length;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-800 text-slate-200 uppercase font-medium">
                    <tr>
                        <th className="w-12 px-4 py-4 sm:px-6">
                            <button onClick={onToggleAll} className="flex items-center text-slate-400 hover:text-white">
                                {allSelected ? <CheckSquare size={20} className="text-indigo-500" /> : <Square size={20} />}
                            </button>
                        </th>
                        <th className="px-4 py-4 sm:px-6">User</th>
                        <th className="px-4 py-4 sm:px-6">Role</th>
                        <th className="px-4 py-4 text-right sm:px-6">Balance</th>
                        <th className="px-4 py-4 text-right sm:px-6">Exposure</th>
                        <th className="px-4 py-4 sm:px-6">Status</th>
                        <th className="px-4 py-4 sm:px-6">Country</th>
                        <th className="px-4 py-4 sm:px-6">Currency</th>
                        <th className="px-4 py-4 sm:px-6">Joined</th>
                        <th className="px-4 py-4 text-right sm:px-6">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {users.map((user) => {
                        const isSelected = selectedUsers.includes(user.id);
                        return (
                            <tr key={user.id} className={`transition-colors ${isSelected ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : 'hover:bg-slate-800/50'}`}>
                                <td className="px-4 py-4 sm:px-6">
                                    <button onClick={() => onToggleSelect(user.id)} className="flex items-center text-slate-400 hover:text-white">
                                        {isSelected ? <CheckSquare size={20} className="text-indigo-500" /> : <Square size={20} />}
                                    </button>
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                                            {user.username?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{user.username}</p>
                                            <p className="text-xs">{user.email || user.phoneNumber}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'TECH_MASTER' ? 'bg-purple-500/10 text-purple-400' :
                                        user.role === 'SUPER_ADMIN' ? 'bg-red-500/10 text-red-400' :
                                            user.role === 'MANAGER' ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-slate-700 text-slate-300'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right font-medium text-white sm:px-6">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(user.balance)}
                                </td>
                                <td className="px-4 py-4 text-right text-red-400 sm:px-6">
                                    {user.exposure > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(user.exposure) : '-'}
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    {/* @ts-ignore - isBanned might not be in interface yet */}
                                    {user.isBanned ? (
                                        <span className="text-red-400 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                            Banned
                                        </span>
                                    ) : (
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Active
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    {user.country ? (
                                        <span className="text-white font-medium">{user.country}</span>
                                    ) : (
                                        <span className="text-slate-600">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    {user.currency ? (
                                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs font-mono">{user.currency}</span>
                                    ) : (
                                        <span className="text-slate-600">—</span>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                                    <p className="text-white text-xs">{new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    <p className="text-slate-500 text-xs">{new Date(user.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                </td>
                                <td className="px-4 py-4 text-right sm:px-6">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link href={`/dashboard/users/${user.id}`} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="View Profile">
                                            <Eye size={16} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
