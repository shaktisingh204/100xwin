"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Headphones, MessageCircle, Mail, Clock, ChevronDown,
  Shield, AlertTriangle, CreditCard, Gamepad2, UserCheck, HelpCircle,
  ExternalLink, Loader2, Send, Plus, Search, X, CheckCircle, AlertCircle,
  Ticket, Lock, BookOpen, Zap, Globe, FileText, Link2,
} from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { supportApi, type SupportTicket } from "@/services/support";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────
interface ContactSettings {
  whatsappNumber: string;
  whatsappLabel: string;
  whatsappDefaultMessage: string;
  telegramHandle: string;
  telegramLink: string;
  telegramChannelLink: string;
  emailAddress: string;
  whatsappEnabled: boolean;
  telegramEnabled: boolean;
  emailEnabled: boolean;
}

interface FaqMediaItem {
  type: "image" | "video" | "youtube" | "link";
  url: string;
  caption?: string;
}

interface FaqEntry {
  _id?: string;
  id?: string | number;
  question: string;
  answer: string;
  category: string;
  media?: FaqMediaItem[];
  order?: number;
}

// ── Category meta (gold-leaf palette) ──────────────────────────────────────
const CATEGORY_META: Record<
  string,
  { icon: React.ComponentType<{ size: number }>; chip: string; tone: string; label: string }
> = {
  account:   { icon: Shield,      chip: "chip-gold",    tone: "var(--gold-bright)", label: "Account & Security" },
  payments:  { icon: CreditCard,  chip: "chip-emerald", tone: "var(--emerald)",     label: "Deposits & Withdrawals" },
  deposit:   { icon: CreditCard,  chip: "chip-emerald", tone: "var(--emerald)",     label: "Deposits" },
  withdraw:  { icon: CreditCard,  chip: "chip-emerald", tone: "var(--emerald)",     label: "Withdrawals" },
  bonuses:   { icon: BookOpen,    chip: "chip-violet",  tone: "var(--violet)",      label: "Bonuses & Promotions" },
  sports:    { icon: Globe,       chip: "chip-ice",     tone: "var(--ice)",         label: "Sports Betting" },
  betting:   { icon: Globe,       chip: "chip-ice",     tone: "var(--ice)",         label: "Sports Betting" },
  casino:    { icon: Gamepad2,    chip: "chip-violet",  tone: "var(--violet)",      label: "Casino" },
  fantasy:   { icon: Zap,         chip: "chip-ice",     tone: "var(--ice)",         label: "Fantasy" },
  technical: { icon: FileText,    chip: "chip",         tone: "var(--ink-dim)",     label: "Technical" },
  general:   { icon: HelpCircle,  chip: "chip",         tone: "var(--ink-dim)",     label: "General" },
};

// ── Fallback FAQs (used if API returns empty) ──────────────────────────────
const FALLBACK_FAQS: FaqEntry[] = [
  { id: 1, category: "payments", question: "How long do withdrawals take?", answer: "Standard withdrawals are processed within 24–48 hours. VIP members enjoy faster processing, with Gold+ members receiving priority handling. First-time withdrawals require KYC verification." },
  { id: 2, category: "account",  question: "How do I verify my account?",  answer: "Go to Profile → Account Info and upload a valid government-issued ID (Aadhaar, PAN, Passport) and a bank statement or utility bill for address verification. Verification is typically completed within 2–4 hours." },
  { id: 3, category: "payments", question: "What deposit methods are available?", answer: "We accept UPI (GPay, PhonePe, Paytm), IMPS/NEFT bank transfers, and cryptocurrency (USDT, BTC, ETH). Minimum deposit is ₹100 for fiat and $5 for crypto." },
  { id: 4, category: "casino",   question: "A game is not loading. What should I do?", answer: "Try clearing your browser cache, disabling extensions, or using a different browser. Ensure you have a stable internet connection. If the issue persists, contact support with the game name and your device details." },
  { id: 5, category: "sports",   question: "My bet was voided. Why?", answer: "Bets may be voided due to: incorrect odds displayed due to a technical error, match abandonment/postponement, violation of betting rules, or suspected irregular betting patterns." },
  { id: 6, category: "account",  question: "How do I set deposit limits?", answer: "Go to Settings → Responsible Gaming. You can set daily, weekly, or monthly deposit limits. Changes to increase limits take 24 hours to apply, while decreases are effective immediately." },
  { id: 7, category: "bonuses",  question: "What are wagering requirements?", answer: "Wagering requirements specify how many times you must bet the bonus amount before you can withdraw. For example, 8x wagering on a ₹1,000 bonus means you must place ₹8,000 in bets." },
  { id: 8, category: "account",  question: "How do I close my account?", answer: "Contact our support team via Telegram or email. We'll process within 24 hours. Any remaining balance will be withdrawn to your verified payment method." },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function highlight(text: string, q: string) {
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="bg-[var(--gold-soft)] text-[var(--gold-bright)] rounded-[3px] px-0.5">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function getYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^&?\s]+)/);
  return m?.[1] || null;
}

