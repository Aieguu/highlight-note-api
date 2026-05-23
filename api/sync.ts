import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPendingNotes, removeNotesFromRedis, clearPendingSync, type NoteData } from '../lib/redis';
import { batchCommit, findArticleBySlug, type FileOperation } from '../lib/github';
import { generateNoteMarkdown, insertShortcode, removeShortcode, setCorsHeaders } from '../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualRequest = req.body?.secret === process.env.SYNC_SECRET;

  if (!isCronRequest && !isManualRequest) {
    return res.status(401).json({ success: false, error: '未授权' });
  }

  try {
    console.log('开始批量同步...');

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

    const syncedNoteIds: string[] = [];
    const fileOps: FileOperation[] = [];

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

        const article = await findArticleBySlug(articleSlug);
        let articleContent = article.content;

        for (const note of notes) {
          try {
            if (note.action === 'create') {
              const noteMarkdown = generateNoteMarkdown(
                note.id, note.articleSlug, note.selectedText, note.noteContent
              );
              fileOps.push({
                path: `content/notes/${note.articleSlug}/${note.id}.md`,
                content: noteMarkdown
              });
              articleContent = insertShortcode(articleContent, note.selectedText, note.id);

              results.success++;
              syncedNoteIds.push(note.id);
              console.log(`笔记准备创建: ${note.id}`);

            } else if (note.action === 'update') {
              const noteMarkdown = generateNoteMarkdown(
                note.id, note.articleSlug, note.selectedText, note.noteContent
              );
              fileOps.push({
                path: `content/notes/${note.articleSlug}/${note.id}.md`,
                content: noteMarkdown
              });

              results.success++;
              syncedNoteIds.push(note.id);
              console.log(`笔记准备更新: ${note.id}`);

            } else if (note.action === 'delete') {
              fileOps.push({
                path: `content/notes/${note.articleSlug}/${note.id}.md`
              });
              articleContent = removeShortcode(articleContent, note.selectedText, note.id);

              results.success++;
              syncedNoteIds.push(note.id);
              console.log(`笔记准备删除: ${note.id}`);
            }
          } catch (error: any) {
            results.failed++;
            results.errors.push(`${note.id}: ${error.message}`);
            console.error(`笔记处理失败 ${note.id}:`, error);
          }
        }

        // 文章内容有变更则加入操作列表
        if (articleContent !== article.content) {
          fileOps.push({ path: article.path, content: articleContent });
          console.log(`文章准备更新: ${article.path}`);
        }

      } catch (error: any) {
        console.error(`文章处理失败 ${articleSlug}:`, error);
        for (const note of notes) {
          if (!results.errors.find(e => e.startsWith(note.id))) {
            results.failed++;
            results.errors.push(`${note.id}: 文章处理失败 - ${error.message}`);
          }
        }
      }
    }

    // 一次性提交所有变更
    if (fileOps.length > 0) {
      await batchCommit(fileOps, `sync notes: ${syncedNoteIds.length} notes`);
      console.log(`已提交 ${fileOps.length} 个文件变更`);
    }

    // 清空 Redis
    await clearPendingSync();
    if (syncedNoteIds.length > 0) {
      await removeNotesFromRedis(syncedNoteIds);
      console.log(`已从 Redis 删除 ${syncedNoteIds.length} 条笔记`);
    }

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
