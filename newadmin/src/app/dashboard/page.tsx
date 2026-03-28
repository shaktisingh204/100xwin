"use client";

import React, { useEffect, useState } from 'react';
import { getDashboardStats, getWeeklyRevenueData, getBetStats } from '@/actions/dashboard';
import Link from 'next/link';
import {
    Loader2, TrendingUp, Users, DollarSign, Clock, Bell, AlertTriangle,
    CheckCircle, ArrowUpRight, ArrowDownRight, RefreshCcw,
    UserPlus, Wallet, Shield, CreditCard, Target, Zap, Activity,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
    title, value, sub, icon: Icon, color, bg, href, alert = false, trend
}: {
    title: string; value: string; sub: string; icon: any;
    color: string; bg: string; href?: string; alert?: boolean;
    trend?: { value: string; positive: boolean };
}) {
    const inner = (
        <div className={`p-5 bg-slate-800 rounded-xl border transition-all group relative overflow-hidden
            ${alert ? 'border-amber-500/40 hover:border-amber-400/60' : 'border-slate-700 hover:border-indigo-500/40'}`}>
            {/* Background glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${bg} blur-xl`} />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-lg ${bg}`}>
                        <Icon size={20} className={color} />
                    </div>
                    {href && <ArrowUpRight size={15} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />}
                </div>
                <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                <p className="text-slate-400 text-xs font-medium mt-0.5">{title}</p>
                <div className="flex items-center justify-between mt-2">
                    <p className={`text-xs font-semibold ${alert ? 'text-amber-400' : 'text-slate-500'}`}>{sub}</p>
                    {trend && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend.positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                            {trend.positive ? '↑' : '↓'} {trend.value}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Mini Stat Row ────────────────────────────────────────────────────────────

function MiniStat({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
            <span className="text-xs text-slate-400">{label}</span>
            <span className={`text-xs font-bold ${color}`}>{value}</span>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [bets, setBets] = useState<any>(null);
    const [chartData, setChart] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [s, b, chart] = await Promise.all([
                getDashboardStats(),
                getBetStats(),
                getWeeklyRevenueData(),
            ]);
            if (s.success) setStats(s.data);
            if (b.success) setBets(b.data);
            setChart(chart);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto mb-3" size={40} />
                    <p className="text-slate-400 text-sm">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const d = stats || {};

    return (
        <div className="space-y-4 sm:space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button onClick={load}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 sm:w-auto">
                    <RefreshCcw size={13} /> Refresh
                </button>
            </div>

            {/* ── 4 Main KPI Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KPICard
                    title="Gross Gaming Revenue"
                    value={fmt(d.ggr ?? 0)}
                    sub="Total deposits minus payouts"
                    icon={TrendingUp}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                    trend={d.ggr > 0
                        ? { value: 'Positive', positive: true }
                        : { value: 'Negative', positive: false }}
                />
                <KPICard
                    title="Total Users"
                    value={fmtNum(d.totalUsers ?? 0)}
                    sub={`+${d.newTodayUsers ?? 0} new today · +${d.newWeekUsers ?? 0} this week`}
                    icon={Users}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                    href="/dashboard/users"
                    trend={{ value: `+${d.newTodayUsers ?? 0} today`, positive: true }}
                />
                <KPICard
                    title="Total Deposits"
                    value={fmt(d.totalDeposits ?? 0)}
                    sub={`${fmtNum(d.depositCount ?? 0)} transactions · ${fmt(d.todayDeposits ?? 0)} today`}
                    icon={DollarSign}
                    color="text-violet-400"
                    bg="bg-violet-500/10"
                    href="/dashboard/finance/deposits"
                />
                <KPICard
                    title="Pending Withdrawals"
                    value={String(d.pendingWithdrawals ?? 0)}
                    sub={`${fmt(d.pendingWithdrawalsAmount ?? 0)} awaiting approval`}
                    icon={Clock}
                    color="text-amber-400"
                    bg="bg-amber-500/10"
                    href="/dashboard/finance/withdrawals"
                    alert={(d.pendingWithdrawals ?? 0) > 0}
                />
            </div>

            {/* ── Secondary Stats Row ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'Active Users', value: fmtNum(d.activeUsers ?? 0), icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Total Withdrawals', value: fmt(d.totalWithdrawals ?? 0), icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/10' },
                    { label: 'Today Deposits', value: fmt(d.todayDeposits ?? 0), icon: ArrowDownRight, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                    { label: 'Active Bets', value: fmtNum(bets?.pendingBets ?? 0), icon: Target, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                ].map(s => (
                    <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${s.bg} flex-shrink-0`}>
                            <s.icon size={16} className={s.color} />
                        </div>
                        <div>
                            <p className="text-white font-bold text-base">{s.value}</p>
                            <p className="text-slate-400 text-[11px]">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Chart + Side Panels ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Revenue Chart */}
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 sm:p-5 lg:col-span-2">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="text-base font-bold text-white">Revenue Overview</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Last 7 days — Deposits vs Withdrawals</p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />Deposits</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Withdrawals</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />GGR</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="wdGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="ggrGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
                                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 12 }}
                                formatter={(value: any) => [fmt(Number(value ?? 0)), '']}
                            />
                            <Area type="monotone" dataKey="deposits" stroke="#6366f1" strokeWidth={2} fill="url(#depGrad)" name="Deposits" />
                            <Area type="monotone" dataKey="withdrawals" stroke="#ef4444" strokeWidth={2} fill="url(#wdGrad)" name="Withdrawals" />
                            <Area type="monotone" dataKey="ggr" stroke="#10b981" strokeWidth={2} fill="url(#ggrGrad)" name="GGR" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Right Panels */}
                <div className="space-y-4">
                    {/* Pending Action Alert */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                            <Bell size={15} className="text-amber-400" /> Pending Actions
                        </h3>
                        {(d.pendingWithdrawals ?? 0) > 0 ? (
                            <Link href="/dashboard/finance/withdrawals"
                                className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 transition-colors hover:bg-amber-500/15 sm:items-center">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={13} className="text-amber-400" />
                                    <div>
                                        <p className="text-sm text-amber-300 font-semibold">{d.pendingWithdrawals} Withdrawals</p>
                                        <p className="text-xs text-amber-400/70">{fmt(d.pendingWithdrawalsAmount ?? 0)} pending</p>
                                    </div>
                                </div>
                                <ArrowUpRight size={14} className="text-amber-400" />
                            </Link>
                        ) : (
                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400" /> All clear — nothing pending
                            </p>
                        )}
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                            <Wallet size={15} className="text-violet-400" /> Financials
                        </h3>
                        <MiniStat label="Gross Gaming Revenue" value={fmt(d.ggr ?? 0)} color={(d.ggr ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                        <MiniStat label="Total Deposits" value={fmt(d.totalDeposits ?? 0)} color="text-indigo-400" />
                        <MiniStat label="Today Deposits" value={fmt(d.todayDeposits ?? 0)} color="text-blue-400" />
                        <MiniStat label="Total Withdrawals" value={fmt(d.totalWithdrawals ?? 0)} color="text-red-400" />
                        <MiniStat label="Today Withdrawals" value={fmt(d.todayWithdrawals ?? 0)} color="text-orange-400" />
                    </div>

                    {/* User & Bet Stats */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                            <UserPlus size={15} className="text-blue-400" /> Users & Bets
                        </h3>
                        <MiniStat label="Total Users" value={fmtNum(d.totalUsers ?? 0)} />
                        <MiniStat label="Active Users" value={fmtNum(d.activeUsers ?? 0)} color="text-emerald-400" />
                        <MiniStat label="New Today" value={`+${d.newTodayUsers ?? 0}`} color="text-blue-400" />
                        <MiniStat label="Total Bets" value={fmtNum(bets?.totalBets ?? 0)} />
                        <MiniStat label="Active Bets" value={fmtNum(bets?.pendingBets ?? 0)} color="text-sky-400" />
                        <MiniStat label="Bet Volume" value={fmt(bets?.betVolume ?? 0)} color="text-violet-400" />
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                    { href: '/dashboard/users', label: 'Users', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { href: '/dashboard/finance/withdrawals', label: 'Approvals', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { href: '/dashboard/finance/adjustments', label: 'Adjust Bal', icon: Wallet, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                    { href: '/dashboard/casino/games', label: 'Casino', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { href: '/dashboard/cms/vip-applications', label: 'VIP', icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    { href: '/dashboard/finance/transactions', label: 'Transactions', icon: CreditCard, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                ].map(a => (
                    <Link key={a.href} href={a.href}
                        className="flex flex-col items-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-center transition-all hover:border-slate-500 group">
                        <div className={`p-2 rounded-lg ${a.bg} group-hover:scale-110 transition-transform`}>
                            <a.icon size={16} className={a.color} />
                        </div>
                        <span className="text-xs text-slate-400 group-hover:text-white transition-colors">{a.label}</span>
                    </Link>
                ))}
            </div>

            {/* ── Recent Transactions ─────────────────────────────────────── */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="flex flex-col gap-2 border-b border-slate-700 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <CreditCard size={16} className="text-indigo-400" /> Recent Transactions
                    </h3>
                    <Link href="/dashboard/finance/transactions" className="text-xs text-indigo-400 hover:text-indigo-300">
                        View All →
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-[640px] w-full text-sm">
                        <thead>
                            <tr className="text-[10px] text-slate-500 uppercase bg-slate-900/40 border-b border-slate-700">
                                <th className="px-4 py-3 text-left sm:px-5">User</th>
                                <th className="px-4 py-3 text-left sm:px-5">Type</th>
                                <th className="px-4 py-3 text-left sm:px-5">Amount</th>
                                <th className="px-4 py-3 text-left sm:px-5">Status</th>
                                <th className="px-4 py-3 text-left sm:px-5">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/40">
                            {(!d.recentTransactions || d.recentTransactions.length === 0) && (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 sm:px-5">No transactions yet.</td></tr>
                            )}
                            {(d.recentTransactions || []).map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-3 sm:px-5">
                                        <div className="text-white font-medium text-xs">{tx.user?.username || 'N/A'}</div>
                                        <div className="text-slate-500 text-[10px]">{tx.user?.email || ''}</div>
                                    </td>
                                    <td className="px-4 py-3 sm:px-5">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tx.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400' :
                                                tx.type === 'WITHDRAWAL' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            {tx.type === 'DEPOSIT' ? <ArrowDownRight size={9} /> : <ArrowUpRight size={9} />}
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 font-mono font-bold text-xs sm:px-5 ${tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {fmt(tx.amount)}
                                    </td>
                                    <td className="px-4 py-3 sm:px-5">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${tx.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                                                tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                                                    tx.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-slate-700 text-slate-300'
                                            }`}>{tx.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-[10px] text-slate-400 sm:px-5">
                                        {new Date(tx.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
