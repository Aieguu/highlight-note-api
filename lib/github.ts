const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || 'Aieguu/blog';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const API_BASE = 'https://api.github.com';

export interface GitHubFile {
  content: string;
  sha: string;
}

export async function getFile(path: string): Promise<GitHubFile> {
  const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('文件不存在');
    }
    throw new Error(`获取文件失败: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: decodeURIComponent(escape(atob(data.content))),
    sha: data.sha
  };
}

export async function createFile(path: string, content: string, message: string): Promise<void> {
  const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: BRANCH
    })
  });

  if (!response.ok) {
    throw new Error(`创建文件失败: ${response.statusText}`);
  }
}

export async function updateFile(path: string, content: string, message: string, sha: string): Promise<void> {
  const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      sha,
      branch: BRANCH
    })
  });

  if (!response.ok) {
    throw new Error(`更新文件失败: ${response.statusText}`);
  }
}

export async function deleteFile(path: string, message: string, sha: string): Promise<void> {
  const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${path}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      sha,
      branch: BRANCH
    })
  });

  if (!response.ok) {
    throw new Error(`删除文件失败: ${response.statusText}`);
  }
}

// 根据 slug 查找实际文件路径
export async function findArticleBySlug(slug: string): Promise<GitHubFile & { path: string }> {
  const dirPath = 'content/posts';
  const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${dirPath}?ref=${BRANCH}`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`获取目录失败: ${response.statusText}`);
  }

  const files = await response.json();

  // 将 slug 转换为可能的文件名格式
  const normalizedSlug = slug.toLowerCase().replace(/-/g, ' ');

  // 查找匹配的文件
  const matchedFile = files.find((file: any) => {
    if (file.type !== 'file' || !file.name.endsWith('.md')) return false;
    const fileName = file.name.replace('.md', '').toLowerCase();
    return fileName === normalizedSlug || fileName === slug;
  });

  if (!matchedFile) {
    throw new Error(`未找到文章: ${slug}`);
  }

  // 获取文件内容
  const fileData = await getFile(matchedFile.path);
  return {
    ...fileData,
    path: matchedFile.path
  };
}
