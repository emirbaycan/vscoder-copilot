import * as vscode from 'vscode';

export interface CopilotRequest {
    type: 'agent';
    prompt: string;
    agentMode?: 'autonomous' | 'interactive' | 'code-review' | 'refactor' | 'optimize' | 'debug';
    language?: string;
    filePath?: string;
    modelName?: string; // Optional model selection
    context?: {
        workspace?: string;
        selectedText?: string;
        cursorPosition?: number;
        openFiles?: string[];
    };
}

export interface CopilotResponse {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * Simple Copilot Bridge - GitHub Copilot @workspace Agent integration only
 */
export class CopilotBridge {
    private outputChannel: vscode.OutputChannel;
    private progressCallback?: (update: any) => void;
    private canSyncCallback?: () => boolean; // Check if sync is available

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('VSCoder - Copilot Bridge');
    }

    /**
     * Set callback for progressive updates during Copilot operations
     */
    setProgressCallback(callback: (update: any) => void): void {
        this.progressCallback = callback;
    }

    /**
     * Set callback to check if sync is available (pairing code exists)
     */
    setCanSyncCallback(callback: () => boolean): void {
        this.canSyncCallback = callback;
    }

    /**
     * Send progress update to connected clients
     */
    private sendProgressUpdate(type: string, data: any): void {
        // Reduced logging - only essential info
        if (this.progressCallback) {
            const updatePayload = {
                type: 'copilotProgress',
                updateType: type,
                data: data,
                timestamp: new Date().toISOString()
            };
            
            this.progressCallback(updatePayload);
        }
    }

    /**
     * Main method to handle Copilot requests from mobile app
     */
    async handleCopilotRequest(request: CopilotRequest): Promise<CopilotResponse> {
        try {
            if (request.type !== 'agent') {
                return { success: false, error: 'Only agent mode is supported' };
            }

            const result = await this.handleAgentMode(request);
            return result;
        } catch (error) {
            this.outputChannel.appendLine(`❌ Copilot error: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Handle agent mode requests with enhanced real-time monitoring
     */
    private async handleAgentMode(request: CopilotRequest): Promise<CopilotResponse> {
        try {
            const agentMode = request.agentMode || 'autonomous';
            
            this.sendProgressUpdate('started', {
                message: `Starting ${agentMode} mode...`,
                agentMode: agentMode
            });
            
            // Switch model if specified
            if (request.modelName) {
                this.sendProgressUpdate('model_switching', {
                    message: `Switching to model: ${request.modelName}`,
                    modelName: request.modelName
                });
                
                try {
                    const changeResult = await this.changeModel(request.modelName);
                    if (changeResult.success && changeResult.data?.successfulFormat) {
                        this.sendProgressUpdate('model_switched', {
                            message: `Switched to: ${request.modelName}`,
                            modelName: request.modelName
                        });
                    }
                } catch (modelError) {
                    this.sendProgressUpdate('model_switch_failed', {
                        message: `Failed to switch model`,
                        error: String(modelError)
                    });
                }
            }
            
            // Generate the @workspace agent prompt
            const agentPrompt = this.createAgentPrompt(request, agentMode);
            
            this.sendProgressUpdate('prompt_prepared', {
                message: `Prepared prompt`,
                agentMode: agentMode
            });
            
            this.sendProgressUpdate('invoking_agent', {
                message: `Invoking Copilot Agent...`,
                agentMode: agentMode
            });
            
            const success = await this.invokeCopilotAgentSimple(agentPrompt);
            
            if (success) {
                this.startChatHistorySync();
                
                this.sendProgressUpdate('completed', {
                    message: `Copilot Agent completed`,
                    agentMode: agentMode
                });
                
                return {
                    success: true,
                    data: {
                        message: `Copilot Agent (${agentMode}) completed - chat sync started`,
                        agentMode: agentMode
                    }
                };
            } else {
                this.sendProgressUpdate('failed', {
                    message: `Agent failed`,
                    error: 'Invocation returned false'
                });
                
                return {
                    success: false,
                    error: 'Copilot Agent invocation failed'
                };
            }
        } catch (error) {
            this.sendProgressUpdate('error', {
                message: `Error: ${error}`,
                error: String(error)
            });
            
            return {
                success: false,
                error: `Agent failed: ${error}`
            };
        }
    }

    /**
     * Programmatically invoke the actual GitHub Copilot Workspace Agent
     */
    private async invokeCopilotAgent(prompt: string): Promise<boolean> {
        try {
            const fullPrompt = prompt.startsWith('@workspace') ? prompt : `@workspace ${prompt}`;
            
            try {
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (focusError) {
                // Focus failed, continue anyway
            }
            
            try {
                const commandAttempts = [
                    async () => {
                        await vscode.commands.executeCommand('workbench.action.chat.openAgent');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await vscode.commands.executeCommand('workbench.action.chat.focusInput');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await vscode.commands.executeCommand('type', { text: fullPrompt });
                        await new Promise(resolve => setTimeout(resolve, 300));
                        await vscode.commands.executeCommand('workbench.action.chat.submit');
                    },
                    async () => {
                        await vscode.commands.executeCommand('workbench.action.chat.open');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await vscode.commands.executeCommand('workbench.action.chat.toggleAgentMode');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await vscode.commands.executeCommand('workbench.action.chat.focusInput');
                        await vscode.commands.executeCommand('type', { text: fullPrompt });
                        await vscode.commands.executeCommand('workbench.action.chat.submit');
                    },
                    async () => {
                        await vscode.commands.executeCommand('github.copilot.chat.generate', fullPrompt);
                    },
                    async () => {
                        await vscode.commands.executeCommand('copilot-chat.open');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await vscode.commands.executeCommand('copilot-chat.focus');
                        await vscode.commands.executeCommand('type', { text: fullPrompt });
                        await vscode.commands.executeCommand('workbench.action.chat.submit');
                    }
                ];
                
                for (let i = 0; i < commandAttempts.length; i++) {
                    try {
                        await commandAttempts[i]();
                        return true;
                    } catch (commandError) {
                        // Method failed, try next
                    }
                }
                
                const agentModeUri = vscode.Uri.parse('vscode://GitHub.Copilot-Chat/chat?mode=agent');
                await vscode.commands.executeCommand('vscode.open', agentModeUri);
                await vscode.env.clipboard.writeText(fullPrompt);
                
                return true;
                
            } catch (submissionError) {
                return false;
            }
            
        } catch (error) {
            return false;
        }
    }

    /**
     * Simplified Copilot Agent invocation - actually sends the message
     */
    private async invokeCopilotAgentSimple(prompt: string): Promise<boolean> {
        this.outputChannel.appendLine('🚀 Invoking GitHub Copilot Workspace Agent (simplified)...');
        
        try {
            // Prepare the full prompt
            const fullPrompt = prompt.startsWith('@workspace') ? prompt : `@workspace ${prompt}`;
            this.outputChannel.appendLine(`📤 Prepared prompt: ${fullPrompt}`);
            
            // Try the most reliable method to send the message
            try {
                this.outputChannel.appendLine('🔄 Opening Copilot Chat and sending message...');
                
                // Focus on chat first
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try to open agent mode and send the message
                await vscode.commands.executeCommand('workbench.action.chat.openAgent');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Focus the input and type the message
                await vscode.commands.executeCommand('workbench.action.chat.focusInput');
                await new Promise(resolve => setTimeout(resolve, 300));
                
                await vscode.commands.executeCommand('type', { text: fullPrompt });
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Submit the message
                await vscode.commands.executeCommand('workbench.action.chat.submit');
                
                this.outputChannel.appendLine('✅ Message sent to Copilot Chat successfully');
                return true;
                
            } catch (error) {
                this.outputChannel.appendLine(`❌ Failed to send message: ${error}`);
                return false;
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ GitHub Copilot Agent invocation failed: ${error}`);
            return false;
        }
    }

