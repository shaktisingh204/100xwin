"use client";

import React from 'react';
import { Event } from '@/services/sports';
import { countries, getRegionFlag } from '@/config/countries';
import { useEarlySixMatches } from '@/hooks/useEarlySixMatches';

interface LiveMatchCardProps {
    event: Event;
}

function getFlagCode(teamName?: string) {
    if (!teamName) return null;
    const lowerName = teamName.toLowerCase();
    const country = countries.find(c => lowerName.includes(c.name.toLowerCase()));
    return country ? country.code.toLowerCase() : null;
}

function TeamIcon({ teamName }: { teamName?: string }) {
    const code = getFlagCode(teamName);

    // If we have a country code, show the flag image
    if (code) {
        return (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/[0.06] shadow-sm bg-[#06080c] flex items-center justify-center">
                <img
                    src={`https://flagcdn.com/w40/${code}.png`}
                    alt={teamName}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    // Fallback to emoji if matched by getRegionFlag
    const emoji = teamName ? getRegionFlag(teamName) : '🏳️';
    if (emoji && emoji !== '🏳️') {
        return (
            <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[#06080c] border border-white/[0.06] shadow-sm flex items-center justify-center">
                <span className="text-xl leading-none">{emoji}</span>
            </div>
        );
    }

    // Last fallback initials
    return (
        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[#06080c] border border-white/[0.06] shadow-sm flex items-center justify-center text-[10px] font-bold text-white/50">
            {teamName?.substring(0, 2).toUpperCase() || 'TM'}
        </div>
    );
}

export default function LiveMatchCard({ event }: LiveMatchCardProps) {
    const earlySixIds = useEarlySixMatches();
    const hasEarlySix = earlySixIds.has(String(event.event_id));

    // Attempt to split event.name if event.away_team is missing or generic
    let homeTeam = event.home_team || 'Home Team';
    let awayTeam = event.away_team || 'Away Team';

    if (!event.away_team && event.event_name) {
        const splitName = event.event_name.split(/ v | @ | - /i);
        if (splitName.length > 1) {
            homeTeam = splitName[0].trim();
            awayTeam = splitName[1].trim();
        } else {
            homeTeam = event.event_name;
            awayTeam = '';
        }
    }
    return (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 md:p-5 hover:border-amber-500/30 hover:bg-white/[0.04] transition-all group relative overflow-hidden flex flex-col justify-between h-full min-h-[140px] shadow-sm">
            {/* Live Badge & Status */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    {event.match_status === 'Completed' ? (
                        <div className="flex items-center gap-1.5 p-1 px-2.5 bg-white/[0.04] border border-white/[0.06] text-white/50 text-[10px] uppercase font-bold rounded-md shadow-sm">
                            COMPLETED
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 p-1 px-2.5 bg-red-500/20 border border-red-500/30 text-red-300 text-[10px] uppercase font-bold rounded-md shadow-sm animate-pulse">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            {String(event.match_status || '').replace('In Play', 'LIVE') || 'LIVE'}
                        </div>
                    )}
                </div>
                {hasEarlySix && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-[#1a1208] text-[9px] font-black uppercase px-2 py-1 rounded shadow-[0_0_8px_rgba(245,158,11,0.3)] border border-amber-400/30 whitespace-nowrap">
                        🎯 Early 6 Refund
                    </div>
                )}
            </div>

            {/* Teams & Score */}
            <div className="flex flex-col gap-1 mb-5 mt-1 w-full relative">
                {/* Mobile VS Indicator Line */}
                <div className="absolute top-8 bottom-8 left-4 w-[2px] bg-white/[0.04] md:hidden"></div>

                {/* Home Team Row */}
                <div className="flex items-center justify-between gap-3 w-full relative z-10">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <TeamIcon teamName={homeTeam} />
                        <span className="text-sm md:text-base font-bold text-white truncate w-full" title={homeTeam}>
                            {homeTeam}
                        </span>
                    </div>
                    <div className="text-lg md:text-xl font-black text-amber-400 flex-shrink-0 text-right min-w-[30px]">
                        {event.score1 || 0}
                    </div>
                </div>

                {/* Center VS Indicator */}
                <div className="flex items-center py-1 w-full relative z-10 md:justify-center justify-start ml-2 md:ml-0">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shadow-inner relative z-10">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)]"></span>
                    </div>
                </div>

                {/* Away Team Row */}
                <div className="flex items-center justify-between gap-3 w-full relative z-10">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <TeamIcon teamName={awayTeam} />
                        <span className="text-sm md:text-base font-bold text-white truncate w-full" title={awayTeam}>
                            {awayTeam}
                        </span>
                    </div>
                    <div className="text-lg md:text-xl font-black text-amber-400 flex-shrink-0 text-right min-w-[30px]">
                        {event.score2 || 0}
                    </div>
                </div>
            </div>

            {/* Odds Preview (1x2) */}
            <div className="grid grid-cols-3 gap-2 mt-auto">
                {event.markets && event.markets.length > 0 ? (
                    (() => {
                        const market = event.markets.find(m => m.market_name?.toLowerCase().includes('match')) || event.markets[0];
                        const runners = market?.runners_data || [];

                        if (!runners || runners.length < 1) {
                            return (
                                <div className="col-span-3 text-center text-[11px] font-semibold text-white/50 py-2 bg-white/[0.02] rounded-lg">
                                    Odds Unavailable
                                </div>
                            );
                        }

                        return (
                            <>
                                {runners.slice(0, 3).map((runner, i) => {
                                    const bestBack = runner.odds?.find(o => o.otype === 'back');
                                    const price = bestBack ? bestBack.odds : '-';

                                    let label = '1';
                                    if (i === 1) label = runners.length > 2 ? 'X' : '2';
                                    if (i === 2) label = '2';

                                    return (
                                        <div key={i} className="bg-white/[0.02] rounded-lg py-1.5 px-1 flex flex-col items-center justify-center hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-600 hover:text-[#1a1208] hover:border-amber-500 transition-colors border border-white/[0.04] cursor-pointer group/odd">
                                            <span className="text-[10px] text-white/50 group-hover/odd:text-[#1a1208]/70 mb-0.5 font-medium" title={runner.nat}>{label}</span>
                                            <span className="text-xs md:text-sm font-black text-amber-400 group-hover/odd:text-[#1a1208]">{price}</span>
                                        </div>
                                    );
                                })}
                            </>
                        );
                    })()
                ) : (
                    <div className="col-span-3 text-center text-[11px] font-semibold text-white/50 py-2 bg-white/[0.02] rounded-lg">
                        Odds Locked
                    </div>
                )}
            </div>
        </div>
    );
}
