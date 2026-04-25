import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.odd69.com/api';

const api = axios.create({
    baseURL: API_BASE,
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

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
    try {
        const res = await axios.post(
            `${API_BASE}/auth/refresh`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    ...(process.env.NEXT_PUBLIC_ADMIN_API_TOKEN
                        ? { 'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_API_TOKEN }
                        : {}),
                },
                withCredentials: true,
            },
        );
        const newToken = res.data?.access_token;
        if (newToken) {
            localStorage.setItem('token', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            return newToken;
        }
        return null;
    } catch {
        return null;
    }
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status;
        const originalRequest = error?.config;

        // Reactive refresh on 401 (skip the refresh endpoint itself)
        if (
            typeof window !== 'undefined' &&
            status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh')
        ) {
            originalRequest._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = tryRefreshToken().finally(() => {
                    isRefreshing = false;
                    refreshPromise = null;
                });
            }

            const newToken = await refreshPromise;
            if (newToken) {
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return api(originalRequest);
            }

            // Refresh failed — force logout
            localStorage.removeItem('token');
            localStorage.removeItem('auth_user');
            window.dispatchEvent(new CustomEvent('auth:logout'));
            return Promise.reject(error);
        }

        if (typeof window !== 'undefined' && (status === 401 || status === 403)) {
            localStorage.removeItem('token');
            localStorage.removeItem('auth_user');
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }

        return Promise.reject(error);
    },
);

export default api;
