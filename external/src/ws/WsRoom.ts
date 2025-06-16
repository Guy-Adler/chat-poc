import { WsClient } from './WsClient';
import { dataSource } from '../db/dataSource';
import { Chat } from '../db/Chat.entity';
import { ClientsManager } from './ClientsManager';

export class WsRoom {
  private readonly clients: Map<string, WsClient> = new Map();

  constructor(private readonly id: number) {
    ClientsManager.broadcast(JSON.stringify({ type: 'newChat', chatId: id }));
  }

  subscribe(client: WsClient) {
    this.clients.set(client.id, client);

    dataSource
      .getRepository(Chat)
      .findOne({ relations: { messages: true }, where: { id: this.id } })
      .then((chat) => {
        if (chat) {
          this.send(JSON.stringify({ type: 'load', chatId: this.id, messages: chat.messages }));
        }
      });
  }

  unsubscribe(client?: WsClient) {
    if (client === undefined) {
      this.clients.clear();
    } else {
      this.clients.delete(client.id);
    }
  }

  destroy() {
    this.send(JSON.stringify({ type: 'delete', chatId: this.id }));
    this.unsubscribe();
  }

  send(message: any) {
    this.clients.forEach((client) => {
      client.send(message);
    });
  }
}
