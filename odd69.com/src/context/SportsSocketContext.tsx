"use client";

/**
 * SportsSocketContext
 *
 * Dedicated Socket.IO connection to the Zeero.bet external sports namespace:
 *   wss://api.zeero.bet/external
 *
 * This is separate from the platform SocketContext (used for wallet/bet updates).
 * It authenticates with the sports API token and handles:
 *   - join-match / leave-match room subscriptions
 *   - socket-data events with messageType "odds" and "market_status"
 *
 * Only connects when the user is on a /sports route.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

// ─── Config ────────────────────────────────────────────────────────────────
const SPORTS_WS_URL =
    process.env.NEXT_PUBLIC_SPORTS_WS_URL || 'https://zeero.bet';

const SPORTS_WS_NAMESPACE = '/external';

const SPORTS_API_TOKEN =
    process.env.NEXT_PUBLIC_SPORTS_API_TOKEN || 'ext_live_sports_abc123XYZ_changeMe2026';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface SportsOddsUpdate {
    messageType: 'odds';
    eventId: string; // matchId
    data: any[];     // array of markets with runners and odds
}

export interface SportsMarketStatusUpdate {
    messageType: 'market_status';
    eventId: string; // matchId
    id: string;      // marketId
    ms: 1 | 4;       // 1 = active, 4 = suspended
}

export type SportsSocketData = SportsOddsUpdate | SportsMarketStatusUpdate | { messageType: string; [key: string]: any };

interface SportsSocketContextType {
    sportsSocket: Socket | null;
    isSportsConnected: boolean;
    joinMatch: (matchId: string) => void;
    leaveMatch: (matchId: string) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────
const SportsSocketContext = createContext<SportsSocketContextType>({
    sportsSocket: null,
    isSportsConnected: false,
    joinMatch: () => {},
    leaveMatch: () => {},
});

export const useSportsSocket = () => useContext(SportsSocketContext);

// ─── Provider ────────────────────────────────────────────────────────────────
export const SportsSocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [sportsSocket, setSportsSocket] = useState<Socket | null>(null);
    const [isSportsConnected, setIsSportsConnected] = useState(false);
    const pathname = usePathname();
    const socketRef = useRef<Socket | null>(null);

    // Only connect on sports pages
    const shouldConnect = Boolean(pathname?.startsWith('/sports'));

    useEffect(() => {
        if (!shouldConnect) {
            // Clean up existing connection when leaving sports section
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSportsSocket(null);
                setIsSportsConnected(false);
            }
            return;
        }

        // Already connected — don't reconnect
        if (socketRef.current?.connected) return;

        const socketInstance = io(`${SPORTS_WS_URL}${SPORTS_WS_NAMESPACE}`, {
            auth: { token: SPORTS_API_TOKEN },
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketInstance.on('connect', () => {
            console.log('[SportsSocket] Connected:', socketInstance.id);
            setIsSportsConnected(true);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('[SportsSocket] Disconnected:', reason);
            setIsSportsConnected(false);
        });

        socketInstance.on('connect_error', (err) => {
            console.warn('[SportsSocket] Connection error:', err.message);
            setIsSportsConnected(false);
        });

        socketInstance.on('error', (err) => {
            console.error('[SportsSocket] Auth/server error:', err);
        });

        socketRef.current = socketInstance;
        setSportsSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
            socketRef.current = null;
            setSportsSocket(null);
            setIsSportsConnected(false);
        };
    }, [shouldConnect]);

    // ── Join/leave helpers ──────────────────────────────────────────────────
    const joinMatch = useCallback((matchId: string) => {
        const s = socketRef.current;
        if (!s?.connected) return;
        console.log('[SportsSocket] Joining match:', matchId);
        s.emit('join-match', matchId);
    }, []);

    const leaveMatch = useCallback((matchId: string) => {
        const s = socketRef.current;
        if (!s) return;
        console.log('[SportsSocket] Leaving match:', matchId);
        s.emit('leave-match', matchId);
    }, []);

    return (
        <SportsSocketContext.Provider value={{ sportsSocket, isSportsConnected, joinMatch, leaveMatch }}>
            {children}
        </SportsSocketContext.Provider>
    );
};
