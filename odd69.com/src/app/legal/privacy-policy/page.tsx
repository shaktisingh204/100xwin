import { Shield, Eye, Database, Lock, UserCheck, Cookie, Globe, Bell, Trash2, Mail } from "lucide-react";

const sections = [
  {
    icon: <Eye size={18} />,
    title: "1. Information We Collect",
    content: `We collect information you provide directly, including: name, email address, phone number, date of birth, and government-issued ID for verification purposes. We also automatically collect device information, IP address, browser type, pages visited, and usage patterns through cookies and similar technologies.`
  },
  {
    icon: <Database size={18} />,
    title: "2. How We Use Your Information",
    content: `Your information is used to: create and manage your account, process deposits and withdrawals, verify your identity and age, provide customer support, send promotional offers (with your consent), detect and prevent fraud, comply with legal obligations, and improve our services and user experience.`
  },
  {
    icon: <Lock size={18} />,
    title: "3. Data Security",
    content: `We implement industry-standard security measures including 256-bit SSL encryption, secure data centres, regular security audits, and strict access controls. Payment information is processed through PCI DSS compliant payment processors and is never stored on our servers. Despite our measures, no system is 100% secure.`
  },
  {
    icon: <UserCheck size={18} />,
    title: "4. Data Sharing",
    content: `We do not sell your personal data. We may share information with: payment processors (to complete transactions), identity verification services (KYC compliance), regulatory authorities (when legally required), law enforcement (in response to valid legal requests), and service providers who assist in operating the Platform under strict confidentiality agreements.`
  },
  {
    icon: <Cookie size={18} />,
    title: "5. Cookies & Tracking",
    content: `We use essential cookies to operate the Platform, analytics cookies to understand usage patterns, and optional marketing cookies for personalized offers. You can manage cookie preferences through your browser settings. Disabling essential cookies may affect Platform functionality.`
  },
  {
    icon: <Globe size={18} />,
    title: "6. International Transfers",
    content: `Your data may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place, including standard contractual clauses and compliance with applicable data protection laws.`
  },
  {
    icon: <Shield size={18} />,
    title: "7. Your Rights",
    content: `You have the right to: access your personal data, correct inaccurate information, request deletion of your data (subject to legal retention requirements), restrict or object to processing, data portability, and withdraw consent at any time. To exercise these rights, contact our Data Protection Officer via the Support page.`
  },
  {
    icon: <Bell size={18} />,
    title: "8. Marketing Communications",
    content: `With your consent, we may send promotional emails, SMS messages, and push notifications about bonuses, events, and platform updates. You can opt out at any time through your account settings or by clicking "unsubscribe" in any marketing email. Opting out of marketing does not affect transactional communications.`
  },
  {
    icon: <Trash2 size={18} />,
    title: "9. Data Retention",
    content: `We retain your data for as long as your account is active and for a minimum of 5 years after account closure as required by gambling regulations. Transaction records may be retained for up to 7 years for tax compliance purposes. After the retention period, data is securely deleted or anonymized.`
  },
  {
    icon: <Mail size={18} />,
    title: "10. Contact Us",
    content: `For privacy-related inquiries, you can reach our Data Protection Officer at privacy@odd69.com or through our Support page. We will respond to all requests within 30 days. If you are unsatisfied with our response, you have the right to lodge a complaint with your local data protection authority.`
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 pb-24">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
          <Shield size={13} className="text-blue-400" />
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Privacy</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">Privacy Policy</h1>
        <p className="text-sm text-white/25 mt-2">Last updated: March 2026</p>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <p className="text-sm text-white/40 leading-relaxed">
          At Odd69, we take your privacy seriously. This policy explains how we collect, use, store, and protect your 
          personal information when you use our platform. By using our services, you consent to the practices described herein.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-5 hover:border-white/[0.08] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/8 border border-blue-500/15 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
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

      <div className="mt-8 p-5 bg-white/[0.02] border border-white/[0.04] rounded-xl text-center">
        <p className="text-xs text-white/20">
          Questions about our privacy practices? Contact our <a href="/support" className="text-blue-400 hover:underline">Data Protection Officer</a>.
        </p>
      </div>
    </div>
  );
}
