import { User, MessageSquare } from 'lucide-react';

const agents = [
  {
    id: 'data-analyst',
    name: '李明',
    role: '数据分析师',
    description: '擅长市场数据分析和趋势预测',
    avatarBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
  },
  {
    id: 'news-analyst',
    name: '王芳',
    role: '新闻分析师',
    description: '实时追踪财经新闻和市场情绪',
    avatarBg: 'bg-gradient-to-br from-purple-400 to-purple-600',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
  },
  {
    id: 'market-interpreter',
    name: '张伟',
    role: '行情解读员',
    description: '提供专业的技术分析和交易建议',
    avatarBg: 'bg-gradient-to-br from-green-400 to-green-600',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
  },
  {
    id: 'strategy-advisor',
    name: '刘洋',
    role: '策略顾问',
    description: '制定量化交易策略和风险管理',
    avatarBg: 'bg-gradient-to-br from-orange-400 to-orange-600',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
  },
  {
    id: 'risk-manager',
    name: '陈静',
    role: '风险管理师',
    description: '评估投资风险和资金管理',
    avatarBg: 'bg-gradient-to-br from-red-400 to-red-600',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
  },
  {
    id: 'market-researcher',
    name: '赵强',
    role: '市场研究员',
    description: '深度研究行业和公司基本面',
    avatarBg: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-600',
  },
];

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  description: string;
  avatarBg: string;
  bgColor: string;
  textColor: string;
}

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
