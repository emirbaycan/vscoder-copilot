# VSCoder Copilot Extension

A powerful VS Code extension that enables **AI-powered mobile development** through seamless GitHub Copilot integration. Transform your mobile device4. **📱 Mobile Pairing**: Enter 6-digit code in VSCoder mobile app from anywhere in the world
5. **✅ Auto Connect**: Connection profile created automatically with secure cross-network routing
6. **📎 Add Files to Chat**: Attach workspace files to AI conversation for context-aware analysis
7. **💬 Send Prompts**: Use natural language to describe coding tasks and requirements
8. **🤖 AI Generation**: GitHub Copilot generates code using full workspace context and attached files
9. **✅ Review & Apply**: Accept, reject, undo, or modify AI-generated changes with granular control
10. **🔄 Iterate & Refine**: Continue the conversation with persistent context and iterative improvementsn intelligent coding companion with natural language prompting, real-time file management, and cross-network connectivity.

## ✨ Key Features

- **🤖 Advanced AI Integration**: Full GitHub Copilot @workspace agent with intelligent code generation and context awareness
- **📱 Mobile-First Architecture**: Production-ready RESTful API and WebSocket support for native mobile apps
- **🔄 Real-Time Synchronization**: Live file synchronization and instant updates between VS Code and mobile devices
- **🎯 Multiple AI Agent Modes**: autonomous, interactive, code-review, refactor, optimize, debug with customizable workflows
- **📂 Complete Workspace Integration**: Full file tree browsing, content management, and file attachment to chat
- **✨ Granular Edit Control**: Accept/reject AI-generated code changes with precise control and undo/redo support
- **🔍 Multi-Model Support**: Dynamic AI model detection and switching (GPT-4o, Claude, O-series, and more)
- **🛡️ Enterprise Security**: Workspace-scoped file access, secure communication, and rate limiting
- **🔗 Zero-Config Pairing**: Automatic device discovery using 6-digit codes for seamless cross-network connections
- **📡 Cloud Discovery Service**: Production-grade Go-based discovery API for global device registration and connectivity
- **🚀 Production Ready**: Comprehensive error handling, diagnostics, and troubleshooting tools

## Commands

- `VSCoder: Start VSCoder Server` - Start the local development server (port 8080)
- `VSCoder: Stop VSCoder Server` - Stop the running server  
- `VSCoder: VSCoder Status` - Show current server status and diagnostics
- `VSCoder: Test VSCoder Copilot Bridge` - Test AI integration and model detection
- `VSCoder: Run VSCoder Diagnostics` - Comprehensive system and API diagnostics
- `VSCoder: VSCoder Copilot Diagnostics` - Detailed AI model and command analysis
- `VSCoder: VSCoder Quick Test` - Quick health check and status overview
- `VSCoder: Show Pairing Code` - Display 6-digit pairing code for device discovery
- `VSCoder: Generate New Pairing Code` - Generate a fresh pairing code
- `VSCoder: Test VSCoder Discovery Service` - Test connection to discovery service
- `VSCoder: Run Pending Commands` - Execute queued Copilot commands
- `VSCoder: Continue Iteration` - Continue current Copilot iteration
- `VSCoder: Auto Execute All Actions` - Run all pending actions automatically
- `VSCoder: Troubleshoot Mobile App Connection` - **NEW** - Comprehensive mobile connection diagnostics

## Configuration

