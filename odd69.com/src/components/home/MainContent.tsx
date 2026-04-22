'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Star, Activity, Trophy, Timer, Gamepad2, X, ChevronRight } from 'lucide-react';
import { sportsApi, Event } from '@/services/sports';

interface MainContentProps {
    selectedSportId: string | null;
    matches?: Event[];
}

// Minimal flag helpers (no external @/config/countries dependency)
const COUNTRY_FLAGS: Record<string, string> = {
    IN: '🇮🇳', EN: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', GB: '🇬🇧', US: '🇺🇸', AU: '🇦🇺', NZ: '🇳🇿',
    ZA: '🇿🇦', PK: '🇵🇰', BD: '🇧🇩', LK: '🇱🇰', WI: '🏴', AF: '🇦🇫',
    IE: '🇮🇪', ES: '🇪🇸', FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', PT: '🇵🇹',
    BR: '🇧🇷', AR: '🇦🇷', MX: '🇲🇽', NL: '🇳🇱', BE: '🇧🇪', TR: '🇹🇷',
    RU: '🇷🇺', JP: '🇯🇵', KR: '🇰🇷', CN: '🇨🇳', EU: '🇪🇺', INT: '🌍',
};

function getFlagByCode(code?: string): string {
    if (!code) return '🌍';
    return COUNTRY_FLAGS[code.toUpperCase()] ?? '🏳️';
}

function getRegionFlag(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('uefa') || lower.includes('european')) return '🇪🇺';
    if (lower.includes('fifa') || lower.includes('world')) return '🌍';
    if (lower.includes('premier') || lower.includes('english')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    if (lower.includes('la liga') || lower.includes('spanish')) return '🇪🇸';
    if (lower.includes('serie a') || lower.includes('italian')) return '🇮🇹';
    if (lower.includes('bundesliga') || lower.includes('german')) return '🇩🇪';
    if (lower.includes('ipl') || lower.includes('indian')) return '🇮🇳';
    return '🏆';
}

// Minimal MatchRow component (lightweight, odd69-styled)
function MatchRow({ match }: { match: Event }) {
    const home = match.home_team || match.event_name?.split(' v ')[0] || match.event_name || '';
    const away = match.away_team || match.event_name?.split(' v ')[1] || '';
    const isLive = match.match_status === 'In Play' || match.match_status === 'Live';
    const odds = (match as any).match_odds || [];

    return (
        <Link
            href={`/sports/match/${match.event_id}`}
            className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {isLive && (
                    <span className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5 text-[9px] font-black text-red-400 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                    </span>
                )}
                <div className="min-w-0">
                    <div className="text-xs md:text-sm font-bold text-white truncate">
                        {home} <span className="text-white/40">vs</span> {away}
                    </div>
                    <div className="text-[10px] font-semibold text-white/50 truncate">
                        {match.competition_name || match.competition?.competition_name || ''}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {odds.slice(0, 3).map((o: any, i: number) => (
                    <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1 min-w-[40px] text-center">
                        <div className="text-[11px] font-black text-amber-400">{o.back || '-'}</div>
                    </div>
                ))}
            </div>
        </Link>
    );
}

