import { dataSource } from './db/dataSource';
import { getChatIndexKey, getKeyByMessage, pool } from './redis/connection';
import { RedisHashMessage } from './types';

async function getDbChatMessages(chatId: number) {
  const dbChatMessages = await dataSource.sql<
    {
      id: number;
      chatId: number;
      content: string;
      createdAt: string;
      replicationTimestamp: string;
      isDeleted: boolean;
      updatedAt: string | null;
    }[]
  >`
    SELECT *
    FROM chat_message
    WHERE chat_message."chatId" = ${chatId}
    ORDER BY "createdAt" ASC;
  `;

  return dbChatMessages;
}

async function getCachedChatMessages(chatId: number) {
  const ids = await pool.sMembers(getChatIndexKey(chatId));
  if (ids.length === 0) return [];

  const keys = ids.map((id) => getKeyByMessage(id, chatId));

  const pipeline = pool.multi();
  keys.forEach((key) => pipeline.hGetAll(key));
  return (await pipeline.exec<'typed'>()) as RedisHashMessage[];
}

export async function getChatMessages(chatId: number) {
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

  return Array.from(mergedMap.values());
}
