# 🚀 VSCoder Copilot - AI-Powered Mobile Development

Transform your smartphone into an intelligent coding companion! VSCoder brings GitHub Copilot's AI power directly to your mobile device, enabling seamless development from anywhere in the world.

**Perfect for:** Code reviews on commute • Quick fixes from anywhere • AI-assisted mobile coding • Remote development workflows

> **🎉 Latest Update (v1.2.5)**: Enhanced mobile device validation with improved connection stability, production API integration, and optimized rate limiting for reliable mobile app connectivity!

## ✨ What Makes VSCoder Special

**🌍 Code From Anywhere**
- Connect your phone to VS Code across **any network** (home, office, mobile data)
- No complex setup, firewalls, or port forwarding needed
- Secure 6-digit pairing codes connect devices instantly
- **NEW**: Production-ready mobile app available on Google Play Store

**🤖 Full GitHub Copilot on Mobile**
- Chat with AI using natural language: *"Create a login component with validation"*
- Browse and edit your entire VS Code workspace from your phone
- Real-time sync - your conversations appear everywhere instantly
- **NEW**: Enhanced mobile device validation with improved connection reliability

**⚡ Instant Setup (2 Minutes)**
1. **Install** this extension from VS Code marketplace
2. **Start** the server with one command (`VSCoder: Start Server`)  
3. **Get pairing code** from VS Code status bar (6 digits)
4. **Install mobile app** from Google Play Store or development build
5. **Approve device** when VS Code shows validation notification
6. **Start coding** - AI-powered development ready!

**🔐 Enterprise Security**
- Your code never leaves your devices
- Encrypted end-to-end communication
- **NEW**: Enhanced device validation with user approval system
- Pairing codes expire every 10 minutes for security
- **Device Validation Pipeline**: VS Code shows user-friendly notification dialogs when mobile devices request access
- **User Authorization Required**: You must explicitly approve each device connection attempt
- **Enhanced Device Information**: Approval notifications show friendly device names and platform information with emojis
- **Granular Access Control**: Approve or deny device access on a per-device basis with Approve/Deny/Details buttons
- **Session Management**: Approved devices receive secure authentication tokens for ongoing access
- **Professional UI**: Clean notification system at bottom-right instead of intrusive modal dialogs
- **Complete Disconnect Cleanup**: Automatic cleanup when devices are removed or VS Code shuts down
- **Smart State Management**: Proper cleanup of authentication state when profiles are deleted in mobile app

> **💡 Use Case**: Review pull requests on your commute, fix bugs from the coffee shop, or get AI coding help while away from your desk!

## 🎯 Key Features

**🤖 AI-Powered Mobile Coding**
- **Full GitHub Copilot Integration**: Access all AI models (GPT-4o, Claude, etc.) on mobile
- **Natural Language Prompts**: *"Add authentication to this component"*, *"Fix this bug"*, *"Optimize this function"*
- **Context-Aware Responses**: AI understands your entire workspace for better suggestions
- **Real-Time Chat Sync**: Conversations sync automatically every 5 seconds between devices

**📱 Complete Mobile Workspace**
- **File Browser**: Navigate your entire VS Code project from mobile
- **Code Editing**: Make quick fixes and edits directly from your phone
- **Workspace Management**: Switch between multiple projects with saved profiles
- **Live Updates**: See changes instantly across all connected devices

**🌐 Global Connectivity**
- **Cross-Network Pairing**: Connect from anywhere - home, office, mobile data, coffee shop WiFi
- **Zero Configuration**: No port forwarding, VPNs, or network setup required
- **Secure Cloud Service**: Production-grade infrastructure handles connections
- **6-Digit Pairing**: Simple codes that expire for security

**⚡ Developer-Friendly**
- **Instant Setup**: Working in under 2 minutes
- **Multiple AI Models**: Switch between GPT-4o, Claude, and other Copilot models
- **Command Execution**: Run terminal commands suggested by AI
- **Session Management**: Persistent conversations across reconnections
- **Enhanced UX**: Non-intrusive notifications replace modal dialogs for better workflow
- **Smart Cleanup**: Automatic state management when devices connect or disconnect

## 🚀 Quick Start (2 Minutes)

### Step 1: Install Extension
- **From VS Code**: Search "VSCoder Copilot" in Extensions marketplace
- **Click Install** and restart VS Code if prompted

### Step 2: Start the Server
- **Press `Ctrl+Shift+P`** (Windows/Linux) or `Cmd+Shift+P` (Mac)
- **Type**: `VSCoder: Start VSCoder Server`
- **Press Enter** - Server starts automatically on port 8080

### Step 3: Get Your Pairing Code  
- **Check status bar** - You'll see a 6-digit code like `📱 123456`
- **Or manually get code**: `Ctrl+Shift+P` → `VSCoder: Show Pairing Code`
- **Code refreshes** every 10 minutes for security

### Step 4: Connect Mobile App
- **Download VSCoder mobile app** (Android/iOS)
- **Google Play Store**: Search "VSCoder Copilot" or use package `com.emirbaycan.vscodercopilot`
- **App Store**: Search "VSCoder Copilot" (iOS version)
- **Open app** → **Settings** → **Profiles** → **"Pair with VS Code"**
- **Enter the 6-digit code** from step 3
- **⚠️ SECURITY VALIDATION**: When the mobile device requests access, VS Code will show a user-friendly notification at the bottom-right with device information
- **⚡ USER APPROVAL REQUIRED**: Click "Approve" in the notification to grant the mobile device access to your workspace
- **📱 DEVICE DETAILS**: The notification shows friendly device information with emojis (e.g., "📱 Mobile device 'iPhone (iOS)' wants to connect")
- **🔐 SECURITY NOTE**: Only approve devices you trust - this grants access to your VS Code workspace and files
- **✨ ENHANCED UX**: Clean, non-intrusive notifications with Approve/Deny/Details buttons for better user experience
- **Connection established** automatically after approval - works across any network!

### Step 5: Start AI-Powered Coding! 🎉
- **Browse files** on mobile from your VS Code workspace
- **Chat with AI**: *"Add error handling to this function"*
- **See responses** sync between VS Code and mobile instantly
- **Accept/reject** AI suggestions with one tap

> **💡 Pro Tip**: Your conversations automatically sync every 5 seconds between devices. Ask Copilot on mobile, see the response in VS Code!

## 📋 Available Commands

Essential commands for daily use:

- **`VSCoder: Start VSCoder Server`** - Start mobile connectivity
- **`VSCoder: Show Pairing Code`** - Display your current 6-digit code  
- **`VSCoder: Show Status`** - Check connection and server health
- **`VSCoder: Generate New Pairing Code`** - Get a fresh code if needed
- **`VSCoder: Run Diagnostics`** - Troubleshoot any connection issues

Advanced commands:
- **`VSCoder: Test Copilot Bridge`** - Verify AI integration
- **`VSCoder: Stop VSCoder Server`** - Stop mobile connectivity
## 📱 Mobile App Features

### What You Can Do On Your Phone

**💬 AI Chat Interface**
- Ask Copilot anything: *"Explain this function"*, *"Add unit tests"*, *"Optimize this code"*
- Full @workspace context - AI knows your entire project
- Switch between AI models (GPT-4o, Claude, etc.)
- Conversations sync automatically with VS Code

**📁 Complete File Management**
- Browse your entire VS Code workspace
- Open, read, and edit files directly on mobile
- Navigate project structure with familiar folder tree
- Quick file search and filtering

**⚙️ Profile Management**
- Save multiple workspace connections
- Quick switching between different projects
- Automatic reconnection to saved profiles
- Works across any network (home, office, mobile data)

**🔄 Real-Time Synchronization**
- See VS Code changes instantly on mobile
- Mobile edits appear in VS Code immediately  
- Chat conversations sync every 5 seconds
- Manual sync button for instant updates

