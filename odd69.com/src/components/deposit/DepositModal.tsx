"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Zap, Tag, ChevronRight, AlertCircle, CheckCircle, Loader2,
  ExternalLink, ArrowLeft, Clock, Copy, Check, RefreshCw, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { useModal } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CryptoOption {
  id: string;
  label: string;
  network: string;
  icon: string;
  color: string;
}

interface PaymentData {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  expiresAt: string | null;
}

type CryptoStep = "configure" | "awaiting" | "success";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CRYPTO_OPTIONS: CryptoOption[] = [
  { id: "usdttrc20", label: "USDT", network: "TRC20", icon: "₮", color: "#26A17B" },
  { id: "usdterc20", label: "USDT", network: "ERC20", icon: "₮", color: "#26A17B" },
  { id: "btc",       label: "Bitcoin",  network: "BTC",   icon: "₿", color: "#F7931A" },
  { id: "eth",       label: "Ethereum", network: "ERC20", icon: "Ξ", color: "#627EEA" },
  { id: "bnb",       label: "BNB",      network: "BEP20", icon: "B", color: "#F3BA2F" },
  { id: "ltc",       label: "Litecoin", network: "LTC",   icon: "Ł", color: "#BFBBBB" },
  { id: "xrp",       label: "XRP",      network: "XRP",   icon: "✕", color: "#346AA9" },
  { id: "trx",       label: "TRON",     network: "TRC20", icon: "◈", color: "#EF0027" },
];

