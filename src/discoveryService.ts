import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import * as os from 'os';

export interface DiscoveryConfig {
    apiUrl: string;
    deviceToken?: string; // Optional - will be generated during authentication
    pairingCode?: string;
}

export interface DeviceInfo {
    name: string;
    platform: string;
    version: string;
}

export interface RegistrationRequest {
    pairing_code: string;
    ip_address: string;
    cert_fingerprint: string;
    device_info: DeviceInfo;
}

export interface AuthenticationRequest {
    device_info: DeviceInfo;
}

export interface AuthenticationResponse {
    success: boolean;
    data?: {
        token: string;
        expires_at: string;
        created_at?: string;
    };
    message?: string;
    error?: string;
}

export class DiscoveryService {
    private config: DiscoveryConfig;
    private pairingCode: string | undefined;
    private registrationInterval: NodeJS.Timeout | undefined;
    private isRegistered: boolean = false;
    private deviceToken: string | undefined;
    private isAuthenticated: boolean = false;

    constructor(config: DiscoveryConfig) {
        this.config = config;
        this.pairingCode = config.pairingCode;
        
        // Don't trust device tokens from config - they might be expired
        // Always start unauthenticated and require fresh authentication
        this.deviceToken = undefined;
        this.isAuthenticated = false;
    }

    public async authenticateDevice(): Promise<boolean> {
        if (!this.pairingCode) {
            this.generatePairingCode();
        }

        try {
            const authRequest = {
                device_type: 'vscode',
                device_name: this.getDeviceInfo().name,
                pairing_code: this.pairingCode
            };

            const response = await this.makeApiRequest('/api/v1/auth/token', 'POST', authRequest) as AuthenticationResponse;

            if (response.success && response.data && response.data.token) {
                this.deviceToken = response.data.token;
                this.isAuthenticated = true;

                await this.saveTokenToConfig(this.deviceToken);

                return true;
            } else {
                throw new Error(response.error || 'Authentication failed');
            }
        } catch (error: any) {
            console.error('❌ VS Code extension authentication failed:', error);
            this.deviceToken = undefined;
            this.isAuthenticated = false;

            return false;
        }
    }

    /**
     * Check if device is authenticated
     */
    public isDeviceAuthenticated(): boolean {
        return this.isAuthenticated && !!this.deviceToken;
    }

    /**
     * Get the device token
     */
    public getDeviceToken(): string | undefined {
        return this.deviceToken;
    }

