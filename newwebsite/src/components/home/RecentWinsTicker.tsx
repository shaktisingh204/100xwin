'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, Trophy } from 'lucide-react';
import { casinoService } from '@/services/casino';
import { useWallet } from '@/context/WalletContext';

const getRandomAmount = (symbol = '₹') => {
    const amount = (Math.random() * 500000) + 1000;
    if (amount > 100000) return `${symbol}${(amount / 100000).toFixed(2)}L`;
    if (amount > 1000) return `${symbol}${(amount / 1000).toFixed(2)}K`;
    return `${symbol}${Math.floor(amount).toLocaleString('en-IN')}`;
};

const ADJECTIVES = ['Lucky', 'King', 'Ace', 'Star', 'Pro', 'Elite', 'Golden', 'Royal', 'Big', 'Ultra'];
const NOUNS = ['Player', 'Winner', 'Hunter', 'Shark', 'Tiger', 'Eagle', 'Wolf', 'Bull', 'Falcon'];
const getRandomUser = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj}${noun}${Math.floor(Math.random() * 999)}`;
};

const ACCENT_HUES = ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#6366f1'];

interface WinItem {
    game: string;
    user: string;
    amount: string;
    hue: string;
    image: string;
}

function gameToWinItem(game: any, idx: number): WinItem {
    return {
        game: game.gameName || game.name || 'Casino Game',
        user: getRandomUser(),
        amount: getRandomAmount(),
        hue: ACCENT_HUES[idx % ACCENT_HUES.length],
        image: game.image || game.thumbnail || game.imageUrl || '',
    };
}

/* ── Horizontal glass card ticker item ─────────────────────────────────────── */
function TickerCard({ win }: { win: WinItem }) {
    const [imgFailed, setImgFailed] = useState(false);
    const hasImage = !imgFailed && !!win.image;

    return (
        <div className="flex-shrink-0 flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl px-2.5 py-2 mx-1 hover:border-white/[0.08] transition-all group cursor-pointer min-w-[200px]">
            {/* Thumbnail */}
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/[0.06]">
                {hasImage ? (
                    <img src={win.image} alt={win.game} onError={() => setImgFailed(true)} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.03] to-white/[0.01]">
                        <span className="text-base">🎮</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/35 font-medium truncate">{win.user}</p>
                <p className="text-[9px] text-white/15 truncate">{win.game}</p>
            </div>

            {/* Win amount */}
            <div className="flex-shrink-0 text-right">
                <p className="text-[12px] font-black" style={{ color: win.hue }}>{win.amount}</p>
                <p className="text-[7px] text-white/10 font-bold uppercase">Won</p>
            </div>
        </div>
    );
}

function TickerSkeleton() {
    return (
        <div className="flex-shrink-0 flex items-center gap-2.5 bg-white/[0.015] rounded-xl px-2.5 py-2 mx-1 min-w-[200px]">
            <div className="w-10 h-10 rounded-lg bg-white/[0.03] animate-pulse flex-shrink-0" />
            <div className="flex-1">
                <div className="h-2 w-16 bg-white/[0.03] rounded animate-pulse mb-1" />
                <div className="h-1.5 w-20 bg-white/[0.02] rounded animate-pulse" />
            </div>
            <div className="h-3 w-10 bg-white/[0.03] rounded animate-pulse" />
        </div>
    );
}

export default function RecentWinsTicker() {
    const { activeSymbol } = useWallet();
    const [wins, setWins] = useState<WinItem[]>([]);
    const [loading, setLoading] = useState(true);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        const load = async () => {
            try {
                const [slotsRes, liveRes, crashRes] = await Promise.all([
                    casinoService.getGames(undefined, 'slots', undefined, 1, 15),
                    casinoService.getGames(undefined, 'live', undefined, 1, 10),
                    casinoService.getGames(undefined, 'crash', undefined, 1, 5),
                ]);
                const raw = [...(slotsRes.games || []), ...(liveRes.games || []), ...(crashRes.games || [])];
                if (raw.length === 0) { setLoading(false); return; }
                const shuffled = [...raw].sort(() => Math.random() - 0.5);
                const items = shuffled.map((g, i) => gameToWinItem(g, i));
                const withSymbol = items.map(item => ({ ...item, amount: getRandomAmount(activeSymbol) }));
                setWins([...withSymbol, ...withSymbol]);
            } catch (e) { console.error('RecentWinsTicker: failed', e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    return (
        <div className="w-full py-2">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 md:px-0 mb-2">
                <div className="flex items-center gap-1.5">
                    <Trophy size={12} className="text-brand-gold" />
                    <span className="text-[11px] font-black text-white/40 uppercase tracking-wider">Winning Right Now</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-white/[0.05] to-transparent" />
                <TrendingUp size={11} className="text-emerald-500/40" />
            </div>

            {/* Ticker */}
            <div className="overflow-hidden relative">
                {loading ? (
                    <div className="flex px-3 md:px-0">
                        {Array.from({ length: 6 }).map((_, i) => <TickerSkeleton key={i} />)}
                    </div>
                ) : wins.length > 0 ? (
                    <div className="flex animate-scroll hover:[animation-play-state:paused] w-max">
                        {wins.map((win, i) => <TickerCard key={i} win={win} />)}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
