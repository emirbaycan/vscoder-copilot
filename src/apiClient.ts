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

// ====== VALIDATION INTERFACES ======

export interface ValidationRequest {
    pairing_code: string;
    device_name: string;
    platform: string;
    version: string;
    ip_address?: string;
}

export interface ValidationResponse {
    success: boolean;
    validation_id?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'expired';
    message?: string;
    auth_token?: string;
    expires_at?: string;
    error?: string;
    code?: string;
}

export interface ValidationStatusResponse {
    success: boolean;
    validation_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    message: string;
    expires_at: string;
    auth_token?: string;
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
    }

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
            // Format message according to API specification - INCLUDES pairing_code for security validation
            const messagePayload = {
                pairing_code: this.pairingCode,  // ✅ REQUIRED: Pairing code for security validation
                sender: 'vscode',               // ✅ REQUIRED: Sender identification
                message: {
                    type: message.type || 'response',
                    content: message.content,
                    data: {
                        success: true,
                        timestamp: new Date().toISOString(),
                        command: message.data?.command || 'vscode_response',
                        ...message.data
                    }
                }
            };

            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/v1/messages/send`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(messagePayload)
            });

            const result: ApiResponse = await response.json();
            
            if (result.success) {
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


        return new vscode.Disposable(() => {
            clearInterval(interval);
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
            return isHealthy;
        } catch (error) {
            console.error('❌ API connection test failed:', error);
            return false;
        }
    }

    // ====== VALIDATION PIPELINE METHODS ======

    /**
     * Approve a validation request from mobile device
     */
    async approveValidation(validationId: string): Promise<ApiResponse> {
        try {
            
            const deviceToken = this.discoveryService?.getDeviceToken();
            if (!deviceToken) {
                throw new Error('No device token available for authentication');
            }

            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/v1/validation/approve/${validationId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${deviceToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (response.ok) {
                return {
                    success: true,
                    data: result,
                    message: 'Device validation approved successfully'
                };
            } else {
                console.error('❌ Failed to approve validation:', response.status, result);
                return {
                    success: false,
                    error: result.error || 'Failed to approve validation',
                    code: result.code || 'APPROVAL_FAILED'
                };
            }
        } catch (error) {
            console.error('❌ Error approving validation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error during validation approval'
            };
        }
    }

    /**
     * Check validation status
     */
    async checkValidationStatus(validationId: string): Promise<ApiResponse> {
        try {
            
            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/v1/validation/status/${validationId}`);
            const result = await response.json();
            
            if (response.ok) {
                return {
                    success: true,
                    data: result
                };
            } else {
                console.error('❌ Failed to get validation status:', response.status, result);
                return {
                    success: false,
                    error: result.error || 'Failed to get validation status',
                    code: result.code || 'STATUS_CHECK_FAILED'
                };
            }
        } catch (error) {
            console.error('❌ Error checking validation status:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error during validation status check'
            };
        }
    }

    /**
     * Request validation for device pairing (used by mobile devices)
     */
    async requestValidation(pairingCode: string, deviceInfo: any): Promise<ApiResponse> {
        try {
            
            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/v1/validation/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pairing_code: pairingCode,
                    device_name: deviceInfo.name || 'Unknown Device',
                    platform: deviceInfo.platform || 'mobile',
                    version: deviceInfo.version || '1.0.0'
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                return {
                    success: true,
                    data: result,
                    message: 'Validation request sent to VS Code extension'
                };
            } else {
                console.error('❌ Failed to request validation:', response.status, result);
                return {
                    success: false,
                    error: result.error || 'Failed to request validation',
                    code: result.code || 'REQUEST_FAILED'
                };
            }
        } catch (error) {
            console.error('❌ Error requesting validation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error during validation request'
            };
        }
    }
}
