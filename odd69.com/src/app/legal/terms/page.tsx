import { Scale, FileText, AlertTriangle, Shield, Users, CreditCard, Gavel, Globe, Ban, Clock } from "lucide-react";

const sections = [
  {
    icon: <FileText size={18} />,
    title: "1. Acceptance of Terms",
    content: `By accessing and using Odd69 ("the Platform"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you must not use the Platform. These terms apply to all visitors, users, and members of the Platform.`
  },
  {
    icon: <Users size={18} />,
    title: "2. Eligibility",
    content: `You must be at least 18 years of age or the legal age for gambling in your jurisdiction, whichever is greater. By using the Platform, you represent and warrant that you meet this age requirement. We reserve the right to request proof of age at any time and may suspend or close your account if adequate proof is not provided.`
  },
  {
    icon: <Shield size={18} />,
    title: "3. Account Registration",
    content: `You are responsible for maintaining the confidentiality of your account credentials. Each person may only maintain one account. Multiple accounts are subject to immediate closure and forfeiture of any balances. You agree to provide accurate, current, and complete information during registration and to update such information as necessary.`
  },
  {
    icon: <CreditCard size={18} />,
    title: "4. Deposits & Withdrawals",
    content: `All deposits must be made using legitimate payment methods in your own name. Minimum deposit and withdrawal amounts apply as displayed on the Platform. Withdrawals are subject to verification checks and may take up to 24-48 hours to process. The Platform reserves the right to void transactions suspected of fraud or money laundering.`
  },
  {
    icon: <Gavel size={18} />,
    title: "5. Betting Rules",
    content: `All bets are subject to the specific rules of the sport or game. The Platform reserves the right to void any bet placed in error, including incorrect odds or technical glitches. Maximum bet limits apply and vary by event. Results are determined based on official data sources. Once confirmed, bets cannot be cancelled unless the Cash Out feature is available and used.`
  },
  {
    icon: <AlertTriangle size={18} />,
    title: "6. Responsible Gaming",
    content: `We are committed to responsible gaming. You may set deposit limits, loss limits, and self-exclusion periods through your account settings. If you believe you have a gambling problem, please contact our support team or visit begambleaware.org. We reserve the right to limit or close accounts where we suspect problem gambling behaviour.`
  },
  {
    icon: <Ban size={18} />,
    title: "7. Prohibited Activities",
    content: `Use of the Platform for money laundering, fraud, collusion, or any illegal activity is strictly prohibited. Automated betting, use of bots, or exploitation of technical errors is grounds for immediate account closure and forfeiture of balances. Abusive behaviour towards staff or other users will not be tolerated.`
  },
  {
    icon: <Globe size={18} />,
    title: "8. Geographical Restrictions",
    content: `The Platform is not available in jurisdictions where online gambling is prohibited by law. It is your responsibility to determine whether your use of the Platform is legal in your jurisdiction. VPN usage to circumvent geographical restrictions is prohibited and may result in account closure.`
  },
  {
    icon: <Scale size={18} />,
    title: "9. Dispute Resolution",
    content: `Any disputes arising from the use of the Platform shall first be addressed through our internal complaints procedure via the Support page. If unresolved, disputes shall be submitted to binding arbitration in accordance with the rules of the applicable governing body. The Platform's decision on bet settlement is final.`
  },
  {
    icon: <Clock size={18} />,
    title: "10. Amendments",
    content: `We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Continued use of the Platform after changes constitutes acceptance of the new terms. We recommend reviewing these terms periodically.`
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 pb-24">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-full mb-4">
          <Scale size={13} className="text-[#f59e0b]" />
          <span className="text-[10px] font-black text-[#f59e0b] uppercase tracking-wider">Legal</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">Terms of Service</h1>
        <p className="text-sm text-white/25 mt-2">Last updated: March 2026</p>
      </div>

      {/* Introduction */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <p className="text-sm text-white/40 leading-relaxed">
          Welcome to Odd69. These terms and conditions outline the rules and regulations for the use of our platform. 
          By accessing this website, you accept these terms. Please read them carefully before using our services.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-5 hover:border-white/[0.08] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#f59e0b]/8 border border-[#f59e0b]/15 flex items-center justify-center text-[#f59e0b] flex-shrink-0 mt-0.5">
                {s.icon}
              </div>
              <div>
                <h2 className="text-sm font-black text-white mb-2">{s.title}</h2>
                <p className="text-xs text-white/30 leading-relaxed">{s.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-8 p-5 bg-white/[0.02] border border-white/[0.04] rounded-xl text-center">
        <p className="text-xs text-white/20">
          If you have any questions about these Terms, please contact our <a href="/support" className="text-[#f59e0b] hover:underline">Support Team</a>.
        </p>
      </div>
    </div>
  );
}
