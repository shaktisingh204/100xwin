'use client';

import React, { useState, useEffect } from 'react';
import {
    Settings, User, Lock, Shield, Wallet, ChevronRight,
    CheckCircle, XCircle, Loader2, Eye, EyeOff, Edit2,
    Mail, Phone, Calendar, AlertCircle, ExternalLink
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ─── Accordion Section Shell ─────────────────────────────────────────────────
function SettingsSection({
    icon: Icon,
    title,
    subtitle,
    iconColor = 'text-brand-gold',
    iconBg = 'bg-brand-gold/10',
    children,
    defaultOpen = false,
}: {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    iconColor?: string;
    iconBg?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-[#1a1d21] border border-white/[0.06] rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-4 p-5 hover:bg-white/[0.03] transition-colors text-left"
            >
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-white">{title}</h2>
                    <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>
                </div>
                <ChevronRight
                    size={16}
                    className={`text-white/20 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-90' : ''}`}
                />
            </button>
            {open && (
                <div className="border-t border-white/[0.06] px-5 py-5">
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Account Info Section ─────────────────────────────────────────────────────
function AccountInfo() {
    const { user } = useAuth();
    const fields = [
        { label: 'Email', value: user?.email || '–', icon: Mail },
        { label: 'Phone', value: user?.phoneNumber || '–', icon: Phone },
        { label: 'Username', value: user?.username || '–', icon: User },
        {
            label: 'Member Since',
            value: user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
                : '–',
            icon: Calendar,
        },
    ];

    return (
        <div className="space-y-3">
            {fields.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 bg-[#111316] rounded-xl px-4 py-3 border border-white/5">
                    <Icon size={14} className="text-white/30 flex-shrink-0" />
                    <span className="text-xs text-white/30 w-24 flex-shrink-0">{label}</span>
                    <span className="text-sm text-white font-medium truncate">{value}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Change Username Section ──────────────────────────────────────────────────
function ChangeUsername() {
    const { user, login } = useAuth();
    const [value, setValue] = useState(user?.username || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.username) setValue(user.username);
    }, [user?.username]);

    const handleSave = async () => {
        const trimmed = value.trim();
        if (!trimmed || trimmed === user?.username) return;
        if (trimmed.length < 3 || trimmed.length > 20) { setError('Must be 3–20 characters.'); return; }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setError('Letters, numbers, underscores only.'); return; }

        setLoading(true);
        setError('');
        try {
            const res = await api.patch('/user/username', { username: trimmed });
            if (res.data.success) {
                toast.success(`Username updated to ${res.data.username}`);
                // Refresh auth context
                try {
                    const profileRes = await api.get('/auth/profile');
                    const token = localStorage.getItem('token') || '';
                    if (token) login(token, profileRes.data);
                } catch { /* non-critical */ }
            } else {
                setError(res.data.error || 'Failed to update.');
            }
        } catch (e: any) {
            setError(e.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={e => { setValue(e.target.value); setError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                    maxLength={20}
                    placeholder="new_username"
                    className="flex-1 bg-[#111316] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-brand-gold/60 transition-all font-mono placeholder:text-white/20"
                />
                <button
                    onClick={handleSave}
                    disabled={loading || !value.trim() || value.trim() === user?.username}
                    className="px-5 py-2.5 bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-black rounded-xl transition-colors flex items-center gap-2"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Save
                </button>
            </div>
            {error && <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle size={12} />{error}</p>}
            <p className="text-[11px] text-white/20">3–20 characters · letters, numbers, underscores only</p>
        </div>
    );
}

// ─── Change Password Section ──────────────────────────────────────────────────
function ChangePassword() {
    const [form, setForm] = useState({ current: '', next: '', confirm: '' });
    const [show, setShow] = useState({ current: false, next: false, confirm: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggle = (field: keyof typeof show) => setShow(s => ({ ...s, [field]: !s[field] }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.current || !form.next || !form.confirm) { setError('All fields are required.'); return; }
        if (form.next.length < 6) { setError('New password must be at least 6 characters.'); return; }
        if (form.next !== form.confirm) { setError('New passwords do not match.'); return; }

        setLoading(true);
        setError('');
        try {
            const res = await api.patch('/user/change-password', {
                currentPassword: form.current,
                newPassword: form.next,
            });
            if (res.data.success) {
                toast.success('Password changed successfully!');
                setForm({ current: '', next: '', confirm: '' });
            } else {
                setError(res.data.error || 'Failed to change password.');
            }
        } catch (e: any) {
            setError(e.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const fields: { key: keyof typeof form; label: string; toggleKey: keyof typeof show }[] = [
        { key: 'current', label: 'Current Password', toggleKey: 'current' },
        { key: 'next', label: 'New Password', toggleKey: 'next' },
        { key: 'confirm', label: 'Confirm New Password', toggleKey: 'confirm' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map(({ key, label, toggleKey }) => (
                <div key={key} className="relative">
                    <input
                        type={show[toggleKey] ? 'text' : 'password'}
                        placeholder={label}
                        value={form[key]}
                        onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setError(''); }}
                        className="w-full bg-[#111316] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white outline-none focus:border-brand-gold/60 transition-all placeholder:text-white/20"
                    />
                    <button
                        type="button"
                        onClick={() => toggle(toggleKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                    >
                        {show[toggleKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                </div>
            ))}

            {error && <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle size={12} />{error}</p>}

            {/* Password strength hints */}
            <ul className="text-[11px] text-white/20 space-y-0.5 pl-1">
                <li className={form.next.length >= 6 ? 'text-green-400' : ''}>• At least 6 characters</li>
                <li className={form.next === form.confirm && form.confirm.length > 0 ? 'text-green-400' : ''}>• Passwords match</li>
            </ul>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-black rounded-xl transition-colors flex items-center justify-center gap-2 mt-1"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Update Password
            </button>
        </form>
    );
}

// ─── Wallet Preference Section ────────────────────────────────────────────────
function WalletPreference() {
    const { selectedWallet, setSelectedWallet, fiatBalance, cryptoBalance, fiatCurrency, activeSymbol } = useWallet();
    const [saving, setSaving] = useState(false);

    const handleSelect = async (wallet: 'fiat' | 'crypto') => {
        if (wallet === selectedWallet) return;
        setSaving(true);
        setSelectedWallet(wallet);
        try {
            await api.patch('/user/wallet-preference', { wallet });
            toast.success(`Active wallet set to ${wallet === 'fiat' ? 'Fiat' : 'Crypto'}`);
        } catch {
            toast.error('Failed to save preference');
        } finally {
            setSaving(false);
        }
    };

    const formatFiat = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: fiatCurrency, minimumFractionDigits: 2 }).format(n);
    const formatUSD = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

    const options = [
        {
            id: 'fiat' as const,
            label: 'Fiat Wallet',
            desc: `${fiatCurrency} · Deposits & withdrawals`,
            emoji: '🏦',
            balance: formatFiat(fiatBalance),
            active: selectedWallet === 'fiat',
            activeClass: 'border-brand-gold/60 bg-brand-gold/5 shadow-[0_0_16px_rgba(212,175,55,0.1)]',
            dotClass: 'bg-brand-gold shadow-[0_0_6px_rgba(212,175,55,0.6)]',
            labelClass: 'text-brand-gold',
        },
        {
            id: 'crypto' as const,
            label: 'Crypto Wallet',
            desc: 'USD · Auto-credited from crypto',
            emoji: '💎',
            balance: formatUSD(cryptoBalance),
            active: selectedWallet === 'crypto',
            activeClass: 'border-purple-500/60 bg-purple-500/5 shadow-[0_0_16px_rgba(168,85,247,0.1)]',
            dotClass: 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]',
            labelClass: 'text-purple-400',
        },
    ];

    return (
        <div className="space-y-3">
            <p className="text-xs text-white/30 mb-4">
                Choose your default active wallet. This determines which balance is shown in the header.
            </p>
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    disabled={saving}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${opt.active
                        ? opt.activeClass
                        : 'border-white/5 bg-[#111316] hover:border-white/15'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xl">{opt.emoji}</span>
                        <div className="text-left">
                            <p className={`text-sm font-bold ${opt.active ? opt.labelClass : 'text-white'}`}>{opt.label}</p>
                            <p className="text-xs text-white/30">{opt.desc}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${opt.active ? opt.labelClass : 'text-white/50'}`}>{opt.balance}</span>
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.active ? opt.dotClass : 'bg-white/10'}`} />
                    </div>
                </button>
            ))}
        </div>
    );
}

// ─── Danger Zone Section ──────────────────────────────────────────────────────
function DangerZone() {
    return (
        <div className="space-y-4">
            <p className="text-xs text-white/30 leading-relaxed">
                Account deletion is permanent and cannot be undone. All your data, transaction history, and balances will be lost. 
                To request account deletion, please contact our support team.
            </p>
            <a
                href="/support"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-bold rounded-xl transition-colors"
            >
                <ExternalLink size={14} />
                Contact Support to Delete Account
            </a>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center flex-shrink-0">
                    <Settings size={20} className="text-brand-gold" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white">Settings</h1>
                    <p className="text-xs text-white/30 mt-0.5">Manage your account preferences and security</p>
                </div>
            </div>

            {/* Sections */}
            <div className="space-y-3">
                <SettingsSection
                    icon={User}
                    title="Account Information"
                    subtitle="Your profile details and member info"
                    iconColor="text-sky-400"
                    iconBg="bg-sky-500/10"
                    defaultOpen
                >
                    <AccountInfo />
                </SettingsSection>

                <SettingsSection
                    icon={Edit2}
                    title="Change Username"
                    subtitle="Update your display name"
                    iconColor="text-green-400"
                    iconBg="bg-green-500/10"
                >
                    <ChangeUsername />
                </SettingsSection>

                <SettingsSection
                    icon={Lock}
                    title="Change Password"
                    subtitle="Keep your account secure with a strong password"
                    iconColor="text-brand-gold"
                    iconBg="bg-brand-gold/10"
                >
                    <ChangePassword />
                </SettingsSection>

                <SettingsSection
                    icon={Wallet}
                    title="Wallet Preference"
                    subtitle="Set your default active wallet for bets and balance display"
                    iconColor="text-purple-400"
                    iconBg="bg-purple-500/10"
                >
                    <WalletPreference />
                </SettingsSection>

                <SettingsSection
                    icon={Shield}
                    title="Danger Zone"
                    subtitle="Irreversible account actions"
                    iconColor="text-red-400"
                    iconBg="bg-red-500/10"
                >
                    <DangerZone />
                </SettingsSection>
            </div>
        </div>
    );
}
