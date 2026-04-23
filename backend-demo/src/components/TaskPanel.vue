<template>
  <aside class="task-panel" :class="{ collapsed: isCollapsed }">
    <!-- 收起状态：整个面板是一个可点击的细条 -->
    <button
      v-if="isCollapsed"
      class="collapsed-strip"
      @click="toggleCollapse"
      title="展开任务面板"
    >
      <svg
        class="strip-arrow"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M9 18l6-6-6-6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="strip-label">任务面板</span>
      <span
        v-if="hasTasks"
        class="strip-badge"
        :class="{ active: currentPhase === 'employees-working' }"
      >
        {{ completedCount }}/{{ totalCount }}
      </span>
    </button>

    <!-- 展开状态：完整面板内容 -->
    <div v-if="!isCollapsed" class="panel-content">
      <!-- 面板头部 -->
      <div class="panel-header">
        <div class="panel-left-flex">
          <div class="panel-title-row">
            <span class="panel-icon">📋</span>
            <span class="panel-title">任务面板</span>
          </div>
          <div class="panel-meta" v-if="hasTasks">
            <span class="phase-badge" :class="currentPhase">{{
              phaseLabel
            }}</span>
            <span class="task-counter">
              {{ completedCount }}/{{ totalCount }} 完成
            </span>
          </div>
        </div>
        <!-- 收起按钮 -->
        <button class="collapse-btn" @click="toggleCollapse" title="收起面板">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <!-- 统一内容列表（按时间排序） -->
      <div class="content-list" ref="contentListRef" @scroll="handleScroll">
        <!-- 空状态 -->
        <div v-if="!hasContent" class="panel-empty">
          <div class="empty-icon">🎯</div>
          <p>等待 CEO 分配任务...</p>
          <p class="empty-hint">CEO 会根据你的问题，自动分配任务给团队成员</p>
        </div>

        <!-- 按时间排序的混合内容列表 -->
        <template v-else>
          <div
            v-for="item in sortedContentList"
            :key="item._id"
            class="content-item"
            :class="item._type"
          >
            <!-- 用户消息 -->
            <template v-if="item._type === 'user-message'">
              <div class="item-header">
                <div class="item-avatar">
                  <span>👤</span>
                </div>
                <div class="item-meta">
                  <span class="item-role">你</span>
                  <span class="item-time" v-if="item._data.timestamp">{{
                    formatTime(item._data.timestamp)
                  }}</span>
                </div>
              </div>
              <div class="item-body">
                <div class="chat-text">{{ item._data.content }}</div>
              </div>
            </template>

            <!-- CEO 总结消息 -->
            <template v-else-if="item._type === 'ceo-summary'">
              <div class="item-header">
                <div class="item-avatar">
                  <span>👔</span>
                </div>
                <div class="item-meta">
                  <span class="item-role">CEO 总结</span>
                  <span class="item-time" v-if="item._data.timestamp">{{
                    formatTime(item._data.timestamp)
                  }}</span>
                </div>
              </div>
              <div class="item-body">
                <div
                  class="chat-text markdown-body"
                  v-html="renderMarkdown(item._data.content)"
                ></div>
              </div>
            </template>

            <!-- 任务卡片 -->
            <template v-else-if="item._type === 'task'">
              <!-- 任务头部 -->
              <div class="item-header">
                <div
                  class="item-avatar"
                  :class="{ 'thinking-avatar': item._data.isThinking }"
                  :style="{
                    background: getRoleColor(item._data.employeeId) + '22',
                    borderColor: getRoleColor(item._data.employeeId),
                  }"
                >
                  <span>{{ getRoleAvatar(item._data.employeeId) }}</span>
                </div>
                <div class="item-meta">
                  <span
                    class="item-role"
                    :class="{ 'thinking-role': item._data.isThinking }"
                    :style="{ color: getRoleColor(item._data.employeeId) }"
                  >
                    <span v-if="item._data.isThinking">🧠 </span>{{ getRoleName(item._data.employeeId) }} ·
                    {{ getRoleTitle(item._data.employeeId) }}
                    <!-- <span v-if="item._data.isThinking" class="thinking-badge">思考中</span> -->
                  </span>
                  <span class="item-status" :class="item._data.status">
                    <span v-if="item._data.status === 'pending'"
                      >⏳ 等待中</span
                    >
                    <span v-else-if="item._data.status === 'working'"
                      >⚙️ 执行中</span
                    >
                    <span v-else-if="item._data.status === 'done'"
                      >✅ 已完成</span
                    >
                  </span>
                </div>
              </div>

              <!-- 任务内容 -->
              <div class="item-body">
                <!-- CEO 思考任务显示简化信息 -->
                <div v-if="item._data.isThinking" class="thinking-task-info">
                  <div class="thinking-indicator">
                    <span class="thinking-pulse"></span>
                    <span class="thinking-text">{{ item._data.task }}</span>
                  </div>
                </div>
                <div v-else class="task-info">
                  <div class="task-description">
                    <span class="task-label">任务：</span>{{ item._data.task }}
                  </div>
                  <div v-if="item._data.focus" class="task-focus">
                    <span class="task-label">重点：</span>{{ item._data.focus }}
                  </div>
                </div>

                <!-- 工具调用信息 -->
                <div
                  v-if="item._data.toolCalls && item._data.toolCalls.length > 0"
                  class="task-tool-calls"
                >
                  <div
                    class="tool-calls-header"
                    @click="toggleToolExpand(item._data.id)"
                  >
                    <span class="tool-calls-tag"
                      >🔧 使用工具 ({{ item._data.toolCalls.length }})</span
                    >
                    <span class="tool-toggle">{{
                      expandedTools[item._data.id] ? "▼" : "▶"
                    }}</span>
                  </div>
                  <div
                    v-if="expandedTools[item._data.id]"
                    class="tool-calls-list"
                  >
                    <div
                      v-for="(tool, index) in item._data.toolCalls"
                      :key="tool.id || index"
                      class="tool-call-item"
                    >
                      <div class="tool-call-summary">
                        <span class="tool-name">{{
                          tool.function?.name || tool.name || "未知工具"
                        }}</span>
                        <span
                          v-if="tool.status"
                          class="tool-status"
                          :class="tool.status"
                          >{{ tool.status }}</span
                        >
                      </div>
                      <div class="tool-call-details">
                        <div
                          v-if="tool.function?.arguments || tool.arguments"
                          class="tool-section"
                        >
                          <div class="tool-section-title">参数：</div>
                          <pre class="tool-code">{{
                            formatToolArgs(
                              tool.function?.arguments || tool.arguments,
                            )
                          }}</pre>
                        </div>
                        <div
                          v-if="tool.result || tool.output"
                          class="tool-section"
                        >
                          <div class="tool-section-title">结果：</div>
                          <pre class="tool-code">{{
                            formatToolResult(tool.result || tool.output)
                          }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 员工回复 / 流式输出 -->
                <div
                  v-if="item._data.content"
                  class="task-result"
                  :class="{ streaming: item._data.status === 'working' }"
                >
                  <div
                    v-if="item._data.status === 'working'"
                    class="streaming-header"
                  >
                    <span class="streaming-tag">📝 实时输出</span>
                    <span class="streaming-indicator">
                      <span class="streaming-dot"></span>
                      输出中...
                    </span>
                  </div>
                  <div
                    :ref="(el) => setTaskContentRef(el, item._data.id)"
                    class="result-content markdown-body"
                    v-html="renderMarkdown(item._data.content)"
                  ></div>
                </div>

                <!-- 等待中动画 -->
                <div
                  v-else-if="item._data.status === 'working'"
                  class="task-loading"
                >
                  <div class="loading-bar">
                    <div class="loading-shimmer"></div>
                  </div>
                  <span class="loading-text">正在分析中...</span>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>

      <!-- 底部状态 -->
      <div v-if="currentPhase === 'summarizing'" class="panel-footer">
        <div class="footer-pulse"></div>
        <span>👔 CEO 正在汇总团队反馈...</span>
      </div>
    </div>
    <!-- end panel-content -->
  </aside>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { marked } from "marked";
import { COMPANY_ROLES, STRATEGY_ROLES } from "@/services/ai";

const props = defineProps({
  tasks: Array,
  currentPhase: String,
  messages: { type: Array, default: () => [] },
});

// 收缩状态
const isCollapsed = ref(false);
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

const contentListRef = ref(null);

// 是否用户正在向上滚动（停止自动滚动）
const isUserScrollingUp = ref(false);
let scrollTimeout = null;
let lastScrollTop = 0;

// 注意：初始滚动由 App.vue 统一控制，避免与 ChatRoom 不同步
// 组件内部只处理内容变化时的自动滚动

// 工具调用展开状态（按任务ID）
const expandedTools = ref({});

// 任务内容区域的 refs
const taskContentRefs = ref(new Map());
// 跟踪每个内容区域是否用户正在向上滚动
const taskContentScrollState = ref(new Map());

function toggleToolExpand(taskId) {
  expandedTools.value[taskId] = !expandedTools.value[taskId];
}

function setTaskContentRef(el, taskId) {
  if (el) {
    taskContentRefs.value.set(taskId, el);
    // 初始化滚动状态
    if (!taskContentScrollState.value.has(taskId)) {
      taskContentScrollState.value.set(taskId, {
        isScrollingUp: false,
        lastScrollTop: 0,
      });
    }
    // 绑定滚动事件
    el.onscroll = () => handleTaskContentScroll(taskId, el);
  }
}

// 处理任务内容区域的滚动事件
function handleTaskContentScroll(taskId, el) {
  const { scrollTop, scrollHeight, clientHeight } = el;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
  const state = taskContentScrollState.value.get(taskId) || {
    lastScrollTop: 0,
  };

  // 更新滚动状态
  taskContentScrollState.value.set(taskId, {
    isScrollingUp: !isAtBottom && scrollTop < state.lastScrollTop,
    lastScrollTop: scrollTop,
    isAtBottom,
  });
}

// 清理不存在的任务 ref
watch(
  () => props.tasks?.map((t) => t.id).join(","),
  () => {
    nextTick(() => {
      const validIds = new Set(props.tasks?.map((t) => t.id) || []);
      for (const [id] of taskContentRefs.value) {
        if (!validIds.has(id)) {
          taskContentRefs.value.delete(id);
          taskContentScrollState.value.delete(id);
        }
      }
    });
  },
);

// 滚动任务内容区域到底部，返回是否所有区域都在底部
function scrollTaskContentsToBottom() {
  let allAtBottom = true;

  taskContentRefs.value.forEach((el, taskId) => {
    if (!el) return;

    const state = taskContentScrollState.value.get(taskId) || {
      isScrollingUp: false,
    };
    const { scrollTop, scrollHeight, clientHeight } = el;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

    // 如果用户没有在向上滚动，或者已经在底部，则滚动到底部
    if (!state.isScrollingUp || isAtBottom) {
      if (scrollHeight > clientHeight) {
        el.scrollTo({
          top: scrollHeight,
          behavior: "smooth",
        });
      }
    }

    // 更新是否所有区域都在底部
    if (!isAtBottom) {
      allAtBottom = false;
    }
  });

  return allAtBottom;
}

function formatToolArgs(args) {
  if (!args) return "{}";
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return args;
    }
  }
  return JSON.stringify(args, null, 2);
}

