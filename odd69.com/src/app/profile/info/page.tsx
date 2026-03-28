"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function PersonalInfoPage() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-white/50 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <User size={20} className="text-blue-400" />
            Personal Info
          </h1>
          <p className="text-xs font-medium text-white/40 mt-0.5">Manage your account details</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-[#0a0d14]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -mt-20 -mr-20" />
        
        <div className="space-y-6 relative z-10 relative">
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <User size={14} className="text-blue-400" /> Username
            </label>
            <div className="h-12 w-full bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center px-4 text-white font-medium">
              {user.username}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Mail size={14} className="text-blue-400" /> Email
            </label>
            <div className="h-12 w-full bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center px-4 text-white/50 font-medium italic">
              {user.email || "Not provided"}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Phone size={14} className="text-blue-400" /> Phone Number
            </label>
            <div className="h-12 w-full bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center px-4 text-white/50 font-medium italic">
              {user.phone || "Not provided"}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06]">
            <button className="flex items-center gap-2 text-sm font-bold text-white/40 hover:text-white transition-colors">
              <Lock size={16} /> Change Password
            </button>
          </div>

        </div>
      </div>
      
      <div className="h-8" />
    </div>
  );
}