### Premium Features (Mobile App v1.0.1+)
- **🎁 1-Day Free Trial**: Automatic trial subscription created on first authentication (updated from 7-day trial)
- **💎 Premium Monthly** ($9.99): Unlimited AI conversations and full feature access
- **🏆 Premium Annual** ($99.99): All features with 17% savings  
- **🔐 Subscription Authentication**: Database-backed subscription verification integrated with VS Code extension
- **🏪 Google Play Store**: Live on Google Play Store with active subscription processing

## ⚙️ Requirements

### VS Code Setup
- **VS Code**: Version 1.80 or later
- **GitHub Copilot Extension**: Must be installed and authenticated
- **Active Workspace**: Open project/folder in VS Code
- **Internet Connection**: Required for mobile pairing and AI features

### GitHub Copilot
- **Active Subscription**: GitHub Copilot Individual, Business, or Enterprise
- **Authentication**: Must be signed in to GitHub Copilot in VS Code
- **Supported Models**: GPT-4o, Claude 3.5 Sonnet, and other available models

### Mobile Device
- **VSCoder Mobile App**: Download from Google Play Store (Android) or App Store (iOS) - VSCoder Copilot v1.0.1+ live on Google Play
- **App Package**: `com.emirbaycan.vscodercopilot` (Android package identifier)
- **Internet Connection**: WiFi or mobile data for device pairing
- **Operating System**: Android 8.0+ or iOS 12.0+

> **💡 Note**: Both devices need internet access for initial pairing, but they don't need to be on the same network!

## 🔧 Settings & Configuration

VSCoder works out of the box, but you can customize these settings:

### Basic Settings
- **`vscoder.port`**: Server port (default: 8080)
- **`vscoder.autoStart`**: Auto-start server when VS Code opens (default: true)
- **`vscoder.showMobileGuidance`**: Show helpful tips for mobile setup (default: true)

### Advanced Settings  
- **`vscoder.discoveryApiUrl`**: Cloud service URL (default: production service)
- **`vscoder.deviceToken`**: Device authentication token (auto-generated)
- **`vscoder.pairingCode`**: Current pairing code (auto-refreshed every 10 minutes)
- **`vscoder.enableRateLimitHandling`**: Enhanced rate limit protection (default: true)
- **`vscoder.heartbeatInterval`**: Keep-alive interval in minutes (default: 10)

### API Communication
- **`vscoder.api.pollingInterval`**: How often to check for mobile messages (default: 3 seconds)
- **`vscoder.api.timeout`**: Request timeout in milliseconds (default: 10 seconds)

> **🔧 To change settings**: Go to VS Code Settings (`Ctrl+,`) and search for "vscoder"

### Configuration Options Explained

**vscoder.discoveryApiUrl**: The cloud discovery service endpoint that enables cross-network device pairing. Uses production service by default.

**vscoder.websiteUrl**: The main website URL where the React application is hosted. Used for browser-based interactions and provides API proxy functionality.

**vscoder.deviceToken**: Authentication token automatically generated and managed by the subscription-based Discovery API. Tokens are database-backed and persist across server restarts for reliable authentication.

**vscoder.pairingCode**: Auto-generated 6-digit codes that expire every 10 minutes for security. Used for device pairing and subscription creation during authentication flow.

**vscoder.api.url**: Discovery API server URL for mobile app communication via message broker (same as discoveryApiUrl for consistency).

**vscoder.api.pollingInterval**: How often the extension polls for messages from mobile apps via Discovery API (in milliseconds).

**vscoder.api.timeout**: Maximum time to wait for API responses before timing out (in milliseconds).

### Environment Variables

For development or custom deployments:
```bash
VSCODER_API_URL=https://api.vscodercopilot.com.tr
VSCODER_WEBSITE_URL=https://vscodercopilot.com.tr
VSCODER_WEBSOCKET_URL=wss://api.vscodercopilot.com.tr/ws
```

## Quick Start

### Prerequisites

- **VS Code** 1.74.0 or later
- **Node.js** 16.x or later
- **GitHub Copilot Extension** installed and authenticated
- **Active Workspace** with project files

### Option 1: Automatic Pairing (Recommended)

1. **Install Dependencies**: `npm install`
2. **Compile Extension**: `npm run compile`  
3. **Launch Development**: Press F5 to open Extension Development Host
4. **Start Server**: Run "VSCoder: Start VSCoder Server" command
5. **Get Pairing Code**: Run "VSCoder: Show Pairing Code" command (or check status bar)
6. **Connect Mobile**: Use 6-digit code in VSCoder mobile app to auto-connect across networks
7. **Test Integration**: Run "VSCoder: Test VSCoder Copilot Bridge"

> **📡 Cloud Discovery**: The extension now uses the production discovery service at `api.vscodercopilot.com.tr` by default, enabling device pairing across different networks and locations.

### Option 2: Manual Setup (Local Network Only)

1. **Install Dependencies**: `npm install`
2. **Compile Extension**: `npm run compile`  
3. **Launch Development**: Press F5 to open Extension Development Host
4. **Start Server**: Run "VSCoder: Start VSCoder Server" command
5. **Test Integration**: Run "VSCoder: Test VSCoder Copilot Bridge"
6. **Check Logs**: View "VSCoder - Copilot Bridge" output channel
7. **Configure Mobile**: Manually set server IP/port in mobile app (local network only)

> **⚠️ Note**: Manual setup only works for devices on the same local network. For cross-network connections, use the automatic pairing option.

### Installation from VS Code Marketplace

1. **Install Extension**: Search for "VSCoder Copilot" in VS Code Extensions marketplace
2. **Restart VS Code**: Ensure proper extension activation
3. **Verify Installation**: Run "VSCoder: VSCoder Status" to check extension health
4. **Start Server**: Use "VSCoder: Start VSCoder Server" command to begin

> **✅ Production Ready**: Version 1.2.2+ includes all dependencies and is fully marketplace compatible.

## AI Integration Requirements

- ✅ **GitHub Copilot Extension** installed and authenticated
- ✅ **Active Workspace** with project files
- ✅ **Model Access** to GPT-4o, Claude, or other supported models

## 🔍 How It Works (Behind the Scenes)

*Don't worry - this all happens automatically! This section is just for those curious about the technology.*

### Simple Connection Flow

```
Your Phone                VSCoder Cloud              Your VS Code
    📱                         ☁️                        💻
    │                          │                         │
    │ 1. Enter 6-digit code    │                         │
    ├─────────────────────────►│                         │
    │                          │ 2. Find VS Code        │
    │                          ├────────────────────────►│
    │                          │ 3. Return connection    │
    │                          │◄────────────────────────┤
    │ 4. Direct connection     │                         │
    │◄─────────────────────────┼────────────────────────►│
    │    🔐 Secure tunnel      │                         │
```

### What Happens When You Pair

1. **VS Code registers** with our secure cloud service
2. **You get a 6-digit code** that's unique to your VS Code instance  
3. **Mobile app uses code** to securely find your VS Code
4. **Direct connection established** - your code never goes through our servers
5. **AI chat and file access** work directly between your devices

### Security & Privacy

- **Your code stays private**: Only travels between your devices
- **Encrypted communication**: All data is encrypted end-to-end
- **No data storage**: We don't store your code or conversations
- **Temporary codes**: Pairing codes expire every 10 minutes
- **Local control**: You can stop the server anytime

### Network Magic

**The Cool Part**: Your devices don't need to be on the same WiFi!

- **Home WiFi + Mobile Data**: ✅ Works perfectly
- **Office network + Personal phone**: ✅ No problem
- **Coffee shop + Hotel WiFi**: ✅ Connects seamlessly
- **Different countries**: ✅ Works globally

This is possible because our cloud service acts as a secure "introduction service" - it helps your devices find each other, then gets out of the way.

> **Note**: Message broker endpoints require authentication token. Mobile apps and VS Code extension use these for cross-network message passing.

### Main Website Integration

