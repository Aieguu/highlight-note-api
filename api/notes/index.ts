import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createFile, updateFile, getFile } from '../../lib/github';
import { generateNoteId, generateNoteMarkdown, insertShortcode, setCorsHeaders } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { articleSlug, selectedText, noteContent } = req.body;

    if (!articleSlug || !selectedText || !noteContent) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const noteId = generateNoteId();

    // 1. 创建笔记文件
    const noteMarkdown = generateNoteMarkdown(noteId, articleSlug, selectedText, noteContent);
    await createFile(
      `content/notes/${articleSlug}/${noteId}.md`,
      noteMarkdown,
      `add note ${noteId} to ${articleSlug}`
    );

    // 2. 修改原文章（插入 shortcode）
    const articlePath = `content/posts/${articleSlug}.md`;
    const article = await getFile(articlePath);
    const newContent = insertShortcode(article.content, selectedText, noteId);
    await updateFile(
      articlePath,
      newContent,
      `add highlight note ${noteId}`,
      article.sha
    );

    return res.status(200).json({
      success: true,
      noteId,
      status: 'synced'
    });

  } catch (error: any) {
    console.error('保存笔记失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
