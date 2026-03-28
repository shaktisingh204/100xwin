"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, Save, Loader2, CheckCircle, Lock } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function ProfileInfoPage() {
  const { user, login } = useAuth();

  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch("/auth/profile", { username, email, phone });
      const updatedUser = res.data?.user || res.data;
      const token = localStorage.getItem("token") || "";
      login(token, { ...user, ...updatedUser });
      setSaved(true);
      toast.success("Profile updated!");
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords don't match!"); return; }
    if (newPw.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword: currentPw, newPassword: newPw });
      toast.success("Password changed successfully!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <User size={20} className="text-blue-400" /> Personal Information
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Update your account details</p>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSaveProfile} className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 shadow-2xl space-y-4">
        <h2 className="text-base font-black text-white/80 uppercase tracking-widest mb-4">Account Details</h2>

        {[
          { label: "Username", value: username, set: setUsername, icon: User, placeholder: "Your display name", type: "text" },
          { label: "Email", value: email, set: setEmail, icon: Mail, placeholder: "your@email.com", type: "email" },
          { label: "Phone Number", value: phone, set: setPhone, icon: Phone, placeholder: "+91 XXXXX XXXXX", type: "tel" },
        ].map(({ label, value, set, icon: Icon, placeholder, type }) => (
          <div key={label}>
            <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">{label}</label>
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
              />
            </div>
          </div>
        ))}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
           saved   ? <><CheckCircle className="w-4 h-4" /> Saved!</> :
           <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </form>

      {/* Change password */}
      <form onSubmit={handleChangePassword} className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 shadow-2xl space-y-4">
        <h2 className="text-base font-black text-white/80 uppercase tracking-widest flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" /> Change Password
        </h2>

        {[
          { label: "Current Password", value: currentPw, set: setCurrentPw, placeholder: "Enter current password" },
          { label: "New Password",     value: newPw,     set: setNewPw,     placeholder: "At least 6 characters" },
          { label: "Confirm Password", value: confirmPw,  set: setConfirmPw, placeholder: "Repeat new password" },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">{label}</label>
            <input type="password" value={value} onChange={e => set(e.target.value)} placeholder={placeholder} required
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition-all text-sm"
            />
          </div>
        ))}

        <button type="submit" disabled={pwLoading}
          className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
          {pwLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : "Update Password"}
        </button>
      </form>

      <div className="h-8" />
    </div>
  );
}