function formatToolResult(result) {
  if (!result) return "无结果";
  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return result.slice(0, 500) + (result.length > 500 ? "..." : "");
    }
  }
  return JSON.stringify(result, null, 2);
}

const hasTasks = computed(() => props.tasks && props.tasks.length > 0);
const totalCount = computed(() => props.tasks?.length || 0);
const completedCount = computed(
  () => props.tasks?.filter((t) => t.status === "done").length || 0,
);

// 是否有任何内容（消息或任务）
const hasContent = computed(() => {
  return sortedContentList.value.length > 0;
});

// 按时间排序的混合内容列表 - 使用稳定的 key，不缓存对象
const sortedContentList = computed(() => {
  const items = [];

  // 添加用户消息
  const userMessages = (props.messages || []).filter((m) => m.from === "user");
  userMessages.forEach((msg) => {
    items.push({
      _id: `user-${msg.id}`,
      _type: "user-message",
      _data: msg,
    });
  });

  // 添加 CEO 总结消息（包括 isSummary 和 isInitial）
  const ceoSummaries = (props.messages || []).filter(
    (m) => m.from === "agent" && (m.isSummary || m.isInitial),
  );
  ceoSummaries.forEach((msg) => {
    items.push({
      _id: `ceo-${msg.id}`,
      _type: "ceo-summary",
      _data: msg,
    });
  });

  // 添加任务 - 只使用 task.id 作为 key，确保稳定
  const taskList = props.tasks || [];
  // console.log('[TaskPanel] Building sorted list, tasks:', taskList.length, 'messages:', props.messages?.length)
  taskList.forEach((task) => {
    items.push({
      _id: `task-${task.id}`,
      _type: "task",
      _data: task,
    });
  });

  // 按时间戳排序（保持稳定的排序顺序）
  const sorted = items.sort((a, b) => {
    const timeA = a._data.timestamp || 0;
    const timeB = b._data.timestamp || 0;
    return timeA - timeB;
  });
  // console.log('[TaskPanel] Sorted list length:', sorted.length)
  return sorted;
});

