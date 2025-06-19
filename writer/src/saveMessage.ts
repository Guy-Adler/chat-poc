import { KafkaMessage } from './types';
import { dataSource } from './db/dataSource';
import { ChatMessage } from './db/ChatMessage.entity';
import { getChatIndexKey, getKeyByMessage, pool } from './redis/connection';

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
        .where('id = :id AND updatedAt < :updatedAt', {
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

    // Remove from cache:
    console.log(
      `[saveMessage] Removing message id=${message.id} from cache for chatId=${message.chatId}`
    );
    await pool
      .multi()
      .del(getKeyByMessage(message.id, message.chatId))
      .sRem(getChatIndexKey(message.chatId), message.id.toString())
      .exec();
  } catch (err) {
    console.error(
      `[saveMessage] Error processing message id=${message.id} chatId=${message.chatId}:`,
      err
    );
    throw err;
  }
}
