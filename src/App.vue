<template>
  <div class="app-layout">

    <!-- ── 左侧控制台 ── -->
    <LeftPanel
      v-model="activeTab"
      :api-connected="store.apiConnected"
      :conversations="store.conversations"
      :current-conversation-id="store.currentConversationId"
      @open-settings="openSettings"
      @new-conversation="handleNewConversation"
      @switch-conversation="handleSwitchConversation"
      @delete-conversation="handleDeleteConversation"
      @open-workflows="handleOpenWorkflows"
    />

    <!-- ── 中间：模式内容区 ── -->
    <div class="main-area">
      <!-- 策略管理页（优先级高于对话页） -->
      <template v-if="activeTab === 'strategy'">
        <div class="placeholder-page">
          <div class="placeholder-icon">📈</div>
          <h2>策略管理</h2>
          <p>A股策略分析配置，即将上线</p>
          <button class="placeholder-btn" @click="activateStrategyMode">
            进入 A股策略分析
          </button>
        </div>
      </template>

      <!-- 知识库页（优先级高于对话页） -->
      <template v-else-if="activeTab === 'library'">
        <div class="placeholder-page">
          <div class="placeholder-icon">📚</div>
          <h2>知识库</h2>
          <p>管理 AI 可访问的知识文档，即将上线</p>
        </div>
      </template>

      <!-- 对话页：在对话中时显示聊天室 -->
      <template v-else-if="isInConversation">
        <ChatRoom
          ref="chatRoomRef"
          :key="store.currentConversationId"
          :messages="store.messages"
          :is-loading="store.activeConvLoading"
          :ceo-typing="store.ceoTyping"
          :chat-mode="chatMode"
          :selected-roles="selectedRoles"
          :private-target="store.privateChatTargetInfo"
          @send="handleSendMessage"
          @exit-private="handleExitPrivate"
          @back-to-selection="showModePanel = true"
          @stop="handleStop"
        />
      </template>

      <!-- 工作流选择页：不在对话中时显示 -->
      <template v-else>
        <div class="workflow-page">
          <div class="workflow-header">
            <h2>选择工作流</h2>
            <p>选择一个 AI 工作模式开始对话</p>
          </div>
          <div class="workflow-grid">
            <button
              v-for="m in MODES"
              :key="m.id"
              class="workflow-card"
              @click="selectModeAndStart(m.id)"
            >
              <!-- <span class="wf-icon">{{ m.icon }}</span> -->
              <div class="wf-name">{{ m.name }}</div>
              <div class="wf-desc">{{ m.desc }}</div>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- ── 右侧面板（文件管理 + 员工工作流） ── -->
    <RightPanel
      ref="rightPanelRef"
      :key="'rp-' + store.currentConversationId"
      :tasks="store.currentTasks"
      :current-phase="store.currentPhase"
      :messages="chatMode === 'strategy' ? store.strategyMessages : store.ceoMessages"
      :chat-mode="chatMode"
    />

    <!-- ── 模式切换浮层 ── -->
    <div v-if="showModePanel" class="mode-overlay" @click.self="showModePanel = false">
      <div class="mode-picker">
        <div class="mode-picker-header">
          <span>切换对话模式</span>
          <button class="mode-close" @click="showModePanel = false">✕</button>
        </div>
        <div class="mode-options">
          <button
            v-for="m in MODES"
            :key="m.id"
            class="mode-option"
            :class="{ active: chatMode === m.id }"
            @click="selectMode(m.id)"
          >
            <span class="mode-opt-icon">{{ m.icon }}</span>
            <div>
              <div class="mode-opt-name">{{ m.name }}</div>
              <div class="mode-opt-desc">{{ m.desc }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- ── 设置浮层 ── -->
    <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
      <div class="settings-panel">
        <div class="settings-header">
          <span>设置</span>
          <button class="mode-close" @click="showSettings = false">✕</button>
        </div>
        <div class="settings-body">
          <!-- Token 设置 -->
          <div class="settings-row">
            <label>OpenClaw Token</label>
            <input
              v-model="tokenInput"
              placeholder="输入 Token..."
              class="settings-input"
            />
            <button class="settings-save" @click="saveToken">保存</button>
          </div>
          <!-- 连接状态 -->
          <div class="settings-conn">
            <div class="conn-dot" :class="{ connected: store.apiConnected }"></div>
            <span>AI {{ store.apiConnected ? '已连接' : '未连接' }}</span>
          </div>
          <!-- 清除聊天 -->
          <button class="settings-danger" @click="clearAndClose">清空当前对话</button>
        </div>
      </div>
    </div>

    <!-- ── 授权对话框 ── -->
    <ApprovalDialog
      :visible="hasCurrentApproval"
      :request="currentApprovalRequest"
      :approval-id="currentApprovalId"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted, computed, watch, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'
import {
  closeGatewayConnection,
  approveRequest,
  rejectApproval,
  useApprovalState,
  getToken,
  setToken
} from '@/services/openclawGateway'
import LeftPanel from '@/components/LeftPanel.vue'
import RightPanel from '@/components/RightPanel.vue'
import ChatRoom from '@/components/ChatRoom.vue'
import ApprovalDialog from '@/components/ApprovalDialog.vue'

const store = useChatStore()

// ── 组件引用 ──────────────────────────────────────────
const chatRoomRef = ref(null)
const rightPanelRef = ref(null)

// ── 左侧导航 ──────────────────────────────────────────
const activeTab = ref('agent')

// ── 是否正在对话中（区分工作流选择页 vs 聊天室） ──────
const isInConversation = ref(true)

// ── 模式面板 ──────────────────────────────────────────
const showModePanel = ref(false)
const MODES = [
  { id: 'ceo', icon: '👔', name: 'CEO 统筹', desc: '15 位高管团队协作处理你的问题' },
  { id: 'strategy', icon: '📈', name: 'A股策略分析', desc: '宏观+技术+基本面+行业+风控五专家' },
  { id: 'normal', icon: '🤖', name: 'AI 直聊', desc: '直接与 AI 对话，无 CEO 流程' },
]

// ── 设置面板 ──────────────────────────────────────────
const showSettings = ref(false)
const tokenInput = ref(getToken())

function openSettings() {
  tokenInput.value = getToken()
  showSettings.value = true
}

function saveToken() {
  setToken(tokenInput.value)
  showSettings.value = false
  store.init()
}

function clearAndClose() {
  store.clearMessages()
  showSettings.value = false
}

// ── 授权状态 ──────────────────────────────────────────
const { currentApproval } = useApprovalState()
const hasCurrentApproval = computed(() => !!currentApproval.value)
const currentApprovalRequest = computed(() => currentApproval.value?.request)
const currentApprovalId = computed(() => currentApproval.value?.id)

// ── 角色选择 ──────────────────────────────────────────
const selectedRoles = ref([
  'cto', 'cpo', 'coo', 'cmo', 'cfo', 'chro',
  'security', 'legal', 'data', 'ux', 'sales', 'customer', 'devops', 'qa', 'research'
])
const selectedStrategyRoles = ref([
  'macro_analyst', 'technical_analyst', 'fundamental_analyst', 'sector_specialist', 'risk_controller'
])

// ── 对话模式 ──────────────────────────────────────────
const chatMode = computed({
  get: () => store.currentChatMode,
  set: (val) => store.switchChatMode(val)
})

function selectMode(mode) {
  store.switchChatMode(mode)
  showModePanel.value = false
  nextTick(() => setTimeout(syncScrollToBottom, 150))
}

async function activateStrategyMode() {
  // 创建新的策略对话，而不是在当前对话上切换模式
  // 否则当前对话的消息会因为模式切换而消失
  await store.newConversation('strategy')
  isInConversation.value = true
  activeTab.value = null
  nextTick(() => setTimeout(syncScrollToBottom, 150))
}

// ── 生命周期 ──────────────────────────────────────────
onMounted(async () => {
  await store.init()
  // 默认进入对话页面
  if (store.currentConversationId) {
    isInConversation.value = true
  } else {
    await store.newConversation('ceo')
    isInConversation.value = true
  }
  activeTab.value = null  // 对话状态下导航不选中任何 tab
  nextTick(() => setTimeout(syncScrollToBottom, 300))
})

onUnmounted(() => {
  closeGatewayConnection()
})

// ── 会话管理 ──────────────────────────────────────────
async function handleNewConversation() {
  // 新建 CEO 模式对话，直接进入聊天室
  await store.newConversation('ceo')
  isInConversation.value = true
  activeTab.value = null  // 对话状态下导航不选中任何 tab
  nextTick(() => setTimeout(syncScrollToBottom, 200))
}

async function handleSwitchConversation(convId) {
  await store.switchConversation(convId)
  isInConversation.value = true
  activeTab.value = null  // 对话状态下导航不选中任何 tab
  nextTick(() => setTimeout(syncScrollToBottom, 150))
}

function handleOpenWorkflows() {
  // 回到工作流选择页
  isInConversation.value = false
  activeTab.value = 'agent'
}

async function selectModeAndStart(mode) {
  await store.newConversation(mode)
  isInConversation.value = true
  activeTab.value = null  // 对话状态下导航不选中任何 tab
  nextTick(() => setTimeout(syncScrollToBottom, 200))
}

async function handleDeleteConversation(convId) {
  await store.deleteConversation(convId)
}

// ── 消息处理 ──────────────────────────────────────────
function handleSendMessage(data) {
  const isStrategyMode = store.currentChatMode === 'strategy'
  const roles = isStrategyMode ? selectedStrategyRoles.value : selectedRoles.value
  const messageData = typeof data === 'string'
    ? { content: data, selectedRoles: roles }
    : { ...data, selectedRoles: roles }
  store.sendMessage(messageData)
}

// ── 授权处理 ──────────────────────────────────────────
function handleApprove(approvalId) {
  if (approvalId) approveRequest(approvalId)
}
function handleReject(approvalId) {
  if (approvalId) rejectApproval(approvalId)
}

// ── 私聊 ──────────────────────────────────────────────
function handleExitPrivate() {
  store.exitPrivateChat()
}

// ── 停止生成 ──────────────────────────────────────────
function handleStop() {
  store.stopGeneration()
}

// ── 滚动 ──────────────────────────────────────────────
function syncScrollToBottom() {
  chatRoomRef.value?.scrollToBottom()
  rightPanelRef.value?.forceScrollToBottom()
}
</script>

<style scoped>
.app-layout {
  height: 100vh;
  width: 100%;
  display: flex;
  overflow: hidden;
  background: var(--bg-app);
}

/* ── 主区域 ─────────────────────────────────── */
.main-area {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── 占位页 ─────────────────────────────────── */
.placeholder-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  padding: 40px;
  text-align: center;
}
.placeholder-icon { font-size: 48px; opacity: 0.4; }
.placeholder-page h2 { font-size: 18px; font-weight: 600; color: var(--text-secondary); }
.placeholder-page p { font-size: 13px; max-width: 280px; }
.placeholder-btn {
  margin-top: 8px;
  padding: 9px 20px;
  border-radius: 10px;
  background: rgba(79,126,248,0.15);
  border: 1px solid rgba(79,126,248,0.3);
  color: var(--accent-blue);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.placeholder-btn:hover { background: rgba(79,126,248,0.25); }

/* ── 工作流选择页 ──────────────────────────── */
.workflow-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 40px;
}
.workflow-header {
  text-align: center;
}
.workflow-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.workflow-header p {
  font-size: 13px;
  color: var(--text-secondary);
}
.workflow-grid {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}
.workflow-card {
  width: 200px;
  padding: 24px 18px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.workflow-card:hover {
  border-color: rgba(79,126,248,0.4);
  background: rgba(79,126,248,0.06);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
}
.wf-icon { font-size: 32px; }
.wf-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.wf-desc { font-size: 11.5px; color: var(--text-secondary); line-height: 1.5; }

/* ── 模式切换浮层 ─────────────────────────── */
.mode-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.mode-picker {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  width: 340px;
  box-shadow: var(--shadow-lg);
  animation: fadeInUp 0.2s ease;
}
.mode-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.mode-close {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.mode-close:hover { background: var(--bg-hover); color: var(--text-primary); }
.mode-options { display: flex; flex-direction: column; gap: 8px; }
.mode-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: none;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
  color: var(--text-primary);
}
.mode-option:hover { background: var(--bg-hover); border-color: rgba(79,126,248,0.3); }
.mode-option.active { background: rgba(79,126,248,0.1); border-color: rgba(79,126,248,0.4); }
.mode-opt-icon { font-size: 22px; flex-shrink: 0; }
.mode-opt-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.mode-opt-desc { font-size: 11px; color: var(--text-muted); }

/* ── 设置面板 ─────────────────────────────── */
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.settings-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  width: 360px;
  box-shadow: var(--shadow-lg);
  animation: fadeInUp 0.2s ease;
}
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.settings-body { display: flex; flex-direction: column; gap: 16px; }
.settings-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.settings-row label { font-size: 11px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
.settings-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.settings-input:focus { border-color: rgba(79,126,248,0.5); }
.settings-save {
  align-self: flex-end;
  padding: 7px 18px;
  border-radius: 8px;
  background: var(--accent-blue);
  border: none;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.settings-save:hover { opacity: 0.85; }
.settings-conn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.conn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: background 0.3s;
}
.conn-dot.connected { background: var(--accent-green); box-shadow: 0 0 6px rgba(76,175,125,0.5); }
.settings-danger {
  padding: 9px;
  border-radius: 8px;
  border: 1px solid rgba(240,80,80,0.3);
  background: none;
  color: var(--accent-red);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.settings-danger:hover { background: rgba(240,80,80,0.08); }
</style>
