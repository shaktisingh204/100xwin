"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield, CheckCircle, Lock, BarChart2, RefreshCw, ExternalLink,
  Hash, Server, Cpu, Eye, Search, Copy, Check, Sparkles, Award,
} from "lucide-react";

// ── Trust / feature sections (rich editorial like newwebsite) ─────────────
const SECTIONS: Array<{
  icon: React.ComponentType<{ size: number }>;
  tone: string;
  toneBg: string;
  toneBorder: string;
  eyebrow: string;
  title: string;
  body: string[];
}> = [
  {
    icon: Shield,
    tone: "var(--gold-bright)",
    toneBg: "var(--gold-soft)",
    toneBorder: "var(--line-gold)",
    eyebrow: "Provably Fair",
    title: "Provably Fair System",
    body: [
      "Odd69 uses a cryptographically provably fair system for every original casino game. Every round outcome is determined by a verifiable algorithm rather than a centralized server decision.",
      "Before each round, the server generates a secret seed and commits to it by publishing its SHA-256 hash to you in advance. After the round, the original seed is revealed so you can independently verify the outcome using our open-source verification tool.",
      "This means neither player nor house can predict or manipulate any game in advance — the math proves it.",
    ],
  },
  {
    icon: RefreshCw,
    tone: "var(--emerald)",
    toneBg: "var(--emerald-soft)",
    toneBorder: "rgba(0, 216, 123, 0.25)",
    eyebrow: "RNG",
    title: "Certified Random Number Generator",
    body: [
      "All games powered by Odd69's original engine use a certified RNG that produces statistically random outcomes. Our RNG is audited periodically by an independent third-party testing laboratory.",
      "The RNG meets international standards including ISO/IEC 17025 and complies with requirements set by leading iGaming regulatory authorities.",
      "Third-party game providers integrated on our platform must deliver their own RNG certifications, which are reviewed by our compliance team before go-live.",
    ],
  },
  {
    icon: BarChart2,
    tone: "var(--violet)",
    toneBg: "var(--violet-soft)",
    toneBorder: "rgba(139, 92, 255, 0.25)",
    eyebrow: "RTP",
    title: "Return to Player",
    body: [
      "Each game on Odd69 has a published Return to Player percentage. This indicates the theoretical average payout over a statistically significant number of rounds.",
      "A game with a 96% RTP returns ₹96 for every ₹100 wagered on average over time. RTP is a long-term statistical measure — not a guarantee for any individual session.",
      "RTP values are verified by independent auditors and are displayed on each game's information panel.",
    ],
  },
  {
    icon: Lock,
    tone: "var(--ice)",
    toneBg: "var(--ice-soft)",
    toneBorder: "rgba(100, 211, 255, 0.25)",
    eyebrow: "Security",
    title: "Data Security & Encryption",
    body: [
      "All data transmitted between your device and Odd69 is protected using TLS 1.3 encryption, the industry standard for secure transport.",
      "Player funds and sensitive data are stored in isolated, encrypted environments. We perform regular security audits and penetration testing to guard against vulnerabilities.",
      "Odd69 will never share your personal data with third parties without your explicit consent, except where required by law. See our Privacy Policy for full details.",
    ],
  },
  {
    icon: CheckCircle,
    tone: "var(--gold-bright)",
    toneBg: "var(--gold-soft)",
    toneBorder: "var(--line-gold)",
    eyebrow: "Compliance",
    title: "Independent Audits & Compliance",
    body: [
      "Odd69 undergoes regular audits by independent testing agencies to verify fairness, security, and regulatory compliance. Audit certificates are available on request through our support team.",
      "Our compliance team continuously monitors for responsible gaming concerns and fraud. Any player found attempting to manipulate game outcomes will have their account suspended.",
      "Sports bet settlements are sourced from licensed real-time data providers, with manual review applied to disputed markets.",
    ],
  },
];

// ── Verification steps ───────────────────────────────────────────────────
const STEPS = [
  { num: "01", title: "Place your bet",      desc: "A hashed server seed is committed to you before the round begins." },
  { num: "02", title: "Play the round",      desc: "Outcome is determined from server seed, client seed, and nonce." },
  { num: "03", title: "Reveal the seed",     desc: "After the round, the original server seed is disclosed to you." },
  { num: "04", title: "Verify independently", desc: "Hash the revealed seed with SHA-256 and confirm it matches the commit." },
];

// ── Trust badges ─────────────────────────────────────────────────────────
const BADGES = [
  { label: "Provably Fair",   icon: Hash,   chip: "chip-emerald" },
  { label: "TLS 1.3 Secure",  icon: Lock,   chip: "chip-ice" },
  { label: "SHA-256 Verified", icon: Shield, chip: "chip-emerald" },
  { label: "Audited RNG",     icon: Cpu,    chip: "chip-violet" },
  { label: "Licensed Operator", icon: Award, chip: "chip-gold" },
];

