import * as React from 'react';

interface WebViewProps {
  url: string;
}

export function WebView({ url }: WebViewProps) {
  if (!url) {
    return (
      <main className="h-full flex items-center justify-center bg-white text-gray-500">
        未提供网址
      </main>
    );
  }
  return (
    <main className="h-full flex flex-col bg-white">
      <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500 truncate" title={url}>
        {url}
      </div>
      <div className="flex-1 overflow-hidden">
        {/* Electron webview 标签用于嵌入外部网页 */}
        {React.createElement('webview', {
          src: url,
          style: { width: '100%', height: '100%', display: 'inline-flex' },
          allowpopups: 'true',
        })}
      </div>
    </main>
  );
}
