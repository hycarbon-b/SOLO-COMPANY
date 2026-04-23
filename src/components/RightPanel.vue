<template>
  <aside class="right-panel" :class="{ collapsed: isCollapsed }">

    <!-- 收起状态：第一个 section header 厨边显示一个可点击的细条 -->
    <button
      v-if="isCollapsed"
      class="collapsed-strip"
      @click="toggleCollapse"
      title="展开面板"
    >
      <svg class="strip-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="strip-label">工作区</span>
      <span v-if="hasTasks" class="strip-badge" :class="{ active: currentPhase === 'employees-working' }">
        {{ completedCount }}/{{ totalCount }}
      </span>
    </button>

    <!-- 展开状态：完整面板内容 -->
    <template v-if="!isCollapsed">

    <!-- ── 上半：文件管理 ── -->
    <div class="panel-section files-section" :style="{ height: filesHeight + 'px' }">
      <div class="section-header">
        <div class="section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="currentColor" stroke-width="1.6"/>
          </svg>
          <span>文件管理</span>
        </div>
        <button class="section-action" @click="() => {}" title="刷新">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M20 9a8 8 0 00-14.93-2.46M4 15a8 8 0 0014.93 2.46" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
        <!-- 收起按鈕 -->
        <button class="collapse-btn" @click="toggleCollapse" title="收起面板">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="section-body files-body">
        <div v-if="store.savedFiles.length === 0" class="empty-tip">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="opacity:0.3;margin-bottom:6px">
            <path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <p>暂无文件</p>
        </div>
        <div v-else class="file-list">
          <div
            v-for="file in store.savedFiles"
            :key="file.path"
            class="file-item"
            :title="file.path"
          >
            <span class="file-icon">{{ file.icon }}</span>
            <div class="file-info">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-meta">{{ file.path }} · {{ formatTime(file.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 拖动分割线 ── -->
    <div
      class="resize-handle"
      @mousedown="startResize"
      title="拖动调整大小"
    >
      <div class="handle-grip">
        <span></span><span></span><span></span>
      </div>
    </div>

    <!-- ── 下半：员工工作流 ── -->
    <div class="panel-section workflow-section">
      <div class="section-header">
        <div class="section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.6"/>
            <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M16 11h6M19 8v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <span>员工工作流</span>
        </div>
        <!-- 阶段标签 -->
        <span v-if="currentPhase && currentPhase !== 'idle'" class="phase-chip" :class="currentPhase">
          {{ phaseLabel }}
        </span>
        <!-- 进度 -->
        <span v-if="hasTasks" class="progress-chip">
          {{ completedCount }}/{{ totalCount }}
        </span>
      </div>

      <!-- 工作流内容 -->
      <div class="section-body workflow-body" ref="workflowRef" @scroll="handleWorkflowScroll">

        <!-- 空态 -->
        <div v-if="!hasWorkflowContent" class="empty-tip">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="opacity:0.25;margin-bottom:8px">
            <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.4"/>
            <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <p>等待 CEO 分配任务...</p>
          <p class="empty-sub">CEO 会根据你的问题自动分配任务</p>
        </div>

        <!-- 任务卡片列表 -->
        <template v-else>
          <div
            v-for="item in sortedWorkflowItems"
            :key="item._id"
            class="workflow-item"
            :class="item._type"
          >
            <!-- 用户消息 -->
            <template v-if="item._type === 'user-message'">
              <div class="wf-user-msg">
                <div class="wf-user-avatar">我</div>
                <div class="wf-user-text">{{ item._data.content }}</div>
              </div>
            </template>

            <!-- CEO 系统消息 / 汇总 -->
            <template v-else-if="item._type === 'ceo-summary'">
              <div class="wf-ceo-card">
                <div class="wf-card-header">
                  <div class="wf-avatar ceo-avatar">👔<span class="wf-avatar-label">CEO</span></div>
                  <div class="wf-card-meta">
                    <span class="wf-role-name">Alex Chen</span>
                    <span class="wf-role-title">
                      {{ item._data.isSummary ? 'CEO 汇总' : item._data.isInitial ? 'CEO 分析' : 'CEO · 首席执行官' }}
                    </span>
                  </div>
                  <span class="wf-time">{{ formatTime(item._data.timestamp) }}</span>
                </div>
                <div class="wf-card-body markdown-body" v-html="renderMarkdown(item._data.content)"></div>
              </div>
            </template>

            <!-- CEO 思考中 -->
            <template v-else-if="item._type === 'ceo-thinking'">
              <div class="wf-thinking-card">
                <div class="wf-card-header">
                  <div class="wf-avatar thinking-anim">👔</div>
                  <div class="wf-card-meta">
                    <span class="wf-role-name">Alex Chen</span>
                    <!-- <div class="wf-thinking-badge">分析中</div> -->
                  </div>
                </div>
                <div class="wf-thinking-bar">
                  <div class="wf-shimmer"></div>
                </div>
                <p class="wf-thinking-text">{{ item._data.task || '正在分析问题，准备分配任务...' }}</p>
                <!-- 实时流式内容 -->
                <div v-if="item._data.content" class="wf-thinking-content markdown-body" v-html="renderMarkdown(item._data.content)"></div>
              </div>
            </template>

            <!-- 分配任务卡片 -->
            <template v-else-if="item._type === 'assigning'">
              <div class="wf-assigning-card">
                <div class="wf-card-header">
                  <div class="wf-avatar ceo-avatar"><span class="wf-avatar-label">CEO</span></div>
                  <div class="wf-card-meta">
                    <span class="wf-role-name">Alex Chen</span>
                    <span class="wf-role-title">分配任务</span>
                  </div>
                  <span class="wf-time">{{ formatTime(item._data.timestamp) }}</span>
                </div>
                <div class="wf-assigning-body">
                  <div v-for="(a, idx) in item._data.assignments" :key="a.employeeId + idx" class="wf-assign-item">
                    <div class="wf-assign-avatar" :style="{ borderColor: a.color }">
                      {{ a.avatar }}
                      <!-- <span class="wf-avatar-emoji">{{ a.emoji }}</span> -->
                    </div>
                    <div class="wf-assign-info">
                      <span class="wf-assign-name" :style="{ color: a.color }">{{ a.name }}</span>
                      <span class="wf-assign-task">{{ a.task }}</span>
                      <span v-if="a.focus" class="wf-assign-focus">{{ a.focus }}</span>
                    </div>
                    <!-- <span class="wf-assign-status" :class="a.status">
                      {{ a.status === 'working' ? '⏳' : a.status === 'done' ? '✅' : '📋' }}
                    </span> -->
                  </div>
                </div>
              </div>
            </template>

            <!-- 员工任务卡片 -->
            <template v-else-if="item._type === 'employee-task'">
              <div class="wf-task-card" :class="item._data.status">
                <div class="wf-card-header">
                  <div
                    class="wf-avatar emp-avatar"
                    :style="{
                      background: `linear-gradient(135deg, ${item._data.role?.color}22, ${item._data.role?.color}55)`,
                      borderColor: item._data.role?.color
                    }"
                  >
                    {{ item._data.role?.avatar }}
                    <!-- <span class="wf-avatar-emoji">{{ item._data.role?.emoji }}</span> -->
                  </div>
                  <div class="wf-card-meta">
                    <span class="wf-role-name">{{ item._data.role?.name || item._data.employeeId }}</span>
                    <span class="wf-role-title">{{ item._data.role?.title }}</span>
                  </div>
                  <div class="wf-status-icon">
                    <span v-if="item._data.status === 'working'" class="status-working">
                      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                    </span>
                    <span v-else-if="item._data.status === 'done'" class="status-done">✓</span>
                    <span v-else class="status-pending">⏳</span>
                  </div>
                </div>

                <!-- 任务描述 -->
                <div v-if="item._data.task" class="wf-task-desc">
                  <span class="wf-task-label">任务：</span>{{ item._data.task }}
                </div>
                <div v-if="item._data.focus" class="wf-task-focus">
                  {{ item._data.focus }}
                </div>

                <!-- 工具调用 -->
                <div v-if="item._data.toolCalls?.length" class="wf-tools">
                  <div class="wf-tools-header" @click="toggleTools(item._data.id)">
                    <span>🔧 工具调用 ({{ item._data.toolCalls.length }})</span>
                    <span>{{ expandedTools[item._data.id] ? '▼' : '▶' }}</span>
                  </div>
                  <div v-if="expandedTools[item._data.id]" class="wf-tools-list">
                    <div v-for="(tool, i) in item._data.toolCalls" :key="tool.id || i" class="wf-tool-item">
                      <span class="wf-tool-name">{{ tool.function?.name || tool.name || '工具' }}</span>
                      <span v-if="tool.status" class="wf-tool-status" :class="tool.status">{{ tool.status }}</span>
                    </div>
                  </div>
                </div>

                <!-- 输出内容 -->
                <div v-if="item._data.content" class="wf-output" :class="{ streaming: item._data.status === 'working', done: item._data.status === 'done' }">
                  <div v-if="item._data.status === 'working'" class="wf-output-header">
                    <span class="wf-stream-dot"></span>实时输出中...
                  </div>
                  <div v-else-if="item._data.status === 'done'" class="wf-output-header wf-output-done">
                    <span class="wf-done-icon">✓</span>输出完成
                  </div>
                  <div
                    :ref="el => setTaskRef(el, item._data.id)"
                    class="wf-output-body markdown-body"
                    v-html="renderMarkdown(item._data.content)"
                  ></div>
                </div>
                <div v-else-if="item._data.status === 'working'" class="wf-loading">
                  <div class="wf-loading-bar"><div class="wf-loading-shimmer"></div></div>
                  <span>分析中...</span>
                </div>
              </div>
            </template>

          </div>
        </template>

        <!-- 汇总中状态 -->
        <div v-if="currentPhase === 'summarizing'" class="wf-footer-status">
          <div class="wf-footer-pulse"></div>
          <span>👔 CEO 正在汇总团队反馈...</span>
        </div>

        <!-- 滚动锚点 -->
        <div ref="workflowBottomRef" style="height:1px"></div>
      </div>
    </div>

    </template>
    <!-- end 展开状态 -->

  </aside>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import { COMPANY_ROLES, STRATEGY_ROLES } from '@/services/ai'
