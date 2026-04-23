# 2026-04-24-构建-FE- electron打包记录

## 任务

打包 front-end 的 electron 应用并保证能成功运行

## 执行过程

### 1. 执行构建命令

```bash
cd front-end; npm run electron:build
```

### 2. 构建结果

- Vite 构建成功，生成 `dist/` 目录
- electron-builder 打包成功，生成 `release/win-unpacked/` 目录
- 应用成功运行（验证可启动）

### 3. 生成的产物

| 文件 | 大小 |
|------|------|
| `release/win-unpacked/Trading Application.exe` | 213 MB |
| `release/win-unpacked/resources/app.asar` | 122 MB |
| `release/Trading-Application-Portable.zip` | 155 MB |

### 4. 报错问题

electron-builder 始终报告 exit code 1，报错信息如下：

```
⨯ Get "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z": tls: failed to verify certificate: x509: certificate signed by unknown authority
```

### 5. 根因分析

- electron-builder 内部的 `rcedit` 工具会尝试下载 `winCodeSign` 从 GitHub
- `winCodeSign` 用于在 Windows 可执行文件中嵌入 ASAR 完整性校验元数据
- 本机 TLS 层无法验证 GitHub 的 SSL 证书（受企业代理/防火墙中间人攻击影响）
- 这是**机器级别的网络/证书问题**，与项目配置无关

### 6. 临时解决方案

由于核心打包流程已完成，生成的 `win-unpacked` 文件夹包含完整应用：

1. **直接运行**：`release/win-unpacked/Trading Application.exe`
2. **便携分发**：使用 `win-unpacked` 文件夹手动压缩为 zip 文件

### 7. 后续建议

若需要生成 NSIS 安装器或 portable exe（由 electron-builder 自动生成），需要在：

- 没有 TLS 证书问题的机器上进行构建，或
- 修复本机根证书存储（将 GitHub 证书添加到受信任根证书列表）

## package.json 配置 (未修改)

```json
{
  "win": {
    "target": ["nsis", "portable"]
  }
}
```

**结论**: 应用可正常运行，构建流程本身无问题，仅 post-build 的代码签名步骤因 TLS 证书被阻止。