    /**
     * Get authentication headers for API requests
     */
    private getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.deviceToken) {
            headers['Authorization'] = `Bearer ${this.deviceToken}`;
        }

        return headers;
    }

    /**
     * Logout and clear authentication
     */
    public async logout(): Promise<void> {
        this.deviceToken = undefined;
        this.isAuthenticated = false;
        this.isRegistered = false;

        const config = vscode.workspace.getConfiguration('vscoder');
        await config.update('deviceToken', undefined, vscode.ConfigurationTarget.Global);

        if (this.registrationInterval) {
            clearInterval(this.registrationInterval);
            this.registrationInterval = undefined;
        }
    }

    /**
     * Generate a 6-digit pairing code
     */
    public generatePairingCode(): string {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        this.pairingCode = code;
        return code;
    }

    /**
     * Get the current pairing code
     */
    public getPairingCode(): string | undefined {
        return this.pairingCode;
    }

    /**
     * Generate a certificate fingerprint for the VS Code extension
     */
    private generateCertFingerprint(): string {
        // For development, we'll generate a consistent fingerprint based on the machine
        const machineId = os.hostname() + os.userInfo().username;
        const hash = crypto.createHash('sha256').update(machineId).digest('hex');
        return `sha256:${hash}`;
    }

    /**
     * Get device information
     */
    private getDeviceInfo(): DeviceInfo {
        return {
            name: `${os.userInfo().username}'s ${os.type()}`,
            platform: os.platform(),
            version: vscode.version
        };
    }

    /**
     * Get the public IP address and port for remote access
     */
    private async getPublicAddress(port: number): Promise<string> {
        const publicIpServices = [
            { url: 'https://api.ipify.org', isHttps: true },
            { url: 'https://ipinfo.io/ip', isHttps: true },
            { url: 'https://icanhazip.com', isHttps: true },
            { url: 'http://checkip.amazonaws.com', isHttps: false }
        ];
        
        for (const service of publicIpServices) {
            try {
                const publicIP = await this.makeHttpRequest(service.url, service.isHttps);
                
                const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                if (ipRegex.test(publicIP)) {
                    return `${publicIP}:${port}`;
                }
            } catch (serviceError) {
                // Try next service
            }
        }
        
        throw new Error('❌ Failed to get public IP address from all services. Remote access requires a public IP.');
    }

    /**
     * Make a simple HTTP request to get text response
     */
    private async makeHttpRequest(url: string, isHttps: boolean): Promise<string> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'VSCoder-Extension/1.0'
                },
                timeout: 5000
            };

            const protocol = isHttps ? https : http;
            const req = protocol.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data.trim());
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    /**
     * Authenticate the device with the discovery service
     * Public method to trigger authentication
     */
    public async authenticate(): Promise<void> {
        if (this.deviceToken && this.deviceToken.length < 20) {
            this.deviceToken = undefined;
            this.isAuthenticated = false;
        }

        const success = await this.authenticateDevice();
        if (!success) {
            throw new Error('Device authentication failed');
        }
    }

    /**
     * Register the VS Code extension with the discovery service
     */
    public async register(port: number): Promise<void> {
        if (!this.isAuthenticated && !await this.authenticateDevice()) {
            throw new Error('Cannot register: Device authentication failed');
        }

        if (!this.pairingCode) {
            this.generatePairingCode();
        }

        const registrationData: RegistrationRequest = {
            pairing_code: this.pairingCode!,
            ip_address: await this.getPublicAddress(port),
            cert_fingerprint: this.generateCertFingerprint(),
            device_info: this.getDeviceInfo()
        };

        try {
            await this.makeApiRequest('/api/v1/register', 'POST', registrationData);
            this.isRegistered = true;
            
            this.startHeartbeat(port);
        } catch (error: any) {
            console.error('❌ Registration failed:', error);
            
            let errorMessage = `Failed to register with discovery service: ${error.message || error}`;
            let actions = ['Retry', 'Check Settings'];
            
            if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                errorMessage = `Discovery service rate limit exceeded. ` +
                             `This is normal behavior to prevent abuse. ` +
                             `Registration will be retried automatically.`;
                actions = ['OK', 'Learn More'];
            } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
                errorMessage = `Cannot connect to discovery service. ` +
                             `Please check your internet connection and service URL.`;
                actions = ['Check URL', 'Retry'];
            } else if (error.message?.includes('public IP')) {
                errorMessage = `Failed to get public IP address. ` +
                             `Remote access requires a public IP. Please check your internet connection.`;
                actions = ['Retry', 'Check Network'];
            } else if (error.message?.includes('401') || error.message?.includes('403')) {
                errorMessage = `Authentication failed. Token may be expired. ` +
                             `Please reauthenticate the extension.`;
                actions = ['Reauthenticate', 'Check Settings'];
            }
            
            console.error('❌ Discovery service registration error:', errorMessage);
            
            throw error;
        }
    }

    /**
     * Start sending heartbeats to keep the registration active
     */
    private startHeartbeat(port: number): void {
        if (this.registrationInterval) {
            clearInterval(this.registrationInterval);
        }

        this.registrationInterval = setInterval(async () => {
            try {
                await this.sendHeartbeat(port);
            } catch (error: any) {
                console.error('❌ Heartbeat failed:', error);
                
                if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                    return;
                }
                
                this.isRegistered = false;
                try {
                    await this.register(port);
                } catch (registerError) {
                    console.error('❌ Re-registration failed:', registerError);
                }
            }
        }, 10 * 60 * 1000);
    }

    /**
     * Send heartbeat to keep registration active
     */
    private async sendHeartbeat(port: number): Promise<void> {
        if (!this.pairingCode) {
            throw new Error('No pairing code available');
        }

        const heartbeatData = {
            pairing_code: this.pairingCode,
            ip_address: await this.getPublicAddress(port) // Use public IP for heartbeat
        };

        await this.makeApiRequest('/api/v1/heartbeat', 'PUT', heartbeatData);
    }

    /**
     * Unregister from the discovery service
     */
    public async unregister(): Promise<void> {
        if (this.pairingCode) {
            try {
                await this.sendDisconnectNotification();
            } catch (error) {
                console.warn('⚠️ Failed to send disconnect notification:', error);
            }
        }
        
        if (this.registrationInterval) {
            clearInterval(this.registrationInterval);
            this.registrationInterval = undefined;
        }

        this.isRegistered = false;
        this.pairingCode = undefined;
    }

    private async sendDisconnectNotification(): Promise<void> {
        if (!this.pairingCode) {
            return;
        }

        const disconnectData = {
            pairing_code: this.pairingCode,
            device_token: this.deviceToken,
            reason: 'vscode_shutdown',
            device_info: {
                name: 'VS Code Extension',
                platform: process.platform,
                version: vscode.version
            }
        };

        return new Promise<void>((resolve, reject) => {
            const data = JSON.stringify(disconnectData);
            const url = new URL(`${this.config.apiUrl}/api/v1/device/disconnect`);
            
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    'User-Agent': 'VSCoder-Extension'
                }
            };

            const protocol = url.protocol === 'https:' ? https : http;
            const req = protocol.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        console.warn(`⚠️ Disconnect notification failed with status ${res.statusCode}: ${responseData}`);
                        resolve();
                    }
                });
            });

            req.on('error', (error) => {
                console.warn('⚠️ Error sending disconnect notification:', error.message);
                resolve();
            });

            req.setTimeout(5000, () => {
                req.destroy();
                console.warn('⚠️ Disconnect notification timed out');
                resolve();
            });

            req.write(data);
            req.end();
        });
    }

    /**
     * Check if the device is currently registered
     */
    public isDeviceRegistered(): boolean {
        return this.isRegistered;
    }

    /**
     * Make an API request to the discovery service
     */
    private async makeApiRequest(endpoint: string, method: string, data?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.config.apiUrl);
            
            // Use authentication headers instead of old config token
            const headers = this.getAuthHeaders();
            
            // For authentication endpoint, don't include auth header
            if (endpoint === '/api/v1/auth/token') {
                delete headers['Authorization'];
            }
            
            const options: https.RequestOptions = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: method,
                headers: headers
            };

            const protocol = url.protocol === 'https:' ? https : require('http');
            const req = protocol.request(options, (res: any) => {
                let responseData = '';

                res.on('data', (chunk: any) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject(new Error(`API request failed: ${res.statusCode} - ${response.error || 'Unknown error'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error}`));
                    }
                });
            });

            req.on('error', (error: any) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Create a discovery service from VS Code configuration
     */
    public static fromConfig(): DiscoveryService {
        const config = vscode.workspace.getConfiguration('vscoder');
        
        const apiUrl = config.get<string>('api.url', 'https://api.vscodercopilot.com.tr');
        const deviceToken = config.get<string>('deviceToken');
        const pairingCode = config.get<string>('pairingCode');

        if (deviceToken) {
            config.update('deviceToken', undefined, vscode.ConfigurationTarget.Global).then(
                undefined,
                (err: any) => console.warn('Warning: Failed to clear old device token from config:', err)
            );
        }

        return new DiscoveryService({
            apiUrl,
            deviceToken: undefined,
            pairingCode
        });
    }

    private async saveTokenToConfig(token: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('vscoder');
        await config.update('deviceToken', token, vscode.ConfigurationTarget.Global);
    }

    /**
     * Save current pairing code to VS Code configuration
     */
    public async savePairingCodeToConfig(): Promise<void> {
        if (this.pairingCode) {
            const config = vscode.workspace.getConfiguration('vscoder');
            await config.update('pairingCode', this.pairingCode, vscode.ConfigurationTarget.Global);
        }
    }
}
