"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail, Phone, ArrowRight, ArrowLeft, Loader2, CheckCircle, AlertCircle,
  Lock, Eye, EyeOff, ShieldCheck, KeyRound,
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

type Mode = "phone" | "email";
type PhoneStep = "enter_phone" | "verify_otp" | "new_password" | "done";

/* ── 6-cell paste-aware OTP input (inline) ─────────────────────────────── */
function OtpCells({
  value, onChange, length = 6, error = false, autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const focus = useCallback((i: number) => {
    const el = inputs.current[i];
    if (el) { el.focus(); el.select(); }
  }, []);
  useEffect(() => {
    if (autoFocus) focus(Math.min(value.length, length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onCellChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) { const arr = value.split(""); arr[i] = ""; onChange(arr.join("")); return; }
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    if (digits.length === 1) {
      const arr = value.padEnd(length, " ").split("");
      arr[i] = digits;
      onChange(arr.join("").replace(/\s/g, "").slice(0, length));
      if (i < length - 1) focus(i + 1);
    } else {
      const merged = (value.slice(0, i) + digits).slice(0, length);
      onChange(merged);
      focus(Math.min(i + digits.length, length - 1));
    }
  };
  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[i]) { const arr = value.split(""); arr[i] = ""; onChange(arr.join("")); e.preventDefault(); }
      else if (i > 0) { const arr = value.split(""); arr[i - 1] = ""; onChange(arr.join("")); focus(i - 1); e.preventDefault(); }
    } else if (e.key === "ArrowLeft" && i > 0) { focus(i - 1); e.preventDefault(); }
    else if (e.key === "ArrowRight" && i < length - 1) { focus(i + 1); e.preventDefault(); }
    else if (e.key === "Home") { focus(0); e.preventDefault(); }
    else if (e.key === "End") { focus(length - 1); e.preventDefault(); }
  };
  const onPaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    const merged = (value.slice(0, i) + pasted).slice(0, length);
    onChange(merged);
    setTimeout(() => focus(Math.min(i + pasted.length, length - 1)), 0);
  };
  return (
    <div className="flex gap-1.5 sm:gap-2 w-full" role="group" aria-label="One-time passcode">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={value[i] ?? ""}
          onChange={(e) => onCellChange(i, e)}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={(e) => onPaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={`flex-1 min-w-0 h-14 text-[22px] font-bold text-center num text-[var(--ink)] bg-[var(--bg-inlay)] border rounded-[10px] focus:outline-none transition-colors ${
            error ? "border-[var(--crimson)]" : "border-[var(--line-default)] focus:border-[var(--line-gold)]"
          }`}
        />
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Shared
  const [mode, setMode] = useState<Mode>("phone");

  // Email flow
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Phone flow
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter_phone");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // ── Email submit (keeps current odd69 wiring with x-frontend-url header) ─
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailLoading(true);
    try {
      await api.post(
        "/auth/forgot-password",
        { email: email.trim() },
        { headers: { "x-frontend-url": window.location.origin } }
      );
      setEmailSent(true);
      toast.success("Reset link sent! Check your inbox.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Something went wrong.";
      setEmailError(typeof msg === "string" ? msg : "Something went wrong.");
      toast.error(typeof msg === "string" ? msg : "Something went wrong.");
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Phone: send OTP (same endpoint as current odd69) ──────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    if (!phone.trim() || phone.trim().length < 10) {
      setPhoneError("Enter a valid phone number.");
      return;
    }
    setPhoneLoading(true);
    try {
      await api.post("/auth/forgot-password-phone", { phoneNumber: phone.trim() });
      setPhoneStep("verify_otp");
      toast.success("OTP sent to your phone!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Could not send OTP.";
      setPhoneError(typeof msg === "string" ? msg : "Could not send OTP.");
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── Phone: verify OTP + new password (single-call endpoint per odd69) ──
  const handlePhoneReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    if (otp.length < 4) {
      setPhoneError("Enter the OTP code.");
      return;
    }
    if (newPass.length < 6) {
      setPhoneError("Password must be at least 6 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      setPhoneError("Passwords do not match.");
      return;
    }
    setPhoneLoading(true);
    try {
      await api.post("/auth/reset-password-phone", {
        phoneNumber: phone.trim(),
        code: otp.trim(),
        newPassword: newPass,
      });
      setPhoneStep("done");
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/"), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid OTP or link expired.";
      setPhoneError(typeof msg === "string" ? msg : "Invalid OTP.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const stepIndex = ["enter_phone", "verify_otp", "new_password", "done"].indexOf(phoneStep);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gold-soft relative overflow-hidden">
      {/* atmospheric halo */}
      <div className="pointer-events-none absolute inset-0 dotgrid opacity-40" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full blur-[120px]"
           style={{ background: "var(--gold-halo)" }} />

      <div className="w-full max-w-[440px] relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--ink-faint)] hover:text-[var(--gold-bright)] text-[13px] font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="relative rounded-[22px] border border-[var(--line-gold)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-lift)] grain overflow-hidden">
          <div className="relative z-10">
            {/* Logo */}
            <div className="text-center mb-6">
              <span className="font-display text-[28px] font-bold text-[var(--ink)] tracking-tight">
                odd<span className="text-gold-grad">69</span>
              </span>
            </div>

            {/* Gold lock icon */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto rounded-[14px] bg-[var(--gold-soft)] border border-[var(--line-gold)] grid place-items-center animate-pulse-gold">
                <KeyRound size={22} className="text-[var(--gold-bright)]" />
              </div>
            </div>

            {/* ── DONE STATE ─────────────────────────────────────────── */}
            {phoneStep === "done" ? (
              <div className="text-center py-2">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[var(--emerald-soft)] border border-[rgba(0,216,123,0.25)] grid place-items-center">
                  <CheckCircle size={28} className="text-[var(--emerald)]" />
                </div>
                <h1 className="t-section text-center !text-[20px]">Password reset</h1>
                <p className="text-[13px] text-[var(--ink-dim)] mt-2 leading-relaxed">
                  Your password has been changed successfully. Redirecting to home…
                </p>
                <div className="mt-5">
                  <button onClick={() => router.push("/")} className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.06em] text-[12px]">
                    Go to home
                  </button>
                </div>
              </div>
            ) : emailSent ? (
              <div className="text-center py-2">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[var(--emerald-soft)] border border-[rgba(0,216,123,0.25)] grid place-items-center">
                  <Mail size={28} className="text-[var(--emerald)]" />
                </div>
                <h1 className="t-section text-center !text-[20px]">Check your inbox</h1>
                <p className="text-[13px] text-[var(--ink-dim)] mt-2 mb-5 leading-relaxed">
                  We&rsquo;ve sent a password reset link to{" "}
                  <span className="text-[var(--ink)] font-semibold">{email}</span>. It may take a minute to arrive.
                </p>
                <button
                  onClick={() => { setEmailSent(false); setEmail(""); }}
                  className="text-[var(--gold-bright)] text-[13px] font-semibold hover:underline"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <>
                {/* Title */}
                <div className="text-center mb-5">
                  <h1 className="t-section !text-[20px]">Reset your password</h1>
                  <p className="text-[13px] text-[var(--ink-dim)] mt-2">
                    {mode === "email"
                      ? "We’ll email you a secure reset link."
                      : phoneStep === "verify_otp" || phoneStep === "new_password"
                      ? "Enter the OTP and set a new password."
                      : "Reset via email link or phone OTP."}
                  </p>
                </div>

                {/* Mode toggle — hide once OTP flow begins */}
                {phoneStep === "enter_phone" && (
                  <div className="flex gap-1 p-1 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[12px] mb-6">
                    {(["phone", "email"] as Mode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setMode(m); setPhoneError(""); setEmailError(""); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                          mode === m
                            ? "bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[var(--line-gold)]"
                            : "text-[var(--ink-faint)] hover:text-[var(--ink-dim)]"
                        }`}
                      >
                        {m === "phone" ? <Phone size={12} /> : <Mail size={12} />}
                        {m === "phone" ? "Phone OTP" : "Email"}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── EMAIL FLOW ─────────────────────────────────────── */}
                {mode === "email" && phoneStep === "enter_phone" && (
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <label className="block">
                      <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Email address</span>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                        <input
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                          autoFocus
                          className={`w-full h-12 sm:h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-3.5 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:outline-none transition-colors ${
                            emailError ? "border-[var(--crimson)]" : "border-[var(--line-default)] focus:border-[var(--line-gold)]"
                          }`}
                        />
                      </div>
                      {emailError && (
                        <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 flex items-center gap-1">
                          <AlertCircle size={11} /> {emailError}
                        </p>
                      )}
                    </label>

                    <button
                      type="submit"
                      disabled={emailLoading || !email.trim()}
                      className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.06em] text-[12px] disabled:opacity-40"
                    >
                      {emailLoading ? (
                        <><Loader2 size={14} className="animate-spin" /> Sending</>
                      ) : (
                        <>Send reset link <ArrowRight size={13} /></>
                      )}
                    </button>
                  </form>
                )}

                {/* ── PHONE FLOW ─────────────────────────────────────── */}
                {mode === "phone" && (
                  <>
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-5">
                      {["enter_phone", "verify_otp", "new_password"].map((s, i) => {
                        const done = stepIndex > i;
                        const active = phoneStep === s;
                        return (
                          <React.Fragment key={s}>
                            <div
                              className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold border transition-all ${
                                active
                                  ? "bg-[var(--gold-soft)] border-[var(--line-gold)] text-[var(--gold-bright)]"
                                  : done
                                  ? "bg-[var(--emerald-soft)] border-[rgba(0,216,123,0.35)] text-[var(--emerald)]"
                                  : "bg-[var(--bg-inlay)] border-[var(--line-default)] text-[var(--ink-whisper)]"
                              }`}
                            >
                              {done ? <CheckCircle size={13} /> : <span className="num">{i + 1}</span>}
                            </div>
                            {i < 2 && (
                              <div className="flex-1 h-px" style={{ background: done ? "var(--emerald)" : "var(--line-default)" }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Step 1 — phone */}
                    {phoneStep === "enter_phone" && (
                      <form onSubmit={handleSendOtp} className="space-y-4">
                        <label className="block">
                          <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Phone number</span>
                          <div className="relative">
                            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                            <input
                              type="tel"
                              inputMode="numeric"
                              placeholder="+91 98xxxxxxxx"
                              value={phone}
                              onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                              autoFocus
                              className={`w-full h-12 sm:h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-3.5 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:outline-none transition-colors num ${
                                phoneError ? "border-[var(--crimson)]" : "border-[var(--line-default)] focus:border-[var(--line-gold)]"
                              }`}
                            />
                          </div>
                          {phoneError && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 flex items-center gap-1">
                              <AlertCircle size={11} /> {phoneError}
                            </p>
                          )}
                        </label>

                        <button
                          type="submit"
                          disabled={phoneLoading || phone.trim().length < 10}
                          className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.06em] text-[12px] disabled:opacity-40"
                        >
                          {phoneLoading ? (
                            <><Loader2 size={14} className="animate-spin" /> Sending OTP</>
                          ) : (
                            <>Send OTP <ArrowRight size={13} /></>
                          )}
                        </button>
                      </form>
                    )}

                    {/* Step 2 — OTP */}
                    {phoneStep === "verify_otp" && (
                      <form
                        onSubmit={(e) => { e.preventDefault(); if (otp.length >= 4) setPhoneStep("new_password"); else setPhoneError("Enter the OTP code."); }}
                        className="space-y-4"
                      >
                        <p className="text-[12.5px] text-[var(--ink-dim)] text-center">
                          OTP sent to <span className="text-[var(--ink)] font-semibold num">{phone}</span>
                        </p>
                        <div className="block">
                          <div className="flex items-center gap-1.5 mb-2">
                            <ShieldCheck size={13} className="text-[var(--gold-bright)]" />
                            <span className="text-[11.5px] font-medium text-[var(--ink-dim)]">Enter OTP code</span>
                          </div>
                          <OtpCells
                            value={otp}
                            onChange={(v) => { setOtp(v); setPhoneError(""); }}
                            error={!!phoneError}
                            autoFocus
                          />
                          {phoneError && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 flex items-center gap-1">
                              <AlertCircle size={11} /> {phoneError}
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={otp.length < 4}
                          className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.06em] text-[12px] disabled:opacity-40"
                        >
                          Continue <ArrowRight size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPhoneStep("enter_phone"); setOtp(""); }}
                          className="w-full text-[11.5px] text-[var(--ink-faint)] hover:text-[var(--ink-dim)] transition-colors py-1"
                        >
                          ← Change phone / resend OTP
                        </button>
                      </form>
                    )}

                    {/* Step 3 — new password */}
                    {phoneStep === "new_password" && (
                      <form onSubmit={handlePhoneReset} className="space-y-4">
                        <label className="block">
                          <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">New password</span>
                          <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                            <input
                              type={showPass ? "text" : "password"}
                              placeholder="Min. 6 characters"
                              autoComplete="new-password"
                              value={newPass}
                              onChange={(e) => { setNewPass(e.target.value); setPhoneError(""); }}
                              autoFocus
                              className={`w-full h-12 sm:h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-10 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:outline-none transition-colors ${
                                phoneError ? "border-[var(--crimson)]" : "border-[var(--line-default)] focus:border-[var(--line-gold)]"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPass(!showPass)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
                              aria-label={showPass ? "Hide password" : "Show password"}
                            >
                              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </label>

                        <label className="block">
                          <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Confirm password</span>
                          <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none" />
                            <input
                              type={showPass ? "text" : "password"}
                              placeholder="Repeat new password"
                              autoComplete="new-password"
                              value={confirmPass}
                              onChange={(e) => { setConfirmPass(e.target.value); setPhoneError(""); }}
                              className={`w-full h-12 sm:h-11 bg-[var(--bg-inlay)] border rounded-[10px] pl-9 pr-3.5 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:outline-none transition-colors ${
                                phoneError ? "border-[var(--crimson)]" : "border-[var(--line-default)] focus:border-[var(--line-gold)]"
                              }`}
                            />
                          </div>
                          {phoneError && (
                            <p className="text-[var(--crimson)] text-[11.5px] mt-1.5 flex items-center gap-1">
                              <AlertCircle size={11} /> {phoneError}
                            </p>
                          )}
                        </label>

                        <button
                          type="submit"
                          disabled={phoneLoading || newPass.length < 6 || newPass !== confirmPass}
                          className="btn btn-gold sweep h-12 w-full uppercase tracking-[0.06em] text-[12px] disabled:opacity-40"
                        >
                          {phoneLoading ? (
                            <><Loader2 size={14} className="animate-spin" /> Resetting</>
                          ) : (
                            "Reset password"
                          )}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </>
            )}

            <div className="mt-6 pt-5 border-t border-[var(--line-default)] text-center">
              <p className="text-[12px] text-[var(--ink-faint)]">
                Remember your password?{" "}
                <Link href="/" className="text-[var(--gold-bright)] font-semibold hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
