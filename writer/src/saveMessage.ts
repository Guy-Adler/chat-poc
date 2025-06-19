import { KafkaMessage } from './types';
import { dataSource } from './db/dataSource';
import { ChatMessage } from './db/ChatMessage.entity';
import { getChatIndexKey, getKeyByMessage, pool } from './redis/connection';

export async function saveMessage(message: KafkaMessage) {
  if ('createdAt' in message) {
    // INSERT
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
    await dataSource
      .createQueryBuilder()
      .update<ChatMessage>(ChatMessage)
      .set({ isDeleted: message.isDeleted })
      .where('id = :id', { id: message.id })
      .execute();
  }

  // Remove from cache:
  await pool
    .multi()
    .del(getKeyByMessage(message.id, message.chatId))
    .sRem(getChatIndexKey(message.chatId), message.id.toString())
    .exec();
}
