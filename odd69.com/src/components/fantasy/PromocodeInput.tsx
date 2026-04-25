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
    setLoading(true);
    setErr("");
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
    setApplied(null);
    setCode("");
    setErr("");
    onApplied(null);
  };

  if (applied) {
    return (
      <div className="flex items-center gap-2 bg-[var(--emerald-soft)] border border-[var(--emerald)]/25 rounded-xl px-3 min-h-11 py-2">
        <Check size={14} className="text-[var(--emerald)] shrink-0" />
        <span className="flex-1 text-[12px] font-bold text-[var(--emerald)] truncate">
          <span className="num">{applied.code}</span> applied — saved <span className="num">₹{applied.discount}</span>
        </span>
        <button
          onClick={remove}
          aria-label="Remove promocode"
          className="w-11 h-11 -mr-2 grid place-items-center text-[var(--emerald)]/80 hover:text-[var(--emerald)]"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-whisper)]" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="PROMOCODE"
            className="w-full bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-xl pl-9 pr-3 h-11 text-sm num font-bold uppercase tracking-widest text-[var(--ink)] placeholder-[var(--ink-whisper)] focus:border-[var(--line-gold)] focus:bg-[var(--bg-elevated)] outline-none"
          />
        </div>
        <button
          onClick={apply}
          disabled={loading || !code.trim()}
          className="btn btn-gold sweep h-11 min-w-[88px] uppercase tracking-[0.08em] text-[11px] disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null} Apply
        </button>
      </div>
      {err && <p className="text-xs text-[var(--crimson)] mt-1.5 font-bold">{err}</p>}
    </div>
  );
}
