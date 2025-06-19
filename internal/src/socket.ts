import { Server } from 'socket.io';
import { server } from './api';
import { dataSource } from './db/dataSource';
import { Chat } from './db/Chat.entity';

const io = new Server(server);

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('sub', async ({ id }) => {
    socket.join(`chat:${id}`);

    const chatMessages = await dataSource
      .getRepository(Chat)
      .findOne({ relations: { messages: true }, where: { id } });
    if (chatMessages) {
      socket.emit('load', {
        chatId: chatMessages.id,
        isDeleted: chatMessages.isDeleted,
        messages: chatMessages.messages,
        replicationTimestamp: chatMessages.replicationTimestamp,
      });
    }
  });

  socket.on('unsub', ({ id }) => {
    socket.leave(`chat:${id}`);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

export function sendUpdate(
  chatId: number,
  update: {
    id: number;
    content: string;
    isDeleted?: boolean;
    createdAt?: string;
    updatedAt: string | null;
  }
) {
  io.to(`chat:${chatId}`).emit('update', update);
}
