import { randomUUID } from 'crypto';
import { WsRoom } from './WsRoom';
import { dataSource } from '../db/dataSource';
import { Chat } from '../db/Chat.entity';

type ListenerCallback = (room: WsRoom) => void | Promise<void>;
type ListenerType = 'create' | 'delete';

export class RoomsManager {
  private static readonly rooms = new Map<number, WsRoom>();
  private static readonly createListeners = new Map<string, ListenerCallback>();
  private static readonly deleteListeners = new Map<string, ListenerCallback>();

  private constructor() {}

  static create(id: number): WsRoom {
    if (this.rooms.has(id)) {
      throw new Error(`id=${id} already exists`);
    }

    const room = new WsRoom(id);

    this.rooms.set(id, room);
    this.createListeners.forEach((listener) => listener(room));
    return room;
  }

  static delete(id: number): void {
    if (!this.rooms.has(id)) {
      throw new Error(`id=${id} does not exists`);
    }

    const room = this.rooms.get(id);
    if (room) {
      room.unsubscribe();
      this.deleteListeners.forEach((listener) => listener(room));
      this.rooms.delete(id);
    }
  }

  static getByRoomId(id: number): WsRoom | undefined {
    return this.rooms.get(id);
  }

  static getAll(): WsRoom[] {
    return [...this.rooms.values()];
  }

  static addListener(listener: ListenerCallback): string;
  static addListener(type: ListenerType, listener: ListenerCallback): string;
  static addListener(first: ListenerCallback | ListenerType, second?: ListenerCallback): string {
    let type: ListenerType | undefined;
    let listener: ListenerCallback;

    if (typeof first === 'function') {
      listener = first;
      type = undefined;
    } else {
      type = first;
      listener = second!;
    }

    const listenerId = randomUUID();

    switch (type) {
      case 'create':
        this.createListeners.set(listenerId, listener);
        break;
      case 'delete':
        this.deleteListeners.set(listenerId, listener);
        break;
      default:
        this.createListeners.set(listenerId, listener);
        this.deleteListeners.set(listenerId, listener);
    }

    return listenerId;
  }

  static removeListener(id: string) {
    this.createListeners.delete(id);
    this.deleteListeners.delete(id);
  }
}

export async function initializeRoomsManager() {
  const chats = await dataSource.getRepository(Chat).find({ select: { id: true } });
  chats.map(({ id }) => {
    RoomsManager.create(id);
  });
}