import { useChatStore } from '@/stores/chat'

// ── 收缩状态 ──────────────────────────────────────────
const isCollapsed = ref(false)
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// ── Props ──────────────────────────────────────────────
const props = defineProps({
  tasks: { type: Array, default: () => [] },
  currentPhase: { type: String, default: 'idle' },
  messages: { type: Array, default: () => [] },
  chatMode: { type: String, default: 'ceo' }
})

// ── 文件管理 ──────────────────────────────────────────
const store = useChatStore()

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ── 分割线拖动 ──────────────────────────────────────────
const filesHeight = ref(200)
let isDragging = false
let startY = 0
let startHeight = 0

function startResize(e) {
  isDragging = true
  startY = e.clientY
  startHeight = filesHeight.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}
function onResize(e) {
  if (!isDragging) return
  const delta = e.clientY - startY
  filesHeight.value = Math.max(80, Math.min(400, startHeight + delta))
}
function stopResize() {
  isDragging = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}
onUnmounted(() => {
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})

// ── 工作流 ──────────────────────────────────────────────
const workflowRef = ref(null)
const workflowBottomRef = ref(null)
const expandedTools = ref({})
const taskRefs = ref(new Map())

const allRoles = [...COMPANY_ROLES, ...STRATEGY_ROLES]

function getRoleInfo(employeeId) {
  return allRoles.find(r => r.id === employeeId) || null
}

