/**
 * IndexedDB 存储服务
 * 用于存储大量聊天数据，替代 localStorage 的 5MB 限制
 */

const DB_NAME = 'solo-company-chat'
const DB_VERSION = 3

// 存储的表名
const STORES = {
  CEO_MESSAGES: 'ceoMessages',
  NORMAL_MESSAGES: 'normalMessages',
  STRATEGY_MESSAGES: 'strategyMessages',
  PRIVATE_MESSAGES: 'privateMessages',
  TASKS: 'tasks',
  STRATEGY_TASKS: 'strategyTasks',
  TASK_HISTORY: 'taskHistory',
  SETTINGS: 'settings',
  CONV_MESSAGES: 'convMessages',    // 多会话消息（按 convId 索引）
  CONV_TASKS: 'convTasks'            // 多会话任务（按 convId 索引）
}

let db = null

/**
 * 打开数据库连接
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result
      const oldVersion = event.oldVersion

      // 删除旧表（如果存在）以更新 schema
      if (oldVersion < 1) {
        // 首次创建
      } else {
        // 升级时删除旧表重新创建
        if (database.objectStoreNames.contains(STORES.CEO_MESSAGES)) {
          database.deleteObjectStore(STORES.CEO_MESSAGES)
        }
        if (database.objectStoreNames.contains(STORES.NORMAL_MESSAGES)) {
          database.deleteObjectStore(STORES.NORMAL_MESSAGES)
        }
        if (database.objectStoreNames.contains(STORES.STRATEGY_MESSAGES)) {
          database.deleteObjectStore(STORES.STRATEGY_MESSAGES)
        }
        if (database.objectStoreNames.contains(STORES.PRIVATE_MESSAGES)) {
          database.deleteObjectStore(STORES.PRIVATE_MESSAGES)
        }
        if (database.objectStoreNames.contains(STORES.TASKS)) {
          database.deleteObjectStore(STORES.TASKS)
        }
        if (database.objectStoreNames.contains(STORES.STRATEGY_TASKS)) {
          database.deleteObjectStore(STORES.STRATEGY_TASKS)
        }
        if (database.objectStoreNames.contains(STORES.TASK_HISTORY)) {
          database.deleteObjectStore(STORES.TASK_HISTORY)
        }
        if (database.objectStoreNames.contains(STORES.SETTINGS)) {
          database.deleteObjectStore(STORES.SETTINGS)
        }
      }

      // 创建各个存储表 - 使用消息自带的 id，不启用 autoIncrement
      if (!database.objectStoreNames.contains(STORES.CEO_MESSAGES)) {
        database.createObjectStore(STORES.CEO_MESSAGES, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(STORES.NORMAL_MESSAGES)) {
        database.createObjectStore(STORES.NORMAL_MESSAGES, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(STORES.STRATEGY_MESSAGES)) {
        database.createObjectStore(STORES.STRATEGY_MESSAGES, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(STORES.PRIVATE_MESSAGES)) {
        // 私聊消息使用 id 作为主键，roleId 作为索引
        const store = database.createObjectStore(STORES.PRIVATE_MESSAGES, { keyPath: 'id' })
        store.createIndex('roleId', 'roleId', { unique: false })
      }
      if (!database.objectStoreNames.contains(STORES.TASKS)) {
        database.createObjectStore(STORES.TASKS, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(STORES.STRATEGY_TASKS)) {
        database.createObjectStore(STORES.STRATEGY_TASKS, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(STORES.TASK_HISTORY)) {
        database.createObjectStore(STORES.TASK_HISTORY, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' })
      }
      // v3: 多会话消息 & 任务存储
      if (!database.objectStoreNames.contains(STORES.CONV_MESSAGES)) {
        const convMsgStore = database.createObjectStore(STORES.CONV_MESSAGES, { keyPath: 'id' })
        convMsgStore.createIndex('convId', 'convId', { unique: false })
      }
      if (!database.objectStoreNames.contains(STORES.CONV_TASKS)) {
        const convTaskStore = database.createObjectStore(STORES.CONV_TASKS, { keyPath: 'id' })
        convTaskStore.createIndex('convId', 'convId', { unique: false })
      }
    }
  })
}

/**
 * 深拷贝数据，移除不可序列化的字段
 */
