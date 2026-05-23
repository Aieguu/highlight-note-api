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

### 1. 克隆项目

```bash
git clone https://github.com/Aieguu/highlight-note-api.git
cd highlight-note-api
```

### 2. 安装依赖

```bash
npm install
```

### 3. 部署

```bash
npm i -g vercel
vercel login
vercel --prod
```

### 4. 配置环境变量

在 Vercel 控制台的 Settings → Environment Variables 中添加：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `GITHUB_TOKEN` | GitHub Fine-grained Personal Access Token | `ghp_xxxxxxxxxxxx` |
| `GITHUB_REPO` | 仓库名称 | `Aieguu/blog` |

#### 创建 GitHub Token

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

1. 复制环境变量示例文件：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的配置

3. 启动本地开发服务器：
   ```bash
   vercel dev
   ```

4. 访问 `http://localhost:3000/api/notes` 测试 API

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