    /**
     * Enhanced Copilot Agent invocation with real-time progress monitoring
     */
    private async invokeCopilotAgentWithEnhancedMonitoring(prompt: string): Promise<{success: boolean, response?: string, error?: string}> {
        this.outputChannel.appendLine('🚀 Invoking GitHub Copilot Agent with ENHANCED real-time monitoring...');
        
        try {
            // Send initial monitoring update
            this.sendProgressUpdate('monitoring_started', {
                message: 'Starting enhanced monitoring for Copilot Agent response...'
            });
            
            // Get baseline conversation state BEFORE sending prompt
            let baselineConversation = '';
            try {
                this.outputChannel.appendLine('📝 Capturing baseline conversation...');
                this.sendProgressUpdate('capturing_baseline', {
                    message: 'Capturing baseline conversation state...'
                });
                
                await vscode.env.clipboard.writeText('');
                await new Promise(resolve => setTimeout(resolve, 500));
                await vscode.commands.executeCommand('workbench.action.chat.copyAll');
                await new Promise(resolve => setTimeout(resolve, 1500));
                baselineConversation = await vscode.env.clipboard.readText() || '';
                
                this.outputChannel.appendLine(`📝 Baseline captured (${baselineConversation.length} chars)`);
                this.sendProgressUpdate('baseline_captured', {
                    message: `Baseline conversation captured (${baselineConversation.length} characters)`
                });
            } catch (baselineError) {
                this.outputChannel.appendLine(`⚠️ Could not get baseline conversation: ${baselineError}`);
                this.sendProgressUpdate('baseline_failed', {
                    message: `Could not capture baseline: ${baselineError}`,
                    error: String(baselineError)
                });
            }
            
            // Now invoke the agent
            this.outputChannel.appendLine('🤖 Sending prompt to Copilot Agent...');
            this.sendProgressUpdate('sending_prompt', {
                message: 'Sending prompt to GitHub Copilot Agent...'
            });
            
            const invocationSuccess = await this.invokeCopilotAgent(prompt);
            
            if (!invocationSuccess) {
                this.sendProgressUpdate('invocation_failed', {
                    message: 'Failed to invoke Copilot Agent',
                    error: 'Agent invocation unsuccessful'
                });
                return {
                    success: false,
                    error: 'Failed to invoke Copilot Agent'
                };
            }
            
            this.sendProgressUpdate('agent_invoked', {
                message: 'Copilot Agent invoked successfully, monitoring for responses...'
            });
            
            // Start enhanced monitoring for new response - but don't wait for it to complete
            this.outputChannel.appendLine('👁️ Starting UNLIMITED monitoring for ALL Copilot responses...');
            
            // Start monitoring in background - it will run forever and send updates via WebSocket
            this.startUnlimitedMonitoring(prompt, baselineConversation);
            
            // Return success immediately - monitoring will continue and send real-time updates
            this.sendProgressUpdate('monitoring_started', {
                message: 'Unlimited monitoring started - will capture all new responses...'
            });
            
            return {
                success: true,
                response: 'Monitoring started - new responses will be sent via WebSocket in real-time'
            };
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Enhanced monitoring failed: ${error}`);
            this.sendProgressUpdate('monitoring_error', {
                message: `Enhanced monitoring error: ${error}`,
                error: String(error)
            });
            return {
                success: false,
                error: String(error)
            };
        }
    }

    /**
     * Start unlimited monitoring that runs forever in the background
     */
    private startUnlimitedMonitoring(originalPrompt: string, baselineConversation: string): void {
        this.outputChannel.appendLine('🔄 Starting UNLIMITED background monitoring - will run forever...');
        
        const checkInterval = 2000; // Check every 2 seconds
        let lastConversationLength = baselineConversation.length;
        let monitoringCount = 0;
        
        // Wait a bit for VS Code to start generating response
        setTimeout(() => {
            const monitorInterval = setInterval(async () => {
                try {
                    monitoringCount++;
                    this.outputChannel.appendLine(`🔍 [Check #${monitoringCount}] Monitoring for new messages...`);
                    
                    // Clear clipboard and get current conversation
                    await vscode.env.clipboard.writeText('');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    await vscode.commands.executeCommand('workbench.action.chat.copyAll');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    const currentConversation = await vscode.env.clipboard.readText() || '';
                    
                    // Check if conversation has grown beyond baseline
                    if (currentConversation.length > lastConversationLength) {
                        this.outputChannel.appendLine(`📈 [Check #${monitoringCount}] Conversation grew from ${lastConversationLength} to ${currentConversation.length} chars`);
                        
                        // Extract any new responses
                        const newResponse = this.extractCopilotResponseOnly(currentConversation, originalPrompt, baselineConversation);
                        
                        if (newResponse && newResponse.length > 0) {
                            this.outputChannel.appendLine(`🎯 [Check #${monitoringCount}] Found NEW Copilot response: ${newResponse.substring(0, 150)}...`);
                            
                            // Send new response via WebSocket immediately
                            this.sendProgressUpdate('new_response', {
                                message: `New Copilot response detected`,
                                responseLength: newResponse.length,
                                responseContent: newResponse,
                                fullResponse: newResponse,
                                checkNumber: monitoringCount
                            });
                        }
                        
                        // Update our tracking
                        lastConversationLength = currentConversation.length;
                    }
                    
                } catch (monitorError) {
                    this.outputChannel.appendLine(`❌ [Check #${monitoringCount}] Monitoring error (continuing): ${monitorError}`);
                }
            }, checkInterval);
            
