"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UserCircle, LogOut, ChevronDown, Wallet, ChevronLeft, Plus } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import type { SubWalletType } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '@/components/NotificationBell';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { openLogin, openRegister, openDeposit } = useModal();
    const { logout, isAuthenticated } = useAuth();

    const {
        selectedWallet,
        selectedSubWallet,
        setSelectedSubWallet,
        fiatBalance,
        fiatCurrency,
        cryptoBalance,
        casinoBonus,
        sportsBonus,
        cryptoBonus,
        activeBalance,
    } = useWallet();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatFiat = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: fiatCurrency, minimumFractionDigits: 2 }).format(amount);

    const formatUSD = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

    const formatActive = (amount: number) =>
        selectedWallet === 'crypto' ? formatUSD(amount) : formatFiat(amount);

    // ── Sub-wallet config ──
    interface SubWalletMeta {
        id: SubWalletType;
        label: string;
        emoji: string;
        balance: number;
        note: string;
        color: 'gold' | 'purple' | 'blue' | 'green';
    }

    const fiatWallets: SubWalletMeta[] = [
        { id: 'fiat-main',   label: 'Main Wallet',  emoji: '🏦', balance: fiatBalance,  note: `${fiatCurrency} · Deposits & withdrawals`, color: 'gold' },
        { id: 'fiat-casino', label: 'Casino Bonus', emoji: '🎰', balance: casinoBonus,  note: `${fiatCurrency} · Casino play only`,        color: 'blue' },
        { id: 'fiat-sports', label: 'Sports Bonus', emoji: '⚽', balance: sportsBonus,  note: `${fiatCurrency} · Sports bets only`,        color: 'green' },
    ];

    const cryptoWallets: SubWalletMeta[] = [
        { id: 'crypto-main',   label: 'Main Wallet',  emoji: '💎', balance: cryptoBalance, note: 'USD · Crypto deposits',  color: 'purple' },
        { id: 'crypto-casino', label: 'Casino Bonus', emoji: '🎰', balance: cryptoBonus,   note: 'USD · Casino play only', color: 'blue' },
        { id: 'crypto-sports', label: 'Sports Bonus', emoji: '⚽', balance: cryptoBonus,   note: 'USD · Sports bets only', color: 'green' },
    ];

    const colorMap = {
        gold:   { active: 'border-brand-gold/70 shadow-[0_0_10px_rgba(212,175,55,0.15)]', dot: 'bg-brand-gold shadow-[0_0_6px_rgba(212,175,55,0.6)]', hover: 'hover:border-brand-gold/30', bg: 'bg-bg-hover', badge: 'bg-brand-gold text-black' },
        purple: { active: 'border-purple-500/70 shadow-[0_0_10px_rgba(168,85,247,0.15)]', dot: 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]', hover: 'hover:border-purple-500/30', bg: 'bg-purple-500/5', badge: 'bg-purple-600 text-white' },
        blue:   { active: 'border-blue-400/70 shadow-[0_0_10px_rgba(96,165,250,0.15)]', dot: 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]', hover: 'hover:border-blue-400/30', bg: 'bg-blue-500/5', badge: 'bg-blue-600 text-white' },
        green:  { active: 'border-emerald-400/70 shadow-[0_0_10px_rgba(52,211,153,0.15)]', dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]', hover: 'hover:border-emerald-400/30', bg: 'bg-emerald-500/5', badge: 'bg-emerald-600 text-white' },
    };

    const allWallets = [...fiatWallets, ...cryptoWallets];
    const activeMeta = allWallets.find(w => w.id === selectedSubWallet);

    const navItems = [
        { name: 'Home', path: '/', exact: true },
        { name: 'Casino', path: '/casino' },
        { name: 'Sports', path: '/sports' },
        { name: 'Live', path: '/live-dealers' },
        { name: 'Support', path: '/support' },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 h-[56px] md:h-[60px] bg-[#0c0e12]/90 backdrop-blur-2xl z-50 flex items-center px-3 md:px-5 border-b border-white/[0.04]">
            {/* Left: Logo + Back */}
            <div className="flex items-center gap-3 flex-shrink-0">
                <Link href="/" className="relative flex items-center flex-shrink-0">
                    <div className="text-xl font-extrabold text-white italic tracking-tighter">
                        <span className="text-brand-gold">Ze</span><span className="text-white/90">ero</span>
                    </div>
                </Link>

                {pathname !== '/' && (
                    <button
                        onClick={() => router.back()}
                        aria-label="Go back"
                        className="flex items-center gap-1 text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/[0.04]"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>

            {/* Center: Segmented Nav */}
            <nav className="hidden lg:flex items-center mx-auto">
                <div className="flex items-center bg-white/[0.03] rounded-2xl p-1 border border-white/[0.04]">
                    {navItems.map((item) => {
                        const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.name}
                                href={item.path}
                                className={`text-[12px] font-bold uppercase tracking-wider transition-all px-4 py-2 rounded-xl relative ${
                                    isActive
                                        ? 'text-white bg-white/[0.08] shadow-sm'
                                        : 'text-white/30 hover:text-white/60'
                                }`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 ml-auto">
                {isAuthenticated ? (
                    <div className="flex items-center gap-2">

                        {/* Wallet Chip */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(prev => !prev)}
                                className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-3 py-2 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
                            >
                                <Wallet size={14} className="text-brand-gold" />
                                <span className="font-bold text-[13px] text-white max-w-[90px] md:max-w-none truncate">
                                    {formatActive(activeBalance)}
                                </span>
                                <ChevronDown
                                    size={12}
                                    className={`text-white/30 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            <AnimatePresence>
                                {isDropdownOpen && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="fixed inset-0 bg-black/50 z-[99] md:hidden"
                                            onClick={() => setIsDropdownOpen(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="fixed top-[60px] left-1/2 -translate-x-1/2 w-[calc(100vw-24px)] max-w-[360px] md:absolute md:top-full md:left-auto md:right-0 md:translate-x-0 md:mt-2 md:w-80 md:max-w-none bg-[#14161c]/98 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden z-[100] flex flex-col"
                                        >
                                            <div className="p-3 border-b border-white/[0.04] overflow-y-auto max-h-[60vh] flex-1">
                                                <div className="text-[10px] text-white/25 mb-3 font-semibold uppercase tracking-wider">
                                                    Select Wallet
                                                </div>

                                                {/* FIAT GROUP */}
                                                <div className="mb-3">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-brand-gold/60">🏦 Fiat</span>
                                                        <div className="flex-1 h-px bg-white/[0.04]" />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {fiatWallets.map(w => {
                                                            const active = selectedSubWallet === w.id;
                                                            const c = colorMap[w.color];
                                                            return (
                                                                <button
                                                                    key={w.id}
                                                                    onClick={() => { setSelectedSubWallet(w.id); setIsDropdownOpen(false); }}
                                                                    className={`w-full rounded-xl px-3 py-2.5 flex justify-between items-center transition-all border ${
                                                                        active ? `${c.bg} ${c.active}` : `bg-white/[0.02] border-white/[0.04] ${c.hover}`
                                                                    }`}
                                                                >
                                                                    <div className="text-left">
                                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                                            <span className="text-sm leading-none">{w.emoji}</span>
                                                                            <span className="text-[11px] font-bold text-white/80">{w.label}</span>
                                                                            {active && (
                                                                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full leading-none ${c.badge}`}>
                                                                                    ACTIVE
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-white font-bold text-sm pl-[22px]">{formatFiat(w.balance)}</div>
                                                                        <div className="text-[9px] text-white/20 pl-[22px]">{w.note}</div>
                                                                    </div>
                                                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 ${active ? c.dot : 'bg-white/[0.06]'}`} />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* CRYPTO GROUP */}
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-purple-400/60">💎 Crypto</span>
                                                        <div className="flex-1 h-px bg-white/[0.04]" />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {cryptoWallets.map(w => {
                                                            const active = selectedSubWallet === w.id;
                                                            const c = colorMap[w.color];
                                                            return (
                                                                <button
                                                                    key={w.id}
                                                                    onClick={() => { setSelectedSubWallet(w.id); setIsDropdownOpen(false); }}
                                                                    className={`w-full rounded-xl px-3 py-2.5 flex justify-between items-center transition-all border ${
                                                                        active ? `${c.bg} ${c.active}` : `bg-white/[0.02] border-white/[0.04] ${c.hover}`
                                                                    }`}
                                                                >
                                                                    <div className="text-left">
                                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                                            <span className="text-sm leading-none">{w.emoji}</span>
                                                                            <span className="text-[11px] font-bold text-white/80">{w.label}</span>
                                                                            {active && (
                                                                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full leading-none ${c.badge}`}>
                                                                                    ACTIVE
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-white font-bold text-sm pl-[22px]">{formatUSD(w.balance)}</div>
                                                                        <div className="text-[9px] text-white/20 pl-[22px]">{w.note}</div>
                                                                    </div>
                                                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 ${active ? c.dot : 'bg-white/[0.06]'}`} />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="p-2 flex-shrink-0 border-t border-white/[0.04]" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
                                                <Link
                                                    href="/profile"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/[0.04] text-white/40 hover:text-white/80 transition-colors"
                                                >
                                                    <UserCircle size={18} className="text-brand-gold" />
                                                    <span className="font-bold text-[12px] uppercase tracking-wide">Profile</span>
                                                </Link>
                                                <button
                                                    onClick={logout}
                                                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-red-500/5 text-white/30 hover:text-red-400 transition-colors"
                                                >
                                                    <LogOut size={18} />
                                                    <span className="font-bold text-[12px] uppercase tracking-wide">Logout</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Deposit CTA */}
                        <button
                            onClick={openDeposit}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-2 px-4 rounded-2xl text-[11px] uppercase tracking-wider transition-all shadow-[0_0_16px_rgba(59,193,23,0.2)] hover:shadow-[0_0_24px_rgba(59,193,23,0.3)] flex items-center gap-1.5 active:scale-[0.97]"
                        >
                            <Plus size={14} strokeWidth={3} />
                            <span className="hidden sm:inline">Deposit</span>
                        </button>

                        {/* Notification Bell */}
                        <NotificationBell />
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={openLogin}
                            className="px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-white/60 text-[11px] font-bold uppercase hover:bg-white/[0.08] hover:text-white transition-all"
                        >
                            Log In
                        </button>
                        <button
                            onClick={openRegister}
                            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-brand-gold to-brand-gold-hover text-black text-[11px] font-black uppercase hover:brightness-110 transition-all shadow-[0_0_12px_rgba(227,125,50,0.2)]"
                        >
                            Sign Up
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
