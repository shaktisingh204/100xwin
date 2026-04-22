import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Wrench } from 'lucide-react';

interface MaintenanceStateProps {
    title: string;
    message: string;
    backHref?: string;
    backLabel?: string;
    fullScreen?: boolean;
}

export default function MaintenanceState({
    title,
    message,
    backHref = '/',
    backLabel = 'Return Home',
    fullScreen = false,
}: MaintenanceStateProps) {
    return (
        <div className={`${fullScreen ? 'min-h-screen' : 'h-full min-h-[calc(100vh-64px)]'} bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_40%),linear-gradient(180deg,_#06080c_0%,_#0a0d13_100%)] text-white`}>
            <div className="mx-auto flex h-full max-w-3xl items-center justify-center px-6 py-16">
                <div className="w-full rounded-[28px] border border-amber-500/25 bg-white/[0.02] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
                    <div className="mb-6 flex items-center gap-3 text-amber-300">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 animate-pulse">
                            <Wrench size={22} className="text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300/80">Maintenance</p>
                            <p className="text-sm text-white/50">Service temporarily paused</p>
                        </div>
                    </div>

                    <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
                    <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
                            <p className="text-sm leading-7 text-white/70 sm:text-base">{message}</p>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={backHref}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-sm font-black text-[#1a1208] transition hover:brightness-110"
                        >
                            <ArrowLeft size={16} />
                            {backLabel}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
