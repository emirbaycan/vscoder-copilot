import * as vscode from 'vscode';
import { CopilotBridge, CopilotRequest } from './copilotBridge';
import { DiscoveryService } from './discoveryService';
import { ApiClient, Message } from './apiClient';
import { DiscoveryWebSocketClient, createWebSocketClient, WebSocketMessage } from './discoveryWebSocket';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// Terminal Session Management Interfaces
interface TerminalSessionData {
    id: string;
    name: string;
    cwd: string;
    terminal: vscode.Terminal;
    isActive: boolean;
    lastActivity: Date;
    createdAt: Date;
}

interface TerminalCommand {
    id: string;
    sessionId: string;
    command: string;
    output: string;
    timestamp: Date;
    exitCode?: number;
    isRunning: boolean;
}

export class VSCoderServer {
    private readonly DEBUG = false; // Set to true for verbose logging
    private readonly USE_MESSAGE_POOL = false; // Disabled by default to reduce server load
    
    private port: number;
    private copilotBridge: CopilotBridge;
    private discoveryService: DiscoveryService;
    private apiClient: ApiClient;
    private discoveryWebSocket: DiscoveryWebSocketClient;
    private messagePollingDisposable: vscode.Disposable | null = null;
    private sentMessages: Set<string> = new Set(); // Track sent message IDs
    private currentSessionId: string | null = null; // Track current session
    
    // Message Pool System (for debugging and monitoring only)
    private messagePool: Map<string, any> = new Map(); // Store messages by ID
    private messageSequence: number = 0; // Global message sequence number

    // Terminal Session Management
    private terminalSessions: Map<string, TerminalSessionData> = new Map();
    private terminalHistory: Map<string, TerminalCommand[]> = new Map();
    private terminalMonitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
    private terminalSyncTimeouts: Map<string, NodeJS.Timeout> = new Map();

    // Chat Sync Management
    private chatSyncTimeout: NodeJS.Timeout | null = null;
    private isChatSyncActive: boolean = false;

    // Terminal Sync Management
    private isTerminalSyncActive: boolean = false;

    // Sync Mutex - only one sync type can be active at a time
    private activeSyncType: 'chat' | 'terminal' | null = null;

    // Health check and cleanup intervals
    private webSocketHealthCheckInterval: NodeJS.Timeout | null = null;
    private sessionCleanupTimeout: NodeJS.Timeout | null = null;

