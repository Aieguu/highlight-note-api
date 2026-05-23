import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Highlight Note API</title>
  <style>
    /* Reset & Base Settings */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #09090b;
      background-image: 
        radial-gradient(at 0% 0%, hsla(253, 16%, 7%, 1) 0, transparent 50%), 
        radial-gradient(at 50% 0%, hsla(225, 39%, 25%, 0.12) 0, transparent 50%);
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }

    /* Block: Dashboard Card */
    .api-dashboard {
      background: rgba(20, 20, 23, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.6);
    }

    /* Elements of Dashboard */
    .api-dashboard__header {
      text-align: center;
      margin-bottom: 32px;
    }

    .api-dashboard__logo {
      font-size: 38px;
      margin-bottom: 14px;
      display: inline-block;
      filter: drop-shadow(0 4px 12px rgba(255, 255, 255, 0.1));
    }

    .api-dashboard__title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }

    .api-dashboard__subtitle {
      color: #a1a1aa;
      font-size: 13px;
      font-weight: 400;
    }

    /* Status Badge Indicator */
    .api-dashboard__status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.15);
      border-radius: 30px;
      padding: 10px 16px;
      margin-bottom: 32px;
    }

    .api-dashboard__status-dot {
      width: 6px;
      height: 6px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 12px #10b981;
      will-change: transform, opacity;
      animation: pulse-accelerated 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .api-dashboard__status-text {
      color: #34d399;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    /* Content Panels */
    .api-dashboard__panel {
      margin-bottom: 28px;
    }

    .api-dashboard__panel-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      margin-bottom: 12px;
    }

    /* Meta Info List */
    .api-dashboard__info-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .api-dashboard__info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }

    .api-dashboard__info-label {
      color: #a1a1aa;
    }

    .api-dashboard__info-value {
      color: #e4e4e7;
      font-weight: 500;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* API Endpoint List */
    .api-dashboard__endpoint-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .api-dashboard__endpoint-item {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      font-size: 13px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #e4e4e7;
    }

    .api-dashboard__method {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      min-width: 54px;
      text-align: center;
      margin-right: 12px;
      letter-spacing: 0.02em;
    }

    /* Method Modifiers */
    .api-dashboard__method--post { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .api-dashboard__method--get { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .api-dashboard__method--put { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .api-dashboard__method--delete { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    /* Footer Links */
    .api-dashboard__footer {
      text-align: center;
      font-size: 12px;
      color: #52525b;
      margin-top: 8px;
    }

    .api-dashboard__link {
      color: #a1a1aa;
      text-decoration: none;
      border-bottom: 1px dashed #3f3f46;
      transition: color 0.15s ease, border-color 0.15s ease;
    }

    .api-dashboard__link:hover {
      color: #ffffff;
      border-bottom-color: #ffffff;
    }

    /* Hardware Accelerated Animation Keyframes */
    @keyframes pulse-accelerated {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.25);
        opacity: 0.4;
      }
    }
  </style>
</head>
<body>
  <div class="api-dashboard">
    <header class="api-dashboard__header">
      <div class="api-dashboard__logo">📝</div>
      <h1 class="api-dashboard__title">Highlight Note API</h1>
      <p class="api-dashboard__subtitle">Hugo Ji 主题划线笔记插件后端服务</p>
    </header>

    <div class="api-dashboard__status">
      <span class="api-dashboard__status-dot"></span>
      <span class="api-dashboard__status-text">服务运行正常</span>
    </div>

    <section class="api-dashboard__panel">
      <h2 class="api-dashboard__panel-title">部署信息</h2>
      <div class="api-dashboard__info-list">
        <div class="api-dashboard__info-item">
          <span class="api-dashboard__info-label">部署平台</span>
          <span class="api-dashboard__info-value">Vercel</span>
        </div>
        <div class="api-dashboard__info-item">
          <span class="api-dashboard__info-label">运行时</span>
          <span class="api-dashboard__info-value">Node.js Serverless</span>
        </div>
        <div class="api-dashboard__info-item">
          <span class="api-dashboard__info-label">部署时间</span>
          <span class="api-dashboard__info-value">${new Date().toLocaleString('zh-CN')}</span>
        </div>
      </div>
    </section>

    <section class="api-dashboard__panel">
      <h2 class="api-dashboard__panel-title">API 接口</h2>
      <div class="api-dashboard__endpoint-list">
        <div class="api-dashboard__endpoint-item">
          <span class="api-dashboard__method api-dashboard__method--post">POST</span>
          /api/notes
        </div>
        <div class="api-dashboard__endpoint-item">
          <span class="api-dashboard__method api-dashboard__method--get">GET</span>
          /api/notes/:id
        </div>
        <div class="api-dashboard__endpoint-item">
          <span class="api-dashboard__method api-dashboard__method--put">PUT</span>
          /api/notes/:id
        </div>
        <div class="api-dashboard__endpoint-item">
          <span class="api-dashboard__method api-dashboard__method--delete">DELETE</span>
          /api/notes/:id
        </div>
      </div>
    </section>

    <footer class="api-dashboard__footer">
      <p>相关项目：<a class="api-dashboard__link" href="https://github.com/Aieguu/Ji" target="_blank">Hugo Ji 主题</a></p>
    </footer>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}