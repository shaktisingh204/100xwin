import Link from "next/link";
import { getSystemConfig } from "@/actions/settings";
import { emailTemplateCatalog } from "@/lib/email-catalog";
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Mail,
    Settings,
    TestTube,
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

export default async function EmailTemplatesPage() {
    const configResult = await getSystemConfig();
    const smtpConfig = parseSmtpConfig(configResult.success ? configResult.data?.SMTP_SETTINGS : undefined);
    const senderReady = Boolean(
        smtpConfig?.host &&
        smtpConfig?.user &&
        smtpConfig?.password &&
        (smtpConfig?.fromEmail || smtpConfig?.user),
    );

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                        <BookOpen size={14} />
                        Email Template Catalog
                    </div>
                    <h1 className="mt-3 text-3xl font-bold text-white">Email Templates</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-400">
                        Review the transactional templates currently backed by the API so ops can verify trigger coverage and sender readiness.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/dashboard/settings/config"
                        className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
                    >
                        <Settings size={16} />
                        Configure SMTP
                    </Link>
                    <Link
                        href="/dashboard/messaging/email/campaigns"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
                    >
                        <Mail size={16} />
                        Open Campaign Hub
                    </Link>
                </div>
            </div>

            <div className={`rounded-2xl border p-5 ${senderReady ? "border-emerald-500/20 bg-emerald-500/10" : "border-amber-500/20 bg-amber-500/10"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                            {senderReady ? <CheckCircle2 size={16} className="text-emerald-400" /> : <TriangleAlert size={16} className="text-amber-400" />}
                            {senderReady ? "Sender profile is configured" : "Sender profile still needs configuration"}
                        </div>
                        <p className="mt-1 text-sm text-slate-200">
                            {senderReady
                                ? `${smtpConfig?.fromName || "Configured sender"} • ${smtpConfig?.fromEmail || smtpConfig?.user}`
                                : "Open Site Config to add SMTP host, credentials, and from-email before testing templates."}
                        </p>
                    </div>
                    <Link
                        href="/dashboard/settings/config"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-violet-200"
                    >
                        Test from Site Config
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {emailTemplateCatalog.map((template) => (
                    <section key={template.id} className="rounded-2xl border border-slate-700 bg-slate-800">
                        <div className="border-b border-slate-700 px-5 py-4">
                            <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${template.accentClass}`}>
                                {template.trigger}
                            </div>
                            <h2 className="mt-3 text-lg font-semibold text-white">{template.name}</h2>
                            <p className="mt-1 text-sm text-slate-400">{template.summary}</p>
                        </div>

                        <div className="space-y-4 p-5 text-sm text-slate-300">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Audience</p>
                                <p className="mt-1">{template.audience}</p>
                            </div>

                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Template Variables</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {template.variables.map((variable) => (
                                        <span key={variable} className="rounded-full bg-slate-900 px-2.5 py-1 font-mono text-xs text-violet-200">
                                            {variable}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                                <div className="flex items-start gap-3">
                                    <TestTube size={16} className="mt-0.5 text-violet-300" />
                                    <p className="text-sm text-slate-400">
                                        Use the SMTP test in Site Config after updating sender credentials to validate rendering and delivery for this template family.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
