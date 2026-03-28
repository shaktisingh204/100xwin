'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Menu, Trophy, Gamepad2, Tv2, MessageCircle,
    X, Home, Crown, User, Settings, LogOut,
    ChevronRight, Headphones, Gift, Send, Smile, Users,
    HelpCircle, Shield, Lock, FileText, BookOpen
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type ChatRole = 'admin' | 'mod' | 'user';

interface ChatMessage {
    id: string;
    user: string;
    content: string;
    time: string;
    role: ChatRole;
    level: number;
}

interface BottomNavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    path: string;
}

// ─── Full-Page Menu Overlay ────────────────────────────────────────────────
function FullPageMenu({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const { user, logout } = useAuth();

    const sections = [
        {
            title: 'Games',
            items: [
                { label: 'Casino', icon: Gamepad2, path: '/casino', color: 'text-brand-gold' },
                { label: 'Sports', icon: Trophy, path: '/sports', color: 'text-teal-400' },
                { label: 'Live Casino', icon: Tv2, path: '/live-dealers', color: 'text-purple-400' },
            ],
        },
        {
            title: 'Account',
            items: [
                { label: 'Profile', icon: User, path: '/profile', color: 'text-green-400' },
                { label: 'VIP Club', icon: Crown, path: '/vip', color: 'text-yellow-400' },
                { label: 'Promotions', icon: Gift, path: '/promotions', color: 'text-pink-400' },
                { label: 'Refer & Earn', icon: Users, path: '/referral', color: 'text-orange-400' },
                { label: 'Settings', icon: Settings, path: '/settings', color: 'text-blue-400' },
            ],
        },
        {
            title: 'Support',
            items: [
                { label: 'Live Support', icon: Headphones, path: '/support', color: 'text-orange-400' },
                { label: 'Help Center', icon: HelpCircle, path: '/support/help-center', color: 'text-blue-400' },
                { label: 'Fairness & Provably Fair', icon: Shield, path: '/fairness', color: 'text-green-400' },
            ],
        },
        {
            title: 'Legal',
            items: [
                { label: 'Privacy Policy', icon: Lock, path: '/legal/privacy-policy', color: 'text-purple-400' },
                { label: 'Terms of Service', icon: FileText, path: '/legal/terms', color: 'text-sky-400' },
                { label: 'Betting Rules', icon: BookOpen, path: '/legal/rules', color: 'text-brand-gold' },
            ],
        },
    ];

    const handleNav = (path: string) => {
        router.push(path);
        onClose();
    };

    return (
        <div
            className="fixed inset-x-0 top-0 z-[200] flex flex-col bg-[#0c0e12]/98 backdrop-blur-2xl animate-in slide-in-from-bottom-full duration-300"
            style={{ bottom: 'var(--mobile-nav-height)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-4">
                <span className="text-lg font-black text-white uppercase tracking-tight">Menu</span>
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 text-white/40 hover:text-white transition-all bg-white/[0.04] rounded-full px-3.5 py-2 text-[11px] font-bold hover:bg-white/[0.08]"
                >
                    <X size={14} />
                    Close
                </button>
            </div>

            {/* User card */}
            {user ? (
                <div className="mx-4 mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-gold/15 flex items-center justify-center text-brand-gold font-black text-base">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-[13px] truncate">{user.username}</p>
                        <p className="text-white/20 text-[11px]">Member</p>
                    </div>
                    <ChevronRight size={16} className="text-white/15 flex-shrink-0" />
                </div>
            ) : (
                <div className="mx-4 mt-4 grid grid-cols-2 gap-2">
                    <button
                        onClick={() => { router.push('/'); onClose(); }}
                        className="py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-white/60 font-black text-[12px] uppercase hover:bg-white/[0.08] transition-all"
                    >
                        Log In
                    </button>
                    <button
                        onClick={() => { router.push('/'); onClose(); }}
                        className="py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-[12px] uppercase shadow-[0_4px_16px_rgba(59,193,23,0.2)] transition-all"
                    >
                        Register
                    </button>
                </div>
            )}

            {/* Nav Sections */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 space-y-5">
                {sections.map((section) => (
                    <div key={section.title}>
                        <p className="text-[9px] font-black text-white/15 uppercase tracking-[0.2em] mb-2 px-1">
                            {section.title}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {section.items.map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => handleNav(item.path)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all active:scale-95"
                                >
                                    <div className={`w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center ${item.color}`}>
                                        <item.icon size={20} />
                                    </div>
                                    <span className="text-white/60 font-bold text-[10px] text-center leading-tight">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Home shortcut */}
                <button
                    onClick={() => handleNav('/')}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-bg-elevated/40 border border-white/5 hover:bg-white/5 transition-colors"
                >
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-text-muted">
                        <Home size={18} />
                    </div>
                    <span className="text-white font-bold text-sm">Home</span>
                    <ChevronRight size={16} className="text-text-muted ml-auto" />
                </button>

                {/* Logout */}
                {user && (
                    <button
                        onClick={() => { logout?.(); onClose(); }}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                            <LogOut size={18} />
                        </div>
                        <span className="text-red-400 font-bold text-sm">Log Out</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Embedded Live Chat Panel ──────────────────────────────────────────────
function MobileChatPanel({ onClose }: { onClose: () => void }) {
    const { user } = useAuth();
    const [input, setInput] = useState('');
    const [onlineUsers] = useState(1243);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', user: 'CryptoKing', content: 'BTC looking bullish today! 🚀', time: '5m ago', role: 'user', level: 12 },
        { id: '2', user: 'Admin', content: 'Welcome! Please be respectful.', time: '1h ago', role: 'admin', level: 99 },
        { id: '3', user: 'LuckyStriker', content: 'Just hit a 500x on Sweet Bonanza! 🍬', time: '2m ago', role: 'user', level: 5 },
        { id: '4', user: 'SpeedyGonzales', content: 'Anyone betting on the IPL game?', time: '30s ago', role: 'user', level: 8 },
    ]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || !user) return;
        setMessages(prev => [...prev, {
            id: Date.now().toString(), user: user.username || 'You',
            content: input.trim(), time: 'now', role: 'user', level: 1
        }]);
        setInput('');
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#111315] animate-in slide-in-from-bottom-full duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-gold/20 p-2 rounded-lg text-brand-gold relative">
                        <MessageCircle size={18} />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#111315] animate-pulse" />
                    </div>
                    <div>
                        <p className="text-white font-black text-sm uppercase tracking-tight">Live Chat</p>
                        <p className="text-green-500 text-[10px] font-bold flex items-center gap-1">
                            <Users size={10} /> {onlineUsers.toLocaleString()} Online
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-text-muted hover:text-white transition-colors bg-white/5 rounded-full p-2"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#141619]/50">
                {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-2">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${msg.role === 'admin' ? 'bg-red-500 text-white' : msg.role === 'mod' ? 'bg-green-500 text-white' : 'bg-white/10 text-text-muted'}`}>
                                {msg.role === 'admin' ? 'ADM' : msg.role === 'mod' ? 'MOD' : `LVL ${msg.level}`}
                            </span>
                            <span className={`text-xs font-bold ${msg.role === 'admin' ? 'text-red-400' : msg.role === 'mod' ? 'text-green-400' : 'text-text-secondary'}`}>{msg.user}</span>
                            <span className="text-[9px] text-text-disabled ml-auto">{msg.time}</span>
                        </div>
                        <div className="bg-[#1A1D21] p-2.5 rounded-xl rounded-tl-none border border-white/5 text-[13px] text-text-primary leading-snug break-words">
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-3 bg-[#111315] border-t border-white/5 relative pb-[env(safe-area-inset-bottom)] shrink-0">
                {!user && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-t-2xl">
                        <button className="px-6 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-black font-black text-xs uppercase rounded-full shadow-glow-gold">
                            Login to Chat
                        </button>
                    </div>
                )}
                <form onSubmit={handleSend} className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <input
                            type="text" value={input} onChange={e => setInput(e.target.value)}
                            placeholder="Type a message..."
                            disabled={!user}
                            className="w-full bg-[#1A1D21] text-text-primary text-sm px-4 py-3 pr-10 rounded-xl outline-none border border-white/5 focus:border-brand-gold/50 transition-all placeholder:text-text-disabled"
                        />
                        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-gold transition-colors p-1" disabled={!user}>
                            <Smile size={16} />
                        </button>
                    </div>
                    <button
                        type="submit" disabled={!input.trim() || !user}
                        className={`p-3 rounded-xl transition-all flex-shrink-0 ${input.trim() && user ? 'bg-brand-gold text-black shadow-glow-gold hover:bg-brand-gold-hover' : 'bg-white/5 text-text-disabled cursor-not-allowed'}`}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Main Bottom Nav ────────────────────────────────────────────────────────
export default function MobileBottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleMenuPress = () => {
        if (menuOpen) {
            setMenuOpen(false);

            if (pathname !== '/') {
                router.push('/');
            }

            return;
        }

        setMenuOpen(true);
    };

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    };

    const navItems: BottomNavItem[] = [
        { id: 'sports', label: 'Sports', icon: Trophy, path: '/sports' },
        { id: 'casino', label: 'Casino', icon: Gamepad2, path: '/casino' },
        { id: 'live', label: 'Live', icon: Tv2, path: '/live-dealers' },
        { id: 'support', label: 'Support', icon: Headphones, path: '/support' },
    ];

    const MenuButtonIcon = menuOpen ? Home : Menu;
    const menuButtonLabel = menuOpen ? 'Home' : 'Menu';

    return (
        <>
            {menuOpen && <FullPageMenu onClose={() => setMenuOpen(false)} />}

            {/* Bottom nav bar — floating */}
            <nav
                className="fixed bottom-3 left-3 right-3 bg-[#12141a]/90 backdrop-blur-2xl border border-white/[0.06] z-50 md:hidden flex items-stretch shadow-[0_8px_32px_rgba(0,0,0,0.6)] rounded-3xl"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <button onClick={handleMenuPress} className="flex flex-1">
                    <div className={`flex flex-1 flex-col items-center justify-center gap-1 relative transition-all h-[56px] ${menuOpen ? 'text-brand-gold scale-110' : 'text-white/30'}`}>
                        <MenuButtonIcon size={20} />
                        <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                            {menuButtonLabel}
                        </span>
                    </div>
                </button>

                {navItems.map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;
                    const content = (
                        <div className={`flex flex-col items-center justify-center flex-1 gap-1 relative transition-all h-[56px] ${active ? 'text-brand-gold scale-110' : 'text-white/30'}`}>
                            <Icon size={20} />
                            <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                                {item.label}
                            </span>
                        </div>
                    );
                    return (
                        <Link
                            key={item.id}
                            href={item.path!}
                            className="flex-1 flex"
                            onClick={() => {
                                if (menuOpen) {
                                    setMenuOpen(false);
                                }
                            }}
                        >
                            {content}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
