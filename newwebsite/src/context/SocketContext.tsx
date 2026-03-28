
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getConfiguredSocketEndpoint } from '@/utils/socketUrl';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user, token } = useAuth();
    const pathname = usePathname();
    const socketEndpoint = getConfiguredSocketEndpoint();
    const socketUrl = socketEndpoint?.url ?? null;
    const socketPath = socketEndpoint?.path ?? null;
    const shouldConnect = Boolean(pathname?.startsWith('/profile') || pathname?.startsWith('/sports'));

    useEffect(() => {
        if (!shouldConnect || !socketUrl || !socketPath) {
            setSocket(null);
            setIsConnected(false);
            return;
        }

        const socketInstance = io(socketUrl, {
            path: socketPath,
            transports: ['websocket'],
            autoConnect: true,
            auth: token ? { token } : {},
        });

        socketInstance.on('connect', () => {
            console.log('Socket Connected:', socketInstance.id);
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('Socket Disconnected');
            setIsConnected(false);
        });

        socketInstance.on('connect_error', () => {
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [shouldConnect, socketPath, socketUrl, token]);

    // Handle User Room Subscription
    useEffect(() => {
        if (socket && isConnected) {
            const userId = Number(user?.id || user?.userId); // Handle different user object shapes
            if (userId) {
                console.log('Joining User Room:', userId);
                socket.emit('subscribeToUserRoom', { userId });
            }
        }
    }, [socket, isConnected, user]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
