import api from './api';

export interface AgentStats {
    totalUsers: number;
    totalMarketLiability: number;
    totalPlayerBalance: number;
}

export interface DownlineUser {
    id: number;
    username: string;
    role: string;
    balance: number;
    exposure: number;
    referrals?: DownlineUser[];
}

export const agentService = {
    getMyDownline: async (): Promise<DownlineUser[]> => {
        const response = await api.get('/agents/downline');
        return response.data;
    },

    getMyStats: async (): Promise<AgentStats> => {
        const response = await api.get('/agents/stats');
        return response.data;
    },

    createAgent: async (data: any) => {
        const response = await api.post('/agents/create', data);
        return response.data;
    }
};