// 把 tasks + messages 混合成按时间排序的列表
const sortedWorkflowItems = computed(() => {
  const items = []

  // 用户和 CEO 消息
  if (props.messages?.length) {
    props.messages.forEach(msg => {
      if (msg.from === 'user') {
        items.push({ _id: `msg-${msg.id}`, _type: 'user-message', _ts: msg.timestamp || 0, _data: msg })
      } else if (msg.from === 'agent') {
        // 识别 CEO 回复：roleId === 'ceo' 或 role.id === 'ceo' 或 isSummary/isInitial
        const isCeo = msg.roleId === 'ceo'
          || (msg.role && typeof msg.role === 'object' && msg.role.id === 'ceo')
          || msg.isSummary
          || msg.isInitial
        if (isCeo) {
          items.push({ _id: `msg-${msg.id}`, _type: 'ceo-summary', _ts: msg.timestamp || 0, _data: msg })
        }
      }
    })
  }

  // 查找 CEO 思考任务（isThinking 标记）
  const ceoThinkingTask = props.tasks?.find(t => t.isThinking && t.employeeId === 'ceo')

  // CEO 思考中（特殊阶段）— 优先使用思考任务的实际内容
  if (props.currentPhase === 'ceo-thinking' || ceoThinkingTask) {
    items.push({
      _id: 'ceo-thinking-now',
      _type: 'ceo-thinking',
      _ts: ceoThinkingTask?.timestamp || Date.now(),
      _data: {
        task: ceoThinkingTask?.task || '正在分析问题，准备分配任务...',
        content: ceoThinkingTask?.content || ''
      }
    })
  }

  // ── 分配任务卡片 ──
  // 当有非思考任务时，始终显示分配概览卡片（贯穿整个工作流）
  const nonThinkingTasks = (props.tasks || []).filter(t => !t.isThinking)
  const assigningTs = nonThinkingTasks.length > 0
    ? Math.min(...nonThinkingTasks.map(t => t.createdAt || t.timestamp || Date.now()))
    : Date.now()

  if (nonThinkingTasks.length > 0) {
    // 收集分配信息：每个员工分配了什么任务
    const assignments = nonThinkingTasks.map(t => {
      const role = getRoleInfo(t.employeeId)
      return {
        employeeId: t.employeeId,
        name: role?.name || t.employeeId,
        avatar: role?.avatar || '👤',
        emoji: role?.emoji || '',
        color: role?.color || '#888',
        task: t.task,
        focus: t.focus,
        status: t.status
      }
    })
    items.push({
      _id: 'assigning-overview',
      _type: 'assigning',
      _ts: assigningTs,
      _data: {
        assignments,
        timestamp: assigningTs
      }
    })
  }

  // 员工任务（排除 CEO 思考任务，避免重复显示）
  if (nonThinkingTasks.length) {
    nonThinkingTasks.forEach(task => {
      const role = getRoleInfo(task.employeeId)
      items.push({
        _id: `task-${task.id}`,
        _type: 'employee-task',
        _ts: task.startedAt || task.createdAt || task.timestamp || 0,
        _data: { ...task, role }
      })
    })
  }

  // 按时间升序排列：最早的事件在顶部，最新的在底部（聊天式体验）
  return items.sort((a, b) => a._ts - b._ts)
})

