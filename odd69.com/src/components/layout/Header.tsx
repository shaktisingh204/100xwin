"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet, LogOut, User, ChevronDown, Plus, Menu, X,
} from "lucide-react";
import { useModal } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";

export default function Header() {
  const pathname = usePathname();
  const { openLogin, openRegister, openDeposit } = useModal();
  const { logout, isAuthenticated, user } = useAuth();
  const { activeBalance, activeSymbol } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const nav = [
    { label: "Casino", href: "/casino" },
    { label: "Sports", href: "/sports" },
    { label: "Live", href: "/live-dealers" },
    { label: "Originals", href: "/zeero-games" },
    { label: "Promos", href: "/promotions" },
  ];

  return (
    <header className="sticky top-0 z-[100] w-full h-14 bg-[#0a0d12]/90 backdrop-blur-lg border-b border-white/[0.04]">
      <div className="h-full max-w-[1600px] mx-auto flex items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="text-xl font-black text-white tracking-tight flex-shrink-0">
          odd<span className="text-[#f59e0b]">69</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-8">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${
                pathname?.startsWith(n.href)
                  ? "bg-white/[0.06] text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Balance pill */}
              <div className="hidden sm:flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
                <Wallet size={13} className="text-[#f59e0b]" />
                <span className="text-[12px] font-bold text-white">{activeSymbol}{activeBalance.toFixed(2)}</span>
              </div>

              {/* Deposit */}
              <button
                onClick={openDeposit}
                className="flex items-center gap-1 bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-black font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg hover:brightness-110 transition-all"
              >
                <Plus size={13} strokeWidth={3} /> Deposit
              </button>

              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-white/50 hover:text-white/80 transition-colors"
                >
                  <User size={14} />
                  <ChevronDown size={11} className={`transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-[#12161e] border border-white/[0.06] rounded-xl shadow-2xl p-1.5 z-50">
                    <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/60 hover:text-white hover:bg-white/[0.04] rounded-lg" onClick={() => setProfileOpen(false)}>
                      <User size={13} /> Profile
                    </Link>
                    <Link href="/profile/bet-history" className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/60 hover:text-white hover:bg-white/[0.04] rounded-lg" onClick={() => setProfileOpen(false)}>
                      <Wallet size={13} /> Bet History
                    </Link>
                    <hr className="my-1 border-white/[0.04]" />
                    <button onClick={() => { logout(); setProfileOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10 rounded-lg">
                      <LogOut size={13} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={openLogin} className="text-[11px] font-bold text-white/40 hover:text-white/70 px-3 py-2 rounded-lg transition-colors">
                Log in
              </button>
              <button onClick={openRegister} className="text-[11px] font-black text-black bg-[#f59e0b] hover:bg-[#fbbf24] px-4 py-2 rounded-lg transition-colors uppercase tracking-wider">
                Sign up
              </button>
            </>
          )}

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-1.5 text-white/40 hover:text-white/70">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-[#0a0d12] border-b border-white/[0.04] p-3 z-50">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 text-[13px] font-bold rounded-lg mb-0.5 ${pathname?.startsWith(n.href) ? "bg-white/[0.06] text-white" : "text-white/40"}`}>
              {n.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
