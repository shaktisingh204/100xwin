"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Headphones, MessageCircle, Mail, Phone, Clock, ChevronDown, ChevronUp, Shield, AlertTriangle, CreditCard, Gamepad2, UserCheck, HelpCircle, ExternalLink, Loader2, Send, Plus } from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { supportApi, type SupportTicket } from "@/services/support";
import toast from "react-hot-toast";

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

const faqItems = [
  { icon: <CreditCard size={15} />, q: "How long do withdrawals take?", a: "Standard withdrawals are processed within 24-48 hours. VIP members enjoy faster processing, with Gold+ members receiving priority handling. First-time withdrawals require KYC verification." },
  { icon: <Shield size={15} />, q: "How do I verify my account?", a: "Go to Profile → Account Info and upload a valid government-issued ID (Aadhaar, PAN, Passport) and a bank statement or utility bill for address verification. Verification is typically completed within 2-4 hours." },
  { icon: <CreditCard size={15} />, q: "What deposit methods are available?", a: "We accept UPI (GPay, PhonePe, Paytm), IMPS/NEFT bank transfers, and cryptocurrency (USDT, BTC, ETH). Minimum deposit is ₹100 for fiat and $5 for crypto." },
  { icon: <Gamepad2 size={15} />, q: "A game is not loading. What should I do?", a: "Try clearing your browser cache, disabling extensions, or using a different browser. Ensure you have a stable internet connection. If the issue persists, contact support with the game name and your device details." },
  { icon: <AlertTriangle size={15} />, q: "My bet was voided. Why?", a: "Bets may be voided due to: incorrect odds displayed due to a technical error, match abandonment/postponement, violation of betting rules, or suspected irregular betting patterns." },
  { icon: <UserCheck size={15} />, q: "How do I set deposit limits?", a: "Go to Settings → Responsible Gaming. You can set daily, weekly, or monthly deposit limits. Changes to increase limits take 24 hours to apply, while decreases are effective immediately." },
  { icon: <CreditCard size={15} />, q: "What are wagering requirements?", a: "Wagering requirements specify how many times you must bet the bonus amount before you can withdraw. For example, 8x wagering on a ₹1,000 bonus means you must place ₹8,000 in bets." },
  { icon: <HelpCircle size={15} />, q: "How do I close my account?", a: "Contact our support team via Telegram or email. We'll process within 24 hours. Any remaining balance will be withdrawn to your verified payment method." },
];

