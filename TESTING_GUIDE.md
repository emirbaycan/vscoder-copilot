# Testing the VSCoder Extension

## Method 1: Using F5 (Debug Mode)

1. **Open the extension folder** in VS Code: `c:\Code\mobile\vscoder\extension`
2. **Go to Run and Debug** (Ctrl+Shift+D)
3. **Select "Run Extension"** from the dropdown
4. **Click the green play button** or press F5
5. **New VS Code window opens** with your extension loaded

## Method 2: Using Command Line

```bash
# Navigate to extension directory
cd c:\Code\mobile\vscoder\extension

# Launch VS Code with extension development
code --extensionDevelopmentPath=. --new-window
```

## Method 3: Manual Installation (for testing)

```bash
# Package the extension
npm install -g vsce
vsce package

# Install the .vsix file in VS Code
code --install-extension vscoder-0.0.1.vsix
```

## Testing Steps Once Extension is Running:

### 1. Test Commands
Press `Ctrl+Shift+P` and run:
- **"Start VSCoder Server"** - Should start server on port 8080
- **"Test VSCoder Copilot Bridge"** - Should run Copilot tests
- **"VSCoder Status"** - Should show server status

### 2. Test API Endpoints
Once server is running, test in browser or with curl:

```bash
# Health check
curl http://localhost:8080/health

# Copilot status
curl http://localhost:8080/copilot/status

# Workspace info
curl http://localhost:8080/workspace
```

### 3. Check Output
- **View > Output**
- **Select "VSCoder Copilot Bridge"** from dropdown
- **Look for** log messages and test results

## Troubleshooting

If F5 doesn't work:
1. Check that `.vscode/launch.json` exists
2. Ensure TypeScript compiled successfully (`npm run compile`)
3. Try reloading VS Code window
4. Use Command Line method as alternative
