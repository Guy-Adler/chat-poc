import 'dotenv/config';
import { WebSocketServer, type WebSocket } from 'ws';
import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { dataSource } from './db/dataSource';
import { Chat } from './db/Chat.entity';
import { ChatMessage } from './db/ChatMessage.entity';
import { EntityNotFoundError } from 'typeorm';

const PORT = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.json());
// Serve static files from the public directory
app.use(express.static('public'));
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map<string, { socket: WebSocket; subscriptions: Set<number> | true }>();

app.get('/chats', async (req, res) => {
  try {
    const chats = await dataSource.getRepository(Chat).find({ relations: { messages: false } });
    res.status(200).json(chats.map(({ id }) => id));
    return;
  } catch {
    res.status(500).send();
    return;
  }
});

app.post('/chats', async (req, res) => {
  try {
    const newChat = await dataSource.getRepository(Chat).save({});
    res.status(201).json(newChat);
    return;
  } catch {
    res.status(500).send();
    return;
  }
});

app.post('/chat/:id', async (req, res) => {
  const chatId = Number.parseInt(req.params.id);
  const { content } = req.body;

  if (!Number.isInteger(chatId) || typeof content !== 'string') {
    res.status(400).send();
    return;
  }

  let chat: Chat;
  try {
    chat = await dataSource.getRepository(Chat).findOneByOrFail({ id: chatId });
  } catch {
    res.status(404).send();
    return;
  }

  const message = await dataSource.getRepository(ChatMessage).save({
    chat,
    createdAt: new Date(),
    content,
  });

  clients.forEach(({ socket, subscriptions }) => {
    if (subscriptions === true || subscriptions.has(chatId)) {
      socket.send(
        JSON.stringify({
          type: 'update',
          chatId: message.chat.id,
          messages: [
            {
              id: message.id,
              createdAt: message.createdAt,
              content: message.content,
            },
          ],
        })
      );
    }
  });

  return;
});

app.delete('/chat/:id', async (req, res) => {
  const chatId = Number.parseInt(req.params.id);

  try {
    const chat = await dataSource.getRepository(Chat).findOneByOrFail({ id: chatId });
    await dataSource.getRepository(Chat).remove(chat);
    res.status(204).send();
    return;
  } catch (err) {
    if (err instanceof EntityNotFoundError) {
      res.status(404).send();
      return;
    }
    console.error(err);
    res.status(500).send();
    return;
  }
});

wss.on('connection', (socket) => {
  const id = randomUUID();

  console.log(`Client ${id} connected.`);
  clients.set(id, { socket, subscriptions: new Set() });

  socket.on('ping', () => {
    socket.pong();
  });

  socket.on('close', () => {
    console.log(`Client ${id} disconnected.`);
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
          if (message.id) {
            const subscriptions = clients.get(id)?.subscriptions;
            if (subscriptions && subscriptions !== true) {
              subscriptions.add(message.id);
            }
            try {
              const chat = await dataSource
                .getRepository(Chat)
                .findOne({ relations: { messages: true }, where: { id: message.id } });
              if (chat) {
                socket.send(
                  JSON.stringify({ type: 'load', chatId: message.id, messages: chat.messages })
                );
              }
            } catch (e) {
              console.error(e);
            }
            return;
          } else {
            clients.set(id, { socket, subscriptions: true });
            // TODO load all
            return;
          }
        case 'unsub':
          if (message.id) {
            const subscriptions = clients.get(id)?.subscriptions;
            if (subscriptions && subscriptions !== true) {
              subscriptions.delete(message.id);
            }
            return;
          }
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

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Close all WebSocket connections
  clients.forEach(({ socket }) => {
    socket.close(1000, 'Server shutting down');
  });
  clients.clear();

  // Close WebSocket server
  wss.close();

  // Close HTTP server
  server.closeAllConnections();
  await new Promise<void>((resolve) => {
    server.close(() => {
      console.log('HTTP server closed');
      resolve();
    });
  });

  // Close database connection
  if (dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('Database connection closed');
  }

  console.log('Shutdown complete');
  process.exit(0);
});

server.listen(PORT, async () => {
  await dataSource.initialize();
  console.log(`Listening on port ${PORT}`);
});
