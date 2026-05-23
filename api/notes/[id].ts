import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFile, updateFile, deleteFile } from '../../lib/github';
import { generateNoteMarkdown, removeShortcode, parseNoteContent, setCorsHeaders } from '../../lib/utils';

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
      const { articleSlug } = req.query;
      if (!articleSlug || typeof articleSlug !== 'string') {
        return res.status(400).json({ success: false, error: '缺少文章标识' });
      }

      const notePath = `content/notes/${articleSlug}/${id}.md`;
      const noteFile = await getFile(notePath);
      const noteData = parseNoteContent(noteFile.content);

      return res.status(200).json({
        success: true,
        note: {
          id,
          articleSlug,
          ...noteData
        }
      });
    }

    // PUT - 更新笔记
    if (req.method === 'PUT') {
      const { articleSlug, noteContent } = req.body;

      if (!articleSlug || !noteContent) {
        return res.status(400).json({ success: false, error: '缺少必要参数' });
      }

      const notePath = `content/notes/${articleSlug}/${id}.md`;
      const noteFile = await getFile(notePath);
      const existingNote = parseNoteContent(noteFile.content);

      const updatedMarkdown = generateNoteMarkdown(
        id,
        articleSlug,
        existingNote.selectedText,
        noteContent
      );

      await updateFile(
        notePath,
        updatedMarkdown,
        `update note ${id}`,
        noteFile.sha
      );

      return res.status(200).json({
        success: true,
        noteId: id,
        status: 'synced'
      });
    }

    // DELETE - 删除笔记
    if (req.method === 'DELETE') {
      const { articleSlug } = req.body;

      if (!articleSlug) {
        return res.status(400).json({ success: false, error: '缺少文章标识' });
      }

      // 1. 获取笔记文件
      const notePath = `content/notes/${articleSlug}/${id}.md`;
      const noteFile = await getFile(notePath);
      const noteData = parseNoteContent(noteFile.content);

      // 2. 删除笔记文件
      await deleteFile(
        notePath,
        `delete note ${id}`,
        noteFile.sha
      );

      // 3. 从原文章中移除 shortcode
      const articlePath = `content/posts/${articleSlug}.md`;
      const article = await getFile(articlePath);
      const newContent = removeShortcode(article.content, noteData.selectedText, id);
      await updateFile(
        articlePath,
        newContent,
        `remove highlight note ${id}`,
        article.sha
      );

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
