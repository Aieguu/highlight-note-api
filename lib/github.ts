import {
  getConfiguredSections,
  getNotePath,
  normalizeArticleId,
  normalizeArticlePath,
  parseNoteMarkdown,
  type NoteRecord
} from './utils';

declare const fetch: any;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || 'Aieguu/blog';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const API_BASE = 'https://api.github.com';

const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

export interface GitHubFile {
  content: string;
  sha: string;
}

export interface FileOperation {
  path: string;
  content?: string;
}

function decodeBase64(content: string): string {
  return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8');
}

interface GitHubRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

async function requestGitHub(path: string, init: GitHubRequestInit = {}): Promise<any> {
  if (!GITHUB_TOKEN) throw new Error('服务端未配置 GITHUB_TOKEN');

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || response.statusText);
  }

  return response.json();
}

export async function getFile(path: string): Promise<GitHubFile> {
  const filePath = normalizeArticlePath(path);
  const data = await requestGitHub(`/repos/${REPO}/contents/${encodeURIComponentPath(filePath)}?ref=${BRANCH}`);

  return {
    content: decodeBase64(data.content),
    sha: data.sha
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await getFile(path);
    return true;
  } catch (error: any) {
    if (String(error.message || '').includes('Not Found')) return false;
    return false;
  }
}

function encodeURIComponentPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export async function batchCommit(operations: FileOperation[], message: string): Promise<void> {
  if (!operations.length) return;

  const refData = await requestGitHub(`/repos/${REPO}/git/ref/heads/${encodeURIComponent(BRANCH)}`);
  const commitSha = refData.object.sha;

  const commitData = await requestGitHub(`/repos/${REPO}/git/commits/${commitSha}`);
  const baseTreeSha = commitData.tree.sha;

  const tree = operations.map(op => {
    if (op.content !== undefined) {
      return {
        path: op.path,
        mode: '100644' as const,
        type: 'blob' as const,
        content: op.content
      };
    }

    return {
      path: op.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: null
    };
  });

  const treeData = await requestGitHub(`/repos/${REPO}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTreeSha, tree })
  });

  const newCommitData = await requestGitHub(`/repos/${REPO}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [commitSha]
    })
  });

  await requestGitHub(`/repos/${REPO}/git/refs/heads/${encodeURIComponent(BRANCH)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: newCommitData.sha, force: false })
  });
}

export async function findArticle(note: Pick<NoteRecord, 'articleId' | 'articlePath' | 'section'>): Promise<GitHubFile & { path: string }> {
  const configuredPath = normalizeArticlePath(note.articlePath);
  if (configuredPath) {
    const file = await getFile(configuredPath);
    return { ...file, path: configuredPath };
  }

  const articleId = normalizeArticleId(note.articleId);
  const candidateSections = note.section ? [note.section] : getConfiguredSections();

  for (const section of candidateSections) {
    const candidatePath = `content/${section}/${articleId}.md`;
    if (await fileExists(candidatePath)) {
      const file = await getFile(candidatePath);
      return { ...file, path: candidatePath };
    }
  }

  for (const section of getConfiguredSections()) {
    const directoryPath = `content/${section}`;
    let files: any[];
    try {
      files = await requestGitHub(`/repos/${REPO}/contents/${encodeURIComponentPath(directoryPath)}?ref=${BRANCH}`);
    } catch {
      continue;
    }

    const matchedFile = files.find((file: any) => {
      if (file.type !== 'file' || !file.name.endsWith('.md')) return false;
      const name = file.name.replace(/\.md$/, '');
      return normalizeArticleId(name) === articleId;
    });

    if (matchedFile) {
      const file = await getFile(matchedFile.path);
      return { ...file, path: matchedFile.path };
    }
  }

  throw new Error(`未找到文章: ${note.articleId}`);
}

export async function getCanonicalNote(noteId: string, context: { articleId?: string; articlePath?: string } = {}): Promise<NoteRecord | null> {
  const articleId = context.articleId ? normalizeArticleId(context.articleId) : '';
  const candidateIds = articleId ? [articleId] : [];

  if (!candidateIds.length && context.articlePath) {
    const basename = normalizeArticlePath(context.articlePath).split('/').pop()?.replace(/\.md$/, '') || '';
    if (basename) candidateIds.push(normalizeArticleId(basename));
  }

  for (const candidateArticleId of candidateIds) {
    const path = getNotePath({ articleId: candidateArticleId, id: noteId });
    try {
      const file = await getFile(path);
      return parseNoteMarkdown(noteId, file.content);
    } catch {
      // Try next candidate.
    }
  }

  return null;
}
