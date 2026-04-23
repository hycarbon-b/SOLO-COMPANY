<template>
  <div v-if="visible" class="approval-overlay" @click.self="handleReject">
    <div class="approval-dialog">
      <div class="approval-header">
        <div class="approval-icon">🔐</div>
        <h3>需要授权</h3>
        <p class="approval-subtitle">OpenClaw 请求执行命令</p>
      </div>

      <div class="approval-content">
        <div class="command-section">
          <div class="section-label">请求执行的命令</div>
          <div class="command-box">
            <code>{{ request?.command }}</code>
          </div>
        </div>

        <div class="details-section">
          <div class="detail-item">
            <span class="detail-label">工作目录</span>
            <span class="detail-value">{{ request?.cwd || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">安全级别</span>
            <span class="detail-value" :class="request?.security">{{ securityLabel }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">过期时间</span>
            <span class="detail-value">{{ expiresAt }}</span>
          </div>
        </div>
      </div>

      <div class="approval-actions">
        <button class="btn btn-reject" @click="handleReject">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          拒绝
        </button>
        <button class="btn btn-approve" @click="handleApprove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          授权执行
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  request: {
    type: Object,
    default: null
  },
  approvalId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['approve', 'reject'])

const securityLabel = computed(() => {
  const map = {
    'allowlist': '白名单',
    'blocked': '已阻止',
    'dangerous': '危险操作'
  }
  return map[props.request?.security] || props.request?.security || '未知'
})

const expiresAt = computed(() => {
  if (!props.request?.expiresAtMs) return '-'
  const date = new Date(props.request.expiresAtMs)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

function handleApprove() {
  emit('approve', props.approvalId)
}

function handleReject() {
  emit('reject', props.approvalId)
}
</script>

<style scoped>
.approval-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.approval-dialog {
  background: var(--bg-sidebar, #1a1a2e);
  border: 1px solid var(--border, #2d2d44);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 85vh;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.approval-header {
  padding: 24px 24px 16px;
  text-align: center;
  border-bottom: 1px solid var(--border-light, #2d2d44);
}

.approval-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.approval-header h3 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.approval-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted, #888);
}

.approval-content {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
  max-height: calc(85vh - 200px);
}

.command-section {
  margin-bottom: 20px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.command-box {
  background: var(--bg-card, #16162a);
  border: 1px solid var(--border, #2d2d44);
  border-radius: 10px;
  padding: 14px 16px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.command-box code {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  color: var(--text-secondary, #ccc);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.detail-label {
  color: var(--text-muted, #888);
}

.detail-value {
  color: var(--text-secondary, #ccc);
  font-weight: 500;
}

.detail-value.allowlist {
  color: #4caf50;
}

.detail-value.blocked {
  color: #f44336;
}

.detail-value.dangerous {
  color: #ff9800;
}

.approval-actions {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid var(--border-light, #2d2d44);
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-reject {
  background: var(--bg-card, #16162a);
  color: var(--text-secondary, #ccc);
  border: 1px solid var(--border, #2d2d44);
}

.btn-reject:hover {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border-color: rgba(244, 67, 54, 0.3);
}

.btn-approve {
  background: linear-gradient(135deg, #4f7ef8, #3d6ce8);
  color: white;
  box-shadow: 0 4px 15px rgba(79, 126, 248, 0.3);
}

.btn-approve:hover {
  background: linear-gradient(135deg, #5a8af9, #4f7ef8);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(79, 126, 248, 0.4);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 滚动条样式 */
.approval-content::-webkit-scrollbar,
.command-box::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.approval-content::-webkit-scrollbar-track,
.command-box::-webkit-scrollbar-track {
  background: transparent;
}

.approval-content::-webkit-scrollbar-thumb,
.command-box::-webkit-scrollbar-thumb {
  background: var(--border, #2d2d44);
  border-radius: 3px;
}

.approval-content::-webkit-scrollbar-thumb:hover,
.command-box::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted, #888);
}
</style>
