const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || 'Aieguu/blog';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const API_BASE = 'https://api.github.com';

const headers = {
  'Authorization': `token ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json'
};

export interface GitHubFile {
  content: string;
  sha: string;
}

export interface FileOperation {
  path: string;
  content?: string; // 有值 → 创建/更新，无值 → 删除
}

export async function getFile(path: string): Promise<GitHubFile> {
  const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${path}?ref=${BRANCH}`, { headers });

  if (!response.ok) {
    if (response.status === 404) throw new Error('文件不存在');
    throw new Error(`获取文件失败: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: decodeURIComponent(escape(atob(data.content))),
    sha: data.sha
  };
}

export async function batchCommit(operations: FileOperation[], message: string): Promise<void> {
  // 1. 获取当前分支的 commit SHA
  const refRes = await fetch(`${API_BASE}/repos/${REPO}/git/ref/heads/${BRANCH}`, { headers });
  if (!refRes.ok) throw new Error(`获取分支引用失败: ${refRes.statusText}`);
  const refData = await refRes.json();
  const commitSha = refData.object.sha;

  // 2. 获取当前 commit 的 tree SHA
  const commitRes = await fetch(`${API_BASE}/repos/${REPO}/git/commits/${commitSha}`, { headers });
  if (!commitRes.ok) throw new Error(`获取 commit 失败: ${commitRes.statusText}`);
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. 构建 tree 条目
  const tree = operations.map(op => {
    if (op.content !== undefined) {
      // 创建/更新
      return {
        path: op.path,
        mode: '100644' as const,
        type: 'blob' as const,
        content: op.content
      };
    }
    // 删除
    return {
      path: op.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: null as unknown as string
    };
  });

  // 4. 创建新 tree
  const treeRes = await fetch(`${API_BASE}/repos/${REPO}/git/trees`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTreeSha, tree })
  });
  if (!treeRes.ok) throw new Error(`创建 tree 失败: ${treeRes.statusText}`);
  const treeData = await treeRes.json();

  // 5. 创建 commit
  const newCommitRes = await fetch(`${API_BASE}/repos/${REPO}/git/commits`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [commitSha]
    })
  });
  if (!newCommitRes.ok) throw new Error(`创建 commit 失败: ${newCommitRes.statusText}`);
  const newCommitData = await newCommitRes.json();

  // 6. 更新分支引用
  const updateRes = await fetch(`${API_BASE}/repos/${REPO}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: newCommitData.sha, force: false })
  });
  if (!updateRes.ok) throw new Error(`更新分支引用失败: ${updateRes.statusText}`);
}

// 根据 slug 查找实际文件路径
export async function findArticleBySlug(slug: string): Promise<GitHubFile & { path: string }> {
  const dirPath = 'content/posts';
  const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${dirPath}?ref=${BRANCH}`, { headers });

  if (!response.ok) {
    throw new Error(`获取目录失败: ${response.statusText}`);
  }

  const files = await response.json();

  const normalizedSlug = slug.toLowerCase().replace(/-/g, ' ');

  const matchedFile = files.find((file: any) => {
    if (file.type !== 'file' || !file.name.endsWith('.md')) return false;
    const fileName = file.name.replace('.md', '').toLowerCase();
    return fileName === normalizedSlug || fileName === slug;
  });

  if (!matchedFile) {
    throw new Error(`未找到文章: ${slug}`);
  }

  const fileData = await getFile(matchedFile.path);
  return {
    ...fileData,
    path: matchedFile.path
  };
}
