import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as vscode from 'vscode';
import { CopilotBridge, CopilotRequest } from './copilotBridge';
import { DiscoveryService } from './discoveryService';
import * as fs from 'fs';
import * as path from 'path';

export class VSCoderServer {
    private app: express.Application;
    private server: http.Server | undefined;
    private wss: WebSocket.Server | undefined;
    private port: number;
    private copilotBridge: CopilotBridge;
    private connectedClients: Set<WebSocket> = new Set();
    private discoveryService: DiscoveryService;

    constructor(port: number, copilotBridge: CopilotBridge) {
        console.log('🌐 VSCoderServer constructor called with port:', port);
        
        this.port = port;
        this.copilotBridge = copilotBridge;
        this.discoveryService = DiscoveryService.fromConfig();
        
        console.log('📦 Creating Express app...');
        this.app = express();
        
        console.log('⚙️ Setting up middleware...');
        this.setupMiddleware();
        
        console.log('🛤️ Setting up routes...');
        this.setupRoutes();
        
        console.log('✅ VSCoderServer constructor completed');
    }

    private setupMiddleware(): void {
        console.log('🔧 Setting up Express middleware...');
        
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        console.log('✅ Body parsing middleware configured');
        
        // CORS middleware
        this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.log(`📡 ${req.method} ${req.url} from ${req.ip}`);
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            if (req.method === 'OPTIONS') {
                console.log('✅ Handling OPTIONS preflight request');
                res.sendStatus(200);
            } else {
                next();
            }
        });
        
        console.log('✅ CORS middleware configured');
    }

    private setupRoutes(): void {
        // Health check with enhanced information
        this.app.get('/health', async (req: express.Request, res: express.Response) => {
            try {
                const serverInfo = {
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    copilotAvailable: true,
                    connectedClients: this.connectedClients.size,
                    serverType: 'vscode-extension', // Distinguish from discovery service
                    version: vscode.version,
                    workspaceOpen: !!vscode.workspace.workspaceFolders?.length,
                    discoveryRegistered: this.discoveryService.isDeviceRegistered(),
                    pairingCode: this.discoveryService.getPairingCode() || null
                };
                
                console.log('📊 Health check requested, responding with:', serverInfo);
                res.json(serverInfo);
            } catch (error) {
                console.error('❌ Health check error:', error);
                res.json({ 
                    status: 'ok', 
                    copilotAvailable: false,
                    copilotError: String(error),
                    connectedClients: this.connectedClients.size,
                    serverType: 'vscode-extension',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Discovery service compatibility endpoints for mobile apps
        this.app.get('/workspace', async (req: express.Request, res: express.Response) => {
            try {
                console.log('📱 Mobile app requesting workspace info via discovery endpoint');
                
                // If this is being called, the mobile app is likely connecting to the wrong service
                // Provide helpful guidance
                const response = {
                    error: 'This is a VS Code server, not the discovery service',
                    message: 'You are connecting directly to a VS Code extension server. To connect properly, use the discovery service with your pairing code.',
                    serverType: 'vscode-extension',
                    discoveryServiceUrl: 'https://vscoder.sabitfirmalar.com.tr',
                    guidance: {
                        step1: 'Use the VSCoder mobile app pairing feature',
                        step2: 'Enter your 6-digit pairing code',
                        step3: 'The app will automatically discover this VS Code instance',
                        step4: 'Connection will be established securely'
                    },
                    currentPairingCode: this.discoveryService.getPairingCode() || 'Not available - restart VS Code extension'
                };
                
                res.status(400).json(response);
            } catch (error) {
                res.status(500).json({ 
                    error: 'VS Code workspace error',
                    message: String(error),
                    serverType: 'vscode-extension'
                });
            }
        });

        // Get workspace info (proper endpoint for connected apps)
        this.app.get('/api/workspace', async (req: express.Request, res: express.Response) => {
            try {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders) {
                    return res.json({ error: 'No workspace open' });
                }

                const workspaceInfo = {
                    folders: workspaceFolders.map(folder => ({
                        name: folder.name,
                        uri: folder.uri.fsPath
                    }))
                };

                res.json(workspaceInfo);
            } catch (error) {
                res.status(500).json({ error: String(error) });
            }
        });

        // Get file tree
        this.app.get('/files', async (req: express.Request, res: express.Response) => {
            console.log('📱 Mobile app requesting files via discovery endpoint');
            
            // This endpoint should not be called directly by mobile apps
            // They should use the proper pairing flow
            const response = {
                error: 'This is a VS Code server, not the discovery service',
                message: 'You are connecting directly to a VS Code extension server. Use the pairing flow instead.',
                serverType: 'vscode-extension',
                discoveryServiceUrl: 'https://vscoder.sabitfirmalar.com.tr',
                guidance: {
                    instructions: 'Use the mobile app pairing feature with your 6-digit code',
                    currentPairingCode: this.discoveryService.getPairingCode() || 'Not available'
                }
            };
            
            res.status(400).json(response);
        });

        // Get file tree (proper endpoint for connected apps)
        this.app.get('/api/files', async (req: express.Request, res: express.Response) => {
            try {
                let folderPath = req.query.path as string;
                const workspaceFolders = vscode.workspace.workspaceFolders;
                
                console.log('📂 File tree request:', { folderPath, workspaceFolders: workspaceFolders?.length });
                
                if (!workspaceFolders) {
                    return res.status(400).json({ error: 'No workspace open' });
                }

                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                
                // Handle special case: treat '/' as empty (workspace root)
                if (folderPath === '/') {
                    folderPath = '';
                }
                
                // Determine target path - always within workspace
                let targetPath: string;
                if (folderPath) {
                    // If folderPath is provided, it should be relative to workspace root
                    if (path.isAbsolute(folderPath)) {
                        // If somehow an absolute path is passed, ensure it's within workspace
                        if (!folderPath.startsWith(workspaceRoot)) {
                            console.log('❌ Access denied: path outside workspace', folderPath);
                            return res.status(403).json({ error: 'Access denied: path outside workspace' });
                        }
                        targetPath = folderPath;
                    } else {
                        // Relative path - join with workspace root
                        targetPath = path.join(workspaceRoot, folderPath);
                    }
                } else {
                    // No path specified, use workspace root
                    targetPath = workspaceRoot;
                }
                
                // Security check: ensure target path is within workspace
                const normalizedTarget = path.normalize(targetPath);
                const normalizedWorkspace = path.normalize(workspaceRoot);
                if (!normalizedTarget.startsWith(normalizedWorkspace)) {
                    console.log('❌ Security violation: attempting to access path outside workspace', {
                        target: normalizedTarget,
                        workspace: normalizedWorkspace
                    });
                    return res.status(403).json({ error: 'Access denied: path outside workspace' });
                }
                
                console.log('📂 Resolved target path:', { 
                    originalPath: folderPath, 
                    targetPath: targetPath,
                    workspaceRoot: workspaceRoot
                });
                
                const fileTree = await this.getFileTree(targetPath, false); // Don't recurse by default
                
                console.log('📂 File tree response:', { 
                    path: targetPath, 
                    type: fileTree?.type, 
                    children: fileTree?.children?.length || 0 
                });
                
                res.json(fileTree);
            } catch (error) {
                console.error('❌ File tree error:', error);
                res.status(500).json({ error: String(error) });
            }
        });

        // Get file content
        this.app.get('/file/*', async (req: express.Request, res: express.Response) => {
            try {
                const filePath = decodeURIComponent(req.path.replace('/file/', ''));
                const workspaceFolders = vscode.workspace.workspaceFolders;
                
                console.log('📄 File request received:', { 
                    originalPath: req.path, 
                    decodedPath: filePath,
                    workspaceFolders: workspaceFolders?.map(f => f.uri.fsPath)
                });
                
                if (!workspaceFolders) {
                    console.log('❌ No workspace open');
                    return res.status(400).json({ error: 'No workspace open' });
                }
                
                const workspaceRoot = workspaceFolders[0].uri;
                
                // Security check: ensure file path is safe and within workspace
                if (filePath.includes('..') || filePath.includes('~') || path.isAbsolute(filePath)) {
                    console.log('❌ Security violation: suspicious file path', filePath);
                    return res.status(403).json({ error: 'Access denied: invalid file path' });
                }
                
                // Resolve path relative to workspace root using VS Code URI
                const fileUri = vscode.Uri.joinPath(workspaceRoot, filePath);
                
                // Additional security check: ensure resolved path is within workspace
                const resolvedPath = fileUri.fsPath;
                const normalizedResolved = path.normalize(resolvedPath);
                const normalizedWorkspace = path.normalize(workspaceRoot.fsPath);
                if (!normalizedResolved.startsWith(normalizedWorkspace)) {
                    console.log('❌ Security violation: file path outside workspace', {
                        resolved: normalizedResolved,
                        workspace: normalizedWorkspace
                    });
                    return res.status(403).json({ error: 'Access denied: file outside workspace' });
                }
                
                console.log('📄 File request details:', { 
                    filePath, 
                    workspaceRoot: workspaceRoot.fsPath, 
                    fileUri: fileUri.fsPath
                });
                
                // Use VS Code's workspace file system API
                try {
                    const fileData = await vscode.workspace.fs.readFile(fileUri);
                    const content = Buffer.from(fileData).toString('utf-8');
                    console.log('✅ File content loaded successfully:', filePath);
                    res.json({ content, path: fileUri.fsPath });
                } catch (fsError) {
                    console.log('📄 File not found or access denied:', fileUri.fsPath, fsError);
                    if ((fsError as any).code === 'FileNotFound') {
                        return res.status(404).json({ error: 'File not found', requestedPath: fileUri.fsPath });
                    } else {
                        return res.status(403).json({ error: 'File access denied', requestedPath: fileUri.fsPath, details: String(fsError) });
                    }
                }
            } catch (error) {
                console.error('❌ Error loading file:', error);
                res.status(500).json({ error: String(error) });
            }
        });

        // Update file content
        this.app.post('/file/*', async (req: express.Request, res: express.Response) => {
            try {
                const filePath = decodeURIComponent(req.path.replace('/file/', ''));
                const { content } = req.body;
                const workspaceFolders = vscode.workspace.workspaceFolders;
                
                if (!workspaceFolders) {
                    return res.status(400).json({ error: 'No workspace open' });
                }
                
                // Resolve path relative to workspace root using VS Code URI
                const workspaceRoot = workspaceFolders[0].uri;
                const fileUri = vscode.Uri.joinPath(workspaceRoot, filePath);
                
                console.log('💾 File update request:', { filePath, workspaceRoot: workspaceRoot.fsPath, fileUri: fileUri.fsPath });
                
                try {
                    // Use VS Code's workspace file system API
                    const fileData = Buffer.from(content, 'utf-8');
                    await vscode.workspace.fs.writeFile(fileUri, fileData);
                    console.log('✅ File updated successfully:', filePath);
                    
                    // Notify all connected clients about the file change
                    this.broadcastToClients({
                        type: 'fileChanged',
                        path: fileUri.fsPath,
                        content
                    });

                    res.json({ success: true });
                } catch (fsError) {
                    console.log('❌ File update denied:', fileUri.fsPath, fsError);
                    return res.status(403).json({ error: 'File update denied', requestedPath: fileUri.fsPath, details: String(fsError) });
                }
            } catch (error) {
                console.error('❌ Error updating file:', error);
                res.status(500).json({ error: String(error) });
            }
        });

        // Copilot requests
        this.app.post('/copilot', async (req: express.Request, res: express.Response) => {
            try {
                const copilotRequest: CopilotRequest = req.body;
                const response = await this.copilotBridge.handleCopilotRequest(copilotRequest);
                res.json(response);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Check Copilot availability
        this.app.get('/copilot/status', async (req: express.Request, res: express.Response) => {
            try {
                res.json({ 
                    available: true, 
                    agentModes: ['autonomous', 'interactive', 'code-review', 'refactor', 'optimize', 'debug'],
                    modelCommands: {
                        getModels: 'GET /copilot/models',
                        changeModel: 'POST /copilot/change-model',
                        switchModel: 'POST /copilot/switch-model',
                        manageModels: 'POST /copilot/manage-models'
                    }
                });
            } catch (error) {
                res.status(500).json({ error: String(error) });
            }
        });

        // Accept edits from current file
        this.app.post('/copilot/accept-edits', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.acceptFileEdit();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Reject edits from current file
        this.app.post('/copilot/reject-edits', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.rejectFileEdit();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Accept all edits
        this.app.post('/copilot/accept-all-edits', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.acceptAllEdits();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Reject all edits
        this.app.post('/copilot/reject-all-edits', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.rejectAllEdits();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Undo edit
        this.app.post('/copilot/undo-edit', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.undoEdit();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Redo edit
        this.app.post('/copilot/redo-edit', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.redoEdit();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Get available models
        this.app.get('/copilot/models', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.getAvailableModels();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Change model
        this.app.post('/copilot/change-model', async (req: express.Request, res: express.Response) => {
            try {
                const { modelName } = req.body;
                const result = await this.copilotBridge.changeModel(modelName);
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Switch to next model
        this.app.post('/copilot/switch-model', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.switchToNextModel();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Manage models
        this.app.post('/copilot/manage-models', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.manageModels();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Get recent logs
        this.app.get('/copilot/logs', async (req: express.Request, res: express.Response) => {
            try {
                const result = await this.copilotBridge.getRecentLogs();
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Add file to chat using VS Code's native command
        this.app.post('/copilot/add-file-to-chat', async (req: express.Request, res: express.Response) => {
            try {
                const { filePath } = req.body;
                const workspaceFolders = vscode.workspace.workspaceFolders;
                
                console.log('📎 Add file to chat request:', { filePath });
                
                if (!workspaceFolders) {
                    return res.status(400).json({ error: 'No workspace open' });
                }
                
                // Security check: ensure file path is safe and within workspace
                if (!filePath || filePath.includes('..') || filePath.includes('~') || path.isAbsolute(filePath)) {
                    console.log('❌ Security violation: suspicious file path for chat', filePath);
                    return res.status(403).json({ error: 'Access denied: invalid file path' });
                }
                
                const workspaceRoot = workspaceFolders[0].uri;
                const fileUri = vscode.Uri.joinPath(workspaceRoot, filePath);
                
                // Additional security check: ensure resolved path is within workspace
                const resolvedPath = fileUri.fsPath;
                const normalizedResolved = path.normalize(resolvedPath);
                const normalizedWorkspace = path.normalize(workspaceRoot.fsPath);
                if (!normalizedResolved.startsWith(normalizedWorkspace)) {
                    console.log('❌ Security violation: file path outside workspace for chat', {
                        resolved: normalizedResolved,
                        workspace: normalizedWorkspace
                    });
                    return res.status(403).json({ error: 'Access denied: file outside workspace' });
                }
                
                console.log('📎 Adding file to chat:', { filePath, fileUri: fileUri.fsPath });
                
                try {
                    // Simple approach: try the main command that exists, then fallback
                    let success = false;
                    let method = '';
                    
                    // Method 1: Use the official addToChatAction command
                    try {
                        await vscode.commands.executeCommand('workbench.action.chat.addToChatAction', fileUri);
                        success = true;
                        method = 'addToChatAction';
                        console.log('✅ Successfully added file to chat via addToChatAction');
                    } catch (error1) {
                        console.log('❌ addToChatAction failed:', error1);
                        
                        // Method 2: Try the inlineResourceAnchor command as fallback
                        try {
                            await vscode.commands.executeCommand('chat.inlineResourceAnchor.addFileToChat', fileUri);
                            success = true;
                            method = 'inlineResourceAnchor';
                            console.log('✅ Successfully added file to chat via inlineResourceAnchor');
                        } catch (error2) {
                            console.log('❌ inlineResourceAnchor failed:', error2);
                            
                            // Method 3: Fallback - open both file and chat
                            try {
                                // Open the file in editor
                                const doc = await vscode.workspace.openTextDocument(fileUri);
                                await vscode.window.showTextDocument(doc);
                                
                                // Open chat panel (this command should exist)
                                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                                
                                success = true;
                                method = 'manual_fallback';
                                console.log('✅ Opened file and chat for manual attachment');
                            } catch (error3) {
                                console.log('❌ Manual fallback failed:', error3);
                                throw new Error(`Failed to add file to chat: ${error1}`);
                            }
                        }
                    }
                    
                    if (success) {
                        console.log(`✅ File handled using method: ${method}`, filePath);
                        res.json({ 
                            success: true, 
                            message: method === 'addToChatAction' 
                                ? `File ${path.basename(filePath)} added to chat successfully.`
                                : method === 'inlineResourceAnchor' 
                                    ? `File ${path.basename(filePath)} attached to chat.`
                                    : `File ${path.basename(filePath)} opened. Please manually add it to chat.`,
                            filePath: filePath,
                            method: method,
                            requiresManualAction: method === 'manual_fallback'
                        });
                    } else {
                        throw new Error('All methods failed');
                    }
                } catch (commandError) {
                    console.log('❌ All methods failed to execute addFileToChat:', commandError);
                    // Fallback: try to open chat and show the file was attached
                    try {
                        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                        res.json({ 
                            success: true, 
                            message: `Chat opened. File ${path.basename(filePath)} is ready to be discussed.`,
                            filePath: filePath,
                            fallback: true
                        });
                    } catch (fallbackError) {
                        return res.status(500).json({ 
                            success: false, 
                            error: 'Failed to add file to chat', 
                            details: String(commandError) 
                        });
                    }
                }
            } catch (error) {
                console.error('❌ Error adding file to chat:', error);
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Run pending commands
        this.app.post('/copilot/run-pending-commands', async (req: express.Request, res: express.Response) => {
            try {
                console.log('🔄 Running pending commands...');
                const result = await this.copilotBridge.runPendingCommands();
                console.log('✅ Run pending commands result:', result);
                res.json(result);
            } catch (error) {
                console.error('❌ Error running pending commands:', error);
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Continue iteration
        this.app.post('/copilot/continue-iteration', async (req: express.Request, res: express.Response) => {
            try {
                console.log('🔁 Continuing iteration...');
                const result = await this.copilotBridge.continueIteration();
                console.log('✅ Continue iteration result:', result);
                res.json(result);
            } catch (error) {
                console.error('❌ Error continuing iteration:', error);
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Auto-execute (run pending commands + continue iteration)
        this.app.post('/copilot/auto-execute', async (req: express.Request, res: express.Response) => {
            try {
                console.log('⚡ Auto-executing pending actions...');
                
                // Only run pending commands, don't trigger new iteration
                const pendingResult = await this.copilotBridge.runPendingCommands();
                let totalActions = 0;
                
                if (pendingResult.success) {
                    totalActions += pendingResult.data?.commandsRun || 0;
                }

                const result = {
                    success: true,
                    data: {
                        commandsRun: totalActions,
                        action: 'auto_executed',
                        pendingCommandsResult: pendingResult
                    },
                    message: totalActions > 0 ? 'Auto-executed all pending actions' : 'No pending actions found'
                };
                
                console.log('✅ Auto-execute result:', result);
                res.json(result);
            } catch (error) {
                console.error('❌ Error auto-executing:', error);
                res.status(500).json({ success: false, error: String(error) });
            }
        });
    }

    private setupWebSocket(): void {
        if (!this.server) return;

        this.wss = new WebSocket.Server({ server: this.server });

        this.wss.on('connection', (ws: WebSocket) => {
            this.connectedClients.add(ws);
            console.log('Client connected via WebSocket');

            ws.on('message', async (message: WebSocket.Data) => {
                try {
                    const data = JSON.parse(message.toString());
                    await this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    ws.send(JSON.stringify({ error: 'Invalid message format' }));
                }
            });

            ws.on('close', () => {
                this.connectedClients.delete(ws);
                console.log('Client disconnected from WebSocket');
            });

            // Send initial connection confirmation
            ws.send(JSON.stringify({ 
                type: 'connected', 
                message: 'Connected to VSCoder server' 
            }));
        });
    }

    private async handleWebSocketMessage(ws: WebSocket, data: any): Promise<void> {
        switch (data.type) {
            case 'copilot':
                const response = await this.copilotBridge.handleCopilotRequest(data.request);
                ws.send(JSON.stringify({ type: 'copilotResponse', data: response }));
                break;
            
            case 'fileChange':
                // Handle real-time file changes
                this.broadcastToClients(data, ws);
                break;

            default:
                ws.send(JSON.stringify({ error: 'Unknown message type' }));
        }
    }

    private broadcastToClients(data: any, exclude?: WebSocket): void {
        this.connectedClients.forEach(client => {
            if (client !== exclude && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }

    private async getFileTree(dirPath: string, recursive: boolean = true): Promise<any> {
        try {
            // Use VS Code's file system API instead of direct fs access
            const dirUri = vscode.Uri.file(dirPath);
            const stats = await vscode.workspace.fs.stat(dirUri);
            
            // Get workspace root for relative path calculation
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || '';
            
            // Security check: ensure dirPath is within workspace
            const normalizedDirPath = path.normalize(dirPath);
            const normalizedWorkspaceRoot = path.normalize(workspaceRoot);
            if (!normalizedDirPath.startsWith(normalizedWorkspaceRoot)) {
                console.log('❌ getFileTree security violation: path outside workspace', {
                    dirPath: normalizedDirPath,
                    workspace: normalizedWorkspaceRoot
                });
                throw new Error('Access denied: path outside workspace');
            }
            
            // Calculate relative path from workspace root
            const getRelativePath = (absolutePath: string): string => {
                if (workspaceRoot && absolutePath.startsWith(workspaceRoot)) {
                    let relativePath = path.relative(workspaceRoot, absolutePath);
                    // Normalize path separators to forward slashes
                    relativePath = relativePath.replace(/\\/g, '/');
                    // If it's the workspace root itself, return empty string or "."
                    if (relativePath === '') {
                        return '.';
                    }
                    return relativePath;
                }
                return absolutePath;
            };
            
            const info: any = {
                name: path.basename(dirPath),
                path: getRelativePath(dirPath)  // Use relative path
            };

            if (stats.type === vscode.FileType.Directory) {
                info.type = 'directory';
                info.children = [];
                
                try {
                    const entries = await vscode.workspace.fs.readDirectory(dirUri);
                    for (const [name, type] of entries) {
                        // Skip hidden files and node_modules
                        if (name.startsWith('.') || name === 'node_modules') {
                            continue;
                        }
                        
                        const fullPath = path.join(dirPath, name);
                        
                        // Security check: ensure child path is still within workspace
                        const normalizedFullPath = path.normalize(fullPath);
                        if (!normalizedFullPath.startsWith(normalizedWorkspaceRoot)) {
                            console.log('❌ Skipping file outside workspace:', fullPath);
                            continue;
                        }
                        
                        try {
                            if (type === vscode.FileType.Directory) {
                                // For directories, create a basic entry
                                const dirInfo = {
                                    name: name,
                                    path: getRelativePath(fullPath),  // Use relative path
                                    type: 'directory',
                                    children: recursive ? (await this.getFileTree(fullPath, recursive)).children : []
                                };
                                info.children.push(dirInfo);
                            } else {
                                // For files, get the stats
                                const fileStats = await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
                                info.children.push({
                                    name: name,
                                    path: getRelativePath(fullPath),  // Use relative path
                                    type: 'file',
                                    size: fileStats.size
                                });
                            }
                        } catch (error) {
                            // Skip files that can't be read
                            console.log('Cannot read file/dir:', fullPath, error);
                            continue;
                        }
                    }
                } catch (error) {
                    console.log('Cannot read directory:', dirPath, error);
                }
            } else {
                info.type = 'file';
                info.size = stats.size;
            }

            return info;
        } catch (error) {
            console.log('VS Code API failed, falling back to fs:', error);
            // Fallback to regular fs for backward compatibility
            const stats = fs.statSync(dirPath);
            
            // Get workspace root for relative path calculation in fallback
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || '';
            
            // Security check in fallback too
            const normalizedDirPath = path.normalize(dirPath);
            const normalizedWorkspaceRoot = path.normalize(workspaceRoot);
            if (!normalizedDirPath.startsWith(normalizedWorkspaceRoot)) {
                console.log('❌ Fallback security violation: path outside workspace', {
                    dirPath: normalizedDirPath,
                    workspace: normalizedWorkspaceRoot
                });
                throw new Error('Access denied: path outside workspace');
            }
            
            // Calculate relative path from workspace root (same logic as above)
            const getRelativePath = (absolutePath: string): string => {
                if (workspaceRoot && absolutePath.startsWith(workspaceRoot)) {
                    let relativePath = path.relative(workspaceRoot, absolutePath);
                    // Normalize path separators to forward slashes
                    relativePath = relativePath.replace(/\\/g, '/');
                    // If it's the workspace root itself, return empty string or "."
                    if (relativePath === '') {
                        return '.';
                    }
                    return relativePath;
                }
                return absolutePath;
            };
            
            const info: any = {
                name: path.basename(dirPath),
                path: getRelativePath(dirPath)  // Use relative path in fallback too
            };

            if (stats.isDirectory()) {
                info.type = 'directory';
                info.children = [];
                
                const files = fs.readdirSync(dirPath);
                for (const file of files) {
                    // Skip hidden files and node_modules
                    if (file.startsWith('.') || file === 'node_modules') {
                        continue;
                    }
                    
                    const fullPath = path.join(dirPath, file);
                    
                    // Security check in fallback too
                    const normalizedFullPath = path.normalize(fullPath);
                    if (!normalizedFullPath.startsWith(normalizedWorkspaceRoot)) {
                        console.log('❌ Fallback: Skipping file outside workspace:', fullPath);
                        continue;
                    }
                    
                    try {
                        const fileStats = fs.statSync(fullPath);
                        if (fileStats.isDirectory()) {
                            info.children.push({
                                name: file,
                                path: getRelativePath(fullPath),  // Use relative path
                                type: 'directory',
                                children: recursive ? (await this.getFileTree(fullPath, recursive)).children : []
                            });
                        } else {
                            info.children.push({
                                name: file,
                                path: getRelativePath(fullPath),  // Use relative path
                                type: 'file',
                                size: fileStats.size
                            });
                        }
                    } catch (error) {
                        // Skip files that can't be read
                        continue;
                    }
                }
            } else {
                info.type = 'file';
                info.size = stats.size;
            }

            return info;
        }
    }

    private isFileInWorkspace(filePath: string, workspaceFolders: readonly vscode.WorkspaceFolder[]): boolean {
        console.log('🔍 Checking file access:', { filePath, workspaceFolders: workspaceFolders.map(f => f.uri.fsPath) });
        
        // Normalize paths for comparison (handle Windows vs Unix paths)
        const normalizedFilePath = path.normalize(filePath).toLowerCase();
        
        const isAllowed = workspaceFolders.some(folder => {
            const normalizedWorkspacePath = path.normalize(folder.uri.fsPath).toLowerCase();
            const isInWorkspace = normalizedFilePath.startsWith(normalizedWorkspacePath);
            console.log('📂 Workspace check:', { 
                folder: normalizedWorkspacePath, 
                file: normalizedFilePath, 
                allowed: isInWorkspace 
            });
            return isInWorkspace;
        });
        
        console.log('🔐 Final access decision:', isAllowed);
        return isAllowed;
    }

    public async start(): Promise<void> {
        console.log(`🚀 Starting VSCoder server on port ${this.port}...`);
        
        return new Promise((resolve, reject) => {
            const tryStartServer = (currentPort: number, maxAttempts: number = 10) => {
                if (maxAttempts <= 0) {
                    reject(new Error(`Failed to start server after trying ports ${this.port} to ${currentPort - 1}`));
                    return;
                }

                try {
                    console.log(`📡 Attempting to start server on port ${currentPort}...`);
                    this.server = this.app.listen(currentPort, async () => {
                        console.log(`✅ VSCoder server running on port ${currentPort}`);
                        this.port = currentPort; // Update the port to the successful one
                        console.log('🔌 Setting up WebSocket...');
                        this.setupWebSocket();
                        
                        // Register with discovery service
                        try {
                            console.log('🔐 Registering with discovery service...');
                            await this.discoveryService.register(this.port);
                            console.log('✅ Discovery service registration completed');
                        } catch (error) {
                            console.warn('⚠️ Discovery service registration failed:', error);
                            // Don't fail server startup if discovery registration fails
                        }
                        
                        console.log('🎉 Server startup completed successfully');
                        resolve();
                    });

                    this.server.on('error', (error: any) => {
                        if (error.code === 'EADDRINUSE') {
                            console.warn(`⚠️ Port ${currentPort} is already in use, trying port ${currentPort + 1}...`);
                            this.server = undefined;
                            // Try next port
                            setTimeout(() => tryStartServer(currentPort + 1, maxAttempts - 1), 100);
                        } else {
                            console.error('❌ Server error during startup:', error);
                            reject(error);
                        }
                    });
                    
                    console.log(`⏳ Waiting for server to start listening on port ${currentPort}...`);
                } catch (error) {
                    console.error('❌ Failed to start server:', error);
                    reject(error);
                }
            };

            // Start trying from the configured port
            tryStartServer(this.port);
        });
    }

    public async stop(): Promise<void> {
        console.log('🛑 Stopping VSCoder server...');
        
        // Unregister from discovery service
        try {
            console.log('🔐 Unregistering from discovery service...');
            await this.discoveryService.unregister();
            console.log('✅ Discovery service unregistration completed');
        } catch (error) {
            console.warn('⚠️ Discovery service unregistration failed:', error);
        }
        
        if (this.wss) {
            console.log('🔌 Closing WebSocket server...');
            this.wss.close();
            this.wss = undefined;
            console.log('✅ WebSocket server closed');
        }

        if (this.server) {
            console.log('📡 Closing HTTP server...');
            this.server.close();
            this.server = undefined;
            console.log('✅ HTTP server closed');
        }

        console.log(`🧹 Clearing ${this.connectedClients.size} connected clients...`);
        this.connectedClients.clear();
        console.log('✅ VSCoder server stopped completely');
    }

    public getPort(): number {
        return this.port;
    }

    public getPairingCode(): string | undefined {
        return this.discoveryService.getPairingCode();
    }

    public getDiscoveryService(): DiscoveryService {
        return this.discoveryService;
    }
}
