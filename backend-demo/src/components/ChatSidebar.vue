<template>
  <aside class="sidebar">
    <!-- Logo & 标题 -->
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon"></div>
        <div class="logo-text">
          <div class="logo-title">Tradingbase</div>
          <div class="logo-sub">CEO 直连模式</div>
        </div>
      </div>
    </div>

    <!-- 连接状态 -->
    <div class="connection-status" :class="{ connected: apiConnected }">
      <div class="conn-dot"></div>
      <span>AI {{ apiConnected ? '已就绪' : '未连接' }}</span>
      <button class="token-btn" @click="openTokenModal" title="设置 Token">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="1.5"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l-.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
    </div>



    <!-- CEO 信息（CEO 模式和策略模式显示） -->
    <div class="sidebar-section" v-if="chatMode === 'ceo' || chatMode === 'strategy'">
      <div class="section-label">对话对象</div>
      <div class="ceo-card">
        <div class="ceo-avatar">
          <span class="avatar-text">CEO</span>
          <span class="ceo-emoji">👔</span>
        </div>
        <div class="ceo-info">
          <div class="ceo-name" style="color: #4f7ef8">Alex Chen</div>
          <div class="ceo-title">CEO · 首席执行官</div>
          <div class="ceo-desc">一人公司最高决策者</div>
        </div>
      </div>
    </div>

    <!-- 策略专家团队（仅策略模式显示） -->
    <div class="sidebar-section sidebar-section-scrollable" v-if="chatMode === 'strategy'">
      <div class="section-label section-label-with-action">
        <span>选择战略专家</span>
        <button class="select-all-btn" @click="toggleSelectAllStrategy">
          {{ allStrategySelected ? '取消全选' : '全选' }}
        </button>
      </div>
      <div class="team-list team-list-selectable">
        <div
          v-for="role in strategyMembers"
          :key="role.id"
          class="team-item"
          :class="{ selected: selectedStrategyRoles.includes(role.id), disabled: isLoading }"
          @click="toggleStrategyRole(role.id)"
        >
          <div class="team-checkbox">
            <svg v-if="selectedStrategyRoles.includes(role.id)" width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="team-dot" :style="{ background: role.color }"></div>
          <div class="team-info" @click.stop>
            <span class="team-name" @click="startPrivateChat(role.id)">{{ role.name }}</span>
            <span class="team-title">{{ role.title }}</span>
          </div>
          <span class="team-emoji" @click="startPrivateChat(role.id)">{{ role.emoji }}</span>
        </div>
      </div>
      <div v-if="selectedStrategyRoles.length === 0" class="team-warning">
        ⚠️ 请至少选择一位专家
      </div>
      <div class="private-chat-hint">
        💡 点击专家名字或表情可私聊
      </div>
    </div>

    <!-- 团队成员选择（仅 CEO 模式显示） -->
    <div class="sidebar-section sidebar-section-scrollable" v-if="chatMode === 'ceo'">
      <div class="section-label section-label-with-action">
        <span>选择参与的高管</span>
        <button class="select-all-btn" @click="toggleSelectAll">
          {{ allSelected ? '取消全选' : '全选' }}
        </button>
      </div>
      <div class="team-list team-list-selectable">
        <div
          v-for="role in teamMembers"
          :key="role.id"
          class="team-item"
          :class="{ selected: selectedRoles.includes(role.id), disabled: isLoading }"
          @click="toggleRole(role.id)"
        >
          <div class="team-checkbox">
            <svg v-if="selectedRoles.includes(role.id)" width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="team-dot" :style="{ background: role.color }"></div>
          <div class="team-info" @click.stop>
            <span class="team-name" @click="startPrivateChat(role.id)">{{ role.name }}</span>
            <span class="team-title">{{ role.title }}</span>
          </div>
          <span class="team-emoji" @click="startPrivateChat(role.id)">{{ role.emoji }}</span>
        </div>
      </div>
      <div v-if="selectedRoles.length === 0" class="team-warning">
        ⚠️ 请至少选择一位高管
      </div>
      <div class="private-chat-hint">
        💡 点击高管名字或表情可私聊
      </div>
    </div>

    <!-- 当前状态 -->
    <div class="sidebar-section" v-if="currentPhase !== 'idle'">
      <div class="section-label">当前状态</div>
      <div class="status-display" :class="currentPhase">
        <div class="status-icon">
          <span v-if="currentPhase === 'ceo-thinking'">🧠</span>
          <span v-else-if="currentPhase === 'assigning'">📋</span>
          <span v-else-if="currentPhase === 'employees-working'">⚙️</span>
          <span v-else-if="currentPhase === 'summarizing'">📝</span>
        </div>
        <div class="status-text">
          <span v-if="currentPhase === 'ceo-thinking'">CEO 正在分析你的问题...</span>
          <span v-else-if="currentPhase === 'assigning'">CEO 正在分配任务...</span>
          <span v-else-if="currentPhase === 'employees-working'">团队成员执行中...</span>
          <span v-else-if="currentPhase === 'summarizing'">CEO 正在汇总反馈...</span>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="sidebar-section">
      <div class="section-label">操作</div>
      <div class="quick-actions">
        <button class="action-btn" @click="$emit('clear-chat')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          清空对话
        </button>
        <button class="action-btn" @click="$emit('export-chat')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v12M8 11l4 4 4-4M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          导出记录
        </button>
        <button class="action-btn" @click="toggleWorkspaceFiles">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          工作区文件
        </button>
      </div>
    </div>

    <div class="sidebar-section flex-fill" v-if="showWorkspaceFiles">
      <div class="section-label">工作区文件</div>
      <workspace-files />
    </div>

    <!-- 消息计数 -->
    <div class="sidebar-footer">
      <div class="stat-item">
        <span class="stat-num">{{ messageCount }}</span>
        <span class="stat-label">条消息</span>
      </div>
    </div>

    <!-- Token 设置弹窗 -->
    <div v-if="showTokenModal" class="token-modal-overlay" @click.self="closeTokenModal">
      <div class="token-modal">
        <div class="token-modal-header">
          <h3>设置 OpenClaw Token</h3>
          <button class="close-btn" @click="closeTokenModal">&times;</button>
        </div>
        <div class="token-modal-body">
          <p class="token-desc">
            当前 Token: <code :class="{ 'token-unset': !getToken() }">{{ tokenMasked }}</code>
          </p>
          <label class="token-label">输入 Token:</label>
          <textarea
            v-model="tokenInput"
            class="token-input"
            placeholder="粘贴你的 OpenClaw Gateway Token..."
            rows="3"
          ></textarea>
          <div class="token-hint">
            <p><strong>前置检查：</strong></p>
            <ol>
              <li>确保 Gateway 已运行：<code>openclaw gateway run</code></li>
            </ol>
            <p style="margin-top: 10px;"><strong>如何获取 Token：</strong></p>
            <ol>
              <li>在一体机终端执行：<code>cat ~/.openclaw/openclaw.json | grep token</code></li>
              <li>复制 <code>gateway.auth.token</code> 字段的值</li>
              <li>粘贴到上方输入框并保存</li>
            </ol>
          </div>
        </div>
        <div class="token-modal-footer">
          <button class="btn btn-secondary" @click="closeTokenModal">取消</button>
          <button class="btn btn-test" @click="runConnectionTest" :disabled="testing">
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          <button class="btn btn-danger" @click="clearToken" v-if="getToken()">清除</button>
          <button class="btn btn-primary" @click="saveToken">保存</button>
        </div>
        <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
          <pre>{{ testResult.message }}</pre>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { COMPANY_ROLES, STRATEGY_ROLES } from '@/services/ai'
