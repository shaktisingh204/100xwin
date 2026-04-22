"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

interface Reward { day: number; amount: number; type: string; powerupType?: string }
interface StreakData {
    currentStreak: number; longestStreak: number;
    lastClaimDate: string; totalDaysClaimed: number; lifetimeRewardAmount: number;
    canClaim: boolean; nextDay: number;
    schedule: Reward[];
}

export default function FantasyStreakPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [s, setS] = useState<StreakData | null>(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => { if (!authLoading && !user) router.replace("/"); }, [authLoading, user, router]);

    const load = async () => {
        setLoading(true);
        const res = await api.get("/fantasy/streak").catch(() => null);
        if (res?.data) setS(res.data as StreakData);
        setLoading(false);
    };
    useEffect(() => { if (user) load(); }, [user]);

    const claim = async () => {
        setClaiming(true); setMsg("");
        try {
            const res = await api.post("/fantasy/streak/claim");
            const r = res.data?.reward;
            setMsg(r ? `+ ${r.type === 'bonus' ? `₹${r.amount} bonus` : `${r.powerupType} powerup`} claimed!` : "Claimed!");
            await load();
        } catch (e: any) {
            setMsg(e?.response?.data?.message || "Claim failed");
        } finally {
            setClaiming(false);
            setTimeout(() => setMsg(""), 3000);
        }
    };

    if (authLoading || !user) return <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">Loading...</div>;

    return (
        <FantasyShell title="Daily Streak" subtitle="Login every day for rewards" backHref="/fantasy">
            {loading || !s ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#f59e0b]" /></div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-white/[0.06] text-white p-5 text-center shadow-lg">
                        <Flame className="mx-auto mb-2 text-[#f59e0b]" size={40} />
                        <p className="text-5xl font-black">{s.currentStreak}</p>
                        <p className="text-white/50 text-sm font-bold mt-1">day streak</p>
                        <p className="text-white/25 text-xs mt-1">Longest: {s.longestStreak} • Lifetime: ₹{s.lifetimeRewardAmount.toLocaleString("en-IN")}</p>

                        {s.canClaim ? (
                            <button onClick={claim} disabled={claiming}
                                className="mt-4 bg-[#f59e0b] text-black px-6 py-2.5 rounded-full font-black text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-2">
                                {claiming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                Claim Day {s.nextDay}
                            </button>
                        ) : (
                            <div className="mt-4 bg-white/[0.06] border border-white/[0.06] rounded-full px-4 py-2 text-xs font-bold inline-block text-white/50">
                                Come back tomorrow
                            </div>
                        )}
                        {msg && <p className="mt-3 text-xs text-[#f59e0b] font-bold">{msg}</p>}
                    </div>

                    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-3">Reward Ladder</h3>
                        <div className="grid grid-cols-7 gap-2">
                            {s.schedule.map((r, i) => {
                                const achieved = s.currentStreak >= (r.day || i + 1);
                                const isNext = s.canClaim && s.nextDay === (r.day || i + 1);
                                return (
                                    <div key={i} className={`rounded-xl p-2 text-center border-2 ${isNext ? 'border-[#f59e0b] bg-[#f59e0b]/10' : achieved ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/[0.06] bg-white/[0.03]'}`}>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Day {r.day || i + 1}</p>
                                        <p className={`text-sm font-black mt-1 ${achieved || isNext ? 'text-[#f59e0b]' : 'text-white/25'}`}>
                                            {r.type === 'powerup' ? '⚡' : '₹'}{r.amount}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </FantasyShell>
    );
}
