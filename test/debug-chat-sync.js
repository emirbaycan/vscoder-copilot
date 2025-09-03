/**
 * Chat Sync Debug Test - Debug what's happening with chat sync
 */

const https = require('https');

async function debugChatSync() {
    console.log('\n🔍 CHAT SYNC DEBUG TEST');
    console.log('='.repeat(50));
    
    try {
        // Send a chat sync request to the extension
        console.log('📤 Sending chat sync request to extension...');
        
        const requestData = {
            type: 'command',
            messageId: `debug-chat-sync-${Date.now()}`,
            timestamp: new Date().toISOString(),
            data: {
                command: 'request_chat_sync',
                reason: 'debug_test',
                timestamp: new Date().toISOString(),
                messageId: `sync-debug-${Date.now()}`
            }
        };
        
        console.log('📋 Request payload:');
        console.log(JSON.stringify(requestData, null, 2));
        
        // Make HTTPS request to Discovery API
        const result = await new Promise((resolve, reject) => {
            const postData = JSON.stringify(requestData);
            
            const options = {
                hostname: 'vscodercopilot.com.tr',
                port: 443,
                path: '/api/v1/messages/command',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 30000
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            req.write(postData);
            req.end();
        });
        
        console.log('\n📡 Discovery API Response:');
        console.log(`Status: ${result.status}`);
        console.log(`Response: ${result.data}`);
        
        if (result.status === 200) {
            console.log('✅ Chat sync request sent successfully');
            
            console.log('\n🔍 DEBUGGING CHECKLIST:');
            console.log('1. ❓ Check VS Code Output > "VSCoder - Copilot Bridge" for logs');
            console.log('2. ❓ Look for "🚀 startChatHistorySync() called!" message');
            console.log('3. ❓ Look for "📋 Executing workbench.action.chat.copyAll command..." message');
            console.log('4. ❓ Look for clipboard content length messages');
            console.log('5. ❓ Look for "📡 Calling sendProgressUpdate with chatHistorySync..." message');
            console.log('6. ❓ Check mobile app console for "chatSyncHandler" messages');
            
            console.log('\n🎯 COMMON ISSUES TO CHECK:');
            console.log('• Is VS Code extension running? (F5 + Start VSCoder Server)');
            console.log('• Is GitHub Copilot extension installed in VS Code?');
            console.log('• Do you have any chat history in VS Code Copilot?');
            console.log('• Is the Copilot chat view open in VS Code?');
            console.log('• Are there any error messages in VS Code Output?');
            
        } else {
            console.log(`❌ Chat sync request failed with status: ${result.status}`);
        }
        
    } catch (error) {
        console.log(`❌ Debug test failed: ${error.message}`);
        console.log(`Full error:`, error);
    }
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run this test while VS Code extension is running');
    console.log('2. Immediately check VS Code Output > "VSCoder - Copilot Bridge"');
    console.log('3. Look for the debug messages listed above');
    console.log('4. If no messages appear, the extension might not be connected');
    console.log('5. If clipboard content length is 0, you need Copilot chat history');
}

// Run the debug test
debugChatSync().catch(error => {
    console.error('❌ Debug test runner failed:', error);
    process.exit(1);
});
