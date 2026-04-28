import { Edit2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useRef, useEffect } from 'react';
import { type Message } from '../fakeChatData';
import { ChatComposer } from './ChatComposer';
import { StrategyCard } from './StrategyCard';
import { StockPickerTable } from './StockPickerTable';

// 演示用：双均线策略示例代码（fakeChatData 中 isStrategy 消息使用）
const DUAL_MA_STRATEGY_CODE = `# 双均线交易策略
import pandas as pd

def dual_ma_strategy(data, short_window=5, long_window=20):
    data['short_ma'] = data['close'].rolling(window=short_window).mean()
    data['long_ma']  = data['close'].rolling(window=long_window).mean()
    data['signal']   = 0
    data.loc[data['short_ma'] > data['long_ma'], 'signal'] =  1  # 买入
    data.loc[data['short_ma'] < data['long_ma'], 'signal'] = -1  # 卖出
    data['position'] = data['signal'].diff()
    return data
`;

// 演示用：智能选股 Pipeline 代码（isStockPickerCode 消息气泡使用）
const STOCK_PICKER_PIPELINE_CODE = `# 多因子智能选股 Pipeline（示例）
import pandas as pd

def build_stock_pool(universe: pd.DataFrame) -> pd.DataFrame:
    """步骤一：构建候选池，剔除 ST / 停牌 / 低流动性标的"""
    pool = universe[(universe['is_st'] == 0) & (universe['is_suspended'] == 0)]
    pool = pool[pool['turnover_20d'] >= 1e8]
    return pool.copy()

def score_stocks(pool: pd.DataFrame) -> pd.DataFrame:
    """步骤二：多因子打分（基本面 35% + 估值 20% + 技术 25% + 情绪 20%）"""
    pool['fundamental'] = 0.5 * pool['roe_rank'] + 0.5 * pool['profit_growth_rank']
    pool['valuation']   = 0.6 * pool['pe_rank_inv'] + 0.4 * pool['peg_rank_inv']
    pool['technical']   = 0.7 * pool['momentum_60d_rank'] + 0.3 * pool['volume_trend_rank']
    pool['quality']     = (0.35 * pool['fundamental'] + 0.20 * pool['valuation']
                          + 0.25 * pool['technical']  + 0.20 * pool['sentiment_rank'])
    return pool

def select_top_k(scored: pd.DataFrame, k: int = 6) -> pd.DataFrame:
    """步骤三：风险过滤后按综合评分取 Top-K"""
    filtered = scored[scored['volatility_20d'] <= 0.42]
    result   = filtered.sort_values('quality', ascending=False).head(k)
    return result[['symbol', 'name', 'quality', 'industry']]
`;


// ─── Styled Markdown renderer ───────────────────────────────────────────────
function MdContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mt-3 mb-1.5 leading-snug">{children}</h1>,
        h2: ({ children }) => <h2 className="text-[13px] font-semibold text-gray-800 mt-2.5 mb-1 leading-snug">{children}</h2>,
        h3: ({ children }) => <h3 className="text-[12px] font-semibold text-gray-700 mt-2 mb-0.5 leading-snug">{children}</h3>,
        // Paragraphs
        p: ({ children }) => <p className="text-[13px] text-gray-800 leading-6 mb-2 last:mb-0">{children}</p>,
        // Lists
        ul: ({ children }) => <ul className="text-[13px] text-gray-800 leading-6 mb-2 list-disc list-inside space-y-0.5 pl-1">{children}</ul>,
        ol: ({ children }) => <ol className="text-[13px] text-gray-800 leading-6 mb-2 list-decimal list-inside space-y-0.5 pl-1">{children}</ol>,
        li: ({ children }) => <li className="leading-6 pl-0.5">{children}</li>,
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-gray-300 pl-3 my-2 text-[12px] text-gray-500 italic">
            {children}
          </blockquote>
        ),
        // Code
        code: ({ inline, children, ...props }: { inline?: boolean; children?: React.ReactNode }) =>
          inline ? (
            <code className="bg-gray-100 text-gray-800 text-[11px] font-mono px-1.5 py-0.5 rounded">{children}</code>
          ) : (
            <code className="block bg-gray-50 border border-gray-200 text-[11px] font-mono text-gray-800 px-3 py-2 rounded-lg overflow-x-auto whitespace-pre" {...props}>{children}</code>
          ),
        pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
        // Horizontal rule
        hr: () => <hr className="border-t border-gray-200 my-3" />,
        // Bold / Italic
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
        // Links
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[13px]">{children}</a>
        ),
        // ── Tables (GFM) ──────────────────────────────────────────────────
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-[12px] border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-gray-50/60 transition-colors">{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
            {children}
          </td>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