            // Never clear this interval - let it run forever
            this.outputChannel.appendLine('♾️ Unlimited monitoring started - will run until VS Code is closed');
            
        }, 3000); // Start after 3 seconds
    }

    /**
     * Programmatically invoke GitHub Copilot Agent and continuously monitor for response
     */
    private async invokeCopilotAgentWithResponse(prompt: string): Promise<{success: boolean, response?: string, error?: string}> {
        this.outputChannel.appendLine('🚀 Invoking GitHub Copilot Agent with FAST response monitoring...');
        
        try {
            // Get baseline conversation state BEFORE sending prompt - try multiple times for reliability
            let baselineConversation = '';
            try {
                this.outputChannel.appendLine('📝 Capturing baseline conversation...');
                await vscode.env.clipboard.writeText('');
                await new Promise(resolve => setTimeout(resolve, 500));
                await vscode.commands.executeCommand('workbench.action.chat.copyAll');
                await new Promise(resolve => setTimeout(resolve, 1500));
                baselineConversation = await vscode.env.clipboard.readText() || '';
                
                this.outputChannel.appendLine(`📝 Baseline captured (${baselineConversation.length} chars)`);
                this.outputChannel.appendLine(`📄 Baseline end: ...${baselineConversation.substring(Math.max(0, baselineConversation.length - 200))}`);
            } catch (baselineError) {
                this.outputChannel.appendLine(`⚠️ Could not get baseline conversation: ${baselineError}`);
            }
            
            // Now invoke the agent
            this.outputChannel.appendLine('🤖 Sending prompt to Copilot Agent...');
            const invocationSuccess = await this.invokeCopilotAgent(prompt);
            
            if (!invocationSuccess) {
                return {
                    success: false,
                    error: 'Failed to invoke Copilot Agent'
                };
            }
            
            // Start fast monitoring for new response
            this.outputChannel.appendLine('👁️ Starting FAST monitoring for NEW Copilot response...');
            let capturedResponse = await this.continuouslyMonitorForResponse(prompt, baselineConversation);
            
            // If fast monitoring didn't work, try alternative approaches
            if (!capturedResponse || capturedResponse.trim().length < 10) {
                this.outputChannel.appendLine('🔄 Fast monitoring failed, trying immediate fallback capture...');
                capturedResponse = await this.fallbackResponseCapture(prompt);
            }
            
            if (capturedResponse && capturedResponse.trim().length > 0) {
                this.outputChannel.appendLine(`✅ CAPTURED RESPONSE: ${capturedResponse.substring(0, 300)}...`);
                return {
                    success: true,
                    response: capturedResponse
                };
            } else {
                this.outputChannel.appendLine('❌ FAILED TO CAPTURE RESPONSE with all methods');
                return {
                    success: false,
                    error: 'Could not capture the actual Copilot response. The agent may have completed but the response content is not accessible.'
                };
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Response capture failed: ${error}`);
            return {
                success: false,
                error: String(error)
            };
        }
    }

    /**
     * Fallback method to capture response using different approaches
     */
    private async fallbackResponseCapture(originalPrompt: string): Promise<string | null> {
        this.outputChannel.appendLine('🔄 Attempting fallback response capture methods...');
        
        // Method 1: Simple wait and capture
        try {
            this.outputChannel.appendLine('📋 Method 1: Simple delay + copyAll');
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
            await vscode.commands.executeCommand('workbench.action.chat.copyAll');
            await new Promise(resolve => setTimeout(resolve, 1000));
            const fullContent = await vscode.env.clipboard.readText() || '';
            
            if (fullContent.length > 100) {
                // Try to extract the last meaningful response
                const lines = fullContent.split('\n').reverse(); // Start from the end
                let responseLines = [];
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.length > 5 && 
                        !trimmed.toLowerCase().includes('user:') &&
                        !trimmed.toLowerCase().includes('@workspace') &&
                        !this.isUsernamePrefix(trimmed)) {
                        responseLines.unshift(trimmed); // Add to beginning since we're working backwards
                        if (responseLines.length > 20) break; // Don't get too much
                    }
                }
                
                const response = responseLines.join('\n').trim();
                if (response.length > 10) {
                    this.outputChannel.appendLine(`✅ Method 1 success: ${response.substring(0, 200)}...`);
                    return response;
                }
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Method 1 failed: ${error}`);
        }
        
        // Method 2: Try to copy last message specifically
        try {
            this.outputChannel.appendLine('📋 Method 2: Copy last response');
            await vscode.commands.executeCommand('workbench.action.chat.copyLastResponse');
            await new Promise(resolve => setTimeout(resolve, 1000));
            const lastResponse = await vscode.env.clipboard.readText() || '';
            
            if (lastResponse.length > 10) {
                this.outputChannel.appendLine(`✅ Method 2 success: ${lastResponse.substring(0, 200)}...`);
                return lastResponse;
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Method 2 failed: ${error}`);
        }
        
        // Method 3: Get workspace state to see if files were modified
        try {
            this.outputChannel.appendLine('📋 Method 3: Check for file modifications');
            const workspaceEdit = vscode.workspace.textDocuments.find(doc => doc.isDirty);
            if (workspaceEdit) {
                const response = `✅ File modifications detected. Copilot Agent made changes to: ${workspaceEdit.fileName}`;
                this.outputChannel.appendLine(`✅ Method 3 success: ${response}`);
                return response;
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Method 3 failed: ${error}`);
        }
        
        this.outputChannel.appendLine('❌ All fallback methods failed');
        return null;
    }

    /**
     * Continuously monitor for new Copilot responses until complete
     */
    private async continuouslyMonitorForResponse(originalPrompt: string, baselineConversation: string): Promise<string | null> {
        this.outputChannel.appendLine('🔄 Starting FAST response monitoring...');
        
        const maxMonitoringTime = 15000; // Reduced to 15 seconds max
        const checkInterval = 800; // Check every 0.8 seconds
        const startTime = Date.now();
        
        let lastResponseLength = 0;
        let stableResponseCount = 0;
        let bestResponse = '';
        let lastFullConversation = '';
        
        // Wait a bit for VS Code to start generating response
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        while (Date.now() - startTime < maxMonitoringTime) {
            try {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                
                // Clear clipboard and get current conversation
                await vscode.env.clipboard.writeText('');
                await new Promise(resolve => setTimeout(resolve, 200));
                
                await vscode.commands.executeCommand('workbench.action.chat.copyAll');
                await new Promise(resolve => setTimeout(resolve, 800));
                
                const currentConversation = await vscode.env.clipboard.readText() || '';
                
                // Check if there's new content
                if (currentConversation.length > baselineConversation.length) {
                    const newResponse = this.extractCopilotResponseOnly(currentConversation, originalPrompt, baselineConversation);
                    
                    if (newResponse && newResponse.length > 0) {
                        this.outputChannel.appendLine(`📈 [${elapsed}s] Found Copilot response (${newResponse.length} chars): ${newResponse.substring(0, 150)}...`);
                        
                        // Check if response has stabilized (not growing anymore)
                        if (newResponse.length === lastResponseLength && lastFullConversation === currentConversation) {
                            stableResponseCount++;
                            this.outputChannel.appendLine(`⏸️ [${elapsed}s] Response stable for ${stableResponseCount} checks`);
                            
                            // If stable for 2 consecutive checks, consider it complete (faster detection)
                            if (stableResponseCount >= 2) {
                                this.outputChannel.appendLine(`✅ [${elapsed}s] Response complete after ${stableResponseCount} stable checks`);
                                return newResponse;
                            }
                        } else {
                            // Response is still growing or conversation changed
                            stableResponseCount = 0;
                            lastResponseLength = newResponse.length;
                            lastFullConversation = currentConversation;
                            bestResponse = newResponse;
                            this.outputChannel.appendLine(`📈 [${elapsed}s] Response growing... current: ${newResponse.length} chars`);
                        }
                    } else {
                        // Try the fallback method for debugging
                        const rawNew = currentConversation.substring(baselineConversation.length);
                        this.outputChannel.appendLine(`⚠️ [${elapsed}s] No Copilot response extracted. Raw new (${rawNew.length}): ${rawNew.substring(0, 200)}...`);
                    }
                } else {
                    this.outputChannel.appendLine(`⏳ [${elapsed}s] Waiting for new content...`);
                }
                
                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                
            } catch (monitorError) {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                this.outputChannel.appendLine(`❌ [${elapsed}s] Monitoring error: ${monitorError}`);
            }
        }
        
        // Timeout reached
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        this.outputChannel.appendLine(`⏰ [${elapsed}s] Monitoring timeout reached`);
        
        // Return the best response we found
        if (bestResponse.length > 0) {
            this.outputChannel.appendLine(`🔄 Returning best response found (${bestResponse.length} chars)`);
            return bestResponse;
        }
        
        this.outputChannel.appendLine('❌ No Copilot response captured during monitoring period');
        return null;
    }

    /**
     * Attempt to capture the ACTUAL response from Copilot chat
     */
    private async attemptResponseCapture(originalPrompt: string): Promise<string | null> {
        this.outputChannel.appendLine('🔍 Attempting to capture ONLY NEW Copilot response after our prompt...');
        
        try {
            // Clear clipboard first to ensure we get fresh content
            await vscode.env.clipboard.writeText('');
            
            // Store the baseline conversation before we start monitoring
            let baselineConversation = '';
            try {
                await vscode.commands.executeCommand('workbench.action.chat.copyAll');
                await new Promise(resolve => setTimeout(resolve, 1000));
                baselineConversation = await vscode.env.clipboard.readText() || '';
                this.outputChannel.appendLine(`� Baseline conversation length: ${baselineConversation.length}`);
            } catch (baselineError) {
                this.outputChannel.appendLine(`⚠️ Could not get baseline: ${baselineError}`);
            }
            
            // Monitor for NEW content continuously
            const maxAttempts = 12; // Monitor for up to 12 attempts (about 18 seconds)
            let lastResponseLength = 0;
            let stableCount = 0;
            let bestResponse = '';
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                this.outputChannel.appendLine(`🔍 Monitoring attempt ${attempt}/${maxAttempts}...`);
                
                try {
                    // Clear clipboard and get current conversation
                    await vscode.env.clipboard.writeText('');
                    await vscode.commands.executeCommand('workbench.action.chat.copyAll');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    const currentConversation = await vscode.env.clipboard.readText() || '';
                    
                    if (currentConversation.length > baselineConversation.length) {
                        // Extract only the NEW part that came after our prompt
                        const newContent = this.extractCopilotResponseOnly(currentConversation, originalPrompt, baselineConversation);
                        
                        if (newContent && newContent.length > 0) {
                            this.outputChannel.appendLine(`📈 Found new response (length: ${newContent.length}): ${newContent.substring(0, 200)}...`);
                            
                            // Check if response is still growing or stable
                            if (newContent.length === lastResponseLength) {
                                stableCount++;
                                this.outputChannel.appendLine(`⏸️ Response stable for ${stableCount} attempts`);
                                
                                // If stable for 2 attempts, we probably have the complete response
                                if (stableCount >= 2) {
                                    this.outputChannel.appendLine(`✅ CAPTURED COMPLETE NEW RESPONSE: ${newContent}`);
                                    return newContent;
                                }
                            } else {
                                stableCount = 0; // Reset if still growing
                                lastResponseLength = newContent.length;
                                bestResponse = newContent; // Keep the best response so far
                                this.outputChannel.appendLine(`📈 Response still growing... current length: ${newContent.length}`);
                            }
                        }
                    }
                    
                    // Wait before next attempt
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                } catch (attemptError) {
                    this.outputChannel.appendLine(`❌ Monitoring attempt ${attempt} failed: ${attemptError}`);
                }
            }
            
            // Return the best response we found, even if not completely stable
            if (bestResponse.length > 0) {
                this.outputChannel.appendLine(`✅ RETURNING BEST RESPONSE FOUND: ${bestResponse}`);
                return bestResponse;
            }
            
            this.outputChannel.appendLine('❌ NO NEW RESPONSE DETECTED after monitoring period');
            return null;
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Response capture completely failed: ${error}`);
            return null;
        }
    }

    /**
     * Extract ONLY Copilot's response from conversation, filtering out user input and system messages
     */
    private extractCopilotResponseOnly(fullConversation: string, originalPrompt: string, baselineConversation: string): string | null {
        this.outputChannel.appendLine('🔍 === EXTRACTING COPILOT RESPONSE ONLY ===');
        this.outputChannel.appendLine(`📊 Full conversation: ${fullConversation.length} chars`);
        this.outputChannel.appendLine(`📊 Baseline conversation: ${baselineConversation.length} chars`);
        
        try {
            // Strategy 1: If we have baseline, get only the new content after it
            if (baselineConversation && baselineConversation.length > 0 && fullConversation.length > baselineConversation.length) {
                const newContent = fullConversation.substring(baselineConversation.length).trim();
                this.outputChannel.appendLine(`� New content after baseline: ${newContent.length} chars`);
                
                if (newContent && newContent.length > 0) {
                    // Clean the new content to remove user echo and extract just the response
                    const cleanedResponse = this.cleanAndExtractResponse(newContent, originalPrompt);
                    if (cleanedResponse && cleanedResponse.length > 10) {
                        this.outputChannel.appendLine(`✅ Extracted NEW response via baseline: ${cleanedResponse.substring(0, 200)}...`);
                        return cleanedResponse;
                    }
                }
            }
            
            // Strategy 2: Find the LAST occurrence of our prompt in the full conversation
            this.outputChannel.appendLine('🔍 Strategy 2: Finding last prompt occurrence in full conversation...');
            const lastPromptIndex = fullConversation.lastIndexOf(originalPrompt);
            if (lastPromptIndex >= 0) {
                const afterPrompt = fullConversation.substring(lastPromptIndex + originalPrompt.length).trim();
                this.outputChannel.appendLine(`📍 Content after last prompt: ${afterPrompt.length} chars`);
                
                if (afterPrompt && afterPrompt.length > 0) {
                    const cleanedResponse = this.cleanAndExtractResponse(afterPrompt, originalPrompt);
                    if (cleanedResponse && cleanedResponse.length > 10) {
                        this.outputChannel.appendLine(`✅ Extracted response via last prompt: ${cleanedResponse.substring(0, 200)}...`);
                        return cleanedResponse;
                    }
                }
            }
            
            // Strategy 3: Look for partial prompt match (first few words)
            const promptWords = originalPrompt.split(' ').slice(0, 5).join(' ');
            const partialPromptIndex = fullConversation.lastIndexOf(promptWords);
            if (partialPromptIndex >= 0) {
                const afterPartialPrompt = fullConversation.substring(partialPromptIndex + promptWords.length).trim();
                this.outputChannel.appendLine(`🔍 Content after partial prompt: ${afterPartialPrompt.length} chars`);
                
                if (afterPartialPrompt && afterPartialPrompt.length > 0) {
                    const cleanedResponse = this.cleanAndExtractResponse(afterPartialPrompt, originalPrompt);
                    if (cleanedResponse && cleanedResponse.length > 10) {
                        this.outputChannel.appendLine(`✅ Extracted response via partial prompt: ${cleanedResponse.substring(0, 200)}...`);
                        return cleanedResponse;
                    }
                }
            }
            
            this.outputChannel.appendLine('❌ All extraction strategies failed');
            return null;
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Extract error: ${error}`);
            return null;
        }
    }

    /**
     * Clean content and extract just the Copilot response part
     */
    private cleanAndExtractResponse(content: string, originalPrompt: string): string | null {
        if (!content || content.trim().length === 0) {
            return null;
        }
        
        // Split into lines for processing
        const lines = content.split('\n');
        const responseLines: string[] = [];
        let inCopilotResponse = false;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines at the start
            if (responseLines.length === 0 && trimmedLine === '') {
                continue;
            }
            
            // Skip lines that are clearly user input or echo
            if (this.isUserInputLine(trimmedLine, originalPrompt)) {
                this.outputChannel.appendLine(`⚠️ Skipping user line: ${trimmedLine.substring(0, 50)}...`);
                continue;
            }
            
            // Look for Copilot response markers
            if (this.isCopilotResponseLine(trimmedLine)) {
                inCopilotResponse = true;
                // Extract content after the marker
                const responseContent = this.extractContentAfterMarker(trimmedLine);
                if (responseContent) {
                    responseLines.push(responseContent);
                }
                continue;
            }
            
            // If we're in a Copilot response or this looks like response content, collect it
            if (inCopilotResponse || this.looksLikeResponseContent(trimmedLine)) {
                responseLines.push(line);
                inCopilotResponse = true;
            }
        }
        
        const response = responseLines.join('\n').trim();
        return response.length > 0 ? response : null;
    }

    /**
     * Check if a line is user input or echo
     */
    private isUserInputLine(line: string, originalPrompt: string): boolean {
        const trimmedLine = line.trim();
        
        // Simple rule: if it starts with @workspace, it's user input
        if (trimmedLine.startsWith('@workspace')) {
            return true;
        }
        
        const lowerLine = line.toLowerCase();
        const lowerPrompt = originalPrompt.toLowerCase();
        
        // Check for traditional user markers
        return (
            lowerLine.startsWith('user:') ||
            lowerLine.startsWith('you:') ||
            lowerLine.startsWith('human:') ||
            lowerLine.includes(lowerPrompt.substring(0, Math.min(20, lowerPrompt.length)))
        );
    }

    /**
     * Check if a line contains Copilot response markers
     */
    private isCopilotResponseLine(line: string): boolean {
        const lowerLine = line.toLowerCase();
        return (
            lowerLine.includes('github copilot:') ||
            lowerLine.includes('copilot:') ||
            (lowerLine.includes('assistant:') && !lowerLine.includes('user'))
        );
    }

    /**
     * Extract username dynamically from a chat line
     */
    private extractUsernameFromLine(line: string): string | null {
        // Handle the format from logs: "Username\nTimestamp" or "Username" followed by timestamp
        const trimmedLine = line.trim();
        
        // Pattern 1: "You\n20:22:36" or "GitHub Copilot\n20:22:01"
        const timestampPattern = /^([A-Za-z\s]+)\n?\s*\d{1,2}:\d{2}:\d{2}/;
        const timestampMatch = trimmedLine.match(timestampPattern);
        if (timestampMatch && timestampMatch[1]) {
            return timestampMatch[1].trim();
        }
        
        // Pattern 2: Simple username on its own line (check if next part looks like timestamp or content)
        if (/^(You|GitHub Copilot|Copilot|Assistant|Human|User)$/i.test(trimmedLine)) {
            return trimmedLine;
        }
        
        // Pattern 3: Traditional "username: message" format
        const colonMatch = line.match(/^([^:]+):\s*/);
        if (colonMatch && colonMatch[1]) {
            const username = colonMatch[1].trim();
            // Exclude known assistant prefixes from being treated as usernames
            const lowerUsername = username.toLowerCase();
            if (!lowerUsername.includes('github copilot') && 
                !lowerUsername.includes('copilot') && 
                !lowerUsername.includes('assistant')) {
                return username;
            }
        }
        
        return null;
    }

    /**
     * Check if a line starts with a username prefix (dynamic detection)
     */
    private isUsernamePrefix(line: string): boolean {
        const username = this.extractUsernameFromLine(line);
        return username !== null;
    }

    /**
     * Extract content after response markers
     */
    private extractContentAfterMarker(line: string): string | null {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('copilot:')) {
            const colonIndex = lowerLine.indexOf('copilot:');
            return line.substring(colonIndex + 8).trim();
        }
        
        if (lowerLine.includes('assistant:')) {
            const colonIndex = lowerLine.indexOf('assistant:');
            return line.substring(colonIndex + 10).trim();
        }
        
        return null;
    }

    /**
     * Check if a line looks like response content
     */
    private looksLikeResponseContent(line: string): boolean {
        const lowerLine = line.toLowerCase();
        return (
            line.length > 10 &&
            (lowerLine.includes("i'll") ||
             lowerLine.includes("let me") ||
             lowerLine.includes("made changes") ||
             lowerLine.includes("perfect") ||
             lowerLine.includes("excellent") ||
             lowerLine.includes("now") ||
             lowerLine.includes("here") ||
             lowerLine.includes("the"))
        );
    }

    /**
     * Extract the assistant's response from a chat conversation export
     */
    private extractAssistantResponse(conversationText: string, originalPrompt: string): string | null {
        try {
            this.outputChannel.appendLine(`🔍 Extracting response from ${conversationText.length} characters of conversation text`);
            
            // Log first 500 chars to see the structure
            this.outputChannel.appendLine(`📝 Conversation sample: ${conversationText.substring(0, 500)}...`);
            
            const lines = conversationText.split('\n');
            let assistantStartIndex = -1;
            let userPromptIndex = -1;
            
            // Find the user prompt and assistant response
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].toLowerCase().trim();
                
                // Check if this line contains our original prompt (be more flexible)
                const promptPart = originalPrompt.toLowerCase().substring(0, Math.min(30, originalPrompt.length));
                if (line.includes(promptPart) || line.includes('@workspace')) {
                    userPromptIndex = i;
                    this.outputChannel.appendLine(`📍 Found user prompt at line ${i}: ${lines[i].substring(0, 100)}...`);
                }
                
                // Look for assistant response indicators after our prompt
                if (userPromptIndex >= 0 && i > userPromptIndex) {
                    if (line.includes('assistant:') || 
                        line.includes('github copilot:') || 
                        line.includes('copilot:') ||
                        line.startsWith('> ') ||
                        // More flexible detection for response content
                        (line.length > 5 && 
                         !line.includes('user:') && 
                         !line.includes('@workspace') &&
                         !line.includes('human:') &&
                         (line.includes("i'll") || line.includes("here") || line.includes("perfect") || line.includes(".")))
                    ) {
                        assistantStartIndex = i;
                        this.outputChannel.appendLine(`📍 Found assistant response start at line ${i}: ${lines[i].substring(0, 100)}...`);
                        break;
                    }
                }
            }
            
            if (assistantStartIndex >= 0) {
                // Extract COMPLETE response from assistant start to end or next user message
                let responseLines = [];
                let foundContent = false;
                
                for (let i = assistantStartIndex; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Stop if we hit another user message or clear end markers
                    if ((line.toLowerCase().includes('user:') || 
                         line.toLowerCase().includes('human:') ||
                         line.startsWith('@')) && i > assistantStartIndex && foundContent) {
                        this.outputChannel.appendLine(`🛑 Stopping at line ${i} (next user message): ${line.substring(0, 50)}...`);
                        break;
                    }
                    
                    // Clean up the line (remove prefixes)
                    let cleanLine = line.replace(/^(assistant:|github copilot:|copilot:)/i, '').trim();
                    
                    // Include ALL substantial content, including file change indicators
                    if (cleanLine.length > 0) {
                        responseLines.push(cleanLine);
                        foundContent = true;
                        this.outputChannel.appendLine(`📄 Added line ${i}: ${cleanLine.substring(0, 100)}...`);
                    }
                }
                
                const response = responseLines.join('\n').trim();
                this.outputChannel.appendLine(`✅ Extracted ${responseLines.length} lines, total length: ${response.length}`);
                
                if (response.length > 10) {
                    return response;
                }
            }
            
            // Enhanced fallback: try to find any substantial text after our prompt
            const promptPart = originalPrompt.toLowerCase().substring(0, Math.min(30, originalPrompt.length));
            const promptIndex = conversationText.toLowerCase().indexOf(promptPart);
            
            if (promptIndex >= 0) {
                this.outputChannel.appendLine(`🔍 Fallback: Found prompt at index ${promptIndex}`);
                const afterPrompt = conversationText.substring(promptIndex + promptPart.length);
                
                // Split into lines and filter for substantial content
                const lines = afterPrompt.split('\n').filter(line => {
                    const trimmed = line.trim();
                    return trimmed.length > 5 && 
                           !trimmed.toLowerCase().includes('user:') &&
                           !trimmed.toLowerCase().includes('human:') &&
                           !trimmed.includes('@workspace');
                });
                
                if (lines.length > 0) {
                    // Take MORE lines to get the complete response
                    const fallbackResponse = lines.slice(0, 10).join('\n').trim();
                    this.outputChannel.appendLine(`🔄 Fallback captured ${lines.length} lines: ${fallbackResponse.substring(0, 200)}...`);
                    return fallbackResponse;
                }
            }
            
            this.outputChannel.appendLine('❌ No response content found in conversation');
            return null;
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to extract assistant response: ${error}`);
            return null;
        }
    }

    /**
     * Create agent prompt based on mode with context support
     */
    private createAgentPrompt(request: CopilotRequest, agentMode: string): string {
        const prompt = request.prompt;
        const finalPrompt = prompt.startsWith('@workspace') ? prompt : `@workspace ${prompt}`;
        return finalPrompt;
    }
    /**
     * Check if Copilot extension is available
     */
    public async isCopilotAvailable(): Promise<boolean> {
        try {
            const copilotExtension = vscode.extensions.getExtension('github.copilot');
            if (!copilotExtension) {
                this.outputChannel.appendLine('GitHub Copilot extension not found');
                return false;
            }

            if (!copilotExtension.isActive) {
                this.outputChannel.appendLine('Activating GitHub Copilot extension...');
                try {
                    await copilotExtension.activate();
                    this.outputChannel.appendLine('GitHub Copilot extension activated');
                } catch (activationError) {
                    this.outputChannel.appendLine(`Failed to activate GitHub Copilot: ${activationError}`);
                    return false;
                }
            }

            this.outputChannel.appendLine('GitHub Copilot is available and ready');
            return true;
        } catch (error) {
            this.outputChannel.appendLine(`Error checking Copilot availability: ${error}`);
            return false;
        }
    }

    /**
     * Get available Copilot commands
     */
    public async getAvailableCommands(): Promise<string[]> {
        try {
            const allCommands = await vscode.commands.getCommands();
            const copilotCommands = allCommands.filter((cmd: any) => 
                cmd.includes('copilot') || cmd.includes('chat') || cmd.includes('github')
            );
            this.outputChannel.appendLine(`Available Copilot/Chat commands: ${copilotCommands.join(', ')}`);
            return copilotCommands;
        } catch (error) {
            this.outputChannel.appendLine(`Error getting commands: ${error}`);
            return [];
        }
    }

    /**
     * Get error diagnostics
     */
    public async getErrorDiagnostics(): Promise<any> {
        return {
            copilotExtensionFound: true,
            copilotExtensionActive: true,
            availableCommands: await this.getAvailableCommands(),
            authenticationStatus: 'unknown',
            suggestions: ['Extension simplified to prompt-only mode']
        };
    }
 
    /**
     * Accept all AI-generated edits
     */
    async acceptAllEdits(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('✅ Accepting all AI edits...');
        
        try {
            // Try different accept commands
            const acceptCommands = [
                'chatEditing.acceptAllFiles',
                'chatEditor.action.accept', 
                'workbench.action.chat.applyCompareEdits'
            ];
            
            for (const cmd of acceptCommands) {
                try {
                    await vscode.commands.executeCommand(cmd);
                    this.outputChannel.appendLine(`✅ Successfully accepted edits via: ${cmd}`);
                    return { success: true, data: { action: 'accepted_all', command: cmd } };
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Failed command ${cmd}: ${error}`);
                }
            }
            
            return { success: false, error: 'All accept commands failed' };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Accept all edits failed: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Reject/discard all AI-generated edits
     */
    async rejectAllEdits(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('❌ Rejecting all AI edits...');
        
        try {
            // Try different reject commands
            const rejectCommands = [
                'chatEditing.discardAllFiles',
                'chatEditor.action.reject',
                'workbench.action.chat.discardCompareEdits'
            ];
            
            for (const cmd of rejectCommands) {
                try {
                    await vscode.commands.executeCommand(cmd);
                    this.outputChannel.appendLine(`✅ Successfully rejected edits via: ${cmd}`);
                    return { success: true, data: { action: 'rejected_all', command: cmd } };
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Failed command ${cmd}: ${error}`);
                }
            }
            
            return { success: false, error: 'All reject commands failed' };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Reject all edits failed: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Accept a specific file edit
     */
    async acceptFileEdit(filePath?: string): Promise<CopilotResponse> {
        this.outputChannel.appendLine(`✅ Accepting file edit: ${filePath || 'current'}`);
        
        try {
            // Try different single file accept commands
            const acceptCommands = [
                'chatEditing.acceptFile',
                'chatEditor.action.accept'
            ];
            
            for (const cmd of acceptCommands) {
                try {
                    if (filePath) {
                        await vscode.commands.executeCommand(cmd, filePath);
                    } else {
                        await vscode.commands.executeCommand(cmd);
                    }
                    this.outputChannel.appendLine(`✅ Successfully accepted file via: ${cmd}`);
                    return { success: true, data: { action: 'accepted_file', command: cmd, filePath } };
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Failed command ${cmd}: ${error}`);
                }
            }
            
            return { success: false, error: 'All accept file commands failed' };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Accept file edit failed: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Reject a specific file edit
     */
    async rejectFileEdit(filePath?: string): Promise<CopilotResponse> {
        this.outputChannel.appendLine(`❌ Rejecting file edit: ${filePath || 'current'}`);
        
        try {
            // Try different single file reject commands
            const rejectCommands = [
                'chatEditing.discardFile',
                'chatEditor.action.reject'
            ];
            
            for (const cmd of rejectCommands) {
                try {
                    if (filePath) {
                        await vscode.commands.executeCommand(cmd, filePath);
                    } else {
                        await vscode.commands.executeCommand(cmd);
                    }
                    this.outputChannel.appendLine(`✅ Successfully rejected file via: ${cmd}`);
                    return { success: true, data: { action: 'rejected_file', command: cmd, filePath } };
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Failed command ${cmd}: ${error}`);
                }
            }
            
            return { success: false, error: 'All reject file commands failed' };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Reject file edit failed: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Undo the last AI-generated edit
     */
    async undoEdit(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('🔙 Undoing last edit...');
        
        try {
            // Try different undo commands
            const undoCommands = [
                'workbench.action.chat.undoEdit',
                'chatEditor.action.undoHunk',
                'workbench.action.chat.undoEdits'
            ];
            
            for (const cmd of undoCommands) {
                try {
                    await vscode.commands.executeCommand(cmd);
                    this.outputChannel.appendLine(`✅ Successfully undid edit via: ${cmd}`);
                    return { success: true, data: { action: 'undid_edit', command: cmd } };
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Failed command ${cmd}: ${error}`);
                }
            }
            
            return { success: false, error: 'All undo commands failed' };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Undo edit failed: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Redo a previously undone edit
     */
    async redoEdit(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('🔄 Redoing edit...');
        
        try {
            // Try different redo commands
            const redoCommands = [
                'workbench.action.chat.redoEdit',
                'workbench.action.redo'
            ];
            
            for (const cmd of redoCommands) {
                try {
                    await vscode.commands.executeCommand(cmd);
                    this.outputChannel.appendLine(`✅ Successfully redid edit via: ${cmd}`);
                    return { success: true, data: { action: 'redid_edit', command: cmd } };
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Failed command ${cmd}: ${error}`);
                }
            }
            
            return { success: false, error: 'All redo commands failed' };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Redo edit failed: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Get available models
     */
    async getAvailableModels(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('🤖 Getting available models...');
        
        try {
            let modelInfo: any = {
                source: 'enhanced_detection',
                modelNames: [],
                providers: []
            };

            // Try to get chat providers information
            try {
                this.outputChannel.appendLine('🔍 Checking for chat providers...');
                
                // Try to access VS Code's language model API
                const vscodeApi = (vscode as any);
                if (vscodeApi.lm && vscodeApi.lm.selectChatModels) {
                    try {
                        const models = await vscodeApi.lm.selectChatModels();
                        this.outputChannel.appendLine(`🔍 Found language models: ${models.length}`);
                        
                        // Parse the actual detected models
                        const detectedModels = models.map((model: any) => ({
                            id: model.id || model.name || 'unknown',
                            family: model.family || 'unknown',
                            version: model.version || 'unknown',
                            vendor: model.vendor || 'unknown'
                        }));
                        
                        // Extract just the model IDs for the main models list
                        modelInfo.models = models.map((model: any) => model.id || model.name || 'unknown');
                        modelInfo.detailedModels = detectedModels;
                        
                        this.outputChannel.appendLine(`🎯 Detected models: ${modelInfo.models.join(', ')}`);
                    } catch (lmError) {
                        this.outputChannel.appendLine(`⚠️ Language model API failed: ${lmError}`);
                    }
                }

                // Try to get GitHub Copilot specific models
                const copilotExtension = vscode.extensions.getExtension('github.copilot');
                if (copilotExtension && copilotExtension.isActive) {
                    try {
                        const copilotApi = copilotExtension.exports;
                        this.outputChannel.appendLine('🔍 Examining Copilot extension API...');
                        
                        if (copilotApi) {
                            // Try to find model-related properties
                            const apiProps = Object.getOwnPropertyNames(copilotApi);
                            this.outputChannel.appendLine(`🔍 Copilot API properties: ${apiProps.join(', ')}`);
                            
                            // Look for common model properties
                            for (const prop of apiProps) {
                                if (prop.toLowerCase().includes('model')) {
                                    try {
                                        const value = copilotApi[prop];
                                        this.outputChannel.appendLine(`🔍 Model property ${prop}: ${typeof value}`);
                                        if (typeof value === 'function') {
                                            try {
                                                const result = await value();
                                                this.outputChannel.appendLine(`🔍 Model function ${prop} result: ${JSON.stringify(result).substring(0, 200)}`);
                                            } catch (funcError) {
                                                this.outputChannel.appendLine(`⚠️ Model function ${prop} failed: ${funcError}`);
                                            }
                                        }
                                    } catch (propError) {
                                        this.outputChannel.appendLine(`⚠️ Could not access property ${prop}: ${propError}`);
                                    }
                                }
                            }
                        }
                    } catch (apiError) {
                        this.outputChannel.appendLine(`⚠️ Could not examine Copilot API: ${apiError}`);
                    }
                }

                // If no models detected, add fallback (but we should have real ones now)
                if (!modelInfo.models || modelInfo.models.length === 0) {
                    modelInfo.models = ['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet'];
                    this.outputChannel.appendLine(`⚠️ No models detected, using fallback: ${modelInfo.models.join(', ')}`);
                }

            } catch (providerError) {
                this.outputChannel.appendLine(`⚠️ Provider detection failed: ${providerError}`);
            }

            // Get configuration information
            try {
                const config = vscode.workspace.getConfiguration('github.copilot');
                const chatConfig = vscode.workspace.getConfiguration('chat');
                
                // Look for model-related configuration
                const configKeys = Object.keys(config);
                const modelConfigKeys = configKeys.filter(key => 
                    key.toLowerCase().includes('model') || 
                    key.toLowerCase().includes('engine')
                );
                
                if (modelConfigKeys.length > 0) {
                    modelInfo.modelConfigKeys = modelConfigKeys;
                    this.outputChannel.appendLine(`🔍 Model config keys: ${modelConfigKeys.join(', ')}`);
                }

                // Check for current model setting
                const currentModel = config.get('chat.model') || config.get('model');
                if (currentModel) {
                    modelInfo.currentModel = currentModel;
                    this.outputChannel.appendLine(`🔍 Current model from config: ${currentModel}`);
                }

            } catch (configError) {
                this.outputChannel.appendLine(`⚠️ Could not read configuration: ${configError}`);
            }

            // Get all model-related commands
            const allCommands = await vscode.commands.getCommands();
            const modelCommands = allCommands.filter(cmd => 
                cmd.includes('model') || 
                cmd.includes('Model') ||
                (cmd.includes('chat') && (cmd.includes('switch') || cmd.includes('change')))
            );
            
            modelInfo.availableCommands = modelCommands;
            this.outputChannel.appendLine(`🔍 Found ${modelCommands.length} model-related commands: ${modelCommands.join(', ')}`);

            return { 
                success: true, 
                data: { 
                    action: 'models_detected',
                    models: modelInfo,
                    note: 'Real GitHub Copilot models detected from VS Code API!'
                } 
            };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to get model information: ${error}`);
            return { 
                success: false, 
                error: String(error)
            };
        }
    }

    /**
     * Change/select a specific model
     */
    async changeModel(modelName?: string): Promise<CopilotResponse> {
        this.outputChannel.appendLine(`🔄 Changing model: ${modelName || 'using picker'}`);
        
        try {
            if (modelName) {
                this.outputChannel.appendLine(`🧪 Testing different parameter formats for model: ${modelName}`);
                
                // Test different parameter formats that VS Code might accept
                const parameterFormats = [
                    // Format 1: Direct string (modelName)
                    { format: 'string', value: modelName },
                    // Format 2: Object with id property
                    { format: 'object_id', value: { id: modelName } },
                    // Format 3: Object with modelId property
                    { format: 'object_modelId', value: { modelId: modelName } },
                    // Format 4: Object with name property
                    { format: 'object_name', value: { name: modelName } },
                    // Format 5: Object with model property
                    { format: 'object_model', value: { model: modelName } },
                    // Format 6: Full model descriptor object
                    { format: 'object_full', value: { 
                        id: modelName, 
                        name: modelName, 
                        vendor: 'github',
                        family: modelName.includes('gpt') ? 'gpt' : (modelName.includes('claude') ? 'claude' : 'unknown')
                    }}
                ];
                
                for (const paramFormat of parameterFormats) {
                    try {
                        this.outputChannel.appendLine(`🔬 Testing format "${paramFormat.format}": ${JSON.stringify(paramFormat.value)}`);
                        await vscode.commands.executeCommand('workbench.action.chat.changeModel', paramFormat.value);
                        this.outputChannel.appendLine(`✅ SUCCESS with format "${paramFormat.format}"!`);
                        
                        return { 
                            success: true, 
                            data: { 
                                action: 'model_changed_successfully', 
                                requestedModel: modelName,
                                successfulFormat: paramFormat.format,
                                parameter: paramFormat.value,
                                note: `Model successfully changed using format: ${paramFormat.format}`
                            } 
                        };
                    } catch (formatError) {
                        this.outputChannel.appendLine(`❌ Format "${paramFormat.format}" failed: ${formatError}`);
                    }
                }
                
                // If all parameter formats fail, fall back to opening picker
                this.outputChannel.appendLine(`⚠️ All parameter formats failed, opening model picker...`);
                await vscode.commands.executeCommand('workbench.action.chat.openModelPicker');
                this.outputChannel.appendLine(`✅ Model picker opened - please select: ${modelName}`);
                
                return { 
                    success: true, 
                    data: { 
                        action: 'model_picker_opened_after_parameter_test', 
                        requestedModel: modelName,
                        testedFormats: parameterFormats.map(p => p.format),
                        note: `All parameter formats failed. Model picker opened for manual selection of "${modelName}"`
                    } 
                };
            } else {
                // Open model picker for user selection
                await vscode.commands.executeCommand('workbench.action.chat.openModelPicker');
                this.outputChannel.appendLine('✅ Model picker opened for selection');
                return { 
                    success: true, 
                    data: { 
                        action: 'model_picker_opened',
                        note: 'Model picker opened - select model in VS Code UI'
                    } 
                };
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to open model picker: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Switch to next available model
     */
    async switchToNextModel(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('⏭️ Switching to next model...');
        
        try {
            await vscode.commands.executeCommand('workbench.action.chat.switchToNextModel');
            this.outputChannel.appendLine('✅ Successfully switched to next model');
            return { 
                success: true, 
                data: { 
                    action: 'switched_to_next_model',
                    note: 'Switched to next available model'
                } 
            };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to switch to next model: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Get recent logs from the output channel
     */
    async getRecentLogs(): Promise<CopilotResponse> {
        // Note: VS Code doesn't provide direct API to read output channel content
        // This is a limitation - we can only append to it, not read from it
        this.outputChannel.appendLine('📋 Log retrieval requested - check VS Code Output panel for detailed logs');
        this.outputChannel.appendLine('💡 Tip: Open View -> Output and select "VSCoder - Copilot Bridge" channel');
        
        // Let's try to get some diagnostic info instead
        try {
            const allCommands = await vscode.commands.getCommands();
            const modelCommands = allCommands.filter(cmd => 
                cmd.toLowerCase().includes('model') || 
                (cmd.includes('chat') && (cmd.includes('change') || cmd.includes('select') || cmd.includes('switch')))
            );
            
            // Check if specific commands exist
            const commandsToCheck = [
                'workbench.action.chat.changeModel',
                'workbench.action.chat.openModelPicker',
                'workbench.action.chat.switchToNextModel'
            ];
            
            const commandStatus = commandsToCheck.map(cmd => ({
                command: cmd,
                exists: allCommands.includes(cmd)
            }));
            
            return {
                success: true,
                data: {
                    action: 'diagnostic_info',
                    availableModelCommands: modelCommands,
                    commandStatus: commandStatus,
                    totalCommands: allCommands.length,
                    note: 'This shows which model-related commands are actually available'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get diagnostic info: ${error}`
            };
        }
    }

    /**
     * Manage models (open model management)
     */
    async manageModels(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('⚙️ Opening model management...');
        
        try {
            // Try different model management commands
            const manageCommands = [
                'github.copilot.chat.manageModels',
                'workbench.action.chat.manageLanguageModelAuthentication'
            ];
            
            for (const cmd of manageCommands) {
                try {
                    await vscode.commands.executeCommand(cmd);
                    this.outputChannel.appendLine(`✅ Successfully opened model management via: ${cmd}`);
                    return { 
                        success: true, 
                        data: { 
                            action: 'model_management_opened', 
                            command: cmd 
                        } 
                    };
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Failed command ${cmd}: ${error}`);
                }
            }
            
            return { success: false, error: 'All model management commands failed' };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to open model management: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Debug: Find what commands are actually available for running terminal commands
     */
    async debugAvailableCommands(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('� Debugging available commands...');
        
        try {
            const allCommands = await vscode.commands.getCommands();
            
            // Look for commands related to running terminal commands
            const runCommands = allCommands.filter(cmd => 
                cmd.includes('run') && (cmd.includes('terminal') || cmd.includes('chat'))
            );
            
            // Look for commands related to chat actions
            const chatCommands = allCommands.filter(cmd => 
                cmd.includes('chat') && (cmd.includes('run') || cmd.includes('execute') || cmd.includes('action'))
            );
            
            // Look for terminal-specific commands
            const terminalCommands = allCommands.filter(cmd => 
                cmd.includes('terminal') && (cmd.includes('run') || cmd.includes('execute') || cmd.includes('send'))
            );
            
            this.outputChannel.appendLine(`🔍 Found ${runCommands.length} run+terminal/chat commands: ${runCommands.join(', ')}`);
            this.outputChannel.appendLine(`🔍 Found ${chatCommands.length} chat action commands: ${chatCommands.join(', ')}`);
            this.outputChannel.appendLine(`🔍 Found ${terminalCommands.length} terminal execute commands: ${terminalCommands.join(', ')}`);
            
            return {
                success: true,
                data: {
                    action: 'debug_commands_listed',
                    runCommands,
                    chatCommands,
                    terminalCommands,
                    totalCommands: allCommands.length
                }
            };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to debug commands: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Run any pending commands that Copilot suggested and are waiting to be executed
     */
    async runPendingCommands(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('🔄 Attempting to confirm pending command dialog...');
        
        try {
            // First, debug what commands are available
            const debugResult = await this.debugAvailableCommands();
            
            let commandsRun = 0;
            
            // Try commands that might confirm/continue pending dialogs
            const dialogConfirmCommands = [
                'workbench.action.acceptSelectedSuggestion',
                'workbench.action.chat.acceptCommand',
                'workbench.action.chat.continue',
                'workbench.action.chat.confirm',
                'notifications.acceptPrimary',
                'workbench.action.modal.accept',
                'workbench.action.dialog.accept'
            ];
            
            this.outputChannel.appendLine(`🎯 Trying dialog confirmation commands: ${dialogConfirmCommands.join(', ')}`);
            
            for (const cmd of dialogConfirmCommands) {
                try {
                    this.outputChannel.appendLine(`🔄 Attempting dialog confirm: ${cmd}`);
                    await vscode.commands.executeCommand(cmd);
                    commandsRun++;
                    this.outputChannel.appendLine(`✅ SUCCESS: ${cmd}`);
                    break; // If one succeeds, don't try others
                } catch (error) {
                    this.outputChannel.appendLine(`❌ FAILED: ${cmd} - ${error}`);
                }
            }
            
            // If no dialog commands worked, try the original run commands
            if (commandsRun === 0) {
                const runCommands = [
                    'workbench.action.chat.runInTerminal',
                    'workbench.action.chat.runFirstCommand',
                    'workbench.action.terminal.chat.runCommand',
                    'workbench.action.terminal.chat.runFirstCommand'
                ];
                
                this.outputChannel.appendLine(`🎯 Trying run commands: ${runCommands.join(', ')}`);
                
                for (const cmd of runCommands) {
                    try {
                        this.outputChannel.appendLine(`🔄 Attempting run command: ${cmd}`);
                        await vscode.commands.executeCommand(cmd);
                        commandsRun++;
                        this.outputChannel.appendLine(`✅ SUCCESS: ${cmd}`);
                        break; // If one succeeds, don't try others
                    } catch (error) {
                        this.outputChannel.appendLine(`❌ FAILED: ${cmd} - ${error}`);
                    }
                }
            }
            
            // Try sending Enter key to confirm any modal/dialog
            if (commandsRun === 0) {
                try {
                    this.outputChannel.appendLine(`🔄 Attempting to send Enter key to confirm dialog`);
                    await vscode.commands.executeCommand('type', { text: '\n' });
                    commandsRun++;
                    this.outputChannel.appendLine(`✅ SUCCESS: Enter key sent`);
                } catch (error) {
                    this.outputChannel.appendLine(`❌ FAILED: Enter key - ${error}`);
                }
            }
            
            return {
                success: true,
                data: {
                    action: 'pending_commands_executed',
                    commandsRun: commandsRun,
                    commandsTried: [...dialogConfirmCommands, 'type_enter'],
                    debugInfo: debugResult.data,
                    message: commandsRun > 0 ? `Confirmed ${commandsRun} pending dialog(s)` : 'No pending dialogs found to confirm'
                }
            };
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to run pending commands: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Auto-execute: Try to automatically run whatever Copilot is suggesting
     */
    async autoExecute(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('🤖 Auto-executing Copilot suggestions...');
        
        try {
            let actionsRun = 0;
            
            // Step 1: Aggressively try to confirm any pending dialogs first
            const confirmCommands = [
                'workbench.action.acceptSelectedSuggestion',
                'workbench.action.chat.acceptCommand', 
                'workbench.action.chat.continue',
                'notifications.acceptPrimary',
                'workbench.action.modal.accept'
            ];
            
            for (const cmd of confirmCommands) {
                try {
                    this.outputChannel.appendLine(`🤖 Auto-executing confirmation: ${cmd}`);
                    await vscode.commands.executeCommand(cmd);
                    actionsRun++;
                    this.outputChannel.appendLine(`✅ Auto-confirmed: ${cmd}`);
                    break; // Stop after first success
                } catch (error) {
                    this.outputChannel.appendLine(`ℹ️ ${cmd} not available: ${error}`);
                }
            }
            
            // Step 2: Try to run any pending terminal commands
            const pendingResult = await this.runPendingCommands();
            if (pendingResult.success && pendingResult.data?.commandsRun > 0) {
                actionsRun += pendingResult.data.commandsRun;
            }
            
            // Step 3: Try to accept any pending edits
            try {
                await vscode.commands.executeCommand('chatEditing.acceptAllFiles');
                actionsRun++;
                this.outputChannel.appendLine('✅ Auto-accepted all file edits');
            } catch (error) {
                this.outputChannel.appendLine(`ℹ️ No pending edits to accept: ${error}`);
            }
            
            // Step 4: If nothing worked, try sending Enter key to any modal
            if (actionsRun === 0) {
                try {
                    this.outputChannel.appendLine(`🤖 Auto-executing: Sending Enter key to confirm any dialog`);
                    await vscode.commands.executeCommand('type', { text: '\n' });
                    actionsRun++;
                    this.outputChannel.appendLine(`✅ Auto-executed: Enter key sent`);
                } catch (error) {
                    this.outputChannel.appendLine(`ℹ️ Enter key failed: ${error}`);
                }
            }
            
            return {
                success: true,
                data: {
                    action: 'auto_executed',
                    commandsRun: actionsRun,
                    message: actionsRun > 0 ? `Auto-executed ${actionsRun} actions` : 'Nothing to auto-execute'
                }
            };
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Auto-execute failed: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Continue iteration by using VS Code commands to continue the current Copilot task
     */
    async continueIteration(): Promise<CopilotResponse> {
        this.outputChannel.appendLine('🔁 Continuing iteration using VS Code commands...');
        
        try {
            // Try legitimate commands that can help continue the conversation
            const continueCommands = [
                'workbench.action.chat.retry',                          // Retry the last request
                'github.copilot.chat.review.continueInChat',           // Continue review in chat
                'github.copilot.chat.review.continueInInlineChat'      // Continue review in inline chat
            ];
            
            for (const cmd of continueCommands) {
                try {
                    await vscode.commands.executeCommand(cmd);
                    this.outputChannel.appendLine(`✅ Successfully continued iteration via: ${cmd}`);
                    return {
                        success: true,
                        data: {
                            action: 'iteration_continued',
                            command: cmd,
                            message: `Continued Copilot iteration using ${cmd}`
                        }
                    };
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Failed command ${cmd}: ${error}`);
                }
            }
            
            // If none of the continue commands work, try to open chat for follow-up
            try {
                await vscode.commands.executeCommand('workbench.action.chat.open');
                this.outputChannel.appendLine('✅ Opened chat for continuation');
                return {
                    success: true,
                    data: {
                        action: 'chat_opened_for_continuation',
                        command: 'workbench.action.chat.open',
                        message: 'Opened chat to continue iteration manually'
                    }
                };
            } catch (error) {
                this.outputChannel.appendLine(`❌ Failed to open chat: ${error}`);
            }
            
            return { success: false, error: 'All continue iteration commands failed' };
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to continue iteration: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Enhanced command runner that looks for specific patterns in Copilot chat
     */
    async runSpecificPendingCommand(commandPattern?: string): Promise<CopilotResponse> {
        this.outputChannel.appendLine(`🎯 Looking for specific pending command: ${commandPattern || 'any'}`);
        
        try {
            // Get the current chat content to look for specific command suggestions
            await vscode.env.clipboard.writeText('');
            await vscode.commands.executeCommand('workbench.action.chat.copyAll');
            await new Promise(resolve => setTimeout(resolve, 1000));
            const chatContent = await vscode.env.clipboard.readText() || '';
            
            let commandsFound = 0;
            
            // Look for terminal commands in the chat
            const terminalCommandPattern = /```(?:bash|sh|shell|terminal|cmd|powershell)?\s*\n([^`]+)\n```/gi;
            const terminalMatches = chatContent.matchAll(terminalCommandPattern);
            
            for (const match of terminalMatches) {
                const command = match[1].trim();
                if (!commandPattern || command.includes(commandPattern)) {
                    try {
                        // Open terminal and run the command
                        await vscode.commands.executeCommand('workbench.action.terminal.new');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {
                            text: command + '\r'
                        });
                        commandsFound++;
                        this.outputChannel.appendLine(`✅ Executed terminal command: ${command}`);
                    } catch (error) {
                        this.outputChannel.appendLine(`❌ Failed to execute terminal command: ${command} - ${error}`);
                    }
                }
            }
            
            // Look for "run this command" or "click to run" patterns
            const runPatterns = [
                /run\s+(?:this\s+)?command[:\s]*([^\n]+)/gi,
                /click\s+(?:to\s+)?run[:\s]*([^\n]+)/gi,
                /execute[:\s]*([^\n]+)/gi
            ];
            
            for (const pattern of runPatterns) {
                const matches = chatContent.matchAll(pattern);
                for (const match of matches) {
                    const command = match[1].trim();
                    if (!commandPattern || command.includes(commandPattern)) {
                        try {
                            // Try to execute as VS Code command first
                            if (command.startsWith('workbench.') || command.includes('.')) {
                                await vscode.commands.executeCommand(command);
                                commandsFound++;
                                this.outputChannel.appendLine(`✅ Executed VS Code command: ${command}`);
                            } else {
                                // Execute as terminal command
                                await vscode.commands.executeCommand('workbench.action.terminal.new');
                                await new Promise(resolve => setTimeout(resolve, 500));
                                await vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {
                                    text: command + '\r'
                                });
                                commandsFound++;
                                this.outputChannel.appendLine(`✅ Executed suggested command: ${command}`);
                            }
                        } catch (error) {
                            this.outputChannel.appendLine(`❌ Failed to execute suggested command: ${command} - ${error}`);
                        }
                    }
                }
            }
            
            return {
                success: true,
                data: {
                    action: 'specific_commands_executed',
                    commandsRun: commandsFound,
                    pattern: commandPattern,
                    message: commandsFound > 0 ? `Found and executed ${commandsFound} matching command(s)` : 'No matching commands found'
                }
            };
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to run specific pending commands: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Start continuous chat history synchronization
     */
    public async startChatHistorySync(): Promise<void> {
        if ((this as any).chatSyncInterval) {
            clearInterval((this as any).chatSyncInterval);
            (this as any).chatSyncInterval = null;
        }
        
        const syncInterval = 5000;
        let lastChatContent = '';
        let lastChatHash = 0;
        
        const quickHash = (str: string): number => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash = hash & hash;
            }
            return hash;
        };
        
        const syncHistory = async () => {
            try {
                // Quick focus check - if chat isn't visible, skip expensive operations
                try {
                    await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (focusError) {
                    return;
                }
                
                await vscode.env.clipboard.writeText('');
                await new Promise(resolve => setTimeout(resolve, 100));
                
                await vscode.commands.executeCommand('workbench.action.chat.copyAll');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const chatContent = await vscode.env.clipboard.readText() || '';
                
                if (chatContent.length === 0) {
                    return;
                }
                
                const currentHash = quickHash(chatContent);
                if (currentHash === lastChatHash && chatContent.length === lastChatContent.length) {
                    return;
                }
                
                lastChatContent = chatContent;
                lastChatHash = currentHash;
                
                const recentMessages = this.extractRecentMessages(chatContent, 15);
                
                this.sendProgressUpdate('chatHistorySync', {
                    message: 'Chat history updated',
                    messages: recentMessages,
                    fullContent: chatContent,
                    timestamp: new Date().toISOString(),
                    messageCount: recentMessages.length,
                    contentLength: chatContent.length
                });
                
            } catch (error) {
                // Silent
            }
        };
        
        await syncHistory();
        const syncIntervalId = setInterval(syncHistory, syncInterval);
        
        // Store interval ID for potential cleanup (optional)
        (this as any).chatSyncInterval = syncIntervalId;
    }

    /**
     * Stop continuous chat history synchronization
     */
    public stopChatHistorySync(): void {
        if ((this as any).chatSyncInterval) {
            clearInterval((this as any).chatSyncInterval);
            (this as any).chatSyncInterval = null;
        }
    }

    private async fallbackChatSync(): Promise<void> {
        
        try {
            try {
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (focusError) {
                // Silent failure
            }
            
            // Method 1: Try to get chat session info
            const chatCommands = await vscode.commands.getCommands();
            const relevantChatCommands = chatCommands.filter(cmd => 
                cmd.includes('chat') && (
                    cmd.includes('get') || 
                    cmd.includes('list') || 
                    cmd.includes('history') ||
                    cmd.includes('export')
                )
            );
            
            this.outputChannel.appendLine(`📋 Available chat info commands: ${relevantChatCommands.join(', ')}`);
            
            // Method 2: Try to copy all and extract recent messages
            await vscode.env.clipboard.writeText('');
            await new Promise(resolve => setTimeout(resolve, 300));
            await vscode.commands.executeCommand('workbench.action.chat.copyAll');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const fullChat = await vscode.env.clipboard.readText() || '';
            
            if (fullChat.length > 0) {
                // Extract last 10 messages using simple parsing
                const messages = this.extractRecentMessages(fullChat, 10);
                
                this.sendProgressUpdate('chatHistorySync', {
                    message: 'Chat history synchronized (fallback)',
                    messages: messages,
                    fullChatLength: fullChat.length,
                    timestamp: new Date().toISOString(),
                    method: 'fallback'
                });
                
                this.outputChannel.appendLine(`✅ Fallback sync successful - extracted ${messages.length} messages`);
            }
            
        } catch (fallbackError) {
            this.outputChannel.appendLine(`❌ Fallback chat sync failed: ${fallbackError}`);
        }
    }

    /**
     * Extract recent messages from full chat text
     */
    private extractRecentMessages(chatText: string, count: number = 10): any[] {
        const messages: any[] = [];
        
        try {
            this.outputChannel.appendLine(`📊 Extracting from ${chatText.length} characters of chat text`);
            
            const messageBlocks = chatText.split(/\n\s*\n/);
            
            const lines = chatText.split('\n');
            let currentMessage: string[] = [];
            let currentRole = '';
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();
                
                if (trimmedLine.startsWith('@workspace') || 
                    trimmedLine.includes(': @workspace')) {
                    
                    if (currentMessage.length > 0) {
                        const content = currentMessage.join('\n').trim();
                        if (content.length > 0) {
                            messages.push({
                                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                timestamp: new Date().toISOString(),
                                role: currentRole,
                                content: content,
                                rawBlock: currentMessage.join('\n')
                            });
                        }
                    }
                    
                    currentMessage = [line];
                    currentRole = 'user';
                }
                else if (trimmedLine.startsWith('GitHub Copilot:')) {
                    if (currentMessage.length > 0) {
                        const content = currentMessage.join('\n').trim();
                        if (content.length > 0) {
                            messages.push({
                                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                timestamp: new Date().toISOString(),
                                role: currentRole,
                                content: content,
                                rawBlock: currentMessage.join('\n')
                            });
                        }
                    }
                    
                    currentMessage = [line];
                    currentRole = 'assistant';
                }
                else if (currentMessage.length > 0) {
                    currentMessage.push(line);
                }
                else if (trimmedLine.length > 0) {
                    currentMessage = [line];
                    currentRole = 'assistant';
                }
            }
            
            if (currentMessage.length > 0) {
                const content = currentMessage.join('\n').trim();
                if (content.length > 0) {
                    messages.push({
                        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: new Date().toISOString(),
                        role: currentRole,
                        content: content,
                        rawBlock: currentMessage.join('\n')
                    });
                }
            }
            
            const recentMessages = messages.slice(-count);
            
            this.outputChannel.appendLine(`📋 Extracted ${recentMessages.length} messages from chat`);
            
            return recentMessages;
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error extracting messages: ${error}`);
            return [];
        }
    }

    private isMessageStart(line: string): boolean {
        const trimmedLine = line.trim();
        // User messages always start with @workspace
        if (trimmedLine.startsWith('@workspace')) {
            return true;
        }
        
        // Check for Copilot message indicators
        const lowerLine = line.toLowerCase();
        return (
            lowerLine.includes('github copilot') ||
            lowerLine.includes('copilot:') ||
            lowerLine.includes('assistant:') ||
            this.isUsernamePrefix(line)
        );
    }

    /**
     * Detect the role of a message (user or assistant)
     */
    private detectMessageRole(line: string): string {
        const trimmedLine = line.trim();
        
        // STRICT RULE: Only @workspace lines are user messages
        if (trimmedLine.startsWith('@workspace')) {
            return 'user';
        }
        
        // Check if this is a header line that might lead to @workspace content
        // Like "You" or "User" followed by timestamp, then @workspace
        const lowerLine = line.toLowerCase();
        if (lowerLine === 'you' || lowerLine === 'user' || lowerLine === 'human') {
            // This might be a user header, but we'll verify later with lookahead
            return 'user';
        }
        
        // Everything else is assistant by default
        return 'assistant';
    }

    /**
     * Extract content from a message line, removing role prefixes
     */
    private extractMessageContent(line: string): string {
        const trimmedLine = line.trim();
        
        // If it starts with @workspace, return the full line as-is (user message)
        if (trimmedLine.startsWith('@workspace')) {
            return trimmedLine;
        }
        
        // For Copilot messages, try to extract based on dynamic username
        const username = this.extractUsernameFromLine(line);
        if (username) {
            const prefixToRemove = username + ':';
            const index = line.indexOf(prefixToRemove);
            if (index !== -1) {
                return line.substring(index + prefixToRemove.length).trim();
            }
            
            // If username doesn't have colon, check if it's on its own line
            if (line.trim() === username) {
                return ''; // This line is just the username, content comes after
            }
        }
        
        // Fallback to static prefixes for Copilot messages
        const lowerLine = line.toLowerCase();
        const staticPrefixes = ['github copilot:', 'copilot:', 'assistant:'];
        
        for (const prefix of staticPrefixes) {
            if (lowerLine.includes(prefix)) {
                const prefixIndex = lowerLine.indexOf(prefix);
                return line.substring(prefixIndex + prefix.length).trim();
            }
        }
        
        // Return the line as-is if no prefix found
        return line.trim();
    }
}
