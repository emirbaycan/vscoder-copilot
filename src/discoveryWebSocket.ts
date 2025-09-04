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

            // Use the real credentials set via setCredentials()
            if (!this.pairingCode || !this.deviceToken) {
                throw new Error('WebSocket credentials not set. Call setCredentials() first.');
            }

            console.log('🔌 Connecting to Discovery API WebSocket with real credentials...');
            console.log('🔑 Using pairing code:', this.pairingCode);
            console.log('🔑 Device token length:', this.deviceToken.length);
            console.log('🔑 Device token starts with:', this.deviceToken.substring(0, 8) + '...');

            // Convert HTTP URL to WebSocket URL (use standard ports - 443 for HTTPS, 80 for HTTP)
            let wsUrl = this.apiUrl.replace(/^https?:/, this.apiUrl.startsWith('https') ? 'wss:' : 'ws:');
            
            // Build WebSocket URL with real credentials and required device_type parameter
            let fullWsUrl = `${wsUrl}/api/v1/messages/ws?token=${encodeURIComponent(this.deviceToken)}&pairing_code=${this.pairingCode}&device_type=vscode`;
            
            console.log('🔗 WebSocket URL:', fullWsUrl.replace(this.deviceToken, '***TOKEN***')); // Log URL without exposing token

            // Node.js WebSocket client supports custom headers, unlike browser WebSocket
            this.ws = new WebSocket(fullWsUrl, {
                headers: {
                    'Authorization': `Bearer ${this.deviceToken}`,
                    'User-Agent': 'VSCode-Extension/1.0'
                }
            });

            this.ws.on('open', () => {
                console.log('✅ VS Code extension connected to Discovery API WebSocket with authentication');
                this.isConnected = true;
                this.startHeartbeat();
                this.onConnect?.();

                // Send initial authentication ping
                this.send({
                    type: 'ping',
                    timestamp: new Date().toISOString(),
                    sender: 'vscode',
                    target: this.pairingCode || undefined
                });
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                try {
                    const message: WebSocketMessage = JSON.parse(data.toString());
                    console.log('📨 Received WebSocket message:', message.type, message.id);
                    console.log('📨 RAW WebSocket message data:', data.toString());
                    console.log('📨 Parsed WebSocket message:', JSON.stringify(message, null, 2));
                    this.handleMessage(message);
                } catch (error) {
                    console.error('❌ Failed to parse WebSocket message:', error);
                    console.error('❌ Raw message data:', data.toString());
                }
            });

            this.ws.on('close', (code: number, reason: string) => {
                console.log(`🔌 WebSocket disconnected: ${code} - ${reason}`);
                this.isConnected = false;
                this.stopHeartbeat();
                this.onDisconnect?.();
                
                // Auto-reconnect unless manually disconnected
                if (code !== 1000) { // 1000 = normal closure
                    this.scheduleReconnect();
                }
            });

            this.ws.on('error', (error: Error) => {
                console.error('❌ WebSocket error:', error);
                this.isConnected = false;
                this.onError?.(error);
                
                // Provide more specific error information
                if (error.message.includes('401')) {
                    console.error('🔐 WebSocket Authentication Error: Invalid token or pairing code');
                    console.error('💡 This is normal when no mobile devices are paired yet. WebSocket will retry when devices pair.');
                    // Don't schedule aggressive reconnection for 401 - wait longer
                    this.scheduleReconnectWithDelay(30000); // 30 seconds instead of 5
                } else if (error.message.includes('404')) {
                    console.error('🔗 WebSocket Endpoint Error: WebSocket endpoint not found');
                    console.error('💡 Suggestion: Check if Discovery API server is running on correct port');
                    this.scheduleReconnect();
                } else if (error.message.includes('ECONNREFUSED')) {
                    console.error('🌐 WebSocket Connection Error: Cannot connect to Discovery API server');
                    console.error('💡 Suggestion: Check if Discovery API server is accessible');
                    this.scheduleReconnect();
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
        console.log('🔌 WebSocket disconnected manually');
    }

    /**
     * Send message to Discovery API
     */
    public send(message: WebSocketMessage): void {
        console.log('🔍 send() called with message:', message.type, message.id);
        console.log('🔍 WebSocket connection status:', {
            isConnected: this.isConnected,
            hasWebSocket: !!this.ws,
            readyState: this.ws?.readyState
        });
        
        if (!this.isConnected || !this.ws) {
            console.warn('⚠️ WebSocket not connected, cannot send message');
            console.warn('⚠️ isConnected:', this.isConnected, 'hasWebSocket:', !!this.ws);
            return;
        }

        try {
            const messageStr = JSON.stringify(message);
            console.log('📤 Sending WebSocket message:', message.type, message.id);
            console.log('📤 Full message being sent:', messageStr);
            this.ws.send(messageStr);
            console.log('✅ Message sent successfully via WebSocket');
        } catch (error) {
            console.error('❌ Failed to send WebSocket message:', error);
        }
    }

    /**
     * Send response back to Discovery API
     */
    public sendResponse(messageId: string, data: any): void {
        console.log('📤 Preparing to send WebSocket response for messageId:', messageId);
        console.log('📤 Response data:', JSON.stringify(data, null, 2));
        
        // SIMPLIFIED: Use the messageId directly - no fallbacks or complexity
        const responseMessage = {
            type: 'response' as const,
            id: messageId,
            messageId: messageId,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        console.log('📤 Sending WebSocket response:', JSON.stringify(responseMessage, null, 2));
        this.send(responseMessage);
        console.log('📤 Response sent with messageId:', messageId);
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
        console.log('🔄 Forcing WebSocket reconnection...');
        this.disconnect();
        await this.connect();
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: WebSocketMessage): void {
        switch (message.type) {
            case 'command':
                // Extract command from data object if it exists there
                const command = message.command || (message.data && message.data.command);
                console.log('📨 Received WebSocket message from Discovery API: command', command);
                console.log('📨 Full WebSocket message:', message);
                
                if (command) {
                    // SIMPLIFIED: Only use messageId from top level or data
                    const messageId = message.messageId || (message.data && message.data.messageId) || message.id;
                    
                    console.log('🔍 Using messageId:', messageId);
                    
                    // Create a normalized message with command at top level
                    const normalizedMessage: WebSocketMessage = {
                        ...message,
                        id: messageId,
                        messageId: messageId,
                        command: command,
                        data: {
                            ...message.data,
                            messageId: messageId  // Ensure messageId is in data for extension
                        }
                    };
                    
                    console.log('📤 Normalized message with ID:', JSON.stringify(normalizedMessage, null, 2));
                    this.onMessageCallback?.(normalizedMessage);
                } else {
                    console.log('⚠️ Received non-command message or missing command: command', command);
                }
                break;

            case 'ping':
                console.log('📤 Sent WebSocket message: ping', message.id);
                // Respond to ping with pong
                this.send({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                });
                break;

            case 'pong':
                console.log('� Received WebSocket message: pong', message.id);
                break;

            default:
                console.log('📨 Received message:', message.type);
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
        }, 30000); // Ping every 30 seconds
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
            return; // Already scheduled
        }

        console.log(`🔄 Scheduling WebSocket reconnection in ${delayMs / 1000} seconds...`);
        this.reconnectInterval = setTimeout(async () => {
            this.reconnectInterval = null;
            try {
                await this.connect();
            } catch (error) {
                console.error('❌ Reconnection failed:', error);
                // Schedule another reconnection with default delay
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

    return new DiscoveryWebSocketClient(
        apiUrl,
        () => {
            console.log('✅ WebSocket connected to Discovery API');
        },
        () => {
            console.log('🔌 WebSocket disconnected from Discovery API');
        },
        (error: Error) => {
            console.error('❌ WebSocket error:', error);
        }
    );
}
