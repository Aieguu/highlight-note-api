import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteNoteFromRedis, getNoteFromRedis, saveNoteToRedis } from '../../lib/redis';
import { getCanonicalNote } from '../../lib/github';
import {
  createNoteRecord,
  parseError,
  requireWriteAuth,
  setCorsHeaders,
  type NoteRecord
} from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    requireWriteAuth(req);

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: '缺少笔记 ID' });
    }

    if (req.method === 'GET') {
      const note = await resolveNote(id, req);
      if (!note) return res.status(404).json({ success: false, error: '笔记不存在' });
      return res.status(200).json({ success: true, note });
    }

    if (req.method === 'PUT') {
      const { articleId, articleSlug, articlePath, section, pageUrl, selectedText, noteContent } = req.body || {};
      if (!(articleId || articleSlug) || !noteContent) {
        return res.status(400).json({ success: false, error: '缺少必要参数' });
      }

      const existingNote = await resolveNote(id, req);
      const note = createNoteRecord({
        id,
        articleId: existingNote?.articleId || articleId || articleSlug,
        articlePath: existingNote?.articlePath || articlePath,
        section: existingNote?.section || section,
        pageUrl: existingNote?.pageUrl || pageUrl,
        selectedText: existingNote?.selectedText || selectedText,
        noteContent,
        selector: existingNote?.selector || { exact: selectedText || existingNote?.selectedText || '' },
        action: existingNote?.action === 'create' ? 'create' : 'update',
        createdAt: existingNote?.createdAt,
        status: 'pending'
      });

      await saveNoteToRedis(note);

      return res.status(200).json({
        success: true,
        noteId: id,
        note,
        status: 'pending',
        message: '笔记已更新，等待同步'
      });
    }

    if (req.method === 'DELETE') {
      const { articleId, articleSlug, articlePath, section, pageUrl, selectedText } = req.body || {};
      if (!(articleId || articleSlug)) {
        return res.status(400).json({ success: false, error: '缺少文章标识' });
      }

      const existingNote = await resolveNote(id, req);
      if (existingNote?.action === 'create') {
        await deleteNoteFromRedis(id);
        return res.status(200).json({ success: true, noteId: id, message: '笔记已删除' });
      }

      const note = createNoteRecord({
        id,
        articleId: existingNote?.articleId || articleId || articleSlug,
        articlePath: existingNote?.articlePath || articlePath,
        section: existingNote?.section || section,
        pageUrl: existingNote?.pageUrl || pageUrl,
        selectedText: existingNote?.selectedText || selectedText,
        noteContent: existingNote?.noteContent || '',
        selector: existingNote?.selector || { exact: selectedText || existingNote?.selectedText || '' },
        action: 'delete',
        createdAt: existingNote?.createdAt,
        status: 'pending'
      });

      await saveNoteToRedis(note);

      return res.status(200).json({
        success: true,
        noteId: id,
        note,
        message: '笔记已删除，等待同步'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    const parsed = parseError(error);
    return res.status(parsed.status).json({ success: false, error: parsed.error });
  }
}

async function resolveNote(id: string, req: VercelRequest): Promise<NoteRecord | null> {
  const pending = await getNoteFromRedis(id);
  if (pending) return pending;

  const articleId = String(req.query.articleId || req.query.articleSlug || req.body?.articleId || req.body?.articleSlug || '');
  const articlePath = String(req.query.articlePath || req.body?.articlePath || '');
  return getCanonicalNote(id, { articleId, articlePath });
}
