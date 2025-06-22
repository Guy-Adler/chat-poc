import { KafkaMessage } from './types';
import { dataSource } from './db/dataSource';
import { ChatMessage } from './db/ChatMessage.entity';
import { getChatIndexKey, getKeyByMessage, pool } from './redis/connection';
import { readFileSync } from 'fs';
import { join } from 'path';

const DELETE_BY_TIMESTAMP_SCRIPT = readFileSync(
  join(__dirname, '../redisScripts/deleteByTimestamp.lua'),
  'utf-8'
);

async function deleteFromCache(message: KafkaMessage) {
  console.log(
    `[saveMessage] Removing message id=${message.id} from cache for chatId=${message.chatId}`
  );

  const result = (await pool.eval(DELETE_BY_TIMESTAMP_SCRIPT, {
    keys: [getKeyByMessage(message.id, message.chatId), getChatIndexKey(message.chatId)],
    arguments: [message.id, 'updatedAt' in message && message.updatedAt ? message.updatedAt : ''],
  })) as number;

  switch (result) {
    case -1:
      console.log(
        `[saveMessage] Could not find message id=${message.id}, chatId=${message.chatId} in cache. Skipping deletion.`
      );
      break;
    case 0:
      console.log(
        `[saveMessage] A newer version of message id=${message.id}, chatId=${message.chatId} exists in cache. Skipping deleteion.`
      );
      break;
    case 1:
      console.log(
        `[saveMessage] Successfully deleted message id=${message.id}, chatId=${message.chatId} from cache.`
      );
      break;
    default:
      console.warn(
        `[saveMessage] WARN: Unknown result code ${result} when deleting message id=${message.id}, chatId=${message.chatId} from cache.`
      );
  }
}

/**
 * Saves a KafkaMessage to the database and updates the cache accordingly.
 * Handles insert, update, and delete operations based on message content.
 * @param {KafkaMessage} message - The message to save (insert, update, or delete)
 */
export async function saveMessage(message: KafkaMessage) {
  try {
    if ('createdAt' in message) {
      // INSERT
      console.log(`[saveMessage] Inserting message id=${message.id} chatId=${message.chatId}`);
      await dataSource
        .createQueryBuilder()
        .insert()
        .into(ChatMessage)
        .values({
          id: message.id,
          chat: {
            id: message.chatId,
          },
          content: message.content,
          createdAt: message.createdAt,
          replicationTimestamp: new Date(),
        })
        .orIgnore() // There is a newer or equal version already in the db.
        .execute();
    } else if ('updatedAt' in message) {
      // UPDATE
      console.log(`[saveMessage] Updating message id=${message.id} chatId=${message.chatId}`);
      await dataSource
        .createQueryBuilder()
        .update<ChatMessage>(ChatMessage)
        .set({
          content: message.content,
          updatedAt: message.updatedAt,
          replicationTimestamp: new Date(),
        })
        .where('id = :id AND (updatedAt IS NULL OR updatedAt < :updatedAt)', {
          id: message.id,
          updatedAt: new Date(message.updatedAt),
        })
        .execute();
    } else if (message.isDeleted) {
      // DELETE
      console.log(`[saveMessage] Deleting message id=${message.id} chatId=${message.chatId}`);
      await dataSource
        .createQueryBuilder()
        .update<ChatMessage>(ChatMessage)
        .set({ isDeleted: message.isDeleted })
        .where('id = :id', { id: message.id })
        .execute();
    }

    /*
     ? We want to keep the messages in the cache so if a client (`internal`) receives a message with a lower update time
     ? than the one already in the database it will not send it to users. If you find a better way to solve this,
     ? restore the `deleteFromCache` call to keep the cache cleaner :)
     */
    // await deleteFromCache(message);
  } catch (err) {
    console.error(
      `[saveMessage] Error processing message id=${message.id} chatId=${message.chatId}:`,
      err
    );
    throw err;
  }
}
