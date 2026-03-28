import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

console.log('API Base URL:', api.defaults.baseURL);

api.interceptors.request.use((config) => {
    // Ensure headers exist
    config.headers = config.headers || {};

    // Add JWT Token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Add Admin Token
    const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN;
    if (adminToken) {
        config.headers['x-admin-token'] = adminToken;
    } else {
        if (typeof window !== 'undefined') {
            console.warn('⚠️ Admin API Token is missing in environment variables (NEXT_PUBLIC_ADMIN_API_TOKEN). Some admin actions may fail.');
        }
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error('API Unauthorized (401):', {
                url: error.config?.url,
                method: error.config?.method,
                hasAuthHeader: !!error.config?.headers?.Authorization,
                hasAdminToken: !!error.config?.headers?.['x-admin-token']
            });
            // Optional: Handle logout if needed
            // if (typeof window !== 'undefined') localStorage.removeItem('token');
        }
        return Promise.reject(error);
    }
);

export default api;
