"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gamepad2, Trophy, Gift, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModal();

  const items = [
    { label: "Home",    href: "/",                                  icon: Home },
    { label: "Casino",  href: "/casino",                            icon: Gamepad2 },
    { label: "Sports",  href: "/sports",                            icon: Trophy },
    { label: "Promos",  href: "/promotions",                        icon: Gift },
    { label: "Profile", href: isAuthenticated ? "/profile" : "#",   icon: User, authRequired: true },
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-[90]">
      <nav className="relative flex items-stretch justify-around glass border-[var(--line-strong)] rounded-[20px] px-1.5 py-1.5 shadow-[0_-10px_40px_rgba(0,0,0,0.55)]">
        {/* gold hairline at top of bar */}
        <span className="absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-50" />

        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          const handleClick = (e: React.MouseEvent) => {
            if (item.authRequired && !isAuthenticated) { e.preventDefault(); openLogin(); }
          };
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={handleClick}
              className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-[14px] flex-1 transition-all ${
                active
                  ? "text-[var(--gold-bright)]"
                  : "text-[var(--ink-whisper)]"
              }`}
            >
              {active && (
                <span className="absolute inset-0 rounded-[14px] bg-gradient-to-b from-[var(--gold-soft)] to-transparent border border-[var(--line-gold)]" />
              )}
              <Icon size={18} strokeWidth={active ? 2.5 : 1.75} className="relative" />
              <span className={`relative text-[9.5px] font-semibold tracking-wide ${active ? "" : "opacity-90"}`}>{item.label}</span>
              {active && (
                <span className="absolute -bottom-1 h-[3px] w-6 rounded-full bg-gold-grad shadow-[0_0_8px_var(--gold-halo)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
