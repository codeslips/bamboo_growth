class WebSocketManager {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimeout = 3000; // 3 seconds
        this.messageCallbacks = new Map();
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);
            this.setupEventListeners();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleReconnect();
        }
    }

    setupEventListeners() {
        this.ws.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('WebSocket connected');
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            console.log('WebSocket disconnected');
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${backoffTime/1000}s...`);
            setTimeout(() => this.connect(), backoffTime);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    handleMessage(message) {
        const { type, data } = message;
        if (this.messageCallbacks.has(type)) {
            this.messageCallbacks.get(type).forEach(callback => callback(data));
        }
    }

    subscribe(messageType, callback) {
        if (!this.messageCallbacks.has(messageType)) {
            this.messageCallbacks.set(messageType, new Set());
        }
        this.messageCallbacks.get(messageType).add(callback);
    }

    unsubscribe(messageType, callback) {
        if (this.messageCallbacks.has(messageType)) {
            this.messageCallbacks.get(messageType).delete(callback);
        }
    }

    send(type, data) {
        if (!this.isConnectedAndReady()) {
            console.error('WebSocket is not connected');
            return false;
        }

        try {
            const message = JSON.stringify({ type, data });
            this.ws.send(message);
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
            this.messageCallbacks.clear();
        }
    }

    isConnectedAndReady() {
        return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    resetConnection() {
        this.disconnect();
        this.reconnectAttempts = 0;
        this.connect();
    }
}

// Export a singleton instance
export const wsManager = new WebSocketManager('wss://growth.tingqi.xyz//mi/agent/ws?sender=fromLearningPlatform');
