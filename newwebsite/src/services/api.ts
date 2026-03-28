import axios from 'axios';

const api = axios.create({
    baseURL: typeof window === 'undefined' ? (process.env.API_URL || 'https://zeero.bet/api') : '/api', // Relative for client (rewrites), Absolute for SSR
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN;
    if (adminToken && config.headers) {
        config.headers['x-admin-token'] = adminToken;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export default api;
