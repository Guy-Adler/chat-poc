import { createClientPool } from 'redis';

export const pool = createClientPool({
  socket: {
    host: process.env.REDIS_HOST!,
    port: +process.env.REDIS_PORT!,
  },
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

export function getKeyByMessage(id: string, chatId: string) {
  return `chat-messages:${chatId}:${id}`;
}

export function getChatIndexKey(chatId: string) {
  return `chat-index:${chatId}`;
}
