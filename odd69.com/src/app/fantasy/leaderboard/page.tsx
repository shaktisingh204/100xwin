"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

interface Row { userId: number; rank: number; totalPoints: number; totalWinnings: number; totalEntries: number; wins: number }

export default function FantasySeasonLeaderboard() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [rows, setRows] = useState<Row[]>([]);
    const [myRank, setMyRank] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) router.replace("/");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        (async () => {
            setLoading(true);
            const [lb, mine] = await Promise.all([
                api.get("/fantasy/season-leaderboard", { params: { page, limit: 50 } }).catch(() => null),
                api.get("/fantasy/my-rank").catch(() => null),
            ]);
            setRows(lb?.data?.data || []);
            setPages(lb?.data?.pagination?.pages || 1);
            setMyRank(mine?.data || null);
            setLoading(false);
        })();
    }, [user, page]);

    if (authLoading || !user) return <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">Loading...</div>;

    return (
        <FantasyShell title="Season Leaderboard" subtitle="All-time fantasy rank" backHref="/fantasy">
            {myRank && (
                <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-white p-4 mb-4 shadow-lg">
                    <p className="text-amber-400/80 text-xs font-semibold uppercase tracking-widest">Your rank</p>
                    <div className="flex items-baseline gap-3 mt-1">
                        <p className="text-4xl font-black tracking-tight text-amber-400">#{myRank.rank || '—'}</p>
                        <p className="text-white/70 text-sm font-semibold">{myRank.wins || 0} wins</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                        <Stat v={myRank.entries} l="Entries" />
                        <Stat v={myRank.wins} l="Wins" />
                        <Stat v={`₹${(myRank.totalWinnings || 0).toLocaleString("en-IN")}`} l="Winnings" />
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-amber-400" /></div>
            ) : rows.length === 0 ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center text-white/25 text-sm">No settled entries yet — play a contest to appear here.</div>
            ) : (
                <div className="bg-white/[0.03] rounded-2xl overflow-hidden border border-white/[0.06]">
                    {rows.map((r) => {
                        const isMe = user && Number(user.id) === r.userId;
                        const badgeCls = r.rank === 1 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-black" : r.rank === 2 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-black" : r.rank === 3 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white" : "bg-white/[0.05] text-white/50";
                        return (
                            <div key={r.userId} className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0 ${isMe ? 'bg-gradient-to-r from-amber-500/10 to-transparent' : ''}`}>
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-black ${badgeCls}`}>{r.rank}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-black tracking-tight text-sm truncate">Player #{r.userId}{isMe && <span className="ml-1 text-amber-400">(you)</span>}</p>
                                    <p className="text-[11px] text-white/50">{r.totalEntries} entries • {r.wins} wins</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-emerald-400 font-black text-sm">₹{r.totalWinnings.toLocaleString("en-IN")}</p>
                                    <p className="text-[11px] text-white/50 font-bold">{r.totalEntries > 0 ? `${Math.round((r.wins / r.totalEntries) * 100)}% win rate` : "—"}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && rows.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-white/25">Page {page} of {pages}</span>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm font-bold text-white disabled:opacity-40">Prev</button>
                        <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm font-bold text-white disabled:opacity-40">Next</button>
                    </div>
                </div>
            )}
        </FantasyShell>
    );
}

function Stat({ v, l }: { v: React.ReactNode; l: string }) {
    return (
        <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl px-3 py-2">
            <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">{l}</p>
            <p className="text-white font-black tracking-tight text-sm">{v}</p>
        </div>
    );
}