const hasTasks = computed(() => props.tasks?.length > 0)
const hasWorkflowContent = computed(() => sortedWorkflowItems.value.length > 0)
const completedCount = computed(() => props.tasks?.filter(t => t.status === 'done').length || 0)
const totalCount = computed(() => props.tasks?.length || 0)

const phaseLabel = computed(() => {
  const map = {
    'ceo-thinking': '🧠 CEO 分析中',
    'assigning': '📋 分配任务',
    'employees-working': '⚙️ 员工执行中',
    'summarizing': '📝 汇总中'
  }
  return map[props.currentPhase] || props.currentPhase
})

// 自动滚动
let isUserScrolling = false
watch(() => [props.tasks, props.currentPhase], () => {
  if (!isUserScrolling) {
    nextTick(() => scrollWorkflowToBottom())
  }
}, { deep: true })

function handleWorkflowScroll() {
  if (!workflowRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = workflowRef.value
  isUserScrolling = scrollHeight - scrollTop - clientHeight > 40
}

function scrollWorkflowToBottom() {
  if (!workflowRef.value) return
  workflowRef.value.scrollTo({ top: workflowRef.value.scrollHeight, behavior: 'smooth' })
}

// 暴露给父组件
defineExpose({ forceScrollToBottom: scrollWorkflowToBottom })

function toggleTools(taskId) {
  expandedTools.value[taskId] = !expandedTools.value[taskId]
}

function setTaskRef(el, taskId) {
  if (el) taskRefs.value.set(taskId, el)
}

// Markdown
function renderMarkdown(text) {
  if (!text) return ''
  try { return marked(text) } catch { return text }
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// ── FileNode 内部组件 ──────────────────────────────────
</script>

<style scoped>
/* ── 容器 ─────────────────────────────────────── */
.right-panel {
  width: 320px;
  min-width: 240px;
  max-width: 480px;
  height: 100%;
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.32s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}

.right-panel.collapsed {
  width: 36px;
  min-width: 36px;
  max-width: 36px;
}

/* ── 收起时：整面板变成竖条按钮 ──────────────── */
.collapsed-strip {
  width: 100%;
  height: 100%;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  padding: 20px 0;
  transition: background 0.2s, color 0.2s;
}
.collapsed-strip:hover {
  background: rgba(79, 126, 248, 0.06);
  color: var(--accent-blue);
}
.strip-arrow {
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.collapsed-strip:hover .strip-arrow { opacity: 1; }
.strip-label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  color: inherit;
}
.strip-badge {
  font-size: 10px;
  font-weight: 600;
  background: var(--border);
  color: var(--text-muted);
  padding: 3px 6px;
  border-radius: 10px;
  transition: background 0.3s, color 0.3s;
}
.strip-badge.active {
  background: rgba(240, 192, 64, 0.2);
  color: var(--accent-yellow);
  animation: pulse-dot 1.5s infinite;
}

/* ── 文件管理 section-header 收起按钮 ──────────── */
.collapse-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  flex-shrink: 0;
  margin-left: 2px;
}
.collapse-btn:hover {
  background: rgba(79, 126, 248, 0.08);
  color: var(--accent-blue);
  border-color: rgba(79, 126, 248, 0.3);
}

/* ── Section 通用 ─────────────────────────────── */
.panel-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.workflow-section {
  flex: 1;
  min-height: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-sidebar);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  flex: 1;
}

