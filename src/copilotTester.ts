import * as vscode from 'vscode';
import { CopilotBridge } from './copilotBridge';

/**
 * Test utility to verify Copilot bridge functionality
 */
class CopilotTester {
    private copilotBridge: CopilotBridge;

    constructor() {
        this.copilotBridge = new CopilotBridge();
    }

    /**
     * Test agent autonomous mode
     */
    async testAgentAutonomous(): Promise<void> {
        const testRequest = {
            type: 'agent' as const,
            prompt: 'Create a simple Hello World function',
            agentMode: 'autonomous' as const,
            language: 'javascript'
        };

        try {
            const response = await this.copilotBridge.handleCopilotRequest(testRequest);
            console.log(`Agent Autonomous Test: ${response.success ? 'Success' : 'Failed'}`);
            console.log('Agent Autonomous Response:', response);
        } catch (error) {
            console.error(`Agent Autonomous Test Failed: ${error}`);
        }
    }

    /**
     * Test agent interactive mode
     */
    async testAgentInteractive(): Promise<void> {
        const testRequest = {
            type: 'agent' as const,
            prompt: 'Help me create a utility function for data validation',
            agentMode: 'interactive' as const,
            language: 'typescript'
        };

        try {
            const response = await this.copilotBridge.handleCopilotRequest(testRequest);
            console.log(`Agent Interactive Test: ${response.success ? 'Success' : 'Failed'}`);
            console.log('Agent Interactive Response:', response);
        } catch (error) {
            console.error(`Agent Interactive Test Failed: ${error}`);
        }
    }

    /**
     * Test agent code review mode
     */
    async testAgentCodeReview(): Promise<void> {
        const testRequest = {
            type: 'agent' as const,
            prompt: 'Review the code in this workspace for best practices and potential issues',
            agentMode: 'code-review' as const,
            language: 'typescript'
        };

        try {
            const response = await this.copilotBridge.handleCopilotRequest(testRequest);
            console.log(`Agent Code Review Test: ${response.success ? 'Success' : 'Failed'}`);
            console.log('Agent Code Review Response:', response);
        } catch (error) {
            console.error(`Agent Code Review Test Failed: ${error}`);
        }
    }

    /**
     * Run all agent tests
     */
    async runAllTests(): Promise<void> {
        console.log('Running VSCoder Copilot Agent Tests...');
        
        await this.testAgentAutonomous();
        await this.testAgentInteractive();
        await this.testAgentCodeReview();
        
        console.log('VSCoder Copilot Agent Tests Completed!');
    }
}

// Export the tester
export const copilotTester = new CopilotTester();