The main website at `https://vscodercopilot.com.tr` provides:
- **Project Information**: Documentation, guides, and getting started resources
- **API Health Proxy**: `/health` endpoint proxies to the backend API for status checks
- **API Gateway**: `/api/*` endpoints proxy to the Discovery API backend
- **Resource Links**: Download links for mobile apps and development tools

The website serves as the primary entry point for users while the API subdomain handles all backend operations.

## Usage Examples

### Check System Health
```bash
# Main website health (proxies to API backend)
curl https://vscodercopilot.com.tr/health

# Direct API health check
curl https://api.vscodercopilot.com.tr/health
```

### Test Website API Proxy
```bash
# Test API endpoints through main website proxy
curl https://vscodercopilot.com.tr/api/v1/health

# Test authentication through website proxy
curl -X POST https://vscodercopilot.com.tr/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"device_info": {"name": "test", "platform": "vscode", "version": "1.0.0"}}'
```

### Get Message Queue Status (for a pairing code)
```bash
# Requires authentication token
curl "https://api.vscodercopilot.com.tr/api/v1/messages/ABC123/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Messages for Device (for debugging)
```bash
# Get messages for VS Code (receiver=vscode gets messages from mobile)
curl "https://api.vscodercopilot.com.tr/api/v1/messages/ABC123/vscode" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get messages for Mobile (receiver=mobile gets messages from VS Code)  
curl "https://api.vscodercopilot.com.tr/api/v1/messages/ABC123/mobile" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### WebSocket Communication (Primary API)
```javascript
// Connect to Discovery API WebSocket for real-time communication
const ws = new WebSocket('wss://api.vscodercopilot.com.tr/api/v1/messages/ws');

// Send AI prompt via message broker (can also use main website proxy)
const sendMessage = {
  pairing_code: "ABC123",
  sender: "mobile", // or "vscode"
  message: {
    type: "copilot_request",
    content: "Create a React component for user authentication",
    data: {
      agentMode: "autonomous"
    }
  }
};

// Send via Discovery API directly
fetch('https://api.vscodercopilot.com.tr/api/v1/messages/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(sendMessage)
});

// Or send via main website proxy
fetch('https://vscodercopilot.com.tr/api/v1/messages/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(sendMessage)
});
```

### Workspace & File Operations

Mobile apps can send **command messages** through the Discovery API message broker to control VS Code:

#### 📂 Workspace Commands
```javascript
// Get workspace information
{
  pairing_code: "ABC123",
  sender: "mobile",
  message: {
    type: "command",
    content: "get_workspace_info"
  }
}

// List files in directory
{
  pairing_code: "ABC123", 
  sender: "mobile",
  message: {
    type: "command",
    content: "list_files",
    data: { path: "src" } // Optional: default is root
  }
}
```

#### 📄 File Commands
```javascript
// Read file content
{
  pairing_code: "ABC123",
  sender: "mobile", 
  message: {
    type: "command",
    content: "read_file",
    data: { path: "src/App.tsx" }
  }
}

// Write file content
{
  pairing_code: "ABC123",
  sender: "mobile",
  message: {
    type: "command", 
    content: "write_file",
    data: { 
      path: "src/NewComponent.tsx",
      content: "import React from 'react';\n\nexport const NewComponent = () => {\n  return <div>Hello World</div>;\n};"
    }
  }
}

// Open file in VS Code editor
{
  pairing_code: "ABC123",
  sender: "mobile",
  message: {
    type: "command",
    content: "open_file", 
    data: { path: "src/App.tsx" }
  }
}
```

#### 🎯 Editor Commands  
```javascript
// Get active file information
{
  pairing_code: "ABC123",
  sender: "mobile",
  message: {
    type: "command",
    content: "get_active_file"
  }
}

// Focus VS Code editor
{
  pairing_code: "ABC123", 
  sender: "mobile",
  message: {
    type: "command",
    content: "focus_editor"
  }
}
```

#### ⚡ System Commands
```javascript
// Run terminal command
{
  pairing_code: "ABC123",
  sender: "mobile",
  message: {
    type: "command", 
    content: "run_terminal",
    data: { command: "npm install react" }
  }
}

// Execute VS Code command
{
  pairing_code: "ABC123",
  sender: "mobile", 
  message: {
    type: "command",
    content: "run_vscode_command",
    data: { 
      command: "workbench.action.files.save",
      args: [] // Optional arguments
    }
  }
}
```

#### 🤖 AI & Copilot Commands
```javascript
// Start AI chat session
{
  pairing_code: "ABC123",
  sender: "mobile",
  message: {
    type: "command",
    content: "copilot_chat", 
    data: {
      prompt: "Create a login form component with TypeScript",
      agentMode: "autonomous" // or "interactive", "code-review", etc.
    }
  }
}

// Add file to AI chat context
{
  pairing_code: "ABC123",
  sender: "mobile",
  message: {
    type: "command",
    content: "copilot_add_file_to_chat",
    data: { filePath: "src/App.tsx" }
  }
}

// Accept AI-generated edits
{
  pairing_code: "ABC123", 
  sender: "mobile",
  message: {
    type: "command",
    content: "copilot_accept_edits"
  }
}

// Reject AI-generated edits  
{
  pairing_code: "ABC123",
  sender: "mobile", 
  message: {
    type: "command",
    content: "copilot_reject_edits"
  }
}

// Get available AI models
{
  pairing_code: "ABC123",
  sender: "mobile",
  message: {
    type: "command",
    content: "copilot_get_models"
  }
}

// Change AI model
{
  pairing_code: "ABC123",
  sender: "mobile",
  message: {
    type: "command", 
    content: "copilot_change_model",
    data: { modelName: "gpt-4o" }
  }
}
```

### Complete Command Reference

| Command | Description | Required Data | Response |
|---------|-------------|---------------|----------|
| `get_workspace_info` | Get workspace folders and active file | - | `{workspace_folders, active_text_editor, language}` |
| `list_files` | List files in directory | `{path}` | `[{name, type, path}]` |
| `read_file` | Read file content | `{path}` | `{path, content, size}` |
| `write_file` | Write content to file | `{path, content}` | `{path, size, success}` |
| `open_file` | Open file in editor | `{path}` | `{success, message, path}` |
| `get_active_file` | Get active editor info | - | `{activeFile: {path, fileName, language, lineCount, isDirty, cursorPosition}}` |
| `focus_editor` | Focus VS Code editor | - | `{success, message}` |
| `run_terminal` | Execute terminal command | `{command}` | `{success, command, stdout, stderr, exit_code}` |
| `run_vscode_command` | Execute VS Code command | `{command, args?}` | `{success, result, command, message}` |
| `copilot_chat` | Start AI conversation | `{prompt, agentMode?}` | `{success, copilot_response}` |
| `copilot_add_file_to_chat` | Add file to AI context | `{filePath}` | `{success, message, filePath}` |
| `copilot_accept_edits` | Accept AI changes | - | `{success, message}` |
| `copilot_reject_edits` | Reject AI changes | - | `{success, message}` |
| `copilot_get_models` | List available AI models | - | `{success, models: []}` |
| `copilot_change_model` | Switch AI model | `{modelName}` | `{success, currentModel}` |

### Get Pairing Code
```bash
# Note: Pairing codes are managed internally by the extension
# Use VS Code command: "VSCoder: Show Pairing Code"
# Health check can be done via discovery service
curl https://api.vscodercopilot.com.tr/health
```

### Check Discovery Status
```bash
# Check main website health (includes backend status)
curl https://vscodercopilot.com.tr/health

# Check discovery service health directly
curl https://api.vscodercopilot.com.tr/health

# Test discovery service authentication via website proxy
curl -X POST https://vscodercopilot.com.tr/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"device_info": {"name": "test", "platform": "vscode", "version": "1.0.0"}}'

# Test discovery service authentication directly
curl -X POST https://api.vscodercopilot.com.tr/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"device_info": {"name": "test", "platform": "vscode", "version": "1.0.0"}}'

# Test message broker endpoints (requires authentication token)
curl "https://api.vscodercopilot.com.tr/api/v1/messages/ABC123/status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or via website proxy
curl "https://vscodercopilot.com.tr/api/v1/messages/ABC123/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## WebSocket-First Architecture

The VSCoder extension uses a **WebSocket-first approach** for real-time communication:

### Message Flow Architecture
```
Mobile App → Discovery API Message Broker → VS Code Extension
     ↓                    ↓                          ↓
