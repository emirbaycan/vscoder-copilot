// Test script to simulate a validation request WebSocket message
// This will help test if the validation notification system works

const WebSocket = require('ws');

const PAIRING_CODE = '232398'; // From the VS Code logs
const API_URL = 'wss://api.vscodercopilot.com.tr/api/v1/messages/ws';

// Simulate a validation request message
const validationRequestMessage = {
    type: 'notification',
    id: `test-validation-${Date.now()}`,
    data: {
        type: 'validation_request',
        validation_id: `val_${Date.now()}`,
        device_name: 'Test Mobile Device',
        platform: 'iOS',
        version: '17.0',
        ip_address: '192.168.1.100',
        requested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
    },
    timestamp: new Date().toISOString()
};

console.log('🧪 Testing validation request...');
console.log('📡 Connecting to WebSocket API...');
console.log('🔗 URL:', `${API_URL}?pairing_code=${PAIRING_CODE}&device_type=mobile`);

// Note: This won't work without proper authentication, but it shows the message format
console.log('📨 Validation request message that should be sent:');
console.log(JSON.stringify(validationRequestMessage, null, 2));

console.log('\n🔍 To test the validation flow:');
console.log('1. The mobile app needs to send a message like the one above');
console.log('2. VS Code should receive it and show an approval dialog');
console.log('3. When approved, it should call the API to approve the validation');

console.log('\n🐛 If validation requests are not showing up in VS Code:');
console.log('- Check if mobile app is sending validation requests to the API');
console.log('- Check if API server is forwarding them via WebSocket');
console.log('- Check if VS Code WebSocket connection is properly authenticated');
