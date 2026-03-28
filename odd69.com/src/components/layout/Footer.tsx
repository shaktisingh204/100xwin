"use client";

import Link from "next/link";
import { SiTelegram, SiInstagram } from "react-icons/si";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.03] mt-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
          <div>
            <h2 className="text-lg font-black text-white">odd<span className="text-[#f59e0b]">69</span></h2>
            <p className="text-[11px] text-white/20 mt-1 max-w-xs leading-relaxed">
              India&apos;s premium sports betting &amp; casino platform. Play smart, win big.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/25 hover:text-[#29b6f6] hover:border-[#29b6f6]/30 transition-all">
              <SiTelegram size={14} />
            </a>
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/25 hover:text-[#e1306c] hover:border-[#e1306c]/30 transition-all">
              <SiInstagram size={14} />
            </a>
          </div>
        </div>

        {/* Links row */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
          {[
            { label: "Casino", href: "/casino" },
            { label: "Sports", href: "/sports" },
            { label: "Promotions", href: "/promotions" },
            { label: "VIP", href: "/vip" },
            { label: "Support", href: "/support" },
            { label: "Terms", href: "/legal/terms" },
            { label: "Privacy", href: "/legal/privacy-policy" },
            { label: "Fairness", href: "/fairness" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-[10px] font-bold text-white/15 hover:text-white/40 uppercase tracking-wider transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-4 border-t border-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[9px] text-white/10">© {new Date().getFullYear()} odd69.com — All rights reserved</p>
          <div className="flex items-center gap-3 text-[9px] text-white/10">
            <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold">18+</span>
            <span>Gamble Responsibly</span>
            <span>•</span>
            <span>Curaçao Licensed</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