import { setToken, getToken, testGatewayConnection } from '@/services/openclawGateway'
import WorkspaceFiles from './WorkspaceFiles.vue'

const props = defineProps({
  apiConnected: Boolean,
  currentPhase: String,
  messageCount: Number,
  messages: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: Array,
    default: () => ['cto', 'cpo', 'coo', 'cmo', 'cfo', 'chro']
  },
  strategyModelValue: {
    type: Array,
    default: () => ['macro_analyst', 'technical_analyst', 'fundamental_analyst', 'sector_specialist', 'risk_controller']
  },
  chatMode: {
    type: String,
    default: 'ceo'  // 'ceo' | 'normal' | 'strategy' | 'private'
  }
})

const emit = defineEmits(['clear-chat', 'export-chat', 'token-change', 'update:modelValue', 'update:strategyModelValue', 'private-chat'])

const teamMembers = COMPANY_ROLES.filter(r => r.id !== 'ceo')
const strategyMembers = STRATEGY_ROLES

// 选中的角色（使用 v-model 模式）
const selectedRoles = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 选中的策略专家
const selectedStrategyRoles = computed({
  get: () => props.strategyModelValue,
  set: (val) => emit('update:strategyModelValue', val)
})

// 是否全选
const allSelected = computed(() => selectedRoles.value.length === teamMembers.length)
const allStrategySelected = computed(() => selectedStrategyRoles.value.length === strategyMembers.length)