.section-action {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.section-action:hover { background: var(--bg-hover); color: var(--text-secondary); }

.section-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.section-body::-webkit-scrollbar { width: 4px; }
.section-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* ── 分割线 ─────────────────────────────────────── */
.resize-handle {
  height: 6px;
  background: var(--bg-app);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.resize-handle:hover { background: rgba(79,126,248,0.08); }
.handle-grip {
  display: flex;
  gap: 3px;
}
.handle-grip span {
  width: 16px;
  height: 2px;
  border-radius: 1px;
  background: var(--border);
}
.resize-handle:hover .handle-grip span { background: rgba(79,126,248,0.4); }

/* ── 空态 ─────────────────────────────────────── */
.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 80px;
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  gap: 4px;
}
.empty-sub { font-size: 10px; opacity: 0.6; }
.spin-icon { display: inline-block; animation: spin 1s linear infinite; }

/* ── 文件树 ─────────────────────────────────────── */
.files-body { padding: 8px; }
.file-list { display: flex; flex-direction: column; gap: 4px; }
.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: default;
  transition: background 0.15s;
}
.file-item:hover { background: var(--bg-hover); }
.file-icon { font-size: 16px; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.file-name {
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-meta {
  font-size: 10px;
  color: var(--text-muted);
}

/* ── 工作流 ─────────────────────────────────────── */
.workflow-body { padding: 10px 10px 16px; display: flex; flex-direction: column; gap: 8px; }

/* 阶段标签 */
.phase-chip {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 8px;
  font-weight: 600;
  white-space: nowrap;
}
.phase-chip.ceo-thinking { background: rgba(79,126,248,0.15); color: var(--accent-blue); }
.phase-chip.assigning { background: rgba(169,124,248,0.15); color: var(--accent-purple); }
.phase-chip.employees-working { background: rgba(76,175,125,0.15); color: var(--accent-green); }
.phase-chip.summarizing { background: rgba(240,192,64,0.15); color: var(--accent-yellow); }

.progress-chip {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-hover);
  padding: 2px 7px;
  border-radius: 8px;
}

/* 用户消息 */
.wf-user-msg {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 7px;
}
.wf-user-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(79,126,248,0.2);
  color: var(--accent-blue);
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  order: 2;
}
.wf-user-text {
  max-width: 85%;
  background: rgba(79,126,248,0.12);
  border: 1px solid rgba(79,126,248,0.2);
  border-radius: 8px 2px 8px 8px;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  word-break: break-word;
  order: 1;
}

