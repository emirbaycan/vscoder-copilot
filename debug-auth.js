// Debug script to test authentication and token retrieval
const https = require('https');

async function debugAuth() {
    console.log('🔍 Debugging authentication with Discovery API...');
    
    const authRequest = {
        device_type: 'vscode',
        device_name: 'Debug Test Device',
        pairing_code: '315413'
    };
    
    const data = JSON.stringify(authRequest);
    
    const options = {
        hostname: 'vscodercopilot.com.tr',
        port: 443,
        path: '/api/v1/auth/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            console.log(`Status: ${res.statusCode}`);
            console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
            
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                console.log('Raw response:', responseData);
                try {
                    const response = JSON.parse(responseData);
                    console.log('Parsed response:', JSON.stringify(response, null, 2));
                    
                    if (response.data && response.data.token) {
                        console.log('🔑 Token length:', response.data.token.length);
                        console.log('🔑 Token preview:', response.data.token.substring(0, 20) + '...');
                    }
                    
                    resolve(response);
                } catch (error) {
                    console.error('Failed to parse response:', error);
                    console.log('Raw response was:', responseData);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

debugAuth().catch(console.error);
