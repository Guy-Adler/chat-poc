import { dataSource } from './db/dataSource';
import { getChatIndexKey, getKeyByMessage, pool } from './redis/connection';
import { RedisHashMessage } from './types';

/**
 * Fetches chat messages from the database for a given chatId.
 * @param {number} chatId - The chat ID to fetch messages for.
 * @returns {Promise<any[]>} Array of chat messages from the DB.
 */
async function getDbChatMessages(chatId: number): Promise<
  {
    id: number;
    chatId: number;
    content: string;
    createdAt: string;
    replicationTimestamp: string;
    isDeleted: boolean;
    updatedAt: string | null;
  }[]
> {
  console.log(`[getDbChatMessages] Fetching messages from DB for chatId=${chatId}`);
  const dbChatMessages = await dataSource.sql`
    SELECT *
    FROM chat_message
    WHERE chat_message."chatId" = ${chatId}
    ORDER BY "createdAt" ASC;
  `;

  return dbChatMessages;
}

/**
 * Fetches chat messages from the Redis cache for a given chatId.
 * @param {number} chatId - The chat ID to fetch cached messages for.
 * @returns {Promise<RedisHashMessage[]>} Array of cached chat messages.
 */
async function getCachedChatMessages(chatId: number): Promise<RedisHashMessage[]> {
  console.log(`[getCachedChatMessages] Fetching cached messages for chatId=${chatId}`);
  const ids = await pool.sMembers(getChatIndexKey(chatId));
  if (ids.length === 0) return [];

  const keys = ids.map((id) => getKeyByMessage(id, chatId));

  const pipeline = pool.multi();
  keys.forEach((key) => pipeline.hGetAll(key));
  return (await pipeline.exec<'typed'>()) as RedisHashMessage[];
}

/**
 * Merges chat messages from the database and cache, preferring newer cache entries.
 * @param {number} chatId - The chat ID to fetch and merge messages for.
 * @returns {Promise<RedisHashMessage[]>} Array of merged chat messages.
 */
export async function getChatMessages(chatId: number): Promise<RedisHashMessage[]> {
  console.log(`[getChatMessages] Merging DB and cache messages for chatId=${chatId}`);
  const [dbChatMessages, redisChatMessages] = await Promise.all([
    getDbChatMessages(chatId),
    getCachedChatMessages(chatId),
  ]);

  // Create a Map keyed by `${id}`
  const mergedMap = new Map<number, RedisHashMessage>();

  // Insert DB messages first
  for (const msg of dbChatMessages) {
    mergedMap.set(msg.id, msg);
  }

  // Insert Redis messages, overwriting DB messages if same key
  for (const msg of redisChatMessages) {
    const dbMsg = mergedMap.get(msg.id);
    if (!dbMsg || (dbMsg.updatedAt ?? '') < (msg.updatedAt ?? '')) {
      mergedMap.set(msg.id, msg);
    }
  }

  const merged = Array.from(mergedMap.values());
  console.log(`[getChatMessages] Returning ${merged.length} merged messages for chatId=${chatId}`);
  return merged;
}