Send Command → Queue Message by Pairing Code → WebSocket Notification
     ↑                    ↑                          ↓
Get Response ← Return Queued Result ← Process & Send Response
```

### Key Features
- **Real-time Communication**: WebSocket connection provides instant command/response flow
- **Message Broker Integration**: Discovery API acts as secure message broker between devices
- **Session Management**: Advanced session tracking with automatic cleanup
- **Progress Updates**: Real-time progress callbacks from CopilotBridge to mobile apps
- **Auto-Reconnection**: Smart reconnection logic with exponential backoff
- **Message Deduplication**: Multi-layer duplicate prevention with content hashing

### WebSocket Benefits
- ⚡ **Instant Updates**: Real-time progress updates during AI operations
- 🔄 **Bidirectional**: Full duplex communication for commands and responses  
- 🛡️ **Secure**: Authenticated WebSocket connections with token validation
- 🌐 **Cross-Network**: Works across different networks via Discovery API
- 📱 **Mobile-Optimized**: Efficient for mobile app real-time requirements

## WebSocket Events & Real-Time Communication

Real-time bidirectional communication for mobile apps with unlimited continuous monitoring:

### Connection Events
- **`connected`**: Server connection confirmation with welcome message
- **WebSocket Reconnection**: Automatic reconnection with 3-second retry intervals

### Unlimited Monitoring System
- **`new_response`**: Real-time Copilot responses detected and captured immediately
  - **Limitless Duration**: Monitoring runs forever until VS Code is closed
  - **Background Processing**: Continuous monitoring without timeout restrictions
  - **Instant Detection**: New messages appear immediately when generated
  - **Clean Response Flow**: Only actual AI responses are sent to mobile app

### File & Response Events
- **`fileChanged`**: Live file update notifications with file path and content
- **`copilotResponse`**: Final Copilot response data with complete results (legacy)

### New Response Message Format
```json
{
  "type": "copilotProgress",
  "updateType": "new_response",
  "data": {
    "message": "New Copilot response detected",
    "responseLength": 1247,
    "responseContent": "Here is the actual AI response content...",
    "fullResponse": "Complete response text",
    "checkNumber": 42
  },
  "timestamp": "2025-08-26T10:30:45.123Z"
}
```

### WebSocket Integration Benefits
- **Never Miss Responses**: Unlimited monitoring ensures every Copilot message is captured
- **Clean Chat Experience**: Only AI responses shown, no progress message clutter
- **Instant Updates**: Messages appear immediately when Copilot generates content
- **Background Processing**: Monitoring doesn't interfere with VS Code or user interactions
- **Resource Efficient**: Smart conversation tracking prevents duplicate detection

## Mobile Development Workflow

### Automatic Pairing Workflow (Recommended)

1. **🚀 Start Server**: Launch VSCoder server in VS Code
2. **� Auto-Register**: Server automatically registers with cloud discovery service
3. **�🔐 Get Code**: Check status bar or run "VSCoder: Show Pairing Code"
4. **📱 Mobile Pairing**: Enter 6-digit code in VSCoder mobile app from anywhere
5. **✅ Auto Connect**: Connection profile created automatically across networks
6. **� Add Files to Chat**: Attach workspace files to AI conversation for context-aware analysis
7. **💬 Send Prompts**: Use natural language to describe coding tasks and requirements
8. **🤖 AI Generation**: GitHub Copilot generates code using full workspace context and attached files
9. **✅ Review & Apply**: Accept, reject, undo, or modify AI-generated changes with granular control
10. **🔄 Iterate & Refine**: Continue the conversation with persistent context and iterative improvements

> **🌐 Cross-Network Support**: Automatic pairing works across different networks, office/home connections, and mobile data.

### Manual Connection Workflow (Local Network Only)

1. **🚀 Start Server**: Launch VSCoder server in VS Code
2. **📱 Connect Mobile**: Mobile app connects to discovered VS Code instance (cross-network via pairing)
3. **🗂️ Browse Files**: Explore project structure via WebSocket messages
4. **💬 Send Prompts**: Use natural language to describe coding tasks
5. **🤖 AI Generation**: GitHub Copilot generates code using workspace context
6. **✅ Review & Apply**: Accept or reject AI-generated changes
7. **🔄 Iterate**: Continue the conversation for refinements

> **⚠️ Network Limitation**: Even manual setup now uses the discovery service for cross-network connectivity.

## How VSCoder Works

### Simple 3-Step Process

```
1️⃣ Install & Start VSCoder          2️⃣ Get Your Pairing Code          3️⃣ Connect from Anywhere
┌─────────────────────┐              ┌─────────────────────┐            ┌─────────────────────┐
│   💻 VS Code        │              │   🔐 6-Digit Code   │            │   📱 Mobile App     │
│                     │              │                     │            │                     │
│ ✅ Install Extension │              │  Status Bar: 123456 │            │ ✅ Enter Code: 123456│
│ ✅ Start Server     │   ────────►  │                     │  ────────► │ ✅ Auto-Connect     │
│ ✅ Auto-Register    │              │ 🌐 Works Globally   │            │ ✅ Start Coding     │
│                     │              │                     │            │                     │
└─────────────────────┘              └─────────────────────┘            └─────────────────────┘
```

### What Makes VSCoder Special

**🌍 Works Everywhere**
- Connect from **different networks** (home, office, coffee shop)
- No complex setup or port forwarding needed
- Secure cloud service handles the connection

**🤖 AI-Powered Mobile Coding**
- Full **GitHub Copilot** integration on your phone
- Natural language prompts: "Create a login component"
- Real-time code generation and file management

**📱 Professional Mobile Experience**
- Browse and edit your VS Code workspace files
- Real-time sync with your desktop
- Work on the go with full project context

**🔐 Enterprise Security**
- 6-digit pairing codes expire every 10 minutes
- Encrypted communication end-to-end
- Your code never leaves your devices

### Communication Flow

1. **Discovery Registration**: Extension registers with cloud discovery service on startup
2. **Pairing Code Generation**: 6-digit codes generated and shared via discovery service  
3. **Mobile Connection**: Mobile app uses pairing code to discover VS Code instance
4. **IP:Port Discovery**: Discovery service provides actual VS Code server IP and port
5. **Direct WebSocket Connection**: Mobile app connects directly to discovered VS Code extension
6. **Message-Based API**: All operations (file access, AI prompts, workspace management) via WebSocket messages

### WebSocket Communication Architecture

The extension uses a **WebSocket-first approach** with Discovery API integration:

```
┌─────────────────┐    WebSocket (Primary)    ┌──────────────────┐
│   Mobile App    │ ◄────────────────────────► │   Discovery API  │
│                 │                           │ Message Broker   │
└─────────────────┘                           └──────────────────┘
                                                        │
                                                        │ WebSocket + Auth
                                                        ▼
                                              ┌──────────────────┐
                                              │   VS Code Ext    │
                                              │                  │
                                              │ • Progress Updates│
                                              │ • Command Handling│
                                              │ • Real-time Sync │
                                              └──────────────────┘
