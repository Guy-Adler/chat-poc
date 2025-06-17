import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { dataSource } from './db/dataSource';
import { Chat } from './db/Chat.entity';

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/chats', async (req, res) => {
  try {
    const chats = await dataSource
      .getRepository(Chat)
      .find({ relations: { messages: false }, where: { isDeleted: false } });
    res.status(200).send(chats);
  } catch (error) {
    console.error(error);
    res.status(500).send();
  }
});

export const server = createServer(app);
