"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Phone, ArrowRight, ArrowLeft, Loader2, Shield, CheckCircle, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "phone">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Phone OTP flow
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Email flow
  const [emailSent, setEmailSent] = useState(false);

  // ─── Email flow ────────────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your email");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() }, {
        headers: { "x-frontend-url": window.location.origin },
      });
      setEmailSent(true);
      toast.success("Reset link sent! Check your inbox.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone OTP flow: Step 1 — send OTP ────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || phone.trim().length < 10) return toast.error("Enter a valid phone number");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password-phone", { phoneNumber: phone.trim() });
      setOtpSent(true);
      toast.success("OTP sent to your phone!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone OTP flow: Step 2 — verify OTP + set new password ───────────
  const handlePhoneReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return toast.error("Enter the OTP");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      await api.post("/auth/reset-password-phone", {
        phoneNumber: phone.trim(),
        code: otp.trim(),
        newPassword,
      });
      setResetDone(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/"), 3000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid OTP or link expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 rounded-full bg-[#f59e0b]/8 blur-[60px] pointer-events-none" />

          <div className="text-center mb-6">
            <span className="text-2xl font-black text-white tracking-tight">odd<span className="text-[#f59e0b]">69</span></span>
          </div>

          {resetDone ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-black text-white mb-2">Password Reset!</h2>
              <p className="text-sm text-white/30 mb-4">Your password has been changed successfully. Redirecting to login...</p>
            </div>
          ) : emailSent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-black text-white mb-2">Check Your Inbox</h2>
              <p className="text-sm text-white/30 mb-6 leading-relaxed">
                We&apos;ve sent a password reset link to <span className="text-white/60 font-semibold">{email}</span>. It may take a minute to arrive.
              </p>
              <button onClick={() => setEmailSent(false)} className="text-[#f59e0b] text-sm font-bold hover:text-[#d97706] transition-colors">
                Didn&apos;t receive it? Try again
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center">
                  <Shield size={24} className="text-[#f59e0b]" />
                </div>
                <h1 className="text-xl font-black text-white">Reset Your Password</h1>
                <p className="text-sm text-white/30 mt-2">
                  {tab === "email"
                    ? "Enter your email and we'll send a reset link."
                    : otpSent
                      ? "Enter the OTP and your new password."
                      : "Enter your phone number to receive an OTP."}
                </p>
              </div>

              {/* Tab switcher */}
              {!otpSent && (
                <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.05] rounded-xl mb-6">
                  <button onClick={() => setTab("email")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === "email" ? "bg-white/[0.08] text-white border border-white/10" : "text-white/25 hover:text-white/40"}`}>
                    <Mail size={13} /> Email
                  </button>
                  <button onClick={() => setTab("phone")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === "phone" ? "bg-white/[0.08] text-white border border-white/10" : "text-white/25 hover:text-white/40"}`}>
                    <Phone size={13} /> Phone
                  </button>
                </div>
              )}

              {tab === "email" ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15"><Mail size={16} /></div>
                    <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors" autoFocus />
                  </div>
                  <button type="submit" disabled={loading || !email.trim()}
                    className="w-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-black text-sm uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Send Reset Link</span> <ArrowRight size={14} /></>}
                  </button>
                </form>
              ) : !otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15"><Phone size={16} /></div>
                    <input type="tel" placeholder="Enter your phone number" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors" autoFocus />
                  </div>
                  <button type="submit" disabled={loading || phone.trim().length < 10}
                    className="w-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-black text-sm uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Send OTP</span> <ArrowRight size={14} /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePhoneReset} className="space-y-4">
                  <p className="text-xs text-white/30 text-center mb-2">OTP sent to <span className="text-white/60 font-bold">{phone}</span></p>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15"><ShieldCheck size={16} /></div>
                    <input type="text" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors tracking-[0.3em] text-center font-mono" autoFocus />
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15"><Lock size={16} /></div>
                    <input type={showPw ? "text" : "password"} placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading || otp.length < 4 || newPassword.length < 6}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-sm uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : "Reset Password"}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(""); setNewPassword(""); }} className="w-full text-xs text-white/20 hover:text-white/40 transition-colors py-1">
                    ← Change phone number
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-6 pt-5 border-t border-white/[0.04] text-center">
            <p className="text-xs text-white/20">
              Remember your password?{" "}
              <Link href="/" className="text-[#f59e0b] font-bold hover:text-[#d97706] transition-colors">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