// 切换角色选择
function toggleRole(roleId) {
  if (props.isLoading) return

  const index = selectedRoles.value.indexOf(roleId)
  if (index > -1) {
    // 至少保留一个选中
    if (selectedRoles.value.length > 1) {
      selectedRoles.value = selectedRoles.value.filter(id => id !== roleId)
    }
  } else {
    selectedRoles.value = [...selectedRoles.value, roleId]
  }
}

// 切换策略专家选择
function toggleStrategyRole(roleId) {
  if (props.isLoading) return

  const index = selectedStrategyRoles.value.indexOf(roleId)
  if (index > -1) {
    // 至少保留一个选中
    if (selectedStrategyRoles.value.length > 1) {
      selectedStrategyRoles.value = selectedStrategyRoles.value.filter(id => id !== roleId)
    }
  } else {
    selectedStrategyRoles.value = [...selectedStrategyRoles.value, roleId]
  }
}

// 全选/取消全选
function toggleSelectAll() {
  if (props.isLoading) return

  if (allSelected.value) {
    // 取消全选时保留第一个
    selectedRoles.value = [teamMembers[0].id]
  } else {
    selectedRoles.value = teamMembers.map(r => r.id)
  }
}

// 全选/取消全选策略专家
function toggleSelectAllStrategy() {
  if (props.isLoading) return

  if (allStrategySelected.value) {
    // 取消全选时保留第一个
    selectedStrategyRoles.value = [strategyMembers[0].id]
  } else {
    selectedStrategyRoles.value = strategyMembers.map(r => r.id)
  }
}

// 开始私聊
function startPrivateChat(roleId) {
  if (props.isLoading) return
  emit('private-chat', roleId)
}

// 计算属性：最近的消息（排除系统消息）
const recentMessages = computed(() => {
  return props.messages
    .filter(m => m.role !== 'system')
    .slice(-10) // 只显示最近10条
    .reverse() // 最新的在上面
})