// ── FAQ media renderer ────────────────────────────────────────────────────
function FaqMedia({ media }: { media: FaqMediaItem[] }) {
  if (!media?.length) return null;
  return (
    <div className="mt-3 space-y-3">
      {media.map((item, i) => {
        if (item.type === "image") {
          return (
            <div key={i} className="rounded-[12px] overflow-hidden border border-[var(--line-default)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.caption || ""} className="w-full max-h-72 object-cover" loading="lazy" />
              {item.caption && <p className="text-[11px] text-[var(--ink-faint)] px-3 py-2 bg-[var(--bg-inlay)]">{item.caption}</p>}
            </div>
          );
        }
        if (item.type === "youtube") {
          const ytId = getYoutubeId(item.url);
          return ytId ? (
            <div key={i} className="rounded-[12px] overflow-hidden border border-[var(--line-default)]">
              <div className="aspect-video">
                <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
              </div>
              {item.caption && <p className="text-[11px] text-[var(--ink-faint)] px-3 py-2 bg-[var(--bg-inlay)]">{item.caption}</p>}
            </div>
          ) : null;
        }
        if (item.type === "video") {
          return (
            <div key={i} className="rounded-[12px] overflow-hidden border border-[var(--line-default)]">
              <video src={item.url} controls className="w-full max-h-72" preload="metadata" />
              {item.caption && <p className="text-[11px] text-[var(--ink-faint)] px-3 py-2 bg-[var(--bg-inlay)]">{item.caption}</p>}
            </div>
          );
        }
        return (
          <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[12px] text-[13px] hover:border-[var(--line-gold)] transition-colors group">
            <div className="p-2 rounded-[8px] bg-[var(--gold-soft)] text-[var(--gold-bright)]">
              <Link2 size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--ink)] font-medium truncate">{item.caption || item.url}</p>
              {item.caption && <p className="text-[var(--ink-whisper)] text-[11px] truncate">{item.url}</p>}
            </div>
            <ExternalLink size={13} className="text-[var(--ink-faint)] flex-shrink-0" />
          </a>
        );
      })}
    </div>
  );
}

