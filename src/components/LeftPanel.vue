<template>
  <aside class="left-panel">

    <!-- ── Logo 区 ── -->
    <div class="logo-area">
      <!-- <div class="logo-icon">🏢</div> -->
      <div class="logo-title">TradingBase</div>
    </div>

    <!-- ── 主导航图标（上方） ── -->
    <nav class="main-nav">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="nav-item"
        :class="{ active: activeTab === tab.id }"
        @click="setTab(tab.id)"
        :title="tab.label"
      >
        <span class="nav-icon" v-html="tab.svg"></span>
        <span class="nav-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- ── 分隔线 ── -->
    <div class="divider-h"></div>

    <!-- ── 会话区（始终显示） ── -->
    <div class="conv-section">
      <!-- 新建对话按钮 -->
      <button class="new-conv-btn" @click="handleNewConversation" title="新建对话">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>新建对话</span>
      </button>

      <!-- 会话列表 -->
      <div class="conv-list" ref="convListRef">
        <div
          v-for="conv in sortedConversations"
          :key="conv.id"
          class="conv-item"
          :class="{ active: conv.id === currentConversationId }"
          @click="handleSwitchConversation(conv.id)"
          @mouseenter="hoveredConv = conv.id"
          @mouseleave="hoveredConv = null"
        >
          <span class="conv-icon">{{ conv.icon || modeIcon(conv.mode) }}</span>
          <div class="conv-info">
            <div class="conv-title">{{ conv.title }}</div>
            <!-- <div class="conv-preview">{{ conv.preview }}</div> -->
          </div>
          <!-- 删除按钮（hover 时显示） -->
          <button
            v-if="hoveredConv === conv.id && conversations.length > 1"
            class="conv-delete"
            @click.stop="handleDeleteConversation(conv.id)"
            title="删除对话"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- 空状态 -->
        <div v-if="conversations.length === 0" class="conv-empty">
          <span>暂无对话</span>
        </div>
      </div>
    </div>

    <!-- ── 弹性空白（策略/库页面时推底部） ── -->
    <div class="flex-gap"></div>

    <!-- ── 底部区 ── -->
    <div class="bottom-area">
      <!-- 连接状态 -->
      <div class="conn-status" :class="{ connected: apiConnected }">
        <div class="conn-dot"></div>
        <span class="conn-text">{{ apiConnected ? '已连接' : '未连接' }}</span>
      </div>
      <!-- 设置按钮 -->
      <button class="settings-btn" @click="$emit('open-settings')" title="设置">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="1.5"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
    </div>

  </aside>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  apiConnected: { type: Boolean, default: false },
  modelValue: { type: String, default: null },
  conversations: { type: Array, default: () => [] },
  currentConversationId: { type: String, default: null }
})

// 按 lastMessageAt 降序排列，最新聊天的会话排在最上面
const sortedConversations = computed(() => {
  return [...props.conversations].sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
})

const emit = defineEmits([
  'update:modelValue',
  'open-settings',
  'new-conversation',
  'switch-conversation',
  'delete-conversation',
  'open-workflows'
])

const activeTab = ref(props.modelValue || null)

// 监听外部 modelValue 变化同步到内部 activeTab
watch(() => props.modelValue, (val) => {
  activeTab.value = val || null
})
const hoveredConv = ref(null)
const convListRef = ref(null)

const TABS = [
  {
    id: 'agent',
    label: 'Agent',
    svg: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="currentColor"/>
    </svg>`
  },
  {
    id: 'strategy',
    label: '策略',
    svg: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M3 3h18v4H3zM3 10h11v4H3zM3 17h14v4H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M17 13l3 3-3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },
  {
    id: 'library',
    label: '知识库',
    svg: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" stroke-width="1.8"/>
      <path d="M9 7h6M9 11h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`
  }
]

const MODE_ICONS = { ceo: '👔', strategy: '📈', normal: '🤖', private: '💬' }
function modeIcon(mode) {
  return MODE_ICONS[mode] || '💬'
}

function setTab(tab) {
  activeTab.value = tab
  emit('update:modelValue', tab)
  // Agent 按钮点击时 → 打开工作流选择面板
  if (tab === 'agent') {
    emit('open-workflows')
  }
}

function handleNewConversation() {
  emit('new-conversation')
}

function handleSwitchConversation(id) {
  emit('switch-conversation', id)
}

function handleDeleteConversation(id) {
  emit('delete-conversation', id)
}
</script>

<style scoped>
.left-panel {
  width: 200px;
  min-width: 200px;
  height: 100%;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 10px 0 8px;
  flex-shrink: 0;
  overflow: hidden;
}

/* ── Logo ── */
.logo-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 10px;
}
.logo-icon { font-size: 20px; line-height: 1; }
.logo-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-primary);
}

/* ── 主导航 ── */
.main-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 8px;
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 9px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  text-align: left;
}
.nav-item:hover { background: var(--bg-hover); color: var(--text-secondary); }
.nav-item.active { background: rgba(79,126,248,0.12); color: var(--accent-blue); }
.nav-icon { display: flex; align-items: center; flex-shrink: 0; }
.nav-label { white-space: nowrap; }

/* ── 分隔线 ── */
.divider-h {
  height: 1px;
  background: var(--border);
  margin: 6px 14px;
}

/* ── 会话区 ── */
.conv-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 8px;
  gap: 6px;
}

/* 新建对话按钮 */
.new-conv-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: 9px;
  border: 1px dashed var(--border);
  background: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s;
  width: 100%;
}
.new-conv-btn:hover {
  border-color: rgba(79,126,248,0.5);
  color: var(--accent-blue);
  background: rgba(79,126,248,0.06);
}

/* 会话列表 */
.conv-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.conv-list::-webkit-scrollbar { width: 3px; }
.conv-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.conv-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.15s;
  min-width: 0;
}
.conv-item:hover { background: var(--bg-hover); }
.conv-item.active {
  background: rgba(79,126,248,0.1);
}
.conv-item.active .conv-title { color: var(--accent-blue); }

.conv-icon {
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}
.conv-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.conv-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.conv-preview {
  font-size: 10.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 删除按钮 */
.conv-delete {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: none;
  background: var(--bg-hover);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.conv-delete:hover {
  background: rgba(240,80,80,0.15);
  color: var(--accent-red, #e74c3c);
}

.conv-empty {
  padding: 20px 10px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
}

/* ── 弹性占位 ── */
.flex-gap { flex: 1; min-height: 8px; }

/* ── 底部 ── */
.bottom-area {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 2px;
  gap: 6px;
}

.conn-status {
  display: flex;
  align-items: center;
  gap: 5px;
}
.conn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: background 0.3s;
  flex-shrink: 0;
}
.conn-status.connected .conn-dot {
  background: var(--accent-green);
  box-shadow: 0 0 5px rgba(76,175,125,0.6);
  animation: pulse-dot 2s infinite;
}
.conn-text {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}
.conn-status.connected .conn-text { color: var(--accent-green); }

.settings-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s;
  flex-shrink: 0;
}
.settings-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