const phaseLabel = computed(() => {
  const map = {
    "ceo-thinking": "CEO 思考中",
    assigning: "分配任务",
    "employees-working": "员工执行中",
    summarizing: "CEO 汇总中",
  };
  return map[props.currentPhase] || "";
});

// 处理用户滚动事件
function handleScroll() {
  if (!contentListRef.value) return;

  const { scrollTop, scrollHeight, clientHeight } = contentListRef.value;
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;
  const isAtBottom = distanceToBottom < 30; // 30px 阈值

  // 检测滚动方向：scrollTop 减小表示向上滚动
  const isScrollingUp = scrollTop < lastScrollTop;
  lastScrollTop = scrollTop;

  if (isAtBottom) {
    // 用户在底部，恢复自动滚动
    isUserScrollingUp.value = false;
  } else if (isScrollingUp) {
    // 用户主动向上滚动（且不在底部），暂停自动滚动
    isUserScrollingUp.value = true;
    if (scrollTimeout) clearTimeout(scrollTimeout);
  }
  // 注意：如果用户向下滚动但还没到底部，保持当前状态
}

// 智能滚动：只有在用户没有向上滚动时才自动滚动
function smartScrollToBottom() {
  if (!contentListRef.value || isUserScrollingUp.value) return;

  contentListRef.value.scrollTo({
    top: contentListRef.value.scrollHeight,
    behavior: "smooth",
  });
}

