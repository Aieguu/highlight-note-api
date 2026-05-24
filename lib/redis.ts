import { Redis } from '@upstash/redis';
import { normalizeArticleId, type NoteRecord } from './utils';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export default redis;

const NOTE_PREFIX = 'highlight-note:note:';
const ARTICLE_PREFIX = 'highlight-note:article:';
const PENDING_SYNC_SET = 'highlight-note:pending-sync';
const SYNC_LOCK = 'highlight-note:sync-lock';

function noteKey(noteId: string): string {
  return `${NOTE_PREFIX}${noteId}`;
}

function articleKey(articleId: string): string {
  return `${ARTICLE_PREFIX}${normalizeArticleId(articleId)}`;
}

export async function saveNoteToRedis(note: NoteRecord): Promise<void> {
  await redis.set(noteKey(note.id), note);
  await redis.sadd(PENDING_SYNC_SET, note.id);
  await redis.sadd(articleKey(note.articleId), note.id);
}

export async function getNoteFromRedis(noteId: string): Promise<NoteRecord | null> {
  const data = await redis.get<NoteRecord | string>(noteKey(noteId));
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function deleteNoteFromRedis(noteId: string): Promise<void> {
  const note = await getNoteFromRedis(noteId);
  await redis.del(noteKey(noteId));
  await redis.srem(PENDING_SYNC_SET, noteId);
  if (note) {
    await redis.srem(articleKey(note.articleId), noteId);
  }
}

export async function getPendingNoteIds(): Promise<string[]> {
  return redis.smembers(PENDING_SYNC_SET);
}

export async function getPendingNotes(): Promise<NoteRecord[]> {
  const noteIds = await getPendingNoteIds();
  const notes: NoteRecord[] = [];

  for (const noteId of noteIds) {
    const note = await getNoteFromRedis(noteId);
    if (note) notes.push(note);
  }

  return notes.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export async function confirmSyncedNotes(noteIds: string[]): Promise<void> {
  for (const noteId of noteIds) {
    await deleteNoteFromRedis(noteId);
  }
}

export async function getNotesByArticle(articleId: string): Promise<NoteRecord[]> {
  const noteIds = await redis.smembers(articleKey(articleId));
  const notes: NoteRecord[] = [];

  for (const noteId of noteIds) {
    const note = await getNoteFromRedis(noteId);
    if (note && note.action !== 'delete') {
      notes.push(note);
    }
  }

  return notes.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export async function acquireSyncLock(ttlSeconds = 300): Promise<boolean> {
  const value = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await redis.set(SYNC_LOCK, value, { nx: true, ex: ttlSeconds });
  return result === 'OK';
}

export async function releaseSyncLock(): Promise<void> {
  await redis.del(SYNC_LOCK);
}
