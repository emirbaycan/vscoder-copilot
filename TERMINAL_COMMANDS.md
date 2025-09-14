# Terminal Management Commands

This document describes the terminal management commands implemented in the VSCoder extension.

## Basic Terminal Operations

### `terminal_list_sessions`
Lists all active terminal sessions.

**Request:**
```json
{
  "command": "terminal_list_sessions"
}
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "terminal-123456789",
      "name": "Terminal 1",
      "cwd": "/path/to/workspace",
      "isActive": true,
      "lastActivity": "2025-09-12T10:30:00Z",
      "createdAt": "2025-09-12T10:00:00Z"
    }
  ]
}
```

### `terminal_create_session`
Creates a new terminal session.

**Request:**
```json
{
  "command": "terminal_create_session",
  "data": {
    "name": "My Terminal",
    "cwd": "/path/to/working/directory"
  }
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "terminal-123456789",
    "name": "My Terminal",
    "cwd": "/path/to/working/directory",
    "isActive": true,
    "lastActivity": "2025-09-12T10:30:00Z",
    "createdAt": "2025-09-12T10:30:00Z"
  }
}
```

### `terminal_execute_command`
Executes a command in a specific terminal session.

**Request:**
```json
{
  "command": "terminal_execute_command",
  "data": {
    "sessionId": "terminal-123456789",
    "command": "npm start"
  }
}
```

**Response:**
```json
{
  "success": true,
  "commandId": "cmd-123456789",
  "output": "Command sent to terminal",
  "simulatedOutput": "npm start\nExecuting package manager command...",
  "sessionId": "terminal-123456789"
}
```

### `terminal_get_history`
Gets the command history for a terminal session.

**Request:**
```json
{
  "command": "terminal_get_history",
  "data": {
    "sessionId": "terminal-123456789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "cmd-123456789",
      "sessionId": "terminal-123456789",
      "command": "ls -la",
      "output": "total 24\ndrwxr-xr-x  6 user user 4096...",
      "timestamp": "2025-09-12T10:30:00Z",
      "exitCode": 0,
      "isRunning": false
    }
  ]
}
```

### `terminal_kill_session`
Terminates a terminal session.

**Request:**
```json
{
  "command": "terminal_kill_session",
  "data": {
    "sessionId": "terminal-123456789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Terminal session terminal-123456789 terminated",
  "sessionId": "terminal-123456789"
}
```

## Advanced Terminal Operations

### `terminal_focus_session`
Focuses a specific terminal session in VS Code.

**Request:**
```json
{
  "command": "terminal_focus_session",
  "data": {
    "sessionId": "terminal-123456789"
  }
}
```

### `terminal_clear_session`
Clears the terminal output for a session.

**Request:**
```json
{
  "command": "terminal_clear_session",
  "data": {
    "sessionId": "terminal-123456789"
  }
}
```

### `terminal_copy_last_command`
Copies the last executed command to clipboard.

**Request:**
```json
{
  "command": "terminal_copy_last_command",
  "data": {
    "sessionId": "terminal-123456789"
  }
}
```

### `terminal_copy_last_output`
Copies the last command output to clipboard.

**Request:**
```json
{
  "command": "terminal_copy_last_output",
  "data": {
    "sessionId": "terminal-123456789"
  }
}
```

### `terminal_rename_session`
Renames a terminal session.

**Request:**
```json
{
  "command": "terminal_rename_session",
  "data": {
    "sessionId": "terminal-123456789",
    "newName": "New Terminal Name"
  }
}
```

### `terminal_split_session`
Splits a terminal session (creates a new terminal pane).

**Request:**
```json
{
  "command": "terminal_split_session",
  "data": {
    "sessionId": "terminal-123456789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Terminal session terminal-123456789 split successfully",
  "originalSessionId": "terminal-123456789",
  "splitSessionId": "terminal-split-987654321"
}
```

## VS Code Terminal Commands Used

The implementation leverages these native VS Code terminal commands:

- `workbench.action.terminal.new` - Create new terminal
- `workbench.action.terminal.focus` - Focus terminal
- `workbench.action.terminal.clear` - Clear terminal
- `workbench.action.terminal.copyLastCommand` - Copy last command
- `workbench.action.terminal.copyLastCommandOutput` - Copy last output
- `workbench.action.terminal.renameWithArg` - Rename terminal
- `workbench.action.terminal.split` - Split terminal
- `workbench.action.terminal.kill` - Kill terminal

## Features

1. **Session Management**: Track multiple terminal sessions with unique IDs
2. **Command History**: Store and retrieve command history for each session
3. **Real-time Updates**: Commands are executed in real VS Code terminals
4. **Smart Output Simulation**: Provides realistic output for common commands
5. **VS Code Integration**: Uses native VS Code terminal commands for better integration
6. **Clipboard Operations**: Copy commands and outputs to system clipboard
7. **Session State**: Track active sessions, working directories, and last activity

## Mobile App Integration

The mobile app provides a comprehensive terminal interface with:

- **Tab-based Session Management**: Switch between multiple terminals
- **Horizontal Scrolling**: Handle 10+ terminals gracefully
- **Individual Tab Close Buttons**: Close specific terminals
- **Action Buttons**: Clear, Kill, Copy Command, Copy Output
- **Real-time Command Execution**: Send commands to VS Code terminals
- **Mock Data Support**: Works offline with realistic mock terminal data
