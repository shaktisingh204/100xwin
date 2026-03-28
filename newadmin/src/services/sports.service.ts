import api from './api';

export interface Sport {
    sport_id: string;
    sport_name: string;
    market_count: number;
    isVisible: boolean;
    minBet?: number;
    maxBet?: number;
}

export interface Competition {
    competition_id: string;
    competition_name: string;
    sport_id: string;
    country_code?: string;
    market_count: number;
    isVisible: boolean;
}

export interface Event {
    event_id: string;
    event_name: string;
    competition_id: string;
    open_date: string;
    match_status: string;
    isVisible: boolean;
    competition?: Competition;
    sport_id?: string;
    sport_name?: string;
}

export const sportsService = {
    getSports: async () => {
        const response = await api.get<Sport[]>('/sports/list');
        return response.data;
    },

    getCompetitions: async (sportId?: string) => {
        const response = await api.get<Competition[]>(`/sports/competitions${sportId ? `?sportId=${sportId}` : ''}`);
        return response.data;
    },

    getEvents: async (sportId: string) => {
        const response = await api.get<Event[]>(`/sports/events/${sportId}`);
        return response.data;
    },

    // Load ALL events across all sports (live + upcoming from backend)
    getAllEvents: async (search = '') => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        const response = await api.get<Event[]>(`/sports/all-events?${params.toString()}`);
        return response.data;
    },

    updateSportLimits: async (id: string, minBet: number, maxBet: number) => {
        const response = await api.post(`/sports/limits/sport/${id}`, { minBet, maxBet });
        return response.data;
    },

    toggleSport: async (id: string, isVisible: boolean) => {
        const response = await api.post(`/sports/toggle/sport/${id}`, { isVisible });
        return response.data;
    },

    toggleCompetition: async (id: string, isVisible: boolean) => {
        const response = await api.post(`/sports/toggle/competition/${id}`, { isVisible });
        return response.data;
    },

    toggleEvent: async (id: string, isVisible: boolean) => {
        const response = await api.post(`/sports/toggle/event/${id}`, { isVisible });
        return response.data;
    },

    togglePopular: async (id: string, isPopular: boolean) => {
        const response = await api.post(`/sports/toggle/popular/${id}`, { isPopular });
        return response.data;
    },

    // Toggle whether an event appears on the home page
    toggleHomeEvent: async (id: string, isHome: boolean) => {
        const response = await api.post(`/sports/toggle/home/${id}`, { isHome });
        return response.data;
    },

    getTopEvents: async (): Promise<{ event_id: string }[]> => {
        const response = await api.get('/sports/top-events');
        return response.data;
    },

    getHomeEvents: async (): Promise<{ event_id: string }[]> => {
        const response = await api.get('/sports/home-events');
        return response.data;
    }
};
