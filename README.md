# Highlight Note API

[Hugo Ji 主题](https://github.com/Aieguu/Ji) 的划线笔记插件后端服务。

## 简介

为 Ji 主题提供划线笔记功能的后端 API，支持在文章中选中文字添加笔记，笔记先缓存到 Redis，每天凌晨4点批量同步到 GitHub，触发 Hugo 重新构建。

## 功能特性

- **创建笔记** - 选中文字后添加笔记
- **编辑笔记** - 修改已有笔记内容
- **删除笔记** - 删除笔记并移除划线标记
- **批量同步** - 每天凌晨4点自动同步到 GitHub
- **安全存储** - Token 存储在环境变量中，不暴露给前端

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/notes` | 创建笔记 |
| GET | `/api/notes/:id` | 获取笔记 |
| PUT | `/api/notes/:id` | 更新笔记 |
| DELETE | `/api/notes/:id` | 删除笔记 |
| POST | `/api/sync` | 手动触发同步 |

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
[params]
  highlightNote = true
  highlightNoteApi = "https://your-project.vercel.app"
```

将 `https://your-project.vercel.app` 替换为你的 Vercel 部署地址。

## 同步机制

```
用户添加笔记 → 存入 Redis → 立即在页面显示
                    ↓
            每天凌晨4点（北京时间）
                    ↓
         Vercel Cron 触发同步任务
                    ↓
         批量读取 Redis 中的笔记
                    ↓
         推送到 GitHub（创建/更新/删除文件）
                    ↓
         Hugo Actions 触发重新构建
                    ↓
           笔记固化到站点
```

**优势**：每天只触发一次 Hugo 构建，避免频繁部署。

## 手动同步

如果需要立即同步，可以手动调用同步接口：

```bash
curl -X POST https://your-project.vercel.app/api/sync \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-secret-key"}'
```

## 注意事项

### 文件名与 URL 匹配

插件通过 URL 中的 slug 查找对应的文章文件。请确保文章文件名与 Hugo 生成的 URL slug 一致。

**匹配规则：**
- 文件名转小写
- 空格替换为连字符 `-`

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
