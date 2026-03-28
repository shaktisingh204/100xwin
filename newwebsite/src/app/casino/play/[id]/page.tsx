'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import GamePlayInterface from '@/components/casino/GamePlayInterface';
import GameGrid from '@/components/casino/GameGrid';

/* ─────────────────────────────────────────────────────────── */
/*  Casino Play Page – fully responsive                         */
/* ─────────────────────────────────────────────────────────── */
export default function CasinoPlayPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const gameId   = params.id as string;
    const provider = searchParams.get('provider') || '';
    const gameName = searchParams.get('name') || 'Casino Game';
    const isLobby  = searchParams.get('isLobby') === 'true';

    const [gameUrl, setGameUrl]       = useState<string | null>(null);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState<string | null>(null);
    const [activeGame, setActiveGame] = useState<{
        id: string; name: string; provider: string; url: string;
    } | null>(null);

    /* ── detect mobile so we can suppress header / sidebar ── */
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    /* ── fetch game URL ── */
    useEffect(() => {
        const fetchGameUrl = async () => {
            if (!gameId || !provider) {
                setError('Missing game parameters');
                setLoading(false);
                return;
            }
            try {
                const token      = localStorage.getItem('token');
                const userString = localStorage.getItem('user');
                const user       = userString ? JSON.parse(userString) : null;
                const username   = user?.username;

                const response = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL || 'https://zeero.bet/api'}/casino/launch`,
                    { provider, gameId, isLobby, username },
                    { headers: { Authorization: `Bearer ${token}` } },
                );

                if (response.data?.url) {
                    setGameUrl(response.data.url);
                    setActiveGame({ id: gameId, name: gameName, provider, url: response.data.url });
                } else {
                    setError('Failed to launch game');
                }
            } catch (err: any) {
                console.error('Launch Error:', err);
                setError(err.response?.data?.message || 'Error launching game');
            } finally {
                setLoading(false);
            }
        };
        fetchGameUrl();
    }, [gameId, provider, isLobby, gameName]);

    /* ────────────────────────────────────────────── */
    /*  MOBILE  — full-screen, no chrome              */
    /* ────────────────────────────────────────────── */
    if (isMobile) {
        /* Loading */
        if (loading) {
            return (
                <div className="fixed inset-0 z-[300] bg-[#0d0d0f] flex flex-col items-center justify-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="w-16 h-16 rounded-full border-2 border-[#E37D32]/20 border-t-[#E37D32] animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-2xl">🎰</div>
                    </div>
                    <p className="text-white/40 text-xs font-semibold tracking-widest uppercase animate-pulse">
                        Launching {gameName}…
                    </p>
                </div>
            );
        }

        /* Error */
        if (error) {
            return (
                <div className="fixed inset-0 z-[300] bg-[#0d0d0f] flex flex-col items-center justify-center gap-5 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl">
                        ⚠️
                    </div>
                    <div className="text-center">
                        <h2 className="text-white font-bold text-lg mb-1">Unable to Launch</h2>
                        <p className="text-white/40 text-sm">{error}</p>
                    </div>
                    <div className="flex gap-3 w-full max-w-xs">
                        <button
                            onClick={() => router.back()}
                            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold active:scale-95 transition-transform"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={() => router.push('/casino')}
                            className="flex-1 py-3 rounded-xl bg-[#E37D32] text-black text-sm font-bold active:scale-95 transition-transform shadow-[0_0_20px_rgba(227,125,50,0.3)]"
                        >
                            Casino
                        </button>
                    </div>
                </div>
            );
        }

        /* Game loaded */
        if (activeGame) {
            return (
                <GamePlayInterface
                    game={activeGame}
                    onClose={() => router.push('/casino')}
                    isEmbedded={false}
                    onLaunch={setActiveGame}
                    key={activeGame.id}
                />
            );
        }

        return null;
    }

    /* ────────────────────────────────────────────── */
    /*  DESKTOP / TABLET — with header + sidebar      */
    /* ────────────────────────────────────────────── */
    return (
        <div className="h-screen overflow-hidden bg-[#0d0d0f] flex flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden pt-[64px] max-w-[1920px] mx-auto w-full">
                <LeftSidebar />

                <main className="flex-1 min-w-0 border-l border-white/5 border-r border-white/5 bg-[#0d0d0f] overflow-y-auto overflow-x-hidden">

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-5">
                            <div className="relative w-16 h-16">
                                <div className="w-16 h-16 rounded-full border-2 border-[#E37D32]/20 border-t-[#E37D32] animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center text-2xl">🎰</div>
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold text-sm">{gameName}</p>
                                <p className="text-white/40 text-xs mt-1 font-semibold tracking-widest uppercase animate-pulse">
                                    Launching game…
                                </p>
                            </div>
                            {/* Shimmer progress bar */}
                            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-1/2 bg-gradient-to-r from-[#E37D32] to-[#D4AF37] rounded-full animate-[shimmerBar_1.6s_ease-in-out_infinite]" />
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 py-8">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl">
                                ⚠️
                            </div>
                            <div className="text-center">
                                <h2 className="text-white font-bold text-xl mb-1">Unable to Launch Game</h2>
                                <p className="text-white/40 text-sm max-w-sm">{error}</p>
                            </div>
                            <div className="flex gap-3 mt-1">
                                <button
                                    onClick={() => router.back()}
                                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors border border-white/10"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={() => router.push('/casino')}
                                    className="px-5 py-2.5 rounded-xl bg-[#E37D32] hover:brightness-110 text-black text-sm font-bold transition-all shadow-[0_0_20px_rgba(227,125,50,0.25)]"
                                >
                                    Casino Lobby
                                </button>
                            </div>
                            {/* Suggestions */}
                            <div className="w-full mt-6 border-t border-white/5 pt-6">
                                <GameGrid
                                    title="Popular Games"
                                    category="popular"
                                    layout="row"
                                    onLaunch={(g) =>
                                        router.push(
                                            `/casino/play/${g.id}?provider=${g.provider}&name=${encodeURIComponent(g.name)}`,
                                        )
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* Game loaded */}
                    {!loading && !error && activeGame && (
                        <GamePlayInterface
                            game={activeGame}
                            onClose={() => router.push('/casino')}
                            isEmbedded={true}
                            onLaunch={setActiveGame}
                            key={activeGame.id}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
