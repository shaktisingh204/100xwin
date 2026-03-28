"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Eye, EyeOff, Mail, Lock, Phone, User, AlertCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { HiOutlineMail, HiOutlinePhone } from "react-icons/hi";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

/* ─────────────────── SHARED INPUT ─────────────────── */
function Input({ icon: Icon, error, ...props }: { icon: any; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col">
      <div className="relative group">
        <Icon size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${error ? "text-red-400" : "text-white/25 group-focus-within:text-[#f59e0b]"}`} />
        <input
          {...props}
          className={`w-full h-[52px] bg-black/40 border rounded-xl pl-11 pr-4 text-white text-[14px] font-medium outline-none transition-all placeholder:text-white/20
            ${error ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-white/[0.08] focus:border-[#f59e0b]/50 focus:bg-black/60 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-white/[0.15]"}`}
        />
      </div>
      {error && (
        <p className="text-red-400 text-[11px] font-bold mt-1.5 ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={12} />{error}
        </p>
      )}
    </div>
  );
}

/* ─────────────────── PHONE INPUT ─────────────────── */
function PhoneInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex gap-2 group">
        <div className="flex items-center justify-center gap-1.5 h-[52px] bg-black/40 border border-white/[0.08] rounded-xl px-4 text-white/50 text-[14px] font-bold flex-shrink-0 transition-colors group-focus-within:border-white/[0.15]">
          <span className="text-lg leading-none">🇮🇳</span> +91
        </div>
        <input
          type="tel" inputMode="numeric" placeholder="Phone number"
          value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          className={`flex-1 h-[52px] bg-black/40 border rounded-xl px-4 text-white text-[14px] font-medium outline-none transition-all placeholder:text-white/20
            ${error ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-white/[0.08] focus:border-[#f59e0b]/50 focus:bg-black/60 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-white/[0.15]"}`}
        />
      </div>
      {error && (
        <p className="text-red-400 text-[11px] font-bold mt-1.5 ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={12} />{error}
        </p>
      )}
    </div>
  );
}

/* ─────────────────── LOGIN FORM ─────────────────── */
function LoginForm({ onSwitchToRegister, onClose }: { onSwitchToRegister: () => void; onClose: () => void }) {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (tab === "email") {
      if (!identifier.trim()) errs.identifier = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) errs.identifier = "Invalid email";
    } else {
      if (!phone.trim()) errs.phone = "Phone is required";
      else if (phone.length < 10) errs.phone = "Enter a valid 10-digit number";
    }
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Min. 6 characters";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const resolvedId = tab === "phone" ? `+91${phone}` : identifier.trim();
      const res = await api.post("/auth/login", { identifier: resolvedId, password });
      login(res.data.access_token, res.data.user);
      toast.success("Welcome back!");
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const msgStr = Array.isArray(msg) ? msg.join(", ") : msg || "";
      if (err.response?.status === 403 || msgStr.toLowerCase().includes("suspended"))
        setError("Your account has been suspended. Contact support.");
      else if (err.response?.status === 429)
        setError("Too many attempts. Please wait and try again.");
      else
        setError(msgStr || "Login failed. Please check your credentials.");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-black text-white tracking-tight mb-1.5">Welcome back</h2>
        <p className="text-[13px] text-white/40 font-medium">
          New here?{" "}
          <button type="button" onClick={onSwitchToRegister} className="text-[#f59e0b] font-bold hover:text-amber-300 transition-colors">Create account</button>
        </p>
      </div>

      {/* Modern Pill Tabs */}
      <div className="flex bg-black/40 border border-white/[0.06] rounded-xl p-1.5 relative">
        {(["email", "phone"] as const).map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setError(""); setFieldErrors({}); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold rounded-lg transition-all z-10 ${tab === t ? "text-white shadow-sm" : "text-white/30 hover:text-white/60"}`}>
            {t === "email" ? <HiOutlineMail size={16} /> : <HiOutlinePhone size={16} />}
            <span className="uppercase tracking-wider">{t}</span>
          </button>
        ))}
        {/* Animated Pill Background */}
        <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 rounded-lg backdrop-blur-md border border-white/[0.05] transition-transform duration-300 ease-out-expo ${tab === "phone" ? "translate-x-[calc(100%+6px)]" : "translate-x-0"}`} />
      </div>

      <div className="space-y-4">
        {tab === "email" ? (
          <Input icon={Mail} type="email" placeholder="Email address" autoComplete="email"
            value={identifier} onChange={(e) => { setIdentifier(e.target.value); setFieldErrors(p => ({ ...p, identifier: "" })); }}
            error={fieldErrors.identifier} />
        ) : (
          <PhoneInput value={phone} onChange={(v) => { setPhone(v); setFieldErrors(p => ({ ...p, phone: "" })); }} error={fieldErrors.phone} />
        )}

        {/* Password */}
        <div className="flex flex-col">
          <div className="relative group">
            <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${fieldErrors.password ? "text-red-400" : "text-white/25 group-focus-within:text-[#f59e0b]"}`} />
            <input
              type={showPw ? "text" : "password"} placeholder="Password" autoComplete="current-password"
              value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: "" })); }}
              className={`w-full h-[52px] bg-black/40 border rounded-xl pl-11 pr-12 text-white text-[14px] font-medium outline-none transition-all placeholder:text-white/20
                ${fieldErrors.password ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-white/[0.08] focus:border-[#f59e0b]/50 focus:bg-black/60 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-white/[0.15]"}`}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-red-400 text-[11px] font-bold mt-1.5 ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={12} />{fieldErrors.password}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-[13px] font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <button type="submit" disabled={loading}
        className="relative group w-full h-[52px] rounded-xl font-black text-[14px] uppercase tracking-widest text-[#1a1200] overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2">
        <div className="absolute inset-0 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] bg-[length:200%_auto] group-hover:bg-[position:right_center] transition-all duration-500" />
        <div className="relative h-full flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : <>Log In <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
        </div>
      </button>
      
      <div className="flex justify-center mt-2">
        <button type="button" onClick={() => { onClose(); router.push("/forgot-password"); }} className="text-[12px] font-bold text-white/30 hover:text-white transition-colors">Forgot your password?</button>
      </div>
    </form>
  );
}

