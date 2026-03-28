"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Copy, CheckCircle, Upload, AlertCircle, Loader2, ArrowLeft, Tag, QrCode } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { useModal } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";

interface ManualConfig {
  upiId: string;
  qrImageUrl: string;
  whatsappNumber: string;
  telegramHandle: string;
  telegramLink: string;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const MIN_DEPOSIT = 100;

export default function ManualDepositModal() {
  const { isManualDepositOpen, closeManualDeposit, manualDepositAllowBack, openUPIDeposit } = useModal();
  const { token } = useAuth();

  const [config, setConfig] = useState<ManualConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [bonusCode, setBonusCode] = useState("");
  const [showBonusField, setShowBonusField] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"pay" | "confirm" | "done">("pay");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await api.get("/manual-deposit/config");
      setConfig(res.data);
    } catch {
      setConfig({ upiId: "", qrImageUrl: "", whatsappNumber: "", telegramHandle: "", telegramLink: "" });
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isManualDepositOpen) {
      fetchConfig();
    } else {
      // Reset on close
      setAmount("");
      setUtr("");
      setBonusCode("");
      setShowBonusField(false);
      setScreenshotUrl("");
      setCopied(false);
      setLoading(false);
      setStep("pay");
      setErrorMsg("");
    }
  }, [isManualDepositOpen, fetchConfig]);

  if (!isManualDepositOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount >= MIN_DEPOSIT;

  const handleCopyUpi = async () => {
    if (!config?.upiId) return;
    await navigator.clipboard.writeText(config.upiId);
    setCopied(true);
    toast.success("UPI ID copied!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleNextStep = () => {
    if (!isValidAmount) {
      setErrorMsg("Please enter a valid amount.");
      return;
    }
    setErrorMsg("");
    setStep("confirm");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!utr.trim()) {
      setErrorMsg("Please enter your UTR / Transaction ID.");
      return;
    }
    if (!token) {
      toast.error("Please log in.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(
        "/manual-deposit/submit",
        {
          amount: numAmount,
          utr: utr.trim(),
          screenshotUrl: screenshotUrl.trim() || undefined,
          bonusCode: bonusCode.trim().toUpperCase() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setStep("done");
      } else {
        setErrorMsg(res.data?.message || "Submission failed. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Submission failed.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeManualDeposit} />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-md bg-[#0f1117] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0f1117] z-10">
          <div className="flex items-center gap-2">
            {manualDepositAllowBack && step === "confirm" && (
              <button onClick={() => setStep("pay")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Manual UPI Deposit</h2>
              <p className="text-white/40 text-xs">
                {step === "pay" ? "Pay via UPI and submit UTR" : step === "confirm" ? "Confirm your payment" : "Submitted!"}
              </p>
            </div>
          </div>
          <button onClick={closeManualDeposit} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* STEP 1: Pay */}
          {step === "pay" && (
            <div className="space-y-4">
              {/* UPI ID Card */}
              {configLoading ? (
                <div className="h-28 rounded-xl bg-white/5 animate-pulse" />
              ) : config ? (
                <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-xl">
                  <p className="text-xs text-orange-300/70 font-medium uppercase tracking-wider mb-3">Pay to this UPI ID</p>

                  {config.qrImageUrl && (
                    <div className="flex justify-center mb-3">
                      <div className="w-32 h-32 rounded-xl overflow-hidden border border-white/10 bg-white p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={config.qrImageUrl} alt="QR Code" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}

                  {config.upiId ? (
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                      <span className="flex-1 text-white font-mono text-sm font-semibold truncate">{config.upiId}</span>
                      <button
                        onClick={handleCopyUpi}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${copied ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30"}`}
                      >
                        {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm text-center py-2">UPI details not configured. Contact support.</p>
                  )}

                  {/* Support Links */}
                  {(config.whatsappNumber || config.telegramHandle) && (
                    <div className="mt-3 flex gap-2">
                      {config.whatsappNumber && (
                        <a href={`https://wa.me/${config.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="flex-1 py-2 text-center text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                        >
                          WhatsApp Support
                        </a>
                      )}
                      {config.telegramLink && (
                        <a href={config.telegramLink} target="_blank" rel="noopener noreferrer"
                          className="flex-1 py-2 text-center text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                        >
                          Telegram Support
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Instructions */}
              <div className="space-y-2">
                {[
                  "1. Copy the UPI ID above or scan the QR code",
                  "2. Open any UPI app (GPay, PhonePe, Paytm, etc.)",
                  "3. Pay the exact amount you want to deposit",
                  "4. Note your UTR / Transaction ID after payment",
                  "5. Click Continue below and enter your UTR",
                ].map((s) => (
                  <div key={s} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400/60 mt-1.5 flex-shrink-0" />
                    <p className="text-white/50 text-xs">{s}</p>
                  </div>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Amount to Deposit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setErrorMsg(""); }}
                    placeholder="Enter amount"
                    min={MIN_DEPOSIT}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 transition-all text-lg font-semibold"
                  />
                </div>
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {QUICK_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => { setAmount(String(a)); setErrorMsg(""); }}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${numAmount === a
                        ? "bg-orange-500 text-black"
                        : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      ₹{a >= 1000 ? `${a / 1000}K` : a}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-xs">{errorMsg}</p>
                </div>
              )}

              <button onClick={handleNextStep} disabled={!isValidAmount}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-base rounded-xl transition-all shadow-lg shadow-orange-500/20">
                I&apos;ve Paid — Submit UTR →
              </button>

              {manualDepositAllowBack && (
                <button onClick={openUPIDeposit} className="w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors">
                  ← Back to UPI Gateway
                </button>
              )}
            </div>
          )}

          {/* STEP 2: Confirm with UTR */}
          {step === "confirm" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-300 text-sm font-medium">Deposit Amount</p>
                <p className="text-white text-2xl font-bold">₹{numAmount.toLocaleString("en-IN")}</p>
              </div>

              {/* UTR Input */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">UTR / Transaction ID*</label>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => { setUtr(e.target.value); setErrorMsg(""); }}
                  placeholder="e.g. 421234567890"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-all font-mono tracking-wider"
                  required
                />
                <p className="text-xs text-white/30 mt-1">Find this in your UPI app payment history or bank SMS.</p>
              </div>

              {/* Screenshot URL */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Screenshot URL (optional)</label>
                <div className="relative">
                  <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="url"
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://... (upload to imgur, etc.)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Bonus Code */}
              <div>
                <button type="button" onClick={() => setShowBonusField(!showBonusField)}
                  className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors">
                  <Tag className="w-3.5 h-3.5" />
                  {showBonusField ? "Hide bonus code" : "Have a bonus code?"}
                </button>
                {showBonusField && (
                  <input
                    type="text"
                    value={bonusCode}
                    onChange={(e) => setBonusCode(e.target.value.toUpperCase())}
                    placeholder="Enter bonus code"
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50 transition-all text-sm uppercase tracking-widest"
                  />
                )}
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-xs">{errorMsg}</p>
                </div>
              )}

              <button type="submit" disabled={loading || !utr.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : "Submit Deposit Request"}
              </button>

              <p className="text-xs text-white/30 text-center">
                Approval typically takes 5–15 minutes. Contact support for urgent assistance.
              </p>
            </form>
          )}

          {/* STEP 3: Done */}
          {step === "done" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Request Submitted!</h3>
                <p className="text-white/50 text-sm mt-1">
                  Your deposit of <span className="text-green-400 font-semibold">₹{numAmount.toLocaleString("en-IN")}</span> is pending approval.
                  Your balance will be updated within 5–15 minutes.
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-300 text-xs">UTR Submitted: <span className="font-mono font-semibold">{utr}</span></p>
              </div>
              <button onClick={closeManualDeposit} className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
