"use client";

import React, { useEffect, useState } from 'react';
import { X, Info, AlertTriangle, CheckCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/services/api';

type AnnouncementType = 'INFO' | 'WARNING' | 'SUCCESS' | 'PROMO';

interface Announcement {
    _id: string;
    title: string;
    message: string;
    type: AnnouncementType;
    isPinned: boolean;
}

const TYPE_STYLES: Record<AnnouncementType, { bar: string; icon: any; text: string; dismiss: string }> = {
    INFO: {
        bar: 'bg-blue-500/8 border-blue-500/15',
        icon: Info,
        text: 'text-blue-200',
        dismiss: 'hover:bg-blue-500/10 text-blue-300/60',
    },
    WARNING: {
        bar: 'bg-amber-500/8 border-amber-500/15',
        icon: AlertTriangle,
        text: 'text-amber-200',
        dismiss: 'hover:bg-amber-500/10 text-amber-300/60',
    },
    SUCCESS: {
        bar: 'bg-emerald-500/8 border-emerald-500/15',
        icon: CheckCircle,
        text: 'text-emerald-200',
        dismiss: 'hover:bg-emerald-500/10 text-emerald-300/60',
    },
    PROMO: {
        bar: 'bg-brand-gold/8 border-brand-gold/15',
        icon: Zap,
        text: 'text-brand-gold',
        dismiss: 'hover:bg-brand-gold/10 text-brand-gold/60',
    },
};

const SESSION_KEY = 'dismissed_announcements';

function getDismissed(): Set<string> {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

function saveDismissed(ids: Set<string>) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]));
    } catch { /* ignore */ }
}

export default function AnnouncementBanner() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setDismissed(getDismissed());
        api.get('/announcements?active=true')
            .then(res => {
                const data = res.data;
                if (Array.isArray(data)) setAnnouncements(data);
            })
            .catch(() => { /* silently fail */ });
    }, []);

    const visible = announcements.filter(a => !dismissed.has(a._id));

    // Cycle current index when announcements change
    useEffect(() => {
        setCurrentIndex(0);
    }, [visible.length]);

    if (visible.length === 0) return null;

    const current = visible[currentIndex];
    const cfg = TYPE_STYLES[current.type] || TYPE_STYLES.INFO;
    const Icon = cfg.icon;

    const dismissOne = (id: string) => {
        const next = new Set(dismissed).add(id);
        setDismissed(next);
        saveDismissed(next);
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    const dismissAll = () => {
        const next = new Set(dismissed);
        visible.forEach(a => next.add(a._id));
        setDismissed(next);
        saveDismissed(next);
    };

    const prev = () => setCurrentIndex(i => (i - 1 + visible.length) % visible.length);
    const next = () => setCurrentIndex(i => (i + 1) % visible.length);

    return (
        <div className="w-full z-[60] relative flex-shrink-0 px-3 py-2">
            <div className={`max-w-screen-xl mx-auto rounded-2xl border ${cfg.bar} backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)]`}>
                <div className="px-4 py-2.5 flex items-center gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        <Icon size={14} className={cfg.text} />
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 text-[11px] ${cfg.text}`}>
                        <span className="font-black mr-1.5">{current.title}</span>
                        <span className="opacity-70">{current.message}</span>
                    </div>

                    {/* Multi-banner navigation */}
                    {visible.length > 1 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={prev}
                                className={`p-1 rounded-lg transition-colors ${cfg.dismiss}`}
                                title="Previous">
                                <ChevronLeft size={12} />
                            </button>
                            <span className={`text-[9px] font-bold ${cfg.text} opacity-40`}>
                                {currentIndex + 1}/{visible.length}
                            </span>
                            <button onClick={next}
                                className={`p-1 rounded-lg transition-colors ${cfg.dismiss}`}
                                title="Next">
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    )}

                    {/* Dismiss */}
                    <button
                        onClick={() => visible.length === 1 ? dismissAll() : dismissOne(current._id)}
                        className={`flex-shrink-0 p-1 rounded-lg transition-colors ${cfg.dismiss}`}
                        title="Dismiss">
                        <X size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}
