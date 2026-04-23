<template>
  <div class="chat-room">
    <!-- 顶栏 -->
    <div class="chat-header">
      <div class="header-left">
        <div class="room-icon">{{ chatMode === 'ceo' ? '💼' : chatMode === 'strategy' ? '📈' : chatMode === 'private' ? '💬' : '🤖' }}</div>
        <div>
          <div class="room-name">{{ chatMode === 'ceo' ? '与 CEO 对话' : chatMode === 'strategy' ? 'A股策略分析' : chatMode === 'private' ? `与 ${privateTarget?.name || '...'} 私聊` : 'AI 助手' }}</div>
          <div class="room-meta">
            <span class="room-badge" :class="chatMode">{{ chatMode === 'ceo' ? 'CEO Alex Chen' : chatMode === 'strategy' ? 'A股投资专家团队' : chatMode === 'private' ? privateTarget?.title : 'AI Assistant' }}</span>
            <span v-if="ceoTyping" class="typing-badge">正在回复...</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <!-- 私聊时：返回按钮 -->
        <button v-if="chatMode === 'private'" class="header-btn" @click="exitPrivateChat" title="退出私聊">
          <svg width="13" height="13" viewBox="0 0 24 18" fill="none">
            <path d="M9 14L4 9l5-5M4 9h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          退出私聊
        </button>
        <!-- 切换模式 -->
        <!-- <button v-else class="header-btn" @click="$emit('back-to-selection')" title="切换模式">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          切换模式
        </button> -->
        <!-- 滚动到底部 -->
        <button class="header-btn2" @click="scrollToBottom" title="滚动到底部">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 消息流 -->
    <div class="messages-scroll" ref="scrollRef">
      <div class="messages-inner">
        <!-- 顶部提示 -->
        <div class="messages-top-hint">
          <template v-if="chatMode === 'ceo'">
            <p>👔 <strong>CEO 统筹模式</strong> — 你直接和 CEO Alex Chen 对话</p>
            <p>CEO 会自动分析问题，分配任务给团队成员，右侧面板实时展示进度</p>
          </template>
          <template v-else-if="chatMode === 'strategy'">
            <p>📈 <strong>A股策略分析模式</strong> — 专业投资研究团队</p>
            <p>宏观分析、技术分析、基本面分析、行业研究、风险控制五位专家协同研判</p>
          </template>
          <template v-else-if="chatMode === 'private'">
            <p>💬 <strong>私聊模式</strong> — 你与 {{ privateTarget?.name }} 一对一对话</p>
            <p>{{ privateTarget?.title }}，直接回答你的专业问题</p>
          </template>
          <template v-else>
            <p>🤖 <strong>AI 助手</strong> — 直接与 AI 对话</p>
            <p>不经过 CEO 流程，AI 直接回复你的问题</p>
          </template>
        </div>

        <ChatMessage
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
        />

        <!-- 打字指示器 -->
        <div v-if="ceoTyping" class="ceo-typing">
          <!-- CEO 模式 -->
          <template v-if="chatMode === 'ceo'">
            <div class="typing-avatar">
              <span class="avatar-text">CEO</span>
              <span class="typing-emoji">👔</span>
            </div>
            <div class="typing-bubble">
              <span class="typing-name" style="color: #4f7ef8">Alex Chen</span>
              <span class="typing-dots">
                <span></span><span></span><span></span>
              </span>
            </div>
          </template>
          <!-- AI 助手模式 -->
          <template v-else-if="chatMode === 'normal'">
            <div class="typing-avatar" style="border-color: #4f46e5; background: linear-gradient(135deg, rgba(79,70,229,0.15), rgba(79,70,229,0.4));">
              <span class="avatar-text">AI</span>
              <span class="typing-emoji">🤖</span>
            </div>
            <div class="typing-bubble">
              <span class="typing-name" style="color: #4f46e5">AI 助手</span>
              <span class="typing-dots">
                <span></span><span></span><span></span>
              </span>
            </div>
          </template>
          <!-- 策略模式 -->
          <template v-else-if="chatMode === 'strategy'">
            <div class="typing-avatar" style="border-color: #e74c3c; background: linear-gradient(135deg, rgba(231,76,60,0.15), rgba(231,76,60,0.4));">
              <span class="avatar-text">团队</span>
              <span class="typing-emoji">📈</span>
            </div>
            <div class="typing-bubble">
              <span class="typing-name" style="color: #e74c3c">分析师团队</span>
              <span class="typing-dots">
                <span></span><span></span><span></span>
              </span>
            </div>
          </template>
          <!-- 私聊模式 -->
          <template v-else-if="chatMode === 'private'">
            <div class="typing-avatar" style="border-color: #10b981; background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.4));">
              <span class="avatar-text">{{ privateTarget?.name?.charAt(0) || '?' }}</span>
              <span class="typing-emoji">💬</span>
            </div>
            <div class="typing-bubble">
              <span class="typing-name" style="color: #10b981">{{ privateTarget?.name || '...' }}</span>
              <span class="typing-dots">
                <span></span><span></span><span></span>
              </span>
            </div>
          </template>
        </div>

        <!-- 底部锚点 -->
        <div ref="bottomRef" style="height:1px"></div>
      </div>
    </div>

    <!-- 输入区 -->
    <ChatInput
      :is-loading="isLoading"
      @send="handleSend"
      @stop="handleStop"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'

