"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getTransactions, approveDeposit, rejectDeposit, searchUsersForManualDeposit, createManualDeposit } from '@/actions/finance';
import { Clock, CheckCircle, XCircle, RefreshCcw, ChevronLeft, ChevronRight,
    Loader2, Search, Copy, Check, Eye, Receipt, User, ArrowDownRight, Plus, IndianRupee,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

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

// ─── Type ────────────────────────────────────────────────────────────────────

type DepositTx = {
    id: number;
    amount: number;
    status: string;
    createdAt: Date | string;
    paymentMethod: string | null;
    transactionId: string | null;
    utr: string | null;
    remarks: string | null;
    paymentDetails: Record<string, unknown> | null;
    user: { username: string | null; email: string | null; phoneNumber: string | null };
};
type ManualDepositUser = {
    id: number;
    username: string | null;
    email: string | null;
    balance: number;
};

function resolveGatewayLabel(tx: DepositTx): string {
    if (tx.paymentMethod?.trim()) return tx.paymentMethod;

    const gateway =
        tx.paymentDetails && typeof tx.paymentDetails === 'object'
            ? String(tx.paymentDetails.gateway || '').trim()
            : '';

    if (gateway === 'manual_upi') return 'Manual UPI';
    if (gateway === 'admin_manual') return 'Manual Deposit (Admin)';
    if (gateway) return gateway.toUpperCase();
    return '—';
}

function resolveGatewaySubLabel(tx: DepositTx): string {
    const gateway =
        tx.paymentDetails && typeof tx.paymentDetails === 'object'
            ? String(tx.paymentDetails.gateway || '').trim()
            : '';

    if (!gateway) return '';
    const label = resolveGatewayLabel(tx).toLowerCase();
    return label.includes(gateway.toLowerCase()) ? '' : gateway;
}

// ─── Detail Drawer ───────────────────────────────────────────────────────────

function DetailDrawer({ tx, onClose }: { tx: DepositTx; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div
                className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-2xl sm:p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Eye size={18} className="text-emerald-400" /> Deposit #{tx.id}
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
                        <p className="text-2xl font-bold text-emerald-400">{fmtINR(tx.amount)}</p>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-slate-900/60 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Payment Info</p>
                        <p className="text-white text-xs">{resolveGatewayLabel(tx)}</p>
                        {resolveGatewaySubLabel(tx) && (
                            <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wide">{resolveGatewaySubLabel(tx)}</p>
                        )}
                        {tx.utr && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                UTR: <span className="text-emerald-300 font-mono">{tx.utr}</span>
                                <CopyBtn text={tx.utr} />
                            </p>
                        )}
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-900/60 p-3 text-xs sm:grid-cols-2">
                        <div>
                            <p className="text-slate-500">Date</p>
                            <p className="text-white">{new Date(tx.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Status</p>
                            <p className={`font-bold ${tx.status === 'PENDING' ? 'text-amber-400' : (tx.status === 'COMPLETED' || tx.status === 'APPROVED') ? 'text-emerald-400' : 'text-red-400'}`}>
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
    tx: DepositTx;
    onConfirm: (txnId: string) => void;
    onClose: () => void;
    loading: boolean;
}) {
    const [txnId, setTxnId] = useState('');

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
            <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-2xl sm:p-6">
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-400" /> Approve Deposit
                </h3>

                {/* Summary */}
                <div className="mt-3 mb-4 bg-slate-900/60 rounded-xl p-3 text-sm space-y-1">
                    <p className="text-slate-400">User: <span className="text-white font-medium">{tx.user?.username || '—'}</span></p>
                    <p className="text-slate-400">Amount: <span className="text-emerald-400 font-bold">{fmtINR(tx.amount)}</span></p>
                    {tx.utr && (
                        <p className="text-slate-400">UTR: <span className="text-emerald-300 font-mono">{tx.utr}</span></p>
                    )}
                    {resolveGatewayLabel(tx) !== '—' && (
                        <p className="text-slate-400">Method: <span className="text-white">{resolveGatewayLabel(tx)}</span></p>
                    )}
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

// ─── Manual Deposit Modal ────────────────────────────────────────────────────

function ManualDepositModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<ManualDepositUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<ManualDepositUser | null>(null);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Manual Bank Transfer');
    const [utr, setUtr] = useState('');
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSearch = useCallback(async (q: string) => {
        if (!q.trim() || q.length < 2) { setSearchResults([]); return; }
        setSearchLoading(true);
        try {
            const res = await searchUsersForManualDeposit(q, 8);
            setSearchResults(res.success ? ((res.data || []) as ManualDepositUser[]) : []);
        } catch { setSearchResults([]); }
        finally { setSearchLoading(false); }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => handleSearch(search), 400);
        return () => clearTimeout(t);
    }, [search, handleSearch]);

    const handleSubmit = async () => {
        if (!selectedUser) { setError('Please select a user'); return; }
        const numAmt = parseFloat(amount);
        if (!numAmt || numAmt <= 0) { setError('Enter a valid amount'); return; }
        setError(''); setLoading(true);
        try {
            const data = await createManualDeposit({
                userId: selectedUser.id,
                amount: numAmt,
                method,
                utr,
                remarks,
                adminId: 1,
            });
            if (data.success) {
                setSuccess(data.message || 'Deposit successful!');
                setTimeout(() => { onSuccess(); onClose(); }, 1500);
            } else {
                setError(data.error || 'Failed to process deposit');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Network error');
        }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-2xl sm:p-6" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <IndianRupee size={18} className="text-emerald-400" /> Add Manual Deposit
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><XCircle size={20} /></button>
                </div>

                <div className="space-y-4 text-sm">
                    {/* User Search */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">User</label>
                        {selectedUser ? (
                            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                                <div>
                                    <p className="text-white font-semibold">{selectedUser.username || selectedUser.email}</p>
                                    <p className="text-slate-400 text-xs">{selectedUser.email} · Balance: ₹{(selectedUser.balance || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <button onClick={() => { setSelectedUser(null); setSearch(''); }} className="text-slate-500 hover:text-white ml-3">
                                    <XCircle size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search by username or email…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
                                />
                                {searchLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />}
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 top-full mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                                        {searchResults.map((u) => (
                                            <button key={u.id} onClick={() => { setSelectedUser(u); setSearchResults([]); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left">
                                                <User size={14} className="text-slate-500 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">{u.username || u.email}</p>
                                                    <p className="text-slate-500 text-xs truncate">{u.email} · ₹{(u.balance || 0).toLocaleString('en-IN')}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₹</span>
                            <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                                placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-4 py-2.5 text-white text-lg font-bold font-mono focus:border-emerald-500 focus:outline-none" />
                        </div>
                    </div>

                    {/* Two-column: Method + UTR */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                            <select value={method} onChange={e => setMethod(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-emerald-500 focus:outline-none">
                                <option>Manual Bank Transfer</option>
                                <option>Cash</option>
                                <option>UPI</option>
                                <option>Crypto (Manual)</option>
                                <option>Agent Deposit</option>
                                <option>Adjustment</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">UTR / Ref # <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
                            <input type="text" value={utr} onChange={e => setUtr(e.target.value)} placeholder="UTR12345…"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:border-emerald-500 focus:outline-none" />
                        </div>
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Internal Remarks <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
                        <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                            placeholder="e.g. Promo credit, bank transfer received…"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-emerald-500 focus:outline-none" />
                    </div>

                    {/* Error / Success */}
                    {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
                    {success && <p className="text-emerald-400 text-xs font-medium">{success}</p>}

                    {/* Actions */}
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                        <button onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-400 rounded-xl hover:bg-slate-700 transition-colors text-sm">Cancel</button>
                        <button onClick={handleSubmit} disabled={loading || !selectedUser || !amount}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Credit Balance
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PendingDepositsPage() {
    const [deposits, setDeposits] = useState<DepositTx[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [viewTx, setViewTx] = useState<DepositTx | null>(null);
    const [showApproveModal, setShowApproveModal] = useState<DepositTx | null>(null);
    const [showManualDeposit, setShowManualDeposit] = useState(false);
    const tableColSpan = statusFilter === 'PENDING' ? 9 : 8;

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getTransactions(page, 15, search, statusFilter !== 'ALL' ? statusFilter : '', 'DEPOSIT');
            setDeposits(data.transactions as DepositTx[]);
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
        const res = await approveDeposit(id, 1, 'Approved by admin', txnId || undefined);
        if (res.success) {
            showToast(
                res.bonusApplied
                    ? `Deposit approved${res.bonusCode ? ` and bonus ${res.bonusCode} applied.` : ' and eligible bonus applied.'}`
                    : 'Deposit approved — user balance credited.',
                'success',
            );
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
        const res = await rejectDeposit(id, 1, reason || 'Rejected by admin');
        if (res.success) {
            showToast('Deposit rejected.', 'success');
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
            const res = await approveDeposit(id, 1, 'Bulk approved by admin');
            if (res.success) ok++;
        }
        showToast(`Approved ${ok} of ${selectedIds.length} deposits.`, ok === selectedIds.length ? 'success' : 'error');
        setSelectedIds([]);
        fetchData();
        setBulkLoading(false);
    };

    const toggleSelect = (id: number) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const toggleAll = () =>
        setSelectedIds(prev => prev.length === deposits.length ? [] : deposits.map(d => d.id));

    const pendingList = deposits.filter(d => d.status === 'PENDING');
    const totalPendingAmt = pendingList.reduce((s, d) => s + d.amount, 0);

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
        const cls = map[status] || 'bg-slate-700 text-slate-400 border-slate-600';
        const Icon = status === 'COMPLETED' || status === 'APPROVED' ? CheckCircle : status === 'REJECTED' ? XCircle : Clock;
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
                            <XCircle size={20} className="text-red-400" /> Reject Deposit
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">Provide a reason for rejection. No balance changes will be made.</p>
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
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Deposit Modal */}
            {showManualDeposit && (
                <ManualDepositModal
                    onClose={() => setShowManualDeposit(false)}
                    onSuccess={() => { fetchData(); showToast('Manual deposit credited successfully!', 'success'); }}
                />
            )}

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ArrowDownRight size={28} className="text-emerald-400" /> Deposit Management
                    </h1>
                    <p className="text-slate-400 mt-1">Review, approve, reject, or manually credit user deposits.</p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                    {/* Add Manual Deposit */}
                    <button
                        onClick={() => setShowManualDeposit(true)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-700"
                    >
                        <Plus size={16} /> Add Manual Deposit
                    </button>

                    {statusFilter === 'PENDING' && pendingList.length > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-center">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Pending Total</p>
                            <p className="text-lg font-bold text-emerald-400">{fmtINR(totalPendingAmt)}</p>
                        </div>
                    )}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Count</p>
                        <p className="text-lg font-bold text-white">{pagination.total}</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
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
                        placeholder="Search by username, email, or UTR..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {['PENDING', 'COMPLETED', 'REJECTED', 'ALL'].map(s => (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setPage(1); }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${statusFilter === s
                                ? s === 'PENDING' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                    : s === 'COMPLETED' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
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
                    <table className="min-w-[980px] w-full text-sm text-left">
                        <thead className="bg-slate-900/60 uppercase text-[10px] text-slate-500 font-bold tracking-wider">
                            <tr>
                                {statusFilter === 'PENDING' && (
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === deposits.length && deposits.length > 0}
                                            onChange={toggleAll}
                                            className="rounded accent-emerald-500"
                                        />
                                    </th>
                                )}
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Method</th>
                                <th className="px-4 py-3">UTR / Reference</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Txn ID</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={tableColSpan} className="px-4 py-14 text-center">
                                        <Loader2 className="animate-spin inline text-emerald-400" size={28} />
                                        <p className="text-slate-500 text-sm mt-2">Loading deposits…</p>
                                    </td>
                                </tr>
                            ) : deposits.length === 0 ? (
                                <tr>
                                    <td colSpan={tableColSpan} className="px-4 py-14 text-center">
                                        <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                                        <p className="font-medium text-slate-300">All clear!</p>
                                        <p className="text-sm text-slate-500">No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} deposit requests.</p>
                                    </td>
                                </tr>
                            ) : (
                                deposits.map(tx => {
                                    const isPending = tx.status === 'PENDING';
                                    return (
                                        <tr
                                            key={tx.id}
                                            className={`hover:bg-slate-700/20 transition-colors ${selectedIds.includes(tx.id) ? 'bg-emerald-500/5' : ''}`}
                                        >
                                            {statusFilter === 'PENDING' && (
                                                <td className="px-4 py-4">
                                                    {isPending && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(tx.id)}
                                                            onChange={() => toggleSelect(tx.id)}
                                                            className="rounded accent-emerald-500"
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
                                                <span className="text-emerald-400 font-mono font-bold text-base">
                                                    {fmtINR(tx.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div>
                                                    <span className="text-slate-300 text-xs">{resolveGatewayLabel(tx)}</span>
                                                    {resolveGatewaySubLabel(tx) && (
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{resolveGatewaySubLabel(tx)}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {tx.utr
                                                    ? <span className="text-emerald-300 font-mono text-[11px] flex items-center gap-1">
                                                        {tx.utr} <CopyBtn text={tx.utr} />
                                                    </span>
                                                    : <span className="text-slate-600 text-xs">—</span>
                                                }
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
                {!loading && deposits.length > 0 && (
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
                <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900 px-4 py-4 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:flex-row sm:items-center sm:gap-5 sm:rounded-full sm:px-6 sm:py-3 sm:-translate-x-1/2">
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
