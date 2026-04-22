'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useModal } from '@/context/ModalContext';
import {
    X, ChevronUp, ChevronDown, CheckCircle, AlertCircle,
    Clock, Trash2, BookMarked, Zap, User, AlignJustify
} from 'lucide-react';
import { useBets } from '@/context/BetContext';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import SportsBetCashoutWidget from '@/components/sports/SportsBetCashoutWidget';
import { showBetErrorToast, showBetPlacedToast } from '@/utils/betToasts';
import { useEarlySixMatches } from '@/hooks/useEarlySixMatches';
import {
    getBetNetPnL,
    getBetOriginalStake,
    getBetPartialCashoutValue,
    getBetPendingMaxReturn,
    getBetSettledReturn,
    hasPartialCashout,
} from '@/utils/sportsBetDisplay';
import { isLineBasedFancyMarket } from '@/utils/sportsBetPricing';

// ─── constants ────────────────────────────────────────────────────────────────
const QUICK_STAKES = [100, 500, 1_000, 5_000];

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtOdds(odds: number, lb: boolean) {
    return lb ? String(odds) : `×${Number(odds).toFixed(2)}`;
}
function potentialProfit(stake: number, odds: number) {
    return Math.max(0, (Number(stake) || 0) * ((Number(odds) || 1) - 1));
}
function fmtMoney(n: number) {
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function statusStyle(s: string) {
    const m: Record<string, { chip: string; bar: string }> = {
        WON:        { chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',  bar: 'bg-emerald-500' },
        LOST:       { chip: 'bg-red-500/10 text-red-300 border-red-500/25',              bar: 'bg-red-500' },
        CASHED_OUT: { chip: 'bg-amber-500/15 text-amber-300 border-amber-500/25',        bar: 'bg-amber-500' },
        VOID:       { chip: 'bg-white/[0.06] text-white/30 border-white/[0.08]',         bar: 'bg-white/20' },
        PENDING:    { chip: 'bg-amber-500/12 text-amber-400 border-amber-500/25',        bar: 'bg-amber-400' },
    };
    return m[s] ?? m.PENDING;
}

interface RightSidebarProps {
    mode?: 'floating' | 'static';
    className?: string;
}

// ─── SingleBetCard ─────────────────────────────────────────────────────────────
interface BetCardProps {
    bet: {
        id: string; eventId: string; eventName: string;
        marketName: string; selectionName: string;
        odds: number; marketType?: string; rate?: number;
        stake: number; potentialWin: number;
    };
    sym: string;
    onRemove: (id: string) => void;
    onStake:  (id: string, v: number) => void;
}

function BetCard({ bet, sym, onRemove, onStake }: BetCardProps) {
    const [raw, setRaw] = useState(bet.stake > 0 ? String(bet.stake) : '');
    const ctxVal = bet.stake > 0 ? String(bet.stake) : '';
    useEffect(() => {
        const t = setTimeout(() => setRaw(p => p !== ctxVal ? ctxVal : p), 0);
        return () => clearTimeout(t);
    }, [ctxVal]);

    const lb = isLineBasedFancyMarket({ marketType: bet.marketType, marketName: bet.marketName, selectionName: bet.selectionName });
    const stakeNum = parseFloat(raw) || 0;
    const profit   = lb ? null : potentialProfit(stakeNum || bet.stake, bet.odds);

    return (
        <div className="relative rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
            {/* amber left accent */}
            <div className="absolute left-0 inset-y-0 w-[3px] bg-amber-500 rounded-r-full" />
            <div className="pl-3.5 pr-2.5 py-2 space-y-1.5">
                {/* Row 1: Selection + odds badge + X */}
                <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-amber-400 truncate leading-none">{bet.selectionName}</p>
                        <p className="text-[9px] text-white/30 leading-none mt-0.5 truncate">{bet.eventName} · {bet.marketName}</p>
                    </div>
                    <span className="flex-shrink-0 text-[12px] font-black text-white bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-lg leading-none tabular-nums">
                        {fmtOdds(bet.odds, lb)}
                    </span>
                    <button
                        onClick={() => onRemove(bet.id)}
                        className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90 flex-shrink-0"
                    >
                        <X size={10} />
                    </button>
                </div>

                {/* Row 2: Stake input + profit inline */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/25 pointer-events-none">{sym}</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={raw}
                            placeholder="Stake"
                            onChange={e => {
                                const v = e.target.value.replace(/[^0-9.]/g, '');
                                setRaw(v);
                                onStake(bet.id, isNaN(parseFloat(v)) ? 0 : parseFloat(v));
                            }}
                            className="w-full rounded-lg bg-[#06080c] border border-white/[0.08] focus:border-amber-500/40 text-white text-[12px] font-black pl-6 pr-2 py-1.5 outline-none transition-colors placeholder:text-white/15 tabular-nums"
                        />
                    </div>
                    <div className="text-right flex-shrink-0 min-w-[54px]">
                        <p className="text-[8px] text-white/25 leading-none">{profit !== null ? 'Profit' : 'Return'}</p>
                        <p className="text-[11px] font-black text-amber-400 tabular-nums leading-tight">
                            {sym}{fmtMoney(profit !== null ? profit : bet.potentialWin)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── BetslipList ──────────────────────────────────────────────────────────────
function isMatchOddsMarket(bet: BetCardProps['bet']) {
    const mt = String((bet as any).marketType || '').trim().toLowerCase();
    const mn = String(bet.marketName || '').trim().toLowerCase();
    return mt === 'match' || mt === 'match1' || mt === 'match_odds' || mn.includes('match odds') || mn.includes('match winner');
}

function BetslipList({ bets, sym, onRemove, onStake }: {
    bets: BetCardProps['bet'][]; sym: string;
    onRemove: (id: string) => void; onStake: (id: string, v: number) => void;
}) {
    const e6 = useEarlySixMatches();
    return (
        <div className="space-y-1.5">
            {bets.map(bet => (
                <div key={bet.id} className="space-y-1">
                    <BetCard bet={bet} sym={sym} onRemove={onRemove} onStake={onStake} />
                    {e6.has(bet.eventId) && isMatchOddsMarket(bet) && (
                        <div className="rounded-xl px-2.5 py-1.5 text-[9px] bg-emerald-500/8 border border-emerald-500/15 text-emerald-300/90">
                            <p className="font-black text-[9px] text-emerald-400">EARLY 6 REFUND OFFER</p>
                            <p>Qualifies for cashback · Pre-match Match Odds only</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── AnimatedBadge ──────────────────────────────────────────────────────
function AnimatedBadge({ count }: { count: number }) {
    const prevRef  = useRef(count);
    const [popKey,  setPopKey]  = useState(0);
    const [plusKey, setPlusKey] = useState(0);
    const [delta,   setDelta]   = useState(0);

    useEffect(() => {
        const prev = prevRef.current;
        if (count > prev) {
            setDelta(count - prev);
            setPopKey(k => k + 1);
            setPlusKey(k => k + 1);
        }
        prevRef.current = count;
    }, [count]);

    if (count === 0) return null;
    return (
        <span className="relative inline-flex items-center justify-center">
            {delta > 0 && (
                <span
                    key={`plus-${plusKey}`}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black text-amber-400 whitespace-nowrap"
                >
                    +{delta}
                </span>
            )}
            <span
                key={`badge-${popKey}`}
                className="h-5 min-w-[20px] px-1.5 rounded-full text-[9px] font-black flex items-center justify-center leading-none bg-amber-500 text-[#06080c]"
            >
                {count}
            </span>
        </span>
    );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function RightSidebar({ mode = 'floating', className = '' }: RightSidebarProps) {
    const {
        bets, removeBet, updateStake, placeBet, clearBets,
        totalStake, totalPotentialWin,
        myBets, refreshMyBets,
        isBetslipOpen, toggleBetslip,
        oneClickEnabled, setOneClickEnabled,
        oneClickStake, setOneClickStake,
    } = useBets();

    const { isAuthenticated }  = useAuth();
    const { openLogin }        = useModal();
    const { activeSymbol: sym, selectedWallet, selectedSubWallet, activeBalance, refreshWallet } = useWallet();
    const pathname = usePathname();
    const isSportsRoute = pathname === '/sports'
        || pathname.startsWith('/sports/')
        || pathname.startsWith('/sportsbook');

    const [placing,  setPlacing]  = useState(false);
    const [tab,      setTab]      = useState<'slip' | 'mybets'>('slip');
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

    useEffect(() => {
        if (!feedback) return;
        const t = setTimeout(() => setFeedback(null), 3500);
        return () => clearTimeout(t);
    }, [feedback]);

    // Auto-open when bet is added
    useEffect(() => {
        if (bets.length > 0) {
            if (!isBetslipOpen) toggleBetslip();
        }
    }, [bets.length]); // eslint-disable-line

    useEffect(() => {
        if (!isAuthenticated || tab !== 'mybets') return;
        void refreshMyBets();
        const t = setInterval(() => void refreshMyBets(), 15_000);
        return () => clearInterval(t);
    }, [tab, isAuthenticated, refreshMyBets]);

    const desktopDrawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isBetslipOpen || mode !== 'floating') return;

        const handleClickOutside = (e: MouseEvent) => {
            if (window.innerWidth < 768) return;
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('a')) return;

            if (desktopDrawerRef.current && !desktopDrawerRef.current.contains(target)) {
                toggleBetslip();
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 50);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isBetslipOpen, mode, toggleBetslip]);

    const handlePlace = async () => {
        if (!isAuthenticated) { openLogin(); return; }
        if (!bets.some(b => b.stake > 0)) return;
        setPlacing(true);
        try {
            await placeBet();
            showBetPlacedToast();
            setFeedback({ ok: true, msg: 'Bet placed successfully!' });
            setTimeout(() => setTab('mybets'), 1200);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to place bet.';
            setFeedback({ ok: false, msg });
            showBetErrorToast(e);
        } finally { setPlacing(false); }
    };

    const totalProfit = Math.max(0, totalPotentialWin - totalStake);
    const canPlace    = bets.some(b => b.stake > 0);

    // ── Shared sub-components ─────────────────────────────────────────────────

    const SlimHeader = ({ showTabs = true }: { showTabs?: boolean }) => (
        <div
            className={`w-full h-[52px] flex items-center justify-between px-4 ${mode === 'floating' ? '' : 'cursor-default'} bg-[#0b0f15] border-b border-white/[0.06]`}
        >
            <div
                onClick={mode === 'floating' ? toggleBetslip : undefined}
                className={`flex flex-1 items-center gap-2.5 h-full ${mode === 'floating' ? 'cursor-pointer select-none' : ''}`}
            >
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <AlignJustify size={13} className="text-amber-400" />
                </div>
                <span className="text-[13px] font-black text-white tracking-tight">Betslip</span>
                <AnimatedBadge count={bets.length} />
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onClick={() => setOneClickEnabled(!oneClickEnabled)}
                    title="Quick Bet"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:bg-white/[0.05] active:scale-90"
                >
                    <Zap size={11} className={oneClickEnabled ? 'text-amber-400' : 'text-white/30'} />
                    <span className={`text-[10px] font-bold ${oneClickEnabled ? 'text-amber-400' : 'text-white/25'}`}>
                        Quick Bet
                    </span>
                    <span className={`relative flex w-8 h-[18px] rounded-full transition-colors duration-200 ${
                        oneClickEnabled ? 'bg-amber-500' : 'bg-white/[0.08]'
                    }`}>
                        <span className={`absolute top-[3px] w-3 h-3 rounded-full shadow transition-all duration-200 ${
                            oneClickEnabled ? 'translate-x-[17px] bg-[#06080c]' : 'translate-x-[3px] bg-white/30'
                        }`} />
                    </span>
                </button>

                {mode === 'floating' && (
                    <button
                        type="button"
                        onClick={toggleBetslip}
                        className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-all active:scale-90"
                    >
                        {isBetslipOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                )}
            </div>
        </div>
    );

    const QuickStakeBar = () => (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#06080c] border-b border-white/[0.06]">
            <Zap size={11} className="text-amber-400 shrink-0" />
            <span className="text-[10px] font-bold text-amber-400/80 shrink-0">Stake</span>
            <input
                type="number"
                min={1}
                value={oneClickStake}
                onChange={(e) => setOneClickStake(Math.max(1, Number(e.target.value) || 1))}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/40 rounded-lg px-2 py-1 text-[12px] font-black text-white tabular-nums outline-none w-full text-right"
            />
            <div className="flex gap-1">
                {[100, 500, 1000, 5000].map(amt => (
                    <button key={amt} type="button"
                        onClick={(e) => { e.stopPropagation(); setOneClickStake(amt); }}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md transition-all active:scale-90 ${
                            oneClickStake === amt
                                ? 'bg-amber-500 text-[#06080c]'
                                : 'bg-white/[0.04] text-white/30 hover:bg-white/[0.08] hover:text-white'
                        }`}>
                        {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                ))}
            </div>
        </div>
    );

    const TabRow = () => (
        <div className="flex border-b border-white/[0.06] bg-[#06080c] flex-shrink-0">
            {(['slip', 'mybets'] as const).map((t, i) => (
                <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2.5 text-[11px] font-black tracking-tight transition-all border-b-2 ${tab === t ? 'text-amber-400 border-amber-500' : 'text-white/25 border-transparent hover:text-white/50'}`}
                >
                    {['Slip', 'My Bets'][i]}
                </button>
            ))}
        </div>
    );

    const Content = () => (
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 bg-[#06080c]"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e2228 transparent' }}>
            {tab === 'slip' ? (
                bets.length === 0 ? (
                    <div className="flex flex-col h-full items-center justify-center py-6">
                        <div className="flex flex-col items-center justify-center gap-3 text-center select-none mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                                <span className="text-2xl">🎟️</span>
                            </div>
                            <div>
                                <p className="text-[12px] font-bold text-white/25">Betslip is empty</p>
                                <p className="text-[10px] text-white/15 mt-0.5">Tap any odds to add a selection</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <BetslipList bets={bets} sym={sym} onRemove={removeBet} onStake={updateStake} />
                )
            ) : myBets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center select-none">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <BookMarked size={22} className="text-white/15" />
                    </div>
                    <p className="text-[12px] font-bold text-white/25">No bets yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {myBets.map(bet => {
                        const { chip, bar } = statusStyle(bet.status);
                        const partial = hasPartialCashout(bet);
                        const lb = isLineBasedFancyMarket({ marketType: (bet as any).gtype, marketName: bet.marketName, selectionName: bet.selectionName });
                        const pnl = getBetNetPnL(bet);
                        return (
                            <div key={bet.id} className="relative rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                                <span className={`absolute inset-y-0 left-0 w-[3px] rounded-r-full ${bar}`} />
                                <div className="pl-4 pr-3 pt-3 pb-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${chip}`}>{bet.status.replace('_', ' ')}</span>
                                        <span className="text-[9px] text-white/25 flex items-center gap-1"><Clock size={9} />{new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-white truncate">{bet.eventName}</p>
                                        <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-1.5">
                                            <span className="text-white/55 font-semibold truncate">{bet.selectionName}</span>
                                            <span className="text-white/15">·</span>
                                            {lb ? <span>Runs <span className="text-white/55 font-bold">{bet.odds}</span></span>
                                                : <span>Odds <span className="text-white/55 font-bold">×{Number(bet.odds).toFixed(2)}</span></span>}
                                        </p>
                                    </div>
                                    {partial && (
                                        <p className="text-[10px] text-amber-300/80 bg-amber-500/08 rounded-lg px-2.5 py-1.5">
                                            Partial cash out: {sym}{getBetPartialCashoutValue(bet).toFixed(2)}
                                        </p>
                                    )}
                                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2.5 text-[10px] grid grid-cols-2 gap-x-4 gap-y-1.5">
                                        <span className="text-white/30">{partial ? 'Remaining' : 'Stake'}</span>
                                        <span className="text-right font-bold text-white/55 tabular-nums">{sym}{bet.stake}</span>
                                        {partial && (<><span className="text-white/30">Original</span><span className="text-right font-bold text-white/55 tabular-nums">{sym}{getBetOriginalStake(bet).toFixed(2)}</span></>)}
                                        <span className="text-white/30">{bet.status === 'PENDING' ? 'Max Return' : 'Returned'}</span>
                                        <span className={`text-right font-bold tabular-nums ${bet.status === 'WON' ? 'text-emerald-400' : bet.status === 'CASHED_OUT' ? 'text-amber-400' : bet.status === 'PENDING' ? 'text-amber-300' : 'text-white/55'}`}>
                                            {sym}{(bet.status === 'PENDING' ? getBetPendingMaxReturn(bet) : (getBetSettledReturn(bet) ?? bet.potentialWin)).toFixed(2)}
                                        </span>
                                        {bet.status !== 'PENDING' && pnl !== null && (
                                            <><span className="text-white/30">Net P&amp;L</span><span className={`text-right font-bold tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pnl >= 0 ? '+' : '-'}{sym}{Math.abs(pnl).toFixed(2)}</span></>
                                        )}
                                    </div>
                                    {bet.status === 'PENDING' && <SportsBetCashoutWidget bet={bet} onSuccess={async () => { await Promise.all([refreshMyBets(), refreshWallet()]); }} compact />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const Footer = () => (
        <div className="px-3 pt-3 pb-4 border-t border-white/[0.06] bg-[#0b0f15] space-y-3 flex-shrink-0">
            {/* Quick stakes */}
            <div className="grid grid-cols-4 gap-1.5">
                {QUICK_STAKES.map(amt => (
                    <button key={amt}
                        onClick={() => bets.forEach(b => updateStake(b.id, amt))}
                        className="py-2 rounded-xl bg-white/[0.04] hover:bg-amber-500/10 text-white/40 hover:text-amber-400 text-[10px] font-bold border border-white/[0.06] hover:border-amber-500/25 transition-all active:scale-95">
                        {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                ))}
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.06] text-[10px]">
                    <span className="text-white/30">Wallet</span>
                    <span className={`font-bold text-[9px] px-2 py-0.5 rounded-lg border ${selectedWallet === 'crypto' ? 'bg-purple-500/10 text-purple-300 border-purple-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}`}>
                        {selectedSubWallet.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} · {sym}{activeBalance.toFixed(2)}
                    </span>
                </div>
                <div className="px-3.5 py-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between"><span className="text-white/30">Total Stake</span><span className="font-black text-white tabular-nums">{sym}{totalStake.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span className="text-white/30">Potential Profit</span><span className="font-black text-amber-400 tabular-nums">{sym}{fmtMoney(totalProfit)}</span></div>
                    <div className="flex justify-between border-t border-white/[0.06] pt-1.5 mt-0.5">
                        <span className="text-white/50 font-bold">Total Return</span>
                        <span className="font-black text-white tabular-nums text-[13px]">{sym}{fmtMoney(totalPotentialWin)}</span>
                    </div>
                </div>
            </div>

            {/* Feedback banner */}
            {feedback && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold ${feedback.ok ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25' : 'bg-red-500/10 text-red-300 border border-red-500/25'}`}>
                    {feedback.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                    {feedback.msg}
                </div>
            )}

            {/* CTA row */}
            {bets.length > 0 && (
                <div className="flex gap-2">
                    {bets.length > 1 && (
                        <button onClick={() => clearBets()} title="Clear all"
                            className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/25 text-white/25 hover:text-red-400 transition-all active:scale-90">
                            <Trash2 size={13} />
                        </button>
                    )}
                    {!isAuthenticated ? (
                        <button onClick={openLogin}
                            className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#06080c] font-black text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                            <User size={13} /> Login to Place Bet
                        </button>
                    ) : (
                        <button onClick={handlePlace} disabled={placing || !canPlace}
                            className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-xl font-black text-[12px] uppercase tracking-wider transition-all active:scale-[0.97] ${placing || !canPlace ? 'bg-white/[0.04] text-white/25 cursor-not-allowed border border-white/[0.06]' : 'bg-amber-500 hover:bg-amber-400 text-[#06080c] shadow-[0_0_20px_rgba(245,158,11,0.35)]'}`}>
                            {placing && <span className="w-3.5 h-3.5 border-[2.5px] border-black/20 border-t-black rounded-full animate-spin" />}
                            {placing ? 'Placing…' : `Place ${bets.length > 1 ? `${bets.length} Bets` : 'Bet'} · ${sym}${totalStake.toLocaleString('en-IN')}`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    // ── STATIC mode (match detail sidebar) ────────────────────────────────────
    if (mode === 'static') {
        return (
            <div className={`w-full flex flex-col bg-[#06080c] border border-white/[0.08] rounded-2xl overflow-hidden h-auto ${className}`}>
                <SlimHeader showTabs={false} />
                <TabRow />
                <div className="flex-1 overflow-hidden flex flex-col max-h-[440px]">
                    <Content />
                    {tab === 'slip' && bets.length > 0 && <Footer />}
                </div>
            </div>
        );
    }

    // ── FLOATING mode ─────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Mobile backdrop ── */}
            {isBetslipOpen && (
                <div
                    className="fixed inset-0 z-[44] bg-black/55 backdrop-blur-[2px] md:hidden"
                    onClick={toggleBetslip}
                />
            )}

            {/* ── Mobile bottom sheet ── */}
            <div
                className={`fixed z-[45] inset-x-0 bottom-0 md:hidden ${className}`}
                style={{ pointerEvents: isBetslipOpen ? 'auto' : 'none' }}
            >
                <div
                    style={{
                        transform: isBetslipOpen ? 'translateY(0)' : 'translateY(100%)',
                        transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
                        willChange: 'transform',
                        height: 'calc(100dvh - 64px)',
                        paddingBottom: 'var(--mobile-nav-height)',
                    }}
                    className="flex flex-col rounded-t-2xl border border-b-0 border-white/[0.08] bg-[#06080c] overflow-hidden shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
                >
                    <div className="flex justify-center pt-2.5 pb-1">
                        <div className="w-10 h-1 rounded-full bg-white/15" />
                    </div>

                    <SlimHeader />
                    {oneClickEnabled && <QuickStakeBar />}
                    <TabRow />

                    <div className="flex-1 overflow-y-auto overscroll-contain bg-[#06080c] flex flex-col pt-2 pb-16">
                        {tab === 'slip' && (
                            bets.length === 0 ? (
                                <div className="flex flex-col h-full items-center justify-center py-24 gap-2 text-center select-none bg-[#06080c]">
                                    <span className="text-2xl">🎟️</span>
                                    <p className="text-[11px] font-bold text-white/25">Betslip is empty</p>
                                    <p className="text-[9px] text-white/15">Tap any odds to add a selection</p>
                                </div>
                            ) : (
                                <div className="px-2.5 h-full">
                                    <BetslipList bets={bets} sym={sym} onRemove={removeBet} onStake={updateStake} />
                                    <div className="h-4" />
                                </div>
                            )
                        )}

                        {tab === 'mybets' && (
                            myBets.length === 0 ? (
                                <div className="flex flex-col h-full items-center justify-center py-24 gap-2 text-center select-none bg-[#06080c]">
                                    <BookMarked size={18} className="text-white/15" />
                                    <p className="text-[11px] font-bold text-white/25">No bets yet</p>
                                </div>
                            ) : (
                                <div className="px-2.5 space-y-1.5 h-full pt-2">
                                    {myBets.map(bet => {
                                        const { chip, bar } = statusStyle(bet.status);
                                        const lb = isLineBasedFancyMarket({ marketType: (bet as any).gtype, marketName: bet.marketName, selectionName: bet.selectionName });
                                        return (
                                            <div key={bet.id} className="relative rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                                                <span className={`absolute inset-y-0 left-0 w-[3px] rounded-r-full ${bar}`} />
                                                <div className="pl-3.5 pr-2.5 py-2 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${chip}`}>{bet.status === 'PENDING' ? 'ACCEPTED' : bet.status.replace('_', ' ')}</span>
                                                        <span className="text-[9px] text-white/25">{new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-white truncate">{bet.eventName}</p>
                                                    <p className="text-[9px] text-white/40 truncate">{bet.selectionName} · {lb ? `Runs ${bet.odds}` : `×${Number(bet.odds).toFixed(2)}`}</p>
                                                    <div className="flex justify-between text-[9px] pt-1 border-t border-white/[0.06]">
                                                        <span className="text-white/30">Stake <span className="text-white/55 font-bold">{sym}{bet.stake}</span></span>
                                                        <span className={`font-bold ${bet.status === 'WON' ? 'text-emerald-400' : bet.status === 'CASHED_OUT' ? 'text-amber-400' : 'text-amber-300'}`}>
                                                            {sym}{(bet.status === 'PENDING' ? getBetPendingMaxReturn(bet) : (getBetSettledReturn(bet) ?? bet.potentialWin)).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    {bet.status === 'PENDING' && <SportsBetCashoutWidget bet={bet} onSuccess={async () => { await Promise.all([refreshMyBets(), refreshWallet()]); }} compact />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>

                    {tab === 'slip' && bets.length > 0 && (
                        <div className="mt-auto">
                            <Footer />
                        </div>
                    )}
                </div>
            </div>




            {/* ── Desktop (md+): Structural right sidebar ── */}
            <div
                ref={desktopDrawerRef}
                className={`${isSportsRoute ? 'hidden md:block' : 'hidden'} sticky top-0 h-[100dvh] flex-shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] z-[40] ${className}`}
                style={{
                    width: isBetslipOpen ? 360 : 0,
                    pointerEvents: 'auto',
                }}
            >
                <div
                    className="absolute top-[64px] left-0 bottom-0 w-[360px] flex flex-col border-l border-white/[0.08] bg-[#06080c]"
                    style={{
                        boxShadow: isBetslipOpen ? '-8px 0 30px rgba(0,0,0,0.5)' : 'none'
                    }}
                >
                    {/* Desktop Toggle Button */}
                    <button
                        onClick={toggleBetslip}
                        className={`absolute top-1/2 -translate-y-1/2 -left-[40px] flex items-center justify-center bg-[#0b0f15] border border-white/[0.08] border-r-0 rounded-l-xl shadow-[-8px_0_24px_rgba(0,0,0,0.5)] transition-colors w-[40px] h-24 z-10 ${isBetslipOpen ? 'hover:bg-red-500/10' : 'hover:bg-amber-500/10'}`}
                        aria-label={isBetslipOpen ? "Close betslip" : "Open betslip"}
                    >
                        <div className="flex flex-col items-center gap-2 text-amber-400">
                            <AnimatedBadge count={bets.length} />
                            <span className="[writing-mode:vertical-lr] text-[11px] font-black tracking-widest rotate-180">BETSLIP</span>
                        </div>
                    </button>

                    <div className="flex flex-col h-full overflow-hidden bg-[#06080c]">
                        <SlimHeader />
                        {oneClickEnabled && <QuickStakeBar />}
                        <TabRow />

                        <div className="flex-1 overflow-auto bg-[#06080c] flex flex-col pt-2 pb-16">
                            {tab === 'slip' && (
                                bets.length === 0 ? (
                                    <div className="flex flex-col h-full items-center justify-center py-24 gap-2 text-center select-none bg-[#06080c]">
                                        <span className="text-2xl">🎟️</span>
                                        <p className="text-[11px] font-bold text-white/25">Betslip is empty</p>
                                        <p className="text-[9px] text-white/15">Tap any odds to add a selection</p>
                                    </div>
                                ) : (
                                    <div className="px-2.5 h-full">
                                        <BetslipList bets={bets} sym={sym} onRemove={removeBet} onStake={updateStake} />
                                        <div className="h-4" />
                                    </div>
                                )
                            )}

                            {tab === 'mybets' && (
                                myBets.length === 0 ? (
                                    <div className="flex flex-col h-full items-center justify-center py-24 gap-2 text-center select-none bg-[#06080c]">
                                        <BookMarked size={18} className="text-white/15" />
                                        <p className="text-[11px] font-bold text-white/25">No bets yet</p>
                                    </div>
                                ) : (
                                    <div className="px-2.5 space-y-1.5 h-full pt-2">
                                        {myBets.map(bet => {
                                            const { chip, bar } = statusStyle(bet.status);
                                            const lb = isLineBasedFancyMarket({ marketType: (bet as any).gtype, marketName: bet.marketName, selectionName: bet.selectionName });
                                            return (
                                                <div key={bet.id} className="relative rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                                                    <span className={`absolute inset-y-0 left-0 w-[3px] rounded-r-full ${bar}`} />
                                                    <div className="pl-3.5 pr-2.5 py-2 space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${chip}`}>{bet.status === 'PENDING' ? 'ACCEPTED' : bet.status.replace('_', ' ')}</span>
                                                            <span className="text-[9px] text-white/25">{new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-white truncate">{bet.eventName}</p>
                                                        <p className="text-[9px] text-white/40 truncate">{bet.selectionName} · {lb ? `Runs ${bet.odds}` : `×${Number(bet.odds).toFixed(2)}`}</p>
                                                        <div className="flex justify-between text-[9px] pt-1 border-t border-white/[0.06]">
                                                            <span className="text-white/30">Stake <span className="text-white/55 font-bold">{sym}{bet.stake}</span></span>
                                                            <span className={`font-bold ${bet.status === 'WON' ? 'text-emerald-400' : bet.status === 'CASHED_OUT' ? 'text-amber-400' : 'text-amber-300'}`}>
                                                                {sym}{(bet.status === 'PENDING' ? getBetPendingMaxReturn(bet) : (getBetSettledReturn(bet) ?? bet.potentialWin)).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        {bet.status === 'PENDING' && <SportsBetCashoutWidget bet={bet} onSuccess={async () => { await Promise.all([refreshMyBets(), refreshWallet()]); }} compact />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>

                        {tab === 'slip' && bets.length > 0 && (
                            <div className="mt-auto">
                                <Footer />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
