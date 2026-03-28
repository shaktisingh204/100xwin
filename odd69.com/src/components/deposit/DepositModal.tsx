"use client";

import React, { useState, useEffect } from "react";
import { X, Zap, Tag, ChevronRight, AlertCircle, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { useModal } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const MIN_DEPOSIT = 100;
const MAX_DEPOSIT = 100000;

export default function DepositModal() {
  const { isDepositOpen, closeUPIDeposit, openManualDeposit } = useModal();
  const { token, user } = useAuth();
  const { fiatBalance, refreshWallet } = useWallet();

  const [amount, setAmount] = useState("");
  const [bonusCode, setBonusCode] = useState("");
  const [showBonusField, setShowBonusField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "redirect" | "success">("form");
  const [payUrl, setPayUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [gateway, setGateway] = useState<"upi1" | "upi2">("upi2");
  const [manualRequired, setManualRequired] = useState(false);

  useEffect(() => {
    if (!isDepositOpen) {
      setAmount("");
      setBonusCode("");
      setShowBonusField(false);
      setLoading(false);
      setStep("form");
      setPayUrl("");
      setErrorMsg("");
      setManualRequired(false);
    }
  }, [isDepositOpen]);

  if (!isDepositOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount >= MIN_DEPOSIT && numAmount <= MAX_DEPOSIT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isValidAmount) {
      setErrorMsg(`Amount must be between ₹${MIN_DEPOSIT} and ₹${MAX_DEPOSIT.toLocaleString()}`);
      return;
    }
    if (!token) {
      toast.error("Please log in to deposit.");
      return;
    }

    setLoading(true);
    try {
      const orderNo = `DEP${Date.now()}${Math.floor(Math.random() * 1000)}`;

      let res: any;
      if (gateway === "upi2") {
        res = await api.post(
          "/payment2/create",
          { orderNo, amount: numAmount, currency: "INR", bonusCode: bonusCode.trim().toUpperCase() || undefined },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        res = await api.post(
          "/payment/create",
          {
            mch_order_no: orderNo,
            trade_amount: String(numAmount),
            currency: "INR",
            bonusCode: bonusCode.trim().toUpperCase() || undefined,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (res.data?.manualRequired) {
        setManualRequired(true);
        return;
      }

      if (res.data?.success) {
        const url = res.data?.payUrl || res.data?.data?.payUrl || res.data?.data?.code_url;
        if (url) {
          setPayUrl(url);
          setStep("redirect");
          window.open(url, "_blank");
        } else {
          setStep("success");
          toast.success("Deposit initiated! Balance will update shortly.");
          refreshWallet();
        }
      } else {
        setErrorMsg(res.data?.message || "Gateway rejected the deposit. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Deposit failed. Try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualFallback = () => {
    closeUPIDeposit();
    openManualDeposit({ allowBack: true });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeUPIDeposit} />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-md bg-[#0f1117] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
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

        {/* Body */}
        <div className="p-5">
          {/* Manual Required Banner */}
          {manualRequired && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-300 text-sm font-medium">Gateway Unavailable</p>
                  <p className="text-amber-300/70 text-xs mt-1">You have a pending payment. Please use manual UPI deposit to complete your transaction.</p>
                  <button onClick={handleManualFallback} className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm rounded-lg transition-colors">
                    Use Manual UPI Deposit
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "form" && !manualRequired && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Gateway Selector */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "upi2", label: "UPI Gateway", sublabel: "Instant • Recommended" },
                  { id: "upi1", label: "UPI Alt", sublabel: "Alternate gateway" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGateway(g.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${gateway === g.id
                      ? "border-green-500/60 bg-green-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                  >
                    <p className={`text-sm font-medium ${gateway === g.id ? "text-green-400" : "text-white"}`}>{g.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{g.sublabel}</p>
                  </button>
                ))}
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setErrorMsg(""); }}
                    placeholder="Enter amount"
                    min={MIN_DEPOSIT}
                    max={MAX_DEPOSIT}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-lg font-semibold"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-white/30">Min: ₹{MIN_DEPOSIT}</span>
                  <span className="text-xs text-white/30">Max: ₹{MAX_DEPOSIT.toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-5 gap-1.5">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setAmount(String(a)); setErrorMsg(""); }}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${numAmount === a
                      ? "bg-green-500 text-black"
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    ₹{a >= 1000 ? `${a / 1000}K` : a}
                  </button>
                ))}
              </div>

              {/* Bonus Code Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowBonusField(!showBonusField)}
                  className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {showBonusField ? "Hide" : "Have a bonus code?"}
                </button>
                {showBonusField && (
                  <input
                    type="text"
                    value={bonusCode}
                    onChange={(e) => setBonusCode(e.target.value.toUpperCase())}
                    placeholder="Enter promo / bonus code"
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50 transition-all text-sm uppercase tracking-widest"
                  />
                )}
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-xs">{errorMsg}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !isValidAmount}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-base rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <>{numAmount > 0 ? `Deposit ₹${numAmount.toLocaleString("en-IN")}` : "Enter Amount"} <ChevronRight className="w-4 h-4" /></>
                )}
              </button>

              {/* Manual Deposit Link */}
              <button
                type="button"
                onClick={handleManualFallback}
                className="w-full py-2 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Having issues? Use Manual UPI Deposit →
              </button>
            </form>
          )}

          {/* Redirect Step */}
          {step === "redirect" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
                <ExternalLink className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Payment Page Opened</h3>
                <p className="text-white/50 text-sm mt-1">Complete your payment in the new tab. Your balance will update automatically.</p>
              </div>
              <button
                onClick={() => window.open(payUrl, "_blank")}
                className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Reopen Payment Page
              </button>
              <button onClick={() => { setStep("form"); setPayUrl(""); }} className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition-colors">
                ← Start new deposit
              </button>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Deposit Initiated!</h3>
                <p className="text-white/50 text-sm mt-1">Your deposit of <span className="text-green-400 font-semibold">₹{numAmount.toLocaleString("en-IN")}</span> is being processed. Your balance will update shortly.</p>
              </div>
              <button onClick={closeUPIDeposit} className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
