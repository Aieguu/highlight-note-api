# Highlight Note API

[Hugo Ji 主题](https://github.com/Aieguu/Ji) 的划线笔记插件后端服务。

## 简介

为 Ji 主题提供划线笔记功能的后端 API，支持在文章中选中文字添加笔记，笔记通过 GitHub API 持久化存储，并自动触发 Hugo 重新构建。

## 功能特性

- **创建笔记** - 选中文字后添加笔记
- **编辑笔记** - 修改已有笔记内容
- **删除笔记** - 删除笔记并移除划线标记
- **自动同步** - 笔记变更自动推送到 GitHub
- **安全存储** - Token 存储在环境变量中，不暴露给前端

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/notes` | 创建笔记 |
| GET | `/api/notes/:id` | 获取笔记 |
| PUT | `/api/notes/:id` | 更新笔记 |
| DELETE | `/api/notes/:id` | 删除笔记 |

## 前置要求

- [Hugo Ji 主题](https://github.com/Aieguu/Ji) 已安装
- GitHub 账号
- [Vercel](https://vercel.com) 账号

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
# 添加环境变量
vercel env add GITHUB_TOKEN
vercel env add GITHUB_REPO
```

或在 Vercel 控制台的 Settings → Environment Variables 中手动添加。

---

### 方式二：GitHub 集成（推荐）

代码推送到 GitHub 后自动部署，无需本地安装任何工具。

#### 1. 推送代码到 GitHub

```bash
# 在项目目录下执行
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

#### 4. 完成部署

点击 **"Deploy"**，等待部署完成。

**后续更新**：只需 `git push`，Vercel 会自动重新部署。

---

### 创建 GitHub Token

两种部署方式都需要配置 GitHub Token：

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

## 本地开发

1. 安装依赖：
   ```bash
   npm install
   ```

2. 安装 Vercel CLI（如未安装）：
   ```bash
   npm i -g vercel
   ```

3. 复制环境变量示例文件：
   ```bash
   cp .env.example .env
   ```

4. 编辑 `.env` 文件，填入你的配置：
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   GITHUB_REPO=Aieguu/blog
   ```

5. 启动本地开发服务器：
   ```bash
   vercel dev
   ```

6. 访问 `http://localhost:3000/api/notes` 测试 API

## 项目结构

```
highlight-note-api/
├── api/
│   └── notes/
│       ├── index.ts      # POST /api/notes - 创建笔记
│       └── [id].ts       # GET/PUT/DELETE /api/notes/:id
├── lib/
│   ├── github.ts         # GitHub API 封装
│   └── utils.ts          # 工具函数
├── package.json
├── tsconfig.json
├── vercel.json
└── .env.example
```

## 工作原理

```
用户选中文字 → 添加笔记 → 前端调用 API
                              ↓
                      后端处理请求
                              ↓
                   GitHub API 操作文件
                              ↓
                   GitHub Actions 触发
                              ↓
                    Hugo 重新构建部署
                              ↓
                      笔记固化到站点
```

## 相关项目

- [Hugo Ji 主题](https://github.com/Aieguu/Ji) - 划线笔记功能的前端实现

## License

MIT
