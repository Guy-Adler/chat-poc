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

/**
 * GET /chats
 * Returns a list of all chat IDs.
 */
app.get('/chats', async (req, res) => {
  try {
    const chats = await dataSource.getRepository(Chat).find({ relations: { messages: false } });
    console.log(`[api] Fetched ${chats.length} chats`);
    res.status(200).json(chats.map(({ id }) => id));
    return;
  } catch (err) {
    console.error('[api] Error fetching chats:', err);
    res.status(500).send();
    return;
  }
});

/**
 * POST /chats
 * Creates a new chat and returns its details.
 */
app.post('/chats', async (req, res) => {
  try {
    const newChat = await dataSource.getRepository(Chat).save({});
    RoomsManager.create(newChat.id);
    console.log(`[api] Created new chat with id=${newChat.id}`);
    res.status(201).json(newChat);
    return;
  } catch (err) {
    console.error('[api] Error creating chat:', err);
    res.status(500).send();
    return;
  }
});

/**
 * POST /chat/:id
 * Adds a new message to a chat.
 */
app.post('/chat/:id', async (req, res) => {
  const chatId = Number.parseInt(req.params.id);
  const { content } = req.body;

  if (!Number.isInteger(chatId) || typeof content !== 'string') {
    console.warn(`[api] Invalid chatId or content for POST /chat/:id`);
    res.status(400).send();
    return;
  }

  let chat: Chat;
  try {
    chat = await dataSource.getRepository(Chat).findOneByOrFail({ id: chatId });
  } catch {
    console.warn(`[api] Chat not found for id=${chatId}`);
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
  console.log(`[api] Added message id=${message.id} to chatId=${chatId}`);
  res.status(201).send();
  return;
});

/**
 * PUT /chat/:chatId/message/:messageId
 * Updates the content of a message in a chat.
 */
app.put('/chat/:chatId/message/:messageId', async (req, res) => {
  const chatId = Number.parseInt(req.params.chatId);
  const messageId = Number.parseInt(req.params.messageId);
  const { content } = req.body;

  if (!Number.isInteger(chatId) || !Number.isInteger(messageId) || typeof content !== 'string') {
    console.warn(
      `[api] Invalid chatId, messageId, or content for PUT /chat/:chatId/message/:messageId`
    );
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
    console.log(`[api] Updated message id=${message.id} in chatId=${chatId}`);
    res.status(200).json(message);
    return;
  } catch (err) {
    if (err instanceof EntityNotFoundError) {
      console.warn(`[api] Message or chat not found for chatId=${chatId}, messageId=${messageId}`);
      res.status(404).send();
      return;
    }
    console.error('[api] Error updating message:', err);
    res.status(500).send();
    return;
  }
});

/**
 * DELETE /chat/:id
 * Deletes a chat by ID.
 */
app.delete('/chat/:id', async (req, res) => {
  const chatId = Number.parseInt(req.params.id);
  try {
    const chat = await dataSource.getRepository(Chat).findOneByOrFail({ id: chatId });
    await dataSource.getRepository(Chat).remove(chat);
    RoomsManager.delete(chatId);
    console.log(`[api] Deleted chat id=${chatId}`);
    res.status(204).send();
    return;
  } catch (err) {
    if (err instanceof EntityNotFoundError) {
      console.warn(`[api] Chat not found for DELETE id=${chatId}`);
      res.status(404).send();
      return;
    }
    console.error('[api] Error deleting chat:', err);
    res.status(500).send();
    return;
  }
});

export const server = createServer(app);