// 强制滚动到底部（用于初始加载或与聊天区同步）
function forceScrollToBottom() {
  if (!contentListRef.value) return;

  contentListRef.value.scrollTo({
    top: contentListRef.value.scrollHeight,
    behavior: "auto",
  });
  isUserScrollingUp.value = false;
}

// 暴露方法给父组件
defineExpose({
  forceScrollToBottom,
  smartScrollToBottom,
});

// 自动滚动到底部
// 监听任务和消息数量变化
watch(
  () => [props.tasks?.length, props.messages?.length],
  () => {
    nextTick(smartScrollToBottom);
  },
  { deep: true },
);

// 监听任务内容变化（流式输出时）
watch(
  () => props.tasks?.map((t) => t.content),
  () => {
    nextTick(() => {
      // 先滚动内部内容区域，返回是否所有内容区域都在底部
      const allContentsAtBottom = scrollTaskContentsToBottom();
      // 只有所有内容区域都在底部时，才滚动外层面板
      if (allContentsAtBottom) {
        smartScrollToBottom();
      }
    });
  },
  { deep: true },
);

// 监听任务状态变化
watch(
  () => props.tasks?.map((t) => t.status),
  () => {
    nextTick(smartScrollToBottom);
  },
  { deep: true },
);

function renderMarkdown(text) {
  if (!text) return "";
  try {
    return marked.parse(text, { breaks: true, gfm: true });
  } catch {
    return text;
  }
}

