import { User, MessageSquare } from 'lucide-react';
import { agents, type AgentInfo } from '../config/agentsConfig';

export type { AgentInfo };

interface AgentPageProps {
  onStartChat: (agent: AgentInfo) => void;
}

export function AgentPage({ onStartChat }: AgentPageProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Agent 中心</h2>
        <p className="text-sm text-gray-500 mt-1">选择专业 Agent 开始对话，获取定制化的交易分析和建议</p>
      </div>

      {/* Agents Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="group relative bg-white rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-gray-200"
              onClick={() => onStartChat(agent)}
            >
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div className={`w-16 h-16 ${agent.avatarBg} rounded-full flex items-center justify-center shadow-lg ring-2 ring-white`}>
                  <User className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
              </div>

              {/* Role */}
              <div className="text-center mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{agent.role}</h3>
              </div>

              {/* Description */}
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 leading-relaxed">{agent.description}</p>
              </div>

              {/* Action Button */}
              <button
                className="w-full flex items-center justify-center gap-2 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChat(agent);
                }}
              >
                <MessageSquare className="w-4 h-4" />
                <span>开始工作</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
