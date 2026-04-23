<template>
  <div class="message-wrapper" :class="[`from-${message.from}`, { 'is-agent': message.from === 'agent' }]">
    <!-- 系统消息 -->
    <div v-if="message.from === 'system'" class="system-msg">
      <div class="system-line"></div>
      <div class="system-content" v-html="renderMarkdown(message.content)"></div>
      <div class="system-line"></div>
    </div>

    <!-- 用户消息 -->
    <div v-else-if="message.from === 'user'" class="user-msg">
      <div class="user-content">
        <div class="user-header">
          <span class="user-name">我</span>
          <span class="msg-time-inline">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="user-bubble">
          <p>{{ message.content }}</p>
        </div>
      </div>
      <div class="user-avatar">
        <span class="user-avatar-text">我</span>
      </div>
    </div>

    <!-- Agent 消息 -->
    <div v-else-if="message.from === 'agent'" class="agent-msg">
      <div class="agent-avatar" :style="{ background: `linear-gradient(135deg, ${message.role?.color}22, ${message.role?.color}55)`, borderColor: message.role?.color }">
        <span class="agent-avatar-text">{{ message.role?.avatar }}</span>
        <span class="agent-emoji">{{ message.role?.emoji }}</span>
      </div>
      <div class="agent-content">
        <div class="agent-header">
          <span class="agent-name" :style="{ color: message.role?.color }">{{ message.role?.name }}</span>
          <span class="agent-title">{{ message.role?.title }}</span>
          <!-- CEO 消息标签 -->
          <span v-if="message.isInitial" class="msg-tag initial">初步分析</span>
          <span v-if="message.isSummary" class="msg-tag summary">最终答复</span>
          <span class="msg-time-inline">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="agent-bubble" :class="{ summary: message.isSummary }">
          <div class="markdown-body" v-html="renderMarkdown(message.content)"></div>
        </div>
        <!-- 技能/工具调用信息 -->
        <div v-if="message.toolCalls && message.toolCalls.length > 0" class="tool-calls-section">
          <div class="tool-calls-header" @click="toggleToolExpand">
            <span class="tool-calls-tag">
              <span class="tool-icon">🔧</span>
              使用技能 ({{ message.toolCalls.length }})
            </span>
            <span class="tool-toggle">{{ isToolExpanded ? '▼' : '▶' }}</span>
          </div>
          <div v-if="isToolExpanded" class="tool-calls-list">
            <div
              v-for="(tool, index) in message.toolCalls"
              :key="tool.id || index"
              class="tool-call-item"
            >
              <div class="tool-call-summary">
                <span class="tool-name">{{ tool.function?.name || tool.name || '未知技能' }}</span>
                <span v-if="tool.status" class="tool-status" :class="tool.status">{{ tool.status }}</span>
              </div>
              <div class="tool-call-details">
                <div v-if="tool.function?.arguments || tool.arguments" class="tool-section">
                  <div class="tool-section-title">参数：</div>
                  <pre class="tool-code">{{ formatToolArgs(tool.function?.arguments || tool.arguments) }}</pre>
                </div>
                <div v-if="tool.result || tool.output" class="tool-section">
                  <div class="tool-section-title">结果：</div>
                  <pre class="tool-code">{{ formatToolResult(tool.result || tool.output) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  message: Object
})

// 工具调用展开状态
const isToolExpanded = ref(false)

function toggleToolExpand() {
  isToolExpanded.value = !isToolExpanded.value
}

function renderMarkdown(text) {
  if (!text) return ''
  try {
    return marked.parse(text, { breaks: true, gfm: true })
  } catch {
    return text
  }
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function formatToolArgs(args) {
  if (!args) return '{}'
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return args
    }
  }
  return JSON.stringify(args, null, 2)
}

function formatToolResult(result) {
  if (!result) return '无结果'
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return result.slice(0, 500) + (result.length > 500 ? '...' : '')
    }
  }
  return JSON.stringify(result, null, 2)
}
</script>

<style scoped>
.message-wrapper {
  animation: fadeInUp 0.3s ease;
  margin-bottom: 4px;
}

/* ===== System ===== */
.system-msg {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}
.system-line { flex: 1; height: 1px; background: var(--border); }
.system-content {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  max-width: 60%;
}
.system-content :deep(strong) { color: var(--text-accent); }

/* ===== User ===== */
.user-msg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0 4px;
  justify-content: flex-end;
}
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5 22%, #7c3aed 55%);
  border: 1.5px solid #6366f1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-avatar-text {
  font-size: 14px;
  font-weight: 600;
  color: white;
}
.user-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  max-width: 68%;
}
.user-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 4px;
}
.user-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-accent);
}
.user-bubble {
  background: var(--bg-message-user);
  border-radius: 16px 4px 16px 16px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.55;
  color: rgba(255,255,255,0.95);
  word-break: break-word;
}
.msg-time { font-size: 10px; color: var(--text-muted); }
.msg-time-inline { font-size: 10px; color: var(--text-muted); }

/* ===== Agent ===== */
.agent-msg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0 4px;
}
.agent-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-top: 2px;
}
.agent-avatar-text { font-size: 8px; font-weight: 700; color: rgba(255,255,255,0.9); }
.agent-emoji { position: absolute; bottom: -3px; right: -3px; font-size: 12px; }
.agent-content { flex: 1; min-width: 0; }
.agent-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}
.agent-name { font-size: 13px; font-weight: 700; }
.agent-title { font-size: 11px; color: var(--text-muted); }
.msg-tag {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 8px;
  font-weight: 500;
}
.msg-tag.initial { background: rgba(169,124,248,0.15); color: var(--accent-purple); }
.msg-tag.summary { background: rgba(76,175,125,0.15); color: var(--accent-green); }
.msg-time-inline { font-size: 10px; color: var(--text-muted); margin-left: auto; }
.agent-bubble {
  max-width: 80%;
  background: var(--bg-message-ai);
  border-radius: 4px 16px 16px 16px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  word-break: break-word;
}
.agent-bubble.summary {
  border-color: rgba(76,175,125,0.25);
  background: rgba(76,175,125,0.05);
}

/* ===== 技能/工具调用样式 ===== */
.tool-calls-section {
  margin-top: 8px;
  margin-left: 0;
  max-width: 80%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(79, 126, 248, 0.03);
  overflow: hidden;
}

.tool-calls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.tool-calls-header:hover {
  background: rgba(79, 126, 248, 0.05);
}

.tool-calls-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-blue);
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-icon {
  font-size: 12px;
}

.tool-toggle {
  font-size: 10px;
  color: var(--text-muted);
}

.tool-calls-list {
  padding: 0 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-call-item {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  overflow: hidden;
}

.tool-call-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.tool-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  font-family: 'SF Mono', Monaco, monospace;
  flex: 1;
}

.tool-status {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.tool-status.pending {
  background: rgba(240, 192, 64, 0.15);
  color: var(--accent-yellow);
}

.tool-status.completed {
  background: rgba(76, 175, 125, 0.15);
  color: var(--accent-green);
}

.tool-status.error {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
}

.tool-call-details {
  padding: 10px;
  border-top: 1px solid var(--border-light);
  background: rgba(0, 0, 0, 0.02);
}

.tool-section {
  margin-bottom: 10px;
}

.tool-section:last-child {
  margin-bottom: 0;
}

.tool-section-title {
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 4px;
  font-weight: 500;
}

.tool-code {
  font-size: 10px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px;
  margin: 0;
  overflow-x: auto;
  max-height: 120px;
  overflow-y: auto;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-secondary);
  line-height: 1.4;
}
</style>
