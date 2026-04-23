# LIGNMA Testing Guide

This guide explains how to test the OpenClaw integration in LIGNMA.

## Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5178` (or another port if 5178 is in use).

### 2. Ensure OpenClaw Gateway is Running

Make sure OpenClaw Gateway is running on `ws://127.0.0.1:18789`.

## Manual Testing

### Test 1: Basic Chat Functionality

1. **Open the application** in your browser
2. **Look for the connection status indicator** in the top-right corner of chat panels:
   - 🟢 Green "AI 已连接" = Connected to OpenClaw
   - 🔴 Red "AI 未连接" = Not connected to OpenClaw

3. **Type a message** in the chat input
4. **Press Enter or click the send button**
5. **Observe the response**:
   - If connected: You'll see a real AI response from OpenClaw
   - If not connected: You'll see an error message with troubleshooting steps

### Test 2: Streaming Response

1. Send a longer message like: "Please write a detailed analysis of the current stock market trends"
2. Watch as the response streams in real-time (if OpenClaw is connected)
3. The typing indicator should appear while waiting

### Test 3: Multiple Conversations

1. Create multiple chat tabs by sending different messages
2. Verify each tab maintains its own conversation history
3. Check that OpenClaw responses are correctly associated with each conversation

## Automated Testing

### Option 1: Simple Connection Test

```bash
npm run test:openclaw
```

This tests:
- WebSocket connection establishment
- Sending a test message
- Receiving a response
- Reports success/failure

### Option 2: Full Integration Test (Requires Playwright)

First, install Playwright:

```bash
npm install -D playwright @playwright/test
npx playwright install chromium
```

Then run the integration test:

```bash
npm run test:integration
```

This automated test will:
1. Launch a headless browser
2. Navigate to the LIGNMA app
3. Type and send a test message
4. Wait for AI response
5. Verify the response is received
6. Take a screenshot of the result
7. Report pass/fail status

## Troubleshooting Tests

### Issue: "AI 未连接" (Not Connected)

**Check:**
1. Is OpenClaw Gateway running?
   ```bash
   # Check if port 18789 is in use
   netstat -ano | findstr :18789
   ```

2. Can you connect manually?
   ```bash
   npm run test:openclaw
   ```

3. Check browser console for errors:
   - Press F12 in browser
   - Look for WebSocket connection errors
   - Check for CORS issues

### Issue: Messages Send but No Response

**Possible causes:**
1. OpenClaw Gateway is running but not responding
2. Network timeout (60s limit)
3. Agent configuration issue

**Solutions:**
1. Restart OpenClaw Gateway
2. Check OpenClaw logs for errors
3. Verify agent 'main' exists and is configured

### Issue: Integration Test Fails

**Common failures:**

1. **"Page not found"**
   - Solution: Make sure `npm run dev` is running
   - Check the correct port in terminal output

2. **"Timeout waiting for response"**
   - Solution: Ensure OpenClaw Gateway is running
   - Increase timeout in test-integration.js if needed

3. **"Browser automation failed"**
   - Solution: Install Playwright browsers
   ```bash
   npx playwright install
   ```

## Visual Verification Checklist

When testing manually, verify:

- [ ] Connection status indicator shows correct state
- [ ] User messages appear immediately in chat
- [ ] Typing indicator appears while waiting for AI
- [ ] AI responses display correctly with proper formatting
- [ ] No console errors in browser developer tools
- [ ] Multiple conversations work independently
- [ ] File attachments don't break chat functionality
- [ ] All original demo features still work

## Performance Testing

To test performance with OpenClaw:

1. **Response Time**: Measure time from send to first token
2. **Streaming Smoothness**: Verify text appears smoothly
3. **Memory Usage**: Check browser memory with multiple conversations
4. **Connection Stability**: Leave app open for extended period

## Expected Behavior

### With OpenClaw Connected:
- ✅ Real AI responses
- ✅ Streaming text appearance
- ✅ Green connection indicator
- ✅ Task status updates correctly
- ✅ No error messages

### Without OpenClaw:
- ⚠️ Helpful error message displayed
- ⚠️ Red connection indicator
- ⚠️ Clear instructions to fix the issue
- ✅ All other features still work

## Debug Mode

To enable detailed logging:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs prefixed with:
   - `[OpenClaw]` - WebSocket connection logs
   - `[MainContent]` - Message handling logs
   - `[Gateway]` - Message processing logs

## Reporting Issues

If you encounter issues, please provide:

1. Browser console logs
2. Screenshot of the issue
3. Steps to reproduce
4. Whether OpenClaw Gateway is running
5. Output from `npm run test:openclaw`

## Success Criteria

The integration is working correctly if:

1. ✅ Connection indicator shows green when OpenClaw is running
2. ✅ Messages sent receive real AI responses
3. ✅ Streaming works smoothly
4. ✅ Error handling provides helpful messages
5. ✅ All original features remain functional
6. ✅ No console errors during normal operation
7. ✅ Automated tests pass

Happy testing! 🚀