- `vscoder.port`: Server port (default: 8080)
- `vscoder.autoStart`: Auto-start server on VS Code launch (default: true)
- `vscoder.discoveryApiUrl`: Discovery service URL (default: https://vscoder.sabitfirmalar.com.tr)
- `vscoder.deviceToken`: Device token for discovery service authentication (default: dev-token)
- `vscoder.pairingCode`: Current pairing code for device discovery (auto-generated)

## Quick Start

### Option 1: Automatic Pairing (Recommended)

1. **Install Dependencies**: `npm install`
2. **Compile Extension**: `npm run compile`  
3. **Launch Development**: Press F5 to open Extension Development Host
4. **Start Server**: Run "VSCoder: Start VSCoder Server" command
5. **Get Pairing Code**: Run "VSCoder: Show Pairing Code" command (or check status bar)
6. **Connect Mobile**: Use 6-digit code in VSCoder mobile app to auto-connect across networks
7. **Test Integration**: Run "VSCoder: Test VSCoder Copilot Bridge"

> **📡 Cloud Discovery**: The extension now uses the production discovery service at `vscoder.sabitfirmalar.com.tr` by default, enabling device pairing across different networks and locations.

### Option 2: Manual Setup (Local Network Only)

1. **Install Dependencies**: `npm install`
2. **Compile Extension**: `npm run compile`  
3. **Launch Development**: Press F5 to open Extension Development Host
4. **Start Server**: Run "VSCoder: Start VSCoder Server" command
5. **Test Integration**: Run "VSCoder: Test VSCoder Copilot Bridge"
6. **Check Logs**: View "VSCoder - Copilot Bridge" output channel
7. **Configure Mobile**: Manually set server IP/port in mobile app (local network only)

> **⚠️ Note**: Manual setup only works for devices on the same local network. For cross-network connections, use the automatic pairing option.

## AI Integration Requirements

- ✅ **GitHub Copilot Extension** installed and authenticated
- ✅ **Active Workspace** with project files
- ✅ **Model Access** to GPT-4o, Claude, or other supported models

## API Endpoints

### Core Endpoints
- `GET /health` - Server health check and status
- `GET /workspace` - Workspace folder information  
- `GET /files` - File tree with directory structure
- `GET /file/*` - Read file content from workspace
- `POST /file/*` - Update file content (auto-saves)

### AI/Copilot Endpoints  
- `POST /copilot` - Send prompts to GitHub Copilot @workspace agent
- `GET /copilot/status` - AI availability and supported models
- `GET /copilot/models` - Detect available AI models (GPT-4o, Claude, etc.)
- `POST /copilot/change-model` - Switch between AI models
- `POST /copilot/switch-model` - Cycle to next available model
- `POST /copilot/manage-models` - Open model management UI
- `POST /copilot/add-file-to-chat` - Add files to chat context for AI analysis

### Edit Control Endpoints
- `POST /copilot/accept-edits` - Accept AI-generated changes for current file
- `POST /copilot/reject-edits` - Reject AI-generated changes for current file  
- `POST /copilot/accept-all-edits` - Accept all pending AI changes
- `POST /copilot/reject-all-edits` - Reject all pending AI changes
- `POST /copilot/undo-edit` - Undo last edit operation
- `POST /copilot/redo-edit` - Redo last undone edit operation
- `POST /copilot/run-pending-commands` - Execute queued AI-generated commands
- `POST /copilot/continue-iteration` - Continue current AI iteration
- `POST /copilot/auto-execute` - Auto-execute all pending actions
- `GET /copilot/logs` - Get diagnostic information and command status

### Discovery & Pairing Endpoints
- `GET /discovery/status` - Discovery service registration status
- `GET /discovery/pairing-code` - Current 6-digit pairing code
- `POST /discovery/generate-code` - Generate new pairing code
- `GET /discovery/device-info` - Current device registration information

## Usage Examples

### Send AI Prompt
```bash
curl -X POST http://localhost:8080/copilot \
  -H "Content-Type: application/json" \
  -d '{
    "type": "agent",
    "prompt": "Create a React component for user authentication",
    "agentMode": "autonomous",
    "modelName": "gpt-4o"
  }'
```

### Get Available Models
```bash
curl http://localhost:8080/copilot/models
```

### Add File to Chat
```bash
curl -X POST http://localhost:8080/copilot/add-file-to-chat \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/components/Button.tsx"}'
```

### Accept AI Changes
```bash
curl -X POST http://localhost:8080/copilot/accept-all-edits
```

### Execute Pending Commands
```bash
curl -X POST http://localhost:8080/copilot/run-pending-commands
```

### Get Pairing Code
```bash
curl http://localhost:8080/discovery/pairing-code
```

### Check Discovery Status
```bash
curl http://localhost:8080/discovery/status
```

## WebSocket Events

Real-time communication for mobile apps:

- **Connection Events**: Server connection confirmations
- **File Changes**: Live file update notifications  
- **Copilot Responses**: Streaming AI responses and status updates

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
2. **📱 Connect Mobile**: Mobile app connects to `http://[local-ip]:8080` (same network required)
3. **🗂️ Browse Files**: Explore project structure via `/files` endpoint
4. **💬 Send Prompts**: Use natural language to describe coding tasks
5. **🤖 AI Generation**: GitHub Copilot generates code using workspace context
6. **✅ Review & Apply**: Accept or reject AI-generated changes
7. **🔄 Iterate**: Continue the conversation for refinements

> **⚠️ Network Limitation**: Manual connection requires devices to be on the same local network.

## Architecture

```
┌─────────────────┐    HTTPS/WS     ┌──────────────────┐    Discovery API    ┌─────────────────┐
│   Mobile App    │ ──────────────► │   VSCoder Ext    │ ──────────────────► │ Discovery Cloud │
│                 │                 │                  │                     │ vscoder.sabit   │
│ • File Browser  │                 │ • HTTP Server    │                     │ firmalar.com.tr │
│ • AI Chat UI    │                 │ • Copilot Bridge │                     │                 │
│ • Code Editor   │                 │ • File Manager   │                     │ • Device Reg    │
│ • Pairing UI    │ ◄─ 6-digit ───► │ • Discovery Intg │                     │ • Pairing Codes │
│ • Auto Connect  │    codes        │ • Status Display │                     │ • Cross-Network │
│ • Cross-Network │                 │ • Auto Register  │                     │ • PostgreSQL    │
└─────────────────┘                 └──────────────────┘                     └─────────────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │    VS Code       │
                                    │                  │
                                    │ • GitHub Copilot │
                                    │ • Workspace      │
                                    │ • File System    │
                                    └──────────────────┘
```

## Supported AI Models

The extension automatically detects available models through VS Code's Language Model API:

- **GPT Models**: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-5
- **Claude Models**: claude-3.5-sonnet, claude-3.7-sonnet  
- **O Models**: o3, o4-mini
- **Custom Models**: Any models available through GitHub Copilot

## 🔧 Mobile App Troubleshooting (Updated)

### New Troubleshooting Command
Use the built-in troubleshooter: **`Ctrl+Shift+P` → "Troubleshoot Mobile App Connection"**

This command provides:
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
| `📱 123456` | ✅ Ready | Pairing code available, registered | Click for options |
| `📱 123456 ⚠️` | ⚠️ Warning | Code available, not registered | Click to troubleshoot |
| `📱 VSCoder ❌` | ❌ Error | No pairing code available | Click to troubleshoot |
| `📱 VSCoder (Stopped)` | 🔌 Offline | Server not running | Click to start |

### Discovery Service vs VS Code Server

**Important:** Mobile apps should distinguish between these services:

**Discovery Service** (https://vscoder.sabitfirmalar.com.tr):
- 🔍 Device registration and discovery
- 🔐 Pairing code validation  
- 🛡️ Rate limiting for security (60 req/min)
- 🌐 Cross-network device finding

**VS Code Server** (Your local machine):
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

## Troubleshooting

### Common Issues

**Server Won't Start**
- Check if port 8080 is available
- Verify VS Code has workspace open
- Run diagnostics: "VSCoder: Run VSCoder Diagnostics"

**AI Not Responding**  
- Ensure GitHub Copilot extension is installed and authenticated
- Check model availability: `GET /copilot/models`
- View logs in "VSCoder - Copilot Bridge" output channel

**Pairing Code Issues**
- Pairing codes expire after 10 minutes for security
- Generate new code: "VSCoder: Generate New Pairing Code"
- Check discovery service status: `GET /discovery/status`
- Verify cloud discovery service connectivity: `https://vscoder.sabitfirmalar.com.tr/health`
- Test discovery integration: "VSCoder: Test VSCoder Discovery Service"

**Discovery Service Problems**
- Ensure internet connectivity for cloud discovery service
- Check discovery service configuration: `vscoder.discoveryApiUrl`
- Test cloud service: `curl https://vscoder.sabitfirmalar.com.tr/health`
- Check output channel: "VSCoder - Discovery Service"
- Verify firewall allows HTTPS connections to discovery service

**File Access Denied**
- Verify files are within workspace boundaries
- Check file permissions and workspace access

**Model Switching Issues**
- Model switching via API may open UI picker instead of programmatic switch
- This is a current VS Code limitation, use UI picker as fallback

### Debug Commands

```bash
# Check server health
curl http://localhost:8080/health

# Get diagnostic info  
curl http://localhost:8080/copilot/logs

# Test model detection
curl http://localhost:8080/copilot/models

# Check discovery service
curl http://localhost:8080/discovery/status

# Get current pairing code
curl http://localhost:8080/discovery/pairing-code

# Test cloud discovery service
curl https://vscoder.sabitfirmalar.com.tr/health

# Test discovery service integration
# (Run via VS Code command: "VSCoder: Test VSCoder Discovery Service")
```

## Production Deployment

The extension now connects to the **production VSCoder Discovery Service** at `https://vscoder.sabitfirmalar.com.tr` by default, enabling:

- 🌐 **Cross-Network Pairing**: Connect devices across different networks
- ☁️ **Cloud Discovery**: No need for local discovery service setup
- 🔒 **Secure HTTPS**: Encrypted communication with production service
- 📡 **Global Access**: Pair devices from anywhere with internet connectivity

### Custom Discovery Service

To use a custom discovery service, configure:

```json
{
  "vscoder.discoveryApiUrl": "https://your-custom-discovery.com",
  "vscoder.deviceToken": "your-custom-token"
}
```

## Next Steps

This extension is designed to work with a **React Native mobile app** that provides:

- 📱 **Native Mobile UI** for file browsing and code editing
- 💬 **Chat Interface** for natural language programming  
- 🔄 **Real-Time Sync** with VS Code workspace
- 🤖 **AI-Powered Development** with context-aware code generation
- 🔗 **Automatic Pairing** using 6-digit codes for seamless cross-network device discovery
- 📡 **Cloud Discovery Service** for connecting devices across different networks and locations

### Related Components

- **VSCoder Mobile App**: React Native/Expo app with cloud pairing UI
- **VSCoder Discovery Cloud**: Production Go-based API at `vscoder.sabitfirmalar.com.tr`
- **Complete System**: End-to-end mobile development workflow with global connectivity

## Contributing

1. Fork the repository at [https://github.com/emirbaycan/vscoder-copilot](https://github.com/emirbaycan/vscoder-copilot)
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request to the main repository

## License

This project is licensed under the MIT License - see the LICENSE file for details.
