"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Users, CreditCard, Clock, Wallet, DollarSign,
    Settings, CheckCircle, Shield, TrendingUp, Gamepad2, List,
    Layers, Trophy, Gift, Star, Tag, Bell, Phone, BookOpen,
    PieChart, HeadphonesIcon, Globe, UserCog, Mail, Send,
    MessageSquare, LogOut, Menu, X, ChevronDown,
    Bomb, Swords, Banknote, AlertTriangle, Zap, Radio, FileText, SlidersHorizontal,
    BarChart2, ShieldCheck,
} from "lucide-react";

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    badge?: string | number;
}

interface NavGroup {
    title: string;
    icon: React.ElementType;  // group-level icon for collapsed tooltip
    items: NavItem[];
}

interface StoredAdminUser {
    username?: string;
    email?: string;
    role?: string;
}

const NAV: NavGroup[] = [
    {
        title: "Overview",
        icon: LayoutDashboard,
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
    },
    {
        title: "Users",
        icon: Users,
        items: [
            { name: "All Users", href: "/dashboard/users", icon: Users },
            { name: "CRM & Segments", href: "/dashboard/crm", icon: UserCog },
        ],
    },
    {
        title: "Finance",
        icon: DollarSign,
        items: [
            { name: "All Transactions", href: "/dashboard/finance/transactions", icon: CreditCard },
            { name: "Pending Withdrawals", href: "/dashboard/finance/withdrawals", icon: Clock },
            { name: "Pending Deposits", href: "/dashboard/finance/deposits", icon: Clock },
            { name: "Manual Adjustments", href: "/dashboard/finance/adjustments", icon: Wallet },
            { name: "Payment Gateways", href: "/dashboard/finance/gateways", icon: DollarSign },
            { name: "Gateway Settings", href: "/dashboard/finance/deposit-settings", icon: SlidersHorizontal },
            { name: "Reconciliation", href: "/dashboard/finance/reconciliation", icon: CheckCircle },
        ],
    },
    {
        title: "Sportsbook",
        icon: Trophy,
        items: [
            { name: "Sports & Competitions", href: "/dashboard/sports", icon: Swords },
            { name: "Events", href: "/dashboard/sports/events", icon: List },
            { name: "Bet Limits", href: "/dashboard/sports/limits", icon: TrendingUp },
            { name: "Risk Management", href: "/dashboard/sports/risk", icon: AlertTriangle },
            { name: "Settlement", href: "/dashboard/settlement", icon: CheckCircle },
            { name: "Promo Teams", href: "/dashboard/sports/promo-teams", icon: ShieldCheck },
            { name: "Team Icons", href: "/dashboard/sports/team-icons", icon: Star },
        ],
    },
    {
        title: "Casino",
        icon: Gamepad2,
        items: [
            { name: "Games", href: "/dashboard/casino/games", icon: Gamepad2 },
            { name: "Providers", href: "/dashboard/casino/providers", icon: Layers },
            { name: "Categories", href: "/dashboard/casino/categories", icon: List },
        ],
    },
    {
        title: "Zeero Originals",
        icon: Bomb,
        items: [
            { name: "Overview", href: "/dashboard/originals", icon: BarChart2 },
            { name: "Mines Config", href: "/dashboard/originals/mines", icon: Bomb },
            { name: "Game History", href: "/dashboard/originals/mines/history", icon: FileText },
        ],
    },
    {
        title: "Bets",
        icon: Banknote,
        items: [
            { name: "Casino Bets", href: "/dashboard/bets/casino", icon: Gamepad2 },
            { name: "Sports Bets", href: "/dashboard/bets/sports", icon: Trophy },
        ],
    },
    {
        title: "CMS",
        icon: FileText,
        items: [
            { name: "Promo Cards", href: "/dashboard/cms/promo-cards", icon: LayoutDashboard },
            { name: "VIP Applications", href: "/dashboard/cms/vip-applications", icon: Star },
            { name: "Promotions", href: "/dashboard/cms/promotions", icon: Tag },
            { name: "Announcements", href: "/dashboard/cms/announcements", icon: Radio },
            { name: "Push Notifications", href: "/dashboard/cms/push-notifications", icon: Bell },
            { name: "Home Categories", href: "/dashboard/cms/categories", icon: List },
        ],
    },
    {
        title: "Marketing",
        icon: Gift,
        items: [
            { name: "Refer & Earn", href: "/dashboard/affiliates", icon: Users },
            { name: "Referral Rewards", href: "/dashboard/affiliates/rewards", icon: Star },
            { name: "Bonuses", href: "/dashboard/marketing/bonuses", icon: Gift },
            { name: "Agents", href: "/dashboard/agents", icon: Users },
        ],
    },
    {
        title: "Messaging",
        icon: Mail,
        items: [
            { name: "Email Campaigns", href: "/dashboard/messaging/email/campaigns", icon: Mail },
            { name: "Email Templates", href: "/dashboard/messaging/email/templates", icon: BookOpen },
            { name: "WhatsApp Account", href: "/dashboard/messaging/whatsapp/templates", icon: MessageSquare },
            { name: "Bulk Campaigns", href: "/dashboard/messaging/whatsapp/campaigns", icon: Send },
            { name: "Auto Messages", href: "/dashboard/messaging/whatsapp/auto-messages", icon: Zap },
            { name: "Sync Templates", href: "/dashboard/messaging/whatsapp/sync-templates", icon: Globe },
            { name: "Analytics", href: "/dashboard/messaging/analytics", icon: PieChart },
        ],
    },
    {
        title: "Reports & Support",
        icon: PieChart,
        items: [
            { name: "Reports", href: "/dashboard/reports", icon: PieChart },
            { name: "Support Tickets", href: "/dashboard/support", icon: HeadphonesIcon },
        ],
    },
    {
        title: "System",
        icon: Shield,
        items: [
            { name: "Admin Security", href: "/dashboard/security/admins", icon: Shield },
            { name: "Site Config", href: "/dashboard/settings/config", icon: Settings },
            { name: "Contact Settings", href: "/dashboard/settings/contact", icon: Phone },
            { name: "Audit Logs", href: "/dashboard/settings/audit", icon: BookOpen },
        ],
    },
];

