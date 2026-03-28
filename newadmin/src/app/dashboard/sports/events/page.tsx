"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
    getAllEvents, getSportsEvents, getTopEvents, getHomeEvents,
    toggleEvent, togglePopularEvent, toggleHomeEvent
} from '@/actions/sports';
import {
    Search, Star, Home, Eye, EyeOff, Trophy, Calendar, Loader2,
    RefreshCcw, ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

const SPORTS = [
    { id: 'ALL', name: 'All Sports', emoji: '🏆' },
    { id: '4', name: 'Cricket', emoji: '🏏' },
    { id: '1', name: 'Football', emoji: '⚽' },
    { id: '2', name: 'Tennis', emoji: '🎾' },
    { id: '10', name: 'Horse Racing', emoji: '🏇' },
    { id: '66', name: 'Kabaddi', emoji: '🤼' },
    { id: '8', name: 'Table Tennis', emoji: '🏓' },
    { id: '15', name: 'Basketball', emoji: '🏀' },
    { id: '6', name: 'Boxing', emoji: '🥊' },
    { id: '40', name: 'Politics', emoji: '🗳️' },
];

type EventRow = {
    event_id: string;
    event_name: string;
    open_date: string;
    match_status: string;
    isVisible: boolean;
    competition?: { competition_name?: string };
};

type Toast = { msg: string; type: 'success' | 'error' };

const PER_PAGE = 30;

export default function EventsPage() {
    const [events, setEvents] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedSportId, setSelectedSportId] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [popularIds, setPopularIds] = useState<Set<string>>(new Set());
    const [homeIds, setHomeIds] = useState<Set<string>>(new Set());
    const [toggling, setToggling] = useState<string | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);
    const [page, setPage] = useState(1);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch events from MongoDB directly via server action
            const [eventsRes, topRes, homeRes] = await Promise.all([
                selectedSportId === 'ALL'
                    ? getAllEvents(search)
                    : getSportsEvents(selectedSportId),
                getTopEvents(),
                getHomeEvents(),
            ]);

            if (eventsRes.success && eventsRes.data) {
                setEvents(eventsRes.data);
            } else {
                showToast(eventsRes.error || 'Failed to load events', 'error');
                setEvents([]);
            }

            if (topRes.success && topRes.data) {
                setPopularIds(new Set(topRes.data.map((t: any) => String(t.event_id))));
            }
            if (homeRes.success && homeRes.data) {
                setHomeIds(new Set(homeRes.data.map((h: any) => String(h.event_id))));
            }
            setPage(1);
        } catch (e) {
            console.error('Fetch error', e);
            showToast('Failed to connect to database', 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedSportId, search]);

    useEffect(() => {
        const t = setTimeout(fetchAll, 350);
        return () => clearTimeout(t);
    }, [fetchAll]);

    const handleTogglePopular = async (event: EventRow) => {
        const id = event.event_id;
        const isPopular = popularIds.has(id);
        setToggling(`pop_${id}`);
        try {
            const res = await togglePopularEvent(id, !isPopular, event.event_name);
            if (res.success) {
                setPopularIds(prev => {
                    const next = new Set(prev);
                    if (isPopular) {
                        next.delete(id);
                    } else {
                        next.add(id);
                    }
                    return next;
                });
                showToast(isPopular ? 'Removed from Popular' : '⭐ Marked as Popular', 'success');
            } else {
                showToast('Failed to update', 'error');
            }
        } catch {
            showToast('Error updating popular status', 'error');
        } finally {
            setToggling(null);
        }
    };

    const handleToggleHome = async (event: EventRow) => {
        const id = event.event_id;
        const isHome = homeIds.has(id);
        setToggling(`home_${id}`);
        try {
            const res = await toggleHomeEvent(id, !isHome, event.event_name);
            if (res.success) {
                setHomeIds(prev => {
                    const next = new Set(prev);
                    if (isHome) {
                        next.delete(id);
                    } else {
                        next.add(id);
                    }
                    return next;
                });
                showToast(isHome ? 'Removed from Home Page' : '🏠 Added to Home Page', 'success');
            } else {
                showToast('Failed to update', 'error');
            }
        } catch {
            showToast('Error updating home status', 'error');
        } finally {
            setToggling(null);
        }
    };

    const handleToggleVisibility = async (event: EventRow) => {
        const id = event.event_id;
        setToggling(`vis_${id}`);
        try {
            const res = await toggleEvent(id, !event.isVisible);
            if (res.success) {
                setEvents(prev => prev.map(e => e.event_id === id ? { ...e, isVisible: !e.isVisible } : e));
                showToast(!event.isVisible ? 'Event is now visible' : 'Event hidden', 'success');
            } else {
                showToast('Failed to update', 'error');
            }
        } catch {
            showToast('Error toggling visibility', 'error');
        } finally {
            setToggling(null);
        }
    };

    // Client-side filters
    const filtered = events.filter(e => {
        const matchSearch = !search ||
            e.event_name.toLowerCase().includes(search.toLowerCase()) ||
            (e.competition?.competition_name || '').toLowerCase().includes(search.toLowerCase());

        if (!matchSearch) return false;
        if (statusFilter === 'POPULAR') return popularIds.has(String(e.event_id));
        if (statusFilter === 'HOME') return homeIds.has(String(e.event_id));
        if (statusFilter === 'LIVE') return e.match_status === 'In Play' || e.match_status === 'Live';
        if (statusFilter === 'HIDDEN') return !e.isVisible;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <div className="space-y-5 pb-8 relative">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-medium animate-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-200' : 'bg-red-900/90 border-red-500/40 text-red-200'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <Link href="/dashboard/sports" className="text-xs text-slate-500 hover:text-slate-300 mb-1 block">← Back to Sports</Link>
                    <h1 className="text-3xl font-bold text-white">Sportsbook Events</h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        <span className="text-white font-semibold">{filtered.length}</span> events &nbsp;·&nbsp;
                        <span className="text-amber-400 font-semibold">⭐ {popularIds.size} popular</span>&nbsp;·&nbsp;
                        <span className="text-emerald-400 font-semibold">🏠 {homeIds.size} on home</span>
                    </p>
                </div>
                <button onClick={fetchAll} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50 sm:w-auto">
                    <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Sport Filter Pills */}
            <div className="flex flex-wrap gap-2">
                {SPORTS.map(sport => (
                    <button
                        key={sport.id}
                        onClick={() => { setSelectedSportId(sport.id); setPage(1); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedSportId === sport.id
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'}`}
                    >
                        <span>{sport.emoji}</span>{sport.name}
                    </button>
                ))}
            </div>

            {/* Search + Status Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search by event or competition..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {[
                        { id: 'ALL', label: 'All' },
                        { id: 'LIVE', label: '🔴 Live' },
                        { id: 'POPULAR', label: '⭐ Popular' },
                        { id: 'HOME', label: '🏠 Home Page' },
                        { id: 'HIDDEN', label: '👁 Hidden' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => { setStatusFilter(f.id); setPage(1); }}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${statusFilter === f.id
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full text-sm text-left">
                        <thead className="bg-slate-900/60 uppercase text-xs text-slate-500 tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Event</th>
                                <th className="px-4 py-3 hidden md:table-cell">Competition</th>
                                <th className="px-4 py-3 hidden lg:table-cell">Date / Status</th>
                                <th className="px-4 py-3 text-center">⭐ Popular</th>
                                <th className="px-4 py-3 text-center">🏠 Home</th>
                                <th className="px-4 py-3 text-right">Visible</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <Loader2 className="animate-spin text-indigo-400 inline mb-3" size={32} />
                                        <p className="text-slate-500 text-sm">Loading events from MongoDB...</p>
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-500">
                                        <Trophy size={40} className="mx-auto mb-3 opacity-20" />
                                        <p>No events found for the current filter.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map(event => {
                                const id = event.event_id;
                                const isPopular = popularIds.has(id);
                                const isHome = homeIds.has(id);
                                const isLive = event.match_status === 'In Play' || event.match_status === 'Live';
                                const popBusy = toggling === `pop_${id}`;
                                const homeBusy = toggling === `home_${id}`;
                                const visBusy = toggling === `vis_${id}`;

                                return (
                                    <tr key={id} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-white font-medium text-sm leading-snug">{event.event_name}</p>
                                            <p className="text-[11px] text-slate-600 mt-0.5">ID: {id}</p>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <div className="flex items-center gap-1.5">
                                                <Trophy size={11} className="text-amber-500/50 flex-shrink-0" />
                                                <span className="text-slate-400 text-xs">{event.competition?.competition_name || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                                                <Calendar size={10} />
                                                <span>{event.open_date ? new Date(event.open_date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${isLive ? 'bg-red-500/15 text-red-400 animate-pulse' : 'bg-slate-700 text-slate-500'}`}>
                                                {event.match_status || 'Upcoming'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleTogglePopular(event)}
                                                disabled={popBusy}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${isPopular
                                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                                                    : 'bg-slate-700/60 text-slate-500 border border-slate-700 hover:text-amber-400 hover:border-amber-500/30'}`}
                                            >
                                                {popBusy ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} fill={isPopular ? 'currentColor' : 'none'} />}
                                                <span className="hidden xl:inline">{isPopular ? 'Popular' : 'Set'}</span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleHome(event)}
                                                disabled={homeBusy}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${isHome
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                                    : 'bg-slate-700/60 text-slate-500 border border-slate-700 hover:text-emerald-400 hover:border-emerald-500/30'}`}
                                            >
                                                {homeBusy ? <Loader2 size={11} className="animate-spin" /> : <Home size={11} fill={isHome ? 'currentColor' : 'none'} />}
                                                <span className="hidden xl:inline">{isHome ? 'On Home' : 'Add'}</span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleToggleVisibility(event)}
                                                disabled={visBusy}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${event.isVisible
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'}`}
                                            >
                                                {visBusy ? <Loader2 size={11} className="animate-spin" /> : event.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                                                {event.isVisible ? 'Visible' : 'Hidden'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && filtered.length > PER_PAGE && (
                    <div className="flex flex-col gap-3 border-t border-slate-700 p-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs">
                            Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 hover:bg-slate-700 rounded disabled:opacity-30">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-white font-medium text-sm px-2">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 hover:bg-slate-700 rounded disabled:opacity-30">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
