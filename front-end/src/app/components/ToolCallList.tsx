/**
 * ToolCallList — 渲染一条 assistant 消息伴随的工具调用列表
 *
 * 数据来自 openclawGateway 解析的 AgentStreamEvent（item / command_output 两类），
 * 由 useChatSession 聚合为 ToolCallSnapshot[] 后挂载到 message.toolCalls。
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Terminal } from 'lucide-react';
import type { ToolCallSnapshot } from '../../types/agentStream';

interface ToolCallListProps {
  toolCalls: ToolCallSnapshot[];
}

export function ToolCallList({ toolCalls }: ToolCallListProps) {
  if (!toolCalls || toolCalls.length === 0) return null;
  return (
    <div className="mb-3 space-y-2">
      {toolCalls.map(tc => (
        <ToolCallItem key={tc.toolCallId} call={tc} />
      ))}
    </div>
  );
}

function ToolCallItem({ call }: { call: ToolCallSnapshot }) {
  const [expanded, setExpanded] = useState(false);

  const StatusIcon =
    call.status === 'completed' ? CheckCircle2 :
    call.status === 'failed'    ? XCircle :
    Loader2;

  const statusColor =
    call.status === 'completed' && call.exitCode === 0 ? 'text-green-600' :
    call.status === 'completed' && call.exitCode && call.exitCode !== 0 ? 'text-orange-500' :
    call.status === 'failed'    ? 'text-red-500' :
    'text-blue-500';

  const animClass = call.status === 'running' ? 'animate-spin' : '';

  // 显示文本：优先 output > progressText
  const display = call.output ?? call.progressText ?? '';
  // meta 在没有 output/progressText 时作为"调用参数"兜底展示
  const hasDetail = display.length > 0 || !!call.meta || call.cwd !== undefined || call.exitCode !== undefined;

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/60 text-sm">
      <button
        type="button"
        onClick={() => hasDetail && setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
        disabled={!hasDetail}
      >
        {hasDetail ? (
          expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <span className="w-3.5 h-3.5 flex-shrink-0" />
        )}
        <Terminal className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${statusColor} ${animClass}`} />
        <span className="font-mono text-xs text-gray-700 truncate flex-1" title={call.title}>
          {call.title || call.name || call.toolCallId}
        </span>
        {call.durationMs !== undefined && (
          <span className="text-xs text-gray-400 flex-shrink-0">{formatDuration(call.durationMs)}</span>
        )}
      </button>

      {expanded && hasDetail && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-200 space-y-2">
          {(call.cwd || call.exitCode !== undefined) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              {call.cwd && <span><span className="text-gray-400">cwd:</span> <span className="font-mono">{call.cwd}</span></span>}
              {call.exitCode !== undefined && (
                <span><span className="text-gray-400">exit:</span> <span className="font-mono">{call.exitCode}</span></span>
              )}
            </div>
          )}
          {/* 有 output/progressText 时展示执行结果 */}
          {display && (
            <pre className="text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-72 overflow-y-auto">
              {stripAnsi(display)}
            </pre>
          )}
          {/* 无 output 时把调用参数 (meta) 作为兜底信息 */}
          {!display && call.meta && (
            <div className="text-xs text-gray-500">
              <span className="text-gray-400 mr-1">args:</span>
              <span className="font-mono text-gray-600 break-all">{call.meta}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m${Math.floor((ms % 60_000) / 1000)}s`;
}

// 简单的 ANSI 转义清理（命令输出常见 \x1b[...m 颜色码）
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}