```

### Message Flow & Session Management

- **WebSocket Primary**: Real-time bidirectional communication
- **Message Deduplication**: Advanced duplicate prevention with content hashing
- **Session Management**: Request-based session tracking with automatic reset
- **Message Pool**: Debugging and monitoring system with automatic cleanup
- **Progress Callbacks**: Real-time progress updates from CopilotBridge to mobile app
- **Auto-Reconnection**: Smart reconnection logic for unstable connections

### Security Features

- **Database-Backed Authentication**: Persistent token validation using subscription-based architecture
- **Bearer Token Authentication**: 64-character hex tokens with automatic trial subscription creation
- **Subscription-Based Access Control**: 1-day trial period with automatic premium upgrade options
- **WebSocket Authentication**: Secure token-based WebSocket connections with real-time validation
- **Cross-Network Security**: End-to-end encrypted communication through Discovery API
- **Workspace Isolation**: File access restricted to current workspace only
- **Rate Limiting**: Protection against abuse with configurable limits
- **HTTPS/WSS**: Encrypted communication between all components
- **Cross-Network NAT**: Secure tunneling through discovery service

## 🔧 Recent Updates & Improvements

### Version 1.2.3 (Latest - September 2025)

**🛠️ Stability & Reliability Enhancements**: Major improvements to extension stability and user experience
- ✅ **GitHub Copilot Extension Reload**: Added `reloadCopilot()` functionality to fix memory issues and extension crashes
- ✅ **Mobile App Button Integration**: Connected mobile app reload button to VS Code extension reload functionality
- ✅ **New Chat Session Fix**: Resolved broken new chat button that was causing WebSocket connection issues
- ✅ **Production Logging Cleanup**: Removed verbose console logging for better production performance
- ✅ **Enhanced Error Handling**: Improved error handling and recovery mechanisms for extension operations
- ✅ **Version Synchronization**: Updated mobile app version to 1.0.3 across all configuration files

**🔄 Code Quality & Performance**:
- Better function naming and code organization for improved maintainability
- Enhanced state management without unnecessary WebSocket resets
- Optimized memory usage and reduced logging overhead
- Improved connection stability and graceful recovery mechanisms

### Version 1.2.2 (Previous)

**🚀 Mobile App Integration Enhancements**: Optimized integration with VSCoder Copilot mobile app v1.0.1
- ✅ **Enhanced Mobile Pairing**: Improved reliability for 6-digit pairing code generation and validation
- ✅ **Subscription Synchronization**: Better synchronization with mobile app subscription states (1-day trial updates)
- ✅ **Connection Stability**: Enhanced WebSocket connection stability for mobile app communication
- ✅ **Error Recovery**: Improved error handling for mobile app connection issues and automatic reconnection
- ✅ **Performance Optimization**: Reduced memory usage and improved response times for mobile interactions
- ✅ **Production Readiness**: Optimizations for live Google Play Store mobile app deployment

**🔐 Enhanced Security & Authentication**:
- Updated authentication flow for compatibility with mobile app v1.0.1 subscription model
- Enhanced token validation for better mobile app authentication experience
- Improved security measures for cross-network device pairing
- Better handling of subscription trial periods and premium feature access

**🛠️ Developer Experience Improvements**:
- Enhanced diagnostic commands for mobile app troubleshooting
- Improved status indicators for mobile app connection states
- Better error messages and guidance for mobile pairing issues
- Enhanced logging and debugging capabilities for mobile integration

### Version 1.2.0-1.2.1 (Previous)

**🏗️ Enhanced WebSocket Architecture**: Complete WebSocket-first communication with Discovery API
- ✅ **Real-time Message Broker**: WebSocket connection to Discovery API for instant command/response flow
- ✅ **Advanced Session Management**: Request-based session tracking with automatic cleanup and memory leak prevention
- ✅ **Message Deduplication**: Multi-layer duplicate prevention with content hashing and sequence tracking
- ✅ **Progress Callback System**: Real-time progress updates from CopilotBridge routed to mobile apps
- ✅ **Auto-Reconnection Logic**: Smart reconnection with exponential backoff for network stability
- ✅ **Force Reconnect Capability**: Page-refresh-like reconnection to resolve mobile navigation issues

**🔐 Enhanced Authentication & Security**: 
- Database-backed device authentication with persistent token storage
- Automatic trial subscription creation (1-day trial, then premium upgrade)
- Subscription-based access control aligned with business model
- Bearer token management with database validation and persistence
- Secure WebSocket connections with subscription-verified credentials
- Enhanced rate limiting and subscription-based usage tracking

**⚡ Performance & Reliability Improvements**:
- Enhanced WebSocket-first communication with Discovery API
- Centralized authentication through DiscoveryService
- Advanced message deduplication and session management
- Real-time progress updates through WebSocket callbacks
- Reduced redundant token generation
- Improved error handling and diagnostics
- Enhanced connection stability and reconnection logic
- Force reconnect capability for mobile app navigation issues

**🛠️ Developer Experience**:
- Enhanced troubleshooting commands and diagnostics
- Comprehensive API connection testing commands
- Advanced status bar indicators with connection status
- Real-time progress monitoring with unlimited chat monitoring
- Message pool system for debugging and monitoring
- Session management with automatic cleanup
- Detailed diagnostic information and health checks
- Production-ready marketplace packaging (v1.2.2+)

## Technical Architecture

### Database-Backed Authentication System

The extension uses a robust database-backed authentication system that provides persistent token management and subscription-based access control:

#### Authentication Flow
1. **Device Registration**: Unique device tokens generated and stored in database
2. **Subscription Validation**: Real-time verification against subscription records
3. **Token Persistence**: Authentication state survives server restarts
4. **Trial Management**: Automatic 1-day trial creation for new devices

#### Database Schema
- **Device Table**: device_token, user_info, subscription links
- **Subscription Table**: trial_ends_at, expires_at, product_id, platform_receipt_id
- **Feature Access**: Real-time subscription status checking

#### WebSocket Security
- Bearer token authentication for all WebSocket connections
- Automatic credential refresh and reconnection
- Secure discovery service integration
- Real-time subscription status validation

### API Integration Points

The extension integrates with the VSCoder API through these endpoints:

- `POST /api/v1/auth/token` - Device authentication
- `GET /api/v1/auth/status` - Subscription verification  
- `WebSocket /api/v1/chat/ws` - Real-time communication
- `Discovery Service` - Automatic server detection

### Subscription-Based Access Control

All extension features require active subscription validation:

- **Trial Period**: 1-day automatic trial for new users
- **Premium Features**: Monthly ($9.99) or Annual ($99.99) subscriptions
- **Real-Time Validation**: Continuous subscription status checking
- **Graceful Degradation**: Clear messaging when subscription expires

## Supported AI Models

The extension automatically detects available models through VS Code's Language Model API:

- **GPT Models**: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-5
- **Claude Models**: claude-3.5-sonnet, claude-3.7-sonnet  
- **O Models**: o3, o4-mini
- **Custom Models**: Any models available through GitHub Copilot

## 🔧 Mobile App Troubleshooting (Updated)

### New Troubleshooting Commands
Use the built-in troubleshooter:
- **`Ctrl+Shift+P` → "VSCoder: Troubleshoot Mobile App Connection"** - Complete mobile connection diagnostics
- **`Ctrl+Shift+P` → "VSCoder: Check API Communication Status"** - Discovery API communication status
- **`Ctrl+Shift+P` → "VSCoder: Test API Connection"** - Test Discovery API connectivity
- **`Ctrl+Shift+P` → "VSCoder: Send Test Message to Mobile App"** - Send test message through message broker

These commands provide:
- ✅ Complete system diagnostics  
- ⚠️ Issue detection and guidance
- 📋 Copy diagnostics to clipboard
- 🔧 One-click fixes for common problems

### Common Mobile Connection Issues

#### ❌ Getting 429 "Too Many Requests" Errors?

**This is expected behavior!** The mobile app should NOT connect directly to:
- `http://your-ip:8080/workspace` ❌  
- `http://your-ip:8080/files` ❌

**Correct connection flow:**
1. Use pairing code in mobile app ✅
2. App connects to discovery service ✅  
3. Discovery service provides VS Code connection details ✅
4. Secure connection established ✅

**Rate Limiting Details:**
- Discovery service: 60 requests/minute per IP (increased from 10)
- Mobile apps should use pairing codes for connection
- Direct API calls are limited for security

#### ❌ No Pairing Code Available?
- Run "Generate New Pairing Code"  
- Ensure VS Code server is running
- Check discovery service registration

