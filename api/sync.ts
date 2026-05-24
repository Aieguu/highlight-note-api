import type { VercelRequest, VercelResponse } from '@vercel/node';
import { acquireSyncLock, confirmSyncedNotes, getPendingNotes, releaseSyncLock } from '../lib/redis';
import { batchCommit, findArticle, type FileOperation } from '../lib/github';
import {
  generateNoteMarkdown,
  getNotePath,
  insertShortcode,
  parseError,
  removeShortcode,
  requireSyncAuth,
  setCorsHeaders,
  type NoteRecord
} from '../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    requireSyncAuth(req);

    const locked = await acquireSyncLock();
    if (!locked) {
      return res.status(409).json({ success: false, error: '同步任务正在运行' });
    }

    try {
      const pendingNotes = await getPendingNotes();
      if (pendingNotes.length === 0) {
        return res.status(200).json({ success: true, message: '没有待同步的笔记', synced: 0 });
      }

      const results = {
        synced: 0,
        failed: 0,
        errors: [] as string[]
      };
      const syncedNoteIds: string[] = [];
      const fileOps: FileOperation[] = [];
      const notesByArticle = groupByArticle(pendingNotes);

      for (const [, notes] of notesByArticle) {
        const articleContext = notes[0];

        try {
          const article = await findArticle(articleContext);
          let articleContent = article.content;

          for (const note of notes) {
            try {
              if (note.action === 'create') {
                articleContent = insertShortcode(articleContent, note);
                fileOps.push({ path: getNotePath(note), content: generateNoteMarkdown({ ...note, status: 'synced' }) });
              } else if (note.action === 'update') {
                fileOps.push({ path: getNotePath(note), content: generateNoteMarkdown({ ...note, status: 'synced' }) });
              } else if (note.action === 'delete') {
                articleContent = removeShortcode(articleContent, note);
                fileOps.push({ path: getNotePath(note) });
              }

              results.synced++;
              syncedNoteIds.push(note.id);
            } catch (error: any) {
              results.failed++;
              results.errors.push(`${note.id}: ${error.message}`);
            }
          }

          if (articleContent !== article.content) {
            fileOps.push({ path: article.path, content: articleContent });
          }
        } catch (error: any) {
          for (const note of notes) {
            results.failed++;
            results.errors.push(`${note.id}: 文章处理失败 - ${error.message}`);
          }
        }
      }

      if (fileOps.length > 0) {
        await batchCommit(dedupeOperations(fileOps), `sync notes: ${syncedNoteIds.length} notes`);
      }

      if (syncedNoteIds.length > 0) {
        await confirmSyncedNotes(syncedNoteIds);
      }

      return res.status(200).json({
        message: '同步完成',
        ...results
      });
    } finally {
      await releaseSyncLock();
    }
  } catch (error) {
    const parsed = parseError(error);
    return res.status(parsed.status).json({ success: false, error: parsed.error });
  }
}

function groupByArticle(notes: NoteRecord[]): Map<string, NoteRecord[]> {
  const grouped = new Map<string, NoteRecord[]>();

  for (const note of notes) {
    const key = note.articlePath || note.articleId;
    const items = grouped.get(key) || [];
    items.push(note);
    grouped.set(key, items);
  }

  for (const items of grouped.values()) {
    items.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  return grouped;
}

function dedupeOperations(operations: FileOperation[]): FileOperation[] {
  const map = new Map<string, FileOperation>();
  for (const operation of operations) {
    map.set(operation.path, operation);
  }
  return Array.from(map.values());
}