const UPI_QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const CRYPTO_QUICK_AMOUNTS = [20, 50, 100, 200, 500];
const MIN_UPI_DEPOSIT  = 100;
const MIN_CRYPTO_USD   = 10;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  waiting:        { label: "Waiting for payment…", color: "text-yellow-400" },
  confirming:     { label: "Confirming…",           color: "text-yellow-400" },
  confirmed:      { label: "Confirmed!",            color: "text-green-400"  },
  sending:        { label: "Sending funds…",        color: "text-yellow-400" },
  finished:       { label: "Complete!",             color: "text-green-400"  },
  partially_paid: { label: "Partial payment",       color: "text-yellow-400" },
  failed:         { label: "Failed",                color: "text-red-400"    },
  expired:        { label: "Expired",               color: "text-red-400"    },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function DepositModal() {
  const { isDepositOpen, closeUPIDeposit, openManualDeposit } = useModal();
  const { token } = useAuth();
  const { fiatBalance, refreshWallet } = useWallet();

  // Tab
  const [activeTab, setActiveTab] = useState<"fiat" | "crypto">("fiat");

  // UPI/Fiat
  const [upiGateway, setUpiGateway]   = useState<"upi2" | "upi1">("upi2");
  const [upiAmount, setUpiAmount]     = useState("");
  const [bonusCode, setBonusCode]     = useState("");
  const [showBonus, setShowBonus]     = useState(false);
  const [upiLoading, setUpiLoading]   = useState(false);
  const [upiStep, setUpiStep]         = useState<"form" | "redirect" | "success">("form");
  const [payUrl, setPayUrl]           = useState("");
  const [upiError, setUpiError]       = useState("");
  const [manualRequired, setManualRequired] = useState(false);

  // Crypto
  const [cryptoOptions, setCryptoOptions]   = useState<CryptoOption[]>(DEFAULT_CRYPTO_OPTIONS);
  const [selectedCoin, setSelectedCoin]     = useState<CryptoOption>(DEFAULT_CRYPTO_OPTIONS[0]);
  const [cryptoAmount, setCryptoAmount]     = useState("");
  const [cryptoStep, setCryptoStep]         = useState<CryptoStep>("configure");
  const [paymentData, setPaymentData]       = useState<PaymentData | null>(null);
  const [paymentStatus, setPaymentStatus]   = useState("waiting");
  const [timeLeft, setTimeLeft]             = useState(0);
  const [copied, setCopied]                 = useState(false);
  const [statusLoading, setStatusLoading]   = useState(false);
  const [cryptoLoading, setCryptoLoading]   = useState(false);
  const [cryptoError, setCryptoError]       = useState("");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const stopPolling = () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  const stopTimer   = () => { if (timerRef.current)   { clearInterval(timerRef.current);   timerRef.current = null;   } };

  const resetCrypto = () => {
    setCryptoStep("configure");
    setPaymentData(null);
    setPaymentStatus("waiting");
    setTimeLeft(0);
    setCopied(false);
    setCryptoError("");
  };

  const startTimer = (expiresAt: string | null) => {
    if (!expiresAt) return;
    const expiry = new Date(expiresAt).getTime();
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) stopTimer();
    }, 1000);
  };

  const startPolling = useCallback((paymentId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        setStatusLoading(true);
        const res = await api.get(`/nowpayments/status/${paymentId}`);
        const status: string = res.data?.data?.status ?? "";
        setPaymentStatus(status);
        if (status === "finished" || status === "confirmed") {
          stopPolling(); stopTimer(); setCryptoStep("success");
          toast.success("🎉 Crypto payment confirmed! Balance credited.");
          refreshWallet();
        } else if (status === "expired" || status === "failed") {
          stopPolling(); stopTimer();
          toast.error(`Payment ${status}. Please try again.`);
          resetCrypto();
        }
      } catch { /* silent */ } finally { setStatusLoading(false); }
    }, 12000);
  }, [refreshWallet]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Fetch public settings for crypto options on open ─────────────────────
  useEffect(() => {
    if (!isDepositOpen) return;
    api.get("/settings/public")
      .then(res => {
        const d = res.data || {};
        if (d.DEPOSIT_CRYPTO_OPTIONS) {
          try {
            const opts = JSON.parse(d.DEPOSIT_CRYPTO_OPTIONS);
            if (Array.isArray(opts) && opts.length) setCryptoOptions(opts);
          } catch { /* use default */ }
        }
      })
      .catch(() => { });
  }, [isDepositOpen]);

  // ── Reset on close ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDepositOpen) {
      setUpiAmount(""); setBonusCode(""); setShowBonus(false);
      setUpiLoading(false); setUpiStep("form"); setPayUrl("");
      setUpiError(""); setManualRequired(false);
      setCryptoAmount(""); setCryptoError("");
      stopPolling(); stopTimer(); resetCrypto();
    }
  }, [isDepositOpen]);

  // ── Sync selectedCoin if options change ──────────────────────────────────
  useEffect(() => {
    if (!cryptoOptions.find(c => c.id === selectedCoin.id)) {
      setSelectedCoin(cryptoOptions[0] ?? DEFAULT_CRYPTO_OPTIONS[0]);
    }
  }, [cryptoOptions, selectedCoin.id]);

  if (!isDepositOpen) return null;

  // ─── UPI Submit ────────────────────────────────────────────────────────────

  const numUpi = parseFloat(upiAmount) || 0;
  const validUpi = numUpi >= MIN_UPI_DEPOSIT;

  const handleUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiError("");
    if (!validUpi) { setUpiError(`Minimum deposit is ₹${MIN_UPI_DEPOSIT}`); return; }
    if (!token) { toast.error("Please log in."); return; }

    setUpiLoading(true);
    try {
      const orderNo = `DEP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      let res: any;

      if (upiGateway === "upi2") {
        res = await api.post("/payment2/create", {
          orderNo, amount: numUpi, currency: "INR", payType: "UPI",
          bonusCode: bonusCode.trim().toUpperCase() || undefined,
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
        res = await api.post("/payment/create", {
          mch_order_no: orderNo, pay_type: "105",
          trade_amount: String(numUpi), order_date: date,
          goods_name: "Wallet Deposit",
          page_url: window.location.origin + "/profile/transactions",
          bonusCode: bonusCode.trim().toUpperCase() || undefined,
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      if (res.data?.manualRequired) { setManualRequired(true); return; }

      if (res.data?.success) {
        const url = res.data?.payUrl || res.data?.data?.payUrl || res.data?.data?.code_url
          || res.data?.data?.payInfo || res.data?.data?.pay_info;
        if (url) {
          setPayUrl(url); setUpiStep("redirect"); window.open(url, "_blank");
        } else {
          setUpiStep("success"); toast.success("Deposit initiated!"); refreshWallet();
        }
      } else {
        setUpiError(res.data?.message || "Gateway rejected the deposit.");
      }
    } catch (err: any) {
      if (err?.response?.data?.manualRequired) { setManualRequired(true); return; }
      setUpiError(err?.response?.data?.message || "Deposit failed. Try again.");
    } finally { setUpiLoading(false); }
  };

  const handleManualFallback = () => {
    closeUPIDeposit();
    openManualDeposit({ allowBack: true });
  };

  // ─── Crypto Submit ─────────────────────────────────────────────────────────

  const numCrypto = parseFloat(cryptoAmount) || 0;

  const handleCryptoSubmit = async () => {
    setCryptoError("");
    if (!cryptoAmount || numCrypto <= 0) { setCryptoError("Please enter a valid amount (USD)."); return; }
    if (numCrypto < MIN_CRYPTO_USD) { setCryptoError(`Minimum crypto deposit is $${MIN_CRYPTO_USD}`); return; }
    if (!token) { toast.error("Please log in."); return; }

    setCryptoLoading(true);
    try {
      const res = await api.post("/nowpayments/create", {
        amount: numCrypto,
        payCurrency: selectedCoin.id,
        priceCurrency: "usd",
        bonusCode: bonusCode.trim().toUpperCase() || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });

      const data: PaymentData = res.data.data;
      setPaymentData(data);
      setPaymentStatus("waiting");
      setCryptoStep("awaiting");
      startTimer(data.expiresAt);
      startPolling(data.paymentId);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to generate payment address.";
      toast.error(msg); setCryptoError(msg);
    } finally { setCryptoLoading(false); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeUPIDeposit} />

      <div className="relative z-10 w-full sm:max-w-2xl bg-[#0f1117] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Deposit Funds</h2>
              <p className="text-white/40 text-xs">Balance: ₹{fiatBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <button onClick={closeUPIDeposit} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="grid grid-cols-2 border-b border-white/10 shrink-0">
          {(["fiat", "crypto"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "fiat") { stopPolling(); stopTimer(); resetCrypto(); }
              }}
              className={`py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === tab
                ? "border-green-500 text-green-400"
                : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {tab === "fiat" ? "🏦 UPI / Fiat" : "₿ Crypto"}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* ════════════ FIAT TAB ════════════ */}
          {activeTab === "fiat" && (
            <>
              {/* Manual Required Banner */}
              {manualRequired && (
                <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-amber-300 text-sm font-medium">Gateway Unavailable</p>
                      <p className="text-amber-300/70 text-xs mt-1">You have a pending payment. Please use manual UPI.</p>
                      <button onClick={handleManualFallback} className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm rounded-lg transition-colors">
                        Use Manual UPI Deposit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Form Step ── */}
              {upiStep === "form" && !manualRequired && (
                <form onSubmit={handleUpiSubmit} className="space-y-4">
                  {/* Gateway selector */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "upi2", label: "UPI Gateway 2", sublabel: "Recommended · Fast" },
                      { id: "upi1", label: "UPI Gateway 1", sublabel: "Alternate · NekPay" },
                    ].map(g => (
                      <button key={g.id} type="button" onClick={() => setUpiGateway(g.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${upiGateway === g.id ? "border-green-500/60 bg-green-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                        <p className={`text-sm font-medium ${upiGateway === g.id ? "text-green-400" : "text-white"}`}>{g.label}</p>
                        <p className="text-xs text-white/40 mt-0.5">{g.sublabel}</p>
                      </button>
                    ))}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Amount (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">₹</span>
                      <input type="number" value={upiAmount}
                        onChange={e => { setUpiAmount(e.target.value); setUpiError(""); }}
                        placeholder="Enter amount" min={MIN_UPI_DEPOSIT}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-green-500/50 transition-all text-lg font-semibold"
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 mt-2">
                      {UPI_QUICK_AMOUNTS.map(a => (
                        <button key={a} type="button" onClick={() => { setUpiAmount(String(a)); setUpiError(""); }}
                          className={`py-2 rounded-lg text-xs font-medium transition-all ${numUpi === a ? "bg-green-500 text-black" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"}`}>
                          ₹{a >= 1000 ? `${a / 1000}K` : a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bonus code toggle */}
                  <div>
                    <button type="button" onClick={() => setShowBonus(!showBonus)}
                      className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors">
                      <Tag className="w-3.5 h-3.5" />
                      {showBonus ? "Hide bonus code" : "Have a bonus code?"}
                    </button>
                    {showBonus && (
                      <input type="text" value={bonusCode}
                        onChange={e => setBonusCode(e.target.value.toUpperCase())}
                        placeholder="Enter promo / bonus code"
                        className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50 transition-all text-sm uppercase tracking-widest"
                      />
                    )}
                  </div>

                  {upiError && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-red-300 text-xs">{upiError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={upiLoading || !validUpi}
                    className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-base rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                    {upiLoading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                      : <>{numUpi > 0 ? `Deposit ₹${numUpi.toLocaleString("en-IN")}` : "Enter Amount"} <ChevronRight className="w-4 h-4" /></>}
                  </button>

                  <button type="button" onClick={handleManualFallback}
                    className="w-full py-2 text-xs text-white/40 hover:text-white/70 transition-colors">
                    Having issues? Use Manual UPI Deposit →
                  </button>
                </form>
              )}

              {/* ── Redirect Step ── */}
              {upiStep === "redirect" && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
                    <ExternalLink className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Payment Page Opened</h3>
                    <p className="text-white/50 text-sm mt-1">Complete your payment in the new tab. Your balance will update automatically.</p>
                  </div>
                  <button onClick={() => window.open(payUrl, "_blank")}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" /> Reopen Payment Page
                  </button>
                  <button onClick={() => { setUpiStep("form"); setPayUrl(""); }} className="w-full py-2 text-sm text-white/40 hover:text-white/60">
                    ← Try a new deposit
                  </button>
                </div>
              )}

              {/* ── Success Step ── */}
              {upiStep === "success" && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Deposit Initiated!</h3>
                    <p className="text-white/50 text-sm mt-1">Your deposit of <span className="text-green-400 font-semibold">₹{numUpi.toLocaleString("en-IN")}</span> is being processed.</p>
                  </div>
                  <button onClick={closeUPIDeposit} className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl">Done</button>
                </div>
              )}
            </>
          )}

          {/* ════════════ CRYPTO TAB ════════════ */}
          {activeTab === "crypto" && (
            <>
              {/* ── Configure Step ── */}
              {cryptoStep === "configure" && (
                <div className="space-y-5">
                  {/* Coin grid */}
                  <div>
                    <label className="block text-xs text-white/50 mb-3 font-medium uppercase tracking-wider">Select Coin & Network</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {cryptoOptions.map(coin => (
                        <button key={coin.id} onClick={() => setSelectedCoin(coin)}
                          className={`p-3 rounded-xl border text-left transition-all ${selectedCoin.id === coin.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                          <div className="flex items-start justify-between mb-2">
                            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/30 text-base font-bold"
                              style={{ color: coin.color }}>
                              {coin.icon}
                            </span>
                            {selectedCoin.id === coin.id && (
                              <span className="text-[9px] font-bold bg-green-500 text-black px-1.5 py-0.5 rounded-full uppercase">Active</span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-white truncate">{coin.label}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{coin.network}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                      <input type="number" value={cryptoAmount}
                        onChange={e => { setCryptoAmount(e.target.value); setCryptoError(""); }}
                        placeholder="Enter USD amount" min={MIN_CRYPTO_USD}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-all text-lg font-semibold"
                      />
                    </div>
                    <p className="text-xs text-white/30 mt-1">Min: ${MIN_CRYPTO_USD} USD</p>
                    <div className="grid grid-cols-5 gap-1.5 mt-2">
                      {CRYPTO_QUICK_AMOUNTS.map(a => (
                        <button key={a} type="button" onClick={() => { setCryptoAmount(String(a)); setCryptoError(""); }}
                          className={`py-2 rounded-lg text-xs font-medium transition-all ${numCrypto === a ? "bg-purple-500 text-white" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"}`}>
                          ${a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bonus code */}
                  <div>
                    <button type="button" onClick={() => setShowBonus(!showBonus)}
                      className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors">
                      <Tag className="w-3.5 h-3.5" />
                      {showBonus ? "Hide bonus code" : "Have a bonus code?"}
                    </button>
                    {showBonus && (
                      <input type="text" value={bonusCode}
                        onChange={e => setBonusCode(e.target.value.toUpperCase())}
                        placeholder="Enter bonus code"
                        className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50 transition-all text-sm uppercase tracking-widest"
                      />
                    )}
                  </div>

                  {/* Notice */}
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <p className="text-purple-300 text-xs leading-relaxed">
                      A unique wallet address will be generated for this payment session. Only send {selectedCoin.label} on the {selectedCoin.network} network.
                    </p>
                  </div>

                  {cryptoError && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-red-300 text-xs">{cryptoError}</p>
                    </div>
                  )}

                  <button onClick={handleCryptoSubmit} disabled={cryptoLoading || !cryptoAmount || numCrypto < MIN_CRYPTO_USD}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
                    {cryptoLoading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating Address...</>
                      : <>{numCrypto > 0 ? `Generate Address · $${numCrypto}` : "Enter Amount"} <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              )}

              {/* ── Awaiting Step ── */}
              {cryptoStep === "awaiting" && paymentData && (
                <div className="space-y-4">
                  {/* Status header */}
                  <div className="flex items-center justify-between">
                    <button onClick={() => { stopPolling(); stopTimer(); resetCrypto(); }}
                      className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div className={`text-xs font-bold px-3 py-1 rounded-full border border-white/10 bg-white/5 ${STATUS_MAP[paymentStatus]?.color || "text-gray-400"}`}>
                      {STATUS_MAP[paymentStatus]?.label || paymentStatus}
                    </div>
                  </div>

                  {/* QR + Address card */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-yellow-400">
                      <Clock className="w-3.5 h-3.5" />
                      Awaiting Payment
                      {timeLeft > 0 && <span className="text-white/50">· {formatTime(timeLeft)} left</span>}
                    </div>

                    {/* QR Code — plain white box since react-qr-code may not be installed */}
                    <div className="mx-auto mb-4 w-40 h-40 bg-white rounded-2xl p-3 flex items-center justify-center">
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <p className="text-black text-[10px] font-bold text-center break-all leading-tight">{paymentData.payAddress.slice(0, 20)}…</p>
                        <p className="text-[8px] text-gray-500">Scan with {selectedCoin.label} wallet</p>
                      </div>
                    </div>

                    {/* Amount & network */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-black/30 rounded-xl p-3 text-left">
                        <p className="text-white/40 text-[10px] uppercase mb-1">Send Exactly</p>
                        <p className="text-white font-bold text-base">{paymentData.payAmount} <span className="text-yellow-400">{paymentData.payCurrency.toUpperCase()}</span></p>
                        <p className="text-white/30 text-xs">≈ ${cryptoAmount} USD</p>
                      </div>
                      <div className="bg-black/30 rounded-xl p-3 text-left">
                        <p className="text-white/40 text-[10px] uppercase mb-1">Network</p>
                        <p className="text-white font-bold text-base">{selectedCoin.network}</p>
                        <p className="text-white/30 text-xs">{selectedCoin.label}</p>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mb-3">
                      <p className="text-white/40 text-[10px] uppercase text-left mb-1">{selectedCoin.label} Address</p>
                      <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2">
                        <p className="flex-1 font-mono text-xs text-white truncate">{paymentData.payAddress}</p>
                        <button onClick={() => handleCopy(paymentData.payAddress)}
                          className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
                        </button>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                      <p className="text-yellow-300 text-xs leading-relaxed">
                        ⚠️ Send <strong>{paymentData.payAmount} {paymentData.payCurrency.toUpperCase()}</strong> only on <strong>{selectedCoin.network}</strong>. Wrong network transfers cannot be recovered.
                      </p>
                    </div>
                  </div>

                  {/* Polling info */}
                  <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <RefreshCw className={`w-4 h-4 text-white/40 ${statusLoading ? "animate-spin" : ""}`} />
                    <p className="text-white/40 text-xs">Checking network every 12s. Balance auto-credits on confirmation.</p>
                  </div>
                </div>
              )}

              {/* ── Success Step ── */}
              {cryptoStep === "success" && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-xl">Deposit Confirmed!</h3>
                    <p className="text-white/50 text-sm mt-2">
                      Your crypto deposit of <span className="text-green-400 font-semibold">${cryptoAmount} USD</span> has been credited.
                    </p>
                  </div>
                  <button onClick={() => { resetCrypto(); closeUPIDeposit(); refreshWallet(); }}
                    className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold rounded-xl transition-colors">
                    Done
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
