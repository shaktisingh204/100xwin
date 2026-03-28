"use client";

import React from 'react';
import {
    UserCheck, Ban, Wallet, CreditCard, Calendar, Globe, Coins,
    TrendingUp, Gift, Shield, Edit2, BadgePercent
} from 'lucide-react';

interface UserProfileHeaderProps {
    user: any;
    onEditClick: () => void;
    onBanToggle: () => void;
    banLoading?: boolean;
}

function StatCard({ icon: Icon, label, value, color = 'text-white' }: { icon: any; label: string; value: string; color?: string }) {
    return (
        <div className="space-y-1">
            <span className="text-xs text-slate-500 flex items-center gap-1">
                <Icon size={11} /> {label}
            </span>
            <p className={`text-lg font-bold ${color} leading-tight`}>{value}</p>
        </div>
    );
}

function WageringBar({ label, done, required }: { label: string; done: number; required: number }) {
    if (!required || required <= 0) return null;
    const pct = Math.min(100, Math.round((done / required) * 100));
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
                <span>{label}</span>
                <span>{pct}% ({done.toFixed(0)}/{required.toFixed(0)})</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function fmtCurrency(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    TECH_MASTER: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    MANAGER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    MASTER: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    AGENT: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    USER: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
};

export default function UserProfileHeader({ user, onEditClick, onBanToggle, banLoading }: UserProfileHeaderProps) {
    const currency = user.currency || 'INR';
    const fmt = (n: number) => fmtCurrency(n, currency);
    const roleClass = ROLE_COLORS[user.role] || ROLE_COLORS.USER;

    const hasWageringBonus = (user.wageringRequired ?? 0) > 0;
    const hasDepositWagering = (user.depositWageringRequired ?? 0) > 0;

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* Banned warning banner */}
            {user.isBanned && (
                <div className="flex items-center gap-3 bg-red-500/10 border-b border-red-500/20 px-4 py-3 sm:px-6">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 shrink-0">
                        <Ban size={18} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-red-400">This user is banned</p>
                        <p className="text-xs text-red-400/70">All login and API access is blocked. Unban to restore access.</p>
                    </div>
                </div>
            )}
            {/* Top strip: avatar + name + actions */}
            <div className="flex flex-col items-start gap-5 p-4 sm:p-6 md:flex-row">
                {/* Avatar */}
                <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 flex items-center justify-center text-3xl font-bold text-indigo-300 border border-indigo-500/20">
                        {user.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-slate-800 flex items-center justify-center ${user.isBanned ? 'bg-red-500' : 'bg-emerald-500'}`} />
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">{user.username}</h1>
                        <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${user.isBanned ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} flex items-center gap-1`}>
                            {user.isBanned ? <Ban size={10} /> : <UserCheck size={10} />}
                            {user.isBanned ? 'Banned' : 'Active'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${roleClass}`}>
                            {user.role}
                        </span>
                        {user.kycStatus && (
                            <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${user.kycStatus === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : user.kycStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                                KYC: {user.kycStatus}
                            </span>
                        )}
                    </div>
                    <p className="break-all text-sm text-slate-400 sm:truncate">{user.email} {user.phoneNumber && `• ${user.phoneNumber}`}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                        {user.country && (
                            <span className="flex items-center gap-1"><Globe size={11} />{user.country}</span>
                        )}
                        <span className="flex items-center gap-1"><Coins size={11} />{currency}</span>
                        <span className="flex items-center gap-1"><Calendar size={11} />Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {user.manager && (
                            <span className="flex items-center gap-1 text-indigo-400"><Shield size={11} />Manager: {user.manager.username}</span>
                        )}
                        {user.referrer && (
                            <span className="flex items-center gap-1"><BadgePercent size={11} />Referred by: {user.referrer.username}</span>
                        )}
                        <span className="flex items-center gap-1">ID: #{user.id}</span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                    <button
                        onClick={onEditClick}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:w-auto"
                    >
                        <Edit2 size={14} /> Edit
                    </button>
                    <button
                        onClick={onBanToggle}
                        disabled={banLoading}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 sm:w-auto ${user.isBanned
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                    >
                        {user.isBanned ? <UserCheck size={14} /> : <Ban size={14} />}
                        {banLoading ? '...' : user.isBanned ? 'Unban' : 'Ban'}
                    </button>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 gap-4 border-t border-slate-700/60 px-4 py-4 sm:grid-cols-2 sm:gap-5 sm:px-6 lg:grid-cols-6">
                <StatCard icon={Wallet} label="Fiat Balance" value={fmt(user.balance ?? 0)} color="text-white" />
                <StatCard icon={Coins} label="Crypto Balance" value={fmt(user.cryptoBalance ?? 0)} color="text-amber-300" />
                <StatCard icon={Shield} label="Exposure" value={fmt(user.exposure ?? 0)} color="text-red-400" />
                <StatCard icon={Gift} label="Fiat Bonus" value={fmt(user.fiatBonus ?? 0)} color="text-emerald-400" />
                <StatCard icon={TrendingUp} label="Total Deposited" value={fmt(user.totalDeposited ?? 0)} color="text-indigo-400" />
                <StatCard icon={CreditCard} label="Total Wagered" value={fmt(user.totalWagered ?? 0)} color="text-purple-400" />
            </div>

            {/* Wagering bars */}
            {(hasWageringBonus || hasDepositWagering) && (
                <div className="space-y-3 border-t border-slate-700/60 px-4 py-4 sm:px-6">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Wagering Progress</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {hasWageringBonus && (
                            <WageringBar
                                label="Bonus Wagering"
                                done={user.wageringDone ?? 0}
                                required={user.wageringRequired ?? 0}
                            />
                        )}
                        {hasDepositWagering && (
                            <WageringBar
                                label="Deposit Wagering"
                                done={user.depositWageringDone ?? 0}
                                required={user.depositWageringRequired ?? 0}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
