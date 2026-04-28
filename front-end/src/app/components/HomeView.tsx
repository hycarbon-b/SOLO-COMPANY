import { Target, TrendingUp, Activity, Cpu, type LucideIcon } from 'lucide-react';
import { ChatComposer } from './ChatComposer';

interface HomeViewProps {
  inputValue: string;
  setInputValue: (v: string) => void;
  onSendMessage: () => void;
}

const QUICK_ACTIONS: Array<{ icon: LucideIcon; text: string; prompt: string }> = [
  { icon: Target, text: '智能选股', prompt: '帮我智能选股' },
  { icon: TrendingUp, text: '行情分析', prompt: '分析当前市场行情' },
  { icon: Activity, text: '技术分析', prompt: '进行技术分析' },
  { icon: Cpu, text: '策略生成', prompt: '生成交易策略' },
];

export function HomeView({ inputValue, setInputValue, onSendMessage }: HomeViewProps) {
  return (
    <main className="h-full flex overflow-hidden bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-white">
        <div className="w-full max-w-3xl">
          <h1 className="text-4xl text-center mb-12 text-gray-900">我能为你做什么？</h1>
          <div className="relative mb-6">
            <ChatComposer
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSend={onSendMessage}
              variant="home"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {QUICK_ACTIONS.map(({ icon: Icon, text, prompt }) => (
              <button
                key={text}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all"
                onClick={() => setInputValue(prompt)}
              >
                <Icon className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