/* 通用卡片 */
.wf-ceo-card, .wf-thinking-card, .wf-task-card, .wf-assigning-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  animation: fadeInUp 0.25s ease;
}

.wf-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border-light);
}

/* Avatar */
.wf-avatar {
  min-width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  position: relative;
}
.ceo-avatar {
  background: rgba(79,126,248,0.2);
  border: 1.5px solid rgba(79,126,248,0.5);
}
.wf-avatar-label {
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 7px;
  background: var(--accent-blue);
  color: white;
  border-radius: 3px;
  padding: 0 2px;
  font-weight: 700;
}
.emp-avatar {
  border: 1.5px solid transparent;
}
.wf-avatar-emoji {
  position: absolute;
  bottom: -3px;
  right: -3px;
  font-size: 11px;
}
.thinking-anim {
  background: rgba(79,126,248,0.15);
  border: 1.5px solid rgba(79,126,248,0.3);
  animation: thinking-pulse 2s infinite;
}

.wf-card-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.wf-role-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wf-role-title {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wf-time { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }

/* CEO 思考 */
.wf-thinking-badge {
  display: inline-flex;
  align-items: center;
  font-size: 9px;
  padding: 1px 6px;
  background: linear-gradient(90deg, #4f7ef8, #a97cf8);
  color: white;
  border-radius: 8px;
  font-weight: 600;
}
.wf-thinking-bar {
  height: 3px;
  background: var(--border);
  overflow: hidden;
  margin: 0 12px;
}
.wf-shimmer {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, var(--accent-blue), transparent);
  animation: shimmer 1.5s infinite;
}
.wf-thinking-text {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  padding: 8px 12px;
}
.wf-thinking-content {
  padding: 6px 12px 10px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
  max-height: 200px;
  overflow-y: auto;
}

/* 分配任务卡片 */
.wf-assigning-card {
  border-color: rgba(169,124,248,0.25);
}
.wf-assigning-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wf-assign-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 7px;
  background: rgba(169,124,248,0.04);
  border: 1px solid rgba(169,124,248,0.1);
  transition: background 0.15s;
}
.wf-assign-item:hover {
  background: rgba(169,124,248,0.08);
}
.wf-assign-avatar {
  min-width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  position: relative;
  background: rgba(255,255,255,0.05);
  border: 1.5px solid transparent;
}
.wf-assign-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wf-assign-name {
  font-size: 11px;
  font-weight: 600;
}
.wf-assign-task {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
  word-break: break-word;
}
.wf-assign-focus {
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
}
.wf-assign-status {
  font-size: 12px;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 2px;
}
.wf-assign-status.pending { opacity: 0.6; }
.wf-assign-status.working { animation: pulse-dot 1.5s infinite; }
.wf-assign-status.done { opacity: 0.8; }

