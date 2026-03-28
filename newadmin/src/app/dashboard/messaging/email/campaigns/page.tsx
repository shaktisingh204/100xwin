import Link from "next/link";
import { getSystemConfig } from "@/actions/settings";
import { emailLaunchChecklist, emailTemplateCatalog } from "@/lib/email-catalog";
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Mail,
    MessageSquare,
    Send,
    Settings,
    TriangleAlert,
} from "lucide-react";

function parseSmtpConfig(rawValue?: string) {
    if (!rawValue) return null;

    try {
        return JSON.parse(rawValue);
    } catch {
        return null;
    }
}

export default async function EmailCampaignsPage() {
    const configResult = await getSystemConfig();
    const smtpConfig = parseSmtpConfig(configResult.success ? configResult.data?.SMTP_SETTINGS : undefined);
    const smtpReady = Boolean(
        smtpConfig?.host &&
        smtpConfig?.user &&
        smtpConfig?.password &&
        (smtpConfig?.fromEmail || smtpConfig?.user),
    );
    const senderIdentity = smtpReady
        ? smtpConfig?.fromName
            ? `${smtpConfig.fromName} <${smtpConfig.fromEmail || smtpConfig.user}>`
            : smtpConfig?.fromEmail || smtpConfig?.user
        : "SMTP sender not configured yet";

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                        <Mail size={14} />
                        Email Campaign Hub
                    </div>
                    <h1 className="mt-3 text-3xl font-bold text-white">Email Campaigns</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-400">
                        This workspace is the operational hub for email delivery. SMTP setup and transactional templates are live;
                        outbound bulk campaign automation can be layered on top from here.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/dashboard/settings/config"
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500"
                    >
                        <Settings size={16} />
                        Configure SMTP
                    </Link>
                    <Link
                        href="/dashboard/messaging/email/templates"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
                    >
                        <BookOpen size={16} />
                        View Templates
                    </Link>
                    <Link
                        href="/dashboard/messaging/whatsapp/campaigns"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
                    >
                        <MessageSquare size={16} />
                        WhatsApp Broadcasts
                    </Link>
                </div>
            </div>

            <div className={`rounded-2xl border p-5 ${smtpReady ? "border-emerald-500/20 bg-emerald-500/10" : "border-amber-500/20 bg-amber-500/10"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                            {smtpReady ? <CheckCircle2 size={16} className="text-emerald-400" /> : <TriangleAlert size={16} className="text-amber-400" />}
                            {smtpReady ? "SMTP is ready for delivery" : "SMTP needs setup before campaigns can go live"}
                        </div>
                        <p className="mt-1 text-sm text-slate-200">{senderIdentity}</p>
                    </div>
                    <Link
                        href="/dashboard/settings/config"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-sky-200"
                    >
                        Open Site Config
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr,0.85fr]">
                <section className="rounded-2xl border border-slate-700 bg-slate-800">
                    <div className="border-b border-slate-700 px-5 py-4">
                        <h2 className="text-lg font-semibold text-white">Launch Checklist</h2>
                        <p className="text-xs text-slate-400">The current actions that make the email channel operational today.</p>
                    </div>
                    <div className="space-y-3 p-5">
                        {emailLaunchChecklist.map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                                <CheckCircle2 size={16} className="mt-0.5 text-emerald-400" />
                                <p className="text-sm text-slate-300">{item}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-700 bg-slate-800">
                    <div className="border-b border-slate-700 px-5 py-4">
                        <h2 className="text-lg font-semibold text-white">Channel Coverage</h2>
                        <p className="text-xs text-slate-400">What is already wired into the stack.</p>
                    </div>
                    <div className="space-y-4 p-5">
                        {[
                            {
                                title: "Transactional Email",
                                desc: "Signup, deposit, withdrawal, and password reset templates are already defined in the backend.",
                                icon: Mail,
                                shell: "bg-sky-500/10 text-sky-300",
                            },
                            {
                                title: "SMTP Test Workflow",
                                desc: "Admins can save SMTP credentials and trigger a test email from Site Config.",
                                icon: Settings,
                                shell: "bg-indigo-500/10 text-indigo-300",
                            },
                            {
                                title: "Bulk Outreach Today",
                                desc: "Use WhatsApp campaigns for broadcast-style messaging until email campaigns are automated.",
                                icon: Send,
                                shell: "bg-emerald-500/10 text-emerald-300",
                            },
                        ].map((item) => (
                            <div key={item.title} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                                <div className={`mb-3 inline-flex rounded-lg p-2 ${item.shell}`}>
                                    <item.icon size={16} />
                                </div>
                                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                                <p className="mt-1 text-sm text-slate-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className="rounded-2xl border border-slate-700 bg-slate-800">
                <div className="flex flex-col gap-2 border-b border-slate-700 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Available Transactional Templates</h2>
                        <p className="text-xs text-slate-400">These templates already exist in the backend and can be reviewed from the template catalog.</p>
                    </div>
                    <Link href="/dashboard/messaging/email/templates" className="text-sm font-semibold text-sky-300 transition-colors hover:text-sky-200">
                        Open template catalog
                    </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                    {emailTemplateCatalog.map((template) => (
                        <div key={template.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                            <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${template.accentClass}`}>
                                {template.trigger}
                            </div>
                            <h3 className="mt-3 text-base font-semibold text-white">{template.name}</h3>
                            <p className="mt-1 text-sm text-slate-400">{template.summary}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
