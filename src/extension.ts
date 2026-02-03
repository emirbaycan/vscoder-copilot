import * as vscode from 'vscode';
import { VSCoderServer } from './VSCoderServer';
import { CopilotBridge } from './copilotBridge';
import { copilotTester } from './copilotTester';
import { VSCoderDiagnostics } from './diagnostics';

let server: VSCoderServer | undefined;
let copilotBridge: CopilotBridge | undefined;
let pairingCodeStatusBar: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext) {
    try {
        try {
            copilotBridge = new CopilotBridge();
        } catch (error) {
            copilotBridge = undefined;
        }

        try {
            pairingCodeStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
            pairingCodeStatusBar.command = 'vscoder.troubleshootMobile';
            pairingCodeStatusBar.tooltip = 'Click to view VSCoder mobile app connection status and troubleshooting';
            pairingCodeStatusBar.text = '$(device-mobile) VSCoder';
            context.subscriptions.push(pairingCodeStatusBar);
        } catch (error) {
            // Silent
        }
    
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
    
    handleWorkspaceTrustAndAutoStart().catch(error => {
        console.error('❌ Activation error:', error);
    });

    async function startServer(): Promise<void> {
        if (server) {
            return;
        }

        const config = vscode.workspace.getConfiguration('vscoder');
        const port = config.get<number>('port', 8080);

        try {
            server = new VSCoderServer(port, copilotBridge!);
            await server.start();
            
            vscode.window.showInformationMessage(`VSCoder server started`);
            updatePairingCodeStatusBar();
        } catch (error) {
            console.error('❌ Failed to start server:', error);
        }
    }

    function stopServer(): void {
        if (!server) {
            vscode.window.showWarningMessage('VSCoder server is not running');
            return;
        }

        try {
            server.stop();
            server = undefined;
            vscode.window.showInformationMessage('✅ VSCoder server stopped');
            updatePairingCodeStatusBar();
        } catch (error) {
            console.error('❌ Error stopping server:', error);
            vscode.window.showErrorMessage(`Failed to stop VSCoder server: ${error}`);
        }
    }

    async function handleWorkspaceTrustAndAutoStart(): Promise<void> {
        const isTrusted = vscode.workspace.isTrusted;
        
        if (!isTrusted) {
            const disposable = vscode.workspace.onDidGrantWorkspaceTrust(async () => {
                await startServer();
                disposable.dispose();
            });
        } else {
            const config = vscode.workspace.getConfiguration('vscoder');
            const autoStart = config.get<boolean>('autoStart', true);
            
            if (autoStart) {
                await startServer();
            }
        }
    }

    try {
        const startServerCommand = vscode.commands.registerCommand('vscoder.startServer', async () => {
            try {
                await startServer();
            } catch (error) {
                console.error('❌ Start server command failed:', error);
            }
        });

        const stopServerCommand = vscode.commands.registerCommand('vscoder.stopServer', () => {
            try {
                stopServer();
            } catch (error) {
                console.error('❌ Stop server command failed:', error);
            }
        });

        const pauseSyncCommand = vscode.commands.registerCommand('vscoder.pauseSync', () => {
            try {
                if (!server) {
                    vscode.window.showWarningMessage('VSCoder server is not running');
                    return;
                }
                server.pause();
                vscode.window.showInformationMessage('VSCoder paused');
            } catch (error) {
                console.error('❌ Pause sync command failed:', error);
                vscode.window.showErrorMessage(`Failed to pause: ${error}`);
            }
        });

        const resumeSyncCommand = vscode.commands.registerCommand('vscoder.resumeSync', () => {
            try {
                if (!server) {
                    vscode.window.showWarningMessage('VSCoder server is not running');
                    return;
                }
                server.resume();
                vscode.window.showInformationMessage('VSCoder resumed');
            } catch (error) {
                console.error('❌ Resume sync command failed:', error);
                vscode.window.showErrorMessage(`Failed to resume: ${error}`);
            }
        });

        const showPairingCodeCommand = vscode.commands.registerCommand('vscoder.showPairingCode', () => {
            if (!server) {
                return;
            }

            const pairingCode = server.getPairingCode();
        });

        const troubleshootMobileCommand = vscode.commands.registerCommand('vscoder.troubleshootMobile', async () => {
            
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
        });

        const testValidationCommand = vscode.commands.registerCommand('vscoder.testValidation', async () => {
            if (!server) {
                vscode.window.showErrorMessage('Server not running. Please start the server first.');
                return;
            }

            const fakeValidationData = {
                validation_id: `test_val_${Date.now()}`,
                device_name: 'Test Mobile Device',
                platform: 'iOS',
                version: '17.0',
                ip_address: '192.168.1.100',
                requested_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
            };
            
            try {
                await (server as any).handleValidationRequest(fakeValidationData);
            } catch (error) {
                console.error('❌ Test validation failed:', error);
                vscode.window.showErrorMessage(`Test validation failed: ${error}`);
            }
        });

        const commands = [
            startServerCommand,
            stopServerCommand,
            pauseSyncCommand,
            resumeSyncCommand,
            showPairingCodeCommand,
            troubleshootMobileCommand,
            testValidationCommand
        ];
        
        context.subscriptions.push(...commands);

    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
    } catch (error) {
        console.error('❌ VSCoder extension activation failed:', error);
        
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
    if (server) {
        try {
            await server.stop();
            server = undefined;
        } catch (error) {
            console.error('❌ Error stopping server during deactivation:', error);
            server = undefined;
        }
    }
    
    if (pairingCodeStatusBar) {
        pairingCodeStatusBar.dispose();
        pairingCodeStatusBar = undefined;
    }
}
