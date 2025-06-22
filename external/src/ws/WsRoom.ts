import { WsClient } from './WsClient';
import { dataSource } from '../db/dataSource';
import { Chat } from '../db/Chat.entity';
import { ClientsManager } from './ClientsManager';

/**
 * Represents a WebSocket room for a specific chat.
 * Manages clients and message broadcasting for the chat.
 */
export class WsRoom {
  private readonly clients: Map<string, WsClient> = new Map();

  /**
   * Creates a new WsRoom and broadcasts its creation.
   * @param {string} id - The chat ID for this room.
   */
  constructor(private readonly id: string) {
    console.log(`[WsRoom] Created room for chatId=${id}`);
    ClientsManager.broadcast(JSON.stringify({ type: 'newChat', chatId: id }));
  }

  /**
   * Subscribes a client to this room and sends the chat's messages.
   * @param {WsClient} client - The client to subscribe.
   */
  subscribe(client: WsClient) {
    this.clients.set(client.id, client);
    console.log(`[WsRoom] Client ${client.id} subscribed to chatId=${this.id}`);
    dataSource
      .getRepository(Chat)
      .findOne({ relations: { messages: true }, where: { id: this.id } })
      .then((chat) => {
        if (chat) {
          client.send(JSON.stringify({ type: 'load', chatId: this.id, messages: chat.messages }));
        }
      });
  }

  /**
   * Unsubscribes a client from this room, or all clients if none specified.
   * @param {WsClient} [client] - The client to unsubscribe, or all if undefined.
   */
  unsubscribe(client?: WsClient) {
    if (client === undefined) {
      this.clients.clear();
      console.log(`[WsRoom] All clients unsubscribed from chatId=${this.id}`);
    } else {
      this.clients.delete(client.id);
      console.log(`[WsRoom] Client ${client.id} unsubscribed from chatId=${this.id}`);
    }
  }

  /**
   * Destroys the room, notifying all clients.
   */
  destroy() {
    this.send(JSON.stringify({ type: 'delete', chatId: this.id }));
    this.unsubscribe();
    console.log(`[WsRoom] Room destroyed for chatId=${this.id}`);
  }

  /**
   * Sends a message to all clients in the room.
   * @param {any} message - The message to send.
   */
  send(message: any) {
    this.clients.forEach((client) => {
      client.send(message);
    });
    console.log(`[WsRoom] Sent message to ${this.clients.size} clients in chatId=${this.id}`);
  }
}