function cloneForStorage(item) {
  try {
    // 使用 JSON 序列化/反序列化来深拷贝，并移除不可序列化的字段
    return JSON.parse(JSON.stringify(item))
  } catch (e) {
    console.error('[IndexedDB] Clone error:', e, item)
    // 如果序列化失败，返回一个简化版本
    return {
      id: item.id || `${Date.now()}-${Math.random()}`,
      from: item.from || 'system',
      content: item.content || '',
      timestamp: item.timestamp || Date.now()
    }
  }
}

/**
 * 保存数据到指定存储表
 */
async function saveToStore(storeName, data) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    // 清空旧数据
    const clearRequest = store.clear()

    clearRequest.onsuccess = () => {
      let count = 0
      // 批量添加新数据
      if (Array.isArray(data)) {
        data.forEach(item => {
          try {
            // 深拷贝并序列化数据，确保可以存储
            const clonedItem = cloneForStorage(item)
            store.put(clonedItem)
            count++
          } catch (e) {
            console.error(`[IndexedDB] Error putting item to ${storeName}:`, e, item)
          }
        })
      } else if (data && typeof data === 'object') {
        // 对象格式（如私聊消息）
        Object.entries(data).forEach(([roleId, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach(msg => {
              try {
                const clonedMsg = cloneForStorage({ ...msg, roleId })
                store.put(clonedMsg)
                count++
              } catch (e) {
                console.error(`[IndexedDB] Error putting private msg to ${storeName}:`, e, msg)
              }
            })
          }
        })
      }
      console.log(`[IndexedDB] Saving ${count} items to ${storeName}`)
    }

    clearRequest.onerror = () => reject(clearRequest.error)
    transaction.oncomplete = () => {
      console.log(`[IndexedDB] Saved to ${storeName} complete`)
      resolve()
    }
    transaction.onerror = (e) => {
      console.error(`[IndexedDB] Transaction error for ${storeName}:`, e)
      reject(transaction.error)
    }
  })
}

/**
 * 从指定存储表加载数据
 */
async function loadFromStore(storeName, isPrivate = false) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      console.log(`[IndexedDB] Loaded ${request.result?.length || 0} items from ${storeName}`)
      if (isPrivate) {
        // 私聊消息需要按 roleId 分组
        const result = {}
        request.result.forEach(item => {
          const { roleId, ...msg } = item
          if (!result[roleId]) {
            result[roleId] = []
          }
          result[roleId].push(msg)
        })
        resolve(result)
      } else {
        resolve(request.result || [])
      }
    }

    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * 保存设置项
 */
async function saveSetting(key, value) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SETTINGS], 'readwrite')
    const store = transaction.objectStore(STORES.SETTINGS)
    const request = store.put({ key, value, timestamp: Date.now() })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * 加载设置项
 */
async function loadSetting(key) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SETTINGS], 'readonly')
    const store = transaction.objectStore(STORES.SETTINGS)
    const request = store.get(key)

    request.onsuccess = () => {
      resolve(request.result?.value)
    }
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * 按 convId 保存消息列表（覆盖该会话的所有消息）
 * 使用 put 直接写入（消息 id 自带唯一性，相同 id 会覆盖）
 */
