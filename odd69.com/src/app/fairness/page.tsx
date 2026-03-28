import { Shield, Dice1, Hash, Server, Eye, RefreshCw, CheckCircle, Lock, Cpu, BarChart3 } from "lucide-react";

const features = [
  {
    icon: <Hash size={20} />,
    title: "Provably Fair Algorithm",
    desc: "Every game outcome is generated using a cryptographic hash function. You can verify each result using the server seed, client seed, and nonce.",
    color: "emerald",
  },
  {
    icon: <Server size={20} />,
    title: "Server Seed",
    desc: "A SHA-256 hashed server seed is shown before you bet. After the round, the unhashed seed is revealed so you can verify the outcome was predetermined.",
    color: "blue",
  },
  {
    icon: <Lock size={20} />,
    title: "Client Seed",
    desc: "You can set your own client seed to influence the result generation. This ensures we cannot predict or manipulate outcomes.",
    color: "purple",
  },
  {
    icon: <Cpu size={20} />,
    title: "Certified RNG",
    desc: "Our Random Number Generator is independently tested and certified by accredited testing laboratories to ensure true randomness.",
    color: "orange",
  },
];

const steps = [
  { num: "01", title: "Place Your Bet", desc: "A hashed server seed is committed before the round begins." },
  { num: "02", title: "Play the Game", desc: "The outcome is determined by combining server seed, client seed, and nonce." },
  { num: "03", title: "Verify the Result", desc: "After the round, the original server seed is revealed for verification." },
  { num: "04", title: "Independent Check", desc: "Use any SHA-256 tool to hash the revealed seed and confirm it matches." },
];

export default function FairnessPage() {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/8 border-emerald-500/15 text-emerald-400",
    blue: "bg-blue-500/8 border-blue-500/15 text-blue-400",
    purple: "bg-purple-500/8 border-purple-500/15 text-purple-400",
    orange: "bg-orange-500/8 border-orange-500/15 text-orange-400",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 pb-24">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
          <Shield size={13} className="text-emerald-400" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Provably Fair</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">Fairness & Transparency</h1>
        <p className="text-sm text-white/25 mt-2">How we ensure every game is fair and verifiable</p>
      </div>

      {/* Hero card */}
      <div className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-emerald-500/10 rounded-2xl p-6 md:p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white mb-2">Our Commitment</h2>
            <p className="text-sm text-white/35 leading-relaxed">
              At Odd69, fairness is not just a feature — it&apos;s a fundamental principle. Every casino game on our platform uses 
              cryptographically secure algorithms that are mathematically verifiable. You don&apos;t need to trust us; you can prove it yourself.
            </p>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {features.map((f, i) => (
          <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-5 hover:border-white/[0.08] transition-colors">
            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-3 ${colorMap[f.color]}`}>
              {f.icon}
            </div>
            <h3 className="text-sm font-black text-white mb-1.5">{f.title}</h3>
            <p className="text-xs text-white/25 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mb-10">
        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          <RefreshCw size={16} className="text-[#f59e0b]" /> How Verification Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((s, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 relative">
              <span className="text-3xl font-black text-white/[0.04] absolute top-3 right-3">{s.num}</span>
              <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] text-xs font-black mb-3">
                {s.num}
              </div>
              <h4 className="text-xs font-black text-white mb-1">{s.title}</h4>
              <p className="text-[11px] text-white/25 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sports fairness */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f59e0b]/8 border border-[#f59e0b]/15 flex items-center justify-center text-[#f59e0b] flex-shrink-0">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white mb-2">Sports Betting Integrity</h3>
            <p className="text-xs text-white/30 leading-relaxed">
              Sports bet results are settled based on official data feeds from licensed providers. We use real-time data 
              from trusted sources to ensure accurate and timely settlement. All odds are calculated using industry-standard 
              margin models and are subject to continuous monitoring.
            </p>
          </div>
        </div>
      </div>

      {/* RTP info */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/8 border border-purple-500/15 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Eye size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white mb-2">Return to Player (RTP)</h3>
            <p className="text-xs text-white/30 leading-relaxed">
              All casino games display their theoretical Return to Player percentage. RTPs typically range from 94% to 99% 
              depending on the game. These percentages represent long-term statistical averages and are independently verified 
              by third-party auditors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
