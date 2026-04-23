<template>
  <div class="mode-selection">
    <div class="mode-selection-header">
      <div class="logo">
        <div class="logo-icon">🏢</div>
        <div class="logo-text">
          <div class="logo-title">Solo Company</div>
          <div class="logo-sub">一人公司 · AI 驱动</div>
        </div>
      </div>
    </div>

    <div class="mode-selection-content">
      <h1 class="main-title">选择对话模式</h1>
      <p class="main-subtitle">根据你的需求选择合适的 AI 协作方式</p>

      <div class="mode-cards">
        <!-- CEO统筹 -->
        <div class="mode-card" @click="selectMode('ceo')">
          <div class="card-icon">👔</div>
          <div class="card-content">
            <h3 class="card-title">CEO 统筹</h3>
            <p class="card-desc">
              CEO Alex Chen 统筹协调，15位高管团队协作处理你的问题
            </p>
            <div class="card-features">
              <span class="feature-tag">任务分配</span>
              <span class="feature-tag">多部门协作</span>
              <span class="feature-tag">实时进度</span>
            </div>
          </div>
          <div class="card-arrow">→</div>
        </div>

        <!-- A股策略分析 -->
        <div class="mode-card strategy" @click="selectMode('strategy')">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <h3 class="card-title">A股策略分析</h3>
            <p class="card-desc">
              五位A股投资专家协同分析，提供专业的股票/板块/市场投资建议
            </p>
            <div class="card-features">
              <span class="feature-tag">宏观+技术+基本面</span>
              <span class="feature-tag">行业研究</span>
              <span class="feature-tag">风控建议</span>
            </div>
          </div>
          <div class="card-arrow">→</div>
        </div>

        <!-- AI助手 -->
        <div class="mode-card" @click="selectMode('normal')">
          <div class="card-icon">🤖</div>
          <div class="card-content">
            <h3 class="card-title">AI 助手</h3>
            <p class="card-desc">
              直接与 AI 对话，快速获取答案，适合日常咨询和简单问题
            </p>
            <div class="card-features">
              <span class="feature-tag">快速响应</span>
              <span class="feature-tag">直接对话</span>
              <span class="feature-tag">轻量咨询</span>
            </div>
          </div>
          <div class="card-arrow">→</div>
        </div>
      </div>

      <div class="mode-selection-footer">
        <p>💡 提示：选择后可以在聊天界面随时切换模式</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(["select-mode"]);

function selectMode(mode) {
  emit("select-mode", mode);
}
</script>

<style scoped>
.mode-selection {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-app);
  overflow: hidden;
}

.mode-selection-header {
  padding: 24px 32px;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 32px;
}

.logo-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.logo-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.mode-selection-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow-y: auto;
}

.main-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
  text-align: center;
}

.main-subtitle {
  font-size: 15px;
  color: var(--text-muted);
  margin: 0 0 48px;
  text-align: center;
}

.mode-cards {
  display: flex;
  gap: 24px;
  max-width: 1200px;
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
}

.mode-card {
  flex: 1;
  min-width: 280px;
  max-width: 360px;
  background: var(--bg-sidebar);
  border: 2px solid var(--border);
  border-radius: 16px;
  padding: 32px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;
}

.mode-card:hover {
  border-color: rgba(79, 126, 248, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.mode-card.strategy:hover {
  border-color: rgba(231, 76, 60, 0.5);
}

.card-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.card-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 20px;
}

.card-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

.feature-tag {
  font-size: 11px;
  padding: 4px 10px;
  background: rgba(79, 126, 248, 0.1);
  border: 1px solid rgba(79, 126, 248, 0.2);
  border-radius: 20px;
  color: #4f7ef8;
}

.mode-card.strategy .feature-tag {
  background: rgba(231, 76, 60, 0.1);
  border-color: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.card-arrow {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(79, 126, 248, 0.1);
  color: #4f7ef8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  opacity: 0;
  transition: all 0.3s ease;
}

.mode-card:hover .card-arrow {
  opacity: 1;
}

.mode-card.strategy .card-arrow {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.mode-selection-footer {
  margin-top: 48px;
  text-align: center;
}

.mode-selection-footer p {
  font-size: 13px;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .mode-cards {
    flex-direction: column;
    align-items: center;
  }

  .mode-card {
    width: 100%;
    max-width: 400px;
  }
}
</style>
