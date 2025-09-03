/**
 * Test WebSocket connection to Discovery API
 * This script helps debug WebSocket authentication issues
 */

const WebSocket = require('ws');

// Configuration
const API_URL = 'https://api.vscodercopilot.com.tr';
const TEST_TOKEN = 'test-token-12345';
const TEST_PAIRING_CODE = '123456';

async function testWebSocketConnection() {
    console.log('🧪 Testing WebSocket connection to Discovery API...');
    
    // Convert HTTP URL to WebSocket URL - try same port as HTTP API first
    let wsUrl = API_URL.replace(/^https?:/, API_URL.startsWith('https') ? 'wss:' : 'ws:');
    
    // First try: Use the same port as the HTTP API (no port change)
    console.log('🔗 Trying WebSocket on same port as HTTP API...');
    
    const fullWsUrl = `${wsUrl}/api/v1/messages/ws?token=${encodeURIComponent(TEST_TOKEN)}&pairing_code=${TEST_PAIRING_CODE}`;
    
    console.log('🔗 Attempting to connect to:', fullWsUrl.replace(TEST_TOKEN, '***TOKEN***'));
    
    try {
        const ws = new WebSocket(fullWsUrl, {
            headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'User-Agent': 'VSCode-Extension-Test/1.0'
            }
        });

        ws.on('open', () => {
            console.log('✅ WebSocket connection successful!');
            console.log('📤 Sending test ping...');
            
            ws.send(JSON.stringify({
                type: 'ping',
                timestamp: new Date().toISOString(),
                sender: 'vscode-test',
                target: TEST_PAIRING_CODE
            }));
            
            // Close after 5 seconds
            setTimeout(() => {
                console.log('🔌 Closing test connection...');
                ws.close(1000, 'Test completed');
            }, 5000);
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 Received message:', message.type, message.id || 'no-id');
            } catch (error) {
                console.log('📨 Received raw message:', data.toString());
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
            if (code === 1000) {
                console.log('✅ Test completed successfully');
            } else {
                console.log('⚠️ Unexpected close code');
            }
        });

        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            
            if (error.message.includes('401')) {
                console.error('🔐 Authentication Error: The server returned 401 Unauthorized');
                console.error('💡 This suggests:');
                console.error('   - Invalid device token');
                console.error('   - Token has expired');
                console.error('   - Pairing code is invalid');
                console.error('   - Authorization header format is incorrect');
            } else if (error.message.includes('404')) {
                console.error('🔗 Endpoint Error: WebSocket endpoint not found');
                console.error('💡 This suggests:');
                console.error('   - Wrong WebSocket path (/api/v1/messages/ws)');
                console.error('   - Discovery API server not running');
                console.error('   - Server doesn\'t support WebSocket on this endpoint');
            } else if (error.message.includes('ECONNREFUSED')) {
                console.error('🌐 Connection Error: Cannot connect to server');
                console.error('💡 This suggests:');
                console.error('   - Server is not running');
                console.error('   - Wrong port (should be 8443 for WSS)');
                console.error('   - Firewall blocking connection');
            }
        });

    } catch (error) {
        console.error('❌ Failed to create WebSocket:', error.message);
    }
}

// Run the test
testWebSocketConnection().catch(console.error);
