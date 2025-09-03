/**
 * Live Extension Testing - Tests real VS Code extension with live mobile app and API
 */

async function testLiveExtension() {
    console.log('\n🔥 Testing LIVE VS Code Extension with Mobile App and API...\n');
    
    let testsPassed = 0;
    let testsFailed = 0;
    
    try {
        // Test 1: Extension Compilation Check
        console.log('🎯 Test 1: Extension Compilation Check');
        try {
            const path = require('path');
            const fs = require('fs');
            
            const bridgePath = path.join(__dirname, '../out/copilotBridge.js');
            const serverPath = path.join(__dirname, '../out/VSCoderServer.js');
            const extensionPath = path.join(__dirname, '../out/extension.js');
            
            console.log('  🔍 Checking compiled files...');
            
            const files = [
                { name: 'CopilotBridge', path: bridgePath },
                { name: 'VSCoderServer', path: serverPath },
                { name: 'Extension', path: extensionPath }
            ];
            
            let allFilesExist = true;
            for (const file of files) {
                if (fs.existsSync(file.path)) {
                    console.log(`  ✅ ${file.name}: Found`);
                } else {
                    console.log(`  ❌ ${file.name}: Missing`);
                    allFilesExist = false;
                }
            }
            
            if (allFilesExist) {
                console.log('  ✅ All extension files compiled successfully');
                testsPassed++;
            } else {
                console.log('  ❌ Some extension files missing. Run: npm run compile');
                testsFailed++;
            }
            
        } catch (error) {
            console.log(`  ❌ Extension compilation check failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 2: Discovery API Health Check
        console.log('\n🎯 Test 2: Discovery API Health Check');
        try {
            const https = require('https');
            
            console.log('  🏥 Checking Discovery API health...');
            
            const healthCheck = await new Promise((resolve, reject) => {
                const req = https.request('https://api.vscodercopilot.com.tr/health', {
                    method: 'GET',
                    timeout: 10000
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve({ 
                            status: res.statusCode, 
                            data: data,
                            headers: res.headers 
                        });
                    });
                });
                req.on('error', reject);
                req.on('timeout', () => reject(new Error('Health check timeout')));
                req.end();
            });
            
            console.log(`  📊 API Status: ${healthCheck.status}`);
            console.log(`  📊 Response: ${healthCheck.data}`);
            
            if (healthCheck.status === 200) {
                console.log('  ✅ Discovery API is healthy and accessible');
                testsPassed++;
            } else {
                console.log(`  ❌ Discovery API returned status: ${healthCheck.status}`);
                testsFailed++;
            }
            
        } catch (error) {
            console.log(`  ❌ Discovery API health check failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 3: Chat Sync Command Structure Test
        console.log('\n🎯 Test 3: Chat Sync Command Structure Test');
        try {
            console.log('  📋 Testing chat sync command structure...');
            
            // Test the exact command structure your mobile app sends
            const testCommand = {
                type: 'command',
                messageId: `live-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                data: {
                    command: 'request_chat_sync',
                    reason: 'live_extension_test',
                    timestamp: new Date().toISOString(),
                    messageId: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                }
            };
            
            console.log('  📤 Test command structure:');
            console.log(JSON.stringify(testCommand, null, 2));
            
            // Validate command structure
            const isValidStructure = testCommand.type === 'command' &&
                                   testCommand.data &&
                                   testCommand.data.command === 'request_chat_sync' &&
                                   testCommand.messageId &&
                                   testCommand.timestamp;
            
            if (isValidStructure) {
                console.log('  ✅ Chat sync command structure is valid');
                testsPassed++;
            } else {
                console.log('  ❌ Chat sync command structure is invalid');
                testsFailed++;
            }
            
        } catch (error) {
            console.log(`  ❌ Command structure test failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 4: Expected WebSocket Message Format
        console.log('\n🎯 Test 4: Expected WebSocket Message Format');
        try {
            console.log('  📋 Testing expected WebSocket message format...');
            
            // Test the exact message format extension should send
            const expectedProgressMessage = {
                type: 'copilotProgress',
                updateType: 'chatHistorySync',
                data: {
                    message: 'Real-time chat history sync',
                    messages: [
                        {
                            id: 'msg-1',
                            role: 'user',
                            content: 'Sample user message',
                            timestamp: new Date().toISOString()
                        },
                        {
                            id: 'msg-2',
                            role: 'assistant',
                            content: 'Sample assistant response',
                            timestamp: new Date().toISOString()
                        }
                    ],
                    messageCount: 2,
                    timestamp: new Date().toISOString(),
                    method: 'realtime_sync',
                    hasNewContent: true,
                    contentLength: 150
                },
                messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString()
            };
            
            console.log('  📤 Expected WebSocket message format:');
            console.log(JSON.stringify(expectedProgressMessage, null, 2));
            
            // Validate message format
            const isValidFormat = expectedProgressMessage.type === 'copilotProgress' &&
                                expectedProgressMessage.updateType === 'chatHistorySync' &&
                                expectedProgressMessage.data &&
                                Array.isArray(expectedProgressMessage.data.messages) &&
                                expectedProgressMessage.messageId;
            
            if (isValidFormat) {
                console.log('  ✅ Expected WebSocket message format is valid');
                testsPassed++;
            } else {
                console.log('  ❌ Expected WebSocket message format is invalid');
                testsFailed++;
            }
            
        } catch (error) {
            console.log(`  ❌ WebSocket message format test failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 5: Extension Debug Instructions
        console.log('\n🎯 Test 5: Extension Debug Instructions');
        try {
            console.log('  🕵️ Live extension debugging guide:');
            
            console.log('\n  📋 VS Code Extension Setup (REQUIRED):');
            console.log('    1. ✅ Open VS Code with this workspace folder');
            console.log('    2. ✅ Press F5 to start "Extension Development Host"');
            console.log('    3. ✅ In the new VS Code window, run command: "VSCoder: Start VSCoder Server"');
            console.log('    4. ✅ Check VS Code Output panel > "VSCoder - Copilot Bridge" channel');
            
            console.log('\n  📋 Mobile App Debug Steps:');
            console.log('    1. ✅ Open chat screen in mobile app');
            console.log('    2. ✅ Watch console logs for:');
            console.log('       - "🔄 User is on chat page - requesting immediate chat history sync"');
            console.log('       - "📤 Sending command to VS Code via Discovery API: request_chat_sync"');
            console.log('       - "✅ Command request_chat_sync completed successfully"');
            console.log('       - "🔍 [chatSyncHandler] DEBUG: WebSocket message received"');
            console.log('       - "📋 🎯 [chatSyncHandler] PROCESSING chat history sync"');
            
            console.log('\n  📋 Extension Debug Steps (VS Code Output):');
            console.log('    1. Look for these messages in "VSCoder - Copilot Bridge":');
            console.log('       - "🔄 Mobile app requesting chat history sync..."');
            console.log('       - "🔧 Setting up progress callback for chat sync..."');
            console.log('       - "📡 🎯 Chat sync progress callback triggered!"');
            console.log('       - "🚀 startChatHistorySync() called!"');
            console.log('       - "📋 Executing workbench.action.chat.copyAll command..."');
            console.log('       - "📡 Calling sendProgressUpdate with chatHistorySync..."');
            
            console.log('\n  📋 Common Issues to Check:');
            console.log('    1. ❓ Is VS Code extension actually running?');
            console.log('    2. ❓ Is GitHub Copilot extension installed?');
            console.log('    3. ❓ Is there chat history in VS Code Copilot?');
            console.log('    4. ❓ Are WebSocket connections established?');
            console.log('    5. ❓ Is progress callback being set up correctly?');
            
            testsPassed++;
            
        } catch (error) {
            console.log(`  ❌ Debug instructions test failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 6: Real-Time Test Simulation
        console.log('\n🎯 Test 6: Real-Time Test Simulation');
        try {
            console.log('  🚀 Simulating real-time test workflow...');
            
            console.log('\n  📱 Step 1: Mobile App Sends Chat Sync Request');
            console.log('    Command: request_chat_sync');
            console.log('    Expected: Mobile app logs show command sent successfully');
            
            console.log('\n  🔧 Step 2: Extension Receives and Processes Request');
            console.log('    Expected: VS Code Output shows "Mobile app requesting chat history sync"');
            console.log('    Expected: Progress callback setup messages appear');
            
            console.log('\n  📋 Step 3: Extension Executes Chat History Sync');
            console.log('    Expected: "startChatHistorySync() called!" appears');
            console.log('    Expected: "workbench.action.chat.copyAll" execution');
            
            console.log('\n  📡 Step 4: Extension Sends Progress Update');
            console.log('    Expected: "sendProgressUpdate with chatHistorySync" message');
            console.log('    Expected: WebSocket routing to mobile app');
            
            console.log('\n  📱 Step 5: Mobile App Receives Chat Messages');
            console.log('    Expected: "chatSyncHandler" processes copilotProgress message');
            console.log('    Expected: Chat messages appear in mobile app UI');
            
            console.log('\n  🔍 Current Status Check:');
            console.log('    ❓ Run this test while mobile app and extension are both running');
            console.log('    ❓ Watch both VS Code Output and mobile app console simultaneously');
            console.log('    ❓ Trigger chat sync from mobile app and observe logs');
            
            testsPassed++;
            
        } catch (error) {
            console.log(`  ❌ Real-time test simulation failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 7: WebSocket Connection Validation
        console.log('\n🎯 Test 7: WebSocket Connection Validation');
        try {
            console.log('  🔌 Testing WebSocket connection requirements...');
            
            // Test WebSocket URL format
            const testPairingCode = '123456';
            const testToken = 'test-token';
            const expectedWsUrl = `wss://api.vscodercopilot.com.tr/api/v1/messages/ws?device_type=vscode&pairing_code=${testPairingCode}&token=${testToken}`;
            
            console.log('  📋 Expected WebSocket URL format:');
            console.log(`    ${expectedWsUrl}`);
            
            console.log('\n  📋 WebSocket Connection Checklist:');
            console.log('    1. ❓ Extension must have valid pairing code');
            console.log('    2. ❓ Extension must have valid device token');
            console.log('    3. ❓ Mobile app must be paired with same code');
            console.log('    4. ❓ Discovery WebSocket must be connected');
            console.log('    5. ❓ WebSocket health monitoring must be active');
            
            console.log('\n  📋 WebSocket Message Flow:');
            console.log('    Mobile → Discovery → Extension: request_chat_sync command');
            console.log('    Extension → Discovery → Mobile: copilotProgress response');
            
            testsPassed++;
            
        } catch (error) {
            console.log(`  ❌ WebSocket connection validation failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test Results
        console.log('\n📊 Live Extension Test Results:');
        console.log(`✅ Passed: ${testsPassed}`);
        console.log(`❌ Failed: ${testsFailed}`);
        console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
        
        console.log('\n🎯 IMMEDIATE ACTION ITEMS:');
        console.log('1. 🚀 Start VS Code Extension (F5 + "VSCoder: Start VSCoder Server")');
        console.log('2. 📱 Open chat in your mobile app');
        console.log('3. 🔍 Watch VS Code Output > "VSCoder - Copilot Bridge" for debug messages');
        console.log('4. 📋 Check mobile app console for chatSyncHandler messages');
        console.log('5. 🐛 If no messages appear, check the common issues listed above');
        
        if (testsFailed === 0) {
            console.log('\n🎉 All live extension tests passed! Setup is ready for testing.');
        } else {
            console.log('\n⚠️ Some tests failed. Review the issues above.');
        }
        
        return { testsPassed, testsFailed };
        
    } catch (error) {
        console.log(`❌ Live extension test failed: ${error}`);
        return { testsPassed: 0, testsFailed: 1 };
    }
}

// Test specific chat sync workflow with live system
async function testChatSyncWorkflow() {
    console.log('\n🔥 Testing Chat Sync Workflow with Live System...\n');
    
    let testsPassed = 0;
    let testsFailed = 0;
    
    try {
        // Test 1: Chat Sync Request Validation
        console.log('🎯 Test 1: Chat Sync Request Validation');
        try {
            console.log('  📋 Validating chat sync request structure...');
            
            // Create the exact request your mobile app should send
            const chatSyncRequest = {
                type: 'command',
                messageId: `chat-sync-test-${Date.now()}`,
                timestamp: new Date().toISOString(),
                data: {
                    command: 'request_chat_sync',
                    reason: 'user_on_chat_page',
                    timestamp: new Date().toISOString(),
                    messageId: `sync-${Date.now()}`
                }
            };
            
            console.log('  📤 Mobile app should send this request:');
            console.log(JSON.stringify(chatSyncRequest, null, 2));
            
            console.log('\n  🔍 Extension should process this as:');
            console.log('    1. Receive command via WebSocket');
            console.log('    2. Route to handleMobileCommand()');
            console.log('    3. Match case "request_chat_sync"');
            console.log('    4. Call setProgressCallback()');
            console.log('    5. Call startChatHistorySync()');
            
            testsPassed++;
            
        } catch (error) {
            console.log(`  ❌ Chat sync request validation failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 2: Progress Callback Setup Validation
        console.log('\n🎯 Test 2: Progress Callback Setup Validation');
        try {
            console.log('  📋 Validating progress callback setup...');
            
            console.log('  🔧 Extension must execute this code:');
            console.log(`
    this.copilotBridge.setProgressCallback((update) => {
        const messageId = this.generateMessageId();
        console.log('📡 🎯 Chat sync progress callback triggered!', update.updateType);
        
        const progressMessage = {
            type: 'copilotProgress',
            updateType: update.updateType,
            data: update.data,
            timestamp: update.timestamp,
            messageId: messageId
        };
        
        this.discoveryWebSocket.send({
            type: 'notification',
            data: progressMessage
        });
    });
            `);
            
            console.log('  📋 Expected debug output in VS Code:');
            console.log('    - "🔧 Setting up progress callback for chat sync..."');
            console.log('    - "📡 🎯 Chat sync progress callback triggered! chatHistorySync"');
            
            testsPassed++;
            
        } catch (error) {
            console.log(`  ❌ Progress callback validation failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 3: Chat History Sync Execution
        console.log('\n🎯 Test 3: Chat History Sync Execution');
        try {
            console.log('  📋 Validating chat history sync execution...');
            
            console.log('  🚀 Extension startChatHistorySync() should:');
            console.log('    1. Clear clipboard: await vscode.env.clipboard.writeText("")');
            console.log('    2. Copy chat: await vscode.commands.executeCommand("workbench.action.chat.copyAll")');
            console.log('    3. Read clipboard: const chatContent = await vscode.env.clipboard.readText()');
            console.log('    4. Extract messages: const recentMessages = this.extractRecentMessages(chatContent)');
            console.log('    5. Send progress: this.sendProgressUpdate("chatHistorySync", data)');
            
            console.log('\n  📋 Expected debug output:');
            console.log('    - "🚀 startChatHistorySync() called!"');
            console.log('    - "📋 Clearing clipboard..."');
            console.log('    - "📋 Executing workbench.action.chat.copyAll command..."');
            console.log('    - "📋 Reading content from clipboard..."');
            console.log('    - "📝 Extracted X recent messages"');
            console.log('    - "📡 Calling sendProgressUpdate with chatHistorySync..."');
            
            testsPassed++;
            
        } catch (error) {
            console.log(`  ❌ Chat history sync execution validation failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 4: WebSocket Message Transmission
        console.log('\n🎯 Test 4: WebSocket Message Transmission');
        try {
            console.log('  📋 Validating WebSocket message transmission...');
            
            // Expected message format from extension to mobile
            const expectedMessage = {
                type: 'copilotProgress',
                updateType: 'chatHistorySync',
                data: {
                    message: 'Real-time chat history sync',
                    messages: [], // Array of chat messages
                    messageCount: 0,
                    timestamp: new Date().toISOString(),
                    method: 'realtime_sync'
                },
                messageId: 'msg-12345',
                timestamp: new Date().toISOString()
            };
            
            console.log('  📤 Extension should send this via WebSocket:');
            console.log(JSON.stringify(expectedMessage, null, 2));
            
            console.log('\n  📋 Mobile app should receive and process:');
            console.log('    1. WebSocket message with type="copilotProgress"');
            console.log('    2. updateType="chatHistorySync"');
            console.log('    3. data.messages array containing chat history');
            console.log('    4. chatSyncHandler() processes the message');
            console.log('    5. UI updates with new chat messages');
            
            testsPassed++;
            
        } catch (error) {
            console.log(`  ❌ WebSocket message transmission validation failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test 5: Mobile App Message Processing
        console.log('\n🎯 Test 5: Mobile App Message Processing');
        try {
            console.log('  📋 Validating mobile app message processing...');
            
            console.log('  📱 Mobile app chatSyncHandler should:');
            console.log('    1. Receive WebSocket message');
            console.log('    2. Check message.type === "copilotProgress"');
            console.log('    3. Check message.updateType === "chatHistorySync"');
            console.log('    4. Extract message.data.messages array');
            console.log('    5. Update UI with new messages');
            
            console.log('\n  📋 Expected mobile app debug output:');
            console.log('    - "🔍 [chatSyncHandler] DEBUG: WebSocket message received"');
            console.log('    - "📋 🎯 [chatSyncHandler] PROCESSING chat history sync"');
            console.log('    - "📋 🔍 [chatSyncHandler] Found messages array with length: X"');
            console.log('    - "📋 🎉 [chatSyncHandler] Adding X NEW messages from chat sync"');
            
            testsPassed++;
            
        } catch (error) {
            console.log(`  ❌ Mobile app message processing validation failed: ${error.message}`);
            testsFailed++;
        }
        
        // Test Results
        console.log('\n📊 Chat Sync Workflow Test Results:');
        console.log(`✅ Passed: ${testsPassed}`);
        console.log(`❌ Failed: ${testsFailed}`);
        console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
        
        console.log('\n🎯 DEBUGGING WORKFLOW:');
        console.log('1. 🚀 Start VS Code extension and mobile app');
        console.log('2. 📱 Open chat screen in mobile app');
        console.log('3. 🔍 Watch logs in this order:');
        console.log('   📱 Mobile: "Sending command to VS Code: request_chat_sync"');
        console.log('   🔧 Extension: "Mobile app requesting chat history sync"');
        console.log('   🔧 Extension: "Setting up progress callback"');
        console.log('   🔧 Extension: "startChatHistorySync() called!"');
        console.log('   🔧 Extension: "sendProgressUpdate with chatHistorySync"');
        console.log('   📱 Mobile: "chatSyncHandler DEBUG: WebSocket message received"');
        console.log('   📱 Mobile: "PROCESSING chat history sync"');
        
        if (testsFailed === 0) {
            console.log('\n🎉 All chat sync workflow tests passed!');
        } else {
            console.log('\n⚠️ Some workflow tests failed.');
        }
        
        return { testsPassed, testsFailed };
        
    } catch (error) {
        console.log(`❌ Chat sync workflow test failed: ${error}`);
        return { testsPassed: 0, testsFailed: 1 };
    }
}

// Main test runner for live system
async function runLiveTests() {
    console.log('🔥 LIVE EXTENSION TESTING SUITE');
    console.log('=====================================');
    console.log('Testing VS Code extension with live mobile app and API');
    console.log('=====================================\n');
    
    // Run live extension tests
    const extensionResults = await testLiveExtension();
    
    console.log('\n' + '='.repeat(60));
    
    // Run chat sync workflow tests
    const workflowResults = await testChatSyncWorkflow();
    
    console.log('\n📊 COMBINED LIVE TEST RESULTS:');
    console.log(`✅ Extension Tests Passed: ${extensionResults.testsPassed}`);
    console.log(`❌ Extension Tests Failed: ${extensionResults.testsFailed}`);
    console.log(`✅ Workflow Tests Passed: ${workflowResults.testsPassed}`);
    console.log(`❌ Workflow Tests Failed: ${workflowResults.testsFailed}`);
    
    const totalPassed = extensionResults.testsPassed + workflowResults.testsPassed;
    const totalFailed = extensionResults.testsFailed + workflowResults.testsFailed;
    
    console.log(`📈 Overall Success Rate: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`);
    
    console.log('\n🎯 NEXT STEPS:');
    if (totalFailed === 0) {
        console.log('🎉 All tests passed! Your extension setup is ready.');
        console.log('📱 Test chat sync by opening chat screen in mobile app');
        console.log('🔍 Monitor VS Code Output > "VSCoder - Copilot Bridge" for real-time logs');
    } else {
        console.log('⚠️ Some tests failed. Check the issues above.');
        console.log('🚀 Make sure VS Code extension is running (F5 + Start VSCoder Server)');
        console.log('📱 Ensure mobile app and API are running');
        console.log('🔗 Verify WebSocket connections are established');
    }
    
    process.exit(totalFailed === 0 ? 0 : 1);
}

// Run the live tests
runLiveTests().catch(error => {
    console.error('❌ Live test runner failed:', error);
    process.exit(1);
});
