
import Link from 'next/link';
import { Activity, Gamepad2, Plane, Crown, Bomb, BookOpen } from 'lucide-react';

const quickGames = [
    { label: 'Cricket', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/8', href: '/sports?sport_id=4', live: true },
    { label: 'Live Dealer', icon: Crown, color: 'text-brand-gold', bg: 'bg-brand-gold/8', href: '/live-dealers' },
    { label: 'Limbo', icon: Plane, color: 'text-red-400', bg: 'bg-red-500/8', href: '/zeero-games/limbo', rotate: 'rotate-45' },
    { label: 'JetX', icon: Gamepad2, color: 'text-purple-400', bg: 'bg-purple-500/8', href: '/zeero-games' },
    { label: 'Crash', icon: Bomb, color: 'text-orange-400', bg: 'bg-orange-500/8', href: '/zeero-games/crash' },
];

export default function GamesRail() {
    return (
        <aside className="fixed right-0 top-[60px] bottom-0 w-[52px] bg-[#0c0e12] z-50 flex-col items-center py-5 gap-5 overflow-y-auto hidden xl:flex border-l border-white/[0.03]">
            {quickGames.map((game) => {
                const Icon = game.icon;
                return (
                    <Link
                        key={game.label}
                        href={game.href}
                        className={`flex flex-col items-center gap-1 cursor-pointer group relative`}
                        title={game.label}
                    >
                        <div className={`w-9 h-9 rounded-xl ${game.bg} flex items-center justify-center group-hover:scale-110 transition-all`}>
                            <Icon size={16} className={`${game.color} ${game.rotate || ''}`} />
                            {game.live && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                            )}
                        </div>
                        <span className="text-[8px] text-white/20 font-bold group-hover:text-white/50 text-center transition-colors leading-tight">
                            {game.label}
                        </span>
                    </Link>
                );
            })}

            {/* Tutorials */}
            <Link
                href="/support/help-center"
                className="flex flex-col items-center gap-1 cursor-pointer group mt-auto"
                title="Tutorials"
            >
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center group-hover:scale-110 transition-all">
                    <BookOpen size={14} className="text-white/20" />
                </div>
                <span className="text-[8px] text-white/15 font-bold group-hover:text-white/40 text-center transition-colors">
                    Help
                </span>
            </Link>
        </aside>
    );
}
