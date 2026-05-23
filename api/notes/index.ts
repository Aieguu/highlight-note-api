import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveNoteToRedis, getNotesByArticle, type NoteData } from '../../lib/redis';
import { generateNoteId, setCorsHeaders } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - 按文章获取笔记 或 返回 API 信息
  if (req.method === 'GET') {
    const { articleSlug } = req.query;

    if (articleSlug && typeof articleSlug === 'string') {
      try {
        const notes = await getNotesByArticle(articleSlug);
        return res.status(200).json({ success: true, notes });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Highlight Note API',
      endpoints: [
        'POST /api/notes - 创建笔记',
        'GET /api/notes?articleSlug=xxx - 获取文章的未同步笔记',
        'GET /api/notes/:id - 获取笔记',
        'PUT /api/notes/:id - 更新笔记',
        'DELETE /api/notes/:id - 删除笔记',
        'POST /api/sync - 批量同步笔记'
      ]
    });
  }

  // POST - 创建笔记
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { articleSlug, selectedText, noteContent } = req.body;

    if (!articleSlug || !selectedText || !noteContent) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const noteId = generateNoteId();

    const note: NoteData = {
      id: noteId,
      articleSlug,
      selectedText,
      noteContent,
      timestamp: Date.now(),
      action: 'create'
    };

    // 保存到 Redis
    await saveNoteToRedis(note);

    console.log('笔记已保存到 Redis:', noteId);

    return res.status(200).json({
      success: true,
      noteId,
      status: 'pending',
      message: '笔记已保存，等待同步'
    });

  } catch (error: any) {
    console.error('保存笔记失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
