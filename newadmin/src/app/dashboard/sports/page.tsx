"use client";

import React, { useEffect, useState } from 'react';
import { sportsService, Sport, Competition } from '../../../services/sports.service';
import { Search, ChevronDown, ChevronRight, Eye, EyeOff, Trophy, Medal } from 'lucide-react';
import Link from 'next/link';

export default function SportsbookPage() {
    const [sports, setSports] = useState<Sport[]>([]);
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSport, setExpandedSport] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        try {
            const [sportsData, competitionsData] = await Promise.all([
                sportsService.getSports(),
                sportsService.getCompetitions()
            ]);
            setSports(sportsData);
            setCompetitions(competitionsData);
        } catch (error) {
            console.error("Failed to fetch sports data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleSport = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await sportsService.toggleSport(id, !currentStatus);
            setSports(sports.map(s => s.sport_id === id ? { ...s, isVisible: !currentStatus } : s));
        } catch (error) {
            console.error("Failed to toggle sport", error);
        }
    };

    const handleToggleCompetition = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await sportsService.toggleCompetition(id, !currentStatus);
            setCompetitions(competitions.map(c => c.competition_id === id ? { ...c, isVisible: !currentStatus } : c));
        } catch (error) {
            console.error("Failed to toggle competition", error);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading sports data...</div>;

    const filteredSports = sports.filter(s => s.sport_name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Sportsbook Management</h1>
                <p className="text-slate-400 mt-1">Manage visibility of sports and competitions.</p>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search sports..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                {filteredSports.map(sport => {
                    const sportCompetitions = competitions.filter(c => c.sport_id === sport.sport_id);
                    const isExpanded = expandedSport === sport.sport_id;

                    return (
                        <div key={sport.sport_id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors"
                                onClick={() => setExpandedSport(isExpanded ? null : sport.sport_id)}
                            >
                                <div className="flex items-center gap-4">
                                    <button className="p-1 rounded hover:bg-slate-600 text-slate-400">
                                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded text-indigo-400">
                                            <Trophy size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{sport.sport_name}</h3>
                                            <p className="text-xs text-slate-400">{sportCompetitions.length} Competitions • {sport.market_count || 0} Events</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Link
                                        href={`/dashboard/sports/events?sportId=${sport.sport_id}`}
                                        className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline px-3 py-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Manage Events
                                    </Link>
                                    <button
                                        onClick={(e) => handleToggleSport(sport.sport_id, sport.isVisible, e)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${sport.isVisible
                                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                            }`}
                                    >
                                        {sport.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                        {sport.isVisible ? 'Visible' : 'Hidden'}
                                    </button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-slate-700 bg-slate-900/30 p-4 space-y-2">
                                    {sportCompetitions.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-2">No competitions found.</p>
                                    ) : (
                                        sportCompetitions.map(comp => (
                                            <div key={comp.competition_id} className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700/50 rounded hover:bg-slate-700/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Medal size={16} className="text-slate-500" />
                                                    <div>
                                                        <p className="text-slate-200 font-medium">{comp.competition_name}</p>
                                                        <p className="text-xs text-slate-500">{comp.country_code || 'International'} • {comp.market_count || 0} Events</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => handleToggleCompetition(comp.competition_id, comp.isVisible, e)}
                                                    className={`p-2 rounded hover:bg-slate-700 transition-colors ${comp.isVisible ? 'text-emerald-400' : 'text-slate-600'
                                                        }`}
                                                    title={comp.isVisible ? 'Hide Competition' : 'Show Competition'}
                                                >
                                                    {comp.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
