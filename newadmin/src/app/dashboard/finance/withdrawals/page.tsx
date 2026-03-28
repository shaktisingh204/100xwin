"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getTransactions, approveWithdrawal, rejectWithdrawal } from '@/actions/finance';
import {
    Clock, CheckCircle, XCircle, RefreshCcw, ChevronLeft, ChevronRight,
    Loader2, Search, Landmark, Smartphone, Bitcoin,
    Copy, Check, Eye, User, Receipt,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtAmt = (n: number, currency?: string) => {
    if (currency === 'USD' || currency === 'CRYPTO') return `$${n.toFixed(2)}`;
    return fmtINR(n);
};

function CopyBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="ml-1.5 text-slate-500 hover:text-slate-200 transition-colors"
            title="Copy"
        >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
    );
}

// ─── Method normaliser ──────────────────────────────────────────────────────
function resolveMethod(details: any, paymentMethod?: string | null): string {
    if (details?.method) return (details.method as string).toUpperCase();
    const pm = (paymentMethod || '').toLowerCase();
    if (pm.includes('upi') || pm.includes('gateway')) return 'UPI';
    if (pm.includes('bank') || pm.includes('neft') || pm.includes('imps')) return 'BANK';
    if (pm.includes('crypto') || pm.includes('bitcoin') || pm.includes('now')) return 'CRYPTO';
    return '';
}

// ─── Payment Details Panel ───────────────────────────────────────────────────

function PaymentDetails({ details, paymentMethod }: { details: any; paymentMethod?: string | null }) {
    if (!details || typeof details !== 'object') {
        if (paymentMethod) {
            return <span className="text-xs text-slate-400">{paymentMethod}</span>;
        }
        return <span className="text-slate-500 text-xs">N/A</span>;
    }

    const method = resolveMethod(details, paymentMethod);

    const holderName = details.holderName || details.acctName || details.receive_name || '—';
    const upiId = details.upiId || details.acctNo || details.receive_account || null;
    const accountNo = details.accountNo || details.acctNo || null;
    const ifsc = details.ifsc || details.acctCode || null;
    const bankName = details.bankName || null;

    if (method === 'UPI') {
        return (
            <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full mb-1">
                    <Smartphone size={9} /> UPI
                </span>
                <div className="text-xs space-y-0.5">
                    <p><span className="text-slate-500">Name:</span> <span className="text-white font-medium">{holderName}</span></p>
                    <p className="flex items-center">
                        <span className="text-slate-500">UPI ID:</span>
                        <span className="text-green-300 font-mono ml-1">{upiId || '—'}</span>
                        {upiId && <CopyBtn text={upiId} />}
                    </p>
                </div>
            </div>
        );
    }

    if (method === 'BANK') {
        return (
            <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full mb-1">
                    <Landmark size={9} /> Bank Transfer
                </span>
                <div className="text-xs space-y-0.5">
                    <p><span className="text-slate-500">Name:</span> <span className="text-white font-medium">{holderName}</span></p>
                    {bankName && <p><span className="text-slate-500">Bank:</span> <span className="text-white">{bankName}</span></p>}
                    <p className="flex items-center">
                        <span className="text-slate-500">Acc:</span>
                        <span className="text-blue-300 font-mono ml-1">{accountNo || '—'}</span>
                        {accountNo && <CopyBtn text={accountNo} />}
                    </p>
                    <p className="flex items-center">
                        <span className="text-slate-500">IFSC:</span>
                        <span className="text-blue-300 font-mono ml-1 uppercase">{ifsc || '—'}</span>
                        {ifsc && <CopyBtn text={ifsc} />}
                    </p>
                </div>
            </div>
        );
    }

    if (method === 'CRYPTO') {
        return (
            <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full mb-1">
                    <Bitcoin size={9} /> {details.coinLabel || 'Crypto'} ({details.network || ''})
                </span>
                <div className="text-xs">
                    <p className="flex items-center gap-1">
                        <span className="text-slate-500">Address:</span>
                        <span className="text-orange-300 font-mono break-all ml-1 max-w-[200px] text-[10px]">{details.address || '—'}</span>
                        {details.address && <CopyBtn text={details.address} />}
                    </p>
                    <p><span className="text-slate-500">Coin:</span> <span className="text-white ml-1">{details.coin || '—'}</span></p>
                </div>
            </div>
        );
    }

    return (
        <span className="text-slate-400 text-xs">{paymentMethod || 'Manual'}</span>
    );
}

// ─── Detail Drawer ───────────────────────────────────────────────────────────

type WithdrawalTx = {
    id: number;
    amount: number;
    status: string;
    createdAt: Date | string;
    paymentMethod: string | null;
    transactionId: string | null;
    utr: string | null;
    remarks: string | null;
    paymentDetails: any;
    user: { username: string | null; email: string | null; phoneNumber: string | null };
};