#### ❌ Discovery Service Not Registered?
- Run "Test VSCoder Discovery Service"
- Check internet connection  
- Verify discovery service URL in settings
- Rate limits may cause temporary registration delays

#### ❌ Mobile App Can't Find VS Code?
- Ensure both devices have internet access
- Use the 6-digit pairing code (not direct IP connection)
- Check that VS Code extension is running
- Try generating a new pairing code

### Status Bar Indicators (Enhanced)

| Icon | Status | Meaning | Action |
|------|--------|---------|---------|
| `📱 123456 🔗` | ✅ Ready (API Connected) | Pairing code available, registered, API connected | Click for options |
| `📱 123456 📱` | ✅ Ready (Local Only) | Pairing code available, registered, local connection | Click for options |
| `📱 123456 ⚠️` | ⚠️ Warning | Code available, not registered with discovery service | Click to troubleshoot |
| `📱 VSCoder ❌` | ❌ Error | No pairing code available | Click to troubleshoot |
| `📱 VSCoder (Stopped)` | 🔌 Offline | Server not running | Click to start |

### Discovery Service vs VS Code Server

**Important:** Mobile apps should distinguish between these services:

**Discovery Service** (https://api.vscodercopilot.com.tr):
- 🔍 Device registration and discovery
- 🔐 Pairing code validation  
- 🛡️ Rate limiting for security (60 req/min)
- 🌐 Cross-network device finding

**VS Code Server** (Discovered via pairing):
- 📁 Actual workspace and file access
- 🤖 Copilot integration
- 🔄 Real-time collaboration  
- ✏️ Code editing capabilities

### API Updates for Mobile Apps

The VS Code server now provides helpful error messages when mobile apps connect to wrong endpoints:

```json
// GET /workspace response (wrong endpoint)
{
  "error": "This is a VS Code server, not the discovery service",
  "message": "Use the discovery service with your pairing code",
  "guidance": {
    "step1": "Use the VSCoder mobile app pairing feature",
    "step2": "Enter your 6-digit pairing code", 
    "step3": "App will auto-discover this VS Code instance"
  }
}
```

### Rate Limiting Best Practices

1. **Mobile Apps**: Always use pairing codes for initial connection
2. **Direct Connections**: Only after successful pairing
3. **Error Handling**: Implement exponential backoff for 429 errors
4. **User Guidance**: Show helpful messages for rate limit errors

## 🔧 Troubleshooting & Support

### � Quick Fix Tool

**Having issues?** Use our built-in troubleshooter first:

1. **Press `Ctrl+Shift+P`** (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. **Type**: `VSCoder: Run VSCoder Diagnostics`
3. **Press Enter** - Get instant diagnostics and fixes!

This tool will:
- ✅ Check your VS Code and GitHub Copilot setup
- ⚠️ Identify connection problems automatically  
- 📋 Copy diagnostic info for support requests
- 🔧 Provide step-by-step solutions

### Common Issues & Quick Fixes

#### 📱 "No Pairing Code Available"

**What you see**: Status bar shows `📱 VSCoder ❌` or no code
**Quick fix**: 
1. Run `VSCoder: Start VSCoder Server`
2. Wait 10 seconds for registration
3. Run `VSCoder: Show Pairing Code`

#### 🔌 "Server Won't Start"

**What you see**: Error messages when starting server
**Quick fix**:
1. Check if port 8080 is busy: Change `vscoder.port` to 8081 in settings
2. Restart VS Code completely
3. Try `VSCoder: Start VSCoder Server` again

#### 🤖 "GitHub Copilot Not Working"

**What you see**: AI features don't work in mobile app
**Quick fix**:
1. **In VS Code**: `Ctrl+Shift+P` → `GitHub Copilot: Sign Out`
2. **Sign back in**: `Ctrl+Shift+P` → `GitHub Copilot: Sign In`
3. **Test**: Try asking Copilot a question in VS Code
4. **Restart**: `VSCoder: Start VSCoder Server`

#### 📱 "Mobile App Can't Connect"

**What you see**: Connection timeouts or authentication errors
**Quick fix**:
1. Check if VS Code server is running: Look for `📱 123456` in status bar
2. Get fresh pairing code: `VSCoder: Show Pairing Code`
3. Make sure both devices have internet access
4. Try `VSCoder: Troubleshoot Mobile App Connection`

#### 🔐 "Device Validation Not Working"

**What you see**: Mobile app stays on "Connecting..." or shows validation errors
**Quick fix**:
1. **Check VS Code**: Look for a notification at the bottom-right asking to approve the device
2. **If no notification appears**: Run `VSCoder: Show Status` to check WebSocket connection
3. **Click "Approve"** when the notification appears with device information
4. **If notification was missed**: Mobile app will timeout, try connecting again
5. **Check notification details**: Use "Details" button to see comprehensive device information
6. **Check firewall**: Ensure VS Code can receive WebSocket notifications

#### ⏰ "Validation Request Expired"

**What you see**: "Validation request expired" error in mobile app
**Quick fix**:
1. **Wait 5 minutes** for the previous request to fully expire
2. **Get fresh pairing code**: Run `VSCoder: Show Pairing Code` 
3. **Try connecting again** - VS Code will show a new approval dialog
4. **Approve quickly** - Validation requests expire after 5 minutes for security

**What you see**: Mobile app says "connection failed" or "server not found"
**Quick fix**:
1. **Check internet**: Both devices need internet (different networks OK!)
2. **Fresh code**: Run `VSCoder: Generate New Pairing Code`
3. **Enter new code**: Use the new 6-digit code in mobile app
4. **Wait**: Connection may take 30-60 seconds

#### 📱 "Mobile App Navigation Issues"

**What you see**: After adding workspace with pairing code, navigating to chat page doesn't load messages/files until manual page refresh
**What's happening**: WebSocket event listeners weren't properly re-established during navigation
**Quick fix**:
1. **Use Refresh Button**: Tap the refresh button in the mobile app after navigation
2. **Automatic Solution**: The refresh button now mimics page refresh behavior
3. **Force Reconnect**: Mobile app uses `forceReconnect()` to reset WebSocket state completely
4. **Works Like Magic**: Should now work exactly like manual page refresh

**Technical Details**: The `forceReconnect()` method clears all WebSocket state, listeners, and message tracking, then re-establishes connection from scratch - exactly like a page refresh.

#### ⏰ "Pairing Code Expired"

**What you see**: Code doesn't work in mobile app
**Why**: Codes expire every 10 minutes for security
**Quick fix**: Run `VSCoder: Generate New Pairing Code`

**Pairing Code Problems**
- **Cause**: Codes expire every 10 minutes for security
- **Solution**: Generate new code with "VSCoder: Generate New Pairing Code"
- **Check**: Ensure VS Code server is running and registered with discovery service
- **Debug**: Check "VSCoder - Discovery Service" output channel for errors
- ### Mobile App Connection Issues

**Use the Mobile Troubleshooter**: `Ctrl+Shift+P` → "VSCoder: Troubleshoot Mobile App Connection"

#### ❌ Getting 429 "Too Many Requests" Errors?

**This is expected behavior!** Mobile apps should NOT connect directly to:
- `http://your-ip:8080/workspace` ❌  
- `http://your-ip:8080/files` ❌

**Correct connection flow:**
1. Use pairing code in VSCoder mobile app ✅
2. App connects to discovery service at \`api.vscodercopilot.com.tr\` ✅  
3. Discovery service provides VS Code connection details ✅
4. Secure tunneled connection established ✅

**Rate limiting details:**
- Discovery service: 60 requests/minute per IP
- VS Code server: Direct connections only after pairing
- Direct API calls without pairing are blocked for security

**Discovery API Endpoints Used by Mobile Apps:**
- `POST /api/v1/messages/send` - Send messages through broker
- `GET /api/v1/messages/:pairingCode/:receiver` - Get messages for device (vscode/mobile)
- `DELETE /api/v1/messages/:pairingCode/:receiver` - Clear messages for device 
- `GET /api/v1/messages/:pairingCode/status` - Get message queue status
- WebSocket `/api/v1/messages/ws` - Real-time communication

#### ❌ Mobile App Can't Find VS Code?

**Step-by-step diagnosis:**
1. **Check Extension Status**: Ensure VS Code server is running
2. **Verify Registration**: Extension should be registered with discovery service
3. **Get Fresh Code**: Generate new pairing code if current one expired
4. **Test Connectivity**: Both devices need internet access (not same network)
5. **Check Firewall**: Ensure HTTPS connections are allowed

**Common mistakes:**
- Trying to connect to local IP instead of using pairing code
- Using expired pairing codes (>10 minutes old)
- Extension not registered with discovery service
- Network blocking HTTPS connections

#### ❌ Discovery Service Not Responding?

**Troubleshooting steps:**
1. **Test Cloud Service**: `curl https://api.vscodercopilot.com.tr/health`
2. **Check Configuration**: Verify `vscoder.api.url` setting
3. **Network Diagnostics**: Test internet connectivity and DNS resolution
4. **Firewall Check**: Ensure HTTPS outbound connections allowed
5. **Rate Limits**: Wait if receiving 429 errors (temporary)

### Advanced Troubleshooting

**File Access Denied**
- **Cause**: Attempting to access files outside workspace
- **Solution**: Ensure all file paths are within current workspace boundaries
- **Security**: This is intentional - extension only accesses workspace files

**Model Switching Issues**
- **Cause**: VS Code API limitations for programmatic model switching
- **Workaround**: Model switching may open UI picker instead of direct switch
- **Expected**: This is current VS Code behavior, not an extension bug

**Performance Issues**
- **Memory**: Extension monitors Copilot continuously - this is normal
- **CPU**: Background monitoring is lightweight and optimized
- **Network**: WebSocket connections maintained for real-time updates

### Debug Commands & API Testing

```bash
# Test discovery service health
curl https://api.vscodercopilot.com.tr/health

# Test discovery service authentication
curl -X POST https://api.vscodercopilot.com.tr/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"device_info": {"name": "test-device", "platform": "vscode", "version": "1.0.0"}}'

# Test message broker (requires authentication token)
curl -X POST https://api.vscodercopilot.com.tr/api/v1/messages/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pairing_code": "ABC123", "sender": "vscode", "message": {"type": "test", "content": "Hello"}}'

# Get messages for a pairing code (requires authentication)
curl "https://api.vscodercopilot.com.tr/api/v1/messages/ABC123/mobile" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get message queue status
curl "https://api.vscodercopilot.com.tr/api/v1/messages/ABC123/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### VS Code Command Testing

Run these via `Ctrl+Shift+P` in VS Code:
- **VSCoder: Run Diagnostics** - Comprehensive system check
- **VSCoder: Test Discovery Service** - Discovery service integration test  
- **VSCoder: Test Copilot Bridge** - AI integration verification
- **VSCoder: Troubleshoot Mobile App Connection** - Mobile-specific diagnostics
- **VSCoder: Show Status** - Quick status overview
- **VSCoder: Show Pairing Code** - Display current pairing code
- **VSCoder: Check API Communication Status** - Discovery API communication status
- **VSCoder: Test API Connection** - Test Discovery API connectivity
- **VSCoder: Send Test Message to Mobile App** - Send test message through message broker

### Output Channels

Monitor these in VS Code Output panel:
- **VSCoder - Copilot Bridge**: AI integration and command execution
- **VSCoder - Discovery Service**: Discovery service communication and errors
- **VSCoder - Server**: Local server startup and connection logs
- **VSCoder - WebSocket**: Real-time communication debugging

## Production Deployment

### Default Configuration (Production Ready)

The extension connects to the **production VSCoder Discovery Service** by default:

```json
{
  "vscoder.api.url": \"https://api.vscodercopilot.com.tr\",
  "vscoder.port": 8080,
  "vscoder.autoStart": true,
  "vscoder.deviceToken": "dev-token"
}
```

### Production Benefits

- 🌐 **Cross-Network Pairing**: Connect devices across different networks and locations
- ☁️ **Cloud Discovery**: No local discovery service setup required
- 🔒 **Secure HTTPS**: End-to-end encrypted communication
- 📡 **Global Access**: Pair devices from anywhere with internet connectivity
- 🛡️ **Enterprise Security**: Rate limiting, authentication, and workspace isolation
- ⚡ **High Availability**: Production-grade infrastructure with monitoring

### Custom Discovery Service

For enterprise deployments, configure a custom discovery service:

```json
{
  "vscoder.api.url": "https://your-enterprise-discovery.com",
  "vscoder.deviceToken": "your-enterprise-token"
}
```

### Marketplace Installation

**Extension is production-ready** with marketplace compatibility:

- ✅ **All Dependencies Included**: Express, WebSocket, and other libraries packaged (v1.2.2+)
- ✅ **Modern VS Code API**: Compatible with VS Code ^1.74.0+
- ✅ **Proper Activation**: Extension activates automatically on workspace open
- ✅ **Error Handling**: Comprehensive diagnostics and recovery mechanisms
- ✅ **Security Compliant**: Workspace-scoped access and secure communication

## Development & Testing

### Development Setup

```bash
# Clone repository
git clone https://github.com/emirbaycan/vscoder-copilot.git
cd vscoder-copilot/extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes (development)
npm run watch

# Launch Extension Development Host
# Press F5 in VS Code
```

### Running Tests

```bash
# Compile and run tests
npm test

# Test specific components
npm run test:unit
npm run test:integration

# Coverage report
npm run test:coverage
```

### Extension Development

1. **Code Changes**: Edit TypeScript files in `src/`
2. **Compile**: Run `npm run compile` or use watch mode
3. **Test**: Press F5 to launch Extension Development Host
4. **Debug**: Use VS Code debugger with breakpoints
5. **Package**: Run `vsce package` to create .vsix file

### Development Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.13.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/node": "16.x",
    "@types/vscode": "^1.74.0",
    "@types/ws": "^8.5.4",
    "@types/mocha": "^10.0.6", 
    "@types/sinon": "^17.0.3",
    "mocha": "^10.2.0",
    "sinon": "^17.0.1",
    "typescript": "^4.9.4"
  }
}
```

### Available Scripts

```bash
npm run compile          # Compile TypeScript
npm run watch           # Watch for changes
npm test               # Run all tests
npm run test:unit      # Run unit tests
npm run test:integration # Run integration tests
npm run package        # Package extension (.vsix)
npm run publish        # Publish to marketplace
```

### API Testing

```bash
# Test VS Code extension server endpoints
npm run test:api

# Manual VS Code server testing (use discovered IP:port from pairing)
curl http://<vs-code-ip-port>/health
curl http://<vs-code-ip-port>/messages/status
curl "http://<vs-code-ip-port>/messages/acknowledge" \
  -X POST -H "Content-Type: application/json" \
  -d '{"clientId": "test", "sequenceNumber": 1}'

# Test Discovery API directly
curl https://api.vscodercopilot.com.tr/health
curl -X POST https://api.vscodercopilot.com.tr/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"device_info": {"name": "test", "platform": "vscode", "version": "1.0.0"}}'
```

### Debugging Tips

- **Output Channels**: Monitor "VSCoder - *" channels for detailed logs
- **DevTools**: Use "Developer: Toggle Developer Tools" for web debugging
- **Network**: Monitor network requests in DevTools Network tab
- **WebSocket**: Use WebSocket debugging tools for real-time communication
- **Copilot**: Check GitHub Copilot extension logs for AI integration issues

### Contributing Guidelines

1. **Code Style**: Follow TypeScript and ESLint conventions
2. **Testing**: Add tests for new features and bug fixes
3. **Documentation**: Update README and JSDoc comments
4. **Commit Messages**: Use conventional commit format
5. **Pull Requests**: Include description, testing steps, and breaking changes

## Next Steps

This extension works with the **VSCoder Copilot mobile app v1.0.1** which is now **live on Google Play Store**:

- 📱 **Download from Google Play**: Search "VSCoder Copilot" on Google Play Store or use package identifier `com.emirbaycan.vscodercopilot`
- 💬 **Complete Chat Interface** for natural language programming with GitHub Copilot
- 🔄 **Real-Time Sync** with VS Code workspace and automatic chat synchronization
- 🤖 **AI-Powered Development** with context-aware code generation and file management
- 🔗 **6-Digit Pairing Codes** for seamless cross-network device discovery and connection
- 📡 **Production Cloud Service** at `vscodercopilot.com.tr` for global device connectivity

### Live Production System

- **VSCoder Mobile App v1.0.1**: Live on Google Play Store with 1-day free trial and premium subscriptions
- **VSCoder Discovery API v2.0**: Production Go-based service at `api.vscodercopilot.com.tr`
- **VSCoder Extension v1.2.2**: This VS Code extension optimized for mobile app integration
- **Complete Ecosystem**: End-to-end mobile development workflow with live production deployment

## Contributing

1. Fork the repository at [https://github.com/emirbaycan/vscoder-copilot](https://github.com/emirbaycan/vscoder-copilot)
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request to the main repository

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💡 Real-World Use Cases

### 🚗 Daily Commute Development
*"I spend 45 minutes on the train each day. Now I use that time for code reviews and AI-assisted debugging."*

**Perfect for:**
- Reviewing pull requests on mobile
- Getting AI explanations of complex code
- Planning your coding tasks for the day
- Asking Copilot architecture questions

### ☕ Coffee Shop Coding
*"Working from a café but need to make a quick fix? No problem - my phone becomes my mobile development station."*

**Perfect for:**
- Emergency bug fixes from anywhere
- Quick feature implementations
- Responding to urgent code review comments
- Testing ideas with AI assistance

### 🏠 Couch Coding Sessions
*"Sometimes I get my best ideas while relaxing. Now I can prototype them immediately on my phone."*

**Perfect for:**
- Late-night coding inspiration
- Weekend project exploration  
- Learning new concepts with AI help
- Experimenting without setting up laptop

### 🏢 Meeting Room Quick Fixes
*"During code reviews, I can make suggested changes immediately on my phone while still in the meeting."*

**Perfect for:**
- Live code demonstrations
- Immediate bug fixes during discussions
- Quick prototyping of ideas
- Showing AI-generated solutions to team

### 🌍 Remote Work Flexibility
*"Whether I'm working from home, office, or anywhere else, my mobile development setup follows me."*

**Perfect for:**
- Seamless workspace switching
- Backup development environment
- Working across different networks
- Maintaining productivity anywhere

> **💭 The Bottom Line**: VSCoder turns dead time into productive coding time. Your smartphone becomes a powerful development tool that works anywhere you have internet!

## ❓ Frequently Asked Questions

### General Questions

**Q: Do I need to pay for anything?**
A: The VS Code extension is completely free! The mobile app offers a 1-day free trial, then requires a premium subscription (Monthly $9.99 or Annual $99.99) for unlimited AI features.

**Q: Does this work with my existing GitHub Copilot subscription?**
A: Yes! VSCoder uses your existing GitHub Copilot subscription. You just need Copilot installed and authenticated in VS Code.

**Q: Is my code safe and private?**
A: Absolutely. Your code travels directly between your devices through encrypted connections. We don't store or see your code - our service just helps your devices find each other.

**Q: What if I don't have the same WiFi network?**
A: That's the magic! VSCoder works across different networks. Your phone can be on mobile data while your computer is on office WiFi - no problem.

### Setup Questions

**Q: Why do I need a 6-digit code?**
A: The code is like a temporary password that helps your mobile app securely find your VS Code instance. Codes expire every 10 minutes for security.

**Q: Can I use this with multiple projects?**
A: Yes! The mobile app can save multiple workspace profiles, and you can quickly switch between different VS Code instances.

**Q: Do I need to configure firewall or network settings?**
A: Nope! VSCoder uses standard HTTPS connections that work through most networks and firewalls automatically.

### Usage Questions

**Q: Can multiple people connect to the same VS Code?**
A: Each pairing code works for one mobile device at a time. If you want team collaboration, each team member should use their own VS Code + mobile app.

**Q: What happens if my internet connection is spotty?**
A: VSCoder automatically reconnects when your connection comes back. Your conversations and progress are preserved.

**Q: Can I use this without GitHub Copilot?**
A: The mobile app can browse and edit files without Copilot, but you'll need an active Copilot subscription for AI features.

### Technical Questions

**Q: Which AI models does this support?**
A: All models available through your GitHub Copilot subscription - GPT-4o, Claude 3.5 Sonnet, and any future models GitHub adds.

**Q: Does this slow down VS Code?**
A: No, the extension runs efficiently in the background and doesn't impact VS Code performance.

**Q: Can I turn off the mobile connection?**
A: Yes! Use `VSCoder: Stop VSCoder Server` to disable mobile connectivity anytime.

### Troubleshooting Questions

**Q: My pairing code doesn't work - what's wrong?**
A: Codes expire every 10 minutes for security. Generate a fresh one with `VSCoder: Generate New Pairing Code`.

**Q: The mobile app says "connection failed" - help!**
A: Run `VSCoder: Run VSCoder Diagnostics` in VS Code for instant troubleshooting. Most issues are fixed automatically.

**Q: Can I use this behind a corporate firewall?**
A: VSCoder uses standard HTTPS connections that work through most corporate networks. If you have issues, ask your IT team to allow connections to `*.vscodercopilot.com.tr`.

## 🎉 Ready to Get Started?

### Step 1: Install This Extension
- **Open VS Code Extensions** (`Ctrl+Shift+X`)
- **Search**: "VSCoder Copilot"  
- **Click Install** and you're ready!

### Step 2: Download Mobile App
- **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=com.vscoder.mobile)
- **iOS**: [Apple App Store](https://apps.apple.com/app/vscoder-copilot/id123456789)

### Step 3: Start Coding on Mobile! 
- **Follow the 2-minute setup** guide above
- **Get your pairing code** from VS Code
- **Enter code in mobile app** 
- **Start AI-powered mobile development!**

---

## 🌟 What Developers Are Saying

*"Game changer for my daily commute. I get so much code review work done on the train now!"* - **Sarah, Full Stack Developer**

*"Perfect for emergency fixes. Last week I fixed a production bug from a restaurant using just my phone."* - **Mike, DevOps Engineer**  

*"The AI integration is seamless. It's like having GitHub Copilot in my pocket."* - **Alex, React Developer**

*"I love how it works across networks. Home WiFi, office network, mobile data - doesn't matter."* - **Jessica, Remote Developer**

---

## 🔗 Links & Resources

- **🌐 Official Website**: [vscodercopilot.com.tr](https://vscodercopilot.com.tr)
- **📱 Mobile App Store Pages**: Coming soon!
- **📧 Support**: support@vscodercopilot.com.tr
- **💬 Community**: [GitHub Discussions](https://github.com/emirbaycan/vscoder-copilot/discussions)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/emirbaycan/vscoder-copilot/issues)
- **📖 Documentation**: [Full Documentation](https://vscodercopilot.com.tr/docs)

---

## 📄 License & Contributing

This project is open source under the MIT License. We welcome contributions!

- **🍴 Fork the repo**: [github.com/emirbaycan/vscoder-copilot](https://github.com/emirbaycan/vscoder-copilot)
- **🐛 Report bugs**: Use GitHub Issues for bug reports
- **💡 Feature requests**: Share ideas in GitHub Discussions  
- **🤝 Contribute**: Pull requests are welcome!

---

<div align="center">

### 🚀 Transform Your Mobile Device Into an AI-Powered Coding Companion

**[Install VSCoder Copilot Extension Now](https://marketplace.visualstudio.com/items?itemName=vscoder.copilot)**

*Made with ❤️ for developers who code everywhere*

</div>
