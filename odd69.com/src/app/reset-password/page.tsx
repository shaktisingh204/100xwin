"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, ShieldCheck } from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Contains a number", ok: /\d/.test(password) },
    { label: "Passwords match", ok: password.length > 0 && password === confirm },
  ];
  const allValid = checks.every((c) => c.ok);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/"), 3000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Reset failed. Link may have expired.");
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
          <div className="absolute top-0 left-0 -ml-20 -mt-20 w-48 h-48 rounded-full bg-emerald-500/8 blur-[60px] pointer-events-none" />

          <div className="text-center mb-6">
            <span className="text-2xl font-black text-white tracking-tight">odd<span className="text-[#f59e0b]">69</span></span>
          </div>

          {!success ? (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck size={24} className="text-emerald-400" />
                </div>
                <h1 className="text-xl font-black text-white">Create New Password</h1>
                <p className="text-sm text-white/30 mt-2">Your new password must be different from previously used passwords.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15"><Lock size={16} /></div>
                  <input type={showPw ? "text" : "password"} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors" autoFocus />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15"><Lock size={16} /></div>
                  <input type={showConfirm ? "text" : "password"} placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40 transition-colors">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength checks */}
                <div className="space-y-1.5 py-1">
                  {checks.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${c.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.03] text-white/10"}`}>
                        <CheckCircle size={10} />
                      </div>
                      <span className={c.ok ? "text-emerald-400/70" : "text-white/20"}>{c.label}</span>
                    </div>
                  ))}
                </div>

                <button type="submit" disabled={loading || !allValid}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-sm uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Reset Password"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-black text-white mb-2">Password Reset!</h2>
              <p className="text-sm text-white/30 mb-4">Your password has been changed successfully. Redirecting to login...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 size={24} className="animate-spin text-white/30" /></div>}>
      <ResetForm />
    </Suspense>
  );
}
