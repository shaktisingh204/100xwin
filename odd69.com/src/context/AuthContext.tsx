"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/services/api";

interface AuthContextType {
    user: any;
    token: string | null;
    loading: boolean;
    login: (token: string, userData: any) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AUTH_USER_KEY = "auth_user";

/** Decode a JWT payload without verifying the signature (client-side only). */
function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

/** Returns true if the JWT has not yet expired (60s leeway). */
function isTokenAlive(token: string): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 > Date.now() + 60_000;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const performLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem(AUTH_USER_KEY);
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
    };

    useEffect(() => {
        const storedToken = localStorage.getItem("token");

        if (storedToken && isTokenAlive(storedToken)) {
            // Token is valid — restore from localStorage without a network call
            setToken(storedToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

            const storedUser = localStorage.getItem(AUTH_USER_KEY);
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch {
                    // Corrupted cache — fetch from server
                    api.get('/auth/profile')
                        .then(res => {
                            setUser(res.data);
                            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.data));
                        })
                        .catch(() => { /* keep session alive, just no user details */ });
                }
            } else {
                // No cached user — fetch silently (non-blocking)
                api.get('/auth/profile')
                    .then(res => {
                        setUser(res.data);
                        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.data));
                    })
                    .catch(() => { /* keep session alive */ });
            }
        } else if (storedToken) {
            // Token exists but is expired — clear everything
            performLogout();
        }

        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = (newToken: string, userData: any) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const logout = () => {
        performLogout();
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