function isActive(pathname: string, href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
}

function getInitialExpanded(pathname: string) {
    const activeGroups = NAV
        .filter(group => group.items.some(item => isActive(pathname, item.href)))
        .map(group => group.title);

    return activeGroups.length ? activeGroups : ["Finance", "Sportsbook", "Bets"];
}

function getStoredAdminUser(): StoredAdminUser | null {
    if (typeof window === "undefined") return null;

    const stored = localStorage.getItem("user");
    if (!stored) return null;

    try {
        return JSON.parse(stored) as StoredAdminUser;
    } catch {
        return null;
    }
}

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<StoredAdminUser | null>(() => getStoredAdminUser());
    const [isOpen, setIsOpen] = useState(false);
    const [expanded, setExpanded] = useState<string[]>(() => getInitialExpanded(pathname));
    const expandedGroups = Array.from(new Set([...expanded, ...getInitialExpanded(pathname)]));

    useEffect(() => {
        if (typeof document === "undefined") return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = isOpen ? "hidden" : previousOverflow;

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    const toggleGroup = (title: string) =>
        setExpanded(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsOpen(false);
        router.push("/");
    };

    const close = () => setIsOpen(false);

    return (
        <>
            {/* ── Mobile hamburger ────────────────────────────── */}
            <button
                className="lg:hidden fixed left-3 top-3 z-50 rounded-xl border border-white/10 bg-[#0f1117] p-2.5 text-white shadow-lg"
                onClick={() => setIsOpen(o => !o)}
                aria-label="Toggle sidebar"
                aria-expanded={isOpen}
            >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* ── Mobile backdrop ─────────────────────────────── */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={close}
                />
            )}

            {/* ── Sidebar shell ───────────────────────────────── */}
            <aside className={`
                fixed top-0 left-0 z-40 flex h-dvh w-[min(86vw,280px)] flex-col
                bg-[#0d0f14] border-r border-white/[0.06]
                transition-transform duration-300 ease-in-out lg:w-[240px]
                ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}>

                {/* ── Logo ──────────────────────────────────────── */}
                <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 py-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-violet-900/40 flex-shrink-0">
                        Z
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-white leading-none">Zeero Admin</p>
                        {user && (
                            <p className="text-[10px] text-white/30 mt-0.5 capitalize">
                                {user.role?.replace(/_/g, " ").toLowerCase()}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Navigation ────────────────────────────────── */}
                <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    {NAV.map((group) => {
                        const hasActive = group.items.some(i => isActive(pathname, i.href));
                        const open = expandedGroups.includes(group.title);

                        // Single-item groups render as flat links (no accordion)
                        if (group.items.length === 1) {
                            const item = group.items[0];
                            const Icon = item.icon;
                            const active = isActive(pathname, item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={close}
                                    className={`
                                        group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                                        ${active
                                            ? "bg-gradient-to-r from-violet-600/30 to-indigo-600/20 text-white border border-violet-500/20 shadow shadow-violet-900/10"
                                            : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                                        }
                                    `}
                                >
                                    <Icon size={16} className={active ? "text-violet-400" : "text-white/30 group-hover:text-white/60"} />
                                    {item.name}
                                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                                </Link>
                            );
                        }

                        return (
                            <div key={group.title}>
                                {/* Section header / toggle */}
                                <button
                                    onClick={() => toggleGroup(group.title)}
                                    className={`
                                        w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all
                                        ${hasActive ? "text-violet-400" : "text-white/25 hover:text-white/50"}
                                    `}
                                >
                                    <span className="flex-1 text-left">{group.title}</span>
                                    <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
                                        <ChevronDown size={11} />
                                    </span>
                                </button>

                                {/* Items */}
                                {open && (
                                    <div className="mt-0.5 mb-1 space-y-0.5">
                                        {group.items.map(item => {
                                            const Icon = item.icon;
                                            const active = isActive(pathname, item.href);
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={close}
                                                    className={`
                                                        group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
                                                        ${active
                                                            ? "bg-violet-600/20 text-white border border-violet-500/20"
                                                            : "text-white/40 hover:text-white hover:bg-white/[0.05]"
                                                        }
                                                    `}
                                                >
                                                    <Icon size={14} className={active ? "text-violet-400" : "text-white/25 group-hover:text-white/50"} />
                                                    <span className="truncate flex-1">{item.name}</span>
                                                    {item.badge !== undefined && (
                                                        <span className="ml-auto text-[10px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* ── User footer ───────────────────────────────── */}
                <div className="flex-shrink-0 space-y-1 border-t border-white/[0.06] p-3 pb-4">
                    {user && (
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(user.username || user.email || "A")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[12px] text-white font-medium truncate">{user.username || user.email}</p>
                                <p className="text-[10px] text-white/30 capitalize">
                                    {user.role?.replace(/_/g, " ").toLowerCase()}
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut size={14} />
                        Sign out
                    </button>
                </div>
            </aside>
        </>
    );
}
