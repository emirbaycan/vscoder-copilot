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
        
        vscode.window.showInformationMessage('🚀 VSCoder extension activated!');

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
            
            if (pairingCode && isRegistered) {
                pairingCodeStatusBar.text = `$(device-mobile) ${pairingCode}`;
                pairingCodeStatusBar.tooltip = `VSCoder Ready!\nPairing Code: ${pairingCode}\nRegistered with discovery service\nClick to copy or get help`;
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
            console.log('⚠️ Server already running, showing warning');
            vscode.window.showWarningMessage('VSCoder server is already running');
            return;
        }

        const config = vscode.workspace.getConfiguration('vscoder');
        const port = config.get<number>('port', 8080);
        console.log('⚙️ Server configuration:', { port });

        try {
            console.log('🚀 Creating VSCoder server instance...');
            server = new VSCoderServer(port, copilotBridge!);
            
            console.log('📡 Starting server...');
            await server.start();
            
            // Get the actual port being used (may be different due to auto-resolution)
            const actualPort = server.getPort();
            console.log('✅ Server started successfully on port', actualPort);
            
            if (actualPort !== port) {
                vscode.window.showInformationMessage(`VSCoder server started on port ${actualPort} (${port} was in use)`);
            } else {
                vscode.window.showInformationMessage(`VSCoder server started on port ${actualPort}`);
            }
            
            // Update status bar with pairing code
            updatePairingCodeStatusBar();
            
            // Show pairing code notification
            const pairingCode = server.getPairingCode();
            if (pairingCode) {
                vscode.window.showInformationMessage(
                    `📱 Your VSCoder pairing code is: ${pairingCode}`,
                    'Copy Code',
                    'Show in Status Bar'
                ).then(selection => {
                    if (selection === 'Copy Code') {
                        vscode.env.clipboard.writeText(pairingCode);
                        vscode.window.showInformationMessage('Pairing code copied to clipboard!');
                    }
                });
            }
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            vscode.window.showErrorMessage(`Failed to start VSCoder server: ${error}`);
        }
    }

    // Helper function to stop server
    function stopServer(): void {
        if (!server) {
            console.log('⚠️ No server running, showing warning');
            vscode.window.showWarningMessage('VSCoder server is not running');
            return;
        }

        console.log('🔌 Stopping server...');
        server.stop();
        server = undefined;
        console.log('✅ Server stopped successfully');
        vscode.window.showInformationMessage('VSCoder server stopped');
        
        // Update status bar
        updatePairingCodeStatusBar();
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
            
            // Show notification about workspace trust requirement
            const action = await vscode.window.showInformationMessage(
                '🔒 VSCoder requires workspace trust to access files. Please trust this workspace to enable the server.',
                'Trust Workspace'
            );
            
            if (action === 'Trust Workspace') {
                // Open workspace trust dialog
                await vscode.commands.executeCommand('workbench.trust.manage');
            }
        } else {
            // Workspace is already trusted, auto-start server
            console.log('✅ Workspace is trusted, auto-starting server...');
            
            // Check if auto-start is enabled in configuration
            const config = vscode.workspace.getConfiguration('vscoder');
            const autoStart = config.get<boolean>('autoStart', true);
            
            if (autoStart) {
                await startServer();
            } else {
                console.log('ℹ️ Auto-start disabled in configuration');
                vscode.window.showInformationMessage('VSCoder ready. Use "VSCoder: Start Server" to begin.');
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
                vscode.window.showErrorMessage(`Failed to start server: ${error}`);
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
                vscode.window.showErrorMessage(`Failed to stop server: ${error}`);
            }
        });
        console.log('✅ stopServerCommand registered');

        const autoStartCommand = vscode.commands.registerCommand('vscoder.autoStart', async () => {
            console.log('🤖 Auto-start command triggered');
            await handleWorkspaceTrustAndAutoStart();
        });
        console.log('✅ autoStartCommand registered');

        const showStatusCommand = vscode.commands.registerCommand('vscoder.showStatus', () => {
            console.log('📊 Status command triggered');
            const status = server ? `Running on port ${server.getPort()}` : 'Stopped';
            console.log('📊 Current status:', status);
            vscode.window.showInformationMessage(`VSCoder Status: ${status}`);
        });
        console.log('✅ showStatusCommand registered');

        const testCopilotCommand = vscode.commands.registerCommand('vscoder.testCopilot', async () => {
            console.log('🧪 Test Copilot command triggered');
            try {
                console.log('🧪 Running Copilot tests...');
                await copilotTester.runAllTests();
                console.log('✅ Copilot tests completed');
            } catch (error) {
                console.error('❌ Copilot test failed:', error);
            }
        });
        console.log('✅ testCopilotCommand registered');

        const diagnosticsCommand = vscode.commands.registerCommand('vscoder.runDiagnostics', async () => {
            console.log('🔍 Diagnostics command triggered');
            try {
                const diagnostics = new VSCoderDiagnostics();
                console.log('🔍 Running full diagnostics...');
                await diagnostics.runDiagnostics();
                console.log('✅ Diagnostics completed');
            } catch (error) {
                console.error('❌ Diagnostics failed:', error);
            }
        });
        console.log('✅ diagnosticsCommand registered');

        const copilotDiagnosticsCommand = vscode.commands.registerCommand('vscoder.copilotDiagnostics', async () => {
            console.log('🤖 Copilot diagnostics command triggered');
            
            if (!copilotBridge) {
                console.error('❌ Copilot bridge not initialized');
                vscode.window.showErrorMessage('Copilot bridge not initialized');
                return;
            }

            try {
                console.log('🤖 Running Copilot agent test...');
                
                const testRequest = {
                    type: 'agent' as const,
                    prompt: 'Test the agent integration',
                    agentMode: 'autonomous' as const
                };
                
                const response = await copilotBridge.handleCopilotRequest(testRequest);
                console.log('🤖 Copilot agent test result:', response);
                
                const output = vscode.window.createOutputChannel('VSCoder Copilot Agent Test');
                output.clear();
                output.appendLine('=== VSCoder Copilot Agent Test ===');
                output.appendLine(JSON.stringify(response, null, 2));
                output.show();
                
                vscode.window.showInformationMessage(
                    `Agent Test: ${response.success ? 'Success' : 'Failed'}. Check output for details.`,
                    'View Output'
                ).then(selection => {
                    if (selection === 'View Output') {
                        output.show();
                    }
                });
                
                console.log('✅ Copilot diagnostics completed successfully');
            } catch (error) {
                console.error('❌ Copilot diagnostics failed:', error);
                vscode.window.showErrorMessage(`Copilot diagnostics failed: ${error}`);
            }
        });
        console.log('✅ copilotDiagnosticsCommand registered');

        // Discovery Service Commands
        const showPairingCodeCommand = vscode.commands.registerCommand('vscoder.showPairingCode', () => {
            console.log('📱 Show pairing code command triggered');
            
            if (!server) {
                vscode.window.showWarningMessage(
                    'VSCoder server is not running. Start the server first.',
                    'Start Server'
                ).then(selection => {
                    if (selection === 'Start Server') {
                        vscode.commands.executeCommand('vscoder.startServer');
                    }
                });
                return;
            }

            const pairingCode = server.getPairingCode();
            if (pairingCode) {
                // Format the pairing code with spaces for readability
                const formattedCode = pairingCode.replace(/(\d{3})(\d{3})/, '$1 $2');
                
                // Get discovery service status for better user guidance
                const discoveryService = server.getDiscoveryService();
                const isRegistered = discoveryService.isDeviceRegistered();
                const statusText = isRegistered ? '✅ Registered with discovery service' : '⚠️ Not registered with discovery service';
                
                vscode.window.showInformationMessage(
                    `📱 Your VSCoder Pairing Code: ${formattedCode}\n${statusText}\n\nUse this code in your mobile app to connect securely.`,
                    'Copy Code',
                    'Generate New Code',
                    'Test Connection'
                ).then(selection => {
                    if (selection === 'Copy Code') {
                        vscode.env.clipboard.writeText(pairingCode);
                        vscode.window.showInformationMessage('✅ Pairing code copied to clipboard!');
                    } else if (selection === 'Generate New Code') {
                        vscode.commands.executeCommand('vscoder.generatePairingCode');
                    } else if (selection === 'Test Connection') {
                        vscode.commands.executeCommand('vscoder.testDiscoveryService');
                    }
                });
            } else {
                vscode.window.showWarningMessage(
                    'No pairing code available. The discovery service may not be registered. This might be due to rate limiting or network issues.',
                    'Generate Code',
                    'Test Discovery Service',
                    'Restart Server'
                ).then(selection => {
                    if (selection === 'Generate Code') {
                        vscode.commands.executeCommand('vscoder.generatePairingCode');
                    } else if (selection === 'Test Discovery Service') {
                        vscode.commands.executeCommand('vscoder.testDiscoveryService');
                    } else if (selection === 'Restart Server') {
                        vscode.commands.executeCommand('vscoder.stopServer');
                        setTimeout(() => vscode.commands.executeCommand('vscoder.startServer'), 1000);
                    }
                });
            }
        });
        console.log('✅ showPairingCodeCommand registered');

        const generateNewPairingCodeCommand = vscode.commands.registerCommand('vscoder.generatePairingCode', async () => {
            console.log('🔄 Generate new pairing code command triggered');
            
            if (!server) {
                vscode.window.showWarningMessage(
                    'VSCoder server is not running. Start the server first.',
                    'Start Server'
                ).then(selection => {
                    if (selection === 'Start Server') {
                        vscode.commands.executeCommand('vscoder.startServer');
                    }
                });
                return;
            }

            try {
                vscode.window.showInformationMessage('🔄 Generating new pairing code...');
                
                const discoveryService = server.getDiscoveryService();
                const newCode = discoveryService.generatePairingCode();
                await discoveryService.savePairingCodeToConfig();
                
                // Re-register with the new code
                await discoveryService.register(server.getPort());
                
                // Update status bar
                updatePairingCodeStatusBar();
                
                // Format the code for display
                const formattedCode = newCode.replace(/(\d{3})(\d{3})/, '$1 $2');
                
                vscode.window.showInformationMessage(
                    `🆕 New Pairing Code Generated: ${formattedCode}`,
                    'Copy Code',
                    'Show in Status Bar'
                ).then(selection => {
                    if (selection === 'Copy Code') {
                        vscode.env.clipboard.writeText(newCode);
                        vscode.window.showInformationMessage('✅ New pairing code copied to clipboard!');
                    }
                });
            } catch (error) {
                console.error('❌ Failed to generate new pairing code:', error);
                vscode.window.showErrorMessage(`Failed to generate new pairing code: ${error}`);
            }
        });
        console.log('✅ generateNewPairingCodeCommand registered');

        const quickTestCommand = vscode.commands.registerCommand('vscoder.quickTest', async () => {
            console.log('⚡ Quick test command triggered');
            
            const testResults = {
                timestamp: new Date().toISOString(),
                extensionActive: true,
                copilotBridgeInitialized: !!copilotBridge,
                serverRunning: !!server,
                serverPort: server?.getPort() || 'N/A',
                vscodeVersion: vscode.version,
                workspaceFolders: vscode.workspace.workspaceFolders?.length || 0
            };
            
            console.log('⚡ Quick test results:', testResults);
            
            const message = [
                `Extension: ${testResults.extensionActive ? '✅' : '❌'}`,
                `Copilot Bridge: ${testResults.copilotBridgeInitialized ? '✅' : '❌'}`, 
                `Server: ${testResults.serverRunning ? '✅ Port ' + testResults.serverPort : '❌ Stopped'}`,
                `Workspace: ${testResults.workspaceFolders} folder(s)`
            ].join(' | ');
            
            vscode.window.showInformationMessage(`VSCoder Status: ${message}`);
        });
        console.log('✅ quickTestCommand registered');

        const showAgentPromptCommand = vscode.commands.registerCommand('vscoder.showAgentPrompt', async () => {
            console.log('🤖 Show agent prompt command triggered');
            
            if (!copilotBridge) {
                vscode.window.showErrorMessage('Copilot bridge not initialized');
                return;
            }
            
            vscode.window.showInformationMessage('Agent prompt functionality is built into the agent responses. Check the Copilot Chat panel for agent interactions.');
        });
        console.log('✅ showAgentPromptCommand registered');

        const testDiscoveryServiceCommand = vscode.commands.registerCommand('vscoder.testDiscoveryService', async () => {
            console.log('🔍 Test discovery service command triggered');
            
            if (!server) {
                vscode.window.showWarningMessage('VSCoder server is not running. Start the server first.');
                return;
            }

            try {
                vscode.window.showInformationMessage('🔍 Testing discovery service connection...');
                
                const discoveryService = server.getDiscoveryService();
                const config = vscode.workspace.getConfiguration('vscoder');
                const discoveryApiUrl = config.get<string>('discoveryApiUrl', 'https://vscoder.sabitfirmalar.com.tr');
                
                // Test the connection with enhanced error handling
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout
                
                const response = await fetch(`${discoveryApiUrl}/health`, {
                    method: 'GET',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'VSCoder Extension',
                        'Accept': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.text();
                    const isRegistered = discoveryService.isDeviceRegistered();
                    const pairingCode = server.getPairingCode();
                    
                    vscode.window.showInformationMessage(
                        `✅ Discovery service is online and healthy!\n` +
                        `Registration Status: ${isRegistered ? 'Registered' : 'Not Registered'}\n` +
                        `Pairing Code: ${pairingCode || 'Not Available'}\n` +
                        `Mobile apps can now connect using the pairing code.`,
                        'Show Details',
                        'Copy Pairing Code'
                    ).then(selection => {
                        if (selection === 'Show Details') {
                            const output = vscode.window.createOutputChannel('VSCoder Discovery Test');
                            output.clear();
                            output.appendLine('=== Discovery Service Health Check ===');
                            output.appendLine(`URL: ${discoveryApiUrl}`);
                            output.appendLine(`Status: ${response.status} ${response.statusText}`);
                            output.appendLine(`Response: ${data}`);
                            output.appendLine(`Registration Status: ${isRegistered ? 'Registered' : 'Not Registered'}`);
                            output.appendLine(`Pairing Code: ${pairingCode || 'Not Available'}`);
                            output.appendLine(`Server Port: ${server?.getPort() || 'Unknown'}`);
                            output.appendLine(`Timestamp: ${new Date().toISOString()}`);
                            output.show();
                        } else if (selection === 'Copy Pairing Code' && pairingCode) {
                            vscode.env.clipboard.writeText(pairingCode);
                            vscode.window.showInformationMessage('✅ Pairing code copied to clipboard!');
                        }
                    });
                } else if (response.status === 429) {
                    vscode.window.showWarningMessage(
                        `⚠️ Discovery service rate limit exceeded (429). ` +
                        `The service is working but limiting requests. ` +
                        `Mobile apps may experience delays when connecting. ` +
                        `This is normal behavior to prevent abuse.`,
                        'OK',
                        'Check Rate Limits'
                    ).then(selection => {
                        if (selection === 'Check Rate Limits') {
                            vscode.window.showInformationMessage(
                                'Rate limits are in place to prevent abuse:\n' +
                                '• 60 requests per minute per IP\n' +
                                '• Mobile apps should use pairing codes for connection\n' +
                                '• Direct API calls are limited for security'
                            );
                        }
                    });
                } else {
                    vscode.window.showErrorMessage(
                        `❌ Discovery service returned ${response.status}: ${response.statusText}\n` +
                        `This may indicate service issues or network problems.`,
                        'Retry',
                        'Check URL'
                    ).then(selection => {
                        if (selection === 'Retry') {
                            vscode.commands.executeCommand('vscoder.testDiscoveryService');
                        } else if (selection === 'Check URL') {
                            vscode.commands.executeCommand('workbench.action.openSettings', 'vscoder.discoveryApiUrl');
                        }
                    });
                }
            } catch (error: any) {
                console.error('❌ Discovery service test failed:', error);
                
                let errorMessage = `❌ Cannot connect to discovery service: ${error.message || error}`;
                let actions = ['Check URL', 'Start Local Service'];
                
                if (error.name === 'AbortError') {
                    errorMessage = `❌ Discovery service connection timed out. ` +
                                  `This could indicate network issues or server overload.`;
                    actions = ['Retry', 'Check Network'];
                } else if (error.message?.includes('ECONNREFUSED')) {
                    errorMessage = `❌ Discovery service is not running or not accessible. ` +
                                  `Please check if the service is online.`;
                }
                
                vscode.window.showErrorMessage(errorMessage, ...actions).then(selection => {
                    if (selection === 'Check URL') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'vscoder.discoveryApiUrl');
                    } else if (selection === 'Start Local Service') {
                        vscode.window.showInformationMessage(
                            'To start a local discovery service:\n' +
                            '1. Check the API documentation\n' +
                            '2. Ensure the service is running on the correct port\n' +
                            '3. Update the discovery URL in settings'
                        );
                    } else if (selection === 'Retry') {
                        setTimeout(() => vscode.commands.executeCommand('vscoder.testDiscoveryService'), 2000);
                    } else if (selection === 'Check Network') {
                        vscode.window.showInformationMessage(
                            'Network troubleshooting:\n' +
                            '• Check internet connection\n' +
                            '• Verify firewall settings\n' +
                            '• Try again in a few minutes\n' +
                            '• Check if using VPN or proxy'
                        );
                    }
                });
            }
        });
        console.log('✅ testDiscoveryServiceCommand registered');

        // Command to run pending chat commands automatically
        const runPendingCommandsCommand = vscode.commands.registerCommand('vscoder.runPendingCommands', async () => {
            console.log('🔄 Run pending commands triggered');
            
            if (!copilotBridge) {
                vscode.window.showErrorMessage('Copilot bridge not initialized');
                return;
            }

            try {
                vscode.window.showInformationMessage('🔄 Looking for pending commands...');
                
                const result = await copilotBridge.runPendingCommands();
                
                if (result.success) {
                    const commandsRun = result.data?.commandsRun || 0;
                    if (commandsRun > 0) {
                        vscode.window.showInformationMessage(`✅ Executed ${commandsRun} pending command(s)`);
                    } else {
                        vscode.window.showInformationMessage('ℹ️ No pending commands found to execute');
                    }
                } else {
                    vscode.window.showErrorMessage(`❌ Failed to run pending commands: ${result.error}`);
                }
            } catch (error) {
                console.error('❌ Run pending commands failed:', error);
                vscode.window.showErrorMessage(`Failed to run pending commands: ${error}`);
            }
        });
        console.log('✅ runPendingCommandsCommand registered');

        // Command to continue iterating on the current task
        const continueIterationCommand = vscode.commands.registerCommand('vscoder.continueIteration', async () => {
            console.log('🔁 Continue iteration command triggered');
            
            if (!copilotBridge) {
                vscode.window.showErrorMessage('Copilot bridge not initialized');
                return;
            }

            try {
                vscode.window.showInformationMessage('🔁 Continuing iteration with Copilot agent...');
                
                const result = await copilotBridge.continueIteration();
                
                if (result.success) {
                    vscode.window.showInformationMessage('✅ Iteration continued successfully');
                } else {
                    vscode.window.showErrorMessage(`❌ Failed to continue iteration: ${result.error}`);
                }
            } catch (error) {
                console.error('❌ Continue iteration failed:', error);
                vscode.window.showErrorMessage(`Failed to continue iteration: ${error}`);
            }
        });
        console.log('✅ continueIterationCommand registered');

        // Command to auto-execute all actionable items
        const autoExecuteCommand = vscode.commands.registerCommand('vscoder.autoExecute', async () => {
            console.log('⚡ Auto execute command triggered');
            
            if (!copilotBridge) {
                vscode.window.showErrorMessage('Copilot bridge not initialized');
                return;
            }

            try {
                vscode.window.showInformationMessage('⚡ Auto-executing pending commands and continuing iteration...');
                
                // First run pending commands
                const pendingResult = await copilotBridge.runPendingCommands();
                let totalActions = 0;
                
                if (pendingResult.success) {
                    totalActions += pendingResult.data?.commandsRun || 0;
                }

                // Then continue iteration
                const iterationResult = await copilotBridge.continueIteration();
                if (iterationResult.success) {
                    totalActions += 1;
                }

                if (totalActions > 0) {
                    vscode.window.showInformationMessage(`✅ Auto-executed ${totalActions} action(s)`);
                } else {
                    vscode.window.showInformationMessage('ℹ️ No pending actions found to execute');
                }
            } catch (error) {
                console.error('❌ Auto execute failed:', error);
                vscode.window.showErrorMessage(`Failed to auto execute: ${error}`);
            }
        });
        console.log('✅ autoExecuteCommand registered');

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
            
            const message = issues.length > 0 
                ? `⚠️ Found ${issues.length} issue(s): ${issues.join(', ')}\n\n${diagnostics.join('\n')}`
                : `✅ Everything looks good!\n\n${diagnostics.join('\n')}`;
            
            vscode.window.showInformationMessage(message, ...actions).then(selection => {
                switch (selection) {
                    case 'Start Server':
                        vscode.commands.executeCommand('vscoder.startServer');
                        break;
                    case 'Generate Code':
                        vscode.commands.executeCommand('vscoder.generatePairingCode');
                        break;
                    case 'Test Discovery':
                        vscode.commands.executeCommand('vscoder.testDiscoveryService');
                        break;
                    case 'Trust Workspace':
                        vscode.commands.executeCommand('workbench.trust.manage');
                        break;
                    case 'Copy Diagnostics':
                        const diagnosticsText = [
                            '=== VSCoder Mobile App Diagnostics ===',
                            `Timestamp: ${new Date().toISOString()}`,
                            ...diagnostics,
                            issues.length > 0 ? `\nIssues Found: ${issues.join(', ')}` : '\nNo issues found',
                            '\n=== End Diagnostics ==='
                        ].join('\n');
                        vscode.env.clipboard.writeText(diagnosticsText);
                        vscode.window.showInformationMessage('📋 Diagnostics copied to clipboard!');
                        break;
                    case 'Show Guide':
                        vscode.window.showInformationMessage(
                            'Mobile App Connection Guide:\n\n' +
                            '1. ✅ Start VSCoder extension server\n' +
                            '2. ✅ Get 6-digit pairing code\n' +
                            '3. ✅ Open VSCoder mobile app\n' +
                            '4. ✅ Go to Pairing/Connection section\n' +
                            '5. ✅ Enter pairing code\n' +
                            '6. ✅ App auto-discovers VS Code\n' +
                            '7. ✅ Secure connection established\n\n' +
                            'Note: Mobile app should NOT connect directly to VS Code server. Use pairing for security!'
                        );
                        break;
                }
            });
        });
        console.log('✅ troubleshootMobileCommand registered');

        // Register all commands with context
        console.log('📋 Registering commands with context...');
        const commands = [
            startServerCommand,
            stopServerCommand,
            autoStartCommand,
            showStatusCommand,
            testCopilotCommand,
            diagnosticsCommand,
            copilotDiagnosticsCommand,
            showPairingCodeCommand,
            generateNewPairingCodeCommand,
            quickTestCommand,
            showAgentPromptCommand,
            testDiscoveryServiceCommand,
            runPendingCommandsCommand,
            continueIterationCommand,
            autoExecuteCommand,
            troubleshootMobileCommand
        ];
        
        context.subscriptions.push(...commands);
        console.log(`✅ Registered ${commands.length} commands successfully`);

    } catch (error) {
        console.error('❌ Failed to register commands:', error);
        vscode.window.showErrorMessage(`Failed to register VSCoder commands: ${error}`);
    }
    console.log('🎉 VSCoder extension activation completed!');
    } catch (error) {
        console.error('❌ VSCoder extension activation failed:', error);
        vscode.window.showErrorMessage(`VSCoder extension failed to activate: ${error}. Check Developer Console for details.`);
        
        // Register a basic debug command even if activation fails
        try {
            const debugCommand = vscode.commands.registerCommand('vscoder.debug', () => {
                vscode.window.showErrorMessage(`VSCoder activation failed: ${error}`);
            });
            context.subscriptions.push(debugCommand);
        } catch (debugError) {
            console.error('❌ Failed to register debug command:', debugError);
        }
    }
}

export function deactivate() {
    console.log('🔻 VSCoder extension deactivation started');
    
    if (server) {
        console.log('🛑 Stopping server during deactivation...');
        server.stop();
        server = undefined;
        console.log('✅ Server stopped during deactivation');
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
