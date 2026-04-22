"use client";

import React, { useEffect, useState } from 'react';
import { casinoService } from '@/services/casino';
import { useAuth } from '@/context/AuthContext';
import { Ghost } from 'lucide-react';

const BetsSection = ({ gameCode }: { gameCode?: string }) => {
    const { user } = useAuth();
    const [bets, setBets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBets = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                // Pass gameCode to filter bets
                const data = await casinoService.getMyBets(20, gameCode);
                setBets(data);
            } catch (error) {
                console.error("Failed to fetch bets", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBets();

        // Optional: Poll for new bets every 10s
        const interval = setInterval(fetchBets, 10000);
        return () => clearInterval(interval);
    }, [user, gameCode]);

    return (
        <div className="w-full bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <h3 className="text-white font-black text-lg">Latest bet & Race</h3>

                <div className="flex bg-white/[0.04] rounded-lg p-1 border border-white/[0.04]">
                    <button className="px-4 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-black shadow-sm">
                        My bets
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[200px]">
                {loading ? (
                    <div className="flex items-center justify-center h-[200px] text-white/50">
                        Loading...
                    </div>
                ) : bets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                        <div className="w-24 h-24 relative opacity-40">
                            <Ghost size={80} className="text-white/25" />
                        </div>
                        <span className="text-white/50 font-semibold">No bets yet</span>
                        <button className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] font-black rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all">
                            Play 1 bet
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-white/50 font-semibold border-b border-white/[0.06]">
                                <tr>
                                    <th className="px-4 py-3">Bet ID / Game</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3 text-right">Result</th>
                                    <th className="px-4 py-3 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bets.map((bet) => (
                                    <tr key={bet.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-white font-semibold">{bet.game_code || 'Unknown Game'}</span>
                                                <span className="text-xs text-white/25">{bet.txn_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-white font-black">
                                                {bet.type === 'debit' ? '-' : '+'}
                                                {parseFloat(bet.amount).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-black ${bet.type === 'credit' ? 'text-emerald-400' : 'text-white/50'}`}>
                                                {bet.type === 'credit' ? 'Win' : 'Bet'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-white/25">
                                            {new Date(bet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BetsSection;