export default function MainContent({ selectedSportId, matches: propMatches }: MainContentProps) {
    const [internalMatches, setInternalMatches] = useState<Event[]>([]);
    const [loading, setLoading] = useState(!propMatches);
    const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const activeMatches = propMatches || internalMatches;

    useEffect(() => {
        setSelectedTournament(null);
        setSelectedCountry(null);
        setIsDropdownOpen(false);
    }, [selectedSportId]);

    useEffect(() => {
        if (propMatches) {
            setLoading(false);
            return;
        }

        const fetchLiveEvents = async () => {
            try {
                const data = await sportsApi.getLiveEvents();
                setInternalMatches(data);
            } catch (error) {
                console.error("Failed to fetch live events", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLiveEvents();
    }, [propMatches]);

    const availableSports = useMemo(() => {
        const sports = new Map<string, { id: string, name: string, count: number }>();
        activeMatches.forEach(m => {
            const sName = m.competition?.sport?.sport_name || "Other";
            const sId = m.competition?.sport?.sport_id || "0";
            if (!sports.has(sName)) {
                sports.set(sName, { id: sId, name: sName, count: 0 });
            }
            sports.get(sName)!.count++;
        });
        return Array.from(sports.values()).sort((a, b) => b.count - a.count);
    }, [activeMatches]);

    const activeSportName = useMemo(() => {
        if (!selectedSportId) return "Popular";
        const found = availableSports.find(s => s.id === selectedSportId);
        return found ? found.name : "Sports";
    }, [selectedSportId, availableSports]);

    const uniqueTournaments = useMemo(() => {
        const targetMatches = selectedSportId
            ? activeMatches.filter(m => (m.competition?.sport?.sport_id || "0") === selectedSportId)
            : activeMatches;

        const tournaments = new Map<string, { id: string, name: string, count: number, country_code?: string }>();

        targetMatches.forEach(m => {
            const tName = m.competition_name || m.competition?.competition_name || "Unknown League";
            const tId = m.competition?.competition_id || "0";
            if (!tournaments.has(tName)) {
                tournaments.set(tName, {
                    id: tId,
                    name: tName,
                    count: 0,
                    country_code: m.competition?.country_code
                });
            }
            tournaments.get(tName)!.count++;
        });
        return Array.from(tournaments.values()).sort((a, b) => b.count - a.count);
    }, [activeMatches, selectedSportId]);

    const countries = useMemo(() => {
        const countryMap = new Map<string, { code: string, name: string, count: number }>();

        activeMatches.forEach(m => {
            if (m.competition?.country_code) {
                const code = m.competition.country_code;
                if (!countryMap.has(code)) {
                    countryMap.set(code, { code, name: code, count: 0 });
                }
                countryMap.get(code)!.count++;
            }
        });
        return Array.from(countryMap.values()).sort((a, b) => b.count - a.count);
    }, [activeMatches]);

    const railTournaments = useMemo(() => {
        if (selectedCountry) {
            return uniqueTournaments.filter(t => t.country_code === selectedCountry);
        }

        const international = uniqueTournaments.filter(t =>
            t.name.includes('UEFA') ||
            t.name.includes('FIFA') ||
            t.name.includes('International') ||
            t.country_code === 'INT' ||
            t.country_code === 'EU'
        );
        return international.length > 0 ? international : uniqueTournaments.slice(0, 10);
    }, [uniqueTournaments, selectedCountry]);

    const filteredMatches = useMemo(() => {
        return activeMatches.filter(m => {
            const sId = m.competition?.sport?.sport_id || "0";
            const tName = m.competition_name || m.competition?.competition_name || "Unknown League";
            const cCode = m.competition?.country_code;

            if (selectedSportId && sId !== selectedSportId) return false;
            if (selectedCountry && cCode !== selectedCountry) return false;
            if (selectedTournament && tName !== selectedTournament) return false;

            return true;
        });
    }, [activeMatches, selectedSportId, selectedTournament, selectedCountry]);

    const getSportIcon = (sportName: string) => {
        const lower = sportName.toLowerCase();
        if (lower.includes('cricket')) return <Activity size={18} className="text-amber-400" />;
        if (lower.includes('soccer') || lower.includes('football')) return <Activity size={18} className="text-amber-400" />;
        if (lower.includes('tennis')) return <Trophy size={18} className="text-amber-400" />;
        if (lower.includes('basket')) return <Timer size={18} className="text-amber-400" />;
        if (lower.includes('game') || lower.includes('esport')) return <Gamepad2 size={18} className="text-amber-400" />;
        return <Activity size={18} className="text-amber-400" />;
    };

    return (
        <main className="flex-1 bg-[#06080c] pt-[60px] md:pt-[64px] min-h-screen pb-20 xl:mr-[64px] overflow-hidden w-full relative">

            {/* Top Area */}
            <div className="p-4 pb-0">
                <div className="w-full h-[180px] rounded-lg relative overflow-hidden flex items-center px-8 mb-6 shadow-[0_8px_32px_rgba(245,158,11,0.15)] border border-white/[0.06]"
                    style={{ background: 'linear-gradient(135deg, #1a1208 0%, #0f0d08 50%, #06080c 100%)' }}>
                    <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                    <div className="z-10 relative max-w-lg">
                        <span className="bg-[#06080c] text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider mb-2 inline-block border border-amber-500/30">Urgent</span>
                        <h2 className="text-3xl font-black text-white mb-2 leading-tight drop-shadow-sm">
                            Secure Your <br /> Account
                        </h2>
                        <p className="text-[11px] text-white/70 font-medium mb-1">
                            Never Share Password - ODD69 Won't Ask For It
                        </p>
                    </div>
                    {selectedTournament && (
                        <button
                            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] text-[12px] font-black border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all"
                            onClick={() => setSelectedTournament(null)}
                        >
                            <span className="text-[14px]">
                                {uniqueTournaments.find(t => t.name === selectedTournament)?.country_code
                                    ? getFlagByCode(uniqueTournaments.find(t => t.name === selectedTournament)!.country_code!)
                                    : getRegionFlag(selectedTournament)}
                            </span>
                            {selectedTournament}
                            <X size={14} className="ml-1" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dynamic Header */}
            <div className="px-4 mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2">
                    {getSportIcon(activeSportName)}
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                        {activeSportName}
                    </h2>
                </div>
                {selectedSportId && (
                    <span className="text-xs font-bold text-white/50 bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded">
                        Lives
                    </span>
                )}
            </div>

            {/* TOURNAMENT RAIL */}
            <div className="px-4 mb-6 relative z-20">
                <div className="flex items-center gap-2 overflow-x-auto pb-4 snap-x" style={{ scrollbarWidth: 'none' }}>

                    {/* All / Countries Dropdown Trigger */}
                    <div className="relative shrink-0 snap-start">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`
                                h-[36px] flex items-center gap-2 px-3 pl-4 rounded-full text-[13px] font-bold tracking-wide transition-all border
                                ${isDropdownOpen
                                    ? 'bg-white/[0.05] text-white border-white/[0.1]'
                                    : 'bg-white/[0.03] hover:bg-white/[0.05] text-white/70 hover:text-white border-white/[0.06]'}
                            `}
                        >
                            All
                            <span className="bg-[#06080c]/80 text-white/50 px-1.5 py-0.5 rounded-[4px] text-[11px] font-bold min-w-[24px] text-center">
                                {selectedCountry ? activeMatches.filter(m => m.competition?.country_code === selectedCountry).length : activeMatches.length}
                            </span>
                            <ChevronRight size={14} className={`transition-transform duration-200 opacity-60 ${isDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                        </button>

                        {isDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-[280px] bg-[#0a0d14] border border-white/[0.08] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[400px] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="py-2 flex flex-col">
                                        <button
                                            onClick={() => {
                                                setSelectedCountry(null);
                                                setSelectedTournament(null);
                                                setIsDropdownOpen(false);
                                            }}
                                            className="px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.05] transition-colors group mx-2 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 flex items-center justify-center">
                                                    <span className="text-xl">🌍</span>
                                                </div>
                                                <span className={`text-[13px] font-bold ${!selectedCountry ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                                                    International
                                                </span>
                                                <span className="bg-white/[0.04] text-white/50 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold">
                                                    {activeMatches.length}
                                                </span>
                                            </div>
                                            <ChevronRight size={14} className="text-white/25 opacity-0 group-hover:opacity-100 transition-opacity rotate-90" />
                                        </button>

                                        {countries.map(country => (
                                            <button
                                                key={country.code}
                                                onClick={() => {
                                                    setSelectedCountry(country.code);
                                                    setSelectedTournament(null);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.05] transition-colors group mx-2 rounded-lg ${selectedCountry === country.code ? 'bg-white/[0.04]' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 flex items-center justify-center overflow-hidden rounded-full border border-white/[0.06] bg-[#06080c]">
                                                        <span className="text-xl leading-none">{getFlagByCode(country.code)}</span>
                                                    </div>
                                                    <span className={`text-[13px] font-bold ${selectedCountry === country.code ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                                                        {country.name === country.code ? (country.name === 'EN' ? 'England' : country.name) : country.name}
                                                    </span>
                                                    <span className="bg-white/[0.04] text-white/50 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold">
                                                        {country.count}
                                                    </span>
                                                </div>
                                                <ChevronRight size={14} className="text-white/25 opacity-50 rotate-90" />
                                            </button>
                                        ))}

                                        {countries.length === 0 && (
                                            <div className="px-4 py-8 text-center text-xs text-white/50">
                                                No locations found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* POPULAR Pill */}
                    <button
                        onClick={() => {
                            setSelectedTournament(null);
                            setSelectedCountry(null);
                        }}
                        className={`
                            shrink-0 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all snap-start border flex items-center gap-2
                            ${selectedTournament === null
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                : 'bg-white/[0.03] text-white/70 border-white/[0.06] hover:text-white hover:border-amber-500/40'}
                        `}
                    >
                        <Star size={12} className={selectedTournament === null ? 'fill-[#1a1208]' : ''} />
                        Popular
                    </button>

                    {/* Rail Tournaments */}
                    {railTournaments.map(tour => (
                        <button
                            key={tour.id}
                            onClick={() => setSelectedTournament(tour.name)}
                            className={`
                                shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all snap-start border flex items-center gap-2 group
                                ${selectedTournament === tour.name
                                    ? 'bg-white/[0.05] text-amber-400 border-amber-500/60 shadow-sm'
                                    : 'bg-white/[0.03] text-white/70 border-white/[0.06] hover:bg-white/[0.05] hover:text-white hover:border-white/[0.1]'}
                            `}
                        >
                            <span className="text-base group-hover:scale-110 transition-transform">
                                {tour.country_code ? getFlagByCode(tour.country_code) : getRegionFlag(tour.name)}
                            </span>
                            <span className="truncate max-w-[150px]">{tour.name}</span>
                            <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded ${selectedTournament === tour.name ? 'bg-amber-500/10 text-amber-400' : 'bg-[#06080c] text-white/50'}`}>
                                {tour.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Matches List */}
            <div className="flex flex-col border-t border-white/[0.04] bg-[#06080c]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-white/50 font-bold tracking-widest uppercase">Loading Events...</span>
                    </div>
                ) : filteredMatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 opacity-60">
                        <Trophy size={48} className="text-white/50 mb-2" />
                        <span className="text-sm text-white/70 font-bold">No Live Events Available</span>
                        <p className="text-xs text-white/25">Current selection has no active matches.</p>
                    </div>
                ) : (
                    filteredMatches.map((match) => (
                        <MatchRow key={match.event_id} match={match} />
                    ))
                )}
            </div>
        </main>
    );
}
