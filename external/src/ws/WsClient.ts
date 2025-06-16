import type { WebSocket } from 'ws';
import { RoomsManager } from './RoomsManager';

export class WsClient {
  constructor(
    readonly id: string,
    private readonly socket: WebSocket
  ) {}

  subscribe(id?: number) {
    if (id !== undefined) {
      RoomsManager.getByRoomId(id)?.subscribe(this);
    } else {
      RoomsManager.getAll().forEach((room) => {
        room.subscribe(this);
      });

      RoomsManager.addListener('create', (room) => {
        room.subscribe(this);
      });
    }
  }

  unsubscribe(id: number) {
    RoomsManager.getByRoomId(id)?.unsubscribe(this);
  }

  disconnect(code: number, reason: string) {
    this.socket.close(code, reason);
  }

  send(message: any) {
    this.socket.send(message);
  }
}
