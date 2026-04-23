# 🔧 Connection Fix - Token Authentication

## Problem Identified

OpenClaw Gateway was rejecting connections with error:
```
unauthorized: gateway token missing (set gateway.remote.token to match gateway.auth.token)
```

## Root Cause

The token was being sent **only in the connect request**, but OpenClaw Gateway requires the token to be passed as a **query parameter in the WebSocket URL** during the initial connection.

## Solution Applied

### Before (Incorrect):
```typescript
// Token only in handshake, not in URL
ws = new WebSocket(GATEWAY_WS_URL)  // ❌ Missing token
```

### After (Correct):
```typescript
// Token included in WebSocket URL as query parameter
const wsUrlWithToken = `${GATEWAY_WS_URL}?token=${token}`
ws = new WebSocket(wsUrlWithToken)  // ✅ Token in URL
```

## Files Modified

1. **`src/services/openclawGateway.ts`**
   - Updated `getConnection()` function
   - Added token as query parameter to WebSocket URL
   - Masked token in logs for security

2. **`test-connection.html`**
   - Updated test page to use correct token passing method

## How It Works Now

### Connection Flow:

1. **WebSocket Connection** (with token in URL):
   ```
   ws://127.0.0.1:18789?token=b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3
   ```

2. **Gateway validates token** from URL parameter

3. **Handshake proceeds**:
   - Gateway sends `connect.challenge`
   - Client responds with `connect` request (also includes token in auth object)
   - Gateway confirms with `hello-ok`

4. **Ready to send messages**

## Testing

### Option 1: Use the Test Page

1. Open `test-connection.html` in browser
2. Click "Test Connection"
3. Should see: `✓ WebSocket connection established!`
4. Click "Test Handshake"
5. Should see: `✓ Handshake successful!`
6. Click "Send Test Message"
7. Should receive AI response

### Option 2: Use the LIGNMA App

1. Dev server is running at http://localhost:5183/
2. Open the app in browser
3. Check browser console (F12)
4. Look for these success indicators:
   ```
   [OpenClaw] Connecting to: ws://127.0.0.1:18789?token=***
   [OpenClaw] WebSocket opened, starting handshake...
   [OpenClaw] Received during handshake: event connect.challenge
   [OpenClaw] Handshake successful! Protocol: 3
   ```

5. Send a message in chat
6. Should receive AI response

## Configuration

Your `.env` file should have:
```env
VITE_OPENCLAW_WS_URL=ws://127.0.0.1:18789
VITE_OPENCLAW_GATEWAY_TOKEN=b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3
```

**Important:** Make sure the token matches what your OpenClaw Gateway expects!

## Common Issues

### Still getting "token missing" error?

1. **Check token value** - Ensure it matches your Gateway's configured token
2. **Restart dev server** - Environment variables are cached:
   ```bash
   # Stop dev server (Ctrl+C)
   npm run dev  # Restart
   ```
3. **Check Gateway logs** - See what token it expects
4. **Verify Gateway is running** on port 18789

### Connection succeeds but handshake fails?

1. Check protocol version compatibility
2. Verify Gateway supports JSON-RPC over WebSocket
3. Check browser console for detailed error messages

## Security Note

The token is now visible in:
- Network tab (WebSocket upgrade request)
- Console logs (masked as `***`)

This is expected behavior for local development. For production:
- Use WSS (WebSocket Secure) instead of WS
- Consider additional authentication layers
- Never commit `.env` files to version control

---

**Status**: ✅ Fixed  
**Date**: 2026-04-23  
**Issue**: Token not passed in WebSocket URL  
**Solution**: Added token as query parameter
