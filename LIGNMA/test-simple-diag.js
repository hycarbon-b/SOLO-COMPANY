/**
 * Ultra-simple OpenClaw Gateway Diagnostic
 * Just connects and logs EVERYTHING without any logic
 */

import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

// Load .env
try {
    const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
} catch (error) {
    console.log('Note: Could not load .env file');
}

const GATEWAY_URL = process.env.VITE_OPENCLAW_WS_URL || 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.VITE_OPENCLAW_GATEWAY_TOKEN || 'b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3';

console.log('\n🔍 OpenClaw Gateway Diagnostic Tool\n');
console.log('Gateway URL:', GATEWAY_URL);
console.log('Token:', GATEWAY_TOKEN.substring(0, 10) + '...');
console.log('\n' + '='.repeat(80) + '\n');

// Test 1: Without token
console.log('TEST 1: Connecting WITHOUT token in URL...');
const ws1 = new WebSocket(GATEWAY_URL);

ws1.on('open', () => {
    console.log('✓ Connected WITHOUT token - Gateway may not require auth\n');
});

ws1.on('message', (data) => {
    console.log('← Received:', data.toString());
});

ws1.on('error', (err) => {
    console.log('✗ Error:', err.message, '\n');
});

ws1.on('close', (code, reason) => {
    console.log(`⚠ Closed (code: ${code}, reason: ${reason || 'none'})\n`);
    
    // Test 2: With token
    setTimeout(() => {
        console.log('TEST 2: Connecting WITH token in URL...');
        const wsUrlWithToken = `${GATEWAY_URL}?token=${GATEWAY_TOKEN}`;
        const ws2 = new WebSocket(wsUrlWithToken);
        
        ws2.on('open', () => {
            console.log('✓ Connected WITH token\n');
            
            // Send connect request IMMEDIATELY (Gateway requires it as first message)
            setTimeout(() => {
                console.log('→ Sending connect request (REQUIRED as first message)...');
                const connectReq = {
                    type: 'req',
                    id: 'diag_connect',
                    method: 'connect',
                    params: {
                        minProtocol: 3,
                        maxProtocol: 3,
                        client: {
                            id: 'cli',  // MUST be "cli" (standard constant)
                            version: '1.0.0',
                            platform: 'web'
                        },
                        role: 'operator',
                        scopes: ['operator.read', 'operator.write'],
                        auth: { token: GATEWAY_TOKEN }
                    }
                };
                ws2.send(JSON.stringify(connectReq));
                console.log('Connect request sent\n');
            }, 500);
        });
        
        ws2.on('message', (data) => {
            console.log('← Received:', data.toString());
        });
        
        ws2.on('error', (err) => {
            console.log('✗ Error:', err.message, '\n');
        });
        
        ws2.on('close', (code, reason) => {
            console.log(`⚠ Closed (code: ${code}, reason: ${reason || 'none'})\n`);
            console.log('\nDiagnostic complete. Check the output above.');
            process.exit(0);
        });
    }, 2000);
});
