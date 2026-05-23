import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export default redis;

// 笔记数据结构
export interface NoteData {
  id: string;
  articleSlug: string;
  selectedText: string;
  noteContent: string;
  timestamp: number;
  action: 'create' | 'update' | 'delete';
}

// Redis key 前缀
const NOTE_PREFIX = 'note:';
const PENDING_SYNC_SET = 'pending_sync';

// 保存笔记到 Redis
export async function saveNoteToRedis(note: NoteData): Promise<void> {
  const key = `${NOTE_PREFIX}${note.id}`;
  await redis.set(key, JSON.stringify(note));
  await redis.sadd(PENDING_SYNC_SET, note.id);
}

// 从 Redis 获取笔记
export async function getNoteFromRedis(noteId: string): Promise<NoteData | null> {
  const key = `${NOTE_PREFIX}${noteId}`;
  const data = await redis.get(key);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as NoteData;
}

// 从 Redis 删除笔记
export async function deleteNoteFromRedis(noteId: string): Promise<void> {
  const key = `${NOTE_PREFIX}${noteId}`;
  await redis.del(key);
  await redis.srem(PENDING_SYNC_SET, noteId);
}

// 获取所有待同步的笔记 ID
export async function getPendingNoteIds(): Promise<string[]> {
  return await redis.smembers(PENDING_SYNC_SET);
}

// 获取所有待同步的笔记
export async function getPendingNotes(): Promise<NoteData[]> {
  const noteIds = await getPendingNoteIds();
  if (noteIds.length === 0) return [];

  const notes: NoteData[] = [];
  for (const noteId of noteIds) {
    const note = await getNoteFromRedis(noteId);
    if (note) {
      notes.push(note);
    }
  }
  return notes;
}

// 清空待同步集合（同步完成后调用）
export async function clearPendingSync(): Promise<void> {
  await redis.del(PENDING_SYNC_SET);
}

// 删除已同步的笔记
export async function removeNotesFromRedis(noteIds: string[]): Promise<void> {
  for (const noteId of noteIds) {
    await deleteNoteFromRedis(noteId);
  }
}
