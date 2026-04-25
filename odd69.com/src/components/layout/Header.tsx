"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet, LogOut, User, ChevronDown, Plus, Menu, X, Bell,
} from "lucide-react";
import { useModal } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";

export default function Header() {
  const pathname = usePathname();
  const { openLogin, openRegister, openDeposit } = useModal();
  const { logout, isAuthenticated } = useAuth();
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
    <header className="sticky top-0 z-[100] w-full h-16 glass border-b border-[var(--line-default)]">
      {/* gold hairline at the very top */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-60" />

      <div className="h-full max-w-[1680px] mx-auto flex items-center justify-between page-x">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="relative w-8 h-8 rounded-[10px] bg-gold-grad grid place-items-center shadow-[0_6px_18px_rgba(245,183,10,0.35)]">
            <span className="font-display font-extrabold text-[14px] text-[#120c00] leading-none">69</span>
            <div className="absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/30" />
          </div>
          <span className="font-display font-extrabold text-[19px] tracking-[-0.03em] text-[var(--ink)] group-hover:text-[var(--gold-bright)] transition-colors">
            odd<span className="text-gold-grad">69</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          {nav.map((n) => {
            const active = pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative px-3.5 py-2 text-[12.5px] font-semibold rounded-[10px] transition-all ${
                  active
                    ? "text-[var(--ink)]"
                    : "text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-white/[0.03]"
                }`}
              >
                {n.label}
                {active && (
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-0.5 h-[2px] w-5 rounded-full bg-gold-grad shadow-[0_0_8px_var(--gold-halo)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Balance pill — bordered with gold accent */}
              <div className="flex items-center gap-1.5 sm:gap-2 h-9 px-2.5 sm:px-3 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--line-gold)]">
                <Wallet size={13} className="text-[var(--gold)]" />
                <span className="num text-[12px] sm:text-[13px] font-semibold text-[var(--ink)] tracking-tight whitespace-nowrap">
                  {activeSymbol}{activeBalance.toFixed(2)}
                </span>
              </div>

              {/* Deposit CTA */}
              <button
                onClick={openDeposit}
                className="btn btn-gold sweep h-9 uppercase tracking-[0.06em] text-[11px]"
              >
                <Plus size={13} strokeWidth={3} /> Deposit
              </button>

              {/* Notif */}
              <button className="hidden sm:grid place-items-center w-9 h-9 rounded-[10px] bg-white/[0.03] border border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] transition-all">
                <Bell size={14} />
              </button>

              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 h-9 px-2.5 rounded-[10px] bg-white/[0.03] border border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] transition-all"
                >
                  <User size={14} />
                  <ChevronDown size={11} className={`transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 glass rounded-[14px] p-1.5 z-50 shadow-[var(--shadow-lift)] animate-fade-up">
                    <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-white/[0.04] rounded-[8px] transition-colors" onClick={() => setProfileOpen(false)}>
                      <User size={13} /> Profile
                    </Link>
                    <Link href="/profile/bet-history" className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-white/[0.04] rounded-[8px] transition-colors" onClick={() => setProfileOpen(false)}>
                      <Wallet size={13} /> Bet history
                    </Link>
                    <div className="hairline my-1" />
                    <button onClick={() => { logout(); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-[var(--crimson)] hover:bg-[var(--crimson-soft)] rounded-[8px] transition-colors">
                      <LogOut size={13} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={openLogin} className="text-[12.5px] font-semibold text-[var(--ink-dim)] hover:text-[var(--ink)] px-3 py-2 rounded-[10px] transition-colors">
                Log in
              </button>
              <button onClick={openRegister} className="btn btn-gold sweep h-9 uppercase tracking-[0.06em] text-[11px]">
                Sign up
              </button>
            </>
          )}

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden grid place-items-center w-9 h-9 rounded-[10px] text-[var(--ink-dim)] hover:text-[var(--ink)]">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 glass border-b border-[var(--line-default)] p-3 z-50 animate-fade-up">
          {nav.map((n) => {
            const active = pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 text-[13.5px] font-semibold rounded-[10px] mb-1 transition-all ${
                  active
                    ? "bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[var(--line-gold)]"
                    : "text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-white/[0.03]"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
