import type { WebSocket } from 'ws';
import { WsClient } from './WsClient';

/**
 * Manages all WebSocket clients.
 */
export class ClientsManager {
  private static readonly clients = new Map<string, WsClient>();

  private constructor() {}

  /**
   * Adds a new client.
   * @param {string} id - Client ID.
   * @param {WebSocket} socket - WebSocket instance.
   * @returns {WsClient} The created client.
   */
  static add(id: string, socket: WebSocket): WsClient {
    if (this.clients.has(id)) {
      throw new Error(`id=${id} already exists`);
    }

    const client = new WsClient(id, socket);

    this.clients.set(id, client);
    console.log(`[ClientsManager] Added client ${id}`);
    return client;
  }

  /**
   * Removes a client by ID.
   * @param {string} id - Client ID.
   */
  static remove(id: string): void {
    if (!this.clients.has(id)) {
      throw new Error(`id=${id} does not exists`);
    }

    this.clients.delete(id);
    console.log(`[ClientsManager] Removed client ${id}`);
  }

  /**
   * Gets a client by ID.
   * @param {string} id - Client ID.
   * @returns {WsClient|undefined} The client, if found.
   */
  static getByClientId(id: string): WsClient | undefined {
    return this.clients.get(id);
  }

  /**
   * Closes all clients with a code and reason.
   * @param {number} code - Close code.
   * @param {string} reason - Close reason.
   */
  static closeAll(code: number, reason: string) {
    this.clients.forEach((client) => {
      client.disconnect(code, reason);
    });
    this.clients.clear();
    console.log(`[ClientsManager] Closed all clients with code=${code}, reason=${reason}`);
  }

  /**
   * Broadcasts a message to all clients.
   * @param {any} message - The message to broadcast.
   */
  static broadcast(message: any) {
    this.clients.forEach((client) => {
      client.send(message);
    });
    console.log(`[ClientsManager] Broadcasted message to ${this.clients.size} clients`);
  }
}
