# Highlight Note API

[Hugo Ji 主题](https://github.com/Aieguu/Ji) 的划线笔记插件后端服务。

## 简介

为 Ji 主题提供划线笔记功能的后端 API。前端只负责交互和展示，所有写入都通过带鉴权的 API 进入 Redis 待同步队列，再由定时任务批量写回 GitHub，触发 Hugo 重新构建。

## 前端功能

配合 Ji 主题使用时，提供以下交互功能：

- **划词添加** - 选中文字后出现"添加笔记"按钮
- **卡片式弹窗** - 笔记查看、编辑采用统一的卡片式设计
- **内联编辑** - 点击修改图标进入编辑模式，确认后保存
- **状态标识** - 标题颜色区分同步状态（橙色=待同步，绿色=已同步）
- **设置入口** - 首页用户卡片右上角齿轮图标，点击设置写入令牌

## 功能特性

- **创建笔记** - 选中文字后添加笔记
- **编辑笔记** - 支持未同步和已同步笔记
- **删除笔记** - 支持未同步直接删除、已同步标记后批量删除
- **批量同步** - 默认每天凌晨4点（北京时间）自动同步到 GitHub
- **写入鉴权** - 创建、编辑、删除、读取待同步笔记均需要 `WRITE_TOKEN`
- **来源限制** - 可通过 `ALLOWED_ORIGINS` 限制允许调用的博客域名
- **安全存储** - GitHub、Redis、同步密钥只存在服务端环境变量

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/notes` | 创建笔记 |
| GET | `/api/notes/:id` | 获取笔记 |
| PUT | `/api/notes/:id` | 更新笔记 |
| DELETE | `/api/notes/:id` | 删除笔记 |
| GET/POST | `/api/sync` | Vercel Cron 或手动触发同步 |

## 前置要求

- [Hugo Ji 主题](https://github.com/Aieguu/Ji) 已安装
- GitHub 账号
- [Vercel](https://vercel.com) 账号
- [Upstash](https://upstash.com) 账号（免费）

## 部署到 Vercel

### 方式一：Vercel CLI（本地部署）

适合本地测试和调试。

#### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

#### 3. 部署到生产环境

```bash
vercel --prod
```

#### 4. 配置环境变量

```bash
vercel env add GITHUB_TOKEN
vercel env add GITHUB_REPO
vercel env add GITHUB_BRANCH
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add SYNC_SECRET
```

---

### 方式二：GitHub 集成（推荐）

代码推送到 GitHub 后自动部署，无需本地安装任何工具。

#### 1. 推送代码到 GitHub

```bash
git remote add origin https://github.com/你的用户名/highlight-note-api.git
git push -u origin main
```

#### 2. 在 Vercel 导入仓库

1. 访问 [Vercel](https://vercel.com) 并登录
2. 点击 **"Add New..." → "Project"**
3. 选择你刚才推送的 GitHub 仓库
4. 点击 **"Import"**

#### 3. 配置环境变量

在导入页面或项目 Settings → Environment Variables 中添加：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `GITHUB_TOKEN` | GitHub Fine-grained Personal Access Token | `ghp_xxxxxxxxxxxx` |
| `GITHUB_REPO` | 仓库名称 | `Aieguu/blog` |
| `GITHUB_BRANCH` | 分支名称 | `docs` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | `xxxxxxxxxxxxxxxx` |
| `WRITE_TOKEN` | 前端写入令牌，建议使用长随机值 | `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | 允许调用 API 的站点来源，逗号分隔 | `https://blog.example.com,http://localhost:1313` |
| `CONTENT_SECTIONS` | 可查找的文章 section，逗号分隔 | `posts` |
| `NOTES_ROOT` | 笔记落盘目录 | `content/notes` |
| `CRON_SECRET` | Vercel Cron 请求密钥 | `your-cron-secret` |
| `SYNC_SECRET` | 同步密钥（可选，手动调用用） | `your-secret-key` |

#### 4. 完成部署

点击 **"Deploy"**，等待部署完成。

**后续更新**：只需 `git push`，Vercel 会自动重新部署。

---

### 配置 Upstash Redis

1. 访问 [Upstash](https://upstash.com) 并注册
2. 创建 Redis 数据库（选择免费套餐）
3. 在数据库详情页复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`
4. 在 Vercel 环境变量中配置

---

### 创建 GitHub Token

1. 访问 [GitHub Settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
2. 配置：
   - **Name**: `highlight-note-api`
   - **Expiration**: 选择合适的过期时间
   - **Repository access**: Only select repositories → 选择你的博客仓库
   - **Permissions**:
     - Contents: Read and write
     - Metadata: Read-only
3. 生成并复制 Token

## Hugo 主题配置

在你的博客 `hugo.toml` 中添加：

```toml
[params.plugins.highlightNote]
  enabled = true
  apiBase = "https://your-project.vercel.app"
  writeTokenStorageKey = "ji.highlightNote.writeToken"
  maxSelectionLength = 2000
```

将 `https://your-project.vercel.app` 替换为你的 Vercel 部署地址。

### 写入令牌设置

插件启用后，首页用户信息卡片右上角会显示齿轮图标，点击可打开令牌设置对话框。

也可在浏览器控制台手动设置：

```js
window.HighlightNote.setWriteToken("你的 WRITE_TOKEN")
```

令牌保存在浏览器 localStorage 中，无需重复设置。没有写入令牌的访客只能查看已同步的笔记，不能新增、编辑或删除。

## 同步机制

```
用户添加笔记 → Bearer WRITE_TOKEN 鉴权 → 存入 Redis → 立即在页面显示
                    ↓
            每天凌晨4点（北京时间）
                    ↓
         Vercel Cron 触发同步任务
                    ↓
         加同步锁并批量读取 Redis 中的待同步笔记
                    ↓
         推送到 GitHub（创建/更新/删除文件）
                    ↓
         仅确认成功项并从 Redis 移除
                    ↓
         Hugo Actions 触发重新构建
                    ↓
           笔记固化到站点
```

**优势**：每天只触发一次 Hugo 构建，避免频繁部署；失败项会保留在 Redis 中，下一次继续同步。

## 手动同步

如果需要立即同步，可以手动调用同步接口：

```bash
curl -X POST https://your-project.vercel.app/api/sync \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-secret-key"}'
```

## 注意事项

### 文件名与 URL 匹配

插件优先使用主题在文章容器上输出的 `data-highlight-article-path` 精确定位文章文件；缺失时才根据 `articleId` 和 `CONTENT_SECTIONS` 查找。

**建议：**
- 使用 Ji 主题新版 `single.html` 输出 `data-highlight-article-path`
- 保持 `CONTENT_SECTIONS` 与 Hugo 内容目录一致
- 避免手动修改已插入 shortcode 的 `note_id`

**示例：**

| 文件名 | URL slug | 是否匹配 |
|--------|----------|----------|
| `RAG 检索优化.md` | `rag-检索优化` | ✅ |
| `Docker 笔记.md` | `docker-笔记` | ✅ |
| `Spring AI 笔记一.md` | `spring-ai-笔记一` | ✅ |
| `MyPost.md` | `mypost` | ✅ |

### 分支配置

如果你的博客代码不在 `main` 分支，需要配置 `GITHUB_BRANCH` 环境变量。

## 本地开发

1. 安装依赖：
   ```bash
   npm install
   ```

2. 复制环境变量示例文件：
   ```bash
   cp .env.example .env
   ```

3. 编辑 `.env` 文件，填入你的配置

4. 启动本地开发服务器：
   ```bash
   vercel dev
   ```

5. 访问 `http://localhost:3000/api/notes` 测试 API

## 项目结构

```
highlight-note-api/
├── api/
│   ├── index.ts          # GET / - 状态页面
│   ├── notes/
│   │   ├── index.ts      # POST /api/notes - 创建笔记
│   │   └── [id].ts       # GET/PUT/DELETE /api/notes/:id
│   └── sync.ts           # POST /api/sync - 批量同步
├── lib/
│   ├── github.ts         # GitHub API 封装
│   ├── redis.ts          # Redis 操作封装
│   └── utils.ts          # 工具函数
├── package.json
├── tsconfig.json
├── vercel.json           # 路由和 Cron 配置
├── .env.example          # 环境变量示例
└── README.md
```

## 相关项目

- [Hugo Ji 主题](https://github.com/Aieguu/Ji) - 划线笔记功能的前端实现

## License

MIT
