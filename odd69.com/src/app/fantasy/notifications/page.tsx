"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

interface N { _id: string; type: string; title: string; body: string; isRead: boolean; matchId?: number; contestId?: string; link?: string; createdAt: string }

export default function FantasyNotificationsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [rows, setRows] = useState<N[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (!authLoading && !user) router.replace("/"); }, [authLoading, user, router]);

    const load = async () => {
        setLoading(true);
        const res = await api.get("/fantasy/notifications").catch(() => null);
        setRows(res?.data || []);
        setLoading(false);
    };
    useEffect(() => { if (user) load(); }, [user]);

    const markAll = async () => {
        await api.post("/fantasy/notifications/read").catch(() => null);
        await load();
    };

    const markOne = async (id: string) => {
        await api.post("/fantasy/notifications/read", { id }).catch(() => null);
        setRows(rs => rs.map(r => r._id === id ? { ...r, isRead: true } : r));
    };

    if (authLoading || !user) return <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">Loading...</div>;

    return (
        <FantasyShell
            title="Notifications"
            backHref="/fantasy"
            rightSlot={
                rows.some(r => !r.isRead) ? (
                    <button onClick={markAll} className="bg-white/20 hover:bg-white/30 text-white text-xs font-black px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                        <CheckCheck size={12} /> Mark all
                    </button>
                ) : undefined
            }>
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#f59e0b]" /></div>
            ) : rows.length === 0 ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center text-white/50 text-sm">No notifications yet.</div>
            ) : (
                <div className="space-y-2">
                    {rows.map(n => {
                        const href = n.link || (n.matchId ? `/fantasy/match/${n.matchId}` : '#');
                        return (
                            <Link key={n._id} href={href} onClick={() => markOne(n._id)}
                                className={`block rounded-2xl border p-4 hover:border-[#f59e0b]/40 ${n.isRead ? 'bg-white/[0.03] border-white/[0.06] opacity-70' : 'bg-amber-500/10 border-[#f59e0b]/30'}`}>
                                <div className="flex items-start gap-3">
                                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#f59e0b] bg-[#f59e0b]/10 rounded px-2 py-0.5">{n.type}</span>
                                            <span className="text-[10px] text-white/25">{new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                        <p className="text-white font-black text-sm mt-1">{n.title}</p>
                                        <p className="text-[12px] text-white/50 mt-0.5">{n.body}</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </FantasyShell>
    );
}
