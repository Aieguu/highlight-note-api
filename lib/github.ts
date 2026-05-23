const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || 'Aieguu/blog';
const API_BASE = 'https://api.github.com';

export interface GitHubFile {
  content: string;
  sha: string;
}

export async function getFile(path: string): Promise<GitHubFile> {
  const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${path}`, {
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
    content: atob(data.content),
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
      content: btoa(unescape(encodeURIComponent(content)))
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
      sha
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
      sha
    })
  });

  if (!response.ok) {
    throw new Error(`删除文件失败: ${response.statusText}`);
  }
}
