import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getNotesByArticle, saveNoteToRedis } from '../../lib/redis';
import {
  createNoteRecord,
  parseError,
  requireWriteAuth,
  setCorsHeaders
} from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    requireWriteAuth(req);

    if (req.method === 'GET') {
      const articleId = String(req.query.articleId || req.query.articleSlug || '').trim();
      if (!articleId) {
        return res.status(200).json({
          success: true,
          message: 'Highlight Note API',
          endpoints: [
            'POST /api/notes',
            'GET /api/notes?articleId=xxx',
            'GET /api/notes/:id',
            'PUT /api/notes/:id',
            'DELETE /api/notes/:id',
            'POST /api/sync'
          ]
        });
      }

      const notes = await getNotesByArticle(articleId);
      return res.status(200).json({ success: true, notes });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { articleId, articleSlug, articlePath, section, pageUrl, selectedText, noteContent, selector } = req.body || {};
    if (!(articleId || articleSlug) || !selectedText || !noteContent) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const note = createNoteRecord({
      articleId: articleId || articleSlug,
      articlePath,
      section,
      pageUrl,
      selectedText,
      noteContent,
      selector,
      action: 'create'
    });

    await saveNoteToRedis(note);

    return res.status(200).json({
      success: true,
      noteId: note.id,
      note,
      status: note.status,
      message: '笔记已保存，等待同步'
    });
  } catch (error) {
    const parsed = parseError(error);
    return res.status(parsed.status).json({ success: false, error: parsed.error });
  }
}
