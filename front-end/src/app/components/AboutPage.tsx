import { useState } from 'react';
import { Laptop, Cpu, HardDrive, Shield, RefreshCw, Copy, Check } from 'lucide-react';

export function AboutPage() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 模拟系统信息数据
  const systemInfo = {
    os: 'Windows 11 Pro',
    version: '23H2 (OS Build 22631.2861)',
    deviceCode: 'YJ-T-2026-0421-A7B3C9',
    googleAuthCode: 'XKCD-MPLA-QWER-TYUI-ZXCV-BNM',
    hardware: {
      cpu: 'Intel Core i9-13900K @ 3.0GHz',
      gpu: 'NVIDIA GeForce RTX 4090 24GB',
      ram: '64 GB DDR5 5600MHz',
      storage: '2 TB NVMe SSD',
      display: '32" 4K UHD (3840x2160)',
    },
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-gray-900">关于本机</h2>
        <p className="text-sm text-gray-500 mt-1">系统配置与安全信息</p>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Laptop className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">操作系统</p>
                  <p className="text-sm font-medium text-gray-900">Windows 11 Pro</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">处理器</p>
                  <p className="text-sm font-medium text-gray-900">Intel Core i9</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">内存</p>
                  <p className="text-sm font-medium text-gray-900">64 GB DDR5</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">存储</p>
                  <p className="text-sm font-medium text-gray-900">2 TB NVMe</p>
                </div>
              </div>
            </div>
          </div>

          {/* Device Code Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-600" />
                <h3 className="text-base font-semibold text-gray-900">设备识别码</h3>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">唯一设备标识符</div>
                  <div className="font-mono text-sm text-gray-900 break-all">{systemInfo.deviceCode}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(systemInfo.deviceCode, 'deviceCode')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                  title="复制"
                >
                  {copiedField === 'deviceCode' ? (
                    <Check className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                此代码用于设备身份验证和授权，请妥善保管
              </div>
            </div>
          </div>

          {/* Google Authenticator Code Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-600" />
                <h3 className="text-base font-semibold text-gray-900">谷歌动态验证码</h3>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">两步验证密钥</div>
                  <div className="font-mono text-sm text-gray-900 break-all tracking-wider">
                    {systemInfo.googleAuthCode.match(/.{1,5}/g)?.join(' ')}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(systemInfo.googleAuthCode, 'googleAuth')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                  title="复制"
                >
                  {copiedField === 'googleAuth' ? (
                    <Check className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-800">
                    <div className="font-medium mb-1">安全提示</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>请勿将此密钥分享给他人</li>
                      <li>建议在 Google Authenticator 应用中备份</li>
                      <li>如密钥泄露，请立即重置</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Configuration Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-gray-600" />
                <h3 className="text-base font-semibold text-gray-900">硬件配置</h3>
              </div>
            </div>
            
            <div className="p-6 space-y-3">
              <HardwareItem
                icon={<Cpu className="w-5 h-5 text-gray-600" />}
                label="处理器"
                value={systemInfo.hardware.cpu}
              />
              <HardwareItem
                icon={<Cpu className="w-5 h-5 text-gray-600" />}
                label="显卡"
                value={systemInfo.hardware.gpu}
              />
              <HardwareItem
                icon={<HardDrive className="w-5 h-5 text-gray-600" />}
                label="内存"
                value={systemInfo.hardware.ram}
              />
              <HardwareItem
                icon={<HardDrive className="w-5 h-5 text-gray-600" />}
                label="存储"
                value={systemInfo.hardware.storage}
              />
              <HardwareItem
                icon={<Laptop className="w-5 h-5 text-gray-600" />}
                label="显示器"
                value={systemInfo.hardware.display}
              />
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-xs text-gray-400 pt-4 pb-2">
            YUANJI T v1.0.0 · © 2026 All Rights Reserved
          </div>
        </div>
      </div>
    </div>
  );
}

function HardwareItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-sm font-medium text-gray-900 truncate">{value}</div>
      </div>
    </div>
  );
}