// ── Single FAQ accordion item ─────────────────────────────────────────────
function FaqItem({ faq, searchQuery }: { faq: FaqEntry; searchQuery: string }) {
  const [open, setOpen] = useState(!!searchQuery);
  useEffect(() => { if (searchQuery) setOpen(true); }, [searchQuery]);
  return (
    <div className={`border rounded-[14px] overflow-hidden transition-all ${open ? "bg-[var(--bg-elevated)] border-[var(--line-gold)]" : "bg-[var(--bg-surface)] border-[var(--line-default)] hover:border-[var(--line-strong)]"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="text-[var(--ink)] font-semibold text-[13.5px] leading-snug">{highlight(faq.question, searchQuery)}</span>
        <ChevronDown size={16} className={`text-[var(--ink-faint)] flex-shrink-0 transition-transform ${open ? "rotate-180 text-[var(--gold-bright)]" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-[var(--line-default)] pt-3">
          <div className="text-[var(--ink-dim)] text-[12.5px] leading-relaxed whitespace-pre-wrap">{highlight(faq.answer, searchQuery)}</div>
          {faq.media && faq.media.length > 0 && <FaqMedia media={faq.media} />}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function SupportPage() {
  const { isAuthenticated } = useAuth();

  // Contacts
  const [contacts, setContacts] = useState<ContactSettings | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Tickets
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  // FAQs
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [faqLoading, setFaqLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [faqTab, setFaqTab] = useState<string>("all");
  const searchRef = useRef<HTMLDivElement>(null);

  // Load contact settings
  useEffect(() => {
    api.get("/contact-settings")
      .then((res) => setContacts(res.data))
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, []);

  // Load my tickets if auth
  useEffect(() => {
    if (isAuthenticated) {
      supportApi.getMyTickets().then(setTickets).catch(() => {});
    }
  }, [isAuthenticated]);

  // Load FAQs
  useEffect(() => {
    supportApi.getFaqs()
      .then((res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        setFaqs(data.length > 0 ? data : FALLBACK_FAQS);
      })
      .catch(() => setFaqs(FALLBACK_FAQS))
      .finally(() => setFaqLoading(false));
  }, []);

  // Outside-click for search dropdown
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) return toast.error("Enter a subject");
    setCreatingTicket(true);
    try {
      const newTicket = await supportApi.createTicket({
        subject: ticketSubject.trim(),
        category: ticketCategory.trim() || undefined,
        message: ticketMessage.trim() || undefined,
      });
      setTickets((prev) => [newTicket, ...prev]);
      setTicketSubject("");
      setTicketCategory("");
      setTicketMessage("");
      setShowTicketForm(false);
      toast.success("Support ticket created!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  const searchResults = search.trim()
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(search.toLowerCase()) ||
          f.answer.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const faqCategories = Array.from(new Set(faqs.map((f) => f.category)));
  const filteredFaqs = faqTab === "all" ? faqs : faqs.filter((f) => f.category === faqTab);
  const groupedFaqs = faqCategories
    .filter((cat) => faqTab === "all" || cat === faqTab)
    .map((cat) => ({
      category: cat,
      meta: CATEGORY_META[cat] || CATEGORY_META.general,
      items: filteredFaqs.filter((f) => f.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  // ── Contact channel cards data (render-only; brand color on icon chip only) ──
  const channels: Array<{
    key: string;
    icon: React.ReactNode;
    iconTint: string;
    iconBg: string;
    iconBorder: string;
    name: string;
    desc: string;
    badge?: string;
    badgeChip?: string;
    href: string;
  }> = [];
  if (contacts?.whatsappEnabled && contacts.whatsappNumber) {
    const waMsg = encodeURIComponent(contacts.whatsappDefaultMessage || "Hi, I need help.");
    channels.push({
      key: "wa",
      icon: <SiWhatsapp size={20} />,
      iconTint: "var(--emerald)",
      iconBg: "var(--emerald-soft)",
      iconBorder: "rgba(0, 216, 123, 0.25)",
      name: contacts.whatsappLabel || "WhatsApp",
      desc: "Chat instantly · 10 AM – 10 PM IST",
      badge: "Online",
      badgeChip: "chip-emerald",
      href: `https://wa.me/${contacts.whatsappNumber.replace(/\D/g, "")}?text=${waMsg}`,
    });
  }
  if (contacts?.telegramEnabled && (contacts.telegramLink || contacts.telegramHandle)) {
    channels.push({
      key: "tg",
      icon: <SiTelegram size={20} />,
      iconTint: "var(--ice)",
      iconBg: "var(--ice-soft)",
      iconBorder: "rgba(100, 211, 255, 0.25)",
      name: "Telegram",
      desc: contacts.telegramHandle || "Fastest response · 24/7",
      badge: "Fast",
      badgeChip: "chip-ice",
      href: contacts.telegramLink || `https://t.me/${contacts.telegramHandle?.replace("@", "")}`,
    });
  }
  if (contacts?.emailEnabled && contacts.emailAddress) {
    channels.push({
      key: "em",
      icon: <Mail size={20} />,
      iconTint: "var(--violet)",
      iconBg: "var(--violet-soft)",
      iconBorder: "rgba(139, 92, 255, 0.25)",
      name: "Email Support",
      desc: contacts.emailAddress,
      badge: "< 24h",
      badgeChip: "chip-violet",
      href: `mailto:${contacts.emailAddress}`,
    });
  }

  // Quick topic cards — always shown for richness
  const topicCards = [
    { key: "deposit",  icon: <CreditCard size={18} />, label: "Deposits",    desc: "UPI, bank, crypto methods" },
    { key: "withdraw", icon: <CreditCard size={18} />, label: "Withdrawals", desc: "Processing times & KYC" },
    { key: "account",  icon: <UserCheck size={18} />,  label: "Account",     desc: "Verify, secure, close" },
    { key: "betting",  icon: <Globe size={18} />,      label: "Betting",     desc: "Rules, voids, settlement" },
    { key: "casino",   icon: <Gamepad2 size={18} />,   label: "Casino",      desc: "Game loading, RTP, bonuses" },
    { key: "bonuses",  icon: <BookOpen size={18} />,   label: "Bonuses",     desc: "Wagering & promotions" },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] pb-24">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="page-x pt-10 pb-10 relative overflow-hidden">
        <div className="max-w-[1680px] mx-auto">
          <div className="relative rounded-[22px] border border-[var(--line-gold)] bg-gold-soft dotgrid grain overflow-hidden p-8 md:p-12 text-center">
            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="chip chip-gold mb-5 inline-flex">
                <Headphones size={12} /> 24/7 Support
              </span>
              <h1 className="t-display text-[40px] md:text-[56px] mb-3">
                How can we <span className="text-gold-grad">help you?</span>
              </h1>
              <p className="text-[var(--ink-dim)] text-[14px] mb-8 max-w-xl mx-auto">
                Browse FAQs, open a support ticket, or reach us via WhatsApp, Telegram, or email.
              </p>

              {/* Search with inline dropdown */}
              <div ref={searchRef} className="relative max-w-lg mx-auto">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] z-10" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
                  onFocus={() => { if (search) setSearchOpen(true); }}
                  placeholder="Search FAQs…"
                  className="w-full h-12 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[14px] pl-11 pr-10 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:border-[var(--line-gold)] focus:outline-none transition-colors shadow-[var(--shadow-soft)]"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setSearchOpen(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors z-10"
                  >
                    <X size={15} />
                  </button>
                )}

                {searchOpen && search.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-surface)] border border-[var(--line-default)] rounded-[14px] shadow-[var(--shadow-lift)] z-50 overflow-hidden max-h-[420px] overflow-y-auto text-left">
                    {searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-[var(--ink-faint)] text-[13px]">
                        <HelpCircle size={26} className="mb-2 opacity-30" />
                        No results for <span className="text-[var(--ink)]">&ldquo;{search}&rdquo;</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line-default)]">
                          <span className="t-eyebrow">
                            <span className="num">{searchResults.length}</span> {searchResults.length !== 1 ? "results" : "result"}
                          </span>
                          <button onClick={() => setSearchOpen(false)} className="text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"><X size={13} /></button>
                        </div>
                        {searchResults.map((faq, idx) => {
                          const meta = CATEGORY_META[faq.category] || CATEGORY_META.general;
                          const Icon = meta.icon;
                          return (
                            <div
                              key={faq._id || faq.id || idx}
                              className={`px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors ${idx < searchResults.length - 1 ? "border-b border-[var(--line-default)]" : ""}`}
                            >
                              <div className="inline-flex items-center gap-1.5 mb-1.5">
                                <span className={`chip ${meta.chip} !py-0.5 !px-2`}><Icon size={9} /> {meta.label}</span>
                              </div>
                              <p className="text-[var(--ink)] text-[13px] font-semibold leading-snug">{highlight(faq.question, search)}</p>
                              <p className="text-[var(--ink-dim)] text-[12px] mt-1 leading-relaxed line-clamp-2">{highlight(faq.answer, search)}</p>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Stats strip */}
              <div className="flex items-center justify-center gap-6 md:gap-10 mt-8 flex-wrap">
                {[
                  { icon: Clock,        label: "Avg. Response",   val: "2 min" },
                  { icon: CheckCircle,  label: "Issues Resolved", val: "98.5%" },
                  { icon: Shield,       label: "Uptime",          val: "99.9%" },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon size={14} className="text-[var(--gold-bright)]" />
                    <div className="text-left">
                      <p className="num text-[var(--ink)] font-semibold text-[14px] leading-none">{val}</p>
                      <p className="text-[var(--ink-whisper)] text-[10px] mt-1">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1680px] mx-auto space-y-10 md:space-y-12">
        {/* ── Contact channels ─────────────────────────────────────────────── */}
        <section className="page-x">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">Reach us</span>
            <h2 className="t-section mt-1">Contact channels</h2>
            <p className="t-section-sub">Pick the fastest path to an answer.</p>
          </div>

          {loadingContacts ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[var(--ink-whisper)]" />
            </div>
          ) : channels.length > 0 ? (
            <div className={`grid grid-cols-1 ${channels.length >= 3 ? "md:grid-cols-3" : channels.length === 2 ? "md:grid-cols-2" : ""} gap-4 stagger`}>
              {channels.map((c) => (
                <a
                  key={c.key}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col gap-4 p-5 rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] hover:border-[var(--line-gold)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] transition-all sweep overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="grid place-items-center w-11 h-11 rounded-[12px] border"
                      style={{ color: c.iconTint, background: c.iconBg, borderColor: c.iconBorder }}
                    >
                      {c.icon}
                    </div>
                    {c.badge && <span className={`chip ${c.badgeChip}`}>{c.badge}</span>}
                  </div>
                  <div>
                    <p className="text-[var(--ink)] font-semibold text-[15px]">{c.name}</p>
                    <p className="text-[var(--ink-dim)] text-[12.5px] mt-0.5">{c.desc}</p>
                  </div>
                  <span className="chip chip-gold !w-full !justify-center !py-2">
                    <ExternalLink size={12} /> Open
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-6 text-center">
              <p className="text-[13px] text-[var(--ink-faint)]">Contact information is being updated. Please check back soon.</p>
            </div>
          )}
        </section>

        {/* ── Popular topics ────────────────────────────────────────────── */}
        <section className="page-x">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">Popular topics</span>
            <h2 className="t-section mt-1">Browse by category</h2>
            <p className="t-section-sub">Jump straight into the section you need.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger">
            {topicCards.map((t) => (
              <button
                key={t.key}
                onClick={() => { setFaqTab(t.key); document.getElementById("faq-anchor")?.scrollIntoView({ behavior: "smooth" }); }}
                className="relative dotgrid group text-left rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 hover:border-[var(--line-gold)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] transition-all overflow-hidden"
              >
                <div className="grid place-items-center w-9 h-9 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--line-gold)] text-[var(--gold-bright)] mb-3">
                  {t.icon}
                </div>
                <p className="text-[var(--ink)] text-[13px] font-semibold">{t.label}</p>
                <p className="text-[var(--ink-whisper)] text-[11px] mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Your tickets (auth) ───────────────────────────────────────── */}
        {isAuthenticated && (
          <section className="page-x">
            <div className="flex items-end justify-between mb-4">
              <div className="rail-gold">
                <span className="t-eyebrow">Your support</span>
                <h2 className="t-section mt-1">Support tickets</h2>
                <p className="t-section-sub">Open a ticket and track responses.</p>
              </div>
              <button
                onClick={() => setShowTicketForm(!showTicketForm)}
                className="btn btn-gold sweep h-9 uppercase tracking-[0.06em] text-[11px]"
              >
                <Plus size={12} /> New ticket
              </button>
            </div>

            {showTicketForm && (
              <form
                onSubmit={handleCreateTicket}
                className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 mb-4 space-y-4"
              >
                <label className="block">
                  <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Category</span>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full h-11 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] px-3.5 text-[13.5px] text-[var(--ink)] focus:border-[var(--line-gold)] focus:outline-none transition-colors appearance-none"
                  >
                    <option value="">General</option>
                    <option value="account">Account & Verification</option>
                    <option value="deposit">Deposits</option>
                    <option value="withdraw">Withdrawals</option>
                    <option value="bonuses">Bonuses & Promotions</option>
                    <option value="sports">Sports Betting</option>
                    <option value="casino">Casino</option>
                    <option value="technical">Technical Issue</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Subject</span>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    autoFocus
                    className="w-full h-11 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] px-3.5 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:border-[var(--line-gold)] focus:outline-none transition-colors"
                  />
                </label>

                <label className="block">
                  <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Message</span>
                  <textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Describe your issue in detail…"
                    rows={4}
                    className="w-full bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] px-3.5 py-3 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:border-[var(--line-gold)] focus:outline-none transition-colors resize-none"
                  />
                </label>

                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setShowTicketForm(false)} className="btn btn-ghost h-9">
                    Cancel
                  </button>
                  <button type="submit" disabled={creatingTicket || !ticketSubject.trim()}
                    className="btn btn-gold sweep h-9 uppercase tracking-[0.06em] text-[11px] disabled:opacity-40">
                    {creatingTicket ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Submit
                  </button>
                </div>
              </form>
            )}

            {tickets.length > 0 ? (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] px-5 py-3 hover:border-[var(--line-gold)] transition-colors">
                    <div className="min-w-0">
                      <p className="text-[var(--ink)] text-[13.5px] font-semibold truncate">{t.subject}</p>
                      <p className="text-[var(--ink-whisper)] text-[10.5px] mt-0.5">
                        <span className="num">#{t.id}</span> · <span className="num">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                    <span className={`chip ${t.status === "OPEN" ? "chip-emerald" : "chip"}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : !showTicketForm ? (
              <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-6 text-center">
                <Ticket size={24} className="mx-auto text-[var(--ink-whisper)] mb-2" />
                <p className="text-[13px] text-[var(--ink-faint)]">No tickets yet. Create one if you need help.</p>
              </div>
            ) : null}
          </section>
        )}

        {/* ── Operating hours banner ───────────────────────────────────── */}
        <section className="page-x">
          <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 flex items-center gap-4">
            <div className="grid place-items-center w-11 h-11 rounded-[12px] bg-[var(--gold-soft)] border border-[var(--line-gold)] text-[var(--gold-bright)] flex-shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-[var(--ink)] font-semibold text-[14px]">Support hours</h3>
              <p className="text-[12px] text-[var(--ink-dim)] mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                {contacts?.telegramEnabled && <span><span className="text-[var(--ice)] font-semibold">Telegram</span> · 24/7</span>}
                {contacts?.emailEnabled    && <span><span className="text-[var(--violet)] font-semibold">Email</span> · <span className="num">24h</span> reply</span>}
                {contacts?.whatsappEnabled && <span><span className="text-[var(--emerald)] font-semibold">WhatsApp</span> · <span className="num">10 AM – 10 PM</span> IST</span>}
                {!contacts?.telegramEnabled && !contacts?.emailEnabled && !contacts?.whatsappEnabled && (
                  <span>Our team responds around the clock. Pick a channel above.</span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="page-x" id="faq-anchor">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">Frequently asked</span>
            <h2 className="t-section mt-1">FAQ</h2>
            <p className="t-section-sub">Quick answers to the most common questions.</p>
          </div>

          {faqCategories.length > 1 && (
            <div className="flex gap-2 flex-wrap mb-6 no-scrollbar">
              <button
                onClick={() => setFaqTab("all")}
                className={`chip ${faqTab === "all" ? "chip-gold" : ""} cursor-pointer`}
              >
                All
              </button>
              {faqCategories.map((cat) => {
                const meta = CATEGORY_META[cat] || CATEGORY_META.general;
                return (
                  <button
                    key={cat}
                    onClick={() => setFaqTab(cat)}
                    className={`chip ${faqTab === cat ? "chip-gold" : ""} cursor-pointer`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          )}

          {faqLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-[var(--gold-bright)]" />
            </div>
          ) : groupedFaqs.length === 0 ? (
            <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] py-14 text-center text-[var(--ink-faint)]">
              <HelpCircle size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-[13px]">No FAQs available yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedFaqs.map((group) => {
                const Icon = group.meta.icon;
                return (
                  <div key={group.category}>
                    <div className="inline-flex items-center gap-2 mb-3">
                      <span className={`chip ${group.meta.chip}`}>
                        <Icon size={10} /> {group.meta.label}
                      </span>
                      <span className="text-[var(--ink-whisper)] text-[11px] num">{group.items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((faq, i) => (
                        <FaqItem key={faq._id || faq.id || i} faq={faq} searchQuery={search} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Help footer ───────────────────────────────────────────────── */}
        <section className="page-x">
          <div className="rounded-[18px] border border-[var(--line-gold)] bg-gold-soft p-6 grain overflow-hidden relative flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative z-10">
              <p className="text-[var(--ink)] font-semibold text-[16px]">Still need help?</p>
              <p className="text-[var(--ink-dim)] text-[13px] mt-1">
                See our <Link href="/legal/rules" className="text-[var(--gold-bright)] hover:underline">Rules</Link>,{" "}
                <Link href="/legal/terms" className="text-[var(--gold-bright)] hover:underline">Terms</Link>, or{" "}
                <Link href="/fairness" className="text-[var(--gold-bright)] hover:underline">Fairness</Link> pages.
              </p>
            </div>
            {!isAuthenticated && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("openLogin"))}
                className="btn btn-gold sweep h-10 uppercase tracking-[0.06em] text-[11px] relative z-10"
              >
                <Lock size={12} /> Log in to open a ticket
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
