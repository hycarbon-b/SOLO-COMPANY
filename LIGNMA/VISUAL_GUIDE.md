# Visual Guide - What You'll See

This guide shows you exactly what to expect when using LIGNMA with OpenClaw integration.

## 1. Connection Status Indicators

### When OpenClaw is Connected ✅

In the chat panel header (top-right corner), you'll see:

```
┌─────────────────────────────────────────────┐
│ 今日市场行情分析              [🟢 AI 已连接] │
└─────────────────────────────────────────────┘
```

- **Color**: Green background (#dcfce7)
- **Text**: "AI 已连接" in dark green (#166534)
- **Icon**: Green dot indicator
- **Meaning**: Ready to send messages to OpenClaw

### When OpenClaw is Not Connected ❌

```
┌─────────────────────────────────────────────┐
│ 今日市场行情分析              [🔴 AI 未连接] │
└─────────────────────────────────────────────┘
```

- **Color**: Red background (#fee2e2)
- **Text**: "AI 未连接" in dark red (#991b1b)
- **Icon**: Red dot indicator
- **Meaning**: Cannot connect to OpenClaw, will show error on send

---

## 2. Sending a Message - Step by Step

### Step 1: Type Your Message

```
┌──────────────────────────────────────────────┐
│                                              │
│  User: 帮我分析一下今天的市场行情            │
│                                              │
├──────────────────────────────────────────────┤
│ [📁] [💾]                    [🎤] [⬆️ Send] │
└──────────────────────────────────────────────┘
```

### Step 2: Click Send or Press Enter

Message appears immediately in chat:

```
┌──────────────────────────────────────────────┐
│                                              │
│  ┌────────────────────────────────────┐     │
│  │ 帮我分析一下今天的市场行情          │  👤 │
│  └────────────────────────────────────┘     │
│                                              │
│  ┌────┐                                     │
│  │ AI │  ● ● ●  (typing animation)         │
│  └────┘                                     │
│                                              │
├──────────────────────────────────────────────┤
│ [📁] [💾]                    [🎤] [⬆️ Send] │
└──────────────────────────────────────────────┘
```

### Step 3a: If Connected - Real AI Response Streams In

```
┌──────────────────────────────────────────────┐
│                                              │
│  ┌────────────────────────────────────┐     │
│  │ 帮我分析一下今天的市场行情          │  👤 │
│  └────────────────────────────────────┘     │
│                                              │
│  ┌────┐                                     │
│  │ AI │  好的，我来为您分析今日市场行情...  │
│  └────┘                                     │
│                                              │
│         (text streams in real-time)         │
│                                              │
├──────────────────────────────────────────────┤
│ [📁] [💾]                    [🎤] [⬆️ Send] │
└──────────────────────────────────────────────┘
```

Final response:

```
┌──────────────────────────────────────────────┐
│                                              │
│  ┌────────────────────────────────────┐     │
│  │ 帮我分析一下今天的市场行情          │  👤 │
│  └────────────────────────────────────┘     │
│                                              │
│  ┌────┐                                     │
│  │ AI │  好的，我来为您分析今日市场行情。   │
│  └────┘  **市场概况：**                     │
│          - 上证指数：3,245.67 (+1.2%)      │
│          - 深证成指：11,234.89 (+0.8%)     │
│          - 创业板指：2,456.78 (+1.5%)      │
│                                              │
│          **行业表现：**                      │
│          1. 科技板块领涨，涨幅2.3%          │
│          2. 新能源板块表现强劲，涨幅1.8%    │
│          ...                                 │
│                                              │
├──────────────────────────────────────────────┤
│ [📁] [💾]                    [🎤] [⬆️ Send] │
└──────────────────────────────────────────────┘
```

### Step 3b: If Not Connected - Helpful Error Message

```
┌──────────────────────────────────────────────┐
│                                              │
│  ┌────────────────────────────────────┐     │
│  │ 帮我分析一下今天的市场行情          │  👤 │
│  └────────────────────────────────────┘     │
│                                              │
│  ┌────┐                                     │
│  │ AI │  抱歉，无法连接到AI服务。           │
│  └────┘  请确保OpenClaw Gateway正在运行    │
│          （ws://127.0.0.1:18789）。         │
│                                              │
│          错误信息：WebSocket connection      │
│          failed                              │
│                                              │
├──────────────────────────────────────────────┤
│ [📁] [💾]                    [🎤] [⬆️ Send] │
└──────────────────────────────────────────────┘
```

---

## 3. Browser Console Logs (For Developers)

When everything works correctly, you'll see:

```
[OpenClaw] WebSocket connected
[MainContent] Sending message to OpenClaw: 帮我分析一下今天的市场行情
[OpenClaw] Message sent: 帮我分析一下今天的市场行情
[Gateway Event] Type: agent Payload keys: ['stream', 'data']
[Gateway Agent] Stream: assistant text length: 156
[MainContent] Streaming update: 好的，我来为您分析今日市场行情
[MainContent] Received response from OpenClaw: 好的，我来为您分析今日市场行情。
                                             **市场概况：**...
```

When connection fails:

```
[OpenClaw] WebSocket Error: Event { type: 'error', ... }
[MainContent] Error calling OpenClaw: Error: WebSocket connection failed
```

---

## 4. Test Output Examples

### Running `npm run test:openclaw`

**Success:**
```
=== Testing OpenClaw Gateway Connection ===

Test 1: Initial connection status
Connected: false
Expected: false (not connected yet)

Test 2: Sending test message to OpenClaw...
Streaming update: Hello, this is a test

✓ Response received:
Test successful! Thank you for testing.

✓ Test PASSED - OpenClaw integration is working!
```

**Failure:**
```
=== Testing OpenClaw Gateway Connection ===

Test 2: Sending test message to OpenClaw...

✗ Test FAILED - Error: Error: WebSocket connection failed

Please ensure:
1. OpenClaw Gateway is running on ws://127.0.0.1:18789
2. The gateway is accessible and accepting connections
```

### Running `verify.ps1`

```
======================================
  LIGNMA Verification Script
======================================

✓ Services directory exists
✓ Components directory exists
✓ src/services/openclawGateway.ts exists
... (all 21 checks)

======================================
  Verification Summary
======================================
Passed:   21
Failed:   0
Warnings: 0

✓ All checks passed! LIGNMA is ready to use.
```

---

## 5. Task Status Updates

In the left sidebar, task statuses update automatically:

```
Sidebar Tasks:
┌─────────────────────────────────┐
│ 📝 今日市场行情分析              │
│    ⏱️ 2小时前    [✅ Completed] │
├─────────────────────────────────┤
│ 📝 量化交易策略优化              │
│    ⏱️ 1天前      [🔄 Working]   │
├─────────────────────────────────┤
│ 📝 持仓风险评估报告              │
│    ⏱️ 3天前      [❌ Error]     │
└─────────────────────────────────┘
```

Status flow when sending message:
1. **Idle** → No activity
2. **Working** → Message sent, waiting for response (typing indicator shows)
3. **Completed** → Response received successfully
4. **Error** → Failed to get response (shows error message)

---

## 6. Multiple Chat Tabs

You can have multiple conversations simultaneously:

```
Tab Bar:
[🏠 首页] [💬 今日市场行情] [💬 量化策略] [📊 Trading] [×]

Active Tab: 今日市场行情
┌──────────────────────────────────────────────┐
│ 今日市场行情分析              [🟢 AI 已连接] │
├──────────────────────────────────────────────┤
│                                              │
│  [Chat history for this specific task]      │
│                                              │
└──────────────────────────────────────────────┘
```

Each tab maintains:
- Separate conversation history
- Independent OpenClaw session
- Individual task status
- Unique message thread

---

## 7. Home Screen (No Active Chat)

```
┌──────────────────────────────────────────────┐
│                                              │
│         我能为你做什么？                      │
│                                              │
│  ┌────────────────────────────────────┐     │
│  │ 分配具体工作或提问任何问题          │     │
│  ├────────────────────────────────────┤     │
│  │ [📁] [💾]          [🎤] [⬆️ Send] │     │
│  └────────────────────────────────────┘     │
│                                              │
│  [🎯 智能选股] [📈 行情分析]                │
│  [📊 技术分析] [🤖 策略生成]                │
│                                              │
└──────────────────────────────────────────────┘
```

When you type and send here, it:
1. Creates a new chat tab automatically
2. Opens the conversation
3. Connects to OpenClaw
4. Shows the response

---

## 8. File Attachment UI

Files appear above the input box:

```
┌──────────────────────────────────────────────┐
│  📄 股票分析报告.pdf  2.3 MB        [×]     │
│  📊 交易数据.xlsx     1.2 MB        [×]     │
├──────────────────────────────────────────────┤
│  帮我分析这些文件中的交易数据...             │
├──────────────────────────────────────────────┤
│  [📁] [💾]          [🎤] [⬆️ Send]         │
└──────────────────────────────────────────────┘
```

Note: File attachments are preserved in UI but not currently sent to OpenClaw (future enhancement).

---

## 9. Responsive Design

### Desktop View (> 1024px)
- Full sidebar visible
- Wide chat area
- Right panel for additional info
- Split view with resizable panels

### Tablet View (768px - 1024px)
- Collapsible sidebar
- Medium chat area
- Right panel optional

### Mobile View (< 768px)
- Hamburger menu for sidebar
- Full-width chat
- Simplified layout
- Touch-friendly buttons

All views maintain:
- Connection status indicator
- Message styling
- Input functionality
- OpenClaw integration

---

## 10. Error States Visual Guide

### Network Error
```
┌────┐
│ AI │  网络连接失败，请检查您的网络设置。    │
└────┘
```

### Timeout (60s)
```
┌────┐
│ AI │  请求超时，请稍后重试。                │
└────┘  (Timeout after 60 seconds)
```

### Gateway Down
```
┌────┐
│ AI │  抱歉，无法连接到AI服务。              │
└────┘  请确保OpenClaw Gateway正在运行      
        （ws://127.0.0.1:18789）。
        
        错误信息：Connection refused
```

### Invalid Response
```
┌────┐
│ AI │  收到无效响应，请重试。                │
└────┘
```

---

## 11. Performance Indicators

### Fast Response (< 2s)
```
User message → [100ms] → Typing... → [1.5s] → Response complete
```

### Normal Response (2-10s)
```
User message → [100ms] → Typing... → [5s] → Response streaming... → Complete
```

### Slow Response (> 10s)
```
User message → [100ms] → Typing... → [15s] → Still typing... → [25s] → Complete
```

### Timeout (> 60s)
```
User message → [100ms] → Typing... → [60s] → Error: Request timeout
```

---

## 12. Success Indicators Checklist

When everything works perfectly, you should see:

- ✅ Green "AI 已连接" badge in chat header
- ✅ User messages appear instantly
- ✅ Typing indicator shows within 1 second
- ✅ AI response starts streaming within 2-5 seconds
- ✅ Text appears smoothly (not all at once)
- ✅ Task status changes: Working → Completed
- ✅ No console errors in browser DevTools
- ✅ Can send multiple messages consecutively
- ✅ Each message gets unique response
- ✅ Conversation history maintained

---

## Quick Reference Card

```
┌─────────────────────────────────────────────┐
│          LIGNMA Quick Reference             │
├─────────────────────────────────────────────┤
│ Connection Status:                          │
│   🟢 Green = Connected & Ready             │
│   🔴 Red = Not Connected                   │
│                                             │
│ Message Flow:                               │
│   Type → Send → Wait → Response            │
│                                             │
│ Keyboard Shortcuts:                         │
│   Enter = Send message                      │
│   Shift+Enter = New line                    │
│   Escape = Cancel editing                   │
│                                             │
│ Common Issues:                              │
│   Red badge? → Check OpenClaw Gateway      │
│   No response? → Check console logs        │
│   Timeout? → Try shorter message           │
│                                             │
│ Testing:                                    │
│   npm run test:openclaw                     │
│   powershell -File verify.ps1              │
│                                             │
│ Help:                                       │
│   F12 = Open DevTools                       │
│   Check Console tab for logs               │
│   Look for [OpenClaw] prefix               │
└─────────────────────────────────────────────┘
```

---

This visual guide helps you understand exactly what to expect at every step of using LIGNMA with OpenClaw integration!
