# OpenClaw Connection Debugging Guide

This guide helps you diagnose and fix connection issues with OpenClaw Gateway.

## Protocol Overview

LIGNMA now uses the **correct OpenClaw WebSocket protocol** which includes:

1. **WebSocket Connection** to `ws://127.0.0.1:18789`
2. **Handshake Process**:
   - Gateway sends `connect.challenge` event
   - Client responds with `connect` request (JSON-RPC format)
   - Gateway replies with `hello-ok` response
3. **Message Sending**: Uses `agent.run` method with proper params
4. **Streaming Responses**: Received via `agent` events

## Common Issues & Solutions

### Issue 1: "WebSocket connection failed"

**Symptoms:**
- Red "AI 未连接" indicator
- Console shows: `[OpenClaw] WebSocket Error`

**Solutions:**

1. **Check if OpenClaw Gateway is running:**
   ```bash
   # Check if port 18789 is in use
   netstat -ano | findstr :18789
   
   # Or try to connect manually
   telnet 127.0.0.1 18789
   ```

2. **Start OpenClaw Gateway:**
   ```bash
   openclaw gateway
   # or
   openclaw gateway --port 18789 --token b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3
   ```

3. **Verify token matches:**
   - Check your `.env` file has correct token
   - Ensure Gateway was started with same token

### Issue 2: "Handshake timeout"

**Symptoms:**
- Console shows: `[OpenClaw] Handshake timeout - no challenge received`
- Connection opens but handshake fails

**Solutions:**

1. **Check Gateway version compatibility:**
   ```bash
   openclaw --version
   ```
   Should be version that supports protocol v3

2. **Check for firewall/antivirus blocking:**
   - Windows Firewall might block localhost connections
   - Add exception for Node.js/OpenClaw

3. **Try different bind address:**
   ```bash
   openclaw gateway --bind loopback
   # or
   openclaw gateway --bind lan
   ```

### Issue 3: "Connect failed" or authentication error

**Symptoms:**
- Console shows: `[OpenClaw] Connect failed`
- Error mentions authentication or token

**Solutions:**

1. **Verify token in .env:**
   ```env
   VITE_OPENCLAW_GATEWAY_TOKEN=b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3
   ```

2. **Restart Gateway with explicit token:**
   ```bash
   openclaw gateway --token b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3
   ```

3. **Check token hasn't expired:**
   - Regenerate token if needed
   - Update `.env` file
   - Restart dev server

### Issue 4: Messages send but no response

**Symptoms:**
- Green "AI 已连接" indicator
- Message appears in chat
- No AI response, eventually times out

**Solutions:**

1. **Check agent configuration:**
   ```bash
   openclaw agents list
   ```
   Ensure at least one agent is configured

2. **Verify model is available:**
   ```bash
   openclaw models list
   ```

3. **Check Gateway logs:**
   ```bash
   openclaw logs --follow
   ```
   Look for errors when message arrives

4. **Test with CLI:**
   ```bash
   openclaw message send --target webchat --message "test"
   ```

### Issue 5: Streaming not working

**Symptoms:**
- Response comes all at once instead of streaming
- Or streaming starts but doesn't complete

**Solutions:**

1. **Check stream parameter:**
   The code sends `stream: true` in params - verify this is supported

2. **Check browser console for event logs:**
   Look for `[Gateway Event]` messages

3. **Verify event format:**
   Events should have structure like:
   ```json
   {
     "type": "event",
     "event": "agent",
     "payload": {
       "text": "...",
       "status": "streaming|completed"
     }
   }
   ```

## Manual Testing Steps

### Step 1: Test WebSocket Connection

Open browser console (F12) and run:

```javascript
const ws = new WebSocket('ws://127.0.0.1:18789')
ws.onopen = () => console.log('✓ Connected')
ws.onerror = (e) => console.error('✗ Failed:', e)
ws.onclose = () => console.log('Closed')
```

Expected output: `✓ Connected`

### Step 2: Test Handshake Manually

```javascript
const ws = new WebSocket('ws://127.0.0.1:18789')

ws.onopen = () => {
  console.log('Connected, waiting for challenge...')
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
  
  if (data.event === 'connect.challenge') {
    console.log('Sending connect request...')
    ws.send(JSON.stringify({
      type: 'req',
      id: 'test_123',
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'test',
          version: '1.0.0',
          platform: 'web',
          mode: 'operator'
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        caps: [],
        commands: [],
        permissions: {},
        auth: { 
          token: 'b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3' 
        },
        locale: 'en-US',
        userAgent: 'Test/1.0.0'
      }
    }))
  }
  
  if (data.type === 'res' && data.ok) {
    console.log('✓ Handshake successful!')
  }
}

ws.onerror = (e) => console.error('Error:', e)
```

