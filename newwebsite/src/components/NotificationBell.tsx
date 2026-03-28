"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, CheckCheck, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import Link from 'next/link';

interface Notification {
    _id: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationBell() {
    const { user, token, isAuthenticated } = useAuth();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const fetchCount = useCallback(async () => {
        if (!user || !token) return;
        try {
            const res = await api.get(`/notifications/unread-count/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const count = res?.data?.count;
            setUnread(typeof count === 'number' ? count : 0);
        } catch {
            // API not available yet — silently ignore
        }
    }, [user, token]);

    const fetchNotifications = useCallback(async () => {
        if (!user || !token) return;
        try {
            const res = await api.get(`/notifications/my/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = Array.isArray(res?.data) ? res.data : [];
            setNotifications(data);
            setUnread(data.filter((n: Notification) => !n.isRead).length);
        } catch {
            // API not available yet — silently ignore
        }
    }, [user, token]);

    // Poll unread count every 30 s
    useEffect(() => {
        if (!isAuthenticated) return;
        fetchCount();
        const interval = setInterval(fetchCount, 30_000);
        return () => clearInterval(interval);
    }, [isAuthenticated, fetchCount]);

    // Open/close + fetch on open
    const toggle = async () => {
        const willOpen = !open;
        setOpen(willOpen);
        if (willOpen) await fetchNotifications();
    };

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markRead = async (id: string) => {
        if (!token || !id) return;
        try {
            await api.patch(`/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnread(prev => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };

    const markAllRead = async () => {
        if (!user || !token) return;
        try {
            await api.patch(`/notifications/mark-all-read/${user.id}`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnread(0);
        } catch { /* silent */ }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="relative" ref={ref}>
            {/* Bell Button */}
            <button
                onClick={toggle}
                aria-label="Notifications"
                className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 shadow-[0_0_6px_rgba(239,68,68,0.6)]">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-[#1a1d21] border border-white/[0.07] rounded-2xl shadow-2xl overflow-hidden z-[200]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Bell size={12} className="text-orange-400" /> Notifications
                        </h3>
                        {unread > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white transition-colors"
                            >
                                <CheckCheck size={11} /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.03]">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center text-white/20 text-xs">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n._id}
                                    className={`px-4 py-3 transition-colors cursor-pointer ${n.isRead ? 'opacity-50' : 'bg-orange-500/[0.03] hover:bg-white/[0.02]'}`}
                                    onClick={() => { if (!n.isRead) markRead(n._id); }}
                                >
                                    <p className="text-[11px] font-bold text-white">{n.title}</p>
                                    <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{n.body}</p>
                                    <p className="text-[9px] text-white/20 mt-1">
                                        {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-white/[0.05]">
                        <Link
                            href="/profile/transactions"
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-center gap-1 text-[10px] text-white/30 hover:text-orange-400 transition-colors"
                        >
                            View all transactions <ArrowUpRight size={10} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
