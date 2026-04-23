# LIGNMA - Quick Start Guide

Get up and running with LIGNMA in 5 minutes! 🚀

## What is LIGNMA?

LIGNMA is an AI-powered trading assistant that combines beautiful UI with real AI capabilities through OpenClaw integration. All your messages are sent to OpenClaw Gateway for intelligent responses.

## Prerequisites

- ✅ Node.js (v16 or higher)
- ✅ OpenClaw Gateway running (configured in `.env`)

## Installation & Setup

### Step 1: Install Dependencies

```bash
cd LIGNMA
npm install
```

### Step 2: Configure Environment Variables

The application uses environment variables for OpenClaw configuration. A default `.env` file is already provided with the following settings:

```env
VITE_OPENCLAW_WS_URL=ws://127.0.0.1:18789
VITE_OPENCLAW_GATEWAY_TOKEN=b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3
```

**To customize:**
1. Copy `.env.example` to `.env` (if not already present)
2. Update the values as needed:
   - `VITE_OPENCLAW_WS_URL`: Your OpenClaw Gateway WebSocket URL
   - `VITE_OPENCLAW_GATEWAY_TOKEN`: Your gateway authentication token

**Default Configuration:**
- **WebSocket URL**: `ws://127.0.0.1:18789`
- **Gateway Token**: `b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3`

### Step 3: Start OpenClaw Gateway

Make sure OpenClaw Gateway is running on the configured URL (default: `ws://127.0.0.1:18789`).

**Don't have OpenClaw?** Refer to the OpenClaw documentation for setup instructions.

### Step 4: Start LIGNMA

```bash
npm run dev
```

The app will open at `http://localhost:5173` (or another available port).

## First Use

### 1. Check Connection Status

When you open a chat, look at the top-right corner:
- 🟢 **Green "AI 已连接"** = Ready to use AI!
- 🔴 **Red "AI 未连接"** = OpenClaw not running (see troubleshooting below)

### 2. Send Your First Message

1. Click on "新工作" (New Work) in the sidebar
2. Type a message like: "帮我分析一下今天的市场行情"
3. Press Enter or click the send button
4. Watch as the AI responds in real-time!

### 3. Explore Features

- 💬 **Chat**: Real AI conversations with streaming responses
- 📁 **Files**: Manage your trading documents and strategies
- 📊 **Trading**: View and analyze trading data
- 🤖 **Agents**: Interact with specialized AI agents
- 📈 **Market**: Market analysis and insights
- 📅 **Schedule**: Plan your trading activities

## Troubleshooting

### "AI 未连接" (Not Connected)

**Problem**: Red indicator shows "AI 未连接"

**Solution**:
1. Verify OpenClaw Gateway is running on the configured URL
2. Check your `.env` file has correct settings
3. Run test: `npm run test:openclaw`
4. Check browser console (F12) for error details

**Common Issues:**
- Gateway not running → Start OpenClaw Gateway
- Wrong URL → Update `VITE_OPENCLAW_WS_URL` in `.env`
- Invalid token → Update `VITE_OPENCLAW_GATEWAY_TOKEN` in `.env`
- Port conflict → Change port in OpenClaw Gateway config

### Can't Access the App

**Problem**: Browser can't connect to localhost

**Solution**:
1. Check terminal for the actual port (may be 5174, 5175, etc.)
2. Make sure `npm run dev` completed successfully
3. Try the Network URL shown in terminal

### Messages Not Getting Responses

**Problem**: Messages send but no AI response

**Solution**:
1. Check if OpenClaw Gateway is responding
2. Look for error messages in the chat
3. Restart OpenClaw Gateway if needed
4. Verify token in `.env` matches your Gateway configuration
5. Check network connectivity to the configured WebSocket URL

### Environment Variable Issues

**Problem**: Changes to `.env` not taking effect

**Solution**:
1. Stop the dev server (Ctrl+C)
2. Restart with `npm run dev`
3. Vite caches env vars, so restart is required after changes

## Testing

Verify everything works:

```bash
# Test OpenClaw connection
npm run test:openclaw

# Full integration test (requires Playwright)
npm run test:integration
```

See [TESTING.md](./TESTING.md) for detailed testing instructions.

## Key Features

✨ **All Original Features Preserved:**
- Beautiful animated UI
- File attachments and library
- Strategy cards and stock pickers
- Multi-tab workspace
- Agent system
- Market analysis tools

🤖 **New AI Integration:**
- Real OpenClaw responses
- Streaming text output
- Connection status indicator
- Automatic error handling
- Fallback messages
- Environment-based configuration

## Configuration Reference

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_OPENCLAW_WS_URL` | WebSocket URL for OpenClaw Gateway | `ws://127.0.0.1:18789` | No* |
| `VITE_OPENCLAW_GATEWAY_TOKEN` | Authentication token for Gateway | `b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3` | No* |

*If not set, defaults will be used automatically.

### Token Priority

The application uses tokens in this order:
1. Token from localStorage (if user has authenticated)
2. Token from `VITE_OPENCLAW_GATEWAY_TOKEN` environment variable
3. Default built-in token

This allows flexible deployment scenarios while maintaining security.

## Next Steps

1. ✅ **Test the connection**: Send a test message
2. 📖 **Read the docs**: Check README.md for details
3. 🧪 **Run tests**: Verify with automated tests
4. 🎨 **Customize**: Modify styles and features as needed
5. 🚀 **Deploy**: Build for production when ready

## Need Help?

- 📄 **Documentation**: See README.md and TESTING.md
- 🐛 **Issues**: Check browser console for errors
- 🔍 **Debug**: Enable DevTools (F12) and check Console tab
- 📊 **Logs**: Look for [OpenClaw] prefixed messages

## Production Build

When ready to deploy:

```bash
npm run build
```

The built files will be in the `dist/` directory.

**Note for Production:**
- Create a `.env.production` file with production settings
- Never commit `.env` files to version control
- Use `.env.example` as a template for team members

---

**Ready to trade smarter with AI?** Start chatting now! 💬✨
