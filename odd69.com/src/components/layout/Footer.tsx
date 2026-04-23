"use client";

import Link from "next/link";
import { SiTelegram, SiInstagram } from "react-icons/si";
import { Shield, Zap, Clock, Globe } from "lucide-react";

export default function Footer() {
  const groups = [
    {
      title: "Play",
      links: [
        { label: "Casino",      href: "/casino" },
        { label: "Live dealers", href: "/live-dealers" },
        { label: "Sports",      href: "/sports" },
        { label: "Originals",   href: "/zeero-games" },
        { label: "Fantasy",     href: "/fantasy" },
      ],
    },
    {
      title: "Rewards",
      links: [
        { label: "Promotions",    href: "/promotions" },
        { label: "VIP club",      href: "/vip" },
        { label: "Daily rewards", href: "/daily-rewards" },
        { label: "Referrals",     href: "/referral" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Help center", href: "/support/help-center" },
        { label: "Fairness",    href: "/fairness" },
        { label: "Rules",       href: "/legal/rules" },
        { label: "Settings",    href: "/settings" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms",          href: "/legal/terms" },
        { label: "Privacy policy", href: "/legal/privacy-policy" },
        { label: "Responsible play", href: "/legal/responsible" },
        { label: "AML",            href: "/legal/aml" },
      ],
    },
  ];

  return (
    <footer className="mt-16 border-t border-[var(--line-default)] bg-[var(--bg-base)]">
      <div className="max-w-[1680px] mx-auto page-x py-12">
        {/* Trust band */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { icon: Shield, label: "Curaçao licensed",  desc: "Regulated & audited" },
            { icon: Zap,    label: "Instant payouts",   desc: "Under 60 seconds" },
            { icon: Clock,  label: "24/7 support",      desc: "Live chat & WhatsApp" },
            { icon: Globe,  label: "Global reach",      desc: "140+ countries" },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="flex items-center gap-3 p-3.5 rounded-[14px] bg-[var(--bg-surface)] border border-[var(--line-default)]">
                <div className="grid place-items-center w-10 h-10 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--line-gold)]">
                  <Icon size={16} className="text-[var(--gold-bright)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--ink)] leading-tight">{t.label}</p>
                  <p className="text-[10.5px] text-[var(--ink-faint)] mt-0.5">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-10">
          {/* Brand block */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-[10px] bg-gold-grad grid place-items-center shadow-[0_6px_18px_rgba(245,183,10,0.35)]">
                <span className="font-display font-extrabold text-[14px] text-[#120c00] leading-none">69</span>
              </div>
              <span className="font-display font-extrabold text-[20px] tracking-[-0.03em] text-[var(--ink)]">
                odd<span className="text-gold-grad">69</span>
              </span>
            </div>
            <p className="text-[12px] text-[var(--ink-faint)] mt-3 max-w-xs leading-relaxed">
              India&apos;s premium sports betting &amp; casino floor. Play sharp, cash out in seconds.
            </p>
            <div className="flex items-center gap-2 mt-5">
              <a href="https://t.me/" target="_blank" rel="noopener noreferrer" aria-label="Telegram"
                className="grid place-items-center w-9 h-9 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[#29b6f6] hover:border-[#29b6f6]/40 transition-all">
                <SiTelegram size={14} />
              </a>
              <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="grid place-items-center w-9 h-9 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--line-default)] text-[var(--ink-dim)] hover:text-[#e1306c] hover:border-[#e1306c]/40 transition-all">
                <SiInstagram size={14} />
              </a>
            </div>
          </div>

          {/* Link groups */}
          {groups.map((g) => (
            <div key={g.title}>
              <p className="t-eyebrow !text-[9.5px] mb-3">{g.title}</p>
              <ul className="space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[12px] text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline" />

        <div className="pt-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--ink-whisper)] font-mono">
            © {new Date().getFullYear()} odd69.com · All rights reserved
          </p>
          <div className="flex items-center gap-3 text-[11px] text-[var(--ink-faint)]">
            <span className="chip chip-crimson !text-[9.5px]">18+</span>
            <span>Gamble responsibly</span>
            <span className="text-[var(--ink-whisper)]">·</span>
            <span>Curaçao licensed</span>
            <span className="text-[var(--ink-whisper)]">·</span>
            <span className="font-mono">v2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
