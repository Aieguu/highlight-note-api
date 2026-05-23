import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getNoteFromRedis, saveNoteToRedis, deleteNoteFromRedis, type NoteData } from '../../lib/redis';
import { setCorsHeaders } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: '缺少笔记 ID' });
  }

  try {
    // GET - 获取笔记
    if (req.method === 'GET') {
      const note = await getNoteFromRedis(id);

      if (!note) {
        return res.status(404).json({ success: false, error: '笔记不存在' });
      }

      return res.status(200).json({
        success: true,
        note
      });
    }

    // PUT - 更新笔记
    if (req.method === 'PUT') {
      const { articleSlug, noteContent } = req.body;

      if (!articleSlug || !noteContent) {
        return res.status(400).json({ success: false, error: '缺少必要参数' });
      }

      // 获取现有笔记
      const existingNote = await getNoteFromRedis(id);

      const note: NoteData = {
        id,
        articleSlug,
        selectedText: existingNote?.selectedText || '',
        noteContent,
        timestamp: Date.now(),
        action: existingNote?.action === 'create' ? 'create' : 'update'
      };

      // 更新 Redis
      await saveNoteToRedis(note);

      console.log('笔记已更新:', id);

      return res.status(200).json({
        success: true,
        noteId: id,
        status: 'pending',
        message: '笔记已更新，等待同步'
      });
    }

    // DELETE - 删除笔记
    if (req.method === 'DELETE') {
      const { articleSlug } = req.body;

      if (!articleSlug) {
        return res.status(400).json({ success: false, error: '缺少文章标识' });
      }

      // 获取现有笔记
      const existingNote = await getNoteFromRedis(id);

      if (existingNote && existingNote.action === 'create') {
        // 如果是新建的笔记还未同步，直接删除
        await deleteNoteFromRedis(id);
        console.log('笔记已从 Redis 删除:', id);
      } else {
        // 如果是已同步的笔记，标记为删除，等待同步
        const note: NoteData = {
          id,
          articleSlug,
          selectedText: existingNote?.selectedText || '',
          noteContent: '',
          timestamp: Date.now(),
          action: 'delete'
        };
        await saveNoteToRedis(note);
        console.log('笔记已标记为删除:', id);
      }

      return res.status(200).json({
        success: true,
        noteId: id,
        message: '笔记已删除'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error: any) {
    console.error('操作失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
