<template>
  <div class="chat-input-area">
    <!-- 输入行 -->
    <div class="input-row">
      <div class="textarea-wrapper">
        <textarea
          ref="inputRef"
          v-model="inputText"
          :placeholder="placeholder"
          :disabled="isLoading"
          rows="1"
          @keydown.enter.exact.prevent="handleSend"
          @keydown.enter.shift.exact="handleNewline"
          @input="autoResize"
          @paste="nextTick(autoResize)"
        ></textarea>
      </div>

      <!-- 停止按钮 -->
      <button v-if="isLoading" class="stop-btn" @click="handleStop" title="停止生成">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
        </svg>
      </button>

      <!-- 发送按钮 -->
      <button
        v-else
        class="send-btn"
        :class="{ active: inputText.trim() }"
        :disabled="!inputText.trim()"
        @click="handleSend"
        title="发送 (Enter)"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- 底部工具栏 -->
    <div class="input-toolbar">
      <!-- 左侧工具 -->
      <div class="toolbar-left">
        <!-- 附件 -->
        <button
          class="toolbar-btn"
          :class="{ active: inputMode === 'attachment' }"
          @click="setMode('attachment')"
          title="附件"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>附件</span>
        </button>

        <!-- 文字（当前默认） -->
        <button
          class="toolbar-btn"
          :class="{ active: inputMode === 'text' }"
          @click="setMode('text')"
          title="文字输入"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <span>文字</span>
        </button>

        <!-- 语音 -->
        <button
          class="toolbar-btn"
          :class="{ active: inputMode === 'voice' }"
          @click="setMode('voice')"
          title="语音输入"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" stroke-width="1.6"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <span>语音</span>
        </button>
      </div>

      <!-- 右侧提示 -->
      <div class="toolbar-right">
        <span class="hint-text">Enter 发送 · Shift+Enter 换行</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  isLoading: Boolean,
  chatMode: { type: String, default: 'ceo' }
})

const emit = defineEmits(['send', 'stop'])

const inputRef = ref(null)
const inputText = ref('')
const inputMode = ref('text') // 'text' | 'attachment' | 'voice'

const placeholder = computed(() => {
  if (props.chatMode === 'ceo') return '跟 CEO 说点什么...'
  if (props.chatMode === 'strategy') return '输入你的股票或投资问题...'
  if (props.chatMode === 'private') return '私聊中...'
  return '有什么可以帮你的？'
})

function setMode(mode) {
  inputMode.value = mode
  if (mode === 'text') nextTick(() => inputRef.value?.focus())
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function handleSend() {
  if (!inputText.value.trim() || props.isLoading) return
  emit('send', { content: inputText.value.trim() })
  inputText.value = ''
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.style.height = 'auto'
      inputRef.value.focus()
    }
  })
}

function handleNewline() {}

function handleStop() {
  emit('stop')
}
</script>

<style scoped>
.chat-input-area {
  background: var(--bg-input);
  border-top: 1px solid var(--border);
  padding: 10px 14px 6px;
  position: relative;
  flex-shrink: 0;
}

/* Input Row */
.input-row {
  display: flex;
  align-items: center;
  /* align-items: flex-end; */
  gap: 8px;
}
.textarea-wrapper { flex: 1; }
textarea {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 9px 15px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  line-height: 1.4;
  min-height: 40px;
  max-height: 160px;
  overflow-y: auto;
  transition: border-color 0.2s;
}
textarea:focus { border-color: rgba(79,126,248,0.5); }
textarea::placeholder { color: var(--text-muted); }
textarea:disabled { opacity: 0.5; cursor: not-allowed; }

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.send-btn.active {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: white;
  box-shadow: 0 0 12px rgba(79,126,248,0.4);
}
.send-btn.active:hover { transform: scale(1.05); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.stop-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #e74c3c;
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  animation: pulse-stop 1.5s ease-in-out infinite;
}
.stop-btn:hover { background: #c0392b; transform: scale(1.05); }

/* ── 底部工具栏 ── */
.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  gap: 4px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 2px;
}
.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 7px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.toolbar-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
.toolbar-btn.active { background: rgba(79,126,248,0.12); color: var(--accent-blue); }

.toolbar-right {
  flex-shrink: 0;
}
.hint-text { font-size: 10px; color: var(--text-muted); opacity: 0.6; }

@keyframes pulse-stop {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(231,76,60,0); }
}
</style>

