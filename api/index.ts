import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Highlight Note API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .logo {
      font-size: 48px;
      text-align: center;
      margin-bottom: 20px;
    }
    h1 {
      text-align: center;
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 8px;
    }
    .subtitle {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .status {
      background: #d1fae5;
      border: 1px solid #34d399;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin-bottom: 24px;
    }
    .status-text {
      color: #065f46;
      font-weight: 600;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .info {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .info-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }
    .info-item:last-child { border-bottom: none; }
    .info-label { color: #6b7280; }
    .info-value { color: #1f2937; font-weight: 500; }
    .api-list {
      margin-bottom: 24px;
    }
    .api-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }
    .api-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background: #f9fafb;
      border-radius: 6px;
      margin-bottom: 8px;
      font-size: 13px;
      font-family: monospace;
    }
    .api-method {
      background: #3b82f6;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 12px;
      min-width: 50px;
      text-align: center;
    }
    .api-method.get { background: #10b981; }
    .api-method.put { background: #f59e0b; }
    .api-method.delete { background: #ef4444; }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">📝</div>
    <h1>Highlight Note API</h1>
    <p class="subtitle">Hugo Ji 主题划线笔记插件后端服务</p>

    <div class="status">
      <span class="status-dot"></span>
      <span class="status-text">服务运行正常</span>
    </div>

    <div class="info">
      <div class="info-title">部署信息</div>
      <div class="info-item">
        <span class="info-label">部署平台</span>
        <span class="info-value">Vercel</span>
      </div>
      <div class="info-item">
        <span class="info-label">运行时</span>
        <span class="info-value">Node.js Serverless</span>
      </div>
      <div class="info-item">
        <span class="info-label">部署时间</span>
        <span class="info-value">${new Date().toLocaleString('zh-CN')}</span>
      </div>
    </div>

    <div class="api-list">
      <div class="api-title">API 接口</div>
      <div class="api-item">
        <span class="api-method">POST</span>
        /api/notes
      </div>
      <div class="api-item">
        <span class="api-method get">GET</span>
        /api/notes/:id
      </div>
      <div class="api-item">
        <span class="api-method put">PUT</span>
        /api/notes/:id
      </div>
      <div class="api-item">
        <span class="api-method delete">DELETE</span>
        /api/notes/:id
      </div>
    </div>

    <div class="footer">
      <p>相关项目：<a href="https://github.com/Aieguu/Ji" target="_blank">Hugo Ji 主题</a></p>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
