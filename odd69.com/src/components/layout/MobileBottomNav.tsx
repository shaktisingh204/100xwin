"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gamepad2, Trophy, Gift, User, Users } from "lucide-react";
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
    { label: "Fantasy", href: "/fantasy",                           icon: Users },
    { label: "Promos",  href: "/promotions",                        icon: Gift },
    { label: "Profile", href: isAuthenticated ? "/profile" : "#",   icon: User, authRequired: true },
  ];

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] px-2 pt-2"
      style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 8px)` }}
    >
      <nav
        className="relative flex items-stretch justify-around rounded-[20px] px-1 py-1.5 border border-[var(--line-strong)] shadow-[0_-12px_44px_rgba(0,0,0,0.7)]"
        style={{
          background: "linear-gradient(180deg, rgba(8,9,13,0.96) 0%, rgba(4,5,8,0.98) 100%)",
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
        }}
      >
        {/* gold hairline at top of bar */}
        <span className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-60" />

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
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-1 py-2 min-h-[54px] rounded-[12px] flex-1 transition-all ${
                active
                  ? "text-[var(--gold-bright)]"
                  : "text-[var(--ink-dim)]"
              }`}
            >
              {active && (
                <span className="absolute inset-0 rounded-[12px] bg-gradient-to-b from-[var(--gold-soft)] to-transparent border border-[var(--line-gold)]" />
              )}
              <Icon size={19} strokeWidth={active ? 2.4 : 2} className="relative" />
              <span className={`relative text-[9.5px] font-semibold tracking-wide leading-none mt-0.5 ${active ? "" : ""}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute -bottom-1 h-[3px] w-5 rounded-full bg-gold-grad shadow-[0_0_8px_var(--gold-halo)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
