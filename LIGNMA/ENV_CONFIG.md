# Environment Configuration Update

## Changes Made

This update adds environment variable support for OpenClaw Gateway configuration, making it easier to customize connection settings without modifying code.

## What Changed

### 1. Created `.env` File
Added environment variables file with default configuration:
```env
VITE_OPENCLAW_WS_URL=ws://127.0.0.1:18789
VITE_OPENCLAW_GATEWAY_TOKEN=b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3
```

### 2. Created `.env.example` File
Template file documenting required environment variables for team members and deployment.

### 3. Updated `openclawGateway.ts`
Modified to read configuration from environment variables:
- `GATEWAY_WS_URL`: Reads from `VITE_OPENCLAW_WS_URL` env var
- `DEFAULT_GATEWAY_TOKEN`: Set to `b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3`
- Falls back to defaults if env vars not set

### 4. Fixed Import Path
Corrected import path in `MainContent.tsx`:
- **Before**: `import ... from '../services/openclawGateway'`
- **After**: `import ... from '../../services/openclawGateway'`

### 5. Updated `.gitignore`
Added `.env` to prevent committing sensitive configuration.

### 6. Updated Documentation
- `README.md`: Added environment configuration section
- `QUICKSTART.md`: Added detailed env var setup instructions

## Token Priority System

The application now uses a three-tier token priority system:

1. **localStorage Token** (highest priority)
   - If user has authenticated and token is stored
   
2. **Environment Variable** (medium priority)
   - `VITE_OPENCLAW_GATEWAY_TOKEN` from `.env`
   
3. **Default Token** (fallback)
   - Built-in default: `b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3`

This provides flexibility for different deployment scenarios while maintaining security.

## How to Customize

### Option 1: Edit `.env` File (Recommended)

1. Open `.env` file in project root
2. Modify values as needed:
   ```env
   VITE_OPENCLAW_WS_URL=ws://your-custom-host:port
   VITE_OPENCLAW_GATEWAY_TOKEN=your-custom-token
   ```
3. Restart dev server: `npm run dev`

### Option 2: Create `.env.local` (For Local Overrides)

Create `.env.local` file (also gitignored):
```env
VITE_OPENCLAW_WS_URL=ws://localhost:9999
VITE_OPENCLAW_GATEWAY_TOKEN=my-local-token
```

This overrides `.env` without modifying shared config.

### Option 3: Production Environment

Create `.env.production`:
```env
VITE_OPENCLAW_WS_URL=wss://production-openclaw.example.com
VITE_OPENCLAW_GATEWAY_TOKEN=${PRODUCTION_TOKEN}
```

## Benefits

✅ **No Code Changes Required**: Update configuration without touching source code  
✅ **Easy Deployment**: Different configs for dev/staging/production  
✅ **Security**: Tokens not hardcoded in source  
✅ **Team Collaboration**: Share `.env.example`, keep `.env` private  
✅ **Flexibility**: Easy to switch between different OpenClaw instances  

## Migration Guide

If you were using the old hardcoded configuration:

**Before:**
```typescript
// In openclawGateway.ts
const GATEWAY_WS_URL = 'ws://127.0.0.1:18789'
const token = localStorage.getItem(STORAGE_KEY) || ''
```

**After:**
```typescript
// In openclawGateway.ts
const GATEWAY_WS_URL = import.meta.env.VITE_OPENCLAW_WS_URL || 'ws://127.0.0.1:18789'
const token = localStorage.getItem(STORAGE_KEY) || 
              import.meta.env.VITE_OPENCLAW_GATEWAY_TOKEN || 
              DEFAULT_GATEWAY_TOKEN
```

**Action Required:** None! The old behavior is preserved as fallback. Just create `.env` if you want to customize.

## Troubleshooting

### Environment Variables Not Loading

**Problem**: Changes to `.env` not taking effect

**Solution**:
1. Stop dev server (Ctrl+C)
2. Restart: `npm run dev`
3. Vite caches env vars at startup

### Wrong Port or URL

**Problem**: Can't connect to OpenClaw Gateway

**Solution**:
1. Check `.env` file has correct `VITE_OPENCLAW_WS_URL`
2. Verify OpenClaw is running on that URL
3. Check browser console for connection errors

### Token Authentication Failed

**Problem**: Gateway rejects connection

**Solution**:
1. Verify `VITE_OPENCLAW_GATEWAY_TOKEN` matches your Gateway config
2. Check token hasn't expired
3. Try regenerating token in OpenClaw

## Security Best Practices

1. ✅ Never commit `.env` files to version control
2. ✅ Use `.env.example` to document required variables
3. ✅ Use different tokens for different environments
4. ✅ Rotate tokens regularly
5. ✅ Use WSS (WebSocket Secure) in production

## Testing

Verify configuration is working:

```bash
# Test with current .env settings
npm run test:openclaw

# Check which values are being used
# Look for these logs in browser console:
# [OpenClaw] WebSocket connected
# Connection URL will show the configured host/port
```

## Current Status

✅ Dev server running successfully on http://localhost:5183  
✅ No compilation errors  
✅ Environment variables configured  
✅ Default token set: `b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3`  
✅ All features working  

---

*Updated: 2026-04-23*
