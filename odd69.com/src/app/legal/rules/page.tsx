import { BookOpen, Trophy, Dice1, Target, AlertTriangle, Clock, CreditCard, Shield, Zap, Users } from "lucide-react";

const rules = [
  {
    icon: <Trophy size={18} />,
    title: "Sports Betting Rules",
    items: [
      "All bets are settled based on official results from the governing body of the sport.",
      "If a match is abandoned or postponed, bets may be voided unless the market has already been determined.",
      "For cricket, results are based on official ICC/Board results. DLS-adjusted results are accepted.",
      "Live betting odds are updated in real-time. Any bets placed at incorrect odds due to delay may be voided.",
      "Maximum payout limits apply per event and are displayed before bet placement.",
      "Cash Out is available on select markets and may be suspended during certain periods."
    ]
  },
  {
    icon: <Dice1 size={18} />,
    title: "Casino Game Rules",
    items: [
      "All casino games use certified Random Number Generators (RNG) for fair outcomes.",
      "Game rules, paytables, and RTP percentages are available within each game interface.",
      "Any malfunction voids all pays and plays. Maximum win limits apply per game round.",
      "Autoplay features are available but users remain responsible for all bets placed.",
      "Progressive jackpot contributions and rules vary by game — see individual game info.",
      "Free spins and bonus rounds are subject to specific wagering requirements."
    ]
  },
  {
    icon: <Target size={18} />,
    title: "Fancy & Session Betting",
    items: [
      "Runs scored off overthrows, boundaries off no-balls, and byes count towards the batting total.",
      "Session markets settle on the actual runs scored in the specified overs.",
      "If overs are reduced (rain/DLS), only completed over markets will be settled.",
      "Retirement not out is treated as not out for individual player markets.",
      "Wicket markets do not include run-outs unless specifically stated.",
      "Free hit results count towards all applicable run and boundary markets."
    ]
  },
  {
    icon: <CreditCard size={18} />,
    title: "Financial Rules",
    items: [
      "Minimum deposit: ₹100. Minimum withdrawal: ₹500.",
      "Withdrawals are processed within 24-48 hours after verification.",
      "First withdrawal requires KYC verification (ID proof and bank details).",
      "Bonus funds are subject to wagering requirements before withdrawal.",
      "Deposits from third-party accounts are not accepted.",
      "Deposit bonuses must be wagered within 30 days or they expire."
    ]
  },
  {
    icon: <AlertTriangle size={18} />,
    title: "Responsible Gaming",
    items: [
      "Set daily, weekly, or monthly deposit limits through your account settings.",
      "Self-exclusion periods of 1 day, 7 days, 30 days, or permanent are available.",
      "Reality checks can be enabled to notify you after specified playing intervals.",
      "If you feel you have a gambling problem, contact support for assistance.",
      "We reserve the right to limit or close accounts showing signs of problem gambling.",
      "Underage gambling is strictly prohibited — accounts may be verified at any time."
    ]
  },
  {
    icon: <Shield size={18} />,
    title: "Account Rules",
    items: [
      "One account per person. Duplicate accounts will be closed and balances forfeited.",
      "You are responsible for maintaining account security. Never share your credentials.",
      "Accounts inactive for 12 months may be classified as dormant and fees may apply.",
      "Bonus abuse, arbitrage betting, or exploiting system errors is prohibited.",
      "We reserve the right to request additional verification at any time.",
      "Accounts involved in fraudulent activity will be permanently suspended."
    ]
  },
];

export default function RulesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 pb-24">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4">
          <BookOpen size={13} className="text-purple-400" />
          <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Platform Rules</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">Rules & Regulations</h1>
        <p className="text-sm text-white/25 mt-2">Everything you need to know about betting and playing on Odd69</p>
      </div>

      <div className="space-y-6">
        {rules.map((r, i) => (
          <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/8 border border-purple-500/15 flex items-center justify-center text-purple-400">
                {r.icon}
              </div>
              <h2 className="text-sm font-black text-white">{r.title}</h2>
            </div>
            <div className="p-5">
              <ul className="space-y-2.5">
                {r.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-xs text-white/30 leading-relaxed">
                    <Zap size={10} className="text-purple-400/50 mt-1 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-5 bg-white/[0.02] border border-white/[0.04] rounded-xl text-center">
        <p className="text-xs text-white/20">
          Rules are subject to change. Check this page periodically for updates. For specific event rules, contact <a href="/support" className="text-purple-400 hover:underline">Support</a>.
        </p>
      </div>
    </div>
  );
}
