"use strict";
/**
 * Test script for API communication
 * Run this to test the API connection and message flow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testApiConnection = void 0;
const apiClient_1 = require("./src/apiClient");
async function testApiConnection() {
    console.log('🧪 Testing API Connection...');
    // Create API client with default settings
    const apiClient = new apiClient_1.ApiClient();
    try {
        // Test 1: API Connection
        console.log('📡 Testing API connection...');
        const isConnected = await apiClient.testConnection();
        console.log(`✅ API Connection: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
        if (!isConnected) {
            console.log('❌ Cannot proceed without API connection');
            return;
        }
        // Test 2: Set pairing code (simulated)
        const testPairingCode = 'TEST123';
        console.log(`🔗 Setting test pairing code: ${testPairingCode}`);
        apiClient.setPairingCode(testPairingCode);
        // Test 3: Send test message
        console.log('📤 Sending test message...');
        const messageSent = await apiClient.sendMessage({
            type: 'test',
            content: 'Hello from VS Code extension test!',
            data: {
                timestamp: new Date().toISOString(),
                test: true
            }
        });
        console.log(`✅ Message sent: ${messageSent ? 'SUCCESS' : 'FAILED'}`);
        // Test 4: Check queue status
        console.log('📊 Checking queue status...');
        const queueStatus = await apiClient.getQueueStatus();
        if (queueStatus) {
            console.log('✅ Queue status:', {
                vscodeMessages: queueStatus.vscodeCount,
                mobileMessages: queueStatus.mobileCount,
                active: queueStatus.active
            });
        }
        else {
            console.log('❌ Could not get queue status');
        }
        // Test 5: Get messages
        console.log('📥 Getting messages...');
        const messages = await apiClient.getMessages();
        console.log(`✅ Retrieved ${messages.length} messages`);
        if (messages.length > 0) {
            console.log('📋 Sample messages:', messages.slice(0, 3));
        }
        console.log('🎉 API connection test completed successfully!');
    }
    catch (error) {
        console.error('❌ API connection test failed:', error);
    }
}
exports.testApiConnection = testApiConnection;
// Run test if executed directly
if (require.main === module) {
    testApiConnection();
}
//# sourceMappingURL=test-api-connection.js.map