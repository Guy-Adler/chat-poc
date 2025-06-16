import type { WebSocket } from 'ws';
import { WsClient } from './WsClient';

export class ClientsManager {
  private static readonly clients = new Map<string, WsClient>();

  private constructor() {}

  static add(id: string, socket: WebSocket): WsClient {
    if (this.clients.has(id)) {
      throw new Error(`id=${id} already exists`);
    }

    const client = new WsClient(id, socket);

    this.clients.set(id, client);
    return client;
  }

  static remove(id: string): void {
    if (!this.clients.has(id)) {
      throw new Error(`id=${id} does not exists`);
    }

    this.clients.delete(id);
  }

  static getByClientId(id: string): WsClient | undefined {
    return this.clients.get(id);
  }

  static closeAll(code: number, reason: string) {
    this.clients.forEach((client) => {
      client.disconnect(code, reason);
    });
    this.clients.clear();
  }
}
