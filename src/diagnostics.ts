import * as vscode from 'vscode';

/**
 * Diagnostic utilities for troubleshooting VSCoder extension issues
 */
export class VSCoderDiagnostics {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('VSCoder Diagnostics');
    }

    /**
     * Run comprehensive diagnostics
     */
    async runDiagnostics(): Promise<void> {
        this.outputChannel.clear();
        this.outputChannel.show();
        
        this.outputChannel.appendLine('=== VSCoder Extension Diagnostics ===');
        this.outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
        this.outputChannel.appendLine('');

        // Check VS Code version
        await this.checkVSCodeVersion();
        
        // Check workspace
        await this.checkWorkspace();
        
        // Check GitHub Copilot extension
        await this.checkCopilotExtension();
        
        // Check available commands
        await this.checkAvailableCommands();
        
        // Check network connectivity (basic)
        await this.checkNetworkConnectivity();
        
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('=== Diagnostics Complete ===');
    }

    private async checkVSCodeVersion(): Promise<void> {
        this.outputChannel.appendLine('--- VS Code Version ---');
        this.outputChannel.appendLine(`Version: ${vscode.version}`);
        this.outputChannel.appendLine(`Language: ${vscode.env.language}`);
        this.outputChannel.appendLine(`Platform: ${process.platform}`);
        this.outputChannel.appendLine('');
    }

    private async checkWorkspace(): Promise<void> {
        this.outputChannel.appendLine('--- Workspace ---');
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.outputChannel.appendLine('❌ No workspace folders open');
        } else {
            this.outputChannel.appendLine(`✅ ${workspaceFolders.length} workspace folder(s):`);
            workspaceFolders.forEach((folder, index) => {
                this.outputChannel.appendLine(`  ${index + 1}. ${folder.name} (${folder.uri.fsPath})`);
            });
        }
        this.outputChannel.appendLine('');
    }

    private async checkCopilotExtension(): Promise<void> {
        this.outputChannel.appendLine('--- GitHub Copilot Extension ---');
        
        const copilotExtension = vscode.extensions.getExtension('github.copilot');
        const copilotChatExtension = vscode.extensions.getExtension('github.copilot-chat');
        
        if (!copilotExtension) {
            this.outputChannel.appendLine('❌ GitHub Copilot extension not found');
        } else {
            this.outputChannel.appendLine(`✅ GitHub Copilot extension found`);
            this.outputChannel.appendLine(`   Version: ${copilotExtension.packageJSON.version}`);
            this.outputChannel.appendLine(`   Active: ${copilotExtension.isActive}`);
            
            if (!copilotExtension.isActive) {
                this.outputChannel.appendLine('   ⚠️  Attempting to activate...');
                try {
                    await copilotExtension.activate();
                    this.outputChannel.appendLine('   ✅ Successfully activated');
                } catch (error) {
                    this.outputChannel.appendLine(`   ❌ Activation failed: ${error}`);
                }
            }
        }
        
        if (!copilotChatExtension) {
            this.outputChannel.appendLine('⚠️  GitHub Copilot Chat extension not found');
        } else {
            this.outputChannel.appendLine(`✅ GitHub Copilot Chat extension found`);
            this.outputChannel.appendLine(`   Version: ${copilotChatExtension.packageJSON.version}`);
            this.outputChannel.appendLine(`   Active: ${copilotChatExtension.isActive}`);
        }
        
        // Test authentication
        try {
            const status = await vscode.commands.executeCommand('github.copilot.status');
            this.outputChannel.appendLine(`✅ Copilot authentication status: ${JSON.stringify(status)}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Copilot authentication failed: ${error}`);
        }
        
        this.outputChannel.appendLine('');
    }

    private async checkAvailableCommands(): Promise<void> {
        this.outputChannel.appendLine('--- Available Copilot Commands ---');
        
        try {
            const allCommands = await vscode.commands.getCommands();
            const copilotCommands = allCommands.filter(cmd => cmd.startsWith('github.copilot'));
            
            if (copilotCommands.length === 0) {
                this.outputChannel.appendLine('❌ No Copilot commands found');
            } else {
                this.outputChannel.appendLine(`✅ Found ${copilotCommands.length} Copilot commands:`);
                copilotCommands.forEach(cmd => {
                    this.outputChannel.appendLine(`   - ${cmd}`);
                });
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to retrieve commands: ${error}`);
        }
        
        this.outputChannel.appendLine('');
    }

    private async checkNetworkConnectivity(): Promise<void> {
        this.outputChannel.appendLine('--- Network Connectivity ---');
        
        // Check if we can reach GitHub (basic check)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('https://api.github.com/zen', {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const zen = await response.text();
                this.outputChannel.appendLine('✅ GitHub API accessible');
                this.outputChannel.appendLine(`   GitHub Zen: ${zen}`);
            } else {
                this.outputChannel.appendLine(`⚠️  GitHub API returned status: ${response.status}`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Network connectivity issue: ${error}`);
        }
        
        this.outputChannel.appendLine('');
    }
}
