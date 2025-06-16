import { randomUUID } from 'crypto';
import { WebSocketServer } from 'ws';
import { server } from './api';
import { ClientsManager } from './ws/ClientsManager';

export const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket) => {
  const id = randomUUID();

  console.log(`Client ${id} connected.`);
  const client = ClientsManager.add(id, socket);

  socket.on('ping', () => {
    socket.pong();
  });

  socket.on('close', () => {
    console.log(`Client ${id} disconnected.`);
    ClientsManager.remove(client.id);
  });

  socket.on('message', async (data, isBinary) => {
    if (isBinary) {
      console.error('Bad message!');
      socket.close();
    }

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'sub':
          client.subscribe(message.id);
          return;
        case 'unsub':
          client.unsubscribe(message.id);
          return;
        default:
          console.error('Bad message!');
          socket.close();
      }
    } catch (err) {
      console.error('Bad message!');
      socket.close();
    }
  });
});
