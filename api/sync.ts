import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPendingNotes, removeNotesFromRedis, clearPendingSync, type NoteData } from '../lib/redis';
import { createFile, updateFile, deleteFile, findArticleBySlug } from '../lib/github';
import { generateNoteMarkdown, insertShortcode, removeShortcode, escapeQuotes, setCorsHeaders } from '../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 验证请求来源
  const authHeader = req.headers.authorization;
  const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualRequest = req.body?.secret === process.env.SYNC_SECRET;

  if (!isCronRequest && !isManualRequest) {
    return res.status(401).json({ success: false, error: '未授权' });
  }

  try {
    console.log('开始批量同步...');

    // 获取所有待同步的笔记
    const pendingNotes = await getPendingNotes();
    console.log(`找到 ${pendingNotes.length} 条待同步笔记`);

    if (pendingNotes.length === 0) {
      return res.status(200).json({
        success: true,
        message: '没有待同步的笔记',
        synced: 0
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // 按文章分组
    const notesByArticle = new Map<string, NoteData[]>();
    for (const note of pendingNotes) {
      const notes = notesByArticle.get(note.articleSlug) || [];
      notes.push(note);
      notesByArticle.set(note.articleSlug, notes);
    }

    // 逐个文章处理
    for (const [articleSlug, notes] of notesByArticle) {
      try {
        console.log(`处理文章: ${articleSlug}, 笔记数: ${notes.length}`);

        // 查找文章
        const article = await findArticleBySlug(articleSlug);
        let articleContent = article.content;

        // 处理每条笔记
        for (const note of notes) {
          try {
            if (note.action === 'create') {
              // 创建笔记文件
              const noteMarkdown = generateNoteMarkdown(
                note.id,
                note.articleSlug,
                note.selectedText,
                note.noteContent
              );
              const notePath = `content/notes/${note.articleSlug}/${note.id}.md`;
              await createFile(notePath, noteMarkdown, `add note ${note.id}`);

              // 在文章中插入 shortcode
              articleContent = insertShortcode(articleContent, note.selectedText, note.id);

              results.success++;
              console.log(`笔记创建成功: ${note.id}`);

            } else if (note.action === 'update') {
              // 更新笔记文件
              const noteMarkdown = generateNoteMarkdown(
                note.id,
                note.articleSlug,
                note.selectedText,
                note.noteContent
              );
              const notePath = `content/notes/${note.articleSlug}/${note.id}.md`;

              // 获取现有文件的 SHA
              try {
                const existingFile = await import('../lib/github').then(m => m.getFile(notePath));
                await updateFile(notePath, noteMarkdown, `update note ${note.id}`, existingFile.sha);
              } catch {
                // 文件不存在，创建新文件
                await createFile(notePath, noteMarkdown, `add note ${note.id}`);
              }

              results.success++;
              console.log(`笔记更新成功: ${note.id}`);

            } else if (note.action === 'delete') {
              // 删除笔记文件
              const notePath = `content/notes/${note.articleSlug}/${note.id}.md`;
              try {
                const existingFile = await import('../lib/github').then(m => m.getFile(notePath));
                await deleteFile(notePath, `delete note ${note.id}`, existingFile.sha);
              } catch {
                console.log(`笔记文件不存在: ${notePath}`);
              }

              // 从文章中移除 shortcode
              articleContent = removeShortcode(articleContent, note.selectedText, note.id);

              results.success++;
              console.log(`笔记删除成功: ${note.id}`);
            }
          } catch (error: any) {
            results.failed++;
            results.errors.push(`${note.id}: ${error.message}`);
            console.error(`笔记处理失败 ${note.id}:`, error);
          }
        }

        // 更新文章内容
        if (articleContent !== article.content) {
          await updateFile(
            article.path,
            articleContent,
            `sync notes for ${articleSlug}`,
            article.sha
          );
          console.log(`文章已更新: ${article.path}`);
        }

      } catch (error: any) {
        console.error(`文章处理失败 ${articleSlug}:`, error);
        // 标记该文章的所有笔记为失败
        for (const note of notes) {
          if (!results.errors.find(e => e.startsWith(note.id))) {
            results.failed++;
            results.errors.push(`${note.id}: 文章处理失败 - ${error.message}`);
          }
        }
      }
    }

    // 清空已同步的笔记
    await clearPendingSync();
    console.log('待同步集合已清空');

    console.log(`同步完成: 成功 ${results.success}, 失败 ${results.failed}`);

    return res.status(200).json({
      success: true,
      message: '同步完成',
      ...results
    });

  } catch (error: any) {
    console.error('同步失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
