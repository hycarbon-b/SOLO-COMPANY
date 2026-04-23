/**
 * OpenClaw 配置向导 Composable
 * 帮助用户快速配置 OpenClaw 多 Agent
 */

export const OPENCLAW_SETUP_GUIDE = `
# 配置 OpenClaw 一人公司群聊

## 1. 安装 OpenClaw

\`\`\`bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
\`\`\`

## 2. 创建 5 个 Agent

\`\`\`bash
# 创建 CEO Agent
openclaw agents add ceo
openclaw agents edit ceo --soul  # 复制 CEO 的 SOUL 配置

# 创建其他 Agent
openclaw agents add product
openclaw agents add tech
openclaw agents add marketing
openclaw agents add finance
\`\`\`

## 3. 配置模型（~/.openclaw/openclaw.json）

\`\`\`json
{
  "agent": {
    "model": "openai/gpt-4o"
  },
  "agents": {
    "ceo": {
      "model": "anthropic/claude-opus-4-6"
    },
    "tech": {
      "model": "openai/gpt-4o"
    }
  }
}
\`\`\`

## 4. 启动网关

\`\`\`bash
openclaw gateway --port 18789
\`\`\`

## 5. 启动本应用

\`\`\`bash
npm run dev
\`\`\`

完成！你的 AI 一人公司团队就绪。
`

export function useOpenClawSetup() {
  return { OPENCLAW_SETUP_GUIDE }
}
