# LIGNMA - AI Trading Assistant with OpenClaw Integration

LIGNMA is an intelligent trading assistant that combines beautiful UI with real AI capabilities through OpenClaw Gateway integration.

## Features

✨ **All Original Demo Features Preserved:**
- Beautiful chat interface with animations
- File library and attachment support
- Strategy cards and stock picker tables
- Multi-tab workspace management
- Agent system with different roles
- Market analysis and trading pages
- Schedule and usage tracking

🤖 **New Real AI Feature:**
- **OpenClaw Integration**: When you send a message, it connects to OpenClaw Gateway (ws://127.0.0.1:18789) and gets real AI responses
- **Streaming Support**: Responses appear in real-time as they're generated
- **Automatic Fallback**: If OpenClaw is unavailable, shows helpful error message

## Prerequisites

Before running LIGNMA, ensure you have:

1. **Node.js** (v16 or higher)
2. **OpenClaw Gateway** running on `ws://127.0.0.1:18789`

## Installation

```bash
cd LIGNMA
npm install
```

## Running the Application

### 1. Start OpenClaw Gateway (Required for AI features)

Make sure OpenClaw Gateway is running on port 18789. If you haven't set it up yet, refer to the OpenClaw documentation.

### 2. Start LIGNMA Development Server

```bash
npm run dev
```

The application will open at `http://localhost:5173` (or another port if 5173 is in use).

## Testing OpenClaw Integration

To verify that OpenClaw integration is working:

```bash
node test-openclaw.js
```

This will:
1. Check connection status
2. Send a test message to OpenClaw
3. Display the response
4. Report success or failure

## How It Works

When you send a message in the chat:

1. **Message Creation**: Your message is added to the chat history
2. **OpenClaw Connection**: The app connects to `ws://127.0.0.1:18789` via WebSocket
3. **Message Sending**: Your message is sent using the `chat.send` method
4. **Streaming Response**: As OpenClaw generates the response, it streams back in real-time
5. **Display**: The AI response appears in the chat with typing animation
6. **Completion**: Once complete, the task status updates to "completed"

If OpenClaw is not available, you'll see an error message with troubleshooting steps.

## Architecture

```
LIGNMA/
├── src/
│   ├── services/
│   │   └── openclawGateway.ts    # OpenClaw WebSocket service
│   ├── app/
│   │   ├── components/
│   │   │   └── MainContent.tsx   # Chat logic with OpenClaw integration
│   │   └── App.tsx               # Main application component
│   └── main.tsx                  # Entry point
├── test-openclaw.js              # Test script
└── package.json
```

## Configuration

### Environment Variables

LIGNMA uses environment variables for OpenClaw configuration. Create a `.env` file in the project root:

```env
VITE_OPENCLAW_WS_URL=ws://127.0.0.1:18789
VITE_OPENCLAW_GATEWAY_TOKEN=b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3
```

**Default Values:**
- **WebSocket URL**: `ws://127.0.0.1:18789`
- **Gateway Token**: `b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3`

A `.env.example` file is provided as a template. Copy it to `.env` and customize as needed.

**Note:** After changing `.env`, restart the development server for changes to take effect.

### Manual Configuration (Legacy)

OpenClaw Gateway URL can also be modified directly in `src/services/openclawGateway.ts`:

```typescript
const GATEWAY_WS_URL = import.meta.env.VITE_OPENCLAW_WS_URL || 'ws://127.0.0.1:18789'
const DEFAULT_GATEWAY_TOKEN = 'b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3'
```

The application will use environment variables first, then fall back to default values.

## Troubleshooting

### "无法连接到AI服务" Error

If you see this error message:

1. **Check OpenClaw Gateway**: Ensure it's running on port 18789
2. **Verify Port**: Make sure no firewall is blocking port 18789
3. **Test Connection**: Run `node test-openclaw.js` to diagnose
4. **Check Logs**: Look at browser console for detailed error messages

### WebSocket Connection Failed

- Verify OpenClaw Gateway is started
- Check if another service is using port 18789
- Ensure your network allows WebSocket connections

## Development

The project uses:
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Lucide React** for icons

## License

This project maintains the same license as the original front-end project.

## Credits

Built with ❤️ using the original front-end design, enhanced with OpenClaw AI integration.
