import api from './api';

export interface AffiliateStats {
    totalCommission: number;
    totalReferrals: number;
    topAffiliates: {
        referrerId: number;
        username: string;
        email: string;
        totalCommission: number;
        referralCount: number;
    }[];
}

export interface CrmSegments {
    vip: number;
    new: number;
    active: number;
    churned: number;
    total: number;
}

export const crmService = {
    // Affiliate Stats
    getAffiliateStats: async () => {
        const response = await api.get<AffiliateStats>('/referral/admin/stats');
        return response.data;
    },

    // CRM Segments
    getSegments: async () => {
        const response = await api.get<CrmSegments>('/crm/segments');
        return response.data;
    },

    getSegmentUsers: async (segment: string, page = 1) => {
        const response = await api.get(`/crm/users?segment=${segment}&page=${page}`);
        return response.data;
    },

    sendNotification: async (segment: string, message: string) => {
        const response = await api.post('/crm/notify', { segment, message });
        return response.data;
    }
};