### Step 3: Test agent.run Method

After successful handshake:

```javascript
ws.send(JSON.stringify({
  type: 'req',
  id: 'msg_test',
  method: 'agent.run',
  params: {
    text: 'Hello, please respond with "Test OK"',
    stream: true,
    channel: 'webchat',
    target: 'default'
  }
}))

// Listen for responses
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Response:', data)
}
```

## Debug Checklist

Use this checklist to systematically debug connection issues:

- [ ] OpenClaw Gateway is installed
- [ ] Gateway is running (`openclaw gateway`)
- [ ] Port 18789 is accessible
- [ ] Token in `.env` matches Gateway token
- [ ] Browser can connect to WebSocket
- [ ] Handshake completes successfully
- [ ] Console shows `[OpenClaw] Handshake successful!`
- [ ] Green "AI 已连接" indicator visible
- [ ] Can send messages without errors
- [ ] Agent is configured and ready
- [ ] Model is available for inference
- [ ] Gateway logs show no errors

## Viewing Logs

### Browser Console Logs

Press F12 to open DevTools, then check Console tab for:

```
[OpenClaw] Connecting to: ws://127.0.0.1:18789
[OpenClaw] WebSocket opened, starting handshake...
[OpenClaw] Received during handshake: event connect.challenge
[OpenClaw] Received challenge, sending connect request...
[OpenClaw] Handshake successful! Protocol: 3
[MainContent] Sending message to OpenClaw: ...
[OpenClaw] Sending request: agent.run {...}
[Gateway Event] Type: agent Payload keys: [...]
[MainContent] Received response from OpenClaw: ...
```

### Gateway Logs

```bash
# View recent logs
openclaw logs --limit 100

# Follow live logs
openclaw logs --follow

# JSON format for easier parsing
openclaw logs --json
```

Look for:
- Connection accepted/rejected
- Authentication success/failure
- Message received
- Agent processing
- Errors or warnings

## Quick Diagnostic Commands

```bash
# 1. Check if Gateway is running
netstat -ano | findstr :18789

# 2. Test WebSocket connectivity
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" http://127.0.0.1:18789/

# 3. Check Gateway health
openclaw gateway health

# 4. List configured agents
openclaw agents list

# 5. List available models
openclaw models list

# 6. Test message sending via CLI
openclaw message send --target webchat --message "test"
```

## Configuration Reference

### Environment Variables (.env)

```env
# WebSocket URL (must match Gateway port)
VITE_OPENCLAW_WS_URL=ws://127.0.0.1:18789

# Authentication token (must match Gateway --token)
VITE_OPENCLAW_GATEWAY_TOKEN=b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3
```

### Gateway Startup Options

```bash
# Basic startup
openclaw gateway

# With custom port and token
openclaw gateway --port 18789 --token YOUR_TOKEN

# With specific bind address
openclaw gateway --bind loopback  # Only localhost
openclaw gateway --bind lan       # Local network

# Development mode with verbose logging
openclaw gateway --dev --verbose
```

## Common Error Messages

### "WebSocket connection failed"
→ Gateway not running or wrong port

### "Handshake timeout"
→ Gateway running but not responding to challenges

### "Connect failed: Authentication failed"
→ Token mismatch between client and Gateway

### "Method not found: agent.run"
→ Old Gateway version, update OpenClaw

### "No agent available"
→ Configure at least one agent in OpenClaw

### "Model not found"
→ Configure LLM model in OpenClaw settings

## Getting Help

If still having issues:

1. **Collect diagnostic info:**
   ```bash
   openclaw --version
   openclaw gateway health
   openclaw agents list
   openclaw models list
   ```

2. **Capture logs:**
   - Browser console logs (copy full output)
   - Gateway logs: `openclaw logs --limit 200 > gateway.log`

3. **Test with minimal setup:**
   - Stop all instances
   - Start fresh: `openclaw gateway --dev --verbose`
   - Try connecting again

4. **Check OpenClaw documentation:**
   - https://github.com/openclaw/openclaw
   - https://m.w3cschool.cn/openclawdocs/

## Success Indicators

You know everything is working when:

✅ Terminal shows: `openclaw gateway` running without errors  
✅ Browser console shows: `[OpenClaw] Handshake successful!`  
✅ UI shows: Green "AI 已连接" badge  
✅ Sending message shows: Typing indicator appears  
✅ Response streams: Text appears gradually  
✅ No red error messages in chat  

---

**Last Updated:** 2026-04-23  
**Protocol Version:** 3 (JSON-RPC over WebSocket)  
**Default Port:** 18789
