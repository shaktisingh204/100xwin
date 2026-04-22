import { Activity, Gamepad2, PlayCircle, Plane, BookOpen, Crown } from 'lucide-react';

export default function GamesRail() {
    return (
        <aside className="fixed right-0 top-[64px] bottom-0 w-[64px] bg-white/[0.02] border-l border-white/[0.06] z-50 flex-col items-center py-4 gap-6 overflow-y-auto hidden xl:flex shadow-[-4px_0_20px_rgba(0,0,0,0.3)]">
            {/* Logo/Game Items */}
            <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.05] transition-colors relative">
                    <Activity size={20} className="text-white" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                </div>
                <span className="text-[9px] text-white/50 font-black group-hover:text-white text-center">Cricket</span>
            </div>

            <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.05] transition-colors">
                    <Crown size={20} className="text-amber-400" />
                </div>
                <span className="text-[9px] text-white/50 font-black group-hover:text-white text-center">Top Live<br />Dealer</span>
            </div>

            <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.05] transition-colors">
                    <Plane size={20} className="text-amber-500 rotate-45" />
                </div>
                <span className="text-[9px] text-amber-300 font-black group-hover:text-white text-center">Limbo</span>
            </div>

            <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.05] transition-colors">
                    <Gamepad2 size={20} className="text-orange-400" />
                </div>
                <span className="text-[9px] text-orange-300 font-black group-hover:text-white text-center">JetX</span>
            </div>

            <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.05] transition-colors">
                    <Plane size={20} className="text-amber-300 rotate-12" />
                </div>
                <span className="text-[9px] text-amber-200 font-black group-hover:text-white text-center">Aviatrix</span>
            </div>

            <div className="flex flex-col items-center gap-1 cursor-pointer group mt-auto">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.05] transition-colors">
                    <BookOpen size={20} className="text-white/50" />
                </div>
                <span className="text-[9px] text-white/50 font-black group-hover:text-white text-center">Tutorials</span>
            </div>

            {/* Chat Icon - often at bottom right */}
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full absolute bottom-4 flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                <PlayCircle size={24} className="text-[#1a1208] fill-current" />
            </div>
        </aside>
    );
}
