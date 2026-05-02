'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useModal } from '@/context/ModalContext';
import {
    X, ChevronUp, ChevronDown, CheckCircle, AlertCircle,
    Clock, Trash2, BookMarked, Zap, User, Receipt, Clipboard, Share2, Crown,
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
const BOOKING_VALIDITY_MS = 2 * 60 * 1000;

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
        WON:        { chip: 'bg-[var(--emerald-soft)] text-[var(--emerald)] border-[var(--emerald)]/25', bar: 'bg-[var(--emerald)]' },
        LOST:       { chip: 'bg-[var(--crimson-soft)] text-[var(--crimson)] border-[var(--crimson)]/25', bar: 'bg-[var(--crimson)]' },
        CASHED_OUT: { chip: 'bg-[var(--gold-soft)] text-[var(--gold-bright)] border-[var(--line-gold)]', bar: 'bg-[var(--gold)]' },
        VOID:       { chip: 'bg-[var(--bg-inlay)] text-[var(--ink-faint)] border-[var(--line-default)]', bar: 'bg-[var(--ink-whisper)]' },
        PENDING:    { chip: 'bg-[var(--gold-soft)] text-[var(--gold-bright)] border-[var(--line-gold)]', bar: 'bg-[var(--gold)]' },
    };
    return m[s] ?? m.PENDING;
}

interface RightSidebarProps {
    mode?: 'floating' | 'static';
    className?: string;
}

// ─── BetCard ──────────────────────────────────────────────────────────────────
interface BetCardProps {
    bet: {
        id: string; eventId: string; eventName: string;
        marketName: string; selectionName: string;
        odds: number; marketType?: string; rate?: number;
        stake: number; potentialWin: number;
    };
    sym: string;
    onRemove: (id: string) => void;
    onStake: (id: string, v: number) => void;
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
    const profit = lb ? null : potentialProfit(stakeNum || bet.stake, bet.odds);

