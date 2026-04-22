"use client";

import { useState } from "react";
import { Loader2, Tag, Check, X } from "lucide-react";
import api from "@/services/api";

interface Props {
    entryFee: number;
    matchId?: number;
    contestType?: string;
    onApplied: (result: { code: string; discount: number; finalFee: number } | null) => void;
}

export default function PromocodeInput({ entryFee, matchId, contestType, onApplied }: Props) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [applied, setApplied] = useState<{ code: string; discount: number; finalFee: number } | null>(null);
    const [err, setErr] = useState("");

    const apply = async () => {
        if (!code.trim()) return;
        setLoading(true); setErr("");
        try {
            const res = await api.post("/fantasy/promocode/apply", {
                code: code.trim().toUpperCase(),
                entryFee,
                matchId,
                contestType,
            });
            const r = { code: res.data.code, discount: res.data.discount, finalFee: res.data.finalFee };
            setApplied(r);
            onApplied(r);
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Invalid code");
            onApplied(null);
        } finally {
            setLoading(false);
        }
    };

    const remove = () => {
        setApplied(null); setCode(""); setErr("");
        onApplied(null);
    };

    if (applied) {
        return (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2">
                <Check size={14} className="text-emerald-400 shrink-0" />
                <span className="flex-1 text-[12px] font-bold text-emerald-300 truncate">
                    <span className="font-mono">{applied.code}</span> applied — saved ₹{applied.discount}
                </span>
                <button onClick={remove} className="text-emerald-400/80 hover:text-emerald-300"><X size={14} /></button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && apply()}
                        placeholder="Promocode"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm font-mono font-bold uppercase tracking-widest text-white placeholder-white/20 focus:border-amber-500/60 focus:bg-white/[0.05] outline-none" />
                </div>
                <button onClick={apply} disabled={loading || !code.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] text-xs font-black hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-1">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : null} Apply
                </button>
            </div>
            {err && <p className="text-xs text-red-400 mt-1 font-bold">{err}</p>}
        </div>
    );
}
