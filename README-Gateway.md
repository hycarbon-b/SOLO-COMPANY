# Solo Company - OpenClaw Gateway 模式部署

## 架构

```
用户浏览器 → 访问服务器域名（前端静态文件）
    ↓
前端页面直接通过 WebSocket 连接本地 Gateway
    ↓
ws://127.0.0.1:18789 (OpenClaw Gateway)
```

**关键变化**：前端直接通过 WebSocket 连接一体机本地的 openclaw Gateway，不再需要后端 API。

## 部署步骤

### 1. 服务器部署前端

```bash
# 构建前端
npm run build

# 将 dist 目录部署到服务器（Nginx/Apache/CDN）
scp -r dist user@服务器IP:/var/www/solo-company/
```

Nginx 配置示例：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/solo-company/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 2. 一体机配置

每台需要运行 Solo Company 的电脑（一体机）需要安装：

#### 2.1 安装 Node.js 22+

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
```

#### 2.2 安装 openclaw

```bash
npm install -g openclaw
```

#### 2.3 配置 openclaw agent

```bash
openclaw setup --mode local --non-interactive
```

#### 2.4 启动 Gateway

```bash
openclaw gateway run

# 或者后台运行
nohup openclaw gateway run > gateway.log 2>&1 &
```

Gateway 默认会监听：
- WebSocket: `ws://127.0.0.1:18789`
- HTTP API: `http://127.0.0.1:19001`

### 3. 用户使用

1. 确保一体机已启动 Gateway (`openclaw gateway run`)
2. 打开浏览器，访问服务器域名
3. 开始聊天

## 注意事项

### 跨域问题

由于前端在服务器，WebSocket 连接本地 (`127.0.0.1`)，浏览器可能会有安全限制。

**解决方案**：

1. **使用 HTTPS + Secure Context**
   - 服务器使用 HTTPS
   - 本地 Gateway 使用 wss（需要配置证书）

2. **浏览器设置（仅开发测试）**
   - Chrome: 启动参数 `--disable-web-security`
   - 不推荐用于生产环境

3. **推荐：使用 Electron/Tauri 打包（最佳方案）**
   - 将前端打包成桌面应用
   - 桌面应用没有跨域限制
   - 用户双击打开即可使用

### Gateway 自动启动

配置开机自动启动 Gateway：

**macOS (launchd)**:
```xml
<!-- ~/Library/LaunchAgents/com.openclaw.gateway.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.gateway</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/openclaw</string>
        <string>gateway</string>
        <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

**Linux (systemd)**:
```ini
# /etc/systemd/system/openclaw-gateway.service
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/openclaw gateway run
Restart=always
User=your-username

[Install]
WantedBy=multi-user.target
```

启用：
```bash
sudo systemctl enable openclaw-gateway
sudo systemctl start openclaw-gateway
```

## 故障排查

### 1. WebSocket 连接失败

检查 Gateway 是否运行：
```bash
curl http://127.0.0.1:19001/health
```

检查端口是否被占用：
```bash
lsof -i :18789
```

### 2. 浏览器跨域错误

查看浏览器控制台 (F12) 是否有 CORS 或混合内容错误。

**临时解决**：使用 http（非 https）访问服务器。

**长期解决**：使用 Electron 打包或配置本地 HTTPS。

### 3. Gateway 返回错误

查看 Gateway 日志：
```bash
tail -f gateway.log
```

## 替代方案

如果 WebSocket 直连有跨域问题，可以考虑：

### 方案A：本地运行轻量级代理

一体机上运行一个本地代理，转发请求到 Gateway：

```bash
# 使用现成的反向代理
npx local-cors-proxy --proxyUrl http://127.0.0.1:19001
```

### 方案B：Electron 桌面应用

将前端打包成 Electron 应用，没有跨域限制：

```bash
npm install electron --save-dev
# 配置 Electron 入口和打包
npm run electron:build
```

这样用户只需要：
1. 安装 Electron 应用
2. 启动 Gateway
3. 打开应用即可使用