    return (
        <div className="group relative rounded-2xl bg-[var(--bg-surface)] border border-[var(--line-default)] hover:border-[var(--line-gold)] transition-colors overflow-hidden">
            {/* gold left accent */}
            <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-[var(--gold-bright)] via-[var(--gold)] to-[var(--gold-deep)]" />

            <div className="pl-3.5 pr-2.5 py-2.5 space-y-2">
                {/* Selection row */}
                <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-[var(--gold-bright)] truncate leading-tight">{bet.selectionName}</p>
                        <p className="text-[10px] text-[var(--ink-faint)] leading-tight mt-0.5 truncate">
                            {bet.eventName}
                        </p>
                        <p className="text-[9px] text-[var(--ink-whisper)] leading-tight mt-0.5 truncate uppercase tracking-wider">
                            {bet.marketName}
                        </p>
                    </div>
                    <span className="flex-shrink-0 num text-[12px] font-bold text-[var(--ink)] bg-[var(--gold-soft)] border border-[var(--line-gold)] px-2 py-1 rounded-lg leading-none">
                        {fmtOdds(bet.odds, lb)}
                    </span>
                    <button
                        onClick={() => onRemove(bet.id)}
                        aria-label="Remove selection"
                        className="p-1 rounded-lg text-[var(--ink-whisper)] hover:text-[var(--crimson)] hover:bg-[var(--crimson-soft)] transition-all active:scale-90 flex-shrink-0"
                    >
                        <X size={11} />
                    </button>
                </div>

                {/* Stake + potential row */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] num text-[var(--ink-faint)] pointer-events-none">{sym}</span>
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
                            className="w-full rounded-lg bg-[var(--bg-inlay)] border border-[var(--line-default)] focus:border-[var(--line-gold)] text-[var(--ink)] text-[12.5px] font-bold pl-6 pr-2 py-1.5 outline-none transition-colors placeholder:text-[var(--ink-whisper)] num"
                        />
                    </div>
                    <div className="text-right flex-shrink-0 min-w-[58px]">
                        <p className="text-[8.5px] text-[var(--ink-faint)] leading-none uppercase tracking-wider">{profit !== null ? 'Profit' : 'Return'}</p>
                        <p className="text-[11.5px] font-bold text-[var(--gold-bright)] num leading-tight mt-0.5">
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
        <div className="space-y-2">
            {bets.map(bet => (
                <div key={bet.id} className="space-y-1.5">
                    <BetCard bet={bet} sym={sym} onRemove={onRemove} onStake={onStake} />
                    {e6.has(bet.eventId) && isMatchOddsMarket(bet) && (
                        <div className="rounded-xl px-3 py-2 text-[10px] bg-[var(--emerald-soft)] border border-[var(--emerald)]/20 text-[var(--emerald)]">
                            <p className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Crown size={10} /> Early 6 Refund
                            </p>
                            <p className="text-[var(--ink-dim)] mt-0.5">Qualifies for cashback · Pre-match Match Odds only</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── AnimatedBadge ────────────────────────────────────────────────────────────
function AnimatedBadge({ count }: { count: number }) {
    const prevRef = useRef(count);
    const [popKey, setPopKey] = useState(0);
    const [plusKey, setPlusKey] = useState(0);
    const [delta, setDelta] = useState(0);

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
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[var(--gold-bright)] whitespace-nowrap num"
                >
                    +{delta}
                </span>
            )}
            <span
                key={`badge-${popKey}`}
                className="h-5 min-w-[20px] px-1.5 rounded-full text-[9px] font-bold flex items-center justify-center leading-none bg-gradient-to-br from-[var(--gold-bright)] to-[var(--gold)] text-[var(--bg-base)] num shadow-[var(--gold-halo)]"
            >
                {count}
            </span>
        </span>
    );
}

// ─── BookingBanner ────────────────────────────────────────────────────────────
function BookingBanner({
    code, countdown, onCopy, onDismiss,
}: { code: string; countdown: number; onCopy: () => void; onDismiss: () => void }) {
    const minutes = Math.floor(countdown / 60);
    const seconds = String(countdown % 60).padStart(2, '0');
    const urgent = countdown <= 30;
    const warning = countdown <= 60;
    const progressColor = urgent
        ? 'bg-[var(--crimson)]'
        : warning
            ? 'bg-[var(--gold-bright)]'
            : 'bg-[var(--gold)]';

    return (
        <div className="rounded-2xl bg-[var(--gold-soft)] border border-[var(--line-gold)] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 gap-2">
                <div className="flex flex-col min-w-0">
                    <span className="text-[9px] text-[var(--gold-bright)]/70 uppercase font-bold tracking-wider">Booking Code</span>
                    <span className="text-[16px] font-bold text-[var(--gold-bright)] tracking-[0.18em] num leading-tight">{code}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex flex-col items-end">
                        <span className="text-[8.5px] text-[var(--ink-faint)] uppercase font-bold tracking-wider">Expires</span>
                        <span className={`text-[12.5px] font-bold num ${urgent ? 'text-[var(--crimson)]' : warning ? 'text-[var(--gold-bright)]' : 'text-[var(--gold)]'}`}>
                            {minutes}:{seconds}
                        </span>
                    </div>
                    <button onClick={onCopy} title="Copy code" aria-label="Copy code"
                        className="p-1.5 bg-[var(--gold-soft)] hover:brightness-125 rounded-lg text-[var(--gold-bright)] border border-[var(--line-gold)] transition-all active:scale-90">
                        <Clipboard size={13} />
                    </button>
                    <button onClick={onDismiss} title="Dismiss" aria-label="Dismiss"
                        className="p-1.5 bg-[var(--bg-inlay)] hover:bg-[var(--crimson-soft)] rounded-lg text-[var(--ink-faint)] hover:text-[var(--crimson)] border border-[var(--line-default)] transition-all active:scale-90">
                        <X size={13} />
                    </button>
                </div>
            </div>
            <div className="h-[2px] bg-black/30">
                <div
                    className={`h-full transition-all duration-1000 ease-linear ${progressColor}`}
                    style={{ width: `${Math.min(100, (countdown / 120) * 100)}%` }}
                />
            </div>
            <p className="text-[9.5px] text-[var(--gold-bright)]/60 px-3 py-1.5 text-center">Share this code · One-time use</p>
        </div>
    );
}

// ─── BookingLoader ────────────────────────────────────────────────────────────
function BookingLoader({
    value, onChange, onSubmit, loading,
}: { value: string; onChange: (v: string) => void; onSubmit: (e?: React.FormEvent) => void; loading: boolean }) {
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }} className="flex gap-2">
            <div className="relative flex-1">
                <BookMarked size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                <input
                    type="text"
                    placeholder="Enter Booking Code"
                    value={value}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    className="w-full bg-[var(--bg-inlay)] border border-[var(--line-default)] focus:border-[var(--line-gold)] rounded-xl pl-8 pr-3 py-2.5 text-[12px] font-bold tracking-widest text-[var(--ink)] uppercase outline-none placeholder:text-[var(--ink-whisper)] placeholder:font-normal placeholder:tracking-normal num"
                />
            </div>
            <button
                type="submit"
                disabled={!value.trim() || loading}
                className={`px-4 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all ${
                    !value.trim() || loading
                        ? 'bg-[var(--bg-inlay)] text-[var(--ink-whisper)] cursor-not-allowed border border-[var(--line-default)]'
                        : 'bg-gradient-to-br from-[var(--gold-bright)] to-[var(--gold)] hover:brightness-110 text-[var(--bg-base)] shadow-[var(--gold-halo)] active:scale-[0.97]'
                }`}
            >
                {loading
                    ? <span className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin inline-block align-middle" />
                    : 'Load'}
            </button>
        </form>
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
        bookBets, loadBookedBet,
    } = useBets();

    const { isAuthenticated } = useAuth();
    const { openLogin } = useModal();
    const { activeSymbol: sym, selectedWallet, selectedSubWallet, activeBalance, refreshWallet } = useWallet();
    const pathname = usePathname();
    const isSportsRoute = pathname === '/sports'
        || pathname.startsWith('/sports/')
        || pathname.startsWith('/sportsbook');

    const [placing, setPlacing] = useState(false);
    const [booking, setBooking] = useState(false);
    const [bookedId, setBookedId] = useState<string | null>(null);
    const [bookedExpiresAt, setBookedExpiresAt] = useState<number | null>(null);
    const [bookedCountdown, setBookedCountdown] = useState(0);
    const [loadCode, setLoadCode] = useState('');
    const [loadingCode, setLoadingCode] = useState(false);
    const [tab, setTab] = useState<'slip' | 'mybets'>('slip');
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

    useEffect(() => {
        if (!feedback) return;
        const t = setTimeout(() => setFeedback(null), 3500);
        return () => clearTimeout(t);
    }, [feedback]);

    // Booking countdown timer
    useEffect(() => {
        if (!bookedExpiresAt) { setBookedCountdown(0); return; }
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((bookedExpiresAt - Date.now()) / 1000));
            setBookedCountdown(remaining);
            if (remaining <= 0) {
                setBookedId(null);
                setBookedExpiresAt(null);
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [bookedExpiresAt]);

    const dismissBooking = () => {
        setBookedId(null);
        setBookedExpiresAt(null);
        setBookedCountdown(0);
    };

    // Auto-open when bet is added + dismiss any active booking
    useEffect(() => {
        if (bets.length > 0) {
            if (!isBetslipOpen) toggleBetslip();
            if (bookedId) dismissBooking();
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

    const handleBookBet = async () => {
        if (!bets.some(b => b.stake > 0)) {
            setFeedback({ ok: false, msg: 'Enter a stake to book bets.' });
            return;
        }
        setBooking(true);
        try {
            const id = await bookBets();
            setBookedId(id);
            setBookedExpiresAt(Date.now() + BOOKING_VALIDITY_MS);
            clearBets();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to book bet.';
            setFeedback({ ok: false, msg });
        } finally {
            setBooking(false);
        }
    };

    const copyBookingId = () => {
        if (!bookedId) return;
        navigator.clipboard.writeText(bookedId);
        setFeedback({ ok: true, msg: 'Booking ID copied!' });
    };

    const handleLoadCode = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const code = loadCode.trim();
        if (!code) return;
        setLoadingCode(true);
        try {
            await loadBookedBet(code);
            setFeedback({ ok: true, msg: 'Bets loaded — place your bet now!' });
            setLoadCode('');
            dismissBooking();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Invalid or expired booking code.';
            setFeedback({ ok: false, msg });
        } finally {
            setLoadingCode(false);
        }
    };

    const totalProfit = Math.max(0, totalPotentialWin - totalStake);
    const canPlace = bets.some(b => b.stake > 0);

    // ── Sub-components ────────────────────────────────────────────────────────

    const SlimHeader = () => (
        <div className={`w-full h-[54px] flex items-center justify-between px-4 ${mode === 'floating' ? '' : 'cursor-default'} bg-[var(--bg-elevated)] border-b border-[var(--line-default)]`}>
            <div
                onClick={mode === 'floating' ? toggleBetslip : undefined}
                className={`flex flex-1 items-center gap-2.5 h-full ${mode === 'floating' ? 'cursor-pointer select-none' : ''}`}
            >
                <div className="w-8 h-8 rounded-xl bg-[var(--gold-soft)] border border-[var(--line-gold)] flex items-center justify-center flex-shrink-0">
                    <Receipt size={14} className="text-[var(--gold-bright)]" />
                </div>
                <div>
                    <span className="text-[13px] font-bold text-[var(--ink)] tracking-tight block leading-none">Betslip</span>
                    <span className="text-[9px] text-[var(--ink-faint)] uppercase tracking-wider">Stake · Win · Cash out</span>
                </div>
                <AnimatedBadge count={bets.length} />
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onClick={() => setOneClickEnabled(!oneClickEnabled)}
                    title="Quick Bet"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:bg-[var(--bg-inlay)] active:scale-90"
                >
                    <Zap size={11} className={oneClickEnabled ? 'text-[var(--gold-bright)]' : 'text-[var(--ink-faint)]'} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${oneClickEnabled ? 'text-[var(--gold-bright)]' : 'text-[var(--ink-faint)]'}`}>
                        Quick
                    </span>
                    <span className={`relative flex w-8 h-[18px] rounded-full transition-colors duration-200 ${
                        oneClickEnabled ? 'bg-gradient-to-br from-[var(--gold-bright)] to-[var(--gold)]' : 'bg-[var(--bg-inlay)] border border-[var(--line-default)]'
                    }`}>
                        <span className={`absolute top-[3px] w-3 h-3 rounded-full shadow transition-all duration-200 ${
                            oneClickEnabled ? 'translate-x-[17px] bg-[var(--bg-base)]' : 'translate-x-[3px] bg-[var(--ink-faint)]'
                        }`} />
                    </span>
                </button>

                {mode === 'floating' && (
                    <button
                        type="button"
                        onClick={toggleBetslip}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg-inlay)] text-[var(--ink-faint)] hover:text-[var(--ink)] transition-all active:scale-90"
                        aria-label={isBetslipOpen ? 'Close betslip' : 'Open betslip'}
                    >
                        {isBetslipOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                )}
            </div>
        </div>
    );

    const QuickStakeBar = () => (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-base)] border-b border-[var(--line-default)]">
            <Zap size={11} className="text-[var(--gold-bright)] shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold-bright)]/80 shrink-0">Stake</span>
            <input
                type="number"
                min={1}
                value={oneClickStake}
                onChange={(e) => setOneClickStake(Math.max(1, Number(e.target.value) || 1))}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-[var(--bg-inlay)] border border-[var(--line-default)] focus:border-[var(--line-gold)] rounded-lg px-2 py-1 text-[12px] font-bold text-[var(--ink)] num outline-none w-full text-right"
            />
            <div className="flex gap-1">
                {QUICK_STAKES.map(amt => (
                    <button key={amt} type="button"
                        onClick={(e) => { e.stopPropagation(); setOneClickStake(amt); }}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all active:scale-90 num ${
                            oneClickStake === amt
                                ? 'bg-gradient-to-br from-[var(--gold-bright)] to-[var(--gold)] text-[var(--bg-base)]'
                                : 'bg-[var(--bg-inlay)] text-[var(--ink-faint)] hover:bg-[var(--bg-raised)] hover:text-[var(--ink)]'
                        }`}>
                        {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                ))}
            </div>
        </div>
    );

    const TabRow = () => (
        <div className="flex border-b border-[var(--line-default)] bg-[var(--bg-surface)] flex-shrink-0">
            {(['slip', 'mybets'] as const).map((t, i) => (
                <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-[0.1em] transition-all border-b-2 ${
                        tab === t
                            ? 'text-[var(--gold-bright)] border-[var(--gold)]'
                            : 'text-[var(--ink-faint)] border-transparent hover:text-[var(--ink-dim)]'
                    }`}
                >
                    {['Slip', 'My Bets'][i]}
                </button>
            ))}
        </div>
    );

    const EmptySlip = () => (
        <div className="flex flex-col h-full items-center justify-center px-4 py-6 gap-6">
            {!(bookedId && bookedCountdown > 0) && (
                <div className="flex flex-col items-center justify-center gap-3 text-center select-none">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--line-default)] flex items-center justify-center">
                        <Receipt size={26} className="text-[var(--ink-faint)]" />
                    </div>
                    <div>
                        <p className="text-[12.5px] font-bold text-[var(--ink-dim)]">Your betslip is empty</p>
                        <p className="text-[10px] text-[var(--ink-faint)] mt-1">Tap any odds to add a selection</p>
                    </div>
                </div>
            )}

            {!(bookedId && bookedCountdown > 0) && (
                <div className="w-full max-w-[280px] border-t border-[var(--line-default)] pt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <BookMarked size={12} className="text-[var(--ink-faint)]" />
                        <p className="text-[10px] font-bold text-[var(--ink-faint)] uppercase tracking-wider">Load Booking Code</p>
                    </div>
                    <BookingLoader value={loadCode} onChange={setLoadCode} onSubmit={handleLoadCode} loading={loadingCode} />
                    <p className="text-[9px] text-[var(--ink-whisper)] mt-2 text-center">Booking codes are valid for 2 minutes · one-time use</p>
                </div>
            )}
        </div>
    );

    const renderMyBets = () => {
        if (myBets.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center select-none">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--line-default)] flex items-center justify-center">
                        <BookMarked size={22} className="text-[var(--ink-faint)]" />
                    </div>
                    <p className="text-[12px] font-bold text-[var(--ink-dim)]">No bets yet</p>
                </div>
            );
        }
        return (
            <div className="space-y-2">
                {myBets.map(bet => {
                    const { chip, bar } = statusStyle(bet.status);
                    const partial = hasPartialCashout(bet);
                    const lb = isLineBasedFancyMarket({ marketType: (bet as any).gtype, marketName: bet.marketName, selectionName: bet.selectionName });
                    const pnl = getBetNetPnL(bet);
                    return (
                        <div key={bet.id} className="relative rounded-2xl bg-[var(--bg-surface)] border border-[var(--line-default)] overflow-hidden">
                            <span className={`absolute inset-y-0 left-0 w-[3px] rounded-r-full ${bar}`} />
                            <div className="pl-4 pr-3 pt-3 pb-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${chip}`}>
                                        {bet.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[9px] text-[var(--ink-faint)] flex items-center gap-1 num">
                                        <Clock size={9} />
                                        {new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[11.5px] font-bold text-[var(--ink)] truncate">{bet.eventName}</p>
                                    <p className="text-[10px] text-[var(--ink-faint)] mt-0.5 flex items-center gap-1.5">
                                        <span className="text-[var(--ink-dim)] font-semibold truncate">{bet.selectionName}</span>
                                        <span className="text-[var(--ink-whisper)]">·</span>
                                        {lb
                                            ? <span>Runs <span className="text-[var(--ink-dim)] font-bold num">{bet.odds}</span></span>
                                            : <span>Odds <span className="text-[var(--ink-dim)] font-bold num">×{Number(bet.odds).toFixed(2)}</span></span>}
                                    </p>
                                </div>
                                {partial && (
                                    <p className="text-[10px] text-[var(--gold-bright)] bg-[var(--gold-soft)] border border-[var(--line-gold)] rounded-lg px-2.5 py-1.5">
                                        Partial cash out: <span className="num">{sym}{getBetPartialCashoutValue(bet).toFixed(2)}</span>
                                    </p>
                                )}
                                <div className="rounded-xl bg-[var(--bg-inlay)] border border-[var(--line-default)] px-3 py-2.5 text-[10px] grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    <span className="text-[var(--ink-faint)]">{partial ? 'Remaining' : 'Stake'}</span>
                                    <span className="text-right font-bold text-[var(--ink-dim)] num">{sym}{bet.stake}</span>
                                    {partial && (<>
                                        <span className="text-[var(--ink-faint)]">Original</span>
                                        <span className="text-right font-bold text-[var(--ink-dim)] num">{sym}{getBetOriginalStake(bet).toFixed(2)}</span>
                                    </>)}
                                    <span className="text-[var(--ink-faint)]">{bet.status === 'PENDING' ? 'Max Return' : 'Returned'}</span>
                                    <span className={`text-right font-bold num ${
                                        bet.status === 'WON' ? 'text-[var(--emerald)]'
                                            : bet.status === 'CASHED_OUT' ? 'text-[var(--gold-bright)]'
                                                : bet.status === 'PENDING' ? 'text-[var(--gold-bright)]'
                                                    : 'text-[var(--ink-dim)]'
                                    }`}>
                                        {sym}{(bet.status === 'PENDING' ? getBetPendingMaxReturn(bet) : (getBetSettledReturn(bet) ?? bet.potentialWin)).toFixed(2)}
                                    </span>
                                    {bet.status !== 'PENDING' && pnl !== null && (<>
                                        <span className="text-[var(--ink-faint)]">Net P&amp;L</span>
                                        <span className={`text-right font-bold num ${pnl >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--crimson)]'}`}>
                                            {pnl >= 0 ? '+' : '-'}{sym}{Math.abs(pnl).toFixed(2)}
                                        </span>
                                    </>)}
                                </div>
                                {bet.status === 'PENDING' && (
                                    <SportsBetCashoutWidget
                                        bet={bet}
                                        onSuccess={async () => { await Promise.all([refreshMyBets(), refreshWallet()]); }}
                                        compact
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const Content = () => (
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 bg-[var(--bg-base)]"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--line-strong) transparent' }}>
            {tab === 'slip'
                ? (bets.length === 0 ? <EmptySlip /> : <BetslipList bets={bets} sym={sym} onRemove={removeBet} onStake={updateStake} />)
                : renderMyBets()}
        </div>
    );

    const Footer = () => (
        <div className="px-3 pt-3 pb-4 border-t border-[var(--line-default)] bg-[var(--bg-elevated)] space-y-3 flex-shrink-0">
            {/* Quick stakes */}
            {bets.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                    {QUICK_STAKES.map(amt => (
                        <button key={amt}
                            onClick={() => bets.forEach(b => updateStake(b.id, amt))}
                            className="py-2 rounded-xl bg-[var(--bg-inlay)] hover:bg-[var(--gold-soft)] text-[var(--ink-dim)] hover:text-[var(--gold-bright)] text-[10.5px] font-bold border border-[var(--line-default)] hover:border-[var(--line-gold)] transition-all active:scale-95 num">
                            {amt >= 1000 ? `${amt / 1000}K` : amt}
                        </button>
                    ))}
                </div>
            )}

            {/* Summary */}
            {bets.length > 0 && (
                <div className="rounded-xl border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--line-default)] text-[10px]">
                        <span className="text-[var(--ink-faint)] uppercase tracking-wider">Wallet</span>
                        <span className={`font-bold text-[9px] px-2 py-0.5 rounded-lg border uppercase tracking-wider num ${
                            selectedWallet === 'crypto'
                                ? 'bg-[var(--violet-soft)] text-[var(--violet)] border-[var(--violet)]/25'
                                : 'bg-[var(--gold-soft)] text-[var(--gold-bright)] border-[var(--line-gold)]'
                        }`}>
                            {selectedSubWallet.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} · {sym}{activeBalance.toFixed(2)}
                        </span>
                    </div>
                    <div className="px-3.5 py-3 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                            <span className="text-[var(--ink-faint)]">Total Stake</span>
                            <span className="font-bold text-[var(--ink)] num">{sym}{totalStake.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--ink-faint)]">Potential Profit</span>
                            <span className="font-bold text-[var(--gold-bright)] num">{sym}{fmtMoney(totalProfit)}</span>
                        </div>
                        <div className="flex justify-between border-t border-[var(--line-default)] pt-1.5 mt-0.5">
                            <span className="text-[var(--ink-dim)] font-bold uppercase tracking-wider text-[10px]">Total Return</span>
                            <span className="font-bold text-[var(--ink)] num text-[13.5px]">{sym}{fmtMoney(totalPotentialWin)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback banner */}
            {feedback && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold border ${
                    feedback.ok
                        ? 'bg-[var(--emerald-soft)] text-[var(--emerald)] border-[var(--emerald)]/25'
                        : 'bg-[var(--crimson-soft)] text-[var(--crimson)] border-[var(--crimson)]/25'
                }`}>
                    {feedback.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                    {feedback.msg}
                </div>
            )}

            {/* Active booking banner */}
            {bookedId && bookedCountdown > 0 && (
                <BookingBanner
                    code={bookedId}
                    countdown={bookedCountdown}
                    onCopy={copyBookingId}
                    onDismiss={dismissBooking}
                />
            )}

            {/* Empty state load form (within footer when slip empty) */}
            {bets.length === 0 && !(bookedId && bookedCountdown > 0) && (
                <BookingLoader value={loadCode} onChange={setLoadCode} onSubmit={handleLoadCode} loading={loadingCode} />
            )}

            {/* CTA row */}
            {bets.length > 0 && (
                <div className="flex gap-2">
                    {bets.length > 1 && (
                        <button onClick={() => clearBets()} title="Clear all" aria-label="Clear all selections"
                            className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--bg-inlay)] border border-[var(--line-default)] hover:bg-[var(--crimson-soft)] hover:border-[var(--crimson)]/25 text-[var(--ink-faint)] hover:text-[var(--crimson)] transition-all active:scale-90">
                            <Trash2 size={13} />
                        </button>
                    )}
                    {!isAuthenticated ? (
                        <>
                            <button onClick={handleBookBet} disabled={booking || !canPlace}
                                className={`flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] ${
                                    booking || !canPlace
                                        ? 'bg-[var(--bg-inlay)] text-[var(--ink-whisper)] cursor-not-allowed border border-[var(--line-default)]'
                                        : 'bg-[var(--bg-inlay)] hover:bg-[var(--bg-raised)] text-[var(--ink)] border border-[var(--line-strong)]'
                                }`}>
                                {booking
                                    ? <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    : <Share2 size={13} />}
                                Book
                            </button>
                            <button onClick={openLogin}
                                className="flex-[1.5] h-11 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[var(--gold-bright)] to-[var(--gold)] hover:brightness-110 text-[var(--bg-base)] font-bold text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] shadow-[var(--gold-halo)]">
                                <User size={13} /> Login
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={handleBookBet} disabled={booking || !canPlace} title="Book bet → share code"
                                aria-label="Book bet"
                                className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl font-bold transition-all active:scale-90 ${
                                    booking || !canPlace
                                        ? 'bg-[var(--bg-inlay)] text-[var(--ink-whisper)] cursor-not-allowed border border-[var(--line-default)]'
                                        : 'bg-[var(--bg-inlay)] hover:bg-[var(--gold-soft)] text-[var(--ink-dim)] hover:text-[var(--gold-bright)] border border-[var(--line-default)] hover:border-[var(--line-gold)]'
                                }`}>
                                {booking
                                    ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    : <Share2 size={13} />}
                            </button>
                            <button onClick={handlePlace} disabled={placing || !canPlace}
                                className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-xl font-bold text-[12px] uppercase tracking-wider transition-all active:scale-[0.97] ${
                                    placing || !canPlace
                                        ? 'bg-[var(--bg-inlay)] text-[var(--ink-whisper)] cursor-not-allowed border border-[var(--line-default)]'
                                        : 'bg-gradient-to-br from-[var(--gold-bright)] to-[var(--gold)] hover:brightness-110 text-[var(--bg-base)] shadow-[var(--gold-halo)]'
                                }`}>
                                {placing && <span className="w-3.5 h-3.5 border-[2.5px] border-black/20 border-t-black rounded-full animate-spin" />}
                                {placing ? 'Placing…' : `Place ${bets.length > 1 ? `${bets.length} Bets` : 'Bet'} · ${sym}${totalStake.toLocaleString('en-IN')}`}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );

    // ── STATIC mode (match detail sidebar) ────────────────────────────────────
    if (mode === 'static') {
        return (
            <div className={`w-full flex flex-col bg-[var(--bg-base)] border border-[var(--line-default)] rounded-2xl overflow-hidden h-auto ${className}`}>
                <SlimHeader />
                {oneClickEnabled && <QuickStakeBar />}
                <TabRow />
                <div className="flex-1 overflow-hidden flex flex-col max-h-[460px]">
                    <Content />
                    {tab === 'slip' && (bets.length > 0 || (bookedId && bookedCountdown > 0)) && <Footer />}
                </div>
            </div>
        );
    }

    // ── FLOATING mode ─────────────────────────────────────────────────────────
    return (
        <>
            {/* Mobile backdrop */}
            {isBetslipOpen && (
                <div
                    className="fixed inset-0 z-[44] bg-black/60 backdrop-blur-[2px] md:hidden"
                    onClick={toggleBetslip}
                />
            )}

            {/* Mobile bottom sheet */}
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
                    className="flex flex-col rounded-t-3xl border border-b-0 border-[var(--line-gold)] bg-[var(--bg-base)] overflow-hidden shadow-[0_-12px_40px_rgba(0,0,0,0.6)]"
                >
                    <div className="flex justify-center pt-2.5 pb-1">
                        <div className="w-10 h-1 rounded-full bg-[var(--line-strong)]" />
                    </div>

                    <SlimHeader />
                    {oneClickEnabled && <QuickStakeBar />}
                    <TabRow />

                    <div className="flex-1 overflow-y-auto overscroll-contain bg-[var(--bg-base)] flex flex-col pt-2 pb-16">
                        {tab === 'slip'
                            ? (bets.length === 0
                                ? <EmptySlip />
                                : <div className="px-2.5"><BetslipList bets={bets} sym={sym} onRemove={removeBet} onStake={updateStake} /><div className="h-4" /></div>)
                            : <div className="px-2.5">{renderMyBets()}</div>}
                    </div>

                    {tab === 'slip' && (bets.length > 0 || (bookedId && bookedCountdown > 0)) && (
                        <div className="mt-auto">
                            <Footer />
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop right drawer */}
            <div
                ref={desktopDrawerRef}
                className={`${isSportsRoute ? 'hidden md:block' : 'hidden'} sticky top-0 h-[100dvh] flex-shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] z-[40] ${className}`}
                style={{
                    width: isBetslipOpen ? 360 : 0,
                    pointerEvents: 'auto',
                }}
            >
                <div
                    className="absolute top-[64px] left-0 bottom-0 w-[360px] flex flex-col border-l border-[var(--line-default)] bg-[var(--bg-base)]"
                    style={{ boxShadow: isBetslipOpen ? '-8px 0 30px rgba(0,0,0,0.55)' : 'none' }}
                >
                    {/* Desktop toggle handle */}
                    <button
                        onClick={toggleBetslip}
                        className={`absolute top-1/2 -translate-y-1/2 -left-[42px] flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--line-gold)] border-r-0 rounded-l-2xl shadow-[-8px_0_24px_rgba(0,0,0,0.55)] transition-colors w-[42px] h-28 z-10 ${
                            isBetslipOpen ? 'hover:bg-[var(--crimson-soft)]' : 'hover:bg-[var(--gold-soft)]'
                        }`}
                        aria-label={isBetslipOpen ? 'Close betslip' : 'Open betslip'}
                    >
                        <div className="flex flex-col items-center gap-2 text-[var(--gold-bright)]">
                            <AnimatedBadge count={bets.length} />
                            <span className="[writing-mode:vertical-lr] text-[11px] font-bold tracking-[0.18em] rotate-180 uppercase">Betslip</span>
                        </div>
                    </button>

                    <div className="flex flex-col h-full overflow-hidden">
                        <SlimHeader />
                        {oneClickEnabled && <QuickStakeBar />}
                        <TabRow />

                        <Content />

                        {tab === 'slip' && (bets.length > 0 || (bookedId && bookedCountdown > 0)) && (
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
