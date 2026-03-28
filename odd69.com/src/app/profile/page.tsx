"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import {
  User, Copy, Wallet, ArrowUpRight, ArrowDownLeft,
  History, Settings, FileText, Gift, HelpCircle, LogOut, ChevronRight, ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { openDeposit, openWithdraw } = useModal();
  const router = useRouter();

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      toast.success("User ID copied to clipboard!");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
    toast.success("Successfully logged out");
  };

  const menuItems = [
    { icon: User, label: "Personal Information", href: "/profile/info", color: "text-blue-400" },
    { icon: History, label: "Bet History", href: "/profile/bet-history", color: "text-purple-400" },
    { icon: Wallet, label: "Transactions", href: "/profile/transactions", color: "text-emerald-400" },
    { icon: ShieldCheck, label: "Casino Transactions", href: "/profile/casino-transactions", color: "text-indigo-400" },
    { icon: Gift, label: "Refer & Earn", href: "/profile/referral", color: "text-amber-400" },
    { icon: FileText, label: "Rules & Policies", href: "/profile/rules", color: "text-gray-400" },
    { icon: HelpCircle, label: "24/7 Support", href: "/support", color: "text-rose-400" },
  ];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full border-2 border-[#f59e0b]/20 border-t-[#f59e0b] animate-spin" />
        <p className="text-white/50 text-sm font-bold tracking-widest uppercase animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6 animate-in fade-in duration-300">
      
      {/* 1. User Identity Card */}
      <div className="relative bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f59e0b]/5 rounded-full blur-[80px] pointer-events-none -mt-20 -mr-20" />
        
        <div className="flex items-center gap-5 relative z-10">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] p-[2px] shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <div className="w-full h-full bg-black/80 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <User size={32} className="text-[#f59e0b]" />
            </div>
          </div>
          
          {/* Info */}
          <div className="flex flex-col flex-1">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{user?.username || "Player"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-white/40">ID: <span className="text-white/70 font-mono">{user?.id || "N/A"}</span></span>
              {user?.id && (
                <button onClick={handleCopyId} className="text-white/30 hover:text-[#f59e0b] transition-colors p-1" title="Copy ID">
                  <Copy size={14} />
                </button>
              )}
            </div>
            {user?.email && <p className="text-sm font-medium text-white/40 mt-0.5">{user.email}</p>}
            {user?.phone && <p className="text-sm font-medium text-white/40 mt-0.5">{user.phone}</p>}
          </div>
        </div>
      </div>

      {/* 2. Wallet Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Balance Container */}
        <div className="md:col-span-2 relative bg-[linear-gradient(145deg,rgba(20,24,35,0.9)_0%,rgba(10,13,20,0.9)_100%)] border border-white/[0.06] rounded-3xl p-6 overflow-hidden shadow-xl group">
          <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-white/40 tracking-widest uppercase mb-1 flex items-center gap-1.5">
                <Wallet size={14} className="text-[#f59e0b]" /> Main Balance
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
                <span className="text-[#f59e0b] mr-1">₹</span>
                {Number(user?.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 relative z-10">
            <button 
              onClick={openDeposit}
              className="flex-1 h-12 relative group/btn rounded-xl font-black text-sm uppercase tracking-widest text-[#1a1200] overflow-hidden transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] bg-[length:200%_auto] group-hover/btn:bg-[position:right_center] transition-all duration-500" />
              <div className="relative h-full flex items-center justify-center gap-2">
                <ArrowDownLeft size={18} className="group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5 transition-transform" /> Deposit
              </div>
            </button>
            <button 
              onClick={openWithdraw}
              className="flex-1 h-12 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              Withdraw <ArrowUpRight size={18} className="text-white/50" />
            </button>
          </div>
        </div>

        {/* Secondary Balances */}
        <div className="flex flex-col gap-4">
          {/* Bonus Balance */}
          <div className="flex-1 bg-[#0a0d14]/80 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-5 flex flex-col justify-center shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <Gift size={64} />
            </div>
            <p className="text-[11px] font-bold text-white/40 tracking-widest uppercase mb-1 relative z-10">Bonus Balance</p>
            <h3 className="text-xl font-black text-white tracking-tight relative z-10">
              <span className="text-[#f59e0b] mr-1">₹</span>
              {Number(user?.bonus_balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h3>
          </div>
          
          {/* Exposure */}
          <div className="flex-1 bg-[#0a0d14]/80 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-5 flex flex-col justify-center shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <ArrowUpRight size={64} />
            </div>
            <p className="text-[11px] font-bold text-white/40 tracking-widest uppercase mb-1 relative z-10">Exposure</p>
            <h3 className="text-xl font-black text-white/80 tracking-tight relative z-10">
              <span className="text-white/40 mr-1">₹</span>
              {Number(user?.exposure || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* 3. Navigation Menu */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {menuItems.map((item, idx) => (
            <Link 
              key={idx} 
              href={item.href}
              className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center transition-colors group-hover:bg-white/[0.06] group-hover:border-white/[0.1] ${item.color}`}>
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                  {item.label}
                </span>
              </div>
              <ChevronRight size={18} className="text-white/20 group-hover:text-white/50 transition-colors group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </div>

      {/* 4. Logout Action */}
      <button 
        onClick={handleLogout}
        className="w-full h-14 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-500/80 hover:text-red-400 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
      >
        <LogOut size={16} /> Secure Logout
      </button>

      <div className="h-8" />
    </div>
  );
}
