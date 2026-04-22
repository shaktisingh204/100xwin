import api from './api';

export interface VipApplicationStatus {
    id: number;
    status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'TRANSFER_REQUESTED';
    message?: string;
    currentPlatform?: string;
    monthlyVolume?: number;
    assignedTier?: string;
    reviewNotes?: string;
    reviewedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface VipApplyDto {
    message?: string;
    currentPlatform?: string;
    platformUsername?: string;
    monthlyVolume?: number;
}

export interface TierConfig {
    key: string;
    name: string;
    color: string;
    lossbackPct: number;
    reloadBonusPct: number;
    priorityWithdrawal: boolean;
    dedicatedHost: boolean;
    freeWithdrawals: boolean;
    minDeposit: number;
}

export interface VipStatus {
    tier: string;
    tierConfig: TierConfig | null;
    nextTier: TierConfig | null;
    totalDeposited: number;
    totalWagered: number;
    memberSince: string;
}

export const vipApi = {
    /**
     * Submit a VIP application. Requires JWT token in cookies.
     */
    apply: async (data: VipApplyDto): Promise<{ id: number; status: string; createdAt: string }> => {
        const response = await api.post('/vip/apply', data);
        return response.data;
    },

    /**
     * Get the current user's VIP application status (or null if none).
     */
    getMyApplication: async (): Promise<VipApplicationStatus | null> => {
        try {
            const response = await api.get('/vip/my-application');
            return response.data;
        } catch {
            return null;
        }
    },

    getMyVipStatus: async (): Promise<VipStatus | null> => {
        try {
            const response = await api.get('/vip/my-status');
            return response.data;
        } catch {
            return null;
        }
    },
};