/* ─────────────────── REGISTER FORM ─────────────────── */
function RegisterForm({ onSwitchToLogin, onClose }: { onSwitchToLogin: () => void; onClose: () => void }) {
  const { login } = useAuth();
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = "Username is required";
    else if (username.length < 3) errs.username = "Min. 3 characters";
    if (tab === "email") {
      if (!identifier.trim()) errs.identifier = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) errs.identifier = "Invalid email";
    } else {
      if (!phone.trim()) errs.phone = "Phone is required";
      else if (phone.length < 10) errs.phone = "Enter a valid 10-digit number";
    }
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Min. 6 characters";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: any = { username: username.trim(), password };
      if (tab === "email") payload.email = identifier.trim();
      else payload.phone = `+91${phone}`;
      if (referralCode.trim()) payload.referralCode = referralCode.trim().toUpperCase();

      const res = await api.post("/auth/register", payload);
      login(res.data.access_token, res.data.user);
      toast.success("Account created! Welcome to Odd69");
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const msgStr = Array.isArray(msg) ? msg.join(", ") : msg || "";
      setError(msgStr || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-black text-white tracking-tight mb-1.5">Create account</h2>
        <p className="text-[13px] text-white/40 font-medium">
          Already have one?{" "}
          <button type="button" onClick={onSwitchToLogin} className="text-[#f59e0b] font-bold hover:text-amber-300 transition-colors">Log in</button>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-black/40 border border-white/[0.06] rounded-xl p-1.5 relative">
        {(["email", "phone"] as const).map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setError(""); setFieldErrors({}); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold rounded-lg transition-all z-10 ${tab === t ? "text-white shadow-sm" : "text-white/30 hover:text-white/60"}`}>
            {t === "email" ? <HiOutlineMail size={16} /> : <HiOutlinePhone size={16} />}
            <span className="uppercase tracking-wider">{t}</span>
          </button>
        ))}
        {/* Animated Pill Background */}
        <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 rounded-lg backdrop-blur-md border border-white/[0.05] transition-transform duration-300 ease-out-expo ${tab === "phone" ? "translate-x-[calc(100%+6px)]" : "translate-x-0"}`} />
      </div>

      <div className="space-y-4">
        <Input icon={User} type="text" placeholder="Choose a username" autoComplete="username"
          value={username} onChange={(e) => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: "" })); }}
          error={fieldErrors.username} />

        {tab === "email" ? (
          <Input icon={Mail} type="email" placeholder="Email address" autoComplete="email"
            value={identifier} onChange={(e) => { setIdentifier(e.target.value); setFieldErrors(p => ({ ...p, identifier: "" })); }}
            error={fieldErrors.identifier} />
        ) : (
          <PhoneInput value={phone} onChange={(v) => { setPhone(v); setFieldErrors(p => ({ ...p, phone: "" })); }} error={fieldErrors.phone} />
        )}

        {/* Password */}
        <div className="flex flex-col">
          <div className="relative group">
            <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${fieldErrors.password ? "text-red-400" : "text-white/25 group-focus-within:text-[#f59e0b]"}`} />
            <input
              type={showPw ? "text" : "password"} placeholder="Create password" autoComplete="new-password"
              value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: "" })); }}
              className={`w-full h-[52px] bg-black/40 border rounded-xl pl-11 pr-12 text-white text-[14px] font-medium outline-none transition-all placeholder:text-white/20
                ${fieldErrors.password ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-white/[0.08] focus:border-[#f59e0b]/50 focus:bg-black/60 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-white/[0.15]"}`}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-red-400 text-[11px] font-bold mt-1.5 ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={12} />{fieldErrors.password}
            </p>
          )}
        </div>

        {/* Referral code (optional) */}
        <div className="relative group">
          <Sparkles size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors pointer-events-none group-focus-within:text-purple-400" />
          <input
            type="text" placeholder="Referral code (optional)"
            value={referralCode} onChange={(e) => setReferralCode(e.target.value)}
            className="w-full h-[52px] bg-black/20 border border-white/[0.04] border-dashed rounded-xl pl-11 pr-4 text-white text-[14px] font-medium outline-none transition-all placeholder:text-white/15 focus:border-purple-400/50 focus:bg-purple-900/10 uppercase"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-[13px] font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <button type="submit" disabled={loading}
        className="relative group w-full h-[52px] rounded-xl font-black text-[14px] uppercase tracking-widest text-[#1a1200] overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2">
        <div className="absolute inset-0 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] bg-[length:200%_auto] group-hover:bg-[position:right_center] transition-all duration-500" />
        <div className="relative h-full flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <>Create Account <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
        </div>
      </button>

      <p className="text-[11px] font-medium text-white/20 text-center leading-relaxed px-4">
        By registering you agree to our <Link href="/legal/terms" onClick={onClose} className="text-white/40 hover:text-white transition-colors underline decoration-white/20 underline-offset-2">Terms of Service</Link> and confirm you are 18+.
      </p>
    </form>
  );
}

