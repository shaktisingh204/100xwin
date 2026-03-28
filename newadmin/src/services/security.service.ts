import api from './api';

export interface AdminUser {
    id: number;
    username: string;
    email: string;
    role: 'TECH_MASTER' | 'SUPER_ADMIN' | 'MANAGER' | 'USER';
    lastLogin?: string;
    isActive: boolean;
}

export const securityService = {
    getAdmins: async () => {
        // Fetch users with roles other than USER? 
        // Or fetch specific roles.
        // Let's fetch all and filter client side or use multiple requests?
        // Let's assume we can pass multiple roles or just fetch SUPER_ADMIN and MANAGER
        const [tech, superAdmin, manager] = await Promise.all([
            api.get('/user/list?role=TECH_MASTER&limit=100'),
            api.get('/user/list?role=SUPER_ADMIN&limit=100'),
            api.get('/user/list?role=MANAGER&limit=100')
        ]);

        return [
            ...(tech.data.users || []),
            ...(superAdmin.data.users || []),
            ...(manager.data.users || [])
        ];
    },

    updateUserRole: async (userId: number, role: string) => {
        const response = await api.patch(`/user/${userId}`, { role });
        return response.data;
    },

    // Audit Logs (Placeholder for now as backend service not fully built)
    getAuditLogs: async () => {
        // const response = await api.get('/audit-logs');
        return [];
    }
};
