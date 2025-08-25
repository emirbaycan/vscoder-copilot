import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as https from 'https';
import * as os from 'os';

export interface DiscoveryConfig {
    apiUrl: string;
    deviceToken: string;
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

export class DiscoveryService {
    private config: DiscoveryConfig;
    private pairingCode: string | undefined;
    private registrationInterval: NodeJS.Timeout | undefined;
    private isRegistered: boolean = false;

    constructor(config: DiscoveryConfig) {
        this.config = config;
        this.pairingCode = config.pairingCode;
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
     * Get the local IP address and port
     */
    private getLocalAddress(port: number): string {
        // Get the local IP address
        const networkInterfaces = os.networkInterfaces();
        let localIP = '127.0.0.1';
        
        // Find the first non-internal IPv4 address
        for (const interfaceName in networkInterfaces) {
            const interfaces = networkInterfaces[interfaceName];
            if (interfaces) {
                for (const iface of interfaces) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        localIP = iface.address;
                        break;
                    }
                }
            }
            if (localIP !== '127.0.0.1') break;
        }
        
        return `${localIP}:${port}`;
    }

    /**
     * Register the VS Code extension with the discovery service
     */
    public async register(port: number): Promise<void> {
        if (!this.pairingCode) {
            this.generatePairingCode();
        }

        const registrationData: RegistrationRequest = {
            pairing_code: this.pairingCode!,
            ip_address: this.getLocalAddress(port),
            cert_fingerprint: this.generateCertFingerprint(),
            device_info: this.getDeviceInfo()
        };

        console.log('🔐 Registering device with discovery service:', {
            pairingCode: this.pairingCode,
            ipAddress: registrationData.ip_address,
            deviceName: registrationData.device_info.name
        });

        try {
            await this.makeApiRequest('/api/v1/register', 'POST', registrationData);
            this.isRegistered = true;
            
            // Show success message with pairing code
            vscode.window.showInformationMessage(
                `📱 VSCoder ready! Pairing code: ${this.pairingCode}\n` +
                `Share this code with your mobile app to connect securely.`,
                'Copy Code',
                'Show Instructions'
            ).then(selection => {
                if (selection === 'Copy Code') {
                    vscode.env.clipboard.writeText(this.pairingCode!);
                    vscode.window.showInformationMessage('✅ Pairing code copied to clipboard!');
                } else if (selection === 'Show Instructions') {
                    vscode.window.showInformationMessage(
                        'Mobile App Connection Instructions:\n' +
                        '1. Open VSCoder mobile app\n' +
                        '2. Go to Pairing/Connection section\n' +
                        '3. Enter this 6-digit code\n' +
                        '4. App will auto-discover and connect to this VS Code instance'
                    );
                }
            });

            // Start heartbeat
            this.startHeartbeat(port);
            
            console.log('✅ Device registered successfully');
        } catch (error: any) {
            console.error('❌ Registration failed:', error);
            
            // Enhanced error handling for different scenarios
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
            }
            
            vscode.window.showErrorMessage(errorMessage, ...actions).then(selection => {
                if (selection === 'Retry') {
                    // Retry registration after a delay
                    setTimeout(() => this.register(port), 5000);
                } else if (selection === 'Check Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'vscoder.discoveryApiUrl');
                } else if (selection === 'Check URL') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'vscoder.discoveryApiUrl');
                } else if (selection === 'Learn More') {
                    vscode.window.showInformationMessage(
                        'Rate Limiting Information:\n' +
                        '• Discovery service limits registration requests\n' +
                        '• This prevents abuse and ensures fair usage\n' +
                        '• Your registration will be retried automatically\n' +
                        '• Mobile apps can still connect once registered'
                    );
                }
            });
            
            throw error;
        }
    }

    /**
     * Start sending heartbeats to keep the registration active
     */
    private startHeartbeat(port: number): void {
        // Clear existing interval
        if (this.registrationInterval) {
            clearInterval(this.registrationInterval);
        }

        // Send heartbeat every 10 minutes (increased from 5 minutes to reduce API calls)
        this.registrationInterval = setInterval(async () => {
            try {
                await this.sendHeartbeat(port);
                console.log('💓 Heartbeat sent successfully');
            } catch (error: any) {
                console.error('❌ Heartbeat failed:', error);
                
                // Handle rate limiting gracefully
                if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                    console.log('⚠️ Heartbeat rate limited, will retry later');
                    // Don't try to re-register immediately on rate limit
                    return;
                }
                
                // Try to re-register if heartbeat fails for other reasons
                this.isRegistered = false;
                try {
                    console.log('🔄 Attempting re-registration after heartbeat failure...');
                    await this.register(port);
                } catch (registerError) {
                    console.error('❌ Re-registration failed:', registerError);
                }
            }
        }, 10 * 60 * 1000); // 10 minutes
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
            ip_address: this.getLocalAddress(port)
        };

        await this.makeApiRequest('/api/v1/heartbeat', 'PUT', heartbeatData);
    }

    /**
     * Unregister from the discovery service
     */
    public async unregister(): Promise<void> {
        if (this.registrationInterval) {
            clearInterval(this.registrationInterval);
            this.registrationInterval = undefined;
        }

        this.isRegistered = false;
        console.log('🛑 Unregistered from discovery service');
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
            const options: https.RequestOptions = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.deviceToken}`
                }
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
        
        const apiUrl = config.get<string>('discoveryApiUrl', 'https://vscoder.sabitfirmalar.com.tr');
        const deviceToken = config.get<string>('deviceToken', 'dev-token');
        const pairingCode = config.get<string>('pairingCode');

        return new DiscoveryService({
            apiUrl,
            deviceToken,
            pairingCode
        });
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
