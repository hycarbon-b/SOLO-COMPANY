/**
 * Automated Test Script for LIGNMA OpenClaw Integration
 * This script tests the complete flow: send message -> receive response
 */

const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Starting LIGNMA OpenClaw Integration Test\n');
  
  let browser;
  let page;
  
  try {
    // Launch browser
    console.log('1️⃣  Launching browser...');
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    
    // Navigate to LIGNMA app
    console.log('2️⃣  Navigating to LIGNMA app (http://localhost:5178)...');
    await page.goto('http://localhost:5178', { waitUntil: 'networkidle' });
    console.log('   ✓ Page loaded successfully\n');
    
    // Check if page title is correct
    const title = await page.title();
    console.log(`3️⃣  Page title: "${title}"\n`);
    
    // Wait for the app to initialize
    console.log('4️⃣  Waiting for app initialization...');
    await page.waitForSelector('input[placeholder*="分配具体工作"]', { timeout: 10000 });
    console.log('   ✓ App is ready\n');
    
    // Type a test message
    const testMessage = 'Hello, this is an automated test. Please respond with "Test successful!"';
    console.log(`5️⃣  Typing test message: "${testMessage.substring(0, 50)}..."`);
    await page.fill('input[placeholder*="分配具体工作"]', testMessage);
    console.log('   ✓ Message typed\n');
    
    // Click send button
    console.log('6️⃣  Sending message...');
    await page.click('button[disabled=false] svg[data-lucide="arrow-up"]');
    console.log('   ✓ Message sent\n');
    
    // Wait for user message to appear
    console.log('7️⃣  Waiting for user message to appear in chat...');
    await page.waitForSelector(`div:text("${testMessage}")`, { timeout: 5000 });
    console.log('   ✓ User message visible\n');
    
    // Wait for AI typing indicator
    console.log('8️⃣  Waiting for AI to start typing...');
    const typingIndicator = await page.waitForSelector('.animate-bounce', { timeout: 10000 }).catch(() => null);
    if (typingIndicator) {
      console.log('   ✓ AI is typing...\n');
    } else {
      console.log('   ⚠ Typing indicator not found (may have completed too fast)\n');
    }
    
    // Wait for AI response (with longer timeout for real AI)
    console.log('9️⃣  Waiting for AI response (timeout: 60s)...');
    const aiResponse = await page.waitForSelector('div.bg-white.rounded-2xl p.text-gray-900', { 
      timeout: 60000 
    }).catch(() => null);
    
    if (aiResponse) {
      const responseText = await aiResponse.textContent();
      console.log('   ✓ AI response received!');
      console.log(`   Response preview: "${responseText.substring(0, 100)}..."\n`);
      
      // Check if response contains expected content or is not an error message
      if (!responseText.includes('无法连接到AI服务') && !responseText.includes('Error')) {
        console.log('✅ TEST PASSED!');
        console.log('   - Message was sent successfully');
        console.log('   - AI response was received');
        console.log('   - No error messages detected\n');
      } else {
        console.log('⚠️  TEST PARTIAL SUCCESS');
        console.log('   - Message was sent');
        console.log('   - But received error message (OpenClaw may not be running)');
        console.log(`   Error: ${responseText.substring(0, 100)}\n`);
      }
    } else {
      console.log('❌ TEST FAILED');
      console.log('   - No AI response received within timeout period');
      console.log('   - Possible issues:');
      console.log('     • OpenClaw Gateway is not running on ws://127.0.0.1:18789');
      console.log('     • Network connectivity issues');
      console.log('     • WebSocket connection failed\n');
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-result.png', fullPage: true });
    console.log('📸 Screenshot saved to test-result.png\n');
    
  } catch (error) {
    console.error('❌ TEST FAILED WITH ERROR:');
    console.error(error.message);
    console.error('\nPossible causes:');
    console.error('  1. LIGNMA dev server is not running (run: npm run dev)');
    console.error('  2. OpenClaw Gateway is not running on port 18789');
    console.error('  3. Browser automation failed');
    
    // Take error screenshot if possible
    if (page) {
      try {
        await page.screenshot({ path: 'test-error.png', fullPage: true });
        console.log('\n📸 Error screenshot saved to test-error.png');
      } catch (e) {
        // Ignore screenshot errors
      }
    }
  } finally {
    // Close browser
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed\n');
    }
  }
})();
