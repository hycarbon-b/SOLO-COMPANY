import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import {
  COMPANY_ROLES,
  STRATEGY_ROLES,
  ceoAnalyzeAndAssign,
  employeeExecuteTask,
  ceoSummarize,
  strategyCEOAnalyzeAndAssign,
  strategyExpertExecuteTask,
  strategyCEOSummarize,
  checkAPIStatus
} from '@/services/ai'
import { abortAllRequests, setGlobalMessageUpdater } from '@/services/openclawGateway'
import {
  STORES,
  saveToStore,
  loadFromStore,
  saveSetting,
  loadSetting,
  isIndexedDBAvailable,
  saveConvMessages,
  loadConvMessages,
  saveConvTasks,
  loadConvTasks,
  deleteConvData
} from '@/services/indexedDB'

export const useChatStore = defineStore('chat', () => {
  // ===== State =====
  const ceoMessages = ref([])        // CEO 统筹模式的消息
  const normalMessages = ref([])     // OpenClaw 直聊模式的消息
  const privateMessages = ref({})    // 私聊消息：{ roleId: [messages] }
  const strategyMessages = ref([])   // CEO 统筹策略模式的消息
  const currentChatMode = ref('ceo') // 当前显示的消息模式：'ceo' | 'normal' | 'private' | 'strategy'
  const privateChatTarget = ref(null) // 当前私聊对象 roleId
  const previousChatMode = ref('ceo') // 进入私聊前的模式，用于返回
  const tasks = ref([])              // CEO 统筹模式的员工任务
  const strategyTasks = ref([])      // CEO 统筹策略模式的专家任务
  const taskHistory = ref([])        // 历史任务记录（可查看）
  const isLoading = ref(false)       // 是否有请求在进行（全局，只要有一个会话在加载就为 true）
  const loadingConvId = ref(null)    // 正在加载的会话 ID（按会话隔离）
  // 每个会话独立的加载状态集合（支持多会话并发发消息）
  const loadingConvIds = ref(new Set())
  function _setConvLoading(convId, loading) {
    const s = new Set(loadingConvIds.value)
    if (loading) s.add(convId)
    else s.delete(convId)
    loadingConvIds.value = s
    isLoading.value = s.size > 0
    if (loading) loadingConvId.value = convId
  }
  const apiConnected = ref(false)    // API 是否可用
  const currentPhase = ref('idle')   // idle | ceo-thinking | assigning | employees-working | summarizing
  const ceoTyping = ref(false)       // CEO 是否在"打字"
  const showTaskHistory = ref(false) // 是否显示任务历史面板

  // ===== 已保存文件列表 =====
  // 当 AI 通过 tool_calls 创建/写入文件时自动收集
  const savedFiles = ref([])

  // 从 tool_calls 中提取文件信息并更新 savedFiles
  function extractFilesFromToolCalls(toolCalls) {
    if (!toolCalls?.length) return
    console.log('[extractFiles] Called with', toolCalls.length, 'tool calls')
    toolCalls.forEach((tc, idx) => {
      const toolName = tc.name || tc.function?.name || ''
      console.log(`[extractFiles] Tool #${idx}: name="${toolName}", keys=${Object.keys(tc).join(',')}`)
      console.log(`[extractFiles] Tool #${idx} raw:`, JSON.stringify(tc).slice(0, 500))

      // 尝试从参数中提取文件路径——多层级解析
      let args = {}
      try {
        // 优先级：function.arguments > arguments > meta.params > meta.args > meta.arguments
        let argsStr = tc.function?.arguments || tc.arguments || tc.meta?.params || tc.meta?.args || tc.meta?.arguments || '{}'
        args = typeof argsStr === 'string' ? JSON.parse(argsStr) : (argsStr || {})
      } catch (e) {
        console.warn(`[extractFiles] Tool #${idx} args parse error:`, e.message)
      }
      console.log(`[extractFiles] Tool #${idx} parsed args:`, JSON.stringify(args).slice(0, 300))

      // 尝试从结果中提取文件路径——多层级解析
      let result = {}
      try {
        let resultStr = tc.result || tc.meta?.result || tc.meta?.output || tc.meta?.response || tc.meta?.data || '{}'
        result = typeof resultStr === 'string' ? JSON.parse(resultStr) : (resultStr || {})
      } catch (e) {
        console.warn(`[extractFiles] Tool #${idx} result parse error:`, e.message)
      }
      console.log(`[extractFiles] Tool #${idx} parsed result:`, JSON.stringify(result).slice(0, 300))

      // ---- 文件写入工具 ----
      // 支持多种工具名：write_to_file, write_file, create_file, save_file, replace_in_file, write
      const fileWriteTools = ['write_to_file', 'write_file', 'create_file', 'save_file', 'replace_in_file', 'write']
      const isFileWrite = fileWriteTools.some(t => toolName === t || toolName.includes(t))
      if (isFileWrite) {
        // 支持多种参数名：filePath, file_path, path, target_file, filename, file
        const filePath = args.filePath || args.file_path || args.path || args.target_file || args.filename || args.file || ''
        console.log(`[extractFiles] File write tool detected, filePath="${filePath}"`)
        if (!filePath) return
        addFileEntry(filePath, toolName, args.content?.length || 0)
        return
      }

      // ---- 图片生成工具 ----
      const imageTools = ['image_gen', 'generate_image', 'create_image', 'dalle', 'text_to_image']
      if (imageTools.some(t => toolName.includes(t)) || /image|img|画|图/.test(toolName)) {
        // 优先从结果中找路径，其次从参数中找
        const imagePath = result.filePath || result.file_path || result.path || result.url || result.image_path
          || args.filePath || args.file_path || args.path || args.output_dir || args.output_path || ''
        if (imagePath) {
          addFileEntry(imagePath, toolName, result.size || 0)
        } else {
          // 没有路径信息，用 prompt 作为名称
          const prompt = args.prompt || args.text || result.prompt || ''
          if (prompt) {
            addFileEntry(`generated-images/${prompt.slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.png`, toolName, 0, prompt.slice(0, 50))
          }
        }
        return
      }

      // ---- 通用文件相关工具（结果中包含文件路径） ----
      if (result.filePath || result.file_path || result.path || result.output) {
        const filePath = result.filePath || result.file_path || result.path || result.output
        if (typeof filePath === 'string' && filePath.includes('/')) {
          addFileEntry(filePath, toolName, result.size || 0)
        }
      }
    })
  }

  // 从 AI 文本回复中提取文件路径（兜底方案）
  // 当 tool_calls 事件无法通过 WebSocket 传递时，从 AI 文本中正则匹配文件路径
  function extractFilesFromText(text) {
    if (!text || typeof text !== 'string') return
    console.log('[extractFilesFromText] Scanning text, length:', text.length)

    // 常见模式：
    // 1. "保存到 /path/to/file" 或 "已保存到 /path/to/file"
    // 2. "Successfully wrote ... to /path/to/file"
    // 3. "📄 **xxx.txt**" 后跟路径
    // 4. "文件已保存：/path/to/file"
    // 5. Markdown 代码块中的路径

    // 匹配绝对路径（macOS/Linux）
    const pathPatterns = [
      // "保存到/写入到/保存至 + 路径" 模式
      /(?:保存到|保存至|写入到|已保存到|saved to|wrote to|written to|保存：|保存:)\s*(`?)(\/[^\s`"')\]]+\.[a-zA-Z0-9]{1,10})\1/gi,
      // "Successfully wrote ... to /path" 模式
      /Successfully wrote \d+ bytes to (\/[^\s`"')\]]+)/gi,
      // 独立的绝对路径（后面跟着常见扩展名）
      /(?<!\w)(\/(?:Users|home|tmp|var|etc|opt)\/[^\s`"')\]]+\.(?:txt|md|json|js|ts|vue|html|css|py|java|go|rs|csv|sql|xml|yaml|yml|toml|sh|env|conf|pdf|docx|xlsx|pptx|png|jpg|jpeg|gif|svg|webp|mp4|mp3|wav|zip|tar|gz))\b/gi,
    ]

    const foundPaths = new Set()
    for (const pattern of pathPatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const path = match[2] || match[1] || match[0]
        // 清理路径
        const cleanPath = path.replace(/[`"')\]]+$/, '').trim()
        if (cleanPath && cleanPath.includes('/') && cleanPath.length > 5) {
          foundPaths.add(cleanPath)
        }
      }
    }

    if (foundPaths.size > 0) {
      console.log('[extractFilesFromText] Found paths:', [...foundPaths])
      foundPaths.forEach(filePath => {
        // 推断工具名
        const fileName = filePath.split('/').pop() || ''
        const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''
        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']
        const toolName = imageExts.includes(ext) ? 'image_gen' : 'write'
        addFileEntry(filePath, toolName, 0)
      })
    }
  }

  // 添加文件条目到 savedFiles（去重）
  function addFileEntry(filePath, toolName, size, displayName) {
    // 提取文件名
    const fileName = displayName || filePath.split('/').pop() || filePath
    // 判断文件类型
    const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''
    const icon = getFileIcon(ext)

    // 避免重复添加
    if (savedFiles.value.some(f => f.path === filePath)) return

    savedFiles.value.push({
      name: fileName,
      path: filePath,
      ext,
      icon,
      toolName,
      timestamp: Date.now(),
      size
    })
  }

  // 根据文件扩展名返回图标
  function getFileIcon(ext) {
    const iconMap = {
      js: '📜', ts: '📜', vue: '💚', html: '🌐', css: '🎨', json: '📋',
      md: '📝', txt: '📄', py: '🐍', java: '☕', go: '🐹', rs: '🦀',
      png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🎨', webp: '🖼️',
      pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙',
      csv: '📊', sql: '🗃️', xml: '📋', yaml: '📋', yml: '📋', toml: '📋',
      sh: '⚙️', bat: '⚙️', env: '⚙️', conf: '⚙️', cfg: '⚙️',
      zip: '📦', tar: '📦', gz: '📦', mp4: '🎬', mp3: '🎵', wav: '🎵'
    }
    return iconMap[ext] || '📄'
  }

  // ===== 多会话管理 =====
  // 会话列表：每个条目代表一次独立的 CEO 对话
  // { id, title, mode, createdAt, lastMessageAt, preview }
  const conversations = ref([])
  const currentConversationId = ref(null)
  // 待确认的新会话 ID：新建但用户还没发消息的会话，切换走时自动清理
  const pendingConvId = ref(null)
  // 待确认会话的元信息，正式加入列表时使用
  let _pendingConvMeta = null

  // ===== 后台会话缓冲区 =====
  // 当用户切换会话时，正在流式写入的旧会话需要继续接收数据
  // key: convId, value: { messages: [], tasks: [], mode: string }
  const backgroundConvBuffers = new Map()

  // ===== Computed =====
  // 根据当前模式返回对应的消息列表
  const messages = computed(() => {
    if (currentChatMode.value === 'normal') return normalMessages.value
    if (currentChatMode.value === 'private') {
      const target = privateChatTarget.value
      if (!target) return []
      if (!privateMessages.value[target]) {
        privateMessages.value[target] = []
      }
      return privateMessages.value[target]
    }
    if (currentChatMode.value === 'strategy') return strategyMessages.value
    return ceoMessages.value
  })
  const messageCount = computed(() => messages.value.length)
  
  // 是否在私聊模式
  const isPrivateMode = computed(() => currentChatMode.value === 'private')
  // 当前会话是否正在加载（按会话隔离：只有加载的是当前会话时才禁用输入框）
  // 当前会话是否正在加载（按会话隔离：只有加载的是当前会话时才禁用输入框）
  const activeConvLoading = computed(() => loadingConvIds.value.has(currentConversationId.value ?? ''))
  // 当前私聊对象信息（支持 CEO 团队成员和策略专家）
  const privateChatTargetInfo = computed(() => {
    if (!privateChatTarget.value) return null
    // 先从 COMPANY_ROLES 查找，再从 STRATEGY_ROLES 查找
    return COMPANY_ROLES.find(r => r.id === privateChatTarget.value) 
      || STRATEGY_ROLES.find(r => r.id === privateChatTarget.value) 
      || null
  })

  // 最近对话（用于上下文）
  const recentConversation = computed(() =>
    messages.value.slice(-12).map(m => ({
      from: m.from,
      content: m.content,
      roleId: m.roleId
    }))
  )

  // 切换对话模式
  async function switchChatMode(mode, targetRoleId = null) {
    const start = performance.now()
    if (mode !== 'ceo' && mode !== 'normal' && mode !== 'private' && mode !== 'strategy') return

    currentChatMode.value = mode
    if (mode === 'private') {
      privateChatTarget.value = targetRoleId
    } else {
      privateChatTarget.value = null
    }

    console.log('[SwitchMode] set mode took', (performance.now() - start).toFixed(2), 'ms')

    const t1 = performance.now()
    await saveModeToStorage()
    console.log('[SwitchMode] saveMode took', (performance.now() - t1).toFixed(2), 'ms')

    // 如果新模式的列表为空，添加欢迎消息
    const t2 = performance.now()
    if (mode === 'ceo' && ceoMessages.value.length === 0) {
      ceoMessages.value.push({
        id: generateId(),
        from: 'system',
        content: '你和 CEO Alex Chen 直接对话。CEO 会根据问题自动分配任务给团队成员，处理过程在右侧面板实时展示。\n\n有问题尽管问！',
        timestamp: Date.now()
      })
      await saveToStorage()
    } else if (mode === 'normal' && normalMessages.value.length === 0) {
      normalMessages.value.push({
        id: generateId(),
        from: 'system',
        content: '直接与 AI 对话，不经过 CEO 流程。适合快速咨询、日常问答。\n\n有问题尽管问！',
        timestamp: Date.now()
      })
      await saveToStorage()
    } else if (mode === 'private' && targetRoleId) {
      const role = COMPANY_ROLES.find(r => r.id === targetRoleId)
      if (role && (!privateMessages.value[targetRoleId] || privateMessages.value[targetRoleId].length === 0)) {
        const historyMsgs = []

        // 从 CEO 模式任务历史中，提取该员工历史回复作为上下文
        const pastTasks = tasks.value.filter(t => t.employeeId === targetRoleId && t.content && t.status === 'done')
        if (pastTasks.length > 0) {
          historyMsgs.push({
            id: generateId(),
            from: 'system',
            content: `以下是 ${role.name.split(' ')[0]} 之前在团队工作中的回复记录，你可以继续向他/她提问。`,
            timestamp: Date.now() - pastTasks.length * 1000 - 1000
          })
          pastTasks.forEach((t, i) => {
            historyMsgs.push({
              id: generateId(),
              from: 'agent',
              role: role,  // ChatMessage 组件读取的是 message.role
              content: t.content,
              timestamp: t.timestamp || (Date.now() - (pastTasks.length - i) * 1000),
              isHistory: true  // 标记为历史记录，区分新消息
            })
          })
        } else {
          historyMsgs.push({
            id: generateId(),
            from: 'system',
            content: `${role.title}。你可以直接向 ${role.name.split(' ')[0]} 提问，获得专业建议。`,
            timestamp: Date.now()
          })
        }

        privateMessages.value[targetRoleId] = historyMsgs
        await saveToStorage()
      }
    } else if (mode === 'strategy' && strategyMessages.value.length === 0) {
      strategyMessages.value.push({
        id: generateId(),
        from: 'system',
        content: '五位专业分析师将协同为你提供股票/板块/市场的投资分析：\n\n• 张明远（宏观分析师）— 宏观经济与政策解读\n• 李技术分析（技术分析师）— K线形态与技术指标\n• 王基本面（基本面分析师）— 财务分析与估值\n• 陈行业（行业研究员）— 行业景气与产业链\n• 刘风控（风险控制师）— 风险评估与仓位管理\n\n适合个股分析、板块研究、大势判断等投资需求。',
        timestamp: Date.now()
      })
      await saveToStorage()
    }
    console.log('[SwitchMode] welcome msg took', (performance.now() - t2).toFixed(2), 'ms')
    console.log('[SwitchMode] total took', (performance.now() - start).toFixed(2), 'ms')
  }
  
  // 进入私聊模式
  function startPrivateChat(roleId) {
    // 记录当前模式，以便返回
    previousChatMode.value = currentChatMode.value
    switchChatMode('private', roleId)
  }

  // 退出私聊模式，返回到之前的模式
  function exitPrivateChat() {
    // 返回到进入私聊前的模式（ceo 或 strategy）
    const returnMode = previousChatMode.value === 'strategy' ? 'strategy' : 'ceo'
    switchChatMode(returnMode)
  }

  // 当前模式下的任务列表
  const currentTasks = computed(() => {
    const result = currentChatMode.value === 'strategy' ? strategyTasks.value : tasks.value
    console.log('[currentTasks] mode:', currentChatMode.value, 'tasks count:', result.length)
    return result
  })
  // 当前正在执行的员工任务列表
  const activeTasks = computed(() => currentTasks.value.filter(t => t.status === 'pending' || t.status === 'working'))
  const completedTasks = computed(() => currentTasks.value.filter(t => t.status === 'done'))

  // ===== 多会话 Actions =====

  /** 保存当前会话的消息和任务到 IndexedDB */
  async function saveCurrentConvData() {
    const convId = currentConversationId.value
    if (!convId) return
    // 立即快照所有值，避免 async 期间被修改
    const mode = currentChatMode.value
    const activeMsgs = mode === 'strategy'
      ? [...strategyMessages.value]
      : mode === 'normal'
        ? [...normalMessages.value]
        : [...ceoMessages.value]
    const activeTasks = mode === 'strategy'
      ? [...strategyTasks.value]
      : [...tasks.value]

    console.log(`[Conv] saveCurrentConvData: convId=${convId}, mode=${mode}, msgs=${activeMsgs.length}, tasks=${activeTasks.length}`)

    try {
      if (isIndexedDBAvailable()) {
        await Promise.all([
          saveConvMessages(convId, activeMsgs),
          saveConvTasks(convId, activeTasks)
        ])
      } else {
        localStorage.setItem(`conv-msgs-${convId}`, JSON.stringify(activeMsgs.slice(-100)))
        localStorage.setItem(`conv-tasks-${convId}`, JSON.stringify(activeTasks))
      }
    } catch (e) {
      console.error('[Conv] Save data error:', e)
    }
  }

  /** 加载指定会话的消息和任务 */
  async function loadConvData(convId) {
    try {
      const conv = conversations.value.find(c => c.id === convId)
      const mode = conv?.mode || 'ceo'

      let msgs = []
      let taskList = []

      if (isIndexedDBAvailable()) {
        const [loadedMsgs, loadedTasks] = await Promise.all([
          loadConvMessages(convId),
          loadConvTasks(convId)
        ])
        msgs = loadedMsgs
        taskList = loadedTasks
      } else {
        const msgsStr = localStorage.getItem(`conv-msgs-${convId}`)
        const tasksStr = localStorage.getItem(`conv-tasks-${convId}`)
        msgs = msgsStr ? JSON.parse(msgsStr) : []
        taskList = tasksStr ? JSON.parse(tasksStr) : []
      }

      console.log(`[Conv] loadConvData: convId=${convId}, mode=${mode}, msgs=${msgs.length}, tasks=${taskList.length}`)

      // 迁移消息格式（roleInfo → role）
      msgs = msgs.map(migrateMessageRole)

      // 先清空所有模式的消息，避免残留
      ceoMessages.value = []
      normalMessages.value = []
      strategyMessages.value = []
      tasks.value = []
      strategyTasks.value = []

      // 写入对应的 mode 消息
      if (mode === 'strategy') {
        strategyMessages.value = msgs
        strategyTasks.value = taskList
      } else if (mode === 'normal') {
        normalMessages.value = msgs
        // normal 模式无任务，tasks 已在上面清空
      } else {
        ceoMessages.value = msgs
        tasks.value = taskList
      }

      console.log(`[Conv] After loadConvData: ceo=${ceoMessages.value.length}, normal=${normalMessages.value.length}, strategy=${strategyMessages.value.length}`)

      // 根据任务状态推断 currentPhase，确保右侧工作流面板正确显示
      if (taskList.length > 0) {
        const hasWorking = taskList.some(t => t.status === 'pending' || t.status === 'working')
        if (hasWorking) {
          currentPhase.value = 'employees-working'
        } else if (taskList.every(t => t.status === 'done')) {
          // 所有任务都已完成，保持 idle 但任务仍然可见
          currentPhase.value = 'idle'
        } else {
          currentPhase.value = 'idle'
        }
      } else {
        currentPhase.value = 'idle'
      }
      ceoTyping.value = false
    } catch (e) {
      console.error('[Conv] Load data error:', e)
      ceoTyping.value = false
    }
  }

  /**
   * 获取指定会话的消息数组引用（响应式或缓冲区）
   * 如果是当前会话，返回响应式变量；如果是后台会话，返回缓冲区中的数组
   */
  function getConvMessages(convId) {
    if (convId === currentConversationId.value) {
      const mode = currentChatMode.value
      if (mode === 'normal') return normalMessages
      if (mode === 'strategy') return strategyMessages
      return ceoMessages
    }
    // 后台会话，从缓冲区获取
    const buffer = backgroundConvBuffers.get(convId)
    if (buffer) return { value: buffer.messages }
    return null
  }

  /**
   * 获取指定会话的任务数组引用（响应式或缓冲区）
   */
  function getConvTasks(convId) {
    if (convId === currentConversationId.value) {
      const mode = currentChatMode.value
      if (mode === 'strategy') return strategyTasks
      return tasks
    }
    const buffer = backgroundConvBuffers.get(convId)
    if (buffer) return { value: buffer.tasks }
    return null
  }

  /**
   * 获取指定会话的模式
   */
  function getConvMode(convId) {
    if (convId === currentConversationId.value) return currentChatMode.value
    const buffer = backgroundConvBuffers.get(convId)
    if (buffer) return buffer.mode
    const conv = conversations.value.find(c => c.id === convId)
    return conv?.mode || 'ceo'
  }

  /**
   * 将流式数据写入到指定会话的消息数组
   * 支持当前会话（响应式更新 UI）和后台会话（写入缓冲区）
   */
  function updateConvMessage(convId, msgId, updates) {
    const msgsRef = getConvMessages(convId)
    if (!msgsRef) return
    const msgs = msgsRef.value
    const idx = msgs.findIndex(m => m.id === msgId)
    if (idx !== -1) {
      msgs[idx] = { ...msgs[idx], ...updates }
    }
  }

  /**
   * 将流式数据写入到指定会话的任务数组
   */
  function updateConvTask(convId, taskId, updates) {
    const tasksRef = getConvTasks(convId)
    if (!tasksRef) return
    const taskList = tasksRef.value
    const idx = taskList.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      taskList[idx] = { ...taskList[idx], ...updates }
    }
  }

  /**
   * 向指定会话的消息数组 push 一条新消息
   */
  function pushConvMessage(convId, msg) {
    const msgsRef = getConvMessages(convId)
    if (!msgsRef) return
    msgsRef.value.push(msg)
  }

  /**
   * 保存后台缓冲区会话数据到 IndexedDB
   */
  async function flushBackgroundBuffer(convId) {
    const buffer = backgroundConvBuffers.get(convId)
    if (!buffer) return
    try {
      await Promise.all([
        saveConvMessages(convId, buffer.messages),
        saveConvTasks(convId, buffer.tasks)
      ])
      console.log(`[BackgroundBuffer] Flushed conv ${convId}: msgs=${buffer.messages.length}, tasks=${buffer.tasks.length}`)
    } catch (e) {
      console.error(`[BackgroundBuffer] Flush error for conv ${convId}:`, e)
    }
  }

  /**
   * 清理后台缓冲区（保存后移除）
   */
  async function cleanupBackgroundBuffer(convId) {
    await flushBackgroundBuffer(convId)
    backgroundConvBuffers.delete(convId)
    console.log(`[BackgroundBuffer] Cleaned up conv ${convId}`)
  }

  /** 新建一个 CEO 模式对话，切换到该对话 */
  async function newConversation(mode = 'ceo') {
    console.log(`[Conv] newConversation: mode=${mode}, currentConvId=${currentConversationId.value}`)

    // 如果有正在进行的 AI 请求，将其数据移入后台缓冲区（不中止）
    const oldConvId = currentConversationId.value
    if (oldConvId && loadingConvIds.value.has(oldConvId)) {
      const oldMode = currentChatMode.value
      const oldMsgs = oldMode === 'strategy' ? [...strategyMessages.value]
        : oldMode === 'normal' ? [...normalMessages.value]
        : [...ceoMessages.value]
      const oldTasks = oldMode === 'strategy' ? [...strategyTasks.value] : [...tasks.value]
      backgroundConvBuffers.set(oldConvId, { messages: oldMsgs, tasks: oldTasks, mode: oldMode })
      console.log(`[Conv] Moving conv ${oldConvId} to background buffer (still loading)`)
    }

    // 先保存当前会话（如果正在流式传输，数据已在缓冲区，跳过保存）
    if (!loadingConvIds.value.has(currentConversationId.value)) {
      await saveCurrentConvData()
    }

    // 如果当前是 pending 会话（没发过消息），清理掉
    if (pendingConvId.value) {
      await deleteConvData(pendingConvId.value)
      pendingConvId.value = null
    }

    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const modeLabels = { ceo: 'CEO 统筹', strategy: 'A股策略', normal: 'AI 直聊' }
    const modeIcons = { ceo: '👔', strategy: '📈', normal: '🤖' }

    // 暂不加入 conversations 列表，等用户发消息后再加入
    currentConversationId.value = id
    pendingConvId.value = id

    // 保存临时会话元信息，等正式加入列表时使用
    _pendingConvMeta = {
      id,
      title: `新对话`,
      mode,
      icon: modeIcons[mode] || '💬',
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      preview: `${modeLabels[mode] || mode} 对话`
    }

    // 清空所有模式的消息，避免残留
    ceoMessages.value = []
    normalMessages.value = []
    strategyMessages.value = []
    tasks.value = []
    strategyTasks.value = []

    // 重置工作流状态，避免新对话显示旧对话的 CEO/员工内容
    currentPhase.value = 'idle'
    ceoTyping.value = false

    // 对应模式设置欢迎消息，开启全新对话
    if (mode === 'ceo') {
      ceoMessages.value = [{
        id: generateId(),
        from: 'system',
        content: '你和 CEO Alex Chen 直接对话。CEO 会根据问题自动分配任务给团队成员，处理过程在右侧面板实时展示。\n\n有问题尽管问！',
        timestamp: Date.now()
      }]
    } else if (mode === 'strategy') {
      strategyMessages.value = [{
        id: generateId(),
        from: 'system',
        content: '五位专业分析师将协同为你提供股票/板块/市场的投资分析。\n\n有问题尽管问！',
        timestamp: Date.now()
      }]
    } else {
      normalMessages.value = [{
        id: generateId(),
        from: 'system',
        content: '直接与 AI 对话，适合快速咨询。\n\n有问题尽管问！',
        timestamp: Date.now()
      }]
    }

    currentChatMode.value = mode
    // 立刻保存新会话的初始消息（但不存入 conversations 列表）
    await saveCurrentConvData()
  }

  /** 切换到某个会话：先保存当前消息，再加载目标会话消息 */
  async function switchConversation(convId) {
    if (convId === currentConversationId.value) return

    console.log(`[Conv] switchConversation: from=${currentConversationId.value} to=${convId}`)

    // 如果有正在进行的 AI 请求，将其数据移入后台缓冲区（不中止，继续接收）
    const oldConvId2 = currentConversationId.value
    if (oldConvId2 && loadingConvIds.value.has(oldConvId2)) {
      const oldMode = currentChatMode.value
      const oldMsgs = oldMode === 'strategy' ? [...strategyMessages.value]
        : oldMode === 'normal' ? [...normalMessages.value]
        : [...ceoMessages.value]
      const oldTasks = oldMode === 'strategy' ? [...strategyTasks.value] : [...tasks.value]
      backgroundConvBuffers.set(oldConvId2, { messages: oldMsgs, tasks: oldTasks, mode: oldMode })
      console.log(`[Conv] Moving conv ${oldConvId2} to background buffer (still loading)`)
    }

    // 如果离开的是 pending 会话（没发过消息），清理掉
    if (pendingConvId.value && currentConversationId.value === pendingConvId.value) {
      await deleteConvData(pendingConvId.value)
      pendingConvId.value = null
      _pendingConvMeta = null
    } else if (!loadingConvIds.value.has(currentConversationId.value)) {
      // 只有不在流式传输中时才保存当前会话数据
      await saveCurrentConvData()
    }

    // 2. 切换 ID 和模式
    currentConversationId.value = convId
    const conv = conversations.value.find(c => c.id === convId)
    if (conv) {
      currentChatMode.value = conv.mode || 'ceo'
    }

    // 3. 加载目标会话数据：优先从缓冲区（更新鲜），其次从 IndexedDB
    const targetBuffer = backgroundConvBuffers.get(convId)
    if (targetBuffer) {
      // 目标会话正在后台加载，从缓冲区恢复（比 IndexedDB 数据更新）
      const bMode = targetBuffer.mode || 'ceo'
      ceoMessages.value = []
      normalMessages.value = []
      strategyMessages.value = []
      tasks.value = []
      strategyTasks.value = []
      if (bMode === 'strategy') {
        strategyMessages.value = [...targetBuffer.messages]
        strategyTasks.value = [...targetBuffer.tasks]
      } else if (bMode === 'normal') {
        normalMessages.value = [...targetBuffer.messages]
      } else {
        ceoMessages.value = [...targetBuffer.messages]
        tasks.value = [...targetBuffer.tasks]
      }
      currentChatMode.value = bMode
      currentPhase.value = tasks.value.some(t => t.status === 'working' || t.status === 'pending')
        ? 'employees-working'
        : strategyTasks.value.some(t => t.status === 'working' || t.status === 'pending')
          ? 'employees-working' : 'idle'
      ceoTyping.value = false
      // 移除缓冲区，后续流式写入直接到响应式变量
      backgroundConvBuffers.delete(convId)
      console.log(`[Conv] Restored conv ${convId} from buffer, ${targetBuffer.messages.length} msgs`)
    } else {
      await loadConvData(convId)
    }

    saveConversationsToStorage()
  }

  /** 删除一个会话 */
  async function deleteConversation(convId) {
    // 如果删除的是 pending 会话，清理 pending 状态
    if (pendingConvId.value && convId === pendingConvId.value) {
      pendingConvId.value = null
      _pendingConvMeta = null
    }

    const idx = conversations.value.findIndex(c => c.id === convId)
    if (idx !== -1) conversations.value.splice(idx, 1)

    // 删除 IndexedDB 中的消息和任务
    await deleteConvData(convId)

    if (currentConversationId.value === convId) {
      // 如果删的是当前会话，切到第一个
      const newId = conversations.value[0]?.id || null
      if (newId) {
        await switchConversation(newId)
      } else {
        currentConversationId.value = null
      }
    }
    saveConversationsToStorage()
  }

  /** 更新当前会话的预览文字 */
  function updateConversationPreview(content) {
    // 如果当前是 pending 会话（用户首次发消息），正式加入列表
    if (pendingConvId.value && currentConversationId.value === pendingConvId.value && _pendingConvMeta) {
      const conv = { ..._pendingConvMeta }
      conv.preview = content.slice(0, 40)
      conv.lastMessageAt = Date.now()
      conv.title = content.slice(0, 20) || '新对话'
      conversations.value.unshift(conv)
      pendingConvId.value = null
      _pendingConvMeta = null
      saveConversationsToStorage()
      return
    }

    const conv = conversations.value.find(c => c.id === currentConversationId.value)
    if (conv) {
      conv.preview = content.slice(0, 40)
      conv.lastMessageAt = Date.now()
      // 用用户第一条消息作为标题（如果还是默认"新对话"）
      if (conv.title === '新对话') {
        conv.title = content.slice(0, 20) || '新对话'
      }
      saveConversationsToStorage()
    }
  }

  async function saveConversationsToStorage() {
    try {
      if (isIndexedDBAvailable()) {
        await saveSetting('conversations', JSON.stringify(conversations.value))
        await saveSetting('currentConversationId', currentConversationId.value || '')
      } else {
        localStorage.setItem('solo-company-conversations', JSON.stringify(conversations.value))
        localStorage.setItem('solo-company-current-conv', currentConversationId.value || '')
      }
    } catch (e) {
      console.error('[Conversations] Save error:', e)
    }
  }

  async function loadConversationsFromStorage() {
    try {
      let convData = null
      let convId = null
      if (isIndexedDBAvailable()) {
        convData = await loadSetting('conversations')
        convId = await loadSetting('currentConversationId')
      } else {
        convData = localStorage.getItem('solo-company-conversations')
        convId = localStorage.getItem('solo-company-current-conv')
      }
      if (convData) {
        conversations.value = JSON.parse(convData)
      }
      if (convId) {
        currentConversationId.value = convId
      }
    } catch (e) {
      console.error('[Conversations] Load error:', e)
    }
  }

  // ===== Actions =====

  async function init() {
    const startTime = performance.now()
    console.log('[Init] Starting...')

    // 先同步加载本地数据，让界面立即恢复（不等待网络）
    const t1 = performance.now()
    await loadFromStorage()
    console.log('[Init] loadFromStorage took', (performance.now() - t1).toFixed(2), 'ms')

    const t2 = performance.now()
    await loadHistoryFromStorage()
    console.log('[Init] loadHistoryFromStorage took', (performance.now() - t2).toFixed(2), 'ms')

    const t3 = performance.now()
    await loadModeFromStorage()
    console.log('[Init] loadModeFromStorage took', (performance.now() - t3).toFixed(2), 'ms')

    // 加载会话列表
    await loadConversationsFromStorage()
    // 如果没有任何会话记录，创建默认会话
    if (conversations.value.length === 0) {
      const defaultId = `conv-default-${Date.now()}`
      conversations.value = [{
        id: defaultId,
        title: '首次对话',
        mode: 'ceo',
        icon: '👔',
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        preview: 'CEO 统筹对话'
      }]
      currentConversationId.value = defaultId
    }

    // 如果 currentConversationId 指向的会话不在列表中（如 pending 会话刷新后），切到第一个
    if (currentConversationId.value && !conversations.value.find(c => c.id === currentConversationId.value)) {
      currentConversationId.value = conversations.value[0]?.id || null
    }

    // 从按会话 ID 存储加载当前会话的消息
    if (currentConversationId.value) {
      await loadConvData(currentConversationId.value)
    }

    // 如果加载后消息为空，初始化欢迎消息
    const conv = conversations.value.find(c => c.id === currentConversationId.value)
    const convMode = conv?.mode || 'ceo'
    if (convMode === 'ceo' && ceoMessages.value.length === 0) {
      ceoMessages.value.push({
        id: generateId(),
        from: 'system',
        content: '你和 CEO Alex Chen 直接对话。CEO 会根据问题自动分配任务给团队成员，处理过程在右侧面板实时展示。\n\n有问题尽管问！',
        timestamp: Date.now()
      })
    } else if (convMode === 'normal' && normalMessages.value.length === 0) {
      normalMessages.value.push({
        id: generateId(),
        from: 'system',
        content: '直接与 AI 对话，不经过 CEO 流程。适合快速咨询、日常问答。\n\n有问题尽管问！',
        timestamp: Date.now()
      })
    } else if (convMode === 'strategy' && strategyMessages.value.length === 0) {
      strategyMessages.value.push({
        id: generateId(),
        from: 'system',
        content: '五位专业分析师将协同为你提供股票/板块/市场的投资分析：\n\n• 张明远（宏观分析师）— 宏观经济与政策解读\n• 李技术分析（技术分析师）— K线形态与技术指标\n• 王基本面（基本面分析师）— 财务分析与估值\n• 陈行业（行业研究员）— 行业景气与产业链\n• 刘风控（风险控制师）— 风险评估与仓位管理\n\n适合个股分析、板块研究、大势判断等投资需求。',
        timestamp: Date.now()
      })
    }

    // 异步检查 API 状态，不阻塞界面渲染
    const t4 = performance.now()
    apiConnected.value = await checkAPIStatus()
    console.log('[Init] checkAPIStatus took', (performance.now() - t4).toFixed(2), 'ms')

    console.log('[Init] Total time:', (performance.now() - startTime).toFixed(2), 'ms')
  }

  // 保存任务到历史
  async function saveTaskToHistory(userMessage, taskRound, mode = 'ceo') {
    const historyItem = {
      id: generateId(),
      userMessage: userMessage.slice(0, 200), // 保存用户问题摘要
      timestamp: Date.now(),
      mode: mode, // 记录模式：'ceo' 或 'strategy'
      tasks: taskRound.map(t => {
        // 根据模式从对应的角色列表中查找
        const role = mode === 'strategy' 
          ? STRATEGY_ROLES.find(r => r.id === t.employeeId)
          : COMPANY_ROLES.find(r => r.id === t.employeeId)
        return {
          employeeId: t.employeeId,
          employeeName: role?.name || t.employeeId,
          employeeTitle: role?.title || '',
          task: t.task,
          focus: t.focus,
          content: t.content,
          status: t.status
        }
      })
    }
    taskHistory.value.unshift(historyItem) // 最新的在前面
    // 只保留最近 50 条
    if (taskHistory.value.length > 50) {
      taskHistory.value = taskHistory.value.slice(0, 50)
    }
    await saveHistoryToStorage()
  }

  // 查看历史任务详情
  function viewTaskHistory(historyId) {
    return taskHistory.value.find(h => h.id === historyId)
  }

  // 清空历史
  function clearTaskHistory() {
    taskHistory.value = []
    saveHistoryToStorage()
  }

  /**
   * 中止当前正在进行的生成
   */
  async function stopGeneration() {
    const curConvId = currentConversationId.value
    if (!loadingConvIds.value.has(curConvId)) return

    console.log('[Chat] Stopping generation...')

    // 中止所有 Gateway 请求（包括并行的员工任务）
    abortAllRequests()

    // 将所有进行中的任务标记为已中止
    tasks.value.forEach((task, index) => {
      if (task.status === 'working' || task.status === 'pending') {
        tasks.value[index] = {
          ...task,
          status: 'done',
          content: task.content ? task.content + '\n\n[已中止]' : '[已中止]',
          toolCalls: task.toolCalls || []
        }
      }
    })

    // 同样处理策略模式的任务
    strategyTasks.value.forEach((task, index) => {
      if (task.status === 'working' || task.status === 'pending') {
        strategyTasks.value[index] = {
          ...task,
          status: 'done',
          content: task.content ? task.content + '\n\n[已中止]' : '[已中止]',
          toolCalls: task.toolCalls || []
        }
      }
    })

    // 重置当前会话状态
    _setConvLoading(curConvId, false)
    ceoTyping.value = false
    currentPhase.value = 'idle'

    await saveToStorage()
    console.log('[Chat] Generation stopped by user')
  }

  async function saveHistoryToStorage() {
    try {
      if (isIndexedDBAvailable()) {
        await saveToStore(STORES.TASK_HISTORY, taskHistory.value)
      } else {
        localStorage.setItem('solo-company-task-history', JSON.stringify(taskHistory.value))
      }
    } catch {}
  }

  async function loadHistoryFromStorage() {
    try {
      if (isIndexedDBAvailable()) {
        const saved = await loadFromStore(STORES.TASK_HISTORY)
        if (saved.length > 0) taskHistory.value = saved
      } else {
        const saved = localStorage.getItem('solo-company-task-history')
        if (saved) taskHistory.value = JSON.parse(saved)
      }
    } catch {}
  }

  /**
   * 核心流程：根据 currentChatMode 决定 CEO 统筹 / OpenClaw 直聊 / 私聊
   */
  async function sendMessage(data) {
    // 兼容旧格式（直接传字符串）和新格式（传对象）
    const content = typeof data === 'string' ? data : data.content
    
    // CEO 统筹模式的默认角色
    const defaultCompanyRoles = [
      'cto', 'cpo', 'coo', 'cmo', 'cfo', 'chro',
      'security', 'legal', 'data', 'ux', 'sales', 'customer', 'devops', 'qa', 'research'
    ]
    
    // A股策略分析模式的默认角色（10位专家）
    const defaultStrategyRoles = [
      'macro_analyst', 'technical_analyst', 'fundamental_analyst', 'sector_specialist', 'risk_controller',
      'quant_analyst', 'event_analyst', 'derivatives_analyst', 'behavioral_analyst', 'esg_analyst'
    ]
    
    // 根据当前模式选择默认角色
    const isStrategyMode = currentChatMode.value === 'strategy'
    const defaultRoles = isStrategyMode ? defaultStrategyRoles : defaultCompanyRoles
    
    const selectedRoles = typeof data === 'string'
      ? defaultRoles
      : (data.selectedRoles || defaultRoles)
    
    if (!content.trim() || activeConvLoading.value) return

    // 根据当前模式选择目标消息列表
    let targetMessages
    if (currentChatMode.value === 'normal') {
      targetMessages = normalMessages
    } else if (currentChatMode.value === 'private') {
      const target = privateChatTarget.value
      if (!target) return
      if (!privateMessages.value[target]) {
        privateMessages.value[target] = []
      }
      targetMessages = { value: privateMessages.value[target] }
    } else if (currentChatMode.value === 'strategy') {
      targetMessages = strategyMessages
    } else {
      targetMessages = ceoMessages
    }

    // 1. 添加用户消息
    targetMessages.value.push({
      id: generateId(),
      from: 'user',
      role: 'user',
      content,
      timestamp: Date.now()
    })

    // 更新会话预览
    updateConversationPreview(content)

    // 记住发起请求时的会话 ID（必须在 _setConvLoading 之前，防止切换期间竞态）
    const requestConvId = currentConversationId.value
    _setConvLoading(requestConvId, true)
    ceoTyping.value = true

    try {
      if (currentChatMode.value === 'normal') {
        await handleNormalMode(content)
      } else if (currentChatMode.value === 'private') {
        await handlePrivateMode(content)
      } else if (currentChatMode.value === 'strategy') {
        await handleStrategyMode(content, selectedRoles)
      } else {
        await handleCEOMode(content, selectedRoles)
      }
      currentPhase.value = 'idle'
    } catch (err) {
      console.error('[chat] Error:', err)
      // 如果是后台会话出错，写入缓冲区
      if (requestConvId && currentConversationId.value !== requestConvId) {
        const buffer = backgroundConvBuffers.get(requestConvId)
        if (buffer) {
          buffer.messages.push({
            id: generateId(),
            from: 'system',
            content: `⚠️ 处理失败：${err.message}`,
            timestamp: Date.now()
          })
        }
      } else {
        targetMessages.value.push({
          id: generateId(),
          from: 'system',
          content: `⚠️ 处理失败：${err.message}`,
          timestamp: Date.now()
        })
      }
      currentPhase.value = 'idle'
      ceoTyping.value = false
    } finally {
      _setConvLoading(requestConvId, false)
      // 如果是后台会话完成，保存缓冲区到 IndexedDB
      if (requestConvId && currentConversationId.value !== requestConvId) {
        await cleanupBackgroundBuffer(requestConvId)
      } else {
        await saveToStorage()
      }
    }
  }
  
  /**
   * 私聊模式：直接与某位高管对话
   */
  async function handlePrivateMode(content) {
    const targetRoleId = privateChatTarget.value
    if (!targetRoleId) return

    // 支持 CEO 团队成员和策略专家
    const role = COMPANY_ROLES.find(r => r.id === targetRoleId)
      || STRATEGY_ROLES.find(r => r.id === targetRoleId)
    if (!role) return

    currentPhase.value = 'ceo-thinking'

    // 记住发起请求时的会话 ID
    const requestConvId = currentConversationId.value

    const { callOpenClawGateway } = await import('@/services/openclawGateway')

    // 构建私聊系统提示词
    const privateSystemPrompt = `${role.systemPrompt}\n\n## 当前对话模式\n这是与用户的私聊对话，你可以直接回答用户问题，不需要分配任务给其他成员。保持专业、简洁的回答风格。`

    // 延迟创建消息占位，直到收到第一个流式内容
    let responseMsgId = null
    let responseText = ''
    let responseToolCalls = []
    let lastUpdateTime = 0
    let messageCreated = false

    // 创建消息占位的函数
    const createMessagePlaceholder = () => {
      if (messageCreated) return
      messageCreated = true

      responseMsgId = generateId()
      const responseMsg = {
        id: responseMsgId,
        from: 'agent',
        role: role,
        content: '',
        toolCalls: [],
        timestamp: Date.now()
      }

      if (currentConversationId.value === requestConvId) {
        // 当前会话，直接 push 到响应式变量
        if (!privateMessages.value[targetRoleId]) {
          privateMessages.value[targetRoleId] = []
        }
        privateMessages.value[targetRoleId].push(responseMsg)
      } else {
        // 后台会话，push 到缓冲区
        const buffer = backgroundConvBuffers.get(requestConvId)
        if (buffer) {
          buffer.messages.push(responseMsg)
        }
      }

      // 如果是当前会话，关闭 typing 状态
      if (currentConversationId.value === requestConvId) {
        ceoTyping.value = false
      }
      console.log('[Private Mode] Message placeholder created')
    }

    // 辅助：获取私聊消息数组
    const getPrivateMsgs = () => {
      if (currentConversationId.value === requestConvId) {
        return privateMessages.value[targetRoleId] || []
      }
      const buffer = backgroundConvBuffers.get(requestConvId)
      return buffer ? buffer.messages : []
    }

    // 更新私聊消息
    const updatePrivateMsg = (msgId, updates) => {
      const msgs = getPrivateMsgs()
      const idx = msgs.findIndex(m => m.id === msgId)
      if (idx !== -1) {
        msgs[idx] = { ...msgs[idx], ...updates }
      }
    }

    // 设置全局消息更新器（备用方案，解决回调不执行问题）
    setGlobalMessageUpdater((msgId, text) => {
      if (msgId !== responseMsgId) return
      responseText = text
      const now = Date.now()
      if (now - lastUpdateTime < 80) return
      lastUpdateTime = now
      updatePrivateMsg(msgId, { content: text, toolCalls: responseToolCalls })
    })

    // 工具调用回调函数
    const onToolCallsCallback = (toolCalls) => {
      console.log('[Private Mode] onToolCalls called, count:', toolCalls?.length)
      responseToolCalls = toolCalls || []
      extractFilesFromToolCalls(toolCalls)
      // 更新消息中的工具调用信息（如果消息已创建）
      if (messageCreated && responseMsgId) {
        updatePrivateMsg(responseMsgId, { toolCalls: responseToolCalls })
      }
    }

    // 流式回调函数
    const onStreamCallback = (chunk, accumulated) => {
      console.log('[Private Mode] onStream callback entered, accumulated length:', accumulated?.length)

      // 收到第一个内容时创建消息占位
      if (!messageCreated && accumulated?.length > 0) {
        createMessagePlaceholder()
      }

      // 如果消息还没创建，不处理
      if (!messageCreated) return

      responseText = accumulated
      const now = Date.now()
      if (now - lastUpdateTime < 80) return
      lastUpdateTime = now
      updatePrivateMsg(responseMsgId, { content: accumulated, toolCalls: responseToolCalls })
    }

    const result = await callOpenClawGateway(
      content,
      role.id,
      onStreamCallback,
      onToolCallsCallback,
      privateSystemPrompt,
      responseMsgId
    )
    responseText = result?.text || responseText || ''
    responseToolCalls = result?.toolCalls || responseToolCalls || []

    // 清理全局更新器
    setGlobalMessageUpdater(null)

    // 流式结束后再提取一次文件信息（兜底）
    if (result?.toolCalls?.length) {
      console.log('[Private Mode] Extracting files from final toolCalls:', result.toolCalls.length)
      extractFilesFromToolCalls(result.toolCalls)
    }
    // 从 AI 文本回复中提取文件路径（最终兜底方案）
    extractFilesFromText(responseText)

    // 如果消息从未创建（没有收到任何流式内容），创建一个空消息
    if (!messageCreated) {
      createMessagePlaceholder()
    }

    // 确保最终完整内容写入（包括工具调用信息）
    updatePrivateMsg(responseMsgId, { content: responseText, toolCalls: responseToolCalls })

    // 如果是后台会话，保存到 IndexedDB
    if (currentConversationId.value !== requestConvId) {
      await cleanupBackgroundBuffer(requestConvId)
    } else {
      ceoTyping.value = false
      await saveCurrentConvData()
    }
  }

  /**
   * OpenClaw 直聊模式：直接对话，不走 CEO 流程
   */
  async function handleNormalMode(content) {
    currentPhase.value = 'ceo-thinking'

    // 记住发起请求时的会话 ID
    const requestConvId = currentConversationId.value

    // OpenClaw 直聊模式使用默认 AI 角色
    const openclawRole = { id: 'openclaw', name: 'AI 助手', title: 'OpenClaw', avatar: '🤖', emoji: '', color: '#4f46e5' }

    // 延迟创建消息占位，直到收到第一个流式内容
    let responseMsgId = null
    let responseText = ''
    let responseToolCalls = []
    let lastUpdateTime = 0
    let messageCreated = false

    // 创建消息占位的函数
    const createMessagePlaceholder = () => {
      if (messageCreated) return
      messageCreated = true

      responseMsgId = generateId()
      const responseMsg = {
        id: responseMsgId,
        from: 'agent',
        role: openclawRole,
        content: '',
        toolCalls: [],
        timestamp: Date.now()
      }
      pushConvMessage(requestConvId, responseMsg)

      // 如果是当前会话，关闭 typing 状态
      if (currentConversationId.value === requestConvId) {
        ceoTyping.value = false
      }
      console.log('[Normal Mode] Message placeholder created')
    }

    // 设置全局消息更新器（备用方案，解决回调不执行问题）
    setGlobalMessageUpdater((msgId, text) => {
      if (msgId !== responseMsgId) return
      responseText = text
      const now = Date.now()
      if (now - lastUpdateTime < 80) return
      lastUpdateTime = now
      updateConvMessage(requestConvId, msgId, { content: text, toolCalls: responseToolCalls })
    })

    // 工具调用回调函数
    const onToolCallsCallback = (toolCalls) => {
      console.log('[Normal Mode] onToolCalls called, count:', toolCalls?.length)
      responseToolCalls = toolCalls || []
      extractFilesFromToolCalls(toolCalls)
      // 更新消息中的工具调用信息（如果消息已创建）
      if (messageCreated && responseMsgId) {
        updateConvMessage(requestConvId, responseMsgId, { toolCalls: responseToolCalls })
      }
    }

    // 先定义回调函数
    const onStreamCallback = (chunk, accumulated) => {
      console.log('[Normal Mode] onStream callback entered, accumulated length:', accumulated?.length)

      // 收到第一个内容时创建消息占位
      if (!messageCreated && accumulated?.length > 0) {
        createMessagePlaceholder()
      }

      // 如果消息还没创建，不处理
      if (!messageCreated) return

      responseText = accumulated
      // 节流更新：每 80ms 更新一次 UI，避免过于频繁
      const now = Date.now()
      if (now - lastUpdateTime < 80) {
        return
      }
      lastUpdateTime = now
      updateConvMessage(requestConvId, responseMsgId, { content: accumulated, toolCalls: responseToolCalls })
    }

    // 动态导入 gateway 模块
    console.log('[Normal Mode] About to import openclawGateway module...')
    const gatewayModule = await import('@/services/openclawGateway')
    const { callOpenClawGateway } = gatewayModule
    console.log('[Normal Mode] Module imported, callOpenClawGateway type:', typeof callOpenClawGateway)

    console.log('[Normal Mode] About to call callOpenClawGateway, responseMsgId:', responseMsgId, 'callback:', typeof onStreamCallback)
    const result = await callOpenClawGateway(
      content,
      'main',
      onStreamCallback,
      onToolCallsCallback,
      null,
      responseMsgId
    )
    console.log('[Normal Mode] callOpenClawGateway returned, result:', result?.text?.length, 'toolCalls:', result?.toolCalls?.length)
    responseText = result?.text || responseText || ''
    responseToolCalls = result?.toolCalls || responseToolCalls || []

    // 清理全局更新器
    setGlobalMessageUpdater(null)

    // 流式结束后再提取一次文件信息（兜底）
    if (result?.toolCalls?.length) {
      console.log('[Normal Mode] Extracting files from final toolCalls:', result.toolCalls.length)
      extractFilesFromToolCalls(result.toolCalls)
    }
    // 从 AI 文本回复中提取文件路径（最终兜底方案）
    extractFilesFromText(responseText)

    // 如果消息从未创建（没有收到任何流式内容），创建一个空消息
    if (!messageCreated) {
      createMessagePlaceholder()
    }

    // 确保最终完整内容写入（包括工具调用信息）
    updateConvMessage(requestConvId, responseMsgId, { content: responseText, toolCalls: responseToolCalls })

    // 如果是后台会话，保存到 IndexedDB
    if (currentConversationId.value !== requestConvId) {
      await cleanupBackgroundBuffer(requestConvId)
    } else {
      ceoTyping.value = false
      await saveCurrentConvData()
    }
  }

  /**
   * CEO 统筹策略模式：CEO 分析 → 分配战略任务 → 专家执行 → CEO 汇总
   */
  async function handleStrategyMode(content, selectedRoles) {
    console.log('[Strategy Mode] Starting with selected roles:', selectedRoles)
    currentPhase.value = 'ceo-thinking'

    // 记住发起请求时的会话 ID
    const requestConvId = currentConversationId.value

    // 创建 CEO 思考任务，用于实时显示 CEO 的分析过程
    const ceoThinkingTaskId = generateId()
    const ceoThinkingTask = {
      id: ceoThinkingTaskId,
      employeeId: 'ceo',
      task: '正在分析投资策略并分配研究任务...',
      focus: '统筹分析',
      status: 'working',
      content: '',
      timestamp: Date.now(),
      isThinking: true // 标记为思考任务
    }

    // 如果是当前会话，直接更新响应式变量；否则写入缓冲区
    if (currentConversationId.value === requestConvId) {
      strategyTasks.value = [...strategyTasks.value, ceoThinkingTask]
    } else {
      const buffer = backgroundConvBuffers.get(requestConvId)
      if (buffer) buffer.tasks.push(ceoThinkingTask)
    }

    // 1. CEO 分析并分配战略任务，带流式回调实时显示思考过程
    let ceoResponse = ''
    let lastUpdateTime = 0
    console.log('[Strategy Mode] Calling CEO to analyze and assign tasks...')
    const { ceoResponse: finalCeoResponse, tasks: parsedTasks } = await strategyCEOAnalyzeAndAssign(
      content,
      recentConversation.value,
      selectedRoles,
      (chunk, accumulated) => {
        // 实时更新 CEO 思考内容（节流，每 50ms 更新一次 UI）
        const now = Date.now()
        if (now - lastUpdateTime < 50) return
        lastUpdateTime = now

        updateConvTask(requestConvId, ceoThinkingTaskId, { content: accumulated })
        ceoResponse = accumulated
      }
    )
    
    ceoResponse = finalCeoResponse || ceoResponse
    console.log('[Strategy Mode] CEO response received, tasks assigned:', parsedTasks.length)

    // CEO 思考完成，移除思考任务
    const tasksRef = getConvTasks(requestConvId)
    if (tasksRef) {
      const thinkingIdx = tasksRef.value.findIndex(t => t.id === ceoThinkingTaskId)
      if (thinkingIdx !== -1) {
        tasksRef.value.splice(thinkingIdx, 1)
      }
    }

    // 2. 如果有任务分配，开始专家处理
    if (parsedTasks.length > 0) {
      if (currentConversationId.value === requestConvId) {
        currentPhase.value = 'assigning'
      }

      // 创建任务对象
      const taskObjects = parsedTasks.map(t => ({
        id: generateId(),
        employeeId: t.assignee,
        task: t.task,
        focus: t.focus || '',
        status: 'pending',
        content: '',
        timestamp: Date.now(),
        createdAt: Date.now()
      }))

      // 追加任务到对应的数组
      const tasksRef2 = getConvTasks(requestConvId)
      if (tasksRef2) {
        tasksRef2.value.push(...taskObjects)
      }

      // 让 assigning 阶段停留 1.5 秒，让用户看到分配概览
      await new Promise(r => setTimeout(r, 1500))

      if (currentConversationId.value === requestConvId) {
        currentPhase.value = 'employees-working'
      }

      // 3. 并发执行所有专家任务
      const expertPromises = taskObjects.map(async (taskObj) => {
        const expert = STRATEGY_ROLES.find(r => r.id === taskObj.employeeId)

        if (!expert) {
          console.error(`[Strategy Mode] Expert not found: ${taskObj.employeeId}`)
          const unavailableContent = '该专家暂不可用'
          updateConvTask(requestConvId, taskObj.id, { status: 'done', content: unavailableContent, toolCalls: [] })
          return { employeeId: taskObj.employeeId, content: unavailableContent, toolCalls: [] }
        }

        updateConvTask(requestConvId, taskObj.id, { status: 'working', startedAt: Date.now() })

        try {
          const onStream = (chunk, accumulated) => {
            updateConvTask(requestConvId, taskObj.id, { content: accumulated })
          }

          const onToolCalls = (toolCalls) => {
            extractFilesFromToolCalls(toolCalls)
            updateConvTask(requestConvId, taskObj.id, { toolCalls })
          }

          // 添加超时机制（5分钟）
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('专家响应超时（5分钟）')), 600000)
          })

          const result = await Promise.race([
            strategyExpertExecuteTask(
              taskObj.employeeId,
              { task: taskObj.task, focus: taskObj.focus },
              ceoResponse,
              content,
              onStream,
              onToolCalls
            ),
            timeoutPromise
          ])

          // 兜底：流式结束后再提取一次文件信息
          if (result?.toolCalls?.length) {
            extractFilesFromToolCalls(result.toolCalls)
          }
          // 从 AI 文本回复中提取文件路径（最终兜底方案）
          extractFilesFromText(result?.text || '')

          updateConvTask(requestConvId, taskObj.id, {
            status: 'done',
            content: result.text,
            toolCalls: result.toolCalls || []
          })
          return { employeeId: taskObj.employeeId, content: result.text, toolCalls: result.toolCalls || [] }
        } catch (err) {
          console.error(`[Strategy Mode] Task failed for ${expert?.name || taskObj.employeeId}:`, err)
          const errorContent = `处理出错：${err.message}`
          updateConvTask(requestConvId, taskObj.id, { status: 'done', content: errorContent, toolCalls: [] })
          return { employeeId: taskObj.employeeId, content: errorContent, toolCalls: [] }
        }
      })

      console.log('[Strategy Mode] Waiting for all expert tasks...')
      const expertResults = await Promise.allSettled(expertPromises)

      const successfulResults = expertResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)

      // 4. CEO 汇总战略分析
      if (currentConversationId.value === requestConvId) {
        currentPhase.value = 'summarizing'
      }

      // 延迟创建 CEO 汇总消息占位，直到收到第一个流式内容
      let summaryMsgId = null
      let lastSummaryUpdateTime = 0
      let messageCreated = false
      const ceoRole = COMPANY_ROLES.find(r => r.id === 'ceo')
      
      // 创建消息占位的函数
      const createSummaryMessage = () => {
        if (messageCreated) return
        messageCreated = true
        
        summaryMsgId = generateId()
        const summaryMsg = {
          id: summaryMsgId,
          from: 'agent',
          role: ceoRole,
          content: '',
          timestamp: Date.now(),
          isSummary: true
        }
        pushConvMessage(requestConvId, summaryMsg)
        
        // 如果是当前会话，关闭 typing 状态
        if (currentConversationId.value === requestConvId) {
          ceoTyping.value = false
        }
        console.log('[Strategy Mode] Summary message placeholder created')
      }

      const strategySummary = await strategyCEOSummarize(content, ceoResponse, successfulResults, (chunk, accumulated) => {
        // 收到第一个内容时创建消息占位
        if (!messageCreated && accumulated?.length > 0) {
          createSummaryMessage()
        }
        
        // 如果消息还没创建，不处理
        if (!messageCreated) return
        
        const now = Date.now()
        if (now - lastSummaryUpdateTime < 30) return
        lastSummaryUpdateTime = now
        updateConvMessage(requestConvId, summaryMsgId, { content: accumulated })
      })

      // 如果消息从未创建（没有收到任何流式内容），创建一个空消息
      if (!messageCreated) {
        createSummaryMessage()
      }

      // 5. 兜底：确保最终完整内容写入（防止流式最后一帧丢失）
      updateConvMessage(requestConvId, summaryMsgId, { content: strategySummary || '' })

      // 如果是后台会话，保存到 IndexedDB
      if (currentConversationId.value !== requestConvId) {
        await cleanupBackgroundBuffer(requestConvId)
      } else {
        ceoTyping.value = false
        await saveTaskToHistory(content, taskObjects, 'strategy')
        await saveCurrentConvData()
      }
    } else {
      // 没有任务分配，直接显示 CEO 的答复
      const ceoRole = COMPANY_ROLES.find(r => r.id === 'ceo')
      pushConvMessage(requestConvId, {
        id: generateId(),
        from: 'agent',
        role: ceoRole,
        isInitial: true,
        content: ceoResponse,
        timestamp: Date.now()
      })

      // 如果是后台会话，保存到 IndexedDB
      if (currentConversationId.value !== requestConvId) {
        await cleanupBackgroundBuffer(requestConvId)
      } else {
        ceoTyping.value = false
        await saveCurrentConvData()
      }
    }
  }

  /**
   * CEO 统筹模式：CEO 分析 → 分配任务 → 员工执行 → CEO 汇总
   */
  async function handleCEOMode(content, selectedRoles) {
    currentPhase.value = 'ceo-thinking'

    // 记住发起请求时的会话 ID
    const requestConvId = currentConversationId.value

    // 创建 CEO 思考任务，用于实时显示 CEO 的分析过程
    const ceoThinkingTaskId = generateId()
    const ceoThinkingTask = {
      id: ceoThinkingTaskId,
      employeeId: 'ceo',
      task: '正在分析问题并制定任务分配方案...',
      focus: '统筹规划',
      status: 'working',
      content: '',
      timestamp: Date.now(),
      isThinking: true // 标记为思考任务
    }

    // 如果是当前会话，直接更新响应式变量；否则写入缓冲区
    if (currentConversationId.value === requestConvId) {
      tasks.value = [...tasks.value, ceoThinkingTask]
    } else {
      const buffer = backgroundConvBuffers.get(requestConvId)
      if (buffer) buffer.tasks.push(ceoThinkingTask)
    }

    // 1. CEO 分析并分配任务，带流式回调实时显示思考过程
    let ceoResponse = ''
    let lastUpdateTime = 0
    const { ceoResponse: finalCeoResponse, tasks: parsedTasks } = await ceoAnalyzeAndAssign(
      content,
      recentConversation.value,
      selectedRoles,
      (chunk, accumulated) => {
        // 实时更新 CEO 思考内容（节流，每 50ms 更新一次 UI）
        const now = Date.now()
        if (now - lastUpdateTime < 50) return
        lastUpdateTime = now

        updateConvTask(requestConvId, ceoThinkingTaskId, { content: accumulated })
        ceoResponse = accumulated
      }
    )
    
    ceoResponse = finalCeoResponse || ceoResponse

    // CEO 思考完成，移除思考任务
    const tasksRef = getConvTasks(requestConvId)
    if (tasksRef) {
      const thinkingIdx = tasksRef.value.findIndex(t => t.id === ceoThinkingTaskId)
      if (thinkingIdx !== -1) {
        tasksRef.value.splice(thinkingIdx, 1)
      }
    }

    // 2. 如果有任务分配，开始员工处理
    if (parsedTasks.length > 0) {
      if (currentConversationId.value === requestConvId) {
        currentPhase.value = 'assigning'
      }

      // 创建任务对象，追加到对应的任务列表
      const taskObjects = parsedTasks.map(t => ({
        id: generateId(),
        employeeId: t.assignee,
        task: t.task,
        focus: t.focus || '',
        status: 'pending',
        content: '',
        timestamp: Date.now(),
        createdAt: Date.now()
      }))

      const tasksRef2 = getConvTasks(requestConvId)
      if (tasksRef2) {
        tasksRef2.value.push(...taskObjects)
      }

      // 让 assigning 阶段停留 1.5 秒，让用户看到分配概览
      await new Promise(r => setTimeout(r, 1500))

      if (currentConversationId.value === requestConvId) {
        currentPhase.value = 'employees-working'
      }

      // 3. 并发执行所有员工任务
      const employeePromises = taskObjects.map(async (taskObj) => {
        const employee = COMPANY_ROLES.find(r => r.id === taskObj.employeeId)
        if (!employee) {
          const unavailableContent = '该员工暂不可用'
          updateConvTask(requestConvId, taskObj.id, { status: 'done', content: unavailableContent, toolCalls: [] })
          return { employeeId: taskObj.employeeId, content: unavailableContent, toolCalls: [] }
        }

        updateConvTask(requestConvId, taskObj.id, { status: 'working', startedAt: Date.now() })

        try {
          // 流式回调：实时更新任务内容
          const onStream = (chunk, accumulated) => {
            updateConvTask(requestConvId, taskObj.id, { content: accumulated })
          }

          // 工具调用回调：实时更新工具调用信息
          const onToolCalls = (toolCalls) => {
            extractFilesFromToolCalls(toolCalls)
            updateConvTask(requestConvId, taskObj.id, { toolCalls })
          }

          const result = await employeeExecuteTask(
            taskObj.employeeId,
            { task: taskObj.task, focus: taskObj.focus },
            ceoResponse,
            content,
            onStream,
            onToolCalls
          )
          // 兜底：流式结束后再提取一次文件信息
          if (result?.toolCalls?.length) {
            extractFilesFromToolCalls(result.toolCalls)
          }
          // 从 AI 文本回复中提取文件路径（最终兜底方案）
          extractFilesFromText(result?.text || '')

          updateConvTask(requestConvId, taskObj.id, {
            status: 'done',
            content: result.text,
            toolCalls: result.toolCalls || []
          })
          return { employeeId: taskObj.employeeId, content: result.text, toolCalls: result.toolCalls || [] }
        } catch (err) {
          const errorContent = `处理出错：${err.message}`
          updateConvTask(requestConvId, taskObj.id, { status: 'done', content: errorContent, toolCalls: [] })
          return { employeeId: taskObj.employeeId, content: errorContent, toolCalls: [] }
        }
      })

      // 等待所有员工完成
      const employeeResults = await Promise.allSettled(employeePromises)

      const successfulResults = employeeResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)

      // 4. CEO 汇总（内部讨论后，给用户最终答复）
      if (currentConversationId.value === requestConvId) {
        currentPhase.value = 'summarizing'
      }

      // 延迟创建 CEO 汇总消息占位，直到收到第一个流式内容
      let summaryMsgId = null
      let lastSummaryUpdateTime = 0
      let messageCreated = false
      const ceoRole = COMPANY_ROLES.find(r => r.id === 'ceo')
      
      // 创建消息占位的函数
      const createSummaryMessage = () => {
        if (messageCreated) return
        messageCreated = true
        
        summaryMsgId = generateId()
        const summaryMsg = {
          id: summaryMsgId,
          from: 'agent',
          role: ceoRole,
          content: '',
          timestamp: Date.now(),
          isSummary: true
        }
        pushConvMessage(requestConvId, summaryMsg)
        
        // 如果是当前会话，关闭 typing 状态
        if (currentConversationId.value === requestConvId) {
          ceoTyping.value = false
        }
        console.log('[CEO Mode] Summary message placeholder created')
      }

      const summary = await ceoSummarize(content, ceoResponse, successfulResults, (chunk, accumulated) => {
        // 收到第一个内容时创建消息占位
        if (!messageCreated && accumulated?.length > 0) {
          createSummaryMessage()
        }
        
        // 如果消息还没创建，不处理
        if (!messageCreated) return
        
        const now = Date.now()
        if (now - lastSummaryUpdateTime < 30) return
        lastSummaryUpdateTime = now
        updateConvMessage(requestConvId, summaryMsgId, { content: accumulated })
      })
      console.log('[Chat] CEO summary result:', summary, 'type:', typeof summary)

      // 如果消息从未创建（没有收到任何流式内容），创建一个空消息
      if (!messageCreated) {
        createSummaryMessage()
      }

      // 确保最终完整内容写入（兜底：防止流式回调最后一帧丢失）
      updateConvMessage(requestConvId, summaryMsgId, { content: summary || '' })

      // 如果是后台会话，保存到 IndexedDB
      if (currentConversationId.value !== requestConvId) {
        await cleanupBackgroundBuffer(requestConvId)
      } else {
        ceoTyping.value = false
        await saveTaskToHistory(content, taskObjects, 'ceo')
        await saveCurrentConvData()
      }
    } else {
      // 没有任务分配，直接显示 CEO 的答复
      const ceoRole = COMPANY_ROLES.find(r => r.id === 'ceo')
      pushConvMessage(requestConvId, {
        id: generateId(),
        from: 'agent',
        role: ceoRole,
        isInitial: true,
        content: ceoResponse,
        timestamp: Date.now()
      })

      // 如果是后台会话，保存到 IndexedDB
      if (currentConversationId.value !== requestConvId) {
        await cleanupBackgroundBuffer(requestConvId)
      } else {
        ceoTyping.value = false
        await saveCurrentConvData()
      }
    }
  }

  // ===== 工具函数 =====

  async function clearMessages() {
    if (currentChatMode.value === 'normal') {
      normalMessages.value = []
      normalMessages.value.push({
        id: generateId(),
        from: 'system',
        content: '🗑️ 对话已清空，开始新的讨论吧！',
        timestamp: Date.now()
      })
    } else if (currentChatMode.value === 'strategy') {
      strategyMessages.value = []
      strategyTasks.value = []
      strategyMessages.value.push({
        id: generateId(),
        from: 'system',
        content: '🗑️ 对话已清空，开始新的讨论吧！',
        timestamp: Date.now()
      })
    } else {
      ceoMessages.value = []
      tasks.value = []
      ceoMessages.value.push({
        id: generateId(),
        from: 'system',
        content: '🗑️ 对话已清空，开始新的讨论吧！',
        timestamp: Date.now()
      })
    }
    await saveToStorage()
  }

  function exportChat() {
    // 根据当前模式确定标题和文件名
    const mode = currentChatMode.value
    const modeTitle = mode === 'ceo' ? 'CEO统筹模式' :
                      mode === 'strategy' ? 'A股策略分析模式' :
                      mode === 'private' ? `与${privateChatTargetInfo.value?.name || '...'}私聊` :
                      'AI助手对话'
    const fileNamePrefix = mode === 'ceo' ? 'CEO对话记录' :
                           mode === 'strategy' ? '策略分析记录' :
                           mode === 'private' ? '私聊记录' :
                           'AI助手对话记录'

    let lines = `${modeTitle}\n导出时间：${new Date().toLocaleString('zh-CN')}\n\n`

    lines += messages.value.map(m => {
      const time = new Date(m.timestamp).toLocaleString('zh-CN')
      if (m.from === 'user') return `[${time}] 你：${m.content}`
      if (m.from === 'agent') {
        const label = m.role?.name || m.roleInfo?.name || m.roleId || 'Agent'
        const tag = m.isSummary ? '【汇总】' : m.isInitial ? '【初步分析】' : ''
        return `[${time}] ${label} ${tag}：${m.content}`
      }
      if (m.from === 'system') return `[${time}] 系统：${m.content}`
      return ''
    }).filter(Boolean).join('\n\n')

    // 加上任务记录（仅 CEO 和策略模式有任务）
    if (mode === 'strategy' || mode === 'ceo') {
      const tasksToExport = mode === 'strategy' ? strategyTasks.value : tasks.value
      if (tasksToExport.length > 0) {
        lines += '\n\n===== 员工任务记录 =====\n'
        for (const t of tasksToExport) {
          const role = COMPANY_ROLES.find(r => r.id === t.employeeId) || STRATEGY_ROLES.find(r => r.id === t.employeeId)
          lines += `\n[${role?.name || t.employeeId}] ${t.task}\n${t.content}\n`
        }
      }
    }

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileNamePrefix}_${new Date().toLocaleDateString('zh-CN')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ===== 持久化 =====
  async function saveToStorage() {
    // 自动同步当前会话预览：取最后一条非 system 消息
    try {
      const activeMsgs = currentChatMode.value === 'strategy'
        ? strategyMessages.value
        : currentChatMode.value === 'normal'
          ? normalMessages.value
          : ceoMessages.value
      const lastMsg = [...activeMsgs].reverse().find(m => m.from !== 'system')
      if (lastMsg && currentConversationId.value) {
        const conv = conversations.value.find(c => c.id === currentConversationId.value)
        if (conv) {
          const preview = (lastMsg.content || '').replace(/\*\*/g, '').replace(/\n/g, ' ').trim()
          conv.preview = preview.slice(0, 50)
          conv.lastMessageAt = Date.now()
        }
      }
    } catch (_) { /* 不影响主流程 */ }

    // 保存当前会话数据到按会话 ID 存储
    try {
      await saveCurrentConvData()
    } catch (_) { /* 不影响主流程 */ }

    try {
      // 使用 IndexedDB 存储（无大小限制）
      if (isIndexedDBAvailable()) {
        console.log('[Save] Starting save to IndexedDB...')
        await Promise.all([
          saveToStore(STORES.CEO_MESSAGES, ceoMessages.value),
          saveToStore(STORES.NORMAL_MESSAGES, normalMessages.value),
          saveToStore(STORES.STRATEGY_MESSAGES, strategyMessages.value),
          saveToStore(STORES.PRIVATE_MESSAGES, privateMessages.value),
          saveToStore(STORES.TASKS, tasks.value),
          saveToStore(STORES.STRATEGY_TASKS, strategyTasks.value),
          saveSetting('phase', currentPhase.value)
        ])
        console.log('[Save] CEO:', ceoMessages.value.length, 'Normal:', normalMessages.value.length, 'Strategy:', strategyMessages.value.length, 'Private:', Object.keys(privateMessages.value).length, 'Tasks:', tasks.value.length, 'StrategyTasks:', strategyTasks.value.length)
      } else {
        // 降级到 localStorage
        localStorage.setItem('solo-company-ceo-messages', JSON.stringify(ceoMessages.value.slice(-100)))
        localStorage.setItem('solo-company-normal-messages', JSON.stringify(normalMessages.value.slice(-100)))
        localStorage.setItem('solo-company-strategy-messages', JSON.stringify(strategyMessages.value.slice(-100)))
        localStorage.setItem('solo-company-private-messages', JSON.stringify(privateMessages.value))
        localStorage.setItem('solo-company-tasks', JSON.stringify(tasks.value))
        localStorage.setItem('solo-company-strategy-tasks', JSON.stringify(strategyTasks.value))
        localStorage.setItem('solo-company-phase', currentPhase.value)
        console.log('[Save] CEO:', ceoMessages.value.length, 'Normal:', normalMessages.value.length, 'Strategy:', strategyMessages.value.length, 'Private:', Object.keys(privateMessages.value).length, 'Tasks:', tasks.value.length, 'StrategyTasks:', strategyTasks.value.length, '(localStorage fallback)')
      }
    } catch (e) {
      console.error('[Save] Error:', e)
      // 降级到 localStorage 作为后备
      try {
        console.log('[Save] Falling back to localStorage...')
        localStorage.setItem('solo-company-ceo-messages', JSON.stringify(ceoMessages.value.slice(-100)))
        localStorage.setItem('solo-company-normal-messages', JSON.stringify(normalMessages.value.slice(-100)))
        localStorage.setItem('solo-company-strategy-messages', JSON.stringify(strategyMessages.value.slice(-100)))
        localStorage.setItem('solo-company-private-messages', JSON.stringify(privateMessages.value))
        localStorage.setItem('solo-company-tasks', JSON.stringify(tasks.value))
        localStorage.setItem('solo-company-strategy-tasks', JSON.stringify(strategyTasks.value))
        localStorage.setItem('solo-company-phase', currentPhase.value)
        console.log('[Save] Fallback to localStorage successful')
      } catch (fallbackError) {
        console.error('[Save] Fallback error:', fallbackError)
      }
    }
  }

  /**
   * 迁移旧消息格式：将 roleInfo 转换为 role
   * 旧格式：{ from: 'agent', role: 'assistant', roleInfo: {...} }
   * 新格式：{ from: 'agent', role: {...} }
   */
  function migrateMessageRole(msg) {
    try {
      if (!msg || msg.from !== 'agent') return msg
      // 已经有完整的 role 对象，不需要迁移
      if (msg.role && typeof msg.role === 'object' && msg.role.name && msg.role.avatar) return msg
      // 有 roleInfo，迁移到 role
      if (msg.roleInfo && typeof msg.roleInfo === 'object' && msg.roleInfo.name) {
        return { ...msg, role: msg.roleInfo }
      }
      // 有 roleId，尝试从 COMPANY_ROLES 或 STRATEGY_ROLES 查找
      const roleId = msg.roleId || (msg.role && typeof msg.role === 'object' ? msg.role.id : null)
      if (roleId) {
        const role = COMPANY_ROLES.find(r => r.id === roleId) || STRATEGY_ROLES.find(r => r.id === roleId)
        if (role) return { ...msg, role }
      }
      // 兜底：如果是 CEO 相关消息，使用 CEO 角色
      if (msg.isSummary || msg.isInitial) {
        const ceoRole = COMPANY_ROLES.find(r => r.id === 'ceo')
        if (ceoRole) return { ...msg, role: ceoRole }
      }
    } catch (e) {
      console.error('[migrateMessageRole] Error:', e, 'msg:', msg)
    }
    return msg
  }

  async function loadFromStorage() {
    let useIndexedDB = false
    try {
      // 优先使用 IndexedDB
      if (isIndexedDBAvailable()) {
        useIndexedDB = true
        const [
          ceoMsgs,
          normalMsgs,
          strategyMsgs,
          privateMsgs,
          loadedTasks,
          loadedStrategyTasks,
          phase
        ] = await Promise.all([
          loadFromStore(STORES.CEO_MESSAGES),
          loadFromStore(STORES.NORMAL_MESSAGES),
          loadFromStore(STORES.STRATEGY_MESSAGES),
          loadFromStore(STORES.PRIVATE_MESSAGES, true),
          loadFromStore(STORES.TASKS),
          loadFromStore(STORES.STRATEGY_TASKS),
          loadSetting('phase')
        ])

        // 检查是否有任何数据加载成功
        const hasData = (ceoMsgs && ceoMsgs.length > 0) ||
                        (normalMsgs && normalMsgs.length > 0) ||
                        (strategyMsgs && strategyMsgs.length > 0) ||
                        (privateMsgs && typeof privateMsgs === 'object' && Object.keys(privateMsgs).length > 0)

        if (hasData) {
          if (ceoMsgs && ceoMsgs.length > 0) {
            ceoMessages.value = ceoMsgs.map(migrateMessageRole)
            console.log('[Load] CEO messages loaded:', ceoMessages.value.length)
          }
          if (normalMsgs && normalMsgs.length > 0) {
            normalMessages.value = normalMsgs.map(migrateMessageRole)
            console.log('[Load] Normal messages loaded:', normalMessages.value.length)
          }
          if (strategyMsgs && strategyMsgs.length > 0) {
            strategyMessages.value = strategyMsgs.map(migrateMessageRole)
            console.log('[Load] Strategy messages loaded:', strategyMessages.value.length)
          }
          if (privateMsgs && typeof privateMsgs === 'object' && Object.keys(privateMsgs).length > 0) {
            for (const key in privateMsgs) {
              privateMsgs[key] = privateMsgs[key].map(migrateMessageRole)
            }
            privateMessages.value = privateMsgs
            console.log('[Load] Private messages loaded:', Object.keys(privateMessages.value).length)
          }
          if (loadedTasks && loadedTasks.length > 0) {
            tasks.value = loadedTasks
            console.log('[Load] Tasks loaded:', tasks.value.length)
          }
          if (loadedStrategyTasks && loadedStrategyTasks.length > 0) {
            strategyTasks.value = loadedStrategyTasks
            console.log('[Load] Strategy tasks loaded:', strategyTasks.value.length)
          }
          if (phase) {
            currentPhase.value = phase
            console.log('[Load] Phase loaded:', phase)
          }
          return // 成功加载 IndexedDB 数据，直接返回
        } else {
          console.log('[Load] IndexedDB empty, trying localStorage fallback...')
          useIndexedDB = false
        }
      }
    } catch (e) {
      console.error('[Load] IndexedDB error:', e)
      useIndexedDB = false
    }

    // 降级到 localStorage
    if (!useIndexedDB) {
      try {
        console.log('[Load] Using localStorage fallback')
        const savedCEOMessages = localStorage.getItem('solo-company-ceo-messages')
        if (savedCEOMessages) {
          ceoMessages.value = JSON.parse(savedCEOMessages).map(migrateMessageRole)
          console.log('[Load] CEO messages loaded from localStorage:', ceoMessages.value.length)
        }

        const savedNormalMessages = localStorage.getItem('solo-company-normal-messages')
        if (savedNormalMessages) {
          normalMessages.value = JSON.parse(savedNormalMessages).map(migrateMessageRole)
          console.log('[Load] Normal messages loaded from localStorage:', normalMessages.value.length)
        }

        const savedStrategyMessages = localStorage.getItem('solo-company-strategy-messages')
        if (savedStrategyMessages) {
          strategyMessages.value = JSON.parse(savedStrategyMessages).map(migrateMessageRole)
          console.log('[Load] Strategy messages loaded from localStorage:', strategyMessages.value.length)
        }

        const savedPrivateMessages = localStorage.getItem('solo-company-private-messages')
        if (savedPrivateMessages) {
          const parsed = JSON.parse(savedPrivateMessages)
          for (const key in parsed) {
            parsed[key] = parsed[key].map(migrateMessageRole)
          }
          privateMessages.value = parsed
          console.log('[Load] Private messages loaded from localStorage:', Object.keys(privateMessages.value).length)
        }

        const savedTasks = localStorage.getItem('solo-company-tasks')
        if (savedTasks) {
          tasks.value = JSON.parse(savedTasks)
          console.log('[Load] Tasks loaded from localStorage:', tasks.value.length)
        }

        const savedStrategyTasks = localStorage.getItem('solo-company-strategy-tasks')
        if (savedStrategyTasks) {
          strategyTasks.value = JSON.parse(savedStrategyTasks)
          console.log('[Load] Strategy tasks loaded from localStorage:', strategyTasks.value.length)
        }

        const savedPhase = localStorage.getItem('solo-company-phase')
        if (savedPhase) {
          currentPhase.value = savedPhase
          console.log('[Load] Phase loaded from localStorage:', savedPhase)
        }
      } catch (e) {
        console.error('[Load] localStorage error:', e)
      }
    }
  }

  async function saveModeToStorage() {
    try {
      if (isIndexedDBAvailable()) {
        await saveSetting('chatMode', currentChatMode.value)
        if (currentChatMode.value === 'private' && privateChatTarget.value) {
          await saveSetting('privateTarget', privateChatTarget.value)
        }
      } else {
        localStorage.setItem('solo-company-chat-mode', currentChatMode.value)
        if (currentChatMode.value === 'private' && privateChatTarget.value) {
          localStorage.setItem('solo-company-private-target', privateChatTarget.value)
        }
      }
    } catch (e) {
      console.error('[Save Mode] Error:', e)
    }
  }

  async function loadModeFromStorage() {
    try {
      if (isIndexedDBAvailable()) {
        const savedMode = await loadSetting('chatMode')
        if (savedMode === 'ceo' || savedMode === 'normal' || savedMode === 'private' || savedMode === 'strategy') {
          currentChatMode.value = savedMode
          // console.log('[Load] Chat mode loaded:', savedMode)
          if (savedMode === 'private') {
            const savedTarget = await loadSetting('privateTarget')
            if (savedTarget) {
              privateChatTarget.value = savedTarget
              console.log('[Load] Private chat target loaded:', savedTarget)
            }
          }
        }
      } else {
        const savedMode = localStorage.getItem('solo-company-chat-mode')
        if (savedMode === 'ceo' || savedMode === 'normal' || savedMode === 'private' || savedMode === 'strategy') {
          currentChatMode.value = savedMode
          // console.log('[Load] Chat mode loaded:', savedMode)
          if (savedMode === 'private') {
            const savedTarget = localStorage.getItem('solo-company-private-target')
            if (savedTarget) {
              privateChatTarget.value = savedTarget
              console.log('[Load] Private chat target loaded:', savedTarget)
            }
          }
        }
      }
    } catch (e) {
      console.error('[Load Mode] Error:', e)
    }
  }

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  return {
    // State
    messages,
    ceoMessages,
    normalMessages,
    privateMessages,
    strategyMessages,
    currentChatMode,
    privateChatTarget,
    privateChatTargetInfo,
    isPrivateMode,
    tasks,
    strategyTasks,
    currentTasks,
    taskHistory,
    isLoading,
    activeConvLoading,
    apiConnected,
    currentPhase,
    ceoTyping,
    showTaskHistory,
    savedFiles,
    extractFilesFromToolCalls,
    extractFilesFromText,
    // 多会话
    conversations,
    currentConversationId,
    // Computed
    messageCount,
    activeTasks,
    completedTasks,
    recentConversation,
    // Actions
    init,
    sendMessage,
    switchChatMode,
    startPrivateChat,
    exitPrivateChat,
    clearMessages,
    exportChat,
    saveTaskToHistory,
    viewTaskHistory,
    clearTaskHistory,
    stopGeneration,
    // 多会话 Actions
    newConversation,
    switchConversation,
    deleteConversation
  }
})
