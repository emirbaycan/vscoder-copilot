import * as vscode from 'vscode';

export interface Message {
    id?: string;
    type: string;
    content: string;
    data?: any;
    timestamp?: Date;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    code?: string;
}

export class ApiClient {
    private apiUrl: string;
    private pairingCode: string | null = null;
    private pollingInterval: number;
    private timeout: number;
    private discoveryService: any; // Will be injected

    constructor(apiUrl?: string, pollingInterval?: number, timeout?: number, discoveryService?: any) {
        // Get configuration from VS Code settings
        const config = vscode.workspace.getConfiguration('vscoder');
        
        this.apiUrl = apiUrl || config.get<string>('api.url', 'https://api.vscodercopilot.com.tr');
        this.pollingInterval = pollingInterval || config.get<number>('api.pollingInterval', 3000);
        this.timeout = timeout || config.get<number>('api.timeout', 10000);
        this.discoveryService = discoveryService;
        
        console.log('🔗 API Client initialized:', {
            url: this.apiUrl,
            pollingInterval: this.pollingInterval,
            timeout: this.timeout,
            hasDiscoveryService: !!this.discoveryService
        });
    }

    /**
     * Set discovery service for authentication
     */
    public setDiscoveryService(discoveryService: any): void {
        this.discoveryService = discoveryService;
    }

    /**
     * Get authentication headers using Discovery Service token
     */
    private getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        // Use Discovery Service token instead of generating our own
        if (this.discoveryService && this.discoveryService.getDeviceToken()) {
            headers['Authorization'] = `Bearer ${this.discoveryService.getDeviceToken()}`;
        }

        return headers;
    }

    /**
     * Get the device token from Discovery Service
     */
    public getDeviceToken(): string {
        return this.discoveryService?.getDeviceToken() || 'no-token';
    }

    /**
     * Fetch with timeout
     */
    private async fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    setPairingCode(pairingCode: string) {
        this.pairingCode = pairingCode;
        console.log('🔗 API Client pairing code set:', pairingCode);
    }

    /**
     * Send a message to the mobile app via Discovery API message broker
     */
    async sendMessage(message: Message): Promise<boolean> {
        if (!this.pairingCode) {
            console.error('❌ Cannot send message: No pairing code set');
            return false;
        }

        // Check if authenticated with Discovery Service
        if (!this.discoveryService?.isDeviceAuthenticated()) {
            console.error('❌ Cannot send message: Not authenticated with Discovery API');
            return false;
        }

        try {
            // Format message according to API specification
            const messagePayload = {
                target_pairing_code: this.pairingCode,
                type: message.type || 'response',
                command: message.data?.command || 'vscode_response',
                data: {
                    content: message.content,
                    success: true,
                    timestamp: new Date().toISOString(),
                    sender: 'vscode',
                    ...message.data
                }
            };

            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/v1/messages/send`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(messagePayload)
            });

            const result: ApiResponse = await response.json();
            
            if (result.success) {
                console.log('✅ Message sent successfully via Discovery API message broker:', message.type);
                return true;
            } else {
                console.error('❌ Failed to send message via Discovery API:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error sending message via Discovery API:', error);
            return false;
        }
    }

    /**
     * Get messages from the mobile app
     */
    async getMessages(): Promise<Message[]> {
        if (!this.pairingCode) {
            console.warn('⚠️ Cannot get messages: No pairing code set');
            return [];
        }

        try {
            // Use correct API endpoint format: /messages/{pairing_code}/{receiver}
            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/v1/messages/${this.pairingCode}/vscode`, {
                headers: this.getAuthHeaders()
            });
            const result: ApiResponse<{messages: Message[], count: number}> = await response.json();
            
            if (result.success && result.data) {
                console.log(`📨 Retrieved ${result.data.count} messages from mobile app`);
                return result.data.messages || [];
            } else {
                console.warn('⚠️ No messages available or API error:', result.error);
                return [];
            }
        } catch (error) {
            console.error('❌ Error getting messages:', error);
            return [];
        }
    }

    /**
     * Clear messages that have been processed
     */
    async clearMessages(): Promise<boolean> {
        if (!this.pairingCode) {
            return false;
        }

        try {
            // Use correct API endpoint format: DELETE /messages/{pairing_code}/{receiver}
            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/v1/messages/${this.pairingCode}/vscode`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            const result: ApiResponse = await response.json();
            
            if (result.success) {
                console.log('🧹 Messages cleared successfully');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Error clearing messages:', error);
            return false;
        }
    }

    /**
     * Get message queue status
     */
    async getQueueStatus(): Promise<{vscodeCount: number, mobileCount: number, active: boolean} | null> {
        if (!this.pairingCode) {
            return null;
        }

        try {
            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/v1/messages/${this.pairingCode}/status`, {
                headers: this.getAuthHeaders()
            });
            const result: ApiResponse<{
                vscode_message_count: number,
                mobile_message_count: number,
                active: boolean
            }> = await response.json();
            
            if (result.success && result.data) {
                return {
                    vscodeCount: result.data.vscode_message_count,
                    mobileCount: result.data.mobile_message_count,
                    active: result.data.active
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error getting queue status:', error);
            return null;
        }
    }

    /**
     * Start polling for messages from mobile app
     */
    startMessagePolling(onMessage: (message: Message) => void, intervalMs?: number): vscode.Disposable {
        const pollingInterval = intervalMs || this.pollingInterval;
        
        const interval = setInterval(async () => {
            try {
                const messages = await this.getMessages();
                
                if (messages.length > 0) {
                    console.log(`📨 Processing ${messages.length} new messages`);
                    
                    // Process each message
                    for (const message of messages) {
                        onMessage(message);
                    }
                    
                    // Clear processed messages
                    await this.clearMessages();
                }
            } catch (error) {
                console.error('❌ Error in message polling:', error);
            }
        }, pollingInterval);

        console.log(`🔄 Started message polling every ${pollingInterval}ms`);

        return new vscode.Disposable(() => {
            clearInterval(interval);
            console.log('🛑 Stopped message polling');
        });
    }

    /**
     * Send a command to the mobile app
     */
    async sendCommand(command: string, data?: any): Promise<boolean> {
        return await this.sendMessage({
            type: 'command',
            content: command,
            data: data
        });
    }

    /**
     * Send a response to the mobile app
     */
    async sendResponse(responseData: any, originalMessageId?: string): Promise<boolean> {
        return await this.sendMessage({
            type: 'response',
            content: 'Command response',
            data: {
                response: responseData,
                original_message_id: originalMessageId
            }
        });
    }

    /**
     * Send a notification to the mobile app
     */
    async sendNotification(title: string, message: string, data?: any): Promise<boolean> {
        return await this.sendMessage({
            type: 'notification',
            content: message,
            data: {
                title: title,
                ...data
            }
        });
    }

    /**
     * Test API connectivity
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.fetchWithTimeout(`${this.apiUrl}/health`);
            const result = await response.json();
            
            const isHealthy = result.status === 'ok' || result.status === 'healthy';
            console.log('🧪 API connection test:', isHealthy ? 'Success' : 'Failed', result);
            return isHealthy;
        } catch (error) {
            console.error('❌ API connection test failed:', error);
            return false;
        }
    }
}