// 截断文本
function truncate(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Token 设置
const showTokenModal = ref(false)
const tokenInput = ref('')
const tokenMasked = ref('')
const testing = ref(false)
const testResult = ref(null)

// 工作区文件面板
const showWorkspaceFiles = ref(false)

onMounted(() => {
  updateTokenDisplay()
  // 如果没有设置 token，自动弹出设置窗口
  if (!getToken()) {
    openTokenModal()
  }
})

function updateTokenDisplay() {
  const token = getToken()
  if (token) {
    tokenMasked.value = token.slice(0, 4) + '****' + token.slice(-4)
  } else {
    tokenMasked.value = '未设置'
  }
}

function openTokenModal() {
  tokenInput.value = getToken() || ''
  showTokenModal.value = true
}

function closeTokenModal() {
  showTokenModal.value = false
}

function saveToken() {
  if (tokenInput.value.trim()) {
    setToken(tokenInput.value.trim())
    updateTokenDisplay()
    closeTokenModal()
    // 通知父组件 token 已更改
    emit('token-change')
  }
}

function clearToken() {
  setToken('')
  tokenInput.value = ''
  updateTokenDisplay()
  closeTokenModal()
}

function toggleWorkspaceFiles() {
  showWorkspaceFiles.value = !showWorkspaceFiles.value
}

async function runConnectionTest() {
  testing.value = true
  testResult.value = null
  try {
    // 临时保存输入的 token 用于测试
    const originalToken = getToken()
    if (tokenInput.value.trim()) {
      setToken(tokenInput.value.trim())
    }
    
    const result = await testGatewayConnection()
    
    // 恢复原始 token
    if (!originalToken && tokenInput.value.trim()) {
      setToken('')
    }
    
    const success = result.http?.startsWith('status 2') || result.ws === 'connected'
    testResult.value = {
      success,
      message: `Token: ${result.token}\nWebSocket: ${result.ws}\nHTTP: ${result.http}${result.models ? '\nModels: ' + result.models.join(', ') : ''}`
    }
  } catch (err) {
    testResult.value = {
      success: false,
      message: `测试失败: ${err.message}`
    }
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 0px 16px 0px;
  border-bottom: 1px solid var(--border);
  height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-icon { font-size: 28px; line-height: 1; }
.logo-title { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; }
.logo-sub { font-size: 10px; color: var(--text-muted); margin-top: 1px; }

/* Mode Switcher */
.mode-section {
  flex-shrink: 0;
}

.mode-switcher {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
  color: var(--text-secondary);
}

.mode-btn:hover {
  background: var(--bg-hover);
  border-color: rgba(79, 126, 248, 0.3);
}

.mode-btn.active {
  background: rgba(79, 126, 248, 0.1);
  border-color: rgba(79, 126, 248, 0.5);
  color: var(--text-primary);
}

.mode-icon {
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1;
}

.mode-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mode-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.mode-desc {
  font-size: 10px;
  color: var(--text-muted);
}

.mode-check {
  font-size: 12px;
  color: #4f7ef8;
  font-weight: 700;
  flex-shrink: 0;
}

/* Connection */
.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 11px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-light);
}
.conn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-orange);
}
.connection-status.connected .conn-dot { background: var(--accent-green); }
.connection-status.connected { color: var(--text-secondary); }

