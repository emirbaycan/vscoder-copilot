# VSCoder Extension Test Script

## Test the REST API endpoints after starting the server

### 1. Health Check
```bash
curl http://localhost:8080/health
```

### 2. Get Workspace Info
```bash
curl http://localhost:8080/workspace
```

### 3. Check Copilot Status
```bash
curl http://localhost:8080/copilot/status
```

### 4. Get File Tree
```bash
curl http://localhost:8080/files
```

### 5. Test Copilot Agent Request (POST)
```bash
curl -X POST http://localhost:8080/copilot \
  -H "Content-Type: application/json" \
  -d '{
    "type": "agent",
    "prompt": "Create a simple calculator function",
    "agentMode": "autonomous",
    "modelName": "gpt-4"
  }'
```

### 6. Get Available Models
```bash
curl http://localhost:8080/copilot/models
```

### 7. Change Model
```bash
curl -X POST http://localhost:8080/copilot/change-model \
  -H "Content-Type: application/json" \
  -d '{
    "modelName": "gpt-4"
  }'
```

### 8. Switch to Next Model
```bash
curl -X POST http://localhost:8080/copilot/switch-model
```

### 9. Accept AI Edits
```bash
curl -X POST http://localhost:8080/copilot/accept-edits
```

### 10. Reject AI Edits
```bash
curl -X POST http://localhost:8080/copilot/reject-edits
```

### 11. Accept All Edits
```bash
curl -X POST http://localhost:8080/copilot/accept-all-edits
```

### 12. Reject All Edits
```bash
curl -X POST http://localhost:8080/copilot/reject-all-edits
```

## Expected Results:
- Health check should return `{"status": "ok", "copilotAvailable": false, "connectedClients": 0}`
- Workspace should show your current workspace folders
- Copilot status should show available commands
- File tree should show your project structure
