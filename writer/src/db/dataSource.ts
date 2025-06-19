import { DataSource } from 'typeorm';
import { Chat } from './Chat.entity';
import { ChatMessage } from './ChatMessage.entity';

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.PG_HOST,
  port: +(process.env.PG_PORT as `${number}`),
  username: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  applicationName: 'writer',
  entities: [Chat, ChatMessage],
  synchronize: true,
  ssl: true,
});