interface ChatPanelProps {
  messages: Message[];
  isTyping: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  onSendMessage: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  taskTitle?: string;
  onUpdateTitle?: (newTitle: string) => void;
  onOpenTab?: (type: import('./MainContent').TabType, title: string, taskId?: string, url?: string) => void;
}

// ─── HTML 卡片（iframe 隔离样式）─────────────────────────────────────────
const IFRAME_RESET = `<style>html,body{margin:0!important;padding:0!important;background:transparent!important;}</style>`;

function HtmlCardFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(80);

  const srcDoc = /<html[\s>]/i.test(html)
    ? html.replace(/<\/head>/i, `${IFRAME_RESET}</head>`)
    : `<!DOCTYPE html><html><head><meta charset="utf-8">${IFRAME_RESET}</head><body>${html}</body></html>`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const adjust = () => {
      const doc = iframe.contentDocument;
      const h = doc?.body?.scrollHeight || doc?.documentElement?.scrollHeight || 0;
      if (h > 0) setHeight(h);
    };
    iframe.addEventListener('load', adjust);
    const t = window.setTimeout(adjust, 300);
    return () => { iframe.removeEventListener('load', adjust); window.clearTimeout(t); };
  }, [srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="html-card"
      style={{ width: '100%', height: `${height}px`, border: 'none', display: 'block' }}
    />
  );
}

// ─── 智能选股 Pipeline 代码气泡 ─────────────────────────────────────────────
function StockPickerCodeBubble() {
  const [showCode, setShowCode] = useState(false);
  return (
    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm max-w-2xl">
      <p className="text-[13px] text-gray-800 leading-6 mb-3">
        我已将本次选股 Pipeline 整理为完整的 Python 代码，涵盖<strong className="font-semibold text-gray-900">候选池构建 → 多因子打分 → 风险过滤</strong>三个模块，可直接集成至 Freqtrade / Backtrader 等量化回测框架。
      </p>
      <button
        onClick={() => setShowCode(!showCode)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
        {showCode ? '隐藏代码' : '查看完整代码'}
      </button>
      {showCode && (
        <div className="mt-3">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
            <code>{STOCK_PICKER_PIPELINE_CODE}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ messages, isTyping, inputValue, setInputValue, onSendMessage, messagesEndRef, taskTitle, onUpdateTitle, onOpenTab }: ChatPanelProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(taskTitle || '');

  useEffect(() => {
    setEditedTitle(taskTitle || '');
  }, [taskTitle]);

  const handleTitleSave = () => {
    if (editedTitle.trim() && onUpdateTitle) {
      onUpdateTitle(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Title Bar */}
      {taskTitle && (
        <div className="px-6 py-4 flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTitleSave();
                } else if (e.key === 'Escape') {
                  setEditedTitle(taskTitle);
                  setIsEditingTitle(false);
                }
              }}
              className="text-lg font-medium text-gray-900 bg-transparent border-b border-blue-500 outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-lg font-medium text-gray-900">
                {taskTitle}
              </h2>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="编辑标题"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 bg-white">
        <div className="max-w-4xl mx-auto pb-2">
          {messages.map((message) => {
            if (
              message.role === 'assistant' &&
              !message.content &&
              !message.isStrategy &&
              !message.isStockPicker &&
              !message.isStockPickerCode &&
              message.type !== 'html'
            ) return null;
            
            return (
              <div key={message.id} className={`mb-6 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">AI</span>
                    </div>
                    <div className="flex-1">
                      {message.type === 'html' ? (
                        <div className="max-w-4xl">
                          <HtmlCardFrame html={message.content} />
                        </div>
                      ) : message.isStrategy ? (
                        <div className="max-w-2xl">
                          {message.content && (
                            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm mb-3">
                              <MdContent>{message.content}</MdContent>
                            </div>
                          )}
                          <StrategyCard
                            title="双均线交易策略"
                            description="基于 5 日和 20 日移动平均线的经典交易策略，短期均线上穿长期均线时买入，下穿时卖出"
                            code={DUAL_MA_STRATEGY_CODE}
                            onOpenTab={onOpenTab}
                          />
                        </div>
                      ) : message.isStockPicker ? (
                        <div className="max-w-4xl">
                          {message.content && (
                            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm mb-3">
                              <MdContent>{message.content}</MdContent>
                            </div>
                          )}
                          <StockPickerTable />
                        </div>
                      ) : message.isStockPickerCode ? (
                        <StockPickerCodeBubble />
                      ) : (
                        <div className="bg-white rounded-2xl px-4 py-3 inline-block max-w-2xl shadow-sm">
                          <MdContent>{message.content}</MdContent>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 inline-block max-w-2xl shadow-sm">
                    <p>{message.content}</p>
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="mb-6 flex gap-3 typing-bubble">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <span className="text-white text-xs">AI</span>
              </div>
              <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100 flex items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <ChatComposer
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={onSendMessage}
            variant="chat"
          />
        </div>
      </div>
    </div>
  );
}
