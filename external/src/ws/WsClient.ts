import type { WebSocket } from 'ws';
import { RoomsManager } from './RoomsManager';

/**
 * Represents a WebSocket client connection.
 */
export class WsClient {
  /**
   * @param {string} id - The client ID.
   * @param {WebSocket} socket - The WebSocket instance.
   */
  constructor(
    readonly id: string,
    private readonly socket: WebSocket
  ) {}

  /**
   * Subscribes the client to a room or all rooms.
   * @param {number} [id] - Room ID to subscribe to, or all if undefined.
   */
  subscribe(id?: number) {
    if (id !== undefined) {
      RoomsManager.getByRoomId(id)?.subscribe(this);
      console.log(`[WsClient] Client ${this.id} subscribed to room ${id}`);
    } else {
      RoomsManager.getAll().forEach((room) => {
        room.subscribe(this);
      });
      RoomsManager.addListener('create', (room) => {
        room.subscribe(this);
      });
      console.log(`[WsClient] Client ${this.id} subscribed to all rooms`);
    }
  }

  /**
   * Unsubscribes the client from a room.
   * @param {number} id - Room ID to unsubscribe from.
   */
  unsubscribe(id: number) {
    RoomsManager.getByRoomId(id)?.unsubscribe(this);
    console.log(`[WsClient] Client ${this.id} unsubscribed from room ${id}`);
  }

  /**
   * Disconnects the client.
   * @param {number} code - Close code.
   * @param {string} reason - Close reason.
   */
  disconnect(code: number, reason: string) {
    this.socket.close(code, reason);
    console.log(`[WsClient] Client ${this.id} disconnected with code=${code}, reason=${reason}`);
  }

  /**
   * Sends a message to the client.
   * @param {any} message - The message to send.
   */
  send(message: any) {
    this.socket.send(message);
    // Optionally log message content or just the action
    console.log(`[WsClient] Sent message to client ${this.id}`);
  }
}
