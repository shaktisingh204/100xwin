"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, AlertCircle, ShieldCheck, KeyRound,
} from "lucide-react";
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
  const [error, setError] = useState("");

  // ── Invalid token early return ─────────────────────────────────────────
  if (!token) {
    return (
      <div className="text-center py-2">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[var(--crimson-soft)] border border-[rgba(255,46,76,0.25)] grid place-items-center">
          <AlertCircle size={28} className="text-[var(--crimson)]" />
        </div>
        <h2 className="t-section text-center !text-[20px]">Invalid link</h2>
        <p className="text-[13px] text-[var(--ink-dim)] mt-2 mb-5 leading-relaxed">
          This password reset link is invalid or missing. Please request a new one.
        </p>
        <Link href="/forgot-password" className="btn btn-gold sweep h-12 uppercase tracking-[0.06em] text-[12px]">
          Request new link
        </Link>
      </div>
    );
  }

  const checks = [
    { label: "At least 8 characters",          ok: password.length >= 8 },
    { label: "Contains a number",              ok: /\d/.test(password) },
    { label: "Passwords match",                ok: password.length > 0 && password === confirm },
  ];
  const allValid = checks.every((c) => c.ok);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!allValid) {
      if (password.length < 8) setError("Password must be at least 8 characters.");
      else if (!/\d/.test(password)) setError("Password must contain a number.");
      else if (password !== confirm) setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/"), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Reset failed. Link may have expired.";
      const text = Array.isArray(msg) ? msg.join(", ") : msg;
      setError(text);
      toast.error(text);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-2">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[var(--emerald-soft)] border border-[rgba(0,216,123,0.25)] grid place-items-center">
          <CheckCircle size={28} className="text-[var(--emerald)]" />
        </div>
        <h2 className="t-section text-center !text-[20px]">Password reset</h2>
        <p className="text-[13px] text-[var(--ink-dim)] mt-2 leading-relaxed">
          Your password has been changed successfully.
        </p>
        <p className="text-[11px] text-[var(--ink-whisper)] mt-1">
          Redirecting to home in <span className="num">3</span> seconds…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto mb-4 rounded-[14px] bg-[var(--gold-soft)] border border-[var(--line-gold)] grid place-items-center animate-pulse-gold">
          <ShieldCheck size={22} className="text-[var(--gold-bright)]" />
        </div>
        <h1 className="t-section !text-[20px]">Set a new password</h1>
        <p className="text-[13px] text-[var(--ink-dim)] mt-2">
          Choose a strong password — different from any you&rsquo;ve used before.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">New password</span>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              autoFocus
              className={`w-full h-12 sm:h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-10 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:outline-none transition-colors ${
                error ? "border-[var(--crimson)]" : "border-[var(--line-default)] focus:border-[var(--line-gold)]"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Confirm password</span>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              className={`w-full h-12 sm:h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-10 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:outline-none transition-colors ${
                error ? "border-[var(--crimson)]" : "border-[var(--line-default)] focus:border-[var(--line-gold)]"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        {/* Strength checks */}
        <div className="space-y-1.5 py-1">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              <div
                className={`w-4 h-4 rounded-full grid place-items-center transition-colors ${
                  c.ok
                    ? "bg-[var(--emerald-soft)] text-[var(--emerald)] border border-[rgba(0,216,123,0.25)]"
                    : "bg-[var(--bg-inlay)] text-[var(--ink-whisper)] border border-[var(--line-default)]"
                }`}
              >
                <CheckCircle size={9} />
              </div>
              <span className={c.ok ? "text-[var(--emerald)]" : "text-[var(--ink-faint)]"}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2.5 bg-[var(--crimson-soft)] border border-[rgba(255,46,76,0.25)] rounded-[10px] px-4 py-3">
            <AlertCircle size={14} className="text-[var(--crimson)] shrink-0 mt-0.5" />
            <p className="text-[var(--crimson)] text-[12.5px] font-medium leading-snug">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !allValid}
          className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.06em] text-[12px] disabled:opacity-40"
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Resetting</>
          ) : (
            "Reset password"
          )}
        </button>

        <p className="text-center text-[12px] text-[var(--ink-faint)]">
          <Link href="/forgot-password" className="text-[var(--gold-bright)] font-semibold hover:underline">
            Request a new link
          </Link>
        </p>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gold-soft relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dotgrid opacity-40" />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full blur-[120px]"
        style={{ background: "var(--gold-halo)" }}
      />

      <div className="w-full max-w-[440px] relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--ink-faint)] hover:text-[var(--gold-bright)] text-[13px] font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="relative rounded-[22px] border border-[var(--line-gold)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-lift)] grain overflow-hidden">
          <div className="relative z-10">
            <div className="text-center mb-6">
              <span className="font-display text-[28px] font-bold text-[var(--ink)] tracking-tight">
                odd<span className="text-gold-grad">69</span>
              </span>
            </div>

            <Suspense
              fallback={
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-[var(--gold-bright)]" />
                </div>
              }
            >
              <ResetForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
