"use client";

import api from './api';

export interface DiamondMarketOdds {
    sid: number;
    psid: number;
    odds: number;
    otype: string; // 'back' | 'lay'
    oname: string;
    tno: number;
    size: number;
}

export interface DiamondMatchSection {
    sid: number;
    sno: number;
    gstatus: string;
    gscode: number;
    nat: string;
    odds: DiamondMarketOdds[];
}

export interface Market {
    market_id: string;
    market_name: string;
    marketOdds: DiamondMatchSection[];
    runners_data: DiamondMatchSection[];
    is_active?: boolean;
}

export interface MatchOddSummary {
    marketId: string;
    marketName: string;
    selectionId: string;
    name: string;
    back: number | null;
    lay?: number | null;
    betType?: 'back';
}

export interface Event {
    event_id: string;
    event_name: string;
    open_date: string;
    score1?: string;
    score2?: string;
    match_info?: string;
    match_status?: string;
    home_team?: string;
    away_team?: string;
    markets: Market[];
    match_odds?: MatchOddSummary[];
    competition_name?: string;
    competition?: {
        competition_id: string;
        competition_name: string;
        country_code?: string;
        sport?: {
            sport_id: string;
            sport_name: string;
        };
    };
}

export const sportsApi = {
    getLiveEvents: async (sportId?: string | number): Promise<Event[]> => {
        try {
            const url = sportId ? `/sports/live?sportId=${sportId}` : '/sports/live';
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error("Error fetching live events:", error);
            return [];
        }
    },
    getUpcomingEvents: async (sportId?: string | number): Promise<Event[]> => {
        try {
            const url = sportId ? `/sports/upcoming?sportId=${sportId}` : '/sports/upcoming';
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error("Error fetching upcoming events:", error);
            return [];
        }
    },
    /** Single round trip — returns merged live + upcoming from Redis-cached backend */
    getAllEvents: async (sportId?: string | number): Promise<Event[]> => {
        try {
            const url = sportId ? `/sports/all-events?sportId=${sportId}` : '/sports/all-events';
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error("Error fetching all events:", error);
            return [];
        }
    },
    getCompetitions: async () => {
        try {
            const response = await api.get('/sports/competitions');
            return response.data;
        } catch (error) {
            console.error("Error fetching competitions:", error);
            return [];
        }
    },
    getEventsBySport: async (sportId: number) => {
        try {
            const response = await api.get(`/sports/events/${sportId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching events by sport:", error);
            return [];
        }
    },
    getMatchDetails: async (matchId: string): Promise<Event> => {
        try {
            const response = await api.get(`/sports/db/match/${matchId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching match details:", error);
            throw error;
        }
    },
    getMatchDetailsData: async (sportId: string, matchId: string, userId?: string | number) => {
        try {
            const url = userId
                ? `/sports/match-details/${sportId}/${matchId}?userId=${userId}`
                : `/sports/match-details/${sportId}/${matchId}`;
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error("Error fetching diamond match details:", error);
            return null;
        }
    },
    getScorecardAndTvData: async (sportId: string, matchId: string) => {
        try {
            const response = await api.get(`/sports/scorecard-tv/${sportId}/${matchId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching tv and scorecard data:", error);
            return null;
        }
    },
    getTvUrl: async (sportId: string, matchId: string): Promise<string | null> => {
        try {
            const response = await api.get(`/sports/tv-url/${sportId}/${matchId}`);
            return response.data?.url || null;
        } catch (error) {
            console.error("Error fetching tv url:", error);
            return null;
        }
    },
    getScoreUrl: async (sportId: string, matchId: string): Promise<string | null> => {
        try {
            const response = await api.get(`/sports/score-url/${sportId}/${matchId}`);
            return response.data?.url || null;
        } catch (error) {
            console.error("Error fetching score url:", error);
            return null;
        }
    },
    getTopEvents: async () => {
        try {
            const response = await api.get('/sports/top-events');
            return response.data;
        } catch (error) {
            console.error("Error fetching top events:", error);
            return [];
        }
    },
    getHomeEvents: async () => {
        try {
            const response = await api.get('/sports/home-events');
            return response.data;
        } catch (error) {
            console.error("Error fetching home events:", error);
            return [];
        }
    },
    checkOdds: async (bets: { eventId?: string; marketId: string; selectionId: string; odds: number }[]) => {
        try {
            const response = await api.post('/sports/check-odds', { bets });
            return response.data as {
                success: boolean;
                results: {
                    marketId: string;
                    selectionId: string;
                    requestedOdds: number;
                    currentOdds: number | null;
                    changed: boolean;
                    suspended: boolean;
                }[];
            };
        } catch (error) {
            console.error("Error checking odds:", error);
            // Fail open — don't block bet placement if check itself fails
            return { success: false, results: [] };
        }
    },
    getTeamIcons: async (): Promise<Record<string, string>> => {
        try {
            const response = await api.get('/sports/team-icons');
            const icons: { team_name: string; icon_url: string }[] = response.data || [];
            const map: Record<string, string> = {};
            for (const i of icons) {
                map[i.team_name] = i.icon_url;
            }
            return map;
        } catch (error) {
            console.error("Error fetching team icons:", error);
            return {};
        }
    },
};
