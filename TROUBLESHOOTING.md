# VSCoder Extension - Troubleshooting Guide

## Recent Updates (August 2025)

### New Diagnostic Commands
- `VSCoder: Copilot Diagnostics` - Detailed Copilot status check
- Enhanced error handling in Copilot bridge
- Multiple fallback methods for chat and completion requests

## GitHub Copilot Authentication Issues

If you're seeing errors like:
```
Error 2025-08-18T23:33:41.298Z: Unexpected error while trying to exchange token: fetch failed
Warning 2025-08-18T23:33:41.303Z: Warning: Sign in not successful.
```

### Quick Diagnosis
1. **Run diagnostics first**: Open Command Palette → `VSCoder: Copilot Diagnostics`
2. **Check the output** for detailed status and specific recommendations
3. **Follow the suggestions** provided in the diagnostics output

### Enhanced Authentication Check
The extension now tries multiple authentication methods:
- `github.copilot.status`
- `github.copilot.api.checkStatus`
- `github.copilot.accounts.checkStatus`

If all fail, it provides specific guidance on the authentication issue.

These are authentication issues with the GitHub Copilot Workspace extension, not your VSCoder extension.

### Quick Fix Steps:

1. **Sign out and back into GitHub Copilot:**
   - Open VS Code Command Palette (`Ctrl+Shift+P`)
   - Run `GitHub Copilot: Sign Out`
   - Wait a moment, then run `GitHub Copilot: Sign In`
   - Follow the authentication flow

2. **Check your GitHub Copilot subscription:**
   - Ensure you have an active GitHub Copilot subscription
   - Verify at: https://github.com/settings/copilot

3. **Update GitHub Copilot extensions:**
   - Go to Extensions view (`Ctrl+Shift+X`)
   - Search for "GitHub Copilot"
   - Update both "GitHub Copilot" and "GitHub Copilot Chat" extensions

4. **Run VSCoder Diagnostics:**
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run `VSCoder: Run VSCoder Diagnostics`
   - Check the output for detailed information

### Testing Your VSCoder Extension:

1. **Start the VSCoder server:**
   - Command Palette → `VSCoder: Start VSCoder Server`

2. **Test Copilot integration:**
   - Command Palette → `VSCoder: Test VSCoder Copilot Bridge`

3. **Check server status:**
   - Command Palette → `VSCoder: VSCoder Status`

### Common Issues and Solutions:

#### Issue: "GitHub Copilot extension not found"
**Solution:** Install the GitHub Copilot extension:
- Go to Extensions (`Ctrl+Shift+X`)
- Search for "GitHub Copilot"
- Install both "GitHub Copilot" and "GitHub Copilot Chat"

#### Issue: "Copilot authentication failed"
**Solution:**
1. Check if you have a valid GitHub Copilot subscription
2. Sign out and back into GitHub Copilot
3. Restart VS Code
4. Try authentication again

#### Issue: "No Copilot commands found"
**Solution:**
1. Ensure GitHub Copilot extension is installed and active
2. Update to latest version of GitHub Copilot
3. Restart VS Code

#### Issue: Network connectivity problems
**Solution:**
1. Check your internet connection
2. If behind a corporate firewall, ensure GitHub domains are allowed
3. Try using a different network

### VSCoder Extension Features:

Your VSCoder extension provides:
- **Local server** for mobile app integration
- **Copilot bridge** for remote Copilot access
- **WebSocket support** for real-time communication
- **File system access** for mobile development
- **Comprehensive testing** and diagnostics

### API Endpoints:

Once the server is running (default port 8080):
- `GET /health` - Check server and Copilot status
- `GET /workspace` - Get workspace information
- `GET /files` - Browse file system
- `POST /copilot` - Send Copilot requests
- `WebSocket /ws` - Real-time communication

### Getting Help:

If issues persist:
1. Run the diagnostics command and share the output
2. Check the VSCoder output channel for detailed logs
3. Verify your GitHub Copilot subscription status
4. Try restarting VS Code with a fresh workspace

### Log Files:

Useful log locations:
- VSCoder extension logs: Output → "VSCoder Copilot Bridge"
- Diagnostics: Output → "VSCoder Diagnostics" 
- VS Code logs: Help → "Open Logs Folder"
