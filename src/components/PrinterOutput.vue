<template>
  <div class="printer-container" :class="{ 'printing': isPrinting, 'finished': !isPrinting && displayedText.length === fullText.length }">
    <!-- 打印机头部 -->
    <div class="printer-header">
      <div class="printer-brand">
        <span class="printer-icon">🖨️</span>
        <span class="printer-name">CEO 打印机</span>
      </div>
      <div class="printer-status">
        <span v-if="isPrinting" class="status-light printing"></span>
        <span v-else class="status-light ready"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- 纸张区域 -->
    <div class="paper-container" ref="paperRef">
      <div class="paper">
        <!-- 页眉 -->
        <div class="paper-header">
          <div class="paper-title">📋 CEO 工作总结报告</div>
          <div class="paper-meta">
            <span>时间: {{ formatTime }}</span>
            <span>编号: {{ reportId }}</span>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="paper-divider">═══════════════════════════════════════</div>

        <!-- 打印内容 -->
        <div class="paper-content">
          <div 
            class="typewriter-text" 
            :class="{ 'cursor-blink': isPrinting }"
            v-html="renderedText"
          ></div>
          <span v-if="isPrinting" class="cursor">▋</span>
        </div>

        <!-- 页脚 -->
        <div class="paper-footer">
          <div class="paper-divider">═══════════════════════════════════════</div>
          <div class="paper-end">--- 报告结束 ---</div>
        </div>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="printer-controls">
      <button 
        v-if="isPrinting" 
        class="control-btn stop-btn"
        @click="stopPrinting"
      >
        ⏹ 停止打印
      </button>
      <button 
        v-else-if="displayedText.length === fullText.length"
        class="control-btn replay-btn"
        @click="replay"
      >
        🔄 重新打印
      </button>
      <button 
        class="control-btn copy-btn"
        @click="copyContent"
        :disabled="isPrinting"
      >
        📋 复制内容
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  speed: {
    type: Number,
    default: 30 // 每个字符的间隔毫秒
  },
  autoStart: {
    type: Boolean,
    default: true
  },
  soundEnabled: {
    type: Boolean,
    default: false // 默认关闭音效，需要用户手动开启
  }
})

const emit = defineEmits(['complete', 'start'])

// 状态
const displayedText = ref('')
const isPrinting = ref(false)
const currentIndex = ref(0)
const reportId = ref('')
let printTimer = null
let audioContext = null

const paperRef = ref(null)

// 纯文本内容（去除 markdown 标记用于打印）
const fullText = computed(() => {
  // 将 markdown 转换为纯文本用于逐字打印
  const html = marked.parse(props.content || '', { breaks: true, gfm: true })
  // 创建一个临时元素来提取纯文本
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
})

// 渲染后的 HTML（用于最终显示）
const renderedText = computed(() => {
  // 将已打印的文本转换为 HTML
  const html = marked.parse(displayedText.value, { breaks: true, gfm: true })
  return html
})

// 状态文本
const statusText = computed(() => {
  if (isPrinting.value) return '正在打印...'
  if (displayedText.value.length === fullText.value.length) return '打印完成'
  return '准备就绪'
})

// 格式化时间
const formatTime = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
})

