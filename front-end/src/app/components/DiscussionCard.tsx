import { Clock, CheckCircle, AlertCircle, Loader2, User } from 'lucide-react'
import type { DiscussionThread } from '../../types/discussion'

interface DiscussionCardProps {
  thread: DiscussionThread
  onClick?: () => void
}

export function DiscussionCard({ thread, onClick }: DiscussionCardProps) {
  const { startRecord, endRecord, isActive, startTime, duration } = thread
  
  // Determine status
  let statusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200'
  let StatusIcon = Loader2
  let statusText = '进行中'
  
  if (endRecord) {
    if (endRecord.status === 'success') {
      statusColor = 'bg-green-100 text-green-700 border-green-200'
      StatusIcon = CheckCircle
      statusText = '已完成'
    } else if (endRecord.status === 'failed') {
      statusColor = 'bg-red-100 text-red-700 border-red-200'
      StatusIcon = AlertCircle
      statusText = '失败'
    } else if (endRecord.status === 'partial') {
      statusColor = 'bg-orange-100 text-orange-700 border-orange-200'
      StatusIcon = AlertCircle
      statusText = '部分完成'
    }
  }
  
  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds}秒`
  }
  
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-blue-200 mb-3"
    >
      {/* Header: Worker Info & Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {startRecord.worker_label}
            </h3>
            <p className="text-xs text-gray-500">{startRecord.worker_name}</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor} flex-shrink-0 ml-2`}>
          <StatusIcon className={`w-3.5 h-3.5 ${isActive ? 'animate-spin' : ''}`} />
          <span>{statusText}</span>
        </div>
      </div>
      
      {/* Task Objective */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
          {startRecord.task_objective}
        </p>
      </div>
      
      {/* Summary (if completed) */}
      {endRecord?.summary && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="font-medium text-gray-700">总结：</span>
            {endRecord.summary}
          </p>
        </div>
      )}
      
      {/* Footer: Time & Actions */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(startTime)}</span>
          </div>
          {duration && (
            <span className="text-gray-400">
              耗时 {formatDuration(duration)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
            {startRecord.skill_id.replace('employee_', '').toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}
