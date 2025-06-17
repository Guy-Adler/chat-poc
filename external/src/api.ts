import bodyParser from 'body-parser';
import express from 'express';
import { createServer } from 'http';
import { EntityNotFoundError } from 'typeorm';
import { Chat } from './db/Chat.entity';
import { ChatMessage } from './db/ChatMessage.entity';
import { dataSource } from './db/dataSource';
import { ClientsManager } from './ws/ClientsManager';
import { RoomsManager } from './ws/RoomsManager';

const app = express();
app.use(bodyParser.json());
// Serve static files from the public directory
app.use(express.static('public'));

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
    RoomsManager.create(newChat.id);
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

  RoomsManager.getByRoomId(chatId)?.send(
    JSON.stringify({
      type: 'update',
      chatId: message.chat.id,
      messages: [
        {
          id: message.id,
          createdAt: message.createdAt,
          content: message.content,
          updatedAt: message.updatedAt,
        },
      ],
    })
  );

  res.status(201).send();
  return;
});

app.put('/chat/:chatId/message/:messageId', async (req, res) => {
  const chatId = Number.parseInt(req.params.chatId);
  const messageId = Number.parseInt(req.params.messageId);
  const { content } = req.body;

  if (!Number.isInteger(chatId) || !Number.isInteger(messageId) || typeof content !== 'string') {
    res.status(400).send();
    return;
  }

  try {
    const message = await dataSource.getRepository(ChatMessage).findOneByOrFail({
      id: messageId,
      chat: { id: chatId },
    });

    message.content = content;
    message.updatedAt = new Date();
    await dataSource.getRepository(ChatMessage).save(message);

    RoomsManager.getByRoomId(chatId)?.send(
      JSON.stringify({
        type: 'update',
        chatId,
        messages: [
          {
            id: message.id,
            content: message.content,
            updatedAt: message.updatedAt,
          },
        ],
      })
    );

    res.status(200).json(message);
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

app.delete('/chat/:id', async (req, res) => {
  const chatId = Number.parseInt(req.params.id);

  try {
    const chat = await dataSource.getRepository(Chat).findOneByOrFail({ id: chatId });
    await dataSource.getRepository(Chat).remove(chat);
    RoomsManager.delete(chatId);
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

export const server = createServer(app);