async function saveConvMessages(convId, messages) {
  const database = await openDB()
  // 第一步：查出该 convId 下所有旧消息的 id
  const oldIds = await new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.CONV_MESSAGES], 'readonly')
    const store = tx.objectStore(STORES.CONV_MESSAGES)
    const index = store.index('convId')
    const req = index.getAllKeys(IDBKeyRange.only(convId))
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })

  // 第二步：删除旧记录 + 写入新记录
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.CONV_MESSAGES], 'readwrite')
    const store = tx.objectStore(STORES.CONV_MESSAGES)
    // 删除旧记录
    oldIds.forEach(id => store.delete(id))
    // 写入新记录
    let count = 0
    messages.forEach(msg => {
      try {
        store.put(cloneForStorage({ ...msg, convId }))
        count++
      } catch (e) {
        console.error(`[IndexedDB] Error saving conv msg:`, e)
      }
    })
    tx.oncomplete = () => {
      console.log(`[IndexedDB] Saved ${count} messages for conv ${convId}`)
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 按 convId 加载消息列表
 */
async function loadConvMessages(convId) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CONV_MESSAGES], 'readonly')
    const store = transaction.objectStore(STORES.CONV_MESSAGES)
    const index = store.index('convId')
    const request = index.getAll(IDBKeyRange.only(convId))

    request.onsuccess = () => {
      const msgs = (request.result || []).map(m => {
        const { convId: _, ...msg } = m
        return msg
      })
      console.log(`[IndexedDB] Loaded ${msgs.length} messages for conv ${convId}`)
      resolve(msgs)
    }
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * 按 convId 保存任务列表（覆盖该会话的所有任务）
 */
async function saveConvTasks(convId, taskList) {
  const database = await openDB()
  // 第一步：查出该 convId 下所有旧任务的 id
  const oldIds = await new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.CONV_TASKS], 'readonly')
    const store = tx.objectStore(STORES.CONV_TASKS)
    const index = store.index('convId')
    const req = index.getAllKeys(IDBKeyRange.only(convId))
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })

  // 第二步：删除旧记录 + 写入新记录
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.CONV_TASKS], 'readwrite')
    const store = tx.objectStore(STORES.CONV_TASKS)
    oldIds.forEach(id => store.delete(id))
    let count = 0
    taskList.forEach(task => {
      try {
        store.put(cloneForStorage({ ...task, convId }))
        count++
      } catch (e) {
        console.error(`[IndexedDB] Error saving conv task:`, e)
      }
    })
    tx.oncomplete = () => {
      console.log(`[IndexedDB] Saved ${count} tasks for conv ${convId}`)
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 按 convId 加载任务列表
 */
async function loadConvTasks(convId) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CONV_TASKS], 'readonly')
    const store = transaction.objectStore(STORES.CONV_TASKS)
    const index = store.index('convId')
    const request = index.getAll(IDBKeyRange.only(convId))

    request.onsuccess = () => {
      const taskList = (request.result || []).map(t => {
        const { convId: _, ...task } = t
        return task
      })
      resolve(taskList)
    }
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * 按 convId 删除消息和任务
 */
async function deleteConvData(convId) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CONV_MESSAGES, STORES.CONV_TASKS], 'readwrite')
    const msgStore = transaction.objectStore(STORES.CONV_MESSAGES)
    const taskStore = transaction.objectStore(STORES.CONV_TASKS)

    // 删除消息
    const msgIndex = msgStore.index('convId')
    const msgCursor = msgIndex.openCursor(IDBKeyRange.only(convId))
    msgCursor.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    // 删除任务
    const taskIndex = taskStore.index('convId')
    const taskCursor = taskIndex.openCursor(IDBKeyRange.only(convId))
    taskCursor.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    transaction.oncomplete = () => {
      console.log(`[IndexedDB] Deleted data for conv ${convId}`)
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * 删除数据库（用于调试）
 */
async function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 检查 IndexedDB 是否可用
 */
function isIndexedDBAvailable() {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch (e) {
    return false
  }
}

export {
  STORES,
  saveToStore,
  loadFromStore,
  saveSetting,
  loadSetting,
  deleteDatabase,
  isIndexedDBAvailable,
  saveConvMessages,
  loadConvMessages,
  saveConvTasks,
  loadConvTasks,
  deleteConvData
}
