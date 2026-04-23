# Solo Company - 一体机部署指南

## 架构

```
用户浏览器 → http://一体机IP 或域名
    ↓
Nginx (80端口)
    ├── / → dist 静态文件
    └── /api → Node 后端 (localhost:3000)
         ↓
    Node + openclaw
```

## 一体机环境准备

### 1. 安装 Node.js 22+

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
nvm alias default 22

# 验证
node --version  # 应显示 v22.x.x
```

### 2. 安装 openclaw

```bash
npm install -g openclaw

# 验证
openclaw --version
```

### 3. 配置 openclaw agent

```bash
# 初始化配置
openclaw setup --mode local --non-interactive

# 或交互式配置
openclaw setup --wizard

# 确保 main agent 存在
openclaw agent --local --message "hello"
```

### 4. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# macOS (如果一体机是 Mac)
brew install nginx
```

## 部署步骤

### 1. 上传代码到一体机

```bash
# 在开发机打包
cd solo-company
npm run build

# 上传到一体机（示例）
scp -r dist server.js nginx.conf package.json user@一体机IP:/path/to/solo-company/
```

### 2. 安装依赖

```bash
ssh user@一体机IP
cd /path/to/solo-company
npm install --production
```

### 3. 配置 Nginx

```bash
# 复制配置
sudo cp /path/to/solo-company/nginx.conf /etc/nginx/sites-available/solo-company

# 修改配置中的路径
sudo nano /etc/nginx/sites-available/solo-company
# 修改: root /path/to/solo-company/dist;
# 修改: server_name 一体机IP或域名;

# 启用配置
sudo ln -s /etc/nginx/sites-available/solo-company /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
# 或 macOS: sudo nginx -s reload
```

### 4. 启动 Node 后端

```bash
cd /path/to/solo-company

# 前台运行（测试）
node server.js

# 后台运行（生产）
nohup node server.js > server.log 2>&1 &

# 或使用 pm2
npm install -g pm2
pm2 start server.js --name "solo-company"
pm2 save
pm2 startup
```

### 5. 验证部署

```bash
# 检查健康状态
curl http://localhost/api/health

# 测试聊天接口
curl -X POST http://localhost/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
```

浏览器访问：`http://一体机IP` 或 `http://你的域名`

## 常用命令

```bash
# 查看 Node 后端日志
tail -f server.log

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/solo-company.error.log

# 重启服务
pm2 restart solo-company
sudo systemctl restart nginx

# 停止服务
pm2 stop solo-company
```

## 故障排查

### 1. 502 Bad Gateway

- Node 后端是否运行：`ps aux | grep node`
- 端口是否被占用：`lsof -i :3000`
- Nginx 配置是否正确：`sudo nginx -t`

### 2. openclaw 调用失败

- 检查 Node 版本：`node --version` (需要 22+)
- 检查 openclaw 路径：`which openclaw`
- 手动测试：`openclaw agent --local --message "test"`
- 检查 server.js 中的路径配置

### 3. 前端白屏

- dist 目录是否正确构建
- Nginx 的 root 路径是否正确
- 浏览器控制台是否有报错

### 4. 权限问题

```bash
# 确保 Nginx 能访问 dist
sudo chown -R www-data:www-data /path/to/solo-company/dist

# 确保 openclaw 配置目录可访问
sudo chown -R $USER:$USER ~/.openclaw
```

## 更新部署

```bash
# 1. 上传新代码
scp -r dist user@一体机IP:/path/to/solo-company/

# 2. 重启 Node 后端
pm2 restart solo-company

# 3. 无需重启 Nginx（静态文件直接生效）
```