/* Sections */
.sidebar-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}
.sidebar-section.flex-fill {
  flex: 1;
  overflow-y: auto;
  border-bottom: none;
}
.sidebar-section-scrollable {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.sidebar-section-scrollable .team-list {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 8px;
}

/* CEO Card */
.ceo-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(79,126,248,0.08);
  border: 1px solid rgba(79,126,248,0.2);
  border-radius: 10px;
}
.ceo-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1.5px solid #4f7ef8;
  background: linear-gradient(135deg, rgba(79,126,248,0.2), rgba(79,126,248,0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}
.avatar-text { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.9); }
.ceo-emoji { position: absolute; bottom: -3px; right: -3px; font-size: 14px; }
.ceo-info { flex: 1; }
.ceo-name { font-size: 13px; font-weight: 600; }
.ceo-title { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
.ceo-desc { font-size: 10px; color: var(--text-muted); opacity: 0.7; margin-top: 2px; }

/* Team List */
.team-list { display: flex; flex-direction: column; gap: 2px; }
.team-list-selectable .team-item {
  cursor: pointer;
  transition: all 0.15s;
}
.team-list-selectable .team-item:hover:not(.disabled) {
  background: var(--bg-hover);
}
.team-list-selectable .team-item.selected {
  background: rgba(79, 126, 248, 0.1);
}
.team-list-selectable .team-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.team-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
}
.team-checkbox {
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.team-item.selected .team-checkbox {
  background: #4f7ef8;
  border-color: #4f7ef8;
  color: white;
}
.team-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.team-info { flex: 1; display: flex; flex-direction: column; }
.team-name { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.team-title { font-size: 10px; color: var(--text-muted); }
.team-emoji { font-size: 14px; }
.team-warning {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: 6px;
  font-size: 11px;
  color: #e74c3c;
}
.private-chat-hint {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(79, 126, 248, 0.08);
  border: 1px solid rgba(79, 126, 248, 0.15);
  border-radius: 6px;
  font-size: 10px;
  color: #4f7ef8;
}
.team-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s;
}
.team-name:hover {
  color: #4f7ef8;
  text-decoration: underline;
}
.team-emoji {
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.15s;
}
.team-emoji:hover {
  transform: scale(1.2);
}
.section-label-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.select-all-btn {
  font-size: 10px;
  color: #4f7ef8;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}
.select-all-btn:hover {
  background: rgba(79, 126, 248, 0.1);
}

/* Status Display */
.status-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  animation: fadeInUp 0.2s ease;
}
.status-display.ceo-thinking { border-color: rgba(79,126,248,0.3); }
.status-display.employees-working { border-color: rgba(76,175,125,0.3); }
.status-display.summarizing { border-color: rgba(240,192,64,0.3); }
.status-icon { font-size: 16px; flex-shrink: 0; }
.status-text { font-size: 12px; color: var(--text-secondary); }

/* Actions */
.quick-actions { display: flex; flex-direction: column; gap: 4px; }
.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
}
.action-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Footer */
.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-num { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 10px; color: var(--text-muted); }

/* Token Button */
.token-btn {
  margin-left: auto;
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}
.token-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

/* Token Modal */
.token-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.token-modal {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.token-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.token-modal-header h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}
.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}
.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.token-modal-body {
  padding: 20px;
}
.token-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 16px;
}
.token-desc code {
  background: var(--bg-card);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
}
.token-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.token-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 12px;
  font-family: monospace;
  resize: vertical;
  box-sizing: border-box;
}
.token-input:focus {
  outline: none;
  border-color: #4f7ef8;
}
.token-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin: 12px 0 0;
  line-height: 1.5;
}
.token-hint code {
  background: var(--bg-card);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: monospace;
}
.token-unset {
  color: #e74c3c !important;
  font-weight: 600;
}
.token-hint ol {
  margin: 8px 0 0;
  padding-left: 16px;
}
.token-hint li {
  margin: 4px 0;
  line-height: 1.6;
}
.token-hint strong {
  color: var(--text-secondary);
}
.token-modal-footer {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  justify-content: flex-end;
}
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}
.btn-primary {
  background: #4f7ef8;
  color: white;
  border-color: #4f7ef8;
}
.btn-primary:hover {
  background: #3d6ce8;
}
.btn-secondary {
  background: var(--bg-card);
  color: var(--text-secondary);
  border-color: var(--border);
}
.btn-secondary:hover {
  background: var(--bg-hover);
}
.btn-danger {
  background: transparent;
  color: #e74c3c;
  border-color: #e74c3c;
}
.btn-danger:hover {
  background: rgba(231, 76, 60, 0.1);
}
.btn-test {
  background: var(--bg-card);
  color: var(--text-secondary);
  border-color: var(--border);
}
.btn-test:hover:not(:disabled) {
  background: var(--bg-hover);
}
.btn-test:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.test-result {
  margin: 0 20px 16px;
  padding: 12px;
  border-radius: 8px;
  font-size: 11px;
  font-family: monospace;
}
.test-result.success {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #4caf50;
}
.test-result.error {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: #e74c3c;
}
.test-result pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