function getRole(id) {
  // 先从 COMPANY_ROLES 查找，再从 STRATEGY_ROLES 查找
  return (
    COMPANY_ROLES.find((r) => r.id === id) ||
    STRATEGY_ROLES.find((r) => r.id === id)
  );
}
function getRoleName(id) {
  return getRole(id)?.name || id;
}
function getRoleTitle(id) {
  return getRole(id)?.title || "";
}
function getRoleAvatar(id) {
  return getRole(id)?.avatar || "??";
}
function getRoleColor(id) {
  return getRole(id)?.color || "#666";
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
</script>

<style scoped>
/* ── 面板容器 ──────────────────────────────────── */
.task-panel {
  position: relative;
  width: 500px;
  min-width: 500px;
  height: 100%;
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition:
    width 0.32s cubic-bezier(0.4, 0, 0.2, 1),
    min-width 0.32s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.32s ease;
}

.task-panel.collapsed {
  width: 36px;
  min-width: 36px;
  border-left-color: var(--border);
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
  transition:
    background 0.2s,
    color 0.2s;
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
.collapsed-strip:hover .strip-arrow {
  opacity: 1;
}
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
  transition:
    background 0.3s,
    color 0.3s;
}
.strip-badge.active {
  background: rgba(240, 192, 64, 0.2);
  color: var(--accent-yellow);
  animation: pulse-dot 1.5s infinite;
}

/* ── 面板头部收起按钮 ─────────────────────────── */
.collapse-btn {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s;
  flex-shrink: 0;
  margin-left: auto;
}
.collapse-btn:hover {
  background: rgba(79, 126, 248, 0.08);
  color: var(--accent-blue);
  border-color: rgba(79, 126, 248, 0.3);
}

/* ── 面板内容 ──────────────────────────────────── */
.panel-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Header */
.panel-header {
  /* padding: 16px 18px; */
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: 18px;
  padding-right: 18px;
}

.panel-left-flex {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.panel-icon {
  font-size: 18px;
}
.panel-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  flex: 1;
}
.panel-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.phase-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}
.phase-badge.ceo-thinking {
  background: rgba(79, 126, 248, 0.15);
  color: var(--accent-blue);
}
.phase-badge.assigning {
  background: rgba(169, 124, 248, 0.15);
  color: var(--accent-purple);
}
.phase-badge.employees-working {
  background: rgba(76, 175, 125, 0.15);
  color: var(--accent-green);
}
.phase-badge.summarizing {
  background: rgba(240, 192, 64, 0.15);
  color: var(--accent-yellow);
}
.task-counter {
  font-size: 11px;
  color: var(--text-muted);
}

/* Content List */
.content-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

/* 滚动条美化 */
.content-list::-webkit-scrollbar {
  width: 5px;
}
.content-list::-webkit-scrollbar-track {
  background: transparent;
}
.content-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}
.content-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Empty State */
.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}
.panel-empty p {
  font-size: 13px;
  margin-bottom: 4px;
}
.empty-hint {
  font-size: 11px !important;
  color: var(--text-muted);
  opacity: 0.6;
}

/* Content Item (通用) */
.content-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  animation: fadeInUp 0.3s ease;
  overflow: hidden;
  flex-shrink: 0;
}

