import { readFileSync } from 'fs';
import type { MinimumKafkaMessage, RedisHashMessage } from '../types';
import { getChatIndexKey, getKeyByMessage, pool } from './connection';
import { join } from 'path';

const UPDATE_BY_TIMESTAMP_SCRIPT = readFileSync(
  join(__dirname, '../../redisScripts/updateByTimestamp.lua'),
  'utf-8'
);

/**
 * Updates a message in the Redis cache using a Lua script.
 * @param {MinimumKafkaMessage} message - The message to update in cache
 * @returns {Promise<boolean>} Whether or not the cache has been updated.
 */
export async function updateMessageInCache(message: MinimumKafkaMessage): Promise<boolean> {
  const args = [
    message.id, // Message ID
    message.updatedAt ?? '', // Update timestamp
    Object.keys(message).length.toString(), // Length of json
  ];

  for (const [field, value] of Object.entries(message)) {
    args.push(field, (value ?? '').toString());
  }

  console.log(
    `[internal/redis/updateCache] Trying to update cache for message id=${message.id} chatId=${message.chatId}`
  );
  const updated = (await pool.eval(UPDATE_BY_TIMESTAMP_SCRIPT, {
    keys: [getKeyByMessage(message.id, message.chatId), getChatIndexKey(message.chatId)],
    arguments: args,
  })) as number;

  if (updated === 0) {
    console.log(
      `[internal/redis/updateCache] Didn't update cache for message id=${message.id} chatId=${message.chatId} because there is a newer version`
    );
  } else {
    console.log(
      `[internal/redis/updateCache] Updated cache for message id=${message.id} chatId=${message.chatId}`
    );
  }

  return !!updated;
}
