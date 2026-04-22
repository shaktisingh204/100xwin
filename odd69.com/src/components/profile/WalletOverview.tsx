'use client';
import { Bitcoin, RefreshCw, Wallet, ShieldAlert, Gift, ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { useModal } from '@/context/ModalContext';
import WageringCard from './WageringCard';

export default function WalletOverview() {
    const { openDeposit, openWithdraw } = useModal();
    const {
        selectedWallet,
        setSelectedWallet,
        fiatBalance,
        fiatCurrency,
        cryptoBalance,
        exposure,
        fiatBonus,
        cryptoBonus,
        casinoBonus,
        sportsBonus,
        activeSymbol,
        refreshWallet,
        loading,
    } = useWallet();

    const formatINR = (amount: number) =>
        new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(amount);

    const formatUSD = (amount: number) =>
        new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    return (
        <div className="space-y-3">

            {/* ── Wallet switcher label ── */}
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black text-white/50 uppercase tracking-wider">My Wallets</h2>
                <button
                    onClick={refreshWallet}
                    className={`p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors ${loading ? 'animate-spin' : ''}`}
                    title="Refresh balances"
                >
                    <RefreshCw size={13} className="text-amber-400" />
                </button>
            </div>

            {/* ── Fiat Wallet Card ── */}
            <button
                onClick={() => setSelectedWallet('fiat')}
                className={`w-full text-left bg-gradient-to-br from-[#12161e] to-[#0c0f14] rounded-xl p-5 border relative overflow-hidden transition-all ${selectedWallet === 'fiat'
                    ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'border-white/[0.06] hover:border-amber-500/25'
                    }`}
            >
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl" />

                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-white/50 text-xs font-black uppercase tracking-wider">
                        <Wallet size={13} />
                        Fiat Wallet
                    </div>
                    {selectedWallet === 'fiat' ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> Active
                        </span>
                    ) : (
                        <span className="text-[10px] text-white/25 px-2 py-0.5 rounded-full border border-white/[0.06]">
                            Click to use
                        </span>
                    )}
                </div>

                <div className="text-3xl font-black text-white mb-0.5">
                    {activeSymbol}{formatINR(fiatBalance)}
                </div>
                <span className="text-xs text-white/50 font-medium">{fiatCurrency} · Fiat deposits &amp; winnings</span>

                {/* Casino Bonus chip */}
                {casinoBonus > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full mr-1.5">
                        <Gift size={10} />
                        {activeSymbol}{formatINR(casinoBonus)} Casino Bonus
                    </div>
                )}
                {/* Sports Bonus chip */}
                {sportsBonus > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                        <Gift size={10} />
                        {activeSymbol}{formatINR(sportsBonus)} Sports Bonus
                    </div>
                )}
                {/* Legacy fiatBonus fallback (BOTH type bonuses) */}
                {fiatBonus > 0 && casinoBonus === 0 && sportsBonus === 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                        <Gift size={10} />
                        {activeSymbol}{formatINR(fiatBonus)} Fiat Bonus
                    </div>
                )}

                {/* Action buttons — only show if active */}
                {selectedWallet === 'fiat' && (
                    <div className="space-y-2 mt-4" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                            <button
                                onClick={openDeposit}
                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-[#1a1208] font-black py-2.5 rounded-lg transition-all text-sm"
                            >
                                <ArrowDownToLine size={14} />
                                Deposit
                            </button>
                            <button
                                onClick={openWithdraw}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] font-black py-2.5 rounded-lg transition-colors text-sm"
                            >
                                <ArrowUpFromLine size={14} />
                                Withdraw
                            </button>
                        </div>
                    </div>
                )}
            </button>

            {/* ── Crypto Wallet Card ── */}
            <button
                onClick={() => setSelectedWallet('crypto')}
                className={`w-full text-left bg-gradient-to-br from-[#12161e] to-[#0c0f14] rounded-xl p-5 border relative overflow-hidden transition-all ${selectedWallet === 'crypto'
                    ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'border-white/[0.06] hover:border-amber-500/25'
                    }`}
            >
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl" />

                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-white/50 text-xs font-black uppercase tracking-wider">
                        <Bitcoin size={13} className="text-amber-400" />
                        Crypto Wallet
                    </div>
                    {selectedWallet === 'crypto' ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> Active
                        </span>
                    ) : (
                        <span className="text-[10px] text-white/25 px-2 py-0.5 rounded-full border border-white/[0.06]">
                            Click to use
                        </span>
                    )}
                </div>

                <div className="text-3xl font-black text-white mb-0.5">
                    ${formatUSD(cryptoBalance)}
                </div>
                <span className="text-xs text-white/50 font-medium">USD · Funded by NOWPayments crypto deposits</span>

                {/* Crypto Bonus mini-chip */}
                {cryptoBonus > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                        <Gift size={10} />
                        ${formatUSD(cryptoBonus)} Crypto Bonus
                    </div>
                )}

                {/* Action buttons — only show if active */}
                {selectedWallet === 'crypto' && (
                    <div className="space-y-2 mt-4" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={openDeposit}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-[#1a1208] font-black py-2.5 rounded-lg transition-all text-sm"
                        >
                            <Bitcoin size={14} />
                            Add Crypto
                        </button>
                    </div>
                )}
            </button>

            {/* ── Stats row ── */}
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-black uppercase tracking-wider mb-2">
                    <ShieldAlert size={12} className="text-red-400" />
                    Exposure
                </div>
                <div className="text-lg font-black text-white">
                    {activeSymbol}{formatINR(exposure || 0)}
                </div>
            </div>

            {/* ── Wagering progress (dual bars) ── */}
            <WageringCard />

            {/* Hint */}
            <p className="text-[10px] text-white/25 text-center px-2">
                Active wallet is used for bets &amp; charges across the entire platform
            </p>

        </div>
    );
}