    constructor(port: number, copilotBridge: CopilotBridge) {
        this.port = port;
        this.copilotBridge = copilotBridge;
        this.discoveryService = DiscoveryService.fromConfig();
        this.apiClient = new ApiClient(undefined, undefined, undefined, this.discoveryService);
        this.discoveryWebSocket = createWebSocketClient();
        
        this.copilotBridge.setCanSyncCallback(() => {
            return !!this.discoveryService.getPairingCode() && this.discoveryService.isDeviceAuthenticated();
        });
        
        this.copilotBridge.setProgressCallback(async (progressUpdate: any) => {
            if (!this.isChatSyncActive) {
                return;
            }
            
            if (!this.discoveryWebSocket || !this.discoveryWebSocket.isWebSocketConnected()) {
                return;
            }
            
            const progressMessage = {
                type: 'notification' as const,
                id: `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                data: progressUpdate,
                timestamp: new Date().toISOString()
            };
            
            try {
                this.discoveryWebSocket.send(progressMessage);
            } catch (error) {
                if (this.DEBUG) {
                    console.error('❌ Failed to send progress update:', error);
                }
            }
        });
        
        this.initializeTerminalManagement();
    }

    /**
     * Initialize terminal session management
     */
    private initializeTerminalManagement(): void {
        vscode.window.onDidCloseTerminal(terminal => {
            for (const [sessionId, session] of this.terminalSessions.entries()) {
                if (session.terminal === terminal) {
                    this.terminalSessions.delete(sessionId);
                    this.terminalHistory.delete(sessionId);
                    break;
                }
            }
        });
    }

    private generateMessageId(): string {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private hashContent(content: any): string {
        // Simple hash function for content deduplication
        const str = JSON.stringify(content);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `hash-${Math.abs(hash)}`;
    }

    private startNewSession(): void {
        this.currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.sentMessages.clear();
        this.messagePool.clear();
        this.messageSequence = 0;
        
        if (this.sessionCleanupTimeout) {
            clearTimeout(this.sessionCleanupTimeout);
        }
        
        this.sessionCleanupTimeout = setTimeout(() => {
            if (this.sentMessages.size > 100) {
                const messagesArray = Array.from(this.sentMessages);
                this.sentMessages = new Set(messagesArray.slice(-50));
            }
            
            this.cleanupMessagePool();
        }, 300000);
    }

    private cleanupMessagePool(): void {
        if (!this.USE_MESSAGE_POOL) { return; }
        
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        for (const [messageId, message] of this.messagePool.entries()) {
            if (message.timestamp && new Date(message.timestamp).getTime() < oneHourAgo) {
                this.messagePool.delete(messageId);
            }
        }
    }

    private addToMessagePool(message: any): string {
        const messageId = message.messageId || this.generateMessageId();
        
        if (this.USE_MESSAGE_POOL) {
            this.messageSequence++;
            const poolMessage = {
                ...message,
                messageId,
                sequence: this.messageSequence,
                timestamp: message.timestamp || new Date().toISOString(),
                sessionId: this.currentSessionId
            };
            this.messagePool.set(messageId, poolMessage);
        }
        
        return messageId;
    }

    /**
     * Set up WebSocket-based communication between VS Code and mobile app
     */
    private async setupApiCommunication(): Promise<void> {
        try {
            // Authentication should already be complete when this is called
            // Just verify we have valid credentials
            if (!this.discoveryService.isDeviceAuthenticated()) {
                console.error('❌ Device not authenticated - cannot setup WebSocket communication');
                return;
            }

            // Test API connection first
            const apiConnected = await this.apiClient.testConnection();
            if (!apiConnected) {
                console.warn('⚠️ API connection test failed, WebSocket communication may not work');
                return;
            }

            // Get pairing code from discovery service
            const pairingCode = this.discoveryService.getPairingCode();
            if (!pairingCode) {
                console.warn('⚠️ No pairing code available for WebSocket communication');
                return;
            }

            // Get device token from discovery service (should be fresh after authentication)
            const deviceToken = this.discoveryService.getDeviceToken();
            if (!deviceToken) {
                console.warn('⚠️ No device token available for WebSocket communication');
                return;
            }

            this.discoveryWebSocket.setCredentials(pairingCode, deviceToken);
            
            this.discoveryWebSocket.setOnAuthError(async () => {
                await this.discoveryService.authenticate();
                
                const newDeviceToken = this.discoveryService.getDeviceToken();
                if (newDeviceToken) {
                    this.discoveryWebSocket.setCredentials(pairingCode, newDeviceToken);
                } else {
                    throw new Error('Re-authentication succeeded but no token received');
                }
            });
            
            this.discoveryWebSocket.setOnMessage((message: WebSocketMessage) => {
                this.handleWebSocketMessage(message);
            });

            await this.discoveryWebSocket.connect();

            this.startWebSocketHealthCheck();

        } catch (error) {
            console.error('❌ Failed to setup WebSocket communication:', error);
        }
    }

    private handleWebSocketMessage(message: WebSocketMessage): void {
        if (this.DEBUG) {
            console.log('📨 Received WebSocket message:', message.type, message.id);
            console.log('📨 Full message:', JSON.stringify(message, null, 2));
            console.log('🔍 Validation check - type:', message.type);
            console.log('🔍 - data?.type:', message.data?.type);
            console.log('🔍 - validation_id:', message.data?.validation_id);
        }

        // Validation message detection
        const messageStr = JSON.stringify(message).toLowerCase();
        if (this.DEBUG && (messageStr.includes('validation') || messageStr.includes('approve'))) {
        }

        // Handle validation requests from mobile devices
        if (message.type === 'notification' && message.data?.type === 'validation_request') {
            this.handleValidationRequest(message.data);
            return;
        }

        if (message.type === 'notification' && message.data?.validation_id) {
            this.handleValidationRequest(message.data);
            return;
        }

        if ((message as any).validation_id || (message.data && JSON.stringify(message.data).toLowerCase().includes('validation'))) {
            this.handleValidationRequest(message.data || message);
            return;
        }

        const commandName = message.data?.command || message.command;
        
        if (message.type === 'command' && commandName) {
            const internalMessage: Message = {
                id: message.id || `ws-${Date.now()}`,
                type: 'command',
                content: commandName,
                data: message.data,
                timestamp: new Date()
            };

            this.handleMobileAppMessage(internalMessage)
                .then((result) => {
                    const originalMessageId = message.data?.messageId || message.messageId || message.id;
                    if (originalMessageId) {
                        this.discoveryWebSocket.sendResponse(originalMessageId, result);
                    }
                })
                .catch((error) => {
                    console.error('❌ Error processing command:', error);
                    const errorResponse = {
                        success: false,
                        error: error.message || 'Command processing failed',
                        ...(message.data?.messageId && { messageId: message.data.messageId })
                    };
                    const originalMessageId = message.data?.messageId || message.messageId || message.id;
                    if (originalMessageId) {
                        this.discoveryWebSocket.sendResponse(originalMessageId, errorResponse);
                    }
                });
        }
    }

    private async handleMobileAppMessage(message: Message): Promise<any> {
        try {
            switch (message.type) {
                case 'command':
                    return await this.handleMobileCommand(message);
                case 'copilot_request':
                    return await this.handleMobileCopilotRequest(message);
                case 'file_request':
                    return await this.handleMobileFileRequest(message);
                case 'ping':
                    return await this.handleMobilePing(message);
                default:
                    const errorResponse = {
                        error: 'Unknown message type',
                        type: message.type
                    };
                    
                    if (message.id) {
                        await this.apiClient.sendResponse(errorResponse, message.id);
                    }
                    
                    return errorResponse;
            }
        } catch (error) {
            console.error('❌ Error handling mobile app message:', error);
            const errorResponse = {
                error: 'Internal server error',
                details: String(error)
            };
            
            if (message.id) {
                await this.apiClient.sendResponse(errorResponse, message.id);
            }
            
            return errorResponse;
        }
    }

    /**
     * Check if the extension is properly paired with a mobile device
     * This prevents unpaired extensions from making API requests
     */
    private isPaired(): boolean {
        return this.discoveryService.isDeviceAuthenticated() && !!this.discoveryService.getPairingCode();
    }

    /**
     * Check if a command requires pairing to prevent API abuse
     * Only basic status commands are allowed without pairing
     */
    private requiresPairing(command: string): boolean {
        // Commands that don't require pairing (basic status/info only)
        const publicCommands = new Set([
            'ping',
            'get_workspace_info',
            'get_settings'
        ]);
        
        return !publicCommands.has(command);
    }

    /**
     * Handle command from mobile app
     */
    private async handleMobileCommand(message: Message): Promise<any> {
        const command = message.content;
        const data = message.data || {};

        const pairingRequiredCommands = this.requiresPairing(command);
        if (pairingRequiredCommands && !this.isPaired()) {
            const pairingError = {
                success: false,
                command: command,
                error: 'Device pairing required. This VS Code instance must be paired with a mobile device before making API requests.',
                errorCode: 'PAIRING_REQUIRED',
                pairingInstructions: 'Open the VSCoder mobile app and scan the pairing code to connect this VS Code instance.',
                pairingCode: this.discoveryService.getPairingCode(),
                ...(data.messageId && { messageId: data.messageId })
            };
            
            return pairingError;
        }

        try {
            let result;
            switch (command) {
                case 'get_workspace_info':
                    result = await this.getWorkspaceInfo();
                    break;
                case 'list_files':
                    result = await this.listFiles(data.path || '.');
                    break;
                case 'read_file':
                    result = await this.readFile(data.path);
                    break;
                case 'write_file':
                    result = await this.writeFile(data.path, data.content);
                    break;
                
                // Editor Operations
                case 'open_file':
                    result = await this.openFile(data.path);
                    break;
                case 'get_active_file':
                    result = await this.getActiveFile();
                    break;
                case 'focus_editor':
                    result = await this.focusEditor();
                    break;
                
                // System Operations
                case 'run_terminal':
                    result = await this.runTerminalCommand(data.command);
                    break;
                case 'run_vscode_command':
                    result = await this.runVSCodeCommand(data.command, data.args);
                    break;
                
                // Terminal Session Management
                case 'terminal_list_sessions':
                    result = await this.listTerminalSessions();
                    break;
                case 'terminal_create_session':
                    result = await this.createTerminalSession(data.name, data.cwd);
                    break;
                case 'terminal_get_history':
                    result = await this.getTerminalHistory(data.sessionId);
                    break;
                case 'terminal_execute_command':
                    result = await this.executeTerminalCommand(data.sessionId, data.cmd);
                    break;
                case 'terminal_kill_session':
                    result = await this.killTerminalSession(data.sessionId);
                    break;
                case 'terminal_focus_session':
                    result = await this.focusTerminalSession(data.sessionId);
                    break;
                case 'terminal_clear_session':
                    result = await this.clearTerminalSession(data.sessionId);
                    break;
                case 'terminal_copy_last_command':
                    result = await this.copyLastCommand(data.sessionId);
                    break;
                case 'terminal_copy_last_output':
                    result = await this.copyLastCommandOutput(data.sessionId);
                    break;
                case 'terminal_rename_session':
                    result = await this.renameTerminalSession(data.sessionId, data.newName);
                    break;
                case 'terminal_split_session':
                    result = await this.splitTerminalSession(data.sessionId);
                    break;
                    
                case 'request_terminal_sync':
                    result = await this.handleTerminalSyncRequest(data.sessionId);
                    break;
                    
                case 'request_chat_sync':
                    result = await this.handleChatSyncRequest();
                    break;
                
                // Copilot Operations
                case 'copilot_chat':
                    result = await this.handleCopilotChat(data.prompt, data.mode, data.agentMode);
                    break;
                case 'copilot_accept_edits':
                    result = await this.copilotBridge.acceptFileEdit();
                    break;
                case 'copilot_reject_edits':
                    result = await this.copilotBridge.rejectFileEdit();
                    break;
                case 'copilot_accept_all_edits':
                    result = await this.copilotBridge.acceptAllEdits();
                    break;
                case 'copilot_reject_all_edits':
                    result = await this.copilotBridge.rejectAllEdits();
                    break;
                case 'copilot_undo_edit':
                    result = await this.copilotBridge.undoEdit();
                    break;
                case 'copilot_redo_edit':
                    result = await this.copilotBridge.redoEdit();
                    break;
                case 'copilot_get_models':
                    result = await this.copilotBridge.getAvailableModels();
                    break;
                case 'copilot_change_model':
                    result = await this.copilotBridge.changeModel(data.modelName);
                    break;
                case 'copilot_switch_model':
                    result = await this.copilotBridge.switchToNextModel();
                    break;
                case 'copilot_manage_models':
                    result = await this.copilotBridge.manageModels();
                    break;
                case 'copilot_get_logs':
                    result = await this.copilotBridge.getRecentLogs();
                    break;
                case 'copilot_add_file_to_chat':
                    result = await this.addFileToChat(data.filePath);
                    break;
                case 'copilot_new_session':
                    result = await this.startNewCopilotSession();
                    break;
                case 'copilot_reload_extension':
                    result = await this.reloadCopilot();
                    break;
                 
                // Advanced File Operations
                case 'create_file':
                    result = await this.createFile(data.path, data.content || '');
                    break;
                case 'delete_file':
                    result = await this.deleteFile(data.path);
                    break;
                case 'rename_file':
                    result = await this.renameFile(data.oldPath, data.newPath);
                    break;
                case 'create_directory':
                    result = await this.createDirectory(data.path);
                    break;
                case 'copy_file':
                    result = await this.copyFile(data.sourcePath, data.destinationPath);
                    break;
                
                // Search and Navigation
                case 'search_files':
                    result = await this.searchInFiles(data.query, data.includePattern, data.excludePattern);
                    break;
                case 'find_files':
                    result = await this.findFiles(data.pattern);
                    break;
                case 'go_to_definition':
                    result = await this.goToDefinition(data.filePath, data.line, data.character);
                    break;
                case 'find_references':
                    result = await this.findReferences(data.filePath, data.line, data.character);
                    break;
                
                // Git Operations  
                case 'git_status':
                    result = await this.getGitStatus();
                    break;
                case 'git_add':
                    result = await this.gitAdd(data.files);
                    break;
                case 'git_commit':
                    result = await this.gitCommit(data.message);
                    break;
                case 'git_push':
                    result = await this.gitPush();
                    break;
                case 'git_pull':
                    result = await this.gitPull();
                    break;
                case 'git_checkout':
                    result = await this.gitCheckout(data.branch);
                    break;
                case 'get_git_branches':
                    result = await this.getGitBranches();
                    break;
                
                // Language Server Operations
                case 'format_document':
                    result = await this.formatDocument(data.filePath);
                    break;
                case 'get_diagnostics':
                    result = await this.getDiagnostics(data.filePath);
                    break;
                
                // Settings Operations
                case 'update_settings':
                    result = await this.updateSettings(data.settings);
                    break;
                case 'get_settings':
                    result = await this.getSettings();
                    break;

                // Extension Operations
                case 'reload_extension':
                    result = await this.reloadWindow();
                    break;
                
                default:
                    throw new Error(`Unknown command: ${command}`);
            }

            const response = {
                success: true,
                command: command,
                result: result,
                // SIMPLIFIED: Only use messageId
                ...(data.messageId && { messageId: data.messageId })
            };

            // For backward compatibility with API-based communication, still send via apiClient if message has ID
            if (message.id) {
                await this.apiClient.sendResponse(response, message.id);
            }

            // Always return the response for WebSocket handling
            return response;

        } catch (error) {
            const errorResponse = {
                success: false,
                command: command,
                error: String(error),
                // SIMPLIFIED: Only use messageId
                ...(data.messageId && { messageId: data.messageId })
            };

            // For backward compatibility with API-based communication
            if (message.id) {
                await this.apiClient.sendResponse(errorResponse, message.id);
            }

            // Always return the error response for WebSocket handling
            return errorResponse;
        }
    }

    /**
     * Handle Copilot request from mobile app
     */
    private async handleMobileCopilotRequest(message: Message): Promise<any> {
        // 🔒 PAIRING PROTECTION: Copilot requests require pairing to prevent API abuse
        if (!this.isPaired()) {
            const pairingError = {
                success: false,
                error: 'Device pairing required for Copilot requests. This VS Code instance must be paired with a mobile device first.',
                errorCode: 'PAIRING_REQUIRED',
                pairingInstructions: 'Open the VSCoder mobile app and scan the pairing code to connect this VS Code instance.',
                pairingCode: this.discoveryService.getPairingCode()
            };
            
            
            // For backward compatibility with API-based communication
            if (message.id) {
                await this.apiClient.sendResponse(pairingError, message.id);
            }
            
            return pairingError;
        }

        const copilotRequest = message.data as CopilotRequest;
        

        try {
            const response = await this.copilotBridge.handleCopilotRequest(copilotRequest);
            
            const result = {
                success: true,
                copilot_response: response
            };

            // For backward compatibility with API-based communication
            if (message.id) {
                await this.apiClient.sendResponse(result, message.id);
            }

            return result;

        } catch (error) {
            const errorResult = {
                success: false,
                error: 'Copilot request failed',
                details: String(error)
            };

            // For backward compatibility with API-based communication
            if (message.id) {
                await this.apiClient.sendResponse(errorResult, message.id);
            }

            return errorResult;
        }
    }

    /**
     * Handle file request from mobile app
     */
    private async handleMobileFileRequest(message: Message): Promise<any> {
        // 🔒 PAIRING PROTECTION: File operations require pairing to prevent API abuse
        if (!this.isPaired()) {
            const pairingError = {
                success: false,
                error: 'Device pairing required for file operations. This VS Code instance must be paired with a mobile device first.',
                errorCode: 'PAIRING_REQUIRED',
                pairingInstructions: 'Open the VSCoder mobile app and scan the pairing code to connect this VS Code instance.',
                pairingCode: this.discoveryService.getPairingCode()
            };
            
            
            // For backward compatibility with API-based communication
            if (message.id) {
                await this.apiClient.sendResponse(pairingError, message.id);
            }
            
            return pairingError;
        }

        const { action, path, content } = message.data || {};

        try {
            let result;
            switch (action) {
                case 'read':
                    result = await this.readFile(path);
                    break;
                case 'write':
                    result = await this.writeFile(path, content);
                    break;
                case 'list':
                    result = await this.listFiles(path || '.');
                    break;
                default:
                    throw new Error(`Unknown file action: ${action}`);
            }

            const response = {
                success: true,
                action: action,
                result: result
            };

            // For backward compatibility with API-based communication
            if (message.id) {
                await this.apiClient.sendResponse(response, message.id);
            }

            return response;

        } catch (error) {
            const errorResponse = {
                success: false,
                action: action,
                error: String(error)
            };

            // For backward compatibility with API-based communication
            if (message.id) {
                await this.apiClient.sendResponse(errorResponse, message.id);
            }

            return errorResponse;
        }
    }

    /**
     * Handle ping from mobile app
     */
    private async handleMobilePing(message: Message): Promise<any> {
        const response = {
            pong: true,
            timestamp: new Date().toISOString(),
            server_info: {
                port: this.port
            }
        };

        // For backward compatibility with API-based communication
        if (message.id) {
            await this.apiClient.sendResponse(response, message.id);
        }

        return response;
    }

    /**
     * Send notification to mobile app via API
     */
    public async sendMobileNotification(title: string, message: string, data?: any): Promise<boolean> {
        return await this.apiClient.sendNotification(title, message, data);
    }

    /**
     * Get API client instance
     */
    public getApiClient(): ApiClient {
        return this.apiClient;
    }

    public async start(): Promise<void> {
        
        try {
            await this.discoveryService.authenticate();
            
            await this.discoveryService.register(this.port);
            
            // Set up remote WebSocket-based communication only
            await this.setupApiCommunication();
            
            // DO NOT start automatic chat sync - wait for mobile app to request it
            
        } catch (error) {
            console.error('❌ Failed to start VSCoder WebSocket communication:', error);
            throw error;
        }
    }

    private async openFile(filePath: string): Promise<any> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            return { 
                success: true, 
                message: `File opened: ${filePath}`,
                path: filePath
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    private async getActiveFile(): Promise<any> {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                return { 
                    success: true, 
                    activeFile: null,
                    message: 'No active file'
                };
            }

            const document = activeEditor.document;
            return {
                success: true,
                activeFile: {
                    path: document.uri.fsPath,
                    fileName: document.fileName,
                    language: document.languageId,
                    lineCount: document.lineCount,
                    isDirty: document.isDirty,
                    cursorPosition: {
                        line: activeEditor.selection.active.line,
                        character: activeEditor.selection.active.character
                    }
                }
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    private async focusEditor(): Promise<any> {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await vscode.window.showTextDocument(activeEditor.document);
            }
            
            // Focus the editor
            await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            
            return { 
                success: true, 
                message: 'Editor focused'
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    private async runVSCodeCommand(command: string, args?: any[]): Promise<any> {
        try {
            let result;
            if (args && args.length > 0) {
                result = await vscode.commands.executeCommand(command, ...args);
            } else {
                result = await vscode.commands.executeCommand(command);
            }
            
            return { 
                success: true, 
                result: result,
                command: command,
                message: `Command executed: ${command}`
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error',
                command: command
            };
        }
    }

    private async handleCopilotChat(prompt: string, mode?: string, agentMode?: string): Promise<any> {
        try {
            
            // Only start new session if explicitly requested via mode parameter
            // This prevents automatic new session creation on first message after pairing
            if (!this.currentSessionId && mode === 'new-session') {
                this.startNewSession();
            } else if (!this.currentSessionId) {
                // Create a session ID without clearing existing chat state
                this.currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            const messageId = this.generateMessageId();
            
            // Create copilot request from command data
            const copilotRequest: CopilotRequest = {
                type: 'agent',
                prompt: prompt,
                agentMode: agentMode as 'autonomous' | 'interactive' | 'code-review' | 'refactor' | 'optimize' | 'debug' || 'interactive'
            };
            
            // Start chat sync monitoring for this request (enables progress callback processing)
            this.startChatSyncMonitoring();
            
            const response = await this.copilotBridge.handleCopilotRequest(copilotRequest);
            
            // Also broadcast the final response to all WebSocket clients for real-time updates
            if (response.success && response.data && this.isChatSyncActive) {
                const messageId = this.generateMessageId();
                const contentHash = this.hashContent(response.data);
                
                // Check if we've already sent this message
                if (!this.sentMessages.has(contentHash)) {
                    
                    const finalResponseMessage = {
                        type: 'copilotResponse',
                        data: response.data,
                        timestamp: new Date().toISOString(),
                        messageId: messageId,
                        originalMessageId: messageId,
                        sessionId: this.currentSessionId
                    };
                    
                    // Add to message pool first
                    this.addToMessagePool(finalResponseMessage);
                    // Send via Discovery WebSocket for remote communication
                    this.discoveryWebSocket.send({
                        type: 'notification',
                        data: finalResponseMessage,
                        timestamp: new Date().toISOString()
                    });
                    
                    this.sentMessages.add(contentHash);
                    
                    // Send completion event
                    const completionMessageId = this.generateMessageId();
                    const completionMessage = {
                        type: 'copilotComplete',
                        originalMessageId: messageId,
                        sessionId: this.currentSessionId,
                        messageId: completionMessageId,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Add completion to pool and send via Discovery WebSocket
                    this.addToMessagePool(completionMessage);
                    this.discoveryWebSocket.send({
                        type: 'notification',
                        data: completionMessage,
                        timestamp: new Date().toISOString()
                    });
                } else {
                }
            }
            
            return response;
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    private async addFileToChat(filePath: string): Promise<any> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            
            
            if (!workspaceFolders) {
                return { 
                    success: false, 
                    error: 'No workspace open' 
                };
            }
            
            // Security check: ensure file path is safe and within workspace
            if (!filePath || filePath.includes('..') || filePath.includes('~') || path.isAbsolute(filePath)) {
                return { 
                    success: false, 
                    error: 'Access denied: invalid file path' 
                };
            }
            
            const workspaceRoot = workspaceFolders[0].uri;
            const fileUri = vscode.Uri.joinPath(workspaceRoot, filePath);
            
            // Additional security check: ensure resolved path is within workspace
            const resolvedPath = fileUri.fsPath;
            const normalizedResolved = path.normalize(resolvedPath);
            const normalizedWorkspace = path.normalize(workspaceRoot.fsPath);
            if (!normalizedResolved.startsWith(normalizedWorkspace)) {
                return { 
                    success: false, 
                    error: 'Access denied: file outside workspace' 
                };
            }
            
            
            try {
                // Simple approach: try the main command that exists, then fallback
                let success = false;
                let method = '';
                
                // Method 1: Use the official addToChatAction command
                try {
                    await vscode.commands.executeCommand('workbench.action.chat.addToChatAction', fileUri);
                    success = true;
                    method = 'addToChatAction';
                } catch (error1) {
                    
                    // Method 2: Try the inlineResourceAnchor command as fallback
                    try {
                        await vscode.commands.executeCommand('chat.inlineResourceAnchor.addFileToChat', fileUri);
                        success = true;
                        method = 'inlineResourceAnchor';
                    } catch (error2) {
                        
                        // Method 3: Fallback - open both file and chat
                        try {
                            // Open the file in editor
                            const doc = await vscode.workspace.openTextDocument(fileUri);
                            await vscode.window.showTextDocument(doc);
                            
                            // Open chat panel (this command should exist)
                            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                            
                            success = true;
                            method = 'manual_fallback';
                        } catch (error3) {
                            throw new Error(`Failed to add file to chat: ${error1}`);
                        }
                    }
                }
                
                if (success) {
                    return { 
                        success: true, 
                        message: method === 'addToChatAction' 
                            ? `File ${path.basename(filePath)} added to chat successfully.`
                            : method === 'inlineResourceAnchor' 
                                ? `File ${path.basename(filePath)} attached to chat.`
                                : `File ${path.basename(filePath)} opened. Please manually add it to chat.`,
                        filePath: filePath,
                        method: method,
                        requiresManualAction: method === 'manual_fallback'
                    };
                } else {
                    throw new Error('All methods failed');
                }
            } catch (commandError) {
                // Fallback: try to open chat and show the file was attached
                try {
                    await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                    return { 
                        success: true, 
                        message: `Chat opened. File ${path.basename(filePath)} is ready to be discussed.`,
                        filePath: filePath,
                        fallback: true
                    };
                } catch (fallbackError) {
                    return { 
                        success: false, 
                        error: 'Failed to add file to chat', 
                        details: String(commandError) 
                    };
                }
            }
        } catch (error) {
            console.error('❌ Error adding file to chat:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    private async startNewCopilotSession(): Promise<any> {
        try {
            this.startNewSession();
            
            // Start a new chat session using proper VS Code commands
            try {
                await vscode.commands.executeCommand('workbench.action.chat.newChat');
            } catch (chatError) {
                console.warn('⚠️ Failed to start new chat session, trying alternative command:', chatError);
            }
            
            // Send session reset notification to mobile app via Discovery WebSocket
            const sessionResetMessage = {
                type: 'sessionReset',
                sessionId: this.currentSessionId,
                messageId: this.generateMessageId(),
                timestamp: new Date().toISOString()
            };
            
            // Add to message pool and send via Discovery WebSocket
            this.addToMessagePool(sessionResetMessage);
            this.discoveryWebSocket.send({
                type: 'notification',
                data: sessionResetMessage,
                timestamp: new Date().toISOString()
            });
            
            return { 
                success: true, 
                sessionId: this.currentSessionId,
                message: 'New chat session started' 
            };
        } catch (error) {
            console.error('❌ Error starting new session:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Reload Copilot extension to fix memory issues and crashes
     */
    private async reloadCopilot(): Promise<any> {
        try {
            
            // Reload the GitHub Copilot extension specifically
            await vscode.commands.executeCommand(
                'workbench.extensions.action.refreshExtension',
                'GitHub.copilot'
            );
            
            
            return { 
                success: true, 
                message: 'Copilot extension reload initiated' 
            };
        } catch (error) {
            console.error('❌ Error reloading Copilot extension:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Reload VS Code window
     */
    private async reloadWindow(): Promise<any> {
        try {
            
            // Reload the GitHub Copilot extension (same as copilot_reload_extension)
            await vscode.commands.executeCommand(
                'workbench.extensions.action.reloadExtension',
                'GitHub.copilot'
            );
            
            
            return { 
                success: true, 
                message: 'GitHub Copilot extension reload initiated' 
            };
        } catch (error) {
            console.error('❌ Error reloading GitHub Copilot extension:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Start WebSocket health monitoring to ensure connection stays active
     */
    private startWebSocketHealthCheck(): void {
        // Clear any existing health check interval
        if (this.webSocketHealthCheckInterval) {
            clearInterval(this.webSocketHealthCheckInterval);
        }
        
        // Check WebSocket health every 30 seconds
        this.webSocketHealthCheckInterval = setInterval(async () => {
            if (!this.discoveryWebSocket.isWebSocketConnected()) {
                try {
                    await this.discoveryWebSocket.forceReconnect();
                } catch (error) {
                    console.warn('⚠️ WebSocket health check: Reconnection failed:', error);
                }
            } else {
            }
        }, 30000); // 30 seconds
    }

    public async stop(): Promise<void> {
        
        // Clean up health check interval
        if (this.webSocketHealthCheckInterval) {
            clearInterval(this.webSocketHealthCheckInterval);
            this.webSocketHealthCheckInterval = null;
        }
        
        // Clean up session cleanup timeout
        if (this.sessionCleanupTimeout) {
            clearTimeout(this.sessionCleanupTimeout);
            this.sessionCleanupTimeout = null;
        }
        
        // Clean up chat sync monitoring - MUST be done before WebSocket disconnect
        this.stopChatSyncMonitoring();
        
        // Clear the progress callback to prevent further updates
        this.copilotBridge.setProgressCallback(() => {
            // No-op callback - server is stopped
        });
        
        // Stop the chat history sync interval
        this.copilotBridge.stopChatHistorySync();
        
        // Clean up terminal sessions
        // Stop all terminal output monitoring first
        this.stopAllTerminalSyncMonitoring();
        
        this.terminalSessions.forEach((session, sessionId) => {
            session.terminal.dispose();
        });
        this.terminalSessions.clear();
        this.terminalHistory.clear();
        
        // Stop WebSocket connection to Discovery API
        if (this.discoveryWebSocket) {
            this.discoveryWebSocket.disconnect();
        }
        
        // Stop API message polling (fallback, should not be used with WebSocket)
        if (this.messagePollingDisposable) {
            this.messagePollingDisposable.dispose();
            this.messagePollingDisposable = null;
        }
        
        
        // Unregister from discovery service
        try {
            await this.discoveryService.unregister();
        } catch (error) {
            // Silent fail
        }
    }

    /**
     * Pause chat sync monitoring without stopping the server
     * This keeps WebSocket connection alive but stops clipboard polling
     */
    public pause(): void {
        
        // Stop chat sync monitoring
        this.stopChatSyncMonitoring();
        
        // Stop the chat history sync interval
        this.copilotBridge.stopChatHistorySync();
        
        // Clear the progress callback to prevent updates
        this.copilotBridge.setProgressCallback(() => {
            // No-op callback - chat sync is paused
        });
        
    }

    /**
     * Resume chat sync monitoring after pause
     * Re-enables progress callback and chat monitoring
     */
    public resume(): void {
        
        // Restore the progress callback
        this.copilotBridge.setProgressCallback(async (progressUpdate: any) => {
            // Only process if chat sync is active
            if (!this.isChatSyncActive) {
                return;
            }

            if (!progressUpdate || !progressUpdate.type) {
                return;
            }

            const contentHash = this.hashContent(progressUpdate);
            if (this.sentMessages.has(contentHash)) {
                return;
            }


            const messageId = this.generateMessageId();
            const message = {
                type: progressUpdate.type,
                data: progressUpdate.data,
                timestamp: new Date().toISOString(),
                messageId: messageId,
                sessionId: this.currentSessionId
            };

            this.addToMessagePool(message);
            this.discoveryWebSocket.send({
                type: 'notification',
                data: message,
                timestamp: new Date().toISOString()
            });

            this.sentMessages.add(contentHash);
        });
        
    }

    public getPort(): number {
        return this.port;
    }

    public getPairingCode(): string | undefined {
        const currentPairingCode = this.discoveryService.getPairingCode();
        
        // Also check VS Code configuration
        const config = vscode.workspace.getConfiguration('vscoder');
        const configPairingCode = config.get<string>('pairingCode');
        
        return currentPairingCode;
    }

    public getDiscoveryService(): DiscoveryService {
        return this.discoveryService;
    }

    /**
     * Get workspace information
     */
    private async getWorkspaceInfo(): Promise<any> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        return {
            workspace_folders: workspaceFolders?.map(folder => ({
                name: folder.name,
                uri: folder.uri.toString()
            })) || [],
            active_text_editor: vscode.window.activeTextEditor?.document.fileName,
            language: vscode.window.activeTextEditor?.document.languageId
        };
    }

    /**
     * List files in directory
     */
    private async listFiles(dirPath: string): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder available');
        }

        const fullPath = path.join(workspaceFolder.uri.fsPath, dirPath);
        
        try {
            const items = await fs.promises.readdir(fullPath, { withFileTypes: true });
            return items.map(item => ({
                name: item.name,
                type: item.isDirectory() ? 'directory' : 'file',
                path: path.join(dirPath, item.name)
            }));
        } catch (error) {
            throw new Error(`Failed to list files: ${error}`);
        }
    }

    /**
     * Read file content
     */
    private async readFile(filePath: string): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder available');
        }

        const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
        
        try {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            return {
                path: filePath,
                content: content,
                size: content.length
            };
        } catch (error) {
            throw new Error(`Failed to read file: ${error}`);
        }
    }

    /**
     * Write file content
     */
    private async writeFile(filePath: string, content: string): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder available');
        }

        const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
        
        try {
            await fs.promises.writeFile(fullPath, content, 'utf8');
            return {
                path: filePath,
                size: content.length,
                success: true
            };
        } catch (error) {
            throw new Error(`Failed to write file: ${error}`);
        }
    }

    /**
     * Run terminal command
     */
    private async runTerminalCommand(command: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const cwd = workspaceFolder?.uri.fsPath || process.cwd();

            exec(command, { cwd }, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    resolve({
                        success: false,
                        command: command,
                        error: error.message,
                        stderr: stderr,
                        exit_code: error.code
                    });
                } else {
                    resolve({
                        success: true,
                        command: command,
                        stdout: stdout,
                        stderr: stderr,
                        exit_code: 0
                    });
                }
            });
        });
    }

    // ===== ADVANCED FILE OPERATIONS =====

    /**
     * Create a new file with content
     */
    private async createFile(filePath: string, content: string = ''): Promise<any> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            // Ensure relative path
            const relativePath = path.isAbsolute(filePath) ? path.relative(workspaceFolder.uri.fsPath, filePath) : filePath;
            const fullPath = path.join(workspaceFolder.uri.fsPath, relativePath);
            
            // Security check: ensure file path is within workspace
            const normalizedFullPath = path.normalize(fullPath);
            const normalizedWorkspace = path.normalize(workspaceFolder.uri.fsPath);
            if (!normalizedFullPath.startsWith(normalizedWorkspace)) {
                throw new Error('Access denied: file path outside workspace');
            }

            // Create directory if it doesn't exist
            const dirPath = path.dirname(fullPath);
            if (!fs.existsSync(dirPath)) {
                await fs.promises.mkdir(dirPath, { recursive: true });
            }

            // Check if file already exists
            if (fs.existsSync(fullPath)) {
                return {
                    success: false,
                    error: 'File already exists',
                    path: relativePath
                };
            }

            await fs.promises.writeFile(fullPath, content, 'utf8');
            return {
                success: true,
                path: relativePath,
                size: content.length,
                message: 'File created successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                path: filePath
            };
        }
    }

    /**
     * Delete a file or directory
     */
    private async deleteFile(filePath: string): Promise<any> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            const relativePath = path.isAbsolute(filePath) ? path.relative(workspaceFolder.uri.fsPath, filePath) : filePath;
            const fullPath = path.join(workspaceFolder.uri.fsPath, relativePath);
            
            // Security check
            const normalizedFullPath = path.normalize(fullPath);
            const normalizedWorkspace = path.normalize(workspaceFolder.uri.fsPath);
            if (!normalizedFullPath.startsWith(normalizedWorkspace)) {
                throw new Error('Access denied: file path outside workspace');
            }

            if (!fs.existsSync(fullPath)) {
                return {
                    success: false,
                    error: 'File or directory does not exist',
                    path: relativePath
                };
            }

            const stats = await fs.promises.stat(fullPath);
            if (stats.isDirectory()) {
                await fs.promises.rmdir(fullPath, { recursive: true });
            } else {
                await fs.promises.unlink(fullPath);
            }

            return {
                success: true,
                path: relativePath,
                message: 'File/directory deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                path: filePath
            };
        }
    }

    /**
     * Rename/move a file or directory
     */
    private async renameFile(oldPath: string, newPath: string): Promise<any> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            const relativeOldPath = path.isAbsolute(oldPath) ? path.relative(workspaceFolder.uri.fsPath, oldPath) : oldPath;
            const relativeNewPath = path.isAbsolute(newPath) ? path.relative(workspaceFolder.uri.fsPath, newPath) : newPath;
            
            const fullOldPath = path.join(workspaceFolder.uri.fsPath, relativeOldPath);
            const fullNewPath = path.join(workspaceFolder.uri.fsPath, relativeNewPath);
            
            // Security checks
            const normalizedOldPath = path.normalize(fullOldPath);
            const normalizedNewPath = path.normalize(fullNewPath);
            const normalizedWorkspace = path.normalize(workspaceFolder.uri.fsPath);
            
            if (!normalizedOldPath.startsWith(normalizedWorkspace) || !normalizedNewPath.startsWith(normalizedWorkspace)) {
                throw new Error('Access denied: file paths outside workspace');
            }

            if (!fs.existsSync(fullOldPath)) {
                return {
                    success: false,
                    error: 'Source file/directory does not exist',
                    oldPath: relativeOldPath,
                    newPath: relativeNewPath
                };
            }

            // Create directory for new path if needed
            const newDir = path.dirname(fullNewPath);
            if (!fs.existsSync(newDir)) {
                await fs.promises.mkdir(newDir, { recursive: true });
            }

            await fs.promises.rename(fullOldPath, fullNewPath);
            return {
                success: true,
                oldPath: relativeOldPath,
                newPath: relativeNewPath,
                message: 'File/directory renamed successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                oldPath: oldPath,
                newPath: newPath
            };
        }
    }

    /**
     * Create a new directory
     */
    private async createDirectory(dirPath: string): Promise<any> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            const relativePath = path.isAbsolute(dirPath) ? path.relative(workspaceFolder.uri.fsPath, dirPath) : dirPath;
            const fullPath = path.join(workspaceFolder.uri.fsPath, relativePath);
            
            // Security check
            const normalizedFullPath = path.normalize(fullPath);
            const normalizedWorkspace = path.normalize(workspaceFolder.uri.fsPath);
            if (!normalizedFullPath.startsWith(normalizedWorkspace)) {
                throw new Error('Access denied: directory path outside workspace');
            }

            if (fs.existsSync(fullPath)) {
                return {
                    success: false,
                    error: 'Directory already exists',
                    path: relativePath
                };
            }

            await fs.promises.mkdir(fullPath, { recursive: true });
            return {
                success: true,
                path: relativePath,
                message: 'Directory created successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                path: dirPath
            };
        }
    }

    /**
     * Copy a file or directory
     */
    private async copyFile(sourcePath: string, destinationPath: string): Promise<any> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            const relativeSourcePath = path.isAbsolute(sourcePath) ? path.relative(workspaceFolder.uri.fsPath, sourcePath) : sourcePath;
            const relativeDestPath = path.isAbsolute(destinationPath) ? path.relative(workspaceFolder.uri.fsPath, destinationPath) : destinationPath;
            
            const fullSourcePath = path.join(workspaceFolder.uri.fsPath, relativeSourcePath);
            const fullDestPath = path.join(workspaceFolder.uri.fsPath, relativeDestPath);
            
            // Security checks
            const normalizedSource = path.normalize(fullSourcePath);
            const normalizedDest = path.normalize(fullDestPath);
            const normalizedWorkspace = path.normalize(workspaceFolder.uri.fsPath);
            
            if (!normalizedSource.startsWith(normalizedWorkspace) || !normalizedDest.startsWith(normalizedWorkspace)) {
                throw new Error('Access denied: file paths outside workspace');
            }

            if (!fs.existsSync(fullSourcePath)) {
                return {
                    success: false,
                    error: 'Source file/directory does not exist',
                    sourcePath: relativeSourcePath,
                    destinationPath: relativeDestPath
                };
            }

            // Create destination directory if needed
            const destDir = path.dirname(fullDestPath);
            if (!fs.existsSync(destDir)) {
                await fs.promises.mkdir(destDir, { recursive: true });
            }

            const stats = await fs.promises.stat(fullSourcePath);
            if (stats.isDirectory()) {
                // Copy directory recursively
                await this.copyDirectoryRecursive(fullSourcePath, fullDestPath);
            } else {
                // Copy file
                await fs.promises.copyFile(fullSourcePath, fullDestPath);
            }

            return {
                success: true,
                sourcePath: relativeSourcePath,
                destinationPath: relativeDestPath,
                message: 'File/directory copied successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                sourcePath: sourcePath,
                destinationPath: destinationPath
            };
        }
    }

    /**
     * Helper method to copy directory recursively
     */
    private async copyDirectoryRecursive(source: string, destination: string): Promise<void> {
        await fs.promises.mkdir(destination, { recursive: true });
        const entries = await fs.promises.readdir(source, { withFileTypes: true });
        
        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectoryRecursive(sourcePath, destPath);
            } else {
                await fs.promises.copyFile(sourcePath, destPath);
            }
        }
    }

    // ===== SEARCH AND NAVIGATION =====

    /**
     * Search for text in files
     */
    private async searchInFiles(query: string, includePattern?: string, excludePattern?: string): Promise<any> {
        try {
            // Use grep-like search through workspace files
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            const pattern = includePattern || '**/*';
            const excludes = excludePattern ? [excludePattern, '**/node_modules/**'] : ['**/node_modules/**'];
            
            const files = await vscode.workspace.findFiles(pattern, `{${excludes.join(',')}}`);
            const results: any[] = [];

            for (const file of files) {
                try {
                    const document = await vscode.workspace.openTextDocument(file);
                    const text = document.getText();
                    const lines = text.split('\n');
                    
                    lines.forEach((line, lineNumber) => {
                        const index = line.toLowerCase().indexOf(query.toLowerCase());
                        if (index !== -1) {
                            results.push({
                                uri: file.fsPath,
                                lineNumber: lineNumber,
                                line: line,
                                character: index,
                                preview: {
                                    text: line.trim(),
                                    matches: [{
                                        start: index,
                                        end: index + query.length
                                    }]
                                }
                            });
                        }
                    });
                } catch (error) {
                    // Skip files that can't be read
                    continue;
                }
            }

            return {
                success: true,
                query: query,
                results: results,
                count: results.length
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                query: query
            };
        }
    }

    /**
     * Find files by name pattern
     */
    private async findFiles(pattern: string): Promise<any> {
        try {
            const results = await vscode.workspace.findFiles(pattern);
            const filePaths = results.map(uri => {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    return path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
                }
                return uri.fsPath;
            });

            return {
                success: true,
                pattern: pattern,
                files: filePaths,
                count: filePaths.length
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                pattern: pattern
            };
        }
    }

    /**
     * Go to definition of symbol at position
     */
    private async goToDefinition(filePath: string, line: number, character: number): Promise<any> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
            const uri = vscode.Uri.file(fullPath);
            const position = new vscode.Position(line, character);

            const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeDefinitionProvider',
                uri,
                position
            );

            if (!definitions || definitions.length === 0) {
                return {
                    success: false,
                    message: 'No definitions found',
                    filePath: filePath,
                    position: { line, character }
                };
            }

            const results = definitions.map(def => ({
                uri: def.uri.fsPath,
                range: {
                    start: { line: def.range.start.line, character: def.range.start.character },
                    end: { line: def.range.end.line, character: def.range.end.character }
                }
            }));

            return {
                success: true,
                filePath: filePath,
                position: { line, character },
                definitions: results
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                filePath: filePath,
                position: { line, character }
            };
        }
    }

    /**
     * Find references to symbol at position
     */
    private async findReferences(filePath: string, line: number, character: number): Promise<any> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
            const uri = vscode.Uri.file(fullPath);
            const position = new vscode.Position(line, character);

            const references = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeReferenceProvider',
                uri,
                position
            );

            if (!references || references.length === 0) {
                return {
                    success: false,
                    message: 'No references found',
                    filePath: filePath,
                    position: { line, character }
                };
            }

            const results = references.map(ref => ({
                uri: ref.uri.fsPath,
                range: {
                    start: { line: ref.range.start.line, character: ref.range.start.character },
                    end: { line: ref.range.end.line, character: ref.range.end.character }
                }
            }));

            return {
                success: true,
                filePath: filePath,
                position: { line, character },
                references: results,
                count: results.length
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                filePath: filePath,
                position: { line, character }
            };
        }
    }

    // ===== GIT OPERATIONS =====

    /**
     * Get Git status
     */
    private async getGitStatus(): Promise<any> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                throw new Error('Git extension not found');
            }

            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }

            const git = gitExtension.exports.getAPI(1);
            const repository = git.repositories.find((repo: any) => 
                repo.rootUri.fsPath === workspaceFolder.uri.fsPath
            );

            if (!repository) {
                throw new Error('No Git repository found in workspace');
            }

            const status = repository.state;
            return {
                success: true,
                branch: status.HEAD?.name || 'unknown',
                changes: status.workingTreeChanges.map((change: any) => ({
                    path: change.uri.fsPath,
                    status: change.status,
                    originalUri: change.originalUri?.fsPath
                })),
                staged: status.indexChanges.map((change: any) => ({
                    path: change.uri.fsPath,
                    status: change.status,
                    originalUri: change.originalUri?.fsPath
                })),
                remotes: repository.state.remotes.map((remote: any) => ({
                    name: remote.name,
                    fetchUrl: remote.fetchUrl,
                    pushUrl: remote.pushUrl
                }))
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Stage files for commit (git add)
     */
    private async gitAdd(files: string[]): Promise<any> {
        try {
            const result = await this.runGitCommand(['add', ...files]);
            return {
                success: result.success,
                files: files,
                message: result.success ? 'Files staged successfully' : 'Failed to stage files',
                output: result.stdout,
                error: result.error
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                files: files
            };
        }
    }

    /**
     * Commit changes
     */
    private async gitCommit(message: string): Promise<any> {
        try {
            const result = await this.runGitCommand(['commit', '-m', message]);
            return {
                success: result.success,
                message: message,
                output: result.stdout,
                error: result.error
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: message
            };
        }
    }

    /**
     * Push changes to remote
     */
    private async gitPush(): Promise<any> {
        try {
            const result = await this.runGitCommand(['push']);
            return {
                success: result.success,
                output: result.stdout,
                error: result.error
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Pull changes from remote
     */
    private async gitPull(): Promise<any> {
        try {
            const result = await this.runGitCommand(['pull']);
            return {
               
                success: result.success,
                output: result.stdout,
                error: result.error
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Switch to a different branch
     */
    private async gitCheckout(branch: string): Promise<any> {
        try {
            const result = await this.runGitCommand(['checkout', branch]);
            return {
                success: result.success,
                branch: branch,
                output: result.stdout,
                error: result.error
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                branch: branch
            };
        }
    }

    /**
     * Get list of Git branches
     */
    private async getGitBranches(): Promise<any> {
        try {
            const result = await this.runGitCommand(['branch', '-a']);
            if (result.success) {
                const branches = result.stdout
                    .split('\n')
                    .map((line: string) => line.trim())
                    .filter((line: string) => line.length > 0)
                    .map((line: string) => ({
                        name: line.replace(/^\*\s*/, '').replace(/^remotes\//, ''),
                        current: line.startsWith('*'),
                        remote: line.includes('remotes/')
                    }));

                return {
                    success: true,
                    branches: branches,
                    count: branches.length
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Helper method to run Git commands
     */
    private async runGitCommand(args: string[]): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const cwd = workspaceFolder?.uri.fsPath || process.cwd();
        
        return new Promise((resolve) => {
            exec(`git ${args.join(' ')}`, { cwd }, (error: any, stdout: string, stderr: string) => {
                resolve({
                    success: !error,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    error: error?.message,
                    exit_code: error?.code || 0
                });
            });
        });
    }

    // ===== LANGUAGE SERVER OPERATIONS =====

    /**
     * Format document
     */
    private async formatDocument(filePath: string): Promise<any> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder available');
            }

            const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
            const uri = vscode.Uri.file(fullPath);
            
            // Open document if not already open
            const document = await vscode.workspace.openTextDocument(uri);
            
            // Execute format document command
            const formatEdits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
                'vscode.executeFormatDocumentProvider',
                uri,
                { insertSpaces: true, tabSize: 2 }
            );

            if (formatEdits && formatEdits.length > 0) {
                // Apply edits to document
                const edit = new vscode.WorkspaceEdit();
                edit.set(uri, formatEdits);
                await vscode.workspace.applyEdit(edit);
                
                return {
                    success: true,
                    filePath: filePath,
                    editsApplied: formatEdits.length,
                    message: 'Document formatted successfully'
                };
            } else {
                return {
                    success: true,
                    filePath: filePath,
                    editsApplied: 0,
                    message: 'No formatting changes needed'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                filePath: filePath
            };
        }
    }

    /**
     * Get diagnostics (errors, warnings) for a file
     */
    private async getDiagnostics(filePath?: string): Promise<any> {
        try {
            if (filePath) {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    throw new Error('No workspace folder available');
                }

                const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
                const uri = vscode.Uri.file(fullPath);
                const diagnostics = vscode.languages.getDiagnostics(uri);

                return {
                    success: true,
                    filePath: filePath,
                    diagnostics: diagnostics.map(diag => ({
                        message: diag.message,
                        severity: diag.severity,
                        range: {
                            start: { line: diag.range.start.line, character: diag.range.start.character },
                            end: { line: diag.range.end.line, character: diag.range.end.character }
                        },
                        source: diag.source,
                        code: diag.code
                    })),
                    count: diagnostics.length
                };
            } else {
                // Get all diagnostics
                const allDiagnostics = vscode.languages.getDiagnostics();
                const result: any[] = [];

                allDiagnostics.forEach(([uri, diagnostics]) => {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    const relativePath = workspaceFolder ? 
                        path.relative(workspaceFolder.uri.fsPath, uri.fsPath) : 
                        uri.fsPath;

                    result.push({
                        filePath: relativePath,
                        diagnostics: diagnostics.map(diag => ({
                            message: diag.message,
                            severity: diag.severity,
                            range: {
                                start: { line: diag.range.start.line, character: diag.range.start.character },
                                end: { line: diag.range.end.line, character: diag.range.end.character }
                            },
                            source: diag.source,
                            code: diag.code
                        })),
                        count: diagnostics.length
                    });
                });

                return {
                    success: true,
                    files: result,
                    totalCount: result.reduce((sum, file) => sum + file.count, 0)
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                filePath: filePath
            };
        }
    }

    // ===== SETTINGS OPERATIONS =====

    /**
     * Update VS Code settings
     */
    private async updateSettings(settings: Record<string, any>): Promise<any> {
        try {
            const config = vscode.workspace.getConfiguration();
            const results: any[] = [];

            for (const [key, value] of Object.entries(settings)) {
                try {
                    await config.update(key, value, vscode.ConfigurationTarget.Workspace);
                    results.push({ key, success: true, value });
                } catch (error) {
                    results.push({ 
                        key, 
                        success: false, 
                        error: error instanceof Error ? error.message : 'Unknown error' 
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            
            return {
                success: successCount === results.length,
                results: results,
                successCount: successCount,
                totalCount: results.length
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                settings: settings
            };
        }
    }

    /**
     * Get current VS Code settings
     */
    private async getSettings(): Promise<any> {
        try {
            const config = vscode.workspace.getConfiguration();
            const inspect = config.inspect;
            
            // Get workspace-specific settings
            const workspaceSettings: Record<string, any> = {};
            
            // Common settings to retrieve
            const commonSettings = [
                'editor.fontSize',
                'editor.tabSize',
                'editor.insertSpaces',
                'editor.wordWrap',
                'files.autoSave',
                'files.encoding',
                'terminal.integrated.shell',
                'workbench.colorTheme',
                'extensions.autoUpdate'
            ];

            for (const setting of commonSettings) {
                const value = config.get(setting);
                if (value !== undefined) {
                    workspaceSettings[setting] = value;
                }
            }

            return {
                success: true,
                settings: workspaceSettings,
                settingsCount: Object.keys(workspaceSettings).length
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // ===== TERMINAL SESSION MANAGEMENT =====

    /**
     * List all terminal sessions
     */
    private async listTerminalSessions(): Promise<any> {
        try {
            const sessions = Array.from(this.terminalSessions.values()).map(session => ({
                id: session.id,
                name: session.name,
                cwd: session.cwd,
                isActive: session.isActive,
                lastActivity: session.lastActivity,
                createdAt: session.createdAt
            }));

            return {
                success: true,
                sessions: sessions
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Create a new terminal session
     */
    private async createTerminalSession(name?: string, cwd?: string): Promise<any> {
        try {
            const sessionId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const sessionName = name || `Terminal ${this.terminalSessions.size + 1}`;
            
            // Get workspace folder for default cwd
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const defaultCwd = workspaceFolder?.uri.fsPath || process.cwd();
            const sessionCwd = cwd || defaultCwd;

            // Create VS Code terminal using native command
            const terminal = vscode.window.createTerminal({
                name: sessionName,
                cwd: sessionCwd
            });

            // Create session data
            const sessionData: TerminalSessionData = {
                id: sessionId,
                name: sessionName,
                cwd: sessionCwd,
                terminal: terminal,
                isActive: true,
                lastActivity: new Date(),
                createdAt: new Date()
            };

            // Set all other sessions to inactive
            this.terminalSessions.forEach(session => {
                session.isActive = false;
            });

            // Store session
            this.terminalSessions.set(sessionId, sessionData);
            this.terminalHistory.set(sessionId, []);

            // Focus the terminal using VS Code command
            await vscode.commands.executeCommand('workbench.action.terminal.focus');
            
            // Note: Terminal monitoring now starts only when mobile app requests sync via request_terminal_sync

            return {
                success: true,
                session: {
                    id: sessionId,
                    name: sessionName,
                    cwd: sessionCwd,
                    isActive: true,
                    lastActivity: sessionData.lastActivity,
                    createdAt: sessionData.createdAt
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get terminal command history for a session
     */
    private async getTerminalHistory(sessionId: string): Promise<any> {
        try {
            if (!sessionId) {
                return {
                    success: false,
                    error: 'Session ID is required'
                };
            }

            const history = this.terminalHistory.get(sessionId) || [];
            
            return {
                success: true,
                history: history
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Execute a command in a terminal session
     */
    private async executeTerminalCommand(sessionId: string, cmd: string): Promise<any> {
        try {
            if (!sessionId || !cmd) {
                return {
                    success: false,
                    error: 'Session ID and cmd are required'
                };
            }

            const session = this.terminalSessions.get(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: `Terminal session not found: ${sessionId}`
                };
            }

            // Update session activity
            session.lastActivity = new Date();
            session.isActive = true;

            // Set all other sessions to inactive
            this.terminalSessions.forEach((s, id) => {
                if (id !== sessionId) {
                    s.isActive = false;
                }
            });

            // Show and focus the terminal
            session.terminal.show();
            await vscode.commands.executeCommand('workbench.action.terminal.focus');

            // Handle special commands using VS Code built-in commands
            const lowerCommand = cmd.toLowerCase().trim();
            
            if (lowerCommand === 'clear' || lowerCommand === 'cls') {
                // Use VS Code's built-in clear command
                await vscode.commands.executeCommand('workbench.action.terminal.clear');
                
                // Clear our command history for this session
                this.terminalHistory.set(sessionId, []);
                
                return {
                    success: true,
                    output: 'Terminal cleared',
                    sessionId: sessionId
                };
            } else {
                // Execute the command in terminal
                await vscode.commands.executeCommand('workbench.action.terminal.sendSequence', { 
                    text: cmd + '\n' 
                });

                // Start interval-based terminal output monitoring for this session
                // Note: Now handled by request_terminal_sync command from mobile app
                
                return {
                    success: true,
                    output: 'Command executed, waiting for output...',
                    sessionId: sessionId
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Capture terminal output using VS Code commands
     */
    private async captureTerminalOutput(): Promise<string> {
        try {
            // Make sure terminal is focused
            await vscode.commands.executeCommand('workbench.action.terminal.focus');
            
            // Select all terminal content
            await vscode.commands.executeCommand('workbench.action.terminal.selectAll');
            
            // Copy selection to clipboard
            await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
            
            // Get the copied content from clipboard
            const terminalContent = await vscode.env.clipboard.readText();
            
            // Clear selection to avoid visual distraction
            await vscode.commands.executeCommand('workbench.action.terminal.clearSelection');
            
            return terminalContent;
        } catch (error) {
            console.error('Failed to capture terminal output:', error);
            return '';
        }
    }

    /**
     * Parse terminal output to extract command history (similar to copilot chat sync)
     */
    private parseTerminalOutput(terminalContent: string, sessionId: string): TerminalCommand[] {
        try {
            const lines = terminalContent.split('\n');
            const commands: TerminalCommand[] = [];
            let currentCommand: TerminalCommand | null = null;
            let outputBuffer: string[] = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Skip completely empty lines
                if (line.trim() === '') {
                    if (currentCommand) {
                        outputBuffer.push('');
                    }
                    continue;
                }
                
                // Detect PowerShell command prompts: PS C:\path> command
                const powershellMatch = line.match(/^PS\s+[A-Za-z]:[^>]*>\s+(.+)$/);
                
                if (powershellMatch) {
                    // Save previous command if exists
                    if (currentCommand) {
                        currentCommand.output = outputBuffer.join('\n').trim();
                        currentCommand.isRunning = false;
                        commands.push(currentCommand);
                        outputBuffer = [];
                    }
                    
                    // Extract command from PowerShell prompt
                    const command = powershellMatch[1].trim();
                    if (command) {
                        currentCommand = {
                            id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            sessionId: sessionId,
                            command: command,
                            output: '',
                            timestamp: new Date(),
                            isRunning: false
                        };
                    }
                } else if (this.isCommandPromptLine(line)) {
                    // Handle other command prompt types
                    if (currentCommand) {
                        currentCommand.output = outputBuffer.join('\n').trim();
                        currentCommand.isRunning = false;
                        commands.push(currentCommand);
                        outputBuffer = [];
                    }
                    
                    const command = this.extractCommandFromPrompt(line);
                    if (command) {
                        currentCommand = {
                            id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            sessionId: sessionId,
                            command: command,
                            output: '',
                            timestamp: new Date(),
                            isRunning: false
                        };
                    }
                } else if (currentCommand) {
                    // This is output from the current command
                    outputBuffer.push(line);
                }
            }
            
            // Handle the last command
            if (currentCommand) {
                currentCommand.output = outputBuffer.join('\n').trim();
                currentCommand.isRunning = false;
                commands.push(currentCommand);
            }
            
            // Return only the latest 10 commands (like copilot chat sync)
            return commands.slice(-10);
            
        } catch (error) {
            console.error('Failed to parse terminal output:', error);
            return [];
        }
    }

    /**
     * Check if a line is a command prompt line
     */
    private isCommandPromptLine(line: string): boolean {
        // PowerShell prompt pattern: PS C:\path> command
        const powershellPattern = /^PS\s+[A-Za-z]:[^>]*>\s+.+/;
        
        // Other common prompt patterns
        const otherPromptPatterns = [
            /^\$\s+/,                    // $ prompt (Unix/Linux)
            /^>\s+/,                     // > prompt
            /^C:\\.*>\s+/,               // Windows cmd prompt
            /^.*@.*:\s*.*\$\s+/,         // user@host:path$ pattern
            /^.*~\s*\$\s+/,              // ~/path$ pattern
            /^\w+:\s*.*>\s+/             // Drive:\path> pattern
        ];
        
        // Check PowerShell pattern first (most specific for Windows)
        if (powershellPattern.test(line)) {
            return true;
        }
        
        return otherPromptPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Extract command from prompt line
     */
    private extractCommandFromPrompt(line: string): string {
        // Handle PowerShell prompt specifically: PS C:\path> command
        const powershellMatch = line.match(/^PS\s+[A-Za-z]:[^>]*>\s+(.+)$/);
        if (powershellMatch) {
            return powershellMatch[1].trim();
        }
        
        // Handle other prompt patterns
        const cleanLine = line
            .replace(/^\$\s+/, '')
            .replace(/^>\s+/, '')
            .replace(/^C:\\.*>\s+/, '')
            .replace(/^.*@.*:\s*.*\$\s+/, '')
            .replace(/^.*~\s*\$\s+/, '')
            .replace(/^\w+:\s*.*>\s+/, '');
            
        return cleanLine.trim();
    }

    /**
     * Kill a terminal session
     */
    private async killTerminalSession(sessionId: string): Promise<any> {
        try {
            if (!sessionId) {
                return {
                    success: false,
                    error: 'Session ID is required'
                };
            }

            const session = this.terminalSessions.get(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: `Terminal session not found: ${sessionId}`
                };
            }

            // Dispose the VS Code terminal
            session.terminal.dispose();

            // Stop monitoring for this session
            this.stopTerminalSyncMonitoring(sessionId);

            // Remove from our tracking
            this.terminalSessions.delete(sessionId);
            this.terminalHistory.delete(sessionId);

            // If this was the active session, make another one active
            if (session.isActive && this.terminalSessions.size > 0) {
                const remainingSessions = Array.from(this.terminalSessions.values());
                if (remainingSessions.length > 0) {
                    remainingSessions[0].isActive = true;
                }
            }

            return {
                success: true,
                message: `Terminal session ${sessionId} terminated`,
                sessionId: sessionId
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Focus a specific terminal session
     */
    private async focusTerminalSession(sessionId: string): Promise<any> {
        try {
            if (!sessionId) {
                return {
                    success: false,
                    error: 'Session ID is required'
                };
            }

            const session = this.terminalSessions.get(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: `Terminal session not found: ${sessionId}`
                };
            }

            // Set all sessions to inactive
            this.terminalSessions.forEach(s => {
                s.isActive = false;
            });

            // Set this session as active
            session.isActive = true;
            session.lastActivity = new Date();

            // Show and focus the terminal
            session.terminal.show();
            await vscode.commands.executeCommand('workbench.action.terminal.focus');
            
            // Note: Terminal monitoring now starts only when mobile app requests sync via request_terminal_sync

            return {
                success: true,
                message: `Terminal session ${sessionId} focused`,
                sessionId: sessionId
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Clear a terminal session
     */
    private async clearTerminalSession(sessionId: string): Promise<any> {
        try {
            if (!sessionId) {
                return {
                    success: false,
                    error: 'Session ID is required'
                };
            }

            const session = this.terminalSessions.get(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: `Terminal session not found: ${sessionId}`
                };
            }

            // Focus the terminal first
            session.terminal.show();
            
            // Clear the terminal using VS Code command
            await vscode.commands.executeCommand('workbench.action.terminal.clear');

            // Clear our command history for this session
            this.terminalHistory.set(sessionId, []);

            session.lastActivity = new Date();

            return {
                success: true,
                message: `Terminal session ${sessionId} cleared`,
                sessionId: sessionId
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Copy last command from terminal session
     */
    private async copyLastCommand(sessionId: string): Promise<any> {
        try {
            if (!sessionId) {
                return {
                    success: false,
                    error: 'Session ID is required'
                };
            }

            const session = this.terminalSessions.get(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: `Terminal session not found: ${sessionId}`
                };
            }

            // Focus the terminal first
            session.terminal.show();
            
            // Use VS Code command to copy last command
            await vscode.commands.executeCommand('workbench.action.terminal.copyLastCommand');

            // Get the last command from our history
            const history = this.terminalHistory.get(sessionId) || [];
            const lastCommand = history.length > 0 ? history[history.length - 1] : null;

            return {
                success: true,
                message: 'Last command copied to clipboard',
                lastCommand: lastCommand?.command || 'No command history',
                sessionId: sessionId
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Copy last command output from terminal session
     */
    private async copyLastCommandOutput(sessionId: string): Promise<any> {
        try {
            if (!sessionId) {
                return {
                    success: false,
                    error: 'Session ID is required'
                };
            }

            const session = this.terminalSessions.get(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: `Terminal session not found: ${sessionId}`
                };
            }

            // Focus the terminal first
            session.terminal.show();
            
            // Use VS Code command to copy last command output
            await vscode.commands.executeCommand('workbench.action.terminal.copyLastCommandOutput');

            // Get the last command output from our history
            const history = this.terminalHistory.get(sessionId) || [];
            const lastCommand = history.length > 0 ? history[history.length - 1] : null;

            return {
                success: true,
                message: 'Last command output copied to clipboard',
                lastOutput: lastCommand?.output || 'No command output available',
                sessionId: sessionId
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Rename a terminal session
     */
    private async renameTerminalSession(sessionId: string, newName: string): Promise<any> {
        try {
            if (!sessionId || !newName) {
                return {
                    success: false,
                    error: 'Session ID and new name are required'
                };
            }

            const session = this.terminalSessions.get(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: `Terminal session not found: ${sessionId}`
                };
            }

            // Focus the terminal first
            session.terminal.show();
            
            // Use VS Code command to rename terminal with argument
            await vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', {
                name: newName
            });

            // Update our session data
            session.name = newName;
            session.lastActivity = new Date();

            return {
                success: true,
                message: `Terminal session renamed to: ${newName}`,
                sessionId: sessionId,
                newName: newName
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Split a terminal session
     */
    private async splitTerminalSession(sessionId: string): Promise<any> {
        try {
            if (!sessionId) {
                return {
                    success: false,
                    error: 'Session ID is required'
                };
            }

            const session = this.terminalSessions.get(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: `Terminal session not found: ${sessionId}`
                };
            }

            // Focus the terminal first
            session.terminal.show();
            
            // Use VS Code command to split terminal
            await vscode.commands.executeCommand('workbench.action.terminal.split');

            // Create a new session for the split terminal
            // Note: VS Code will create the actual split, we just track it
            const splitSessionId = `terminal-split-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // We can't directly get the split terminal reference, so we'll create a placeholder
            // The actual terminal will be managed by VS Code
            const splitSessionData: TerminalSessionData = {
                id: splitSessionId,
                name: `${session.name} (Split)`,
                cwd: session.cwd,
                terminal: session.terminal, // Placeholder - VS Code manages the actual split
                isActive: true,
                lastActivity: new Date(),
                createdAt: new Date()
            };

            // Set all other sessions to inactive
            this.terminalSessions.forEach(s => {
                s.isActive = false;
            });

            // Store the split session
            this.terminalSessions.set(splitSessionId, splitSessionData);
            this.terminalHistory.set(splitSessionId, []);

            return {
                success: true,
                message: `Terminal session ${sessionId} split successfully`,
                originalSessionId: sessionId,
                splitSessionId: splitSessionId
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Handle terminal sync request from mobile app
     */
    private async handleTerminalSyncRequest(sessionId?: string): Promise<any> {
        try {
            if (!sessionId) {
                // If no session ID provided, sync all active sessions
                const activeSessions = Array.from(this.terminalSessions.values())
                    .filter(session => session.isActive);
                
                if (activeSessions.length === 0) {
                    return {
                        success: false,
                        message: 'No active terminal sessions found'
                    };
                }
                
                sessionId = activeSessions[0].id;
            }
            
            const session = this.terminalSessions.get(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: `Terminal session not found: ${sessionId}`
                };
            }
            
            // Start monitoring for this session with auto-stop
            this.startTerminalSyncMonitoring(sessionId);
            
            // Get current terminal output immediately
            const terminalOutput = await this.captureTerminalOutput();
            const currentHistory = this.parseTerminalOutput(terminalOutput, sessionId);
            this.terminalHistory.set(sessionId, currentHistory);
            
            return {
                success: true,
                sessionId: sessionId,
                history: currentHistory,
                message: 'Terminal sync started - monitoring for 30 seconds'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Start terminal sync monitoring that auto-stops after 30 seconds
     */
    private startTerminalSyncMonitoring(sessionId: string): void {
        // Check if chat sync is active - if so, stop it first
        if (this.activeSyncType === 'chat') {
            this.stopChatSyncMonitoring();
        }
        
        // Stop any existing monitoring for this session
        this.stopTerminalSyncMonitoring(sessionId);
        
        
        // Set active sync type and enable terminal sync
        this.activeSyncType = 'terminal';
        this.isTerminalSyncActive = true;
        // Monitor terminal output every 2 seconds
        const monitoringInterval = setInterval(async () => {
            try {
                const session = this.terminalSessions.get(sessionId);
                if (!session) {
                    this.stopTerminalSyncMonitoring(sessionId);
                    return;
                }
                
                // Capture current terminal output
                const terminalOutput = await this.captureTerminalOutput();
                
                if (terminalOutput) {
                    // Parse and get recent commands/output
                    const parsedHistory = this.parseTerminalOutput(terminalOutput, sessionId);
                    
                    // Get previous history to compare
                    const previousHistory = this.terminalHistory.get(sessionId) || [];
                    
                    // Check if there are new commands
                    if (parsedHistory.length > previousHistory.length) {
                        // Update session history
                        this.terminalHistory.set(sessionId, parsedHistory);
                        
                        // Send real-time update to mobile app
                        const newCommands = parsedHistory.slice(previousHistory.length);
                        if (newCommands.length > 0) {
                            await this.sendMobileNotification(
                                'Terminal Update',
                                `New output in terminal session: ${session.name}`,
                                {
                                    type: 'terminal_sync_update',
                                    sessionId: sessionId,
                                    newCommands: newCommands,
                                    fullHistory: parsedHistory
                                }
                            );
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Error in terminal sync monitoring for session ${sessionId}:`, error);
            }
        }, 2000); // Check every 2 seconds
        
        // Set up auto-stop after 30 seconds
        const syncTimeout = setTimeout(() => {
            this.stopTerminalSyncMonitoring(sessionId);
        }, 30000); // 30 seconds
        
        // Store the interval and timeout references
        this.terminalMonitoringIntervals.set(sessionId, monitoringInterval);
        this.terminalSyncTimeouts.set(sessionId, syncTimeout);
    }
    
    /**
     * Stop terminal sync monitoring for a session
     */
    private stopTerminalSyncMonitoring(sessionId: string): void {
        // Clear monitoring interval
        const interval = this.terminalMonitoringIntervals.get(sessionId);
        if (interval) {
            clearInterval(interval);
            this.terminalMonitoringIntervals.delete(sessionId);
        }
        
        // Clear timeout
        const timeout = this.terminalSyncTimeouts.get(sessionId);
        if (timeout) {
            clearTimeout(timeout);
            this.terminalSyncTimeouts.delete(sessionId);
        }
        
        // Check if this was the last terminal session - if so, clear mutex
        if (this.terminalMonitoringIntervals.size === 0 && this.terminalSyncTimeouts.size === 0) {
            this.isTerminalSyncActive = false;
            if (this.activeSyncType === 'terminal') {
                this.activeSyncType = null;
            }
        }
    }
    
    // ===== CHAT SYNC MANAGEMENT =====
    
    /**
     * Handle chat sync request from mobile app
     * This starts monitoring chat updates for 30 seconds
     */
    private async handleChatSyncRequest(): Promise<any> {
        try {
            
            // Ensure WebSocket is connected before starting sync
            if (!this.discoveryWebSocket.isWebSocketConnected()) {
                try {
                    await this.discoveryWebSocket.connect();
                } catch (wsError) {
                    console.warn('⚠️ WebSocket reconnection failed, but continuing with sync:', wsError);
                }
            }
            
            // Start the actual chat history sync first
            await this.copilotBridge.startChatHistorySync();
            
            // Start chat sync monitoring (enables progress callback processing)
            this.startChatSyncMonitoring();
            
            return {
                success: true,
                message: 'Chat sync monitoring started and history synced',
                timeout: 30000, // 30 seconds
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error handling chat sync request:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Chat sync request failed'
            };
        }
    }
    
    /**
     * Start chat sync monitoring for 30 seconds
     * If already monitoring, extends the timeout
     */
    private startChatSyncMonitoring(): void {
        
        // Check if terminal sync is active - if so, stop it first
        if (this.activeSyncType === 'terminal') {
            this.stopAllTerminalSyncMonitoring();
        }
        
        // Stop existing monitoring if any
        this.stopChatSyncMonitoring();
        
        // Set active sync type and enable chat sync
        this.activeSyncType = 'chat';
        this.isChatSyncActive = true;
        
        // Set timeout to stop monitoring after 30 seconds
        this.chatSyncTimeout = setTimeout(() => {
            this.stopChatSyncMonitoring();
        }, 30000); // 30 seconds
        
    }
    
    /**
     * Stop chat sync monitoring
     */
    private stopChatSyncMonitoring(): void {
        
        // Clear the timeout first
        if (this.chatSyncTimeout) {
            clearTimeout(this.chatSyncTimeout);
            this.chatSyncTimeout = null;
        }
        
        // Disable chat sync flag IMMEDIATELY to prevent any new messages
        if (this.isChatSyncActive) {
            this.isChatSyncActive = false;
        }
        
        // Clear sync mutex if this was the active sync type
        if (this.activeSyncType === 'chat') {
            this.activeSyncType = null;
        }
        
    }
    
    /**
     * Stop all terminal sync monitoring
     */
    private stopAllTerminalSyncMonitoring(): void {
        
        // Clear all intervals
        this.terminalMonitoringIntervals.forEach((interval, sessionId) => {
            clearInterval(interval);
        });
        this.terminalMonitoringIntervals.clear();
        
        // Clear all timeouts
        this.terminalSyncTimeouts.forEach((timeout, sessionId) => {
            clearTimeout(timeout);
        });
        this.terminalSyncTimeouts.clear();
        
        // Update sync state
        this.isTerminalSyncActive = false;
        if (this.activeSyncType === 'terminal') {
            this.activeSyncType = null;
        }
        
    }

    /**
     * Handle validation request from mobile device
     */
    private async handleValidationRequest(data: any): Promise<void> {
        try {
            
            // Extract validation data with multiple fallback patterns
            const validation_id = data.validation_id || data.validationId || data.id;
            const device_name = data.device_name || data.deviceName || data.name || data.device || 'Unknown Device';
            const platform = data.platform || data.device_platform || data.devicePlatform || data.os || 'Unknown Platform';
            const version = data.version || data.device_version || data.deviceVersion || data.osVersion || '';
            const ip_address = data.ip_address || data.ipAddress || data.ip || 'Unknown IP';
            const requested_at = data.requested_at || data.requestedAt || data.timestamp || new Date().toISOString();
            const expires_at = data.expires_at || data.expiresAt || data.expiry || new Date(Date.now() + 5 * 60 * 1000).toISOString();
            
            // Show VS Code notification (non-modal) asking user to approve the device
            const approveButton = 'Approve';
            const denyButton = 'Deny';
            const detailsButton = 'Details';
            
            // Create a friendly notification message with proper fallbacks
            const deviceInfo = device_name !== 'Unknown Device' && platform !== 'Unknown Platform' 
                ? `${device_name} (${platform})`
                : device_name !== 'Unknown Device' 
                    ? device_name
                    : platform !== 'Unknown Platform'
                        ? `Mobile device (${platform})`
                        : 'Mobile device';
                        
            const message = `📱 ${deviceInfo} wants to connect`;
            
            
            const result = await vscode.window.showInformationMessage(
                message,
                approveButton,
                denyButton,
                detailsButton
            );
            
            if (result === approveButton) {
                // Call API to approve the validation
                await this.approveValidationRequest(validation_id);
            } else if (result === denyButton) {
                vscode.window.showInformationMessage('🚫 Device access denied');
                // Validation request will automatically expire, no need to explicitly deny
            } else if (result === detailsButton) {
                // Show detailed information in a more user-friendly way
                const versionDisplay = version ? ` ${version}` : '';
                const detailMessage = `Device Details:\n\n📱 Name: ${device_name}\n🖥️ Platform: ${platform}${versionDisplay}\n🌐 IP Address: ${ip_address}\n⏰ Requested: ${new Date(requested_at).toLocaleString()}\n⏳ Expires: ${new Date(expires_at).toLocaleString()}\n\nThis device will have access to your VS Code workspace, files, and Copilot chat. Only approve devices you trust.`;
                
                const detailResult = await vscode.window.showInformationMessage(
                    detailMessage,
                    { modal: false }, // Keep it non-modal
                    approveButton,
                    denyButton
                );
                
                if (detailResult === approveButton) {
                    await this.approveValidationRequest(validation_id);
                } else if (detailResult === denyButton) {
                    vscode.window.showInformationMessage('🚫 Device access denied');
                }
            }
            // If user dismisses notification (no result), validation will expire automatically
        } catch (error) {
            console.error('❌ Error handling validation request:', error);
        }
    }

    /**
     * Approve validation request via API
     */
    private async approveValidationRequest(validationId: string): Promise<void> {
        try {
            
            // Use ApiClient instead of direct fetch
            const result = await this.apiClient.approveValidation(validationId);
            
            if (result.success) {
                
                // Extract auth token from response if available
                const authToken = result.data?.auth_token;
                const expiresAt = result.data?.expires_at;
                
                // Show a clean success notification
                vscode.window.showInformationMessage('✅ Mobile device connected successfully!');
            } else {
                console.error('❌ Failed to approve validation:', result.error);
                vscode.window.showErrorMessage(`❌ Failed to approve device: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Error approving validation request:', error);
            vscode.window.showErrorMessage('Error approving device access. Please try again.');
        }
    }

    /**
     * Check validation request status
     */
    async checkValidationStatus(validationId: string): Promise<any> {
        try {
            const result = await this.apiClient.checkValidationStatus(validationId);
            
            if (result.success) {
                return result.data;
            } else {
                console.error('❌ Failed to get validation status:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error checking validation status:', error);
            return null;
        }
    }

    /**
     * Request validation for device pairing (primarily for testing/debugging)
     */
    async requestValidation(pairingCode: string, deviceInfo: any): Promise<any> {
        try {
            const result = await this.apiClient.requestValidation(pairingCode, deviceInfo);
            
            if (result.success) {
                return result.data;
            } else {
                console.error('❌ Failed to request validation:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error requesting validation:', error);
            return null;
        }
    }

    /**
     * Get validation pipeline status and statistics
     */
    getValidationPipelineStatus(): { available: boolean; apiConnected: boolean; authenticated: boolean } {
        return {
            available: true,
            apiConnected: !!this.apiClient,
            authenticated: !!this.discoveryService?.getDeviceToken()
        };
    }
}

