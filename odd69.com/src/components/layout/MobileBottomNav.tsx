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
    { label: "Home", href: "/", icon: Home },
    { label: "Casino", href: "/casino", icon: Gamepad2 },
    { label: "Sports", href: "/sports", icon: Trophy },
    { label: "Promos", href: "/promotions", icon: Gift },
    { label: "Profile", href: isAuthenticated ? "/profile" : "#", icon: User, authRequired: true },
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-[90]">
      <nav className="flex items-center justify-around bg-[#0f1218]/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl px-1 py-1.5 shadow-[0_-4px_30px_rgba(0,0,0,0.4)]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          const handleClick = (e: React.MouseEvent) => {
            if (item.authRequired && !isAuthenticated) { e.preventDefault(); openLogin(); }
          };
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={handleClick}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? "text-[#f59e0b] bg-[#f59e0b]/8" : "text-white/25"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
