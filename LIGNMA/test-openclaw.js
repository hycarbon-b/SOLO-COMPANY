/**
 * Test script for OpenClaw Gateway integration
 * Run this to verify the connection works
 */

import { sendToOpenClaw, isOpenClawConnected } from './src/services/openclawGateway'

async function testOpenClaw() {
  console.log('=== Testing OpenClaw Gateway Connection ===\n')
  
  // Test 1: Check initial connection status
  console.log('Test 1: Initial connection status')
  console.log('Connected:', isOpenClawConnected())
  console.log('Expected: false (not connected yet)\n')
  
  // Test 2: Send a simple message
  console.log('Test 2: Sending test message to OpenClaw...')
  try {
    const response = await sendToOpenClaw('Hello, this is a test message. Please respond with "Test successful!"', (text, accumulated) => {
      console.log('Streaming update:', text.substring(0, 50))
    })
    
    console.log('\n✓ Response received:')
    console.log(response)
    console.log('\n✓ Test PASSED - OpenClaw integration is working!\n')
  } catch (error) {
    console.error('\n✗ Test FAILED - Error:', error)
    console.error('\nPlease ensure:')
    console.error('1. OpenClaw Gateway is running on ws://127.0.0.1:18789')
    console.error('2. The gateway is accessible and accepting connections\n')
  }
}

// Run the test
testOpenClaw().catch(console.error)
