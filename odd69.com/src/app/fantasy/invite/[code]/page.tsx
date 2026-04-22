"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Shield, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FantasyShell from "@/components/fantasy/FantasyShell";
import api from "@/services/api";

export default function InviteLandingPage() {
    const router = useRouter();
    const { code } = useParams<{ code: string }>();
    const { user, loading: authLoading } = useAuth();
    const [contest, setContest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    useEffect(() => {
        if (!authLoading && !user) router.replace("/");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!code) return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get(`/fantasy/private-contests/invite/${code}`);
                setContest(res.data);
            } catch (e: any) {
                setErr(e?.response?.data?.message || "Invite not found");
            } finally {
                setLoading(false);
            }
        })();
    }, [code]);

    if (authLoading || !user) return <div className="min-h-[60vh] flex items-center justify-center text-white/40 text-sm">Loading...</div>;

    return (
        <FantasyShell title="Private Contest" subtitle="Invite" backHref="/fantasy" hideSubNav>
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#f59e0b]" /></div>
            ) : err ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center">
                    <Shield className="mx-auto text-white/25 mb-3" size={40} />
                    <p className="text-white/50 font-bold">{err}</p>
                </div>
            ) : contest && (
                <div className="space-y-4">
                    <div className="rounded-2xl bg-gradient-to-br from-[#f59e0b] to-orange-600 text-[#1a1208] p-6 shadow-lg">
                        <p className="text-[#1a1208]/70 text-[10px] uppercase tracking-widest font-bold">You've been invited to</p>
                        <p className="text-2xl font-black mt-1">{contest.title}</p>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <Stat v={`₹${contest.entryFee}`} l="Entry" />
                            <Stat v={`₹${contest.totalPrize.toLocaleString("en-IN")}`} l="Prize" />
                            <Stat v={`${contest.filledSpots}/${contest.maxSpots}`} l="Filled" />
                        </div>
                    </div>
                    <Link href={`/fantasy/match/${contest.matchId}`}
                        className="block w-full bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] font-black py-3 rounded-full text-center">
                        <Trophy className="inline mr-2" size={16} /> Build a team to join
                    </Link>
                </div>
            )}
        </FantasyShell>
    );
}

function Stat({ v, l }: { v: string; l: string }) {
    return (
        <div className="bg-black/10 rounded-xl px-3 py-2 text-center">
            <p className="text-[#1a1208]/70 text-[10px] uppercase tracking-widest font-semibold">{l}</p>
            <p className="text-[#1a1208] font-black text-sm">{v}</p>
        </div>
    );
}