/* Item Header */
.item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-light);
}
.item-avatar {
  min-width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  border: 1.5px solid transparent;
}
.item-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.item-role {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.item-time {
  font-size: 10px;
  color: var(--text-muted);
}
.item-status {
  font-size: 10px;
  color: var(--text-muted);
}
.item-status.working {
  color: var(--accent-yellow);
}
.item-status.done {
  color: var(--accent-green);
}

/* Item Body */
.item-body {
  padding: 12px 14px;
}

/* Chat Item */
.chat-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  word-break: break-word;
}

/* User Message */
.content-item.user-message .item-avatar {
  background: rgba(79, 126, 248, 0.15);
}

/* CEO Summary Item */
.content-item.ceo-summary {
  border-color: rgba(79, 126, 248, 0.3);
  background: rgba(79, 126, 248, 0.05);
}
.content-item.ceo-summary .item-avatar {
  background: rgba(79, 126, 248, 0.2);
  border-color: #4f7ef8;
}
.content-item.ceo-summary .item-role {
  color: #4f7ef8;
  font-weight: 600;
}

/* Task Info */
.task-info {
  margin-bottom: 10px;
}
.task-info:last-child {
  margin-bottom: 0;
}
.task-description,
.task-focus {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 4px;
}
.task-description:last-child,
.task-focus:last-child {
  margin-bottom: 0;
}
.task-label {
  color: var(--text-muted);
  font-weight: 500;
}
.task-focus {
  font-size: 11px;
  color: var(--text-muted);
}

/* Tool Calls */
.task-tool-calls {
  margin-top: 10px;
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
  font-family: "SF Mono", Monaco, monospace;
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
  font-family: "SF Mono", Monaco, monospace;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Task Result */
.task-result {
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(76, 175, 125, 0.05);
  overflow: hidden;
}
.task-result.streaming {
  background: rgba(76, 175, 125, 0.03);
  border-color: rgba(76, 175, 125, 0.2);
}
.streaming-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
}
.streaming-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-green);
}
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-muted);
}
.streaming-dot {
  width: 6px;
  height: 6px;
  background: var(--accent-green);
  border-radius: 50%;
  animation: pulse-dot 1s infinite;
}
.result-content {
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
}
.result-content :deep(h1),
.result-content :deep(h2),
.result-content :deep(h3) {
  font-size: 13px;
  margin: 8px 0 4px;
}
.result-content :deep(p) {
  margin-bottom: 6px;
}
.result-content :deep(ul),
.result-content :deep(ol) {
  padding-left: 16px;
}
.result-content :deep(code) {
  font-size: 11px;
}
.result-content :deep(pre code) {
  font-size: 10px;
}

/* Loading */
.task-loading {
  margin-top: 10px;
}
.loading-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}
.loading-shimmer {
  height: 100%;
  width: 40%;
  background: linear-gradient(
    90deg,
    transparent,
    var(--accent-yellow),
    transparent
  );
  animation: shimmer 1.5s infinite;
}
.loading-text {
  font-size: 11px;
  color: var(--text-muted);
}

/* Footer */
.panel-footer {
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.footer-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-yellow);
  animation: pulse-dot 1.5s infinite;
}

/* CEO 思考任务样式 */
.thinking-avatar {
  animation: thinking-pulse 2s infinite;
}
@keyframes thinking-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(79, 126, 248, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(79, 126, 248, 0);
    transform: scale(1.05);
  }
}
.thinking-role {
  display: flex;
  align-items: center;
  gap: 6px;
}
.thinking-badge {
  font-size: 9px;
  padding: 2px 6px;
  background: linear-gradient(90deg, #4f7ef8, #a97cf8);
  color: white;
  border-radius: 10px;
  font-weight: 500;
}
.thinking-task-info {
  margin-bottom: 10px;
}
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(79, 126, 248, 0.08);
  border-radius: 8px;
  border-left: 3px solid #4f7ef8;
}
.thinking-pulse {
  width: 8px;
  height: 8px;
  background: #4f7ef8;
  border-radius: 50%;
  animation: pulse-dot 1.5s infinite;
}
.thinking-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(250%);
  }
}
@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
