import { Server } from 'socket.io';
import { server } from './api';
import { dataSource } from './db/dataSource';
import { Chat } from './db/Chat.entity';
import { getChatMessages } from './getChatMessages';

const io = new Server(server);

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('sub', async ({ id }) => {
    //! Client needs to be able to handle `update` before `load` (save in memory until load or something.)
    socket.join(`chat:${id}`);
    const [chat, chatMessages] = await Promise.all([
      dataSource.getRepository(Chat).findOne({ where: { id }, relations: { messages: false } }),
      getChatMessages(id),
    ]);

    if (!chat) {
      console.error('Could not find chat');
      return;
    }

    socket.emit('load', {
      chatId: id,
      messages: chatMessages,
      isDeleted: chat.isDeleted,
      replicationTimestamp: chat.replicationTimestamp,
    });
  });

  socket.on('unsub', ({ id }) => {
    socket.leave(`chat:${id}`);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

export function sendUpdate(
  chatId: string,
  update: {
    id: string;
    content: string;
    isDeleted?: boolean;
    createdAt?: string;
    updatedAt: string | null;
  }
) {
  io.to(`chat:${chatId}`).emit('update', update);
}
