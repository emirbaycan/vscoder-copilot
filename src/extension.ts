import * as vscode from 'vscode';
import { VSCoderServer } from './VSCoderServer';
import { CopilotBridge } from './copilotBridge';
import { copilotTester } from './copilotTester';
import { VSCoderDiagnostics } from './diagnostics';

// Add startup timestamp for debugging
console.log('📦 VSCoder extension module loaded at:', new Date().toISOString());
console.log('🔍 Node version:', process.version);
console.log('🔍 VS Code API version:', vscode.version);

let server: VSCoderServer | undefined;
let copilotBridge: CopilotBridge | undefined;
let pairingCodeStatusBar: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext) {
    try {
        console.log('🚀 VSCoder extension activation started');
        console.log('📍 Extension context:', {
            extensionPath: context.extensionPath,
            globalState: context.globalState,
            subscriptions: context.subscriptions.length
        });
        
        // Enhanced debugging
        console.log('🔍 Debug Info:', {
            vsCodeVersion: vscode.version,
            workspaceFolders: vscode.workspace.workspaceFolders?.length || 0,
            workspaceTrusted: vscode.workspace.isTrusted,
            extensionMode: context.extensionMode
        });

    // Initialize Copilot bridge
    console.log('🔧 Initializing Copilot bridge...');
    try {
        copilotBridge = new CopilotBridge();
        console.log('✅ Copilot bridge initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Copilot bridge:', error);
        console.warn('⚠️ Extension will continue without Copilot bridge');
        // Don't show error dialog that could block activation in production
        copilotBridge = undefined;
    }

    // Initialize status bar item for pairing code
    console.log('🔧 Initializing pairing code status bar...');
    try {
        pairingCodeStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        pairingCodeStatusBar.command = 'vscoder.troubleshootMobile'; // Changed to troubleshoot command
        pairingCodeStatusBar.tooltip = 'Click to view VSCoder mobile app connection status and troubleshooting';
        pairingCodeStatusBar.text = '$(device-mobile) VSCoder';
        context.subscriptions.push(pairingCodeStatusBar);
        console.log('✅ Pairing code status bar initialized');
    } catch (error) {
        console.error('❌ Failed to initialize status bar:', error);
    }

    console.log('🔄 Proceeding to auto-start handling...');
    
    // Function to update pairing code status bar
    function updatePairingCodeStatusBar(): void {
        if (!pairingCodeStatusBar) return;
        
        if (server) {
            const pairingCode = server.getPairingCode();
            const isRegistered = server.getDiscoveryService().isDeviceRegistered();
            const apiClient = server.getApiClient();
            
            if (pairingCode && isRegistered) {
                const apiStatus = apiClient ? '🔗' : '📱';
                pairingCodeStatusBar.text = `$(device-mobile) ${pairingCode} ${apiStatus}`;
                
                const connectionType = apiClient ? 'API Communication' : 'Local Network';
                const connectionUrl = `localhost:${server.getPort()}`;
                
                pairingCodeStatusBar.tooltip = `VSCoder Ready!\nPairing Code: ${pairingCode}\nConnection: ${connectionType}\nURL: ${connectionUrl}\nRegistered with discovery service\nClick to copy or get help`;
                pairingCodeStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
                pairingCodeStatusBar.show();
            } else if (pairingCode && !isRegistered) {
                pairingCodeStatusBar.text = `$(device-mobile) ${pairingCode} ⚠️`;
                pairingCodeStatusBar.tooltip = `VSCoder Warning\nPairing Code: ${pairingCode}\nNot registered with discovery service\nClick for troubleshooting`;
                pairingCodeStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                pairingCodeStatusBar.show();
            } else {
                pairingCodeStatusBar.text = '$(device-mobile) VSCoder ❌';
                pairingCodeStatusBar.tooltip = 'VSCoder server running but no pairing code available\nClick for troubleshooting';
                pairingCodeStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                pairingCodeStatusBar.show();
            }
        } else {
            pairingCodeStatusBar.text = '$(device-mobile) VSCoder (Stopped)';
            pairingCodeStatusBar.tooltip = 'VSCoder server is stopped. Click to start or troubleshoot.';
            pairingCodeStatusBar.backgroundColor = undefined;
            pairingCodeStatusBar.hide();
        }
    }
    
    // Auto-start server when workspace is trusted (async call)
    handleWorkspaceTrustAndAutoStart().catch(error => {
        console.error('❌ handleWorkspaceTrustAndAutoStart failed:', error);
    });

    // Helper function to start server
    async function startServer(): Promise<void> {
        if (server) {
            console.log('⚠️ Server already running');
            return;
        }

        const config = vscode.workspace.getConfiguration('vscoder');
        const port = config.get<number>('port', 8080); // Use port 8080 for consistency with mobile app
        console.log('⚙️ Server configuration:', { port });

        try {
            console.log('🚀 Creating VSCoder server instance...');
            server = new VSCoderServer(port, copilotBridge!);
            
            console.log('📡 Starting server...');
            await server.start();
            
            // Get the actual port being used (may be different due to auto-resolution)
            const actualPort = server.getPort();
            console.log('✅ Server started successfully on port', actualPort);
            
            vscode.window.showInformationMessage(`VSCoder server started`);
            
            // Update status bar with pairing code
            updatePairingCodeStatusBar();
        } catch (error) {
            console.error('❌ Failed to start server:', error);
        }
    }

    // Helper function to stop server
    function stopServer(): void {
        if (!server) {
            console.log('⚠️ No server running');
            vscode.window.showWarningMessage('VSCoder server is not running');
            return;
        }

        console.log('🔌 Stopping VSCoder server and all active processes...');
        
        try {
            // Stop the server which should also stop all sync monitoring
            server.stop();
            server = undefined;
            
            // Show comprehensive feedback to user
            vscode.window.showInformationMessage('✅ VSCoder server stopped - All sync processes halted');
            
            // Update status bar
            updatePairingCodeStatusBar();
        } catch (error) {
            console.error('❌ Error stopping server:', error);
            vscode.window.showErrorMessage(`Failed to stop VSCoder server: ${error}`);
        }
    }

    // Helper function to handle workspace trust and auto-start
    async function handleWorkspaceTrustAndAutoStart(): Promise<void> {
        console.log('🔒 Checking workspace trust...');
        
        // Check if workspace is trusted
        const isTrusted = vscode.workspace.isTrusted;
        console.log('🔒 Workspace trusted:', isTrusted);
        
        if (!isTrusted) {
            console.log('⚠️ Workspace not trusted, waiting for trust...');
            
            // Listen for workspace trust changes
            const disposable = vscode.workspace.onDidGrantWorkspaceTrust(async () => {
                console.log('✅ Workspace trust granted, auto-starting server...');
                await startServer();
                disposable.dispose();
            });
            
            // Log workspace trust requirement
            console.log('🔒 VSCoder requires workspace trust to access files. Please trust this workspace to enable the server.');
        } else {
            // Workspace is already trusted, auto-start server
            console.log('✅ Workspace is trusted, auto-starting server...');
            
            // Check if auto-start is enabled in configuration
            const config = vscode.workspace.getConfiguration('vscoder');
            const autoStart = config.get<boolean>('autoStart', true);
            
            console.log('🔧 Auto-start configuration:', autoStart);
            
            if (autoStart) {
                console.log('🚀 Attempting to start server...');
                await startServer();
                console.log('🚀 Server start attempt completed');
            } else {
                console.log('ℹ️ Auto-start disabled in configuration');
            }
        }
    }

    // Register commands
    console.log('📝 Registering VSCoder commands...');
    
    try {
        const startServerCommand = vscode.commands.registerCommand('vscoder.startServer', async () => {
            console.log('🎯 Start server command triggered');
            try {
                await startServer();
                console.log('✅ Start server command completed successfully');
            } catch (error) {
                console.error('❌ Start server command failed:', error);
            }
        });
        console.log('✅ startServerCommand registered');

        const stopServerCommand = vscode.commands.registerCommand('vscoder.stopServer', () => {
            console.log('🛑 Stop server command triggered');
            try {
                stopServer();
                console.log('✅ Stop server command completed successfully');
            } catch (error) {
                console.error('❌ Stop server command failed:', error);
            }
        });
        console.log('✅ stopServerCommand registered');

        // Essential commands for user interaction
        const showPairingCodeCommand = vscode.commands.registerCommand('vscoder.showPairingCode', () => {
            console.log('📱 Show pairing code command triggered');
            
            if (!server) {
                console.log('⚠️ Server not running');
                return;
            }

            const pairingCode = server.getPairingCode();
            if (pairingCode) {
                console.log('📱 Pairing code available:', pairingCode);
            } else {
                console.log('⚠️ No pairing code available');
            }
        });
        console.log('✅ showPairingCodeCommand registered');

        // Mobile app troubleshooting command
        const troubleshootMobileCommand = vscode.commands.registerCommand('vscoder.troubleshootMobile', async () => {
            console.log('🔧 Mobile troubleshooting command triggered');
            
            const serverRunning = !!server;
            const pairingCode = server?.getPairingCode();
            const isRegistered = server?.getDiscoveryService().isDeviceRegistered();
            const config = vscode.workspace.getConfiguration('vscoder');
            const discoveryUrl = config.get<string>('discoveryApiUrl');
            
            const diagnostics = [
                `🖥️ VS Code Extension: ${serverRunning ? '✅ Running' : '❌ Stopped'}`,
                `🔌 Server Port: ${server?.getPort() || 'N/A'}`,
                `📱 Pairing Code: ${pairingCode || '❌ Not Available'}`,
                `🌐 Discovery Registration: ${isRegistered ? '✅ Registered' : '❌ Not Registered'}`,
                `🔗 Discovery Service URL: ${discoveryUrl}`,
                `📂 Workspace: ${vscode.workspace.workspaceFolders?.length || 0} folder(s) open`,
                `🔒 Workspace Trusted: ${vscode.workspace.isTrusted ? '✅ Yes' : '❌ No'}`
            ];
            
            const actions: string[] = [];
            let issues: string[] = [];
            
            if (!serverRunning) {
                issues.push('Server not running');
                actions.push('Start Server');
            }
            
            if (!pairingCode) {
                issues.push('No pairing code available');
                actions.push('Generate Code');
            }
            
            if (!isRegistered) {
                issues.push('Not registered with discovery service');
                actions.push('Test Discovery');
            }
            
            if (!vscode.workspace.isTrusted) {
                issues.push('Workspace not trusted');
                actions.push('Trust Workspace');
            }
            
            actions.push('Copy Diagnostics', 'Show Guide');
            
            console.log(issues.length > 0 
                ? `⚠️ Found ${issues.length} issue(s): ${issues.join(', ')}`
                : `✅ Everything looks good!`);
            
            console.log('Diagnostics:', diagnostics.join('\n'));
        });
        console.log('✅ troubleshootMobileCommand registered');

        // Test validation request command (for debugging)
        const testValidationCommand = vscode.commands.registerCommand('vscoder.testValidation', async () => {
            console.log('🧪 Test validation command triggered');
            
            if (!server) {
                vscode.window.showErrorMessage('Server not running. Please start the server first.');
                return;
            }

            // Create a fake validation request to test the notification system
            const fakeValidationData = {
                validation_id: `test_val_${Date.now()}`,
                device_name: 'Test Mobile Device',
                platform: 'iOS',
                version: '17.0',
                ip_address: '192.168.1.100',
                requested_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
            };

            console.log('🧪 Triggering fake validation request:', fakeValidationData);
            
            // Call the validation handler directly to test it
            try {
                await (server as any).handleValidationRequest(fakeValidationData);
                console.log('✅ Test validation completed');
            } catch (error) {
                console.error('❌ Test validation failed:', error);
                vscode.window.showErrorMessage(`Test validation failed: ${error}`);
            }
        });
        console.log('✅ testValidationCommand registered');

        // Register essential commands only
        console.log('📋 Registering essential commands...');
        const commands = [
            startServerCommand,
            stopServerCommand,
            showPairingCodeCommand,
            troubleshootMobileCommand,
            testValidationCommand
        ];
        
        context.subscriptions.push(...commands);
        console.log(`✅ Registered ${commands.length} commands successfully`);

    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
    console.log('🎉 VSCoder extension activation completed!');
    } catch (error) {
        console.error('❌ VSCoder extension activation failed:', error);
        
        // Register a basic debug command even if activation fails
        try {
            const debugCommand = vscode.commands.registerCommand('vscoder.debug', () => {
                console.log(`VSCoder activation failed: ${error}`);
            });
            context.subscriptions.push(debugCommand);
        } catch (debugError) {
            console.error('❌ Failed to register debug command:', debugError);
        }
    }
}

export async function deactivate() {
    console.log('🔻 VSCoder extension deactivation started');
    
    if (server) {
        console.log('🛑 Stopping server during deactivation...');
        try {
            await server.stop();
            server = undefined;
            console.log('✅ Server stopped during deactivation');
        } catch (error) {
            console.error('❌ Error stopping server during deactivation:', error);
            server = undefined;
        }
    } else {
        console.log('ℹ️ No server to stop during deactivation');
    }
    
    // Clean up status bar
    if (pairingCodeStatusBar) {
        pairingCodeStatusBar.dispose();
        pairingCodeStatusBar = undefined;
        console.log('✅ Status bar disposed during deactivation');
    }
    
    console.log('🔻 VSCoder extension deactivation completed');
}