export default function FairnessPage() {
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState("");
  const [result, setResult] = useState<null | { hash: string; match: boolean | null }>(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverSeed.trim()) return;
    setVerifying(true);
    try {
      // SHA-256 in-browser — no network required
      const data = new TextEncoder().encode(`${serverSeed.trim()}:${clientSeed.trim()}:${nonce.trim() || "0"}`);
      const buf = await crypto.subtle.digest("SHA-256", data);
      const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      setResult({ hash, match: null });
    } catch {
      setResult({ hash: "", match: false });
    } finally {
      setVerifying(false);
    }
  };

  const copyHash = async () => {
    if (!result?.hash) return;
    try {
      await navigator.clipboard.writeText(result.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="min-h-[calc(100vh-64px)] pb-24">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="page-x pt-10 pb-10 relative overflow-hidden">
        <div className="max-w-[1680px] mx-auto">
          <div className="relative rounded-[22px] border border-[var(--line-gold)] bg-gold-soft dotgrid grain overflow-hidden p-8 md:p-14 text-center">
            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="chip chip-emerald mb-5 inline-flex">
                <Shield size={12} /> Provably fair
              </span>
              <h1 className="t-display text-[40px] md:text-[60px] mb-3">
                Fairness & <span className="text-gold-grad">transparency</span>
              </h1>
              <p className="text-[var(--ink-dim)] text-[14px] md:text-[15px] max-w-xl mx-auto">
                Odd69 is committed to a fair, transparent, and secure gaming floor. Here&rsquo;s how we guarantee
                integrity across every round, every market, and every transaction.
              </p>

              <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
                {BADGES.map(({ label, icon: Icon, chip }) => (
                  <span key={label} className={`chip ${chip}`}>
                    <Icon size={10} /> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1680px] mx-auto space-y-10 md:space-y-12">
        {/* ── Commitment banner ──────────────────────────────────────── */}
        <section className="page-x">
          <div className="rounded-[18px] border border-[var(--line-gold)] bg-gold-soft overflow-hidden relative grain p-6 md:p-8">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5">
              <div className="grid place-items-center w-14 h-14 rounded-[14px] bg-[var(--gold-soft)] border border-[var(--line-gold)] text-[var(--gold-bright)] flex-shrink-0">
                <Sparkles size={24} />
              </div>
              <div>
                <span className="t-eyebrow">Our commitment</span>
                <h2 className="t-section mt-1">Trust, proven — not promised</h2>
                <p className="text-[var(--ink-dim)] text-[13.5px] leading-relaxed mt-2 max-w-3xl">
                  Fairness isn&rsquo;t a marketing line. Every original casino game uses cryptographically secure algorithms
                  that are mathematically verifiable by you, without trusting the house. Sports markets settle against
                  licensed, tamper-proof data feeds.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How verification works ─────────────────────────────────── */}
        <section className="page-x">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">How it works</span>
            <h2 className="t-section mt-1">Verification in four steps</h2>
            <p className="t-section-sub">You don&rsquo;t need our word. You have the math.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            {STEPS.map((s) => (
              <div key={s.num} className="relative rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 hover:border-[var(--line-gold)] transition-colors overflow-hidden">
                <span
                  className="num absolute top-3 right-4 text-[42px] font-bold text-[var(--ink-ghost)] select-none"
                  aria-hidden
                >
                  {s.num}
                </span>
                <div className="grid place-items-center w-9 h-9 rounded-[10px] bg-[var(--gold-soft)] border border-[var(--line-gold)] text-[var(--gold-bright)] mb-3">
                  <span className="num text-[11px] font-bold">{s.num}</span>
                </div>
                <h4 className="text-[var(--ink)] font-semibold text-[13.5px] mb-1">{s.title}</h4>
                <p className="text-[var(--ink-dim)] text-[12px] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Verify a bet (in-browser SHA-256) ──────────────────────── */}
        <section className="page-x">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">Do it yourself</span>
            <h2 className="t-section mt-1">Verify a bet</h2>
            <p className="t-section-sub">Paste your seeds and nonce. We hash in your browser — nothing leaves your device.</p>
          </div>

          <div className="rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-5 md:p-6 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
            <form onSubmit={handleVerify} className="space-y-4">
              <label className="block">
                <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Server seed (revealed)</span>
                <div className="relative">
                  <Server size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" />
                  <input
                    type="text"
                    value={serverSeed}
                    onChange={(e) => setServerSeed(e.target.value)}
                    placeholder="e.g. 7d3f…c9a1"
                    className="w-full h-11 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] pl-9 pr-3.5 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:border-[var(--line-gold)] focus:outline-none transition-colors font-mono"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Client seed</span>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" />
                  <input
                    type="text"
                    value={clientSeed}
                    onChange={(e) => setClientSeed(e.target.value)}
                    placeholder="your client seed"
                    className="w-full h-11 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] pl-9 pr-3.5 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:border-[var(--line-gold)] focus:outline-none transition-colors font-mono"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">Nonce</span>
                <div className="relative">
                  <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nonce}
                    onChange={(e) => setNonce(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="w-full h-11 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] pl-9 pr-3.5 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:border-[var(--line-gold)] focus:outline-none transition-colors num"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={!serverSeed.trim() || verifying}
                className="btn btn-gold sweep h-11 w-full uppercase tracking-[0.06em] text-[12px] disabled:opacity-40"
              >
                {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} Compute SHA-256
              </button>
            </form>

            <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-inlay)] p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="chip chip-emerald"><Hash size={10} /> Hash</span>
                {result && (
                  <button onClick={copyHash} className="chip chip-gold cursor-pointer ml-auto">
                    {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              {result?.hash ? (
                <div className="rounded-[10px] bg-[var(--bg-base)] border border-[var(--line-default)] p-3 flex-1">
                  <p className="num text-[11.5px] text-[var(--emerald)] break-all leading-relaxed">{result.hash}</p>
                </div>
              ) : (
                <div className="rounded-[10px] bg-[var(--bg-base)] border border-[var(--line-default)] p-4 flex-1 grid place-items-center">
                  <div className="text-center">
                    <Eye size={22} className="mx-auto text-[var(--ink-whisper)] mb-2" />
                    <p className="text-[12px] text-[var(--ink-faint)]">Compute a hash to verify it matches the commit shown before your bet.</p>
                  </div>
                </div>
              )}
              <p className="text-[10.5px] text-[var(--ink-whisper)] mt-3 leading-relaxed">
                Hash format: <span className="num">sha256(serverSeed:clientSeed:nonce)</span>. Verification runs
                locally via <span className="num">crypto.subtle</span>.
              </p>
            </div>
          </div>
        </section>

        {/* ── Editorial trust sections ──────────────────────────────── */}
        <section className="page-x">
          <div className="mb-4 rail-gold">
            <span className="t-eyebrow">Pillars</span>
            <h2 className="t-section mt-1">The integrity stack</h2>
            <p className="t-section-sub">Five layers of verifiable trust.</p>
          </div>

          <div className="space-y-4">
            {SECTIONS.map(({ icon: Icon, tone, toneBg, toneBorder, eyebrow, title, body }) => (
              <article
                key={title}
                className="rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden hover:border-[var(--line-gold)] transition-colors"
              >
                <div className="px-6 py-4 border-b border-[var(--line-default)] flex items-center gap-3">
                  <div
                    className="grid place-items-center w-11 h-11 rounded-[12px] border"
                    style={{ color: tone, background: toneBg, borderColor: toneBorder }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <span className="t-eyebrow">{eyebrow}</span>
                    <h3 className="t-section mt-0.5 !text-[17px]">{title}</h3>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-3">
                  {body.map((p, i) => (
                    <p key={i} className="text-[var(--ink-dim)] text-[13px] leading-relaxed">{p}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Sports integrity ─────────────────────────────────────── */}
        <section className="page-x">
          <div className="rounded-[18px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-6 flex items-start gap-4">
            <div className="grid place-items-center w-11 h-11 rounded-[12px] bg-[var(--gold-soft)] border border-[var(--line-gold)] text-[var(--gold-bright)] flex-shrink-0">
              <BarChart2 size={18} />
            </div>
            <div>
              <span className="t-eyebrow">Sports</span>
              <h3 className="t-section mt-1 !text-[16px]">Sports betting integrity</h3>
              <p className="text-[var(--ink-dim)] text-[13px] leading-relaxed mt-2">
                Sports results are settled from official licensed data feeds with redundancy across providers. Odds
                are modelled with industry-standard margin logic and monitored continuously. Disputed markets are
                reviewed by a human settlement team and any corrections are logged on your bet slip.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="page-x">
          <div className="rounded-[18px] border border-[var(--line-gold)] bg-gold-soft p-6 grain relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative z-10">
              <p className="text-[var(--ink)] font-semibold text-[16px]">Have a fairness concern?</p>
              <p className="text-[var(--ink-dim)] text-[13px] mt-1">
                Our compliance team reviews every report about game integrity.
              </p>
            </div>
            <Link
              href="/support"
              className="btn btn-gold sweep h-11 uppercase tracking-[0.06em] text-[12px] relative z-10"
            >
              <ExternalLink size={13} /> Contact support
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
