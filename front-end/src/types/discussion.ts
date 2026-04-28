interface DiscussionEntry {
  schema: string
  event: 'start' | 'end'
  timestamp: string
  skill_id: string
  worker_label: string
  worker_name: string
  task_objective: string
  task_context?: string
  summary?: string
  key_findings?: Array<{ key: string; value: string }>
  next_actions?: string[]
  status?: 'success' | 'failed' | 'partial'
}

export interface DiscussionThread {
  id: string // 使用时间戳作为唯一ID
  startRecord: DiscussionEntry
  endRecord?: DiscussionEntry
  isActive: boolean // 是否有 start 但无 end
  startTime: Date
  endTime?: Date
  duration?: number // 毫秒
}
