import { readFileSync } from 'fs';
import type { KafkaMessage, MinimumKafkaMessage, RedisHashMessage } from '../types';
import { getChatIndexKey, getKeyByMessage, pool } from './connection';
import { join } from 'path';

const UPDATE_BY_TIMESTAMP_SCRIPT = readFileSync(
  join(__dirname, './updateByTimestamp.lua'),
  'utf-8'
);

/**
 * Updates a message in the Redis cache using a Lua script.
 * @param {MinimumKafkaMessage} message - The message to update in cache
 * @returns {Promise<RedisHashMessage>} The updated message from cache
 */
export async function updateMessageInCache(message: MinimumKafkaMessage): Promise<RedisHashMessage> {
  const args = [
    message.id.toString(), // Message ID
    message.updatedAt ?? '', // Update timestamp
    Object.keys(message).length.toString(), // Length of json
  ];

  for (const [field, value] of Object.entries(message)) {
    args.push(field, (value ?? '').toString());
  }

  console.log(
    `[writer/redis/updateCache] Updating cache for message id=${message.id} chatId=${message.chatId}`
  );
  const rawResult = (await pool.eval(UPDATE_BY_TIMESTAMP_SCRIPT, {
    keys: [getKeyByMessage(message.id, message.chatId), getChatIndexKey(message.chatId)],
    arguments: args,
  })) as string[];

  const result: Record<string, string> = {};
  for (let i = 0; i < rawResult.length; i += 2) {
    result[rawResult[i]] = rawResult[i + 1];
  }

  console.log(
    `[writer/redis/updateCache] Cache update result for message id=${message.id}:`,
    result
  );
  return result as unknown as RedisHashMessage;
}