/* ─────────────────── MODAL SHELL ─────────────────── */
export default function AuthModal() {
  const { isLoginOpen, isRegisterOpen, closeLogin, closeRegister, openLogin, openRegister } = useModal();
  const isOpen = isLoginOpen || isRegisterOpen;

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeLogin(); closeRegister(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeLogin, closeRegister]);

  if (!isOpen) return null;

  const handleClose = () => { closeLogin(); closeRegister(); };
  const toLogin = () => { closeRegister(); openLogin(); };
  const toRegister = () => { closeLogin(); openRegister(); };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>

      <div className="relative w-full max-w-[420px] bg-[#0a0d14]/90 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-[0_0_80px_-20px_rgba(245,158,11,0.15)] overflow-hidden animate-in zoom-in-95 duration-200 fill-mode-both">
        
        {/* Decorative Gradients */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-[#f59e0b]/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-blue-500/5 blur-[80px] pointer-events-none" />

        {/* Close Button Float */}
        <button onClick={handleClose} className="absolute top-3 right-3 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-all cursor-pointer">
          <X size={18} />
        </button>

        {/* Header Logo */}
        <div className="pt-8 pb-2 px-8 flex justify-center relative z-10">
          <span className="text-3xl font-black text-white tracking-tight">odd<span className="text-[#f59e0b]">69</span></span>
        </div>

        {/* Form body */}
        <div className="p-7 relative z-10 max-h-[85vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {isLoginOpen ? (
            <LoginForm onSwitchToRegister={toRegister} onClose={handleClose} />
          ) : (
            <RegisterForm onSwitchToLogin={toLogin} onClose={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}
