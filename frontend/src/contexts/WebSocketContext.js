import React, { createContext, useContext, useEffect } from 'react';
import { wsManager } from '../api/websockets';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
    useEffect(() => {
        wsManager.connect();
        
        return () => {
            wsManager.disconnect();
        };
    }, []);

    return (
        <WebSocketContext.Provider value={wsManager}>
            {children}
        </WebSocketContext.Provider>
    );
}

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}; 