// 生成报告编号
const generateReportId = () => {
  const date = new Date()
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CEO-${dateStr}-${randomStr}`
}

// 播放打字音效
const playTypeSound = () => {
  if (!props.soundEnabled || !audioContext) return
  
  try {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // 模拟机械键盘声音
    oscillator.frequency.value = 800 + Math.random() * 200
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.05)
  } catch (e) {
    // 忽略音频错误
  }
}

// 开始打印
const startPrinting = () => {
  if (isPrinting.value) return
  
  // 初始化音频上下文（需要用户交互）
  if (props.soundEnabled && !audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  
  isPrinting.value = true
  currentIndex.value = 0
  displayedText.value = ''
  reportId.value = generateReportId()
  
  emit('start')
  
  const printNextChar = () => {
    if (currentIndex.value < fullText.value.length) {
      const char = fullText.value[currentIndex.value]
      displayedText.value += char
      currentIndex.value++
      
      // 播放音效
      if (char !== ' ' && char !== '\n') {
        playTypeSound()
      }
      
      // 自动滚动到底部
      nextTick(() => {
        if (paperRef.value) {
          paperRef.value.scrollTop = paperRef.value.scrollHeight
        }
      })
      
      // 根据字符类型调整速度
      let delay = props.speed
      if (char === '\n') delay = props.speed * 3 // 换行稍微慢一点
      if (char === '。' || char === '！' || char === '？') delay = props.speed * 4 // 标点停顿
      if (char === '，' || char === '；') delay = props.speed * 2
      
      printTimer = setTimeout(printNextChar, delay)
    } else {
      isPrinting.value = false
      emit('complete')
    }
  }
  
  printNextChar()
}

// 停止打印
const stopPrinting = () => {
  if (printTimer) {
    clearTimeout(printTimer)
    printTimer = null
  }
  isPrinting.value = false
  // 显示完整内容
  displayedText.value = fullText.value
  emit('complete')
}

// 重新播放
const replay = () => {
  startPrinting()
}

// 复制内容
const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.content)
    alert('内容已复制到剪贴板')
  } catch (e) {
    console.error('复制失败:', e)
  }
}

// 监听内容变化
watch(() => props.content, (newContent) => {
  if (newContent && props.autoStart) {
    // 延迟一点开始，让用户看到效果
    setTimeout(startPrinting, 500)
  }
}, { immediate: true })

onUnmounted(() => {
  if (printTimer) {
    clearTimeout(printTimer)
  }
})
</script>

<style scoped>
.printer-container {
  background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
}

/* 打印机头部 */
.printer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;
}

.printer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.printer-icon {
  font-size: 20px;
}

.printer-name {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  letter-spacing: 0.5px;
}

.printer-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-light {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.status-light.printing {
  background: #4caf50;
  box-shadow: 0 0 8px #4caf50;
}

.status-light.ready {
  background: #2196f3;
  animation: none;
}

.status-text {
  font-size: 11px;
  color: #888;
}

/* 纸张区域 */
.paper-container {
  background: #f5f5dc;
  border-radius: 4px;
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

.paper {
  color: #333;
  line-height: 1.8;
}

.paper-header {
  text-align: center;
  margin-bottom: 16px;
}

.paper-title {
  font-size: 16px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.paper-meta {
  font-size: 10px;
  color: #666;
  display: flex;
  justify-content: center;
  gap: 16px;
}

.paper-divider {
  font-size: 12px;
  color: #999;
  text-align: center;
  margin: 12px 0;
  letter-spacing: 2px;
}

.paper-content {
  min-height: 100px;
  font-size: 13px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.typewriter-text {
  display: inline;
}

.typewriter-text :deep(p) {
  margin: 0 0 8px 0;
}

.typewriter-text :deep(ul),
.typewriter-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.typewriter-text :deep(li) {
  margin: 4px 0;
}

.typewriter-text :deep(h1),
.typewriter-text :deep(h2),
.typewriter-text :deep(h3) {
  font-size: 14px;
  font-weight: bold;
  margin: 12px 0 8px 0;
  color: #1a1a1a;
}

.typewriter-text :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.typewriter-text :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 11px;
}

.cursor {
  display: inline-block;
  color: #333;
  animation: blink 0.8s infinite;
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.paper-footer {
  margin-top: 16px;
  text-align: center;
}

.paper-end {
  font-size: 11px;
  color: #999;
  font-style: italic;
}

/* 控制按钮 */
.printer-controls {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.control-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.stop-btn {
  background: #f44336;
  color: white;
}

.stop-btn:hover {
  background: #d32f2f;
}

.replay-btn {
  background: #4caf50;
  color: white;
}

.replay-btn:hover {
  background: #388e3c;
}

.copy-btn {
  background: #2196f3;
  color: white;
}

.copy-btn:hover:not(:disabled) {
  background: #1976d2;
}

.copy-btn:disabled {
  background: #555;
  color: #888;
  cursor: not-allowed;
}

/* 动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 滚动条样式 */
.paper-container::-webkit-scrollbar {
  width: 6px;
}

.paper-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

.paper-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.paper-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 打印中的纸张抖动效果 */
.printer-container.printing .paper {
  animation: paperShake 0.05s infinite;
}

@keyframes paperShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(0.3px); }
  75% { transform: translateX(-0.3px); }
}

/* 完成状态 */
.printer-container.finished .paper {
  animation: none;
}
</style>
