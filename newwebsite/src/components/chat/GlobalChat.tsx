"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Smile, MessageSquare, X, Hash, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import api from '@/services/api';

interface Message {
    id: string;
    userId?: number;
    username: string;
    content: string;
    level?: number;
    role?: 'user' | 'mod' | 'admin';
    createdAt: string | Date;
}

const ROLE_COLORS: Record<string, string> = {
    admin: 'text-red-400',
    mod: 'text-green-400',
    user: 'text-sky-300',
};

const ROLE_BADGE: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400',
    mod: 'bg-green-500/20 text-green-400',
    user: 'bg-white/8 text-white/40',
};

const ROLE_LABEL: Record<string, string> = {
    admin: 'ADM',
    mod: 'MOD',
    user: '',
};

function formatTime(date: string | Date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GlobalChat({ className = '' }: { className?: string }) {
    const { user, isAuthenticated } = useAuth();
    const { socket, isConnected } = useSocket();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const joinedRef = useRef(false);

    // Scroll to bottom helper
    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    // Fetch history from REST
    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/chat/history?limit=60');
            setMessages(data);
        } catch {
            // History not critical
        } finally {
            setLoading(false);
        }
    }, []);

    // Join global-chat room on socket connect
    useEffect(() => {
        if (!socket || !isConnected || joinedRef.current) return;
        socket.emit('join-global-chat');
        joinedRef.current = true;

        socket.on('receive-chat-message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('chat-online-count', (_: any) => {
            // count tracked server-side only
        });

        return () => {
            socket.off('receive-chat-message');
            socket.off('chat-online-count');
            socket.emit('leave-global-chat');
            joinedRef.current = false;
        };
    }, [socket, isConnected]);

    // When chat is opened, fetch history + focus input
    useEffect(() => {
        if (isOpen) {
            fetchHistory();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, fetchHistory]);

    // Auto-scroll when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, scrollToBottom]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || !isAuthenticated || !socket || !isConnected || sending) return;

        setSending(true);
        const msg = input.trim();
        setInput(''); // Optimistic clear

        socket.emit(
            'send-chat-message',
            { content: msg },
            (res: { status: string; message?: string }) => {
                setSending(false);
                if (res?.status === 'error') {
                    // Put the text back if it failed
                    setInput(msg);
                }
            },
        );
        // Belt-and-suspenders: clear sending flag in case no ack
        setTimeout(() => setSending(false), 3000);
    };

    // ─── Collapsed button ──────────────────────────────────────────────
    if (!isOpen) {
        return (
            <div className={`fixed bottom-4 right-4 z-50 hidden md:block ${className}`}>
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative flex items-center justify-center w-14 h-14 bg-brand-gold text-black rounded-full shadow-lg hover:bg-brand-gold-hover transition-all hover:scale-105 active:scale-95 shadow-glow-gold"
                    title="Open Global Chat"
                >
                    <MessageSquare size={24} fill="currentColor" />
                    <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0e1013] animate-pulse" />
                </button>
            </div>
        );
    }

    // ─── Expanded panel ────────────────────────────────────────────────
    return (
        <div className={`fixed bottom-24 right-4 w-[360px] h-[580px] max-h-[72vh] bg-[#141619] flex flex-col font-sans rounded-xl shadow-2xl border border-white/[0.08] z-50 overflow-hidden animate-in slide-in-from-bottom-3 fade-in duration-200 ${className}`}>

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#1a1d21] border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-brand-gold/15 rounded-lg flex items-center justify-center relative">
                        <Hash size={14} className="text-brand-gold" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#1a1d21] animate-pulse" />
                    </div>
                    <div>
                        <div className="text-[13px] font-bold text-white tracking-wide">Global Chat</div>
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                            <span className="text-white/30">Loading...</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 bg-[#0e1013]"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#252830 transparent' }}
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 size={20} className="text-white/20 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full pb-4 text-center">
                        <MessageSquare size={28} className="text-white/10 mb-2" />
                        <p className="text-[12px] text-white/20 font-bold">No messages yet</p>
                        <p className="text-[11px] text-white/10 mt-1">Be the first to say something! 👋</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const role = (msg.role || 'user') as 'user' | 'mod' | 'admin';
                        const isCurrentUser = user && (user.id === msg.userId || user.userId === msg.userId);
                        return (
                            <div
                                key={msg.id}
                                className="group flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-1 duration-200"
                            >
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                    {/* Role badge */}
                                    {role !== 'user' ? (
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${ROLE_BADGE[role]}`}>
                                            {ROLE_LABEL[role]}
                                        </span>
                                    ) : msg.level !== undefined && msg.level > 0 ? (
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30 uppercase">
                                            LVL {msg.level}
                                        </span>
                                    ) : null}

                                    {/* Username */}
                                    <span className={`text-[12px] font-bold leading-none ${isCurrentUser ? 'text-brand-gold' : ROLE_COLORS[role]}`}>
                                        {msg.username}
                                        {isCurrentUser && <span className="text-[10px] text-white/20 font-normal ml-1">(you)</span>}
                                    </span>

                                    {/* Time */}
                                    <span className="text-[9px] text-white/20 ml-auto">{formatTime(msg.createdAt)}</span>
                                </div>

                                {/* Bubble */}
                                <div className={`text-[12px] leading-snug px-2.5 py-1.5 rounded-lg rounded-tl-none border break-words
                                    ${isCurrentUser
                                        ? 'bg-brand-gold/10 border-brand-gold/15 text-white'
                                        : 'bg-[#1a1d21] border-white/[0.05] text-white/80'
                                    }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 bg-[#1a1d21] border-t border-white/[0.06] shrink-0 relative">
                {!isAuthenticated && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-b-xl">
                        <span className="text-[12px] text-white/40 font-bold">Login to chat</span>
                    </div>
                )}
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value.slice(0, 300))}
                            placeholder={isAuthenticated ? "Say something cool..." : "Login to chat"}
                            maxLength={300}
                            disabled={!isAuthenticated || sending}
                            className="w-full bg-[#0e1013] text-white text-[12px] pl-3 pr-8 py-2.5 rounded-lg outline-none border border-white/[0.06] focus:border-brand-gold/40 transition-all placeholder:text-white/15 disabled:opacity-40"
                        />
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-brand-gold transition-colors"
                            disabled={!isAuthenticated}
                        >
                            <Smile size={14} />
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={!input.trim() || !isAuthenticated || sending || !isConnected}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all flex-shrink-0 ${input.trim() && isAuthenticated && isConnected
                            ? 'bg-brand-gold text-black hover:bg-brand-gold-hover shadow-glow-gold active:scale-95'
                            : 'bg-white/5 text-white/15 cursor-not-allowed'
                            }`}
                    >
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </form>
                {input.length > 250 && (
                    <div className="text-[9px] text-amber-400/60 mt-1 text-right">{input.length}/300</div>
                )}
            </div>
        </div>
    );
}