const props = defineProps({
  messages: Array,
  isLoading: Boolean,
  ceoTyping: Boolean,
  chatMode: {
    type: String,
    default: 'ceo'
  },
  selectedRoles: {
    type: Array,
    default: () => [
      'cto', 'cpo', 'coo', 'cmo', 'cfo', 'chro',
      'security', 'legal', 'data', 'ux', 'sales', 'customer', 'devops', 'qa', 'research'
    ]
  },
  privateTarget: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['send', 'exit-private', 'back-to-selection', 'stop'])

const scrollRef = ref(null)
const bottomRef = ref(null)

function backToSelection() {
  emit('back-to-selection')
}

watch(() => props.messages?.length, () => setTimeout(scrollToBottom, 100))
watch(() => props.ceoTyping, () => setTimeout(scrollToBottom, 100))
watch(() => props.chatMode, () => setTimeout(scrollToBottom, 150))
watch(() => props.messages, () => setTimeout(scrollToBottom, 100), { deep: true })

// 注意：初始滚动由 App.vue 统一控制，避免与 TaskPanel 不同步

function scrollToBottom() {
  if (!scrollRef.value) return
  scrollRef.value.scrollTo({
    top: scrollRef.value.scrollHeight,
    behavior: 'auto'
  })
}

// 暴露方法给父组件用于同步滚动
defineExpose({
  scrollToBottom
})

function handleSend(data) {
  emit('send', { ...data, selectedRoles: props.selectedRoles })
}

function exitPrivateChat() {
  emit('exit-private')
}

function handleStop() {
  emit('stop')
}
</script>

<style scoped>
.chat-room {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-chat);
}

/* Header */
.chat-header {
  height: var(--header-height);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--bg-sidebar);
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.room-icon { font-size: 24px; }
.room-name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.room-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.room-badge {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 8px;
  font-weight: 500;
}
.room-badge.ceo {
  background: rgba(79,126,248,0.15);
  color: var(--accent-blue);
}
.room-badge.normal {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.room-badge.strategy {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}
.typing-badge {
  font-size: 11px;
  color: var(--accent-yellow);
  background: rgba(240,192,64,0.12);
  padding: 2px 8px;
  border-radius: 10px;
}
.header-actions { display: flex; gap: 6px; }
.header-btn {
  min-width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0px 5px;
}
.header-btn:hover { border-color: var(--accent-blue); color: var(--accent-blue); }

.header-btn2 {
  min-width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;

}
.header-btn2:hover { border-color: var(--accent-blue); color: var(--accent-blue); }

/* Messages */
.messages-scroll {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
}
.messages-inner {
  padding: 20px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 820px;
  margin: 0 auto;
  width: 100%;
}
.messages-top-hint {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.8;
}
.messages-top-hint strong { color: var(--text-secondary); }

/* CEO Typing */
.ceo-typing {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
  animation: fadeInUp 0.2s ease;
}
.typing-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid #4f7ef8;
  background: linear-gradient(135deg, rgba(79,126,248,0.15), rgba(79,126,248,0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}
.typing-avatar .avatar-text { font-size: 8px; font-weight: 700; color: rgba(255,255,255,0.9); }
.typing-emoji { position: absolute; bottom: -3px; right: -3px; font-size: 12px; }
.typing-bubble {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 4px 16px 16px 16px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.typing-name { font-size: 13px; font-weight: 600; }
.typing-dots {
  display: flex;
  gap: 3px;
}
.typing-dots span {
  width: 5px;
  height: 5px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
</style>
