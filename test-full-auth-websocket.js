/**
 * Test the full authentication flow then WebSocket connection
 */

const https = require('https');
const WebSocket = require('ws');

// Configuration
const API_URL = 'https://api.vscodercopilot.com.tr';
const TEST_PAIRING_CODE = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code

async function authenticateAndTestWebSocket() {
    console.log('🧪 Testing full authentication flow...');
    console.log('🔑 Generated test pairing code:', TEST_PAIRING_CODE);
    
    try {
        // Step 1: Authenticate and get a real token
        console.log('🔐 Step 1: Authenticating with Discovery API...');
        
        const authData = {
            device_type: 'vscode',
            device_name: 'VSCode-Test',
            pairing_code: TEST_PAIRING_CODE
        };

        const token = await authenticate(authData);
        if (!token) {
            console.error('❌ Authentication failed, cannot test WebSocket');
            return;
        }

        console.log('✅ Authentication successful, got token');

        // Step 2: Test WebSocket connection with real token
        console.log('🔌 Step 2: Testing WebSocket connection with authenticated token...');
        await testWebSocket(token, TEST_PAIRING_CODE);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

function authenticate(authData) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(authData);
        
        const options = {
            hostname: 'api.vscodercopilot.com.tr',
            path: '/api/v1/auth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('📡 Auth response status:', res.statusCode);
                    console.log('📄 Auth response:', response);
                    
                    if (response.success && response.data && response.data.token) {
                        resolve(response.data.token);
                    } else {
                        reject(new Error(response.error || 'Authentication failed'));
                    }
                } catch (error) {
                    reject(new Error('Failed to parse auth response: ' + error.message));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error('Auth request failed: ' + error.message));
        });

        req.write(postData);
        req.end();
    });
}

function testWebSocket(token, pairingCode) {
    return new Promise((resolve, reject) => {
        const wsUrl = 'wss://api.vscodercopilot.com.tr/api/v1/messages/ws';
        const fullWsUrl = `${wsUrl}?token=${encodeURIComponent(token)}&pairing_code=${pairingCode}`;
        
        console.log('🔗 Connecting to:', wsUrl + '?token=***&pairing_code=' + pairingCode);
        
        const ws = new WebSocket(fullWsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
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
                target: pairingCode
            }));
            
            // Close after 3 seconds
            setTimeout(() => {
                console.log('🔌 Closing test connection...');
                ws.close(1000, 'Test completed');
                resolve();
            }, 3000);
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
                console.log('✅ WebSocket test completed successfully');
                resolve();
            } else if (code === 1006) {
                reject(new Error('WebSocket connection failed or was rejected'));
            }
        });

        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            
            if (error.message.includes('401')) {
                console.error('🔐 Authentication Error: Token was rejected by WebSocket endpoint');
            } else if (error.message.includes('404')) {
                console.error('🔗 Endpoint Error: WebSocket endpoint not found');
            } else if (error.message.includes('ETIMEDOUT')) {
                console.error('⏰ Timeout Error: Connection timed out');
            }
            
            reject(error);
        });
    });
}

// Run the test
authenticateAndTestWebSocket().catch(console.error);
