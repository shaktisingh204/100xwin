"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gamepad2, Search, Loader2 } from "lucide-react";
import { casinoService } from "@/services/casino";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    casinoService.getProviders()
      .then((data: any[]) => setProviders(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? providers.filter((p) => p.provider?.toLowerCase().includes(search.toLowerCase()))
    : providers;

  return (
    <div className="max-w-[1600px] mx-auto px-3 md:px-5 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">All Providers</h1>
        <span className="text-[10px] font-bold text-white/15 bg-white/[0.03] px-2 py-0.5 rounded-full">
          {providers.length} providers
        </span>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15" size={14} />
        <input
          type="text"
          placeholder="Search providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-xl py-2.5 pl-9 pr-4 outline-none text-[12px] placeholder:text-white/15 focus:border-white/[0.1] transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="text-[#f59e0b] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {filtered.map((p) => (
            <Link
              key={p.provider}
              href={`/casino?provider=${p.provider}`}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:border-white/[0.1] hover:-translate-y-0.5 transition-all group"
            >
              {p.logo ? (
                <img src={p.logo} alt={p.provider} className="w-10 h-10 rounded-lg object-contain opacity-40 group-hover:opacity-70 transition-opacity" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center">
                  <Gamepad2 size={18} className="text-white/15" />
                </div>
              )}
              <div className="text-center">
                <p className="text-[11px] font-bold text-white/40 group-hover:text-white/70 capitalize transition-colors">{p.provider}</p>
                {p.gameCount && <p className="text-[9px] text-white/10 mt-0.5">{p.gameCount} games</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Gamepad2 size={32} className="text-white/10" />
          <p className="text-white/30 text-sm font-bold">No providers found</p>
        </div>
      )}
    </div>
  );
}
