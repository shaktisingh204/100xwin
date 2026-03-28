"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowUpRight, AlertCircle, Loader2, CheckCircle, Info } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { useModal } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";

const MIN_WITHDRAW = 200;
const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function WithdrawModal() {
  const { isWithdrawOpen, closeWithdraw } = useModal();
  const { isAuthenticated } = useAuth();
  const { fiatBalance, refreshWallet } = useWallet();

  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isWithdrawOpen) {
      setAmount(""); setUpiId(""); setAccountName(""); setAccountNumber("");
      setIfsc(""); setMobile(""); setLoading(false); setStep("form"); setError("");
    }
  }, [isWithdrawOpen]);

  if (!isWithdrawOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount >= MIN_WITHDRAW && numAmount <= fiatBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isAuthenticated) { toast.error("Please log in."); return; }
    if (!isValidAmount) {
      setError(numAmount > fiatBalance ? "Insufficient balance." : `Minimum withdrawal is ₹${MIN_WITHDRAW}`);
      return;
    }
    if (method === "upi" && !upiId.trim()) { setError("Please enter your UPI ID."); return; }
    if (method === "bank" && (!accountName.trim() || !accountNumber.trim() || !ifsc.trim())) {
      setError("Please fill in all bank details."); return;
    }

    setLoading(true);
    try {
      const orderNo = `WD${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await api.post("/payment2/payout", {
        orderNo,
        amount: numAmount,
        currency: "INR",
        acctName: method === "upi" ? (accountName || "User") : accountName,
        acctNo: method === "upi" ? upiId : accountNumber,
        acctCode: method === "upi" ? "UPI" : ifsc,
        mobile: mobile.trim() || undefined,
      });
      setStep("success");
      refreshWallet();
      toast.success("Withdrawal request submitted!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Withdrawal failed. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeWithdraw} />

      <div className="relative z-10 w-full sm:max-w-md bg-[#0f1117] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Withdraw</h2>
              <p className="text-white/40 text-xs">Available: ₹{fiatBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <button onClick={closeWithdraw} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Method */}
              <div className="grid grid-cols-2 gap-2">
                {[{ id: "upi", label: "UPI ID", sub: "Instant transfer" }, { id: "bank", label: "Bank Transfer", sub: "NEFT / IMPS" }].map(m => (
                  <button key={m.id} type="button" onClick={() => { setMethod(m.id as any); setError(""); }}
                    className={`p-3 rounded-xl border text-left transition-all ${method === m.id ? "border-red-500/60 bg-red-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    <p className={`text-sm font-medium ${method === m.id ? "text-red-400" : "text-white"}`}>{m.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{m.sub}</p>
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">₹</span>
                  <input type="number" value={amount}
                    onChange={e => { setAmount(e.target.value); setError(""); }}
                    placeholder="Enter amount" min={MIN_WITHDRAW} max={fiatBalance}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-all text-lg font-semibold"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-white/30">Min: ₹{MIN_WITHDRAW}</span>
                  <span className="text-xs text-white/30">Max: ₹{fiatBalance.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {QUICK_AMOUNTS.map(a => (
                    <button key={a} type="button"
                      onClick={() => { setAmount(String(Math.min(a, fiatBalance))); setError(""); }}
                      disabled={a > fiatBalance}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${numAmount === a ? "bg-red-500 text-white" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30"}`}>
                      ₹{a >= 1000 ? `${a / 1000}K` : a}
                    </button>
                  ))}
                </div>
              </div>

              {/* UPI fields */}
              {method === "upi" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">UPI ID *</label>
                    <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-all text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Your Name</label>
                    <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
                      placeholder="Account holder name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Bank fields */}
              {method === "bank" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Account Holder Name *</label>
                    <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
                      placeholder="Full name as on bank account"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Account Number *</label>
                    <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter account number"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-all text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">IFSC Code *</label>
                    <input type="text" value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-all text-sm font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Mobile Number</label>
                    <input type="tel" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile number"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Info note */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-blue-300/80 text-xs leading-relaxed">
                  Withdrawals under ₹1,000 are auto-processed. Larger amounts may take up to 24 hours for admin review.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-300 text-xs">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading || !isValidAmount}
                className="w-full py-3.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <>{numAmount > 0 ? `Withdraw ₹${numAmount.toLocaleString("en-IN")}` : "Enter Amount"} <ArrowUpRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-xl">Request Submitted!</h3>
                <p className="text-white/50 text-sm mt-2">
                  Your withdrawal of <span className="text-green-400 font-semibold">₹{numAmount.toLocaleString("en-IN")}</span> has been submitted and will be processed shortly.
                </p>
              </div>
              <button onClick={closeWithdraw} className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
