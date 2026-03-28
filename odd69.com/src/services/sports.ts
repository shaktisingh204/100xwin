"use client";

import axios from 'axios';

// ─── External Sports API ───────────────────────────────────────────────────
// Base: https://api.zeero.bet/api/external/sports
// Auth: x-api-token header required on every request
const SPORTS_BASE_URL =
    (process.env.NEXT_PUBLIC_SPORTS_API_URL || 'https://api.zeero.bet/api/external/sports')
        .replace(/\/$/, '');

const SPORTS_API_TOKEN =
    process.env.NEXT_PUBLIC_SPORTS_API_TOKEN || 'ext_live_sports_abc123XYZ_changeMe2026';

const sportsAxios = axios.create({ baseURL: SPORTS_BASE_URL });

// Inject auth token on every sports request
sportsAxios.interceptors.request.use((config) => {
    if (config.headers) {
        config.headers['x-api-token'] = SPORTS_API_TOKEN;
    }
    return config;
});

// ─── Sport IDs Reference ───────────────────────────────────────────────────
export const SPORT_IDS = {
    CRICKET: 4,
    FOOTBALL: 1,
    TENNIS: 2,
    HORSE_RACING: 10,
    KABADDI: 66,
    POLITICS: 40,
    BASKETBALL: 15,
    BOXING: 6,
    VOLLEYBALL: 18,
    BADMINTON: 22,
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────
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

// ─── API Methods ───────────────────────────────────────────────────────────
export const sportsApi = {

    /** Full sport → competition → event navigation tree */
    getSidebar: async () => {
        try {
            const response = await sportsAxios.get('/sidebar');
            return response.data;
        } catch (error) {
            console.error('Error fetching sidebar:', error);
            return null;
        }
    },

    /** All sports list */
    getSportsList: async () => {
        try {
            const response = await sportsAxios.get('/list');
            return response.data;
        } catch (error) {
            console.error('Error fetching sports list:', error);
            return [];
        }
    },

    /** All live (in-play) events, optionally filtered by sportId */
    getLiveEvents: async (sportId?: string | number): Promise<Event[]> => {
        try {
            const url = sportId ? `/live?sportId=${sportId}` : '/live';
            const response = await sportsAxios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching live events:', error);
            return [];
        }
    },

    /** All upcoming events, optionally filtered by sportId */
    getUpcomingEvents: async (sportId?: string | number): Promise<Event[]> => {
        try {
            const url = sportId ? `/upcoming?sportId=${sportId}` : '/upcoming';
            const response = await sportsAxios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching upcoming events:', error);
            return [];
        }
    },

    /** Live + upcoming combined (recommended — saves a request) */
    getAllEvents: async (sportId?: string | number): Promise<Event[]> => {
        try {
            const url = sportId ? `/all-events?sportId=${sportId}` : '/all-events';
            const response = await sportsAxios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching all events:', error);
            return [];
        }
    },

    /** Featured home page events */
    getHomeEvents: async () => {
        try {
            const response = await sportsAxios.get('/home-events');
            return response.data;
        } catch (error) {
            console.error('Error fetching home events:', error);
            return [];
        }
    },

    /** Top/trending events across all sports */
    getTopEvents: async () => {
        try {
            const response = await sportsAxios.get('/top-events');
            return response.data;
        } catch (error) {
            console.error('Error fetching top events:', error);
            return [];
        }
    },

    /** All events for a specific sport */
    getEventsBySport: async (sportId: number) => {
        try {
            const response = await sportsAxios.get(`/events/${sportId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching events by sport:', error);
            return [];
        }
    },

    /** Events for a specific tournament/competition */
    getTournamentEvents: async (tournamentId: string | number) => {
        try {
            const response = await sportsAxios.get(`/tournament/${tournamentId}/events`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tournament events:', error);
            return [];
        }
    },

    /** Full match detail — markets, odds, runners */
    getMatchDetailsData: async (sportId: string, matchId: string, userId?: string | number) => {
        try {
            const url = userId
                ? `/match-details/${sportId}/${matchId}?userId=${userId}`
                : `/match-details/${sportId}/${matchId}`;
            const response = await sportsAxios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching match details:', error);
            return null;
        }
    },

    /** Match + all markets direct from DB */
    getMatchDetails: async (matchId: string): Promise<Event> => {
        try {
            const response = await sportsAxios.get(`/db/match/${matchId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching match from DB:', error);
            throw error;
        }
    },

    /** Active or suspended status for a match's markets */
    getMarketStatus: async (matchId: string) => {
        try {
            const response = await sportsAxios.get(`/market-status/${matchId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching market status:', error);
            return null;
        }
    },

    /** Live scorecard data */
    getScorecard: async (matchId: string) => {
        try {
            const response = await sportsAxios.get(`/scorecard/${matchId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching scorecard:', error);
            return null;
        }
    },

    /** Scorecard + live TV URL combined */
    getScorecardAndTvData: async (sportId: string, matchId: string) => {
        try {
            const response = await sportsAxios.get(`/scorecard-tv/${sportId}/${matchId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching scorecard+tv data:', error);
            return null;
        }
    },

    /** Live TV stream URL */
    getTvUrl: async (sportId: string, matchId: string): Promise<string | null> => {
        try {
            const response = await sportsAxios.get(`/tv-url/${sportId}/${matchId}`);
            return response.data?.url || null;
        } catch (error) {
            console.error('Error fetching TV URL:', error);
            return null;
        }
    },

    /** Score widget embed URL */
    getScoreUrl: async (sportId: string, matchId: string): Promise<string | null> => {
        try {
            const response = await sportsAxios.get(`/score-url/${sportId}/${matchId}`);
            return response.data?.url || null;
        } catch (error) {
            console.error('Error fetching score URL:', error);
            return null;
        }
    },

    /** Team name → icon URL mapping */
    getTeamIcons: async (): Promise<Record<string, string>> => {
        try {
            const response = await sportsAxios.get('/team-icons');
            const icons: { team_name: string; icon_url: string }[] = response.data || [];
            const map: Record<string, string> = {};
            for (const i of icons) {
                map[i.team_name.toLowerCase().trim()] = i.icon_url;
            }
            return map;
        } catch (error) {
            console.error('Error fetching team icons:', error);
            return {};
        }
    },

    /** Pre-bet odds validation (still calls platform backend) */
    checkOdds: async (bets: { eventId?: string; marketId: string; selectionId: string; odds: number }[]) => {
        try {
            // This still hits the platform backend for bet placement validation
            const { default: api } = await import('./api');
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
            console.error('Error checking odds:', error);
            return { success: false, results: [] };
        }
    },

    /** Competitions list (legacy — use getSidebar for full tree) */
    getCompetitions: async () => {
        try {
            const response = await sportsAxios.get('/sidebar');
            return response.data;
        } catch (error) {
            console.error('Error fetching competitions:', error);
            return [];
        }
    },
};