export default function SupportPage() {
  const { isAuthenticated } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contacts, setContacts] = useState<ContactSettings | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Support ticket creation
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Fetch contact settings from backend
  useEffect(() => {
    api.get("/contact-settings")
      .then(res => setContacts(res.data))
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, []);

  // Fetch existing tickets if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      supportApi.getMyTickets().then(setTickets).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) return toast.error("Enter a subject");
    setCreatingTicket(true);
    try {
      const newTicket = await supportApi.createTicket({
        subject: ticketSubject.trim(),
        message: ticketMessage.trim() || undefined,
      });
      setTickets(prev => [newTicket, ...prev]);
      setTicketSubject("");
      setTicketMessage("");
      setShowTicketForm(false);
      toast.success("Support ticket created!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  // Build contact channels dynamically
  const contactChannels = [];
  if (contacts?.telegramEnabled && (contacts.telegramLink || contacts.telegramHandle)) {
    contactChannels.push({
      icon: <SiTelegram size={20} />,
      name: "Telegram",
      desc: "Fastest response. Available 24/7.",
      action: "Chat on Telegram",
      href: contacts.telegramLink || `https://t.me/${contacts.telegramHandle}`,
      color: "bg-[#29b6f6]/10 border-[#29b6f6]/20 text-[#29b6f6]",
      btnColor: "bg-[#29b6f6]/15 text-[#29b6f6] hover:bg-[#29b6f6]/25",
      badge: "Recommended",
    });
  }
  if (contacts?.emailEnabled && contacts.emailAddress) {
    contactChannels.push({
      icon: <Mail size={20} />,
      name: "Email",
      desc: "Response within 24 hours.",
      action: "Send Email",
      href: `mailto:${contacts.emailAddress}`,
      color: "bg-purple-500/10 border-purple-500/20 text-purple-400",
      btnColor: "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25",
    });
  }
  if (contacts?.whatsappEnabled && contacts.whatsappNumber) {
    const waMsg = encodeURIComponent(contacts.whatsappDefaultMessage || "Hi, I need help.");
    contactChannels.push({
      icon: <SiWhatsapp size={20} />,
      name: contacts.whatsappLabel || "WhatsApp",
      desc: "Available 10 AM – 10 PM IST.",
      action: "Chat on WhatsApp",
      href: `https://wa.me/${contacts.whatsappNumber.replace(/\D/g, "")}?text=${waMsg}`,
      color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      btnColor: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 pb-24">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
          <Headphones size={13} className="text-emerald-400" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Support</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">
          Help & <span className="text-emerald-400">Support</span>
        </h1>
        <p className="text-sm text-white/25 mt-2">We&apos;re here to help 24/7. Choose your preferred contact method below.</p>
      </div>

      {/* Contact channels — dynamic from backend */}
      {loadingContacts ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-white/20" /></div>
      ) : contactChannels.length > 0 ? (
        <div className={`grid grid-cols-1 ${contactChannels.length >= 3 ? "md:grid-cols-3" : contactChannels.length === 2 ? "md:grid-cols-2" : ""} gap-4 mb-12`}>
          {contactChannels.map((c, i) => (
            <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-5 relative hover:border-white/[0.08] transition-colors">
              {c.badge && (
                <div className="absolute -top-2 right-4 px-2.5 py-0.5 bg-emerald-500 rounded-full text-[9px] font-black text-white uppercase">
                  {c.badge}
                </div>
              )}
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${c.color}`}>{c.icon}</div>
              <h3 className="text-sm font-black text-white mb-1">{c.name}</h3>
              <p className="text-[11px] text-white/25 mb-4">{c.desc}</p>
              <a href={c.href} target="_blank" rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${c.btnColor}`}>
                {c.action} <ExternalLink size={11} />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-6 mb-12 text-center">
          <p className="text-sm text-white/25">Contact information is being updated. Please check back soon.</p>
        </div>
      )}

      {/* Support Tickets — auth only */}
      {isAuthenticated && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <MessageCircle size={16} className="text-[#f59e0b]" /> Your Support Tickets
            </h2>
            <button onClick={() => setShowTicketForm(!showTicketForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f59e0b]/15 text-[#f59e0b] text-xs font-bold rounded-lg hover:bg-[#f59e0b]/25 transition-colors">
              <Plus size={12} /> New Ticket
            </button>
          </div>

          {showTicketForm && (
            <form onSubmit={handleCreateTicket} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mb-4 space-y-3">
              <input type="text" placeholder="Subject (e.g., Withdrawal issue)" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors" autoFocus />
              <textarea placeholder="Describe your issue (optional)" value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} rows={3}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#f59e0b]/30 transition-colors resize-none" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowTicketForm(false)} className="px-4 py-2 text-xs text-white/30 hover:text-white/50 transition-colors">Cancel</button>
                <button type="submit" disabled={creatingTicket || !ticketSubject.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#f59e0b]/20 text-[#f59e0b] text-xs font-bold rounded-lg hover:bg-[#f59e0b]/30 transition-colors disabled:opacity-40">
                  {creatingTicket ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Submit
                </button>
              </div>
            </form>
          )}

          {tickets.length > 0 ? (
            <div className="space-y-2">
              {tickets.map(t => (
                <div key={t.id} className="bg-white/[0.015] border border-white/[0.04] rounded-xl px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{t.subject}</p>
                    <p className="text-[10px] text-white/20 mt-0.5">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${t.status === "OPEN" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.03] text-white/25"}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          ) : !showTicketForm && (
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 text-center">
              <p className="text-xs text-white/20">No tickets yet. Create one if you need help!</p>
            </div>
          )}
        </div>
      )}

      {/* Operating hours */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-10 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] flex-shrink-0">
          <Clock size={18} />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">Support Hours</h3>
          <p className="text-xs text-white/30 mt-0.5">
            {contacts?.telegramEnabled && <><span className="text-[#29b6f6] font-bold">Telegram</span> — 24/7 · </>}
            {contacts?.emailEnabled && <><span className="text-purple-400 font-bold">Email</span> — 24hr response · </>}
            {contacts?.whatsappEnabled && <><span className="text-emerald-400 font-bold">WhatsApp</span> — 10 AM – 10 PM IST</>}
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-8">
        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          <MessageCircle size={16} className="text-[#f59e0b]" /> Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {faqItems.map((f, i) => (
            <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/20 flex-shrink-0">{f.icon}</div>
                <span className="text-sm font-bold text-white flex-1">{f.q}</span>
                {openFaq === i ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 pl-[52px]">
                  <p className="text-xs text-white/30 leading-relaxed">{f.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 text-center">
        <p className="text-xs text-white/20">
          Looking for more? Check our{" "}
          <Link href="/legal/rules" className="text-[#f59e0b] hover:underline">Rules</Link>,{" "}
          <Link href="/legal/terms" className="text-[#f59e0b] hover:underline">Terms</Link>, or{" "}
          <Link href="/fairness" className="text-[#f59e0b] hover:underline">Fairness</Link> pages.
        </p>
      </div>
    </div>
  );
}
