import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface TextSelector {
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface NoteRecord {
  id: string;
  articleId: string;
  articlePath: string;
  section: string;
  pageUrl: string;
  selectedText: string;
  noteContent: string;
  selector: TextSelector;
  status: 'pending' | 'synced' | 'failed';
  action: 'create' | 'update' | 'delete';
  createdAt: string;
  updatedAt: string;
}

export function generateNoteId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `note-${Date.now().toString(36)}-${random}`;
}

export function normalizeArticleId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\/+/g, '-');
}

export function normalizeArticlePath(value = ''): string {
  const normalized = value.replace(/^\/+/, '').replace(/\\/g, '/');
  if (!normalized) return '';
  return normalized.startsWith('content/') ? normalized : `content/${normalized}`;
}

export function normalizeSection(value = 'posts'): string {
  return value.trim().replace(/^\/+|\/+$/g, '') || 'posts';
}

export function getConfiguredSections(): string[] {
  const raw = process.env.CONTENT_SECTIONS || 'posts';
  return raw.split(',').map(section => normalizeSection(section)).filter(Boolean);
}

export function getNotesRoot(): string {
  return normalizeArticlePath(process.env.NOTES_ROOT || 'content/notes');
}

export function getNotePath(note: Pick<NoteRecord, 'articleId' | 'id'>): string {
  return `${getNotesRoot()}/${normalizeArticleId(note.articleId)}/${note.id}.md`;
}

export function createNoteRecord(input: {
  id?: string;
  articleId: string;
  articlePath?: string;
  section?: string;
  pageUrl?: string;
  selectedText: string;
  noteContent: string;
  selector?: Partial<TextSelector>;
  action?: NoteRecord['action'];
  status?: NoteRecord['status'];
  createdAt?: string;
}): NoteRecord {
  const now = new Date().toISOString();
  const selectedText = String(input.selectedText || '').trim();
  const exact = String(input.selector?.exact || selectedText).trim();

  return {
    id: input.id || generateNoteId(),
    articleId: normalizeArticleId(input.articleId),
    articlePath: normalizeArticlePath(input.articlePath),
    section: normalizeSection(input.section),
    pageUrl: input.pageUrl || '',
    selectedText,
    noteContent: String(input.noteContent || '').trim(),
    selector: {
      exact,
      prefix: input.selector?.prefix || '',
      suffix: input.selector?.suffix || ''
    },
    status: input.status || 'pending',
    action: input.action || 'create',
    createdAt: input.createdAt || now,
    updatedAt: now
  };
}

function jsonString(value: string): string {
  return JSON.stringify(value);
}

export function generateNoteMarkdown(note: NoteRecord): string {
  return `---
title: "笔记"
date: ${note.updatedAt.slice(0, 10)}
type: note
hidden: true
article: ${jsonString(note.articleId)}
article_path: ${jsonString(note.articlePath)}
selected_text: ${jsonString(note.selectedText)}
note_id: ${jsonString(note.id)}
selector:
  exact: ${jsonString(note.selector.exact)}
  prefix: ${jsonString(note.selector.prefix || '')}
  suffix: ${jsonString(note.selector.suffix || '')}
created_at: ${jsonString(note.createdAt)}
updated_at: ${jsonString(note.updatedAt)}
---

${note.noteContent}
`;
}

export function parseNoteMarkdown(id: string, markdown: string): NoteRecord {
  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!frontmatterMatch) {
    throw new Error('笔记格式错误');
  }

  const frontmatter = frontmatterMatch[1];
  const noteContent = frontmatterMatch[2].trim();
  const pick = (key: string) => {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    if (!match) return '';
    const raw = match[1].trim();
    try {
      return JSON.parse(raw);
    } catch {
      return raw.replace(/^"|"$/g, '');
    }
  };
  const pickNested = (key: string) => {
    const match = frontmatter.match(new RegExp(`^\\s{2}${key}:\\s*(.+)$`, 'm'));
    if (!match) return '';
    const raw = match[1].trim();
    try {
      return JSON.parse(raw);
    } catch {
      return raw.replace(/^"|"$/g, '');
    }
  };

  const selectedText = pick('selected_text');
  const articleId = pick('article');

  return createNoteRecord({
    id: pick('note_id') || id,
    articleId,
    articlePath: pick('article_path'),
    selectedText,
    noteContent,
    selector: {
      exact: pickNested('exact') || selectedText,
      prefix: pickNested('prefix'),
      suffix: pickNested('suffix')
    },
    action: 'update',
    status: 'synced',
    createdAt: pick('created_at') || new Date().toISOString()
  });
}

export function escapeShortcodeArg(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function unescapeShortcodeArg(text: string): string {
  return text.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

export function buildShortcode(note: Pick<NoteRecord, 'selectedText' | 'id'>): string {
  return `{{< hl "${escapeShortcodeArg(note.selectedText)}" "${note.id}" >}}`;
}

export function insertShortcode(article: string, note: NoteRecord): string {
  if (article.includes(note.id)) return article;

  const exact = note.selector.exact || note.selectedText;
  const matches: Array<{ index: number; score: number }> = [];
  let index = article.indexOf(exact);

  while (index !== -1) {
    let score = 0;
    if (note.selector.prefix && article.slice(Math.max(0, index - note.selector.prefix.length), index).endsWith(note.selector.prefix)) {
      score += 2;
    }
    if (note.selector.suffix && article.slice(index + exact.length, index + exact.length + note.selector.suffix.length).startsWith(note.selector.suffix)) {
      score += 2;
    }
    matches.push({ index, score });
    index = article.indexOf(exact, index + exact.length);
  }

  if (!matches.length) {
    throw new Error(`未找到选中的文字: "${exact.slice(0, 50)}..."`);
  }

  matches.sort((a, b) => b.score - a.score || a.index - b.index);
  const best = matches[0].index;
  return `${article.slice(0, best)}${buildShortcode(note)}${article.slice(best + exact.length)}`;
}

export function removeShortcode(article: string, note: Pick<NoteRecord, 'selectedText' | 'id'>): string {
  const escapedText = escapeShortcodeArg(note.selectedText);
  const pattern = new RegExp(`\\{\\{<\\s+hl\\s+"${escapeRegExp(escapedText)}"\\s+"${escapeRegExp(note.id)}"\\s+>\\}\\}`, 'g');
  return article.replace(pattern, note.selectedText);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const origin = req.headers.origin;

  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
  } else if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function assertAllowedOrigin(req: VercelRequest): void {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const origin = req.headers.origin;

  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    throw new HttpError(403, '来源不允许');
  }
}

export function requireWriteAuth(req: VercelRequest): void {
  assertAllowedOrigin(req);

  const configuredToken = process.env.WRITE_TOKEN;
  if (!configuredToken) {
    throw new HttpError(500, '服务端未配置 WRITE_TOKEN');
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token !== configuredToken) {
    throw new HttpError(401, '未授权');
  }
}

export function requireSyncAuth(req: VercelRequest): void {
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET;
  const syncSecret = process.env.SYNC_SECRET;
  const isCronRequest = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isManualRequest = Boolean(syncSecret && req.body?.secret === syncSecret);

  if (!isCronRequest && !isManualRequest) {
    throw new HttpError(401, '未授权');
  }
}

export function parseError(error: unknown): { status: number; error: string } {
  if (error instanceof HttpError) {
    return { status: error.status, error: error.message };
  }
  if (error instanceof Error) {
    return { status: 500, error: error.message };
  }
  return { status: 500, error: '未知错误' };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