/* 员工状态 */
.wf-status-icon { flex-shrink: 0; }
.status-working {
  display: flex;
  gap: 3px;
  align-items: center;
}
.status-working .dot {
  width: 5px;
  height: 5px;
  background: var(--accent-yellow);
  border-radius: 50%;
  animation: typing-bounce 1.2s infinite ease-in-out;
}
.status-working .dot:nth-child(2) { animation-delay: 0.15s; }
.status-working .dot:nth-child(3) { animation-delay: 0.3s; }
.status-done { color: var(--accent-green); font-size: 13px; font-weight: 700; }
.status-pending { font-size: 12px; opacity: 0.5; }

/* 任务描述 */
.wf-task-desc {
  padding: 6px 12px 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.wf-task-label { color: var(--text-muted); font-weight: 500; }
.wf-task-focus {
  padding: 4px 12px 6px;
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
}

/* 工具调用 */
.wf-tools {
  margin: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
}
.wf-tools-header {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 500;
  color: var(--accent-blue);
  cursor: pointer;
  transition: background 0.15s;
}
.wf-tools-header:hover { background: rgba(79,126,248,0.05); }
.wf-tools-list { padding: 4px 10px 8px; display: flex; flex-direction: column; gap: 4px; }
.wf-tool-item { display: flex; align-items: center; gap: 8px; }
.wf-tool-name { font-size: 11px; font-family: 'SF Mono', monospace; color: var(--text-secondary); flex: 1; }
.wf-tool-status { font-size: 9px; padding: 1px 5px; border-radius: 4px; }
.wf-tool-status.completed { background: rgba(76,175,125,0.15); color: var(--accent-green); }
.wf-tool-status.pending { background: rgba(240,192,64,0.15); color: var(--accent-yellow); }
.wf-tool-status.error { background: rgba(240,80,80,0.15); color: #f05b6b; }

/* 输出 */
.wf-output { margin: 8px 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.wf-output.streaming { border-color: rgba(76,175,125,0.3); }
.wf-output.done { border-color: rgba(76,175,125,0.2); }
.wf-output-done {
  color: var(--accent-green) !important;
  border-bottom: 1px solid var(--border-light);
}
.wf-done-icon {
  font-size: 10px;
  font-weight: 700;
}
.wf-output-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 10px;
  color: var(--accent-green);
  border-bottom: 1px solid var(--border-light);
}
.wf-stream-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-green);
  animation: pulse-dot 1s infinite;
}
.wf-output-body {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  max-height: 250px;
  overflow-y: auto;
  color: var(--text-secondary);
}

/* 加载中 */
.wf-loading { padding: 10px 12px; }
.wf-loading-bar { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
.wf-loading-shimmer {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, var(--accent-yellow), transparent);
  animation: shimmer 1.5s infinite;
}
.wf-loading span { font-size: 11px; color: var(--text-muted); }

/* CEO 卡片内容 */
.wf-card-body {
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  max-height: 300px;
  overflow-y: auto;
}

/* 底部汇总状态 */
.wf-footer-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(240,192,64,0.06);
  border: 1px solid rgba(240,192,64,0.15);
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}
.wf-footer-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-yellow);
  flex-shrink: 0;
  animation: pulse-dot 1.5s infinite;
}

/* Markdown */
:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) { font-size: 12px; margin: 6px 0 3px; font-weight: 600; }
:deep(.markdown-body p) { margin-bottom: 5px; }
:deep(.markdown-body ul), :deep(.markdown-body ol) { padding-left: 14px; }
:deep(.markdown-body li) { margin-bottom: 2px; }
:deep(.markdown-body code) { font-size: 10px; background: rgba(255,255,255,0.06); padding: 1px 4px; border-radius: 3px; }
:deep(.markdown-body pre) { background: var(--bg-app); border-radius: 6px; padding: 8px; overflow-x: auto; margin: 6px 0; }
:deep(.markdown-body pre code) { font-size: 10px; background: none; padding: 0; }

/* Animations */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes thinking-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(79,126,248,0.3); }
  50% { box-shadow: 0 0 0 6px rgba(79,126,248,0); }
}
@keyframes typing-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-5px); opacity: 1; }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
