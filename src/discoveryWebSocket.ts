import * as vscode from 'vscode';
import * as WebSocket from 'ws';

export interface WebSocketMessage {
    id?: string;
    messageId?: string; // Mobile app sends messageId at top level
    type: 'command' | 'response' | 'notification' | 'ping' | 'pong';
    command?: string;
    data?: any;
    timestamp?: string;
    sender?: string;
    target?: string;
}

export class DiscoveryWebSocketClient {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private reconnectInterval: NodeJS.Timeout | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private onMessageCallback: ((message: WebSocketMessage) => void) | null = null;
    private pairingCode: string | null = null;
    private deviceToken: string | null = null;
    private onAuthErrorCallback: (() => Promise<void>) | null = null; // NEW: Callback to trigger re-authentication

    constructor(
        private apiUrl: string,
        private onConnect?: () => void,
        private onDisconnect?: () => void,
        private onError?: (error: Error) => void
    ) {}

    /**
     * Set pairing code and device token for authentication
     */
    public setCredentials(pairingCode: string, deviceToken: string): void {
        this.pairingCode = pairingCode;
        this.deviceToken = deviceToken;
    }

    /**
     * Set callback to trigger re-authentication when 401 error occurs
     */
    public setOnAuthError(callback: () => Promise<void>): void {
        this.onAuthErrorCallback = callback;
    }

    /**
     * Set message handler callback
     */
    public setOnMessage(callback: (message: WebSocketMessage) => void): void {
        this.onMessageCallback = callback;
    }

    /**
     * Connect to Discovery API WebSocket
     */
    public async connect(): Promise<void> {
        try {
            if (this.ws) {
                this.disconnect();
            }

            if (!this.pairingCode || !this.deviceToken) {
                throw new Error('WebSocket credentials not set. Call setCredentials() first.');
            }

            let wsUrl = this.apiUrl.replace(/^https?:/, this.apiUrl.startsWith('https') ? 'wss:' : 'ws:');
            let fullWsUrl = `${wsUrl}/api/v1/messages/ws?token=${encodeURIComponent(this.deviceToken)}&pairing_code=${this.pairingCode}&device_type=vscode`;

            const ws = new (WebSocket as any)(fullWsUrl, {
                headers: {
                    'Authorization': `Bearer ${this.deviceToken}`,
                    'User-Agent': 'VSCode-Extension/1.0'
                }
            }) as WebSocket;

            ws.on('open', () => {
                this.isConnected = true;
                this.ws = ws;
                this.startHeartbeat();
                this.onConnect?.();

                this.send({
                    type: 'ping',
                    timestamp: new Date().toISOString(),
                    sender: 'vscode',
                    target: this.pairingCode || undefined
                });
            });

            ws.on('message', (data: WebSocket.Data) => {
                try {
                    const message: WebSocketMessage = JSON.parse(data.toString());
                    this.handleMessage(message);
                } catch (error) {
                    console.error('❌ Failed to parse WebSocket message:', error);
                }
            });

            ws.on('close', (code: number, reason: string) => {
                this.isConnected = false;
                this.stopHeartbeat();
                this.onDisconnect?.();
                
                if (code !== 1000) {
                    this.scheduleReconnect();
                }
            });

            ws.on('error', (error: Error) => {
                this.isConnected = false;
                this.onError?.(error);
                
                if (error.message.includes('401')) {
                    if (this.onAuthErrorCallback) {
                        this.onAuthErrorCallback()
                            .then(() => this.scheduleReconnectWithDelay(2000))
                            .catch(() => this.scheduleReconnectWithDelay(30000));
                    } else {
                        this.scheduleReconnectWithDelay(30000);
                    }
                } else {
                    this.scheduleReconnect();
                }
            });

        } catch (error) {
            console.error('❌ Failed to connect to WebSocket:', error);
            throw error;
        }
    }

    /**
     * Disconnect from WebSocket
     */
    public disconnect(): void {
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }

        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }

        this.isConnected = false;
    }

    /**
     * Send message to Discovery API
     */
    public send(message: WebSocketMessage): void {
        if (!this.isConnected || !this.ws) {
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('❌ Failed to send WebSocket message:', error);
        }
    }

    /**
     * Send response back to Discovery API
     */
    public sendResponse(messageId: string, data: any): void {
        this.send({
            type: 'response' as const,
            id: messageId,
            messageId: messageId,
            data: data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Check if WebSocket is connected
     */
    public isWebSocketConnected(): boolean {
        return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Force WebSocket reconnection
     */
    public async forceReconnect(): Promise<void> {
        this.disconnect();
        await this.connect();
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: WebSocketMessage): void {
        switch (message.type) {
            case 'command':
                const command = message.command || (message.data && message.data.command);
                
                if (command) {
                    const messageId = message.messageId || (message.data && message.data.messageId) || message.id;
                    
                    const normalizedMessage: WebSocketMessage = {
                        ...message,
                        id: messageId,
                        messageId: messageId,
                        command: command,
                        data: {
                            ...message.data,
                            messageId: messageId
                        }
                    };
                    
                    this.onMessageCallback?.(normalizedMessage);
                }
                break;

            case 'ping':
                this.send({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                });
                break;

            case 'pong':
                // Silent - no logging needed
                break;

            default:
                this.onMessageCallback?.(message);
                break;
        }
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void {
        this.stopHeartbeat();
        
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                });
            }
        }, 60000); // Ping every 60 seconds (reduced from 30s to minimize server load)
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect(): void {
        this.scheduleReconnectWithDelay(5000); // Default 5 seconds
    }

    /**
     * Schedule reconnection attempt with custom delay
     */
    private scheduleReconnectWithDelay(delayMs: number): void {
        if (this.reconnectInterval) {
            return;
        }

        this.reconnectInterval = setTimeout(async () => {
            this.reconnectInterval = null;
            try {
                await this.connect();
            } catch (error) {
                this.scheduleReconnect();
            }
        }, delayMs);
    }
}

/**
 * Create WebSocket client from VS Code configuration
 */
export function createWebSocketClient(): DiscoveryWebSocketClient {
    const config = vscode.workspace.getConfiguration('vscoder');
    const apiUrl = config.get<string>('discoveryApiUrl', 'https://api.vscodercopilot.com.tr');

    return new DiscoveryWebSocketClient(apiUrl);
}
