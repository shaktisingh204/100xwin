import api from './api';

export interface PaymentMethod {
    id: number;
    name: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    minAmount: number;
    maxAmount: number;
    fee: number;
    feeType: 'PERCENTAGE' | 'FIXED';
    isActive: boolean;
    details?: any;
    createdAt: string;
    updatedAt: string;
}

export const financeService = {
    getPaymentMethods: async () => {
        const response = await api.get<PaymentMethod[]>('/finance/methods');
        return response.data;
    },

    createPaymentMethod: async (data: any) => {
        const response = await api.post('/finance/methods', data);
        return response.data;
    },

    updatePaymentMethod: async (id: number, data: any) => {
        const response = await api.patch(`/finance/methods/${id}`, data);
        return response.data;
    },

    deletePaymentMethod: async (id: number) => {
        const response = await api.delete(`/finance/methods/${id}`);
        return response.data;
    },

    reconcile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/finance/reconcile', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};