function DetailDrawer({ tx, onClose }: { tx: WithdrawalTx; onClose: () => void }) {
    const d = tx.paymentDetails || {};
    const isCrypto = (d.method || '').toUpperCase() === 'CRYPTO';
    const currency = d.currency || (isCrypto ? 'USD' : 'INR');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div
                className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-2xl sm:p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Eye size={18} className="text-amber-400" /> Withdrawal #{tx.id}
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <XCircle size={20} />
                    </button>
                </div>

                <div className="space-y-4 text-sm">
                    {/* User */}
                    <div className="bg-slate-900/60 rounded-xl p-3 space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">User</p>
                        <p className="flex items-center gap-2 text-white font-medium">
                            <User size={14} className="text-slate-400" /> {tx.user?.username || '—'}
                        </p>
                        <p className="text-slate-400 text-xs ml-5">{tx.user?.email}</p>
                        {tx.user?.phoneNumber && <p className="text-slate-400 text-xs ml-5">{tx.user.phoneNumber}</p>}
                    </div>

                    {/* Amount */}
                    <div className="bg-slate-900/60 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Amount</p>
                        <p className="text-2xl font-bold text-red-400">{fmtAmt(tx.amount, currency)}</p>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-slate-900/60 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Payment Details</p>
                        <PaymentDetails details={tx.paymentDetails} paymentMethod={tx.paymentMethod} />
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-900/60 p-3 text-xs sm:grid-cols-2">
                        <div>
                            <p className="text-slate-500">Requested</p>
                            <p className="text-white">{new Date(tx.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Status</p>
                            <p className={`font-bold ${tx.status === 'PENDING' ? 'text-amber-400' : tx.status === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tx.status}
                            </p>
                        </div>
                        {tx.transactionId && (
                            <div className="col-span-2">
                                <p className="text-slate-500">Transaction ID</p>
                                <p className="text-emerald-300 font-mono flex items-center gap-1">
                                    {tx.transactionId} <CopyBtn text={tx.transactionId} />
                                </p>
                            </div>
                        )}
                        {tx.remarks && (
                            <div className="col-span-2">
                                <p className="text-slate-500">Remarks</p>
                                <p className="text-white">{tx.remarks}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Approve Modal ───────────────────────────────────────────────────────────

function ApproveModal({
    tx,
    onConfirm,
    onClose,
    loading,
}: {
    tx: WithdrawalTx;
    onConfirm: (txnId: string) => void;
    onClose: () => void;
    loading: boolean;
}) {
    const [txnId, setTxnId] = useState('');
    const d = tx.paymentDetails || {};
    const isCrypto = (d.method || '').toUpperCase() === 'CRYPTO';
    const currency = d.currency || (isCrypto ? 'USD' : 'INR');

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
            <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-2xl sm:p-6">
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-400" /> Approve Withdrawal
                </h3>

                {/* Summary */}
                <div className="mt-3 mb-4 bg-slate-900/60 rounded-xl p-3 text-sm space-y-1">
                    <p className="text-slate-400">User: <span className="text-white font-medium">{tx.user?.username || '—'}</span></p>
                    <p className="text-slate-400">Amount: <span className="text-red-400 font-bold">{fmtAmt(tx.amount, currency)}</span></p>
                    <div className="pt-1">
                        <PaymentDetails details={tx.paymentDetails} paymentMethod={tx.paymentMethod} />
                    </div>
                </div>

                {/* Transaction ID field */}
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Transaction ID / UTR / Reference <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <div className="relative">
                    <Receipt size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm font-mono focus:border-emerald-500 focus:outline-none placeholder-slate-600"
                        placeholder="e.g. UTR123456789 or TXID_abc…"
                        value={txnId}
                        onChange={e => setTxnId(e.target.value)}
                        autoFocus
                    />
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">This will be shown to the user in their transaction history and sent as a notification.</p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-700 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(txnId.trim())}
                        disabled={loading}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Confirm Approve
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function WithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<WithdrawalTx[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [viewTx, setViewTx] = useState<WithdrawalTx | null>(null);
    // Approve modal state
    const [showApproveModal, setShowApproveModal] = useState<WithdrawalTx | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getTransactions(page, 15, search, statusFilter !== 'ALL' ? statusFilter : '', 'WITHDRAWAL');
            setWithdrawals(data.transactions as WithdrawalTx[]);
            setPagination(data.pagination);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        const t = setTimeout(fetchData, 300);
        return () => clearTimeout(t);
    }, [fetchData]);

    const handleApprove = async (id: number, txnId: string) => {
        setActionLoading(id);
        const res = await approveWithdrawal(id, 1, 'Approved by admin', txnId || undefined);
        if (res.success) {
            showToast('Withdrawal approved — user notified.', 'success');
            fetchData();
            setSelectedIds(ids => ids.filter(i => i !== id));
        } else {
            showToast(res.error || 'Failed to approve', 'error');
        }
        setActionLoading(null);
        setShowApproveModal(null);
    };

    const handleReject = async (id: number, reason: string) => {
        setActionLoading(id);
        const res = await rejectWithdrawal(id, 1, reason || 'Rejected by admin');
        if (res.success) {
            showToast('Withdrawal rejected — funds refunded.', 'success');
            fetchData();
            setSelectedIds(ids => ids.filter(i => i !== id));
        } else {
            showToast(res.error || 'Failed to reject', 'error');
        }
        setActionLoading(null);
        setShowRejectModal(null);
        setRejectReason('');
    };

    const handleBulkApprove = async () => {
        if (!selectedIds.length) return;
        setBulkLoading(true);
        let ok = 0;
        for (const id of selectedIds) {
            const res = await approveWithdrawal(id, 1, 'Bulk approved by admin');
            if (res.success) ok++;
        }
        showToast(`Approved ${ok} of ${selectedIds.length} withdrawals.`, ok === selectedIds.length ? 'success' : 'error');
        setSelectedIds([]);
        fetchData();
        setBulkLoading(false);
    };

    const toggleSelect = (id: number) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const toggleAll = () =>
        setSelectedIds(prev => prev.length === withdrawals.length ? [] : withdrawals.map(w => w.id));

    const pendingList = withdrawals.filter(w => w.status === 'PENDING');
    const totalPendingAmt = pendingList.reduce((s, w) => s + w.amount, 0);

    const methodBadge = (details: any, paymentMethod?: string | null) => {
        const m = resolveMethod(details, paymentMethod);
        if (m === 'UPI') return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                <Smartphone size={9} /> UPI
            </span>
        );
        if (m === 'BANK') return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                <Landmark size={9} /> Bank
            </span>
        );
        if (m === 'CRYPTO') return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                <Bitcoin size={9} /> {details?.coinLabel || 'Crypto'}
            </span>
        );
        return <span className="text-slate-500 text-xs">—</span>;
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
        const cls = map[status] || 'bg-slate-700 text-slate-400 border-slate-600';
        const Icon = status === 'APPROVED' ? CheckCircle : status === 'REJECTED' ? XCircle : Clock;
        return (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-1.5 py-0.5 rounded-full ${cls}`}>
                <Icon size={9} /> {status}
            </span>
        );
    };

    return (
        <div className="space-y-6 pb-24">
            {/* Toast */}
            {toast && (
                <div className={`fixed left-4 right-4 top-4 z-50 flex items-center gap-3 rounded-xl border px-5 py-3 text-sm font-medium shadow-lg transition-all sm:left-auto sm:right-6 sm:top-6 ${toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-300' : 'bg-red-900/90 border-red-500/40 text-red-300'}`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Detail Drawer */}
            {viewTx && <DetailDrawer tx={viewTx} onClose={() => setViewTx(null)} />}

            {/* Approve Modal */}
            {showApproveModal && (
                <ApproveModal
                    tx={showApproveModal}
                    onConfirm={(txnId) => handleApprove(showApproveModal.id, txnId)}
                    onClose={() => setShowApproveModal(null)}
                    loading={actionLoading === showApproveModal.id}
                />
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
                    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-2xl sm:p-6">
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <XCircle size={20} className="text-red-400" /> Reject Withdrawal
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">Provide a reason. The funds will be automatically refunded to the user&apos;s wallet.</p>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm h-24 resize-none focus:border-red-500 focus:outline-none"
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                        />
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <button
                                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                                className="flex-1 py-2 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-700 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(showRejectModal, rejectReason)}
                                disabled={!rejectReason.trim() || actionLoading === showRejectModal}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === showRejectModal ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                Confirm Reject &amp; Refund
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Clock size={28} className="text-amber-400" /> Withdrawals
                    </h1>
                    <p className="text-slate-400 mt-1">Review and approve or reject user withdrawal requests.</p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                    {statusFilter === 'PENDING' && pendingList.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-center">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Pending Total</p>
                            <p className="text-lg font-bold text-amber-400">{fmtINR(totalPendingAmt)}</p>
                        </div>
                    )}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Count</p>
                        <p className="text-lg font-bold text-white">{pagination.total}</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-slate-300 transition-colors hover:bg-slate-700"
                        title="Refresh"
                    >
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search by username or email..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-sm"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setPage(1); }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${statusFilter === s
                                ? s === 'PENDING' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                    : s === 'APPROVED' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                        : s === 'REJECTED' ? 'bg-red-500/15 border-red-500/40 text-red-400'
                                            : 'bg-slate-600 border-slate-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-[1080px] w-full text-sm text-left">
                        <thead className="bg-slate-900/60 uppercase text-[10px] text-slate-500 font-bold tracking-wider">
                            <tr>
                                {statusFilter === 'PENDING' && (
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === withdrawals.length && withdrawals.length > 0}
                                            onChange={toggleAll}
                                            className="rounded accent-amber-500"
                                        />
                                    </th>
                                )}
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Method</th>
                                <th className="px-4 py-3">Payment Details</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Txn ID</th>
                                <th className="px-4 py-3">Requested</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-14 text-center">
                                        <Loader2 className="animate-spin inline text-amber-400" size={28} />
                                        <p className="text-slate-500 text-sm mt-2">Loading withdrawals…</p>
                                    </td>
                                </tr>
                            ) : withdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-14 text-center">
                                        <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                                        <p className="font-medium text-slate-300">All clear!</p>
                                        <p className="text-sm text-slate-500">No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} withdrawal requests.</p>
                                    </td>
                                </tr>
                            ) : (
                                withdrawals.map(tx => {
                                    const isCrypto = (tx.paymentDetails?.method || '').toUpperCase() === 'CRYPTO';
                                    const currency = tx.paymentDetails?.currency || (isCrypto ? 'USD' : 'INR');
                                    const isPending = tx.status === 'PENDING';
                                    return (
                                        <tr
                                            key={tx.id}
                                            className={`hover:bg-slate-700/20 transition-colors ${selectedIds.includes(tx.id) ? 'bg-amber-500/5' : ''}`}
                                        >
                                            {statusFilter === 'PENDING' && (
                                                <td className="px-4 py-4">
                                                    {isPending && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(tx.id)}
                                                            onChange={() => toggleSelect(tx.id)}
                                                            className="rounded accent-amber-500"
                                                        />
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-4">
                                                <p className="text-white font-medium">{tx.user?.username || '—'}</p>
                                                <p className="text-[11px] text-slate-500">{tx.user?.email}</p>
                                                {tx.user?.phoneNumber && (
                                                    <p className="text-[11px] text-slate-500">{tx.user.phoneNumber}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-red-400 font-mono font-bold text-base">
                                                    {fmtAmt(tx.amount, currency)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {methodBadge(tx.paymentDetails, tx.paymentMethod)}
                                            </td>
                                            <td className="px-4 py-4 max-w-[240px]">
                                                <PaymentDetails details={tx.paymentDetails} paymentMethod={tx.paymentMethod} />
                                            </td>
                                            <td className="px-4 py-4">
                                                {statusBadge(tx.status)}
                                                {tx.remarks && (
                                                    <p className="text-[10px] text-slate-500 mt-0.5 max-w-[120px] truncate" title={tx.remarks}>
                                                        {tx.remarks}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {tx.transactionId
                                                    ? <span className="text-emerald-300 font-mono text-[11px] flex items-center gap-1">
                                                        {tx.transactionId} <CopyBtn text={tx.transactionId} />
                                                    </span>
                                                    : <span className="text-slate-600 text-xs">—</span>
                                                }
                                            </td>
                                            <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                                                {new Date(tx.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* View details */}
                                                    <button
                                                        onClick={() => setViewTx(tx)}
                                                        className="p-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={13} />
                                                    </button>
                                                    {/* Approve — opens modal */}
                                                    {isPending && (
                                                        <button
                                                            onClick={() => setShowApproveModal(tx)}
                                                            disabled={actionLoading === tx.id}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                            title="Approve"
                                                        >
                                                            {actionLoading === tx.id
                                                                ? <Loader2 size={11} className="animate-spin" />
                                                                : <CheckCircle size={11} />
                                                            }
                                                            Approve
                                                        </button>
                                                    )}
                                                    {/* Reject */}
                                                    {isPending && (
                                                        <button
                                                            onClick={() => setShowRejectModal(tx.id)}
                                                            disabled={actionLoading === tx.id}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={11} /> Reject
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && withdrawals.length > 0 && (
                    <div className="flex flex-col gap-3 border-t border-slate-700 px-4 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 hover:bg-slate-700 rounded-lg disabled:opacity-40 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-white font-medium px-1">
                                {page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                                className="p-1.5 hover:bg-slate-700 rounded-lg disabled:opacity-40 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-slate-900 px-4 py-4 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:flex-row sm:items-center sm:gap-5 sm:rounded-full sm:px-6 sm:py-3 sm:-translate-x-1/2">
                    <span className="text-white font-bold text-sm">{selectedIds.length} Selected</span>
                    <div className="hidden h-4 w-px bg-slate-700 sm:block" />
                    <button
                        onClick={handleBulkApprove}
                        disabled={bulkLoading}
                        className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                        Approve All
                    </button>
                    <button
                        onClick={() => setSelectedIds([])}
                        className="text-left text-sm text-slate-400 transition-colors hover:text-white"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
