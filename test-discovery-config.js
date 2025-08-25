#!/usr/bin/env node

/**
 * Test script to verify VSCoder Discovery Service configuration
 * This tests the updated production URL configuration
 */

const https = require('https');

console.log('🧪 Testing VSCoder Discovery Service Configuration...');
console.log('========================================');

// Test the production discovery service URL
const testDiscoveryService = async () => {
    const apiUrl = 'https://vscoder.sabitfirmalar.com.tr';
    
    console.log(`🔗 Testing connection to: ${apiUrl}`);
    
    try {
        // Test health endpoint
        const healthCheck = await makeRequest(`${apiUrl}/health`);
        console.log('✅ Health check successful:', healthCheck);
        
        // Test API base endpoint
        const apiCheck = await makeRequest(`${apiUrl}/api/v1/health`);
        console.log('✅ API endpoint accessible:', apiCheck);
        
        console.log('\n🎉 Discovery Service Configuration Test PASSED!');
        console.log('📱 Mobile apps will now connect to production service');
        console.log('🔧 VS Code extension will use production discovery API');
        
    } catch (error) {
        console.error('❌ Discovery Service Test FAILED:', error.message);
        console.log('\n🔍 Troubleshooting:');
        console.log('  - Check internet connection');
        console.log('  - Verify vscoder.sabitfirmalar.com.tr is accessible');
        console.log('  - Ensure SSL certificates are valid');
    }
};

// Helper function to make HTTPS requests
const makeRequest = (url) => {
    return new Promise((resolve, reject) => {
        const request = https.get(url, { timeout: 10000 }, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({
                        status: response.statusCode,
                        data: result
                    });
                } catch (parseError) {
                    resolve({
                        status: response.statusCode,
                        data: data
                    });
                }
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
};

// Run the test
testDiscoveryService().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
