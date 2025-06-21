import { dataSource } from './db/dataSource';
import { Chat } from './db/Chat.entity';
import { ChatMessage } from './db/ChatMessage.entity';

export async function saveChat({ type, id }: { type: 'delete' | 'new'; id: string }) {
  if (type === 'new') {
    await dataSource
      .getRepository(Chat)
      .save({ id, isDeleted: false, replicationTimestamp: new Date() });
  } else {
    await dataSource.transaction(async (entityManager) => {
      await Promise.all([
        entityManager
          .createQueryBuilder()
          .update<Chat>(Chat)
          .set({ isDeleted: true })
          .where('id = :id', { id })
          .execute(),
        entityManager
          .createQueryBuilder()
          .update<ChatMessage>(ChatMessage)
          .set({ isDeleted: true })
          .where('chatId = :chatId', { chatId: id })
          .execute(),
      ]);
    });
  }
}
