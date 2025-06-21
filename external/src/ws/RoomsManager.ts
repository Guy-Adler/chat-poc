import { randomUUID } from 'crypto';
import { WsRoom } from './WsRoom';
import { dataSource } from '../db/dataSource';
import { Chat } from '../db/Chat.entity';

type ListenerCallback = (room: WsRoom) => void | Promise<void>;
type ListenerType = 'create' | 'delete';

/**
 * Manages all WebSocket rooms for chats.
 */
export class RoomsManager {
  private static readonly rooms = new Map<string, WsRoom>();
  private static readonly createListeners = new Map<string, ListenerCallback>();
  private static readonly deleteListeners = new Map<string, ListenerCallback>();

  private constructor() {}

  /**
   * Creates a new room for a chat.
   * @param {string} id - The chat ID.
   * @returns {WsRoom} The created room.
   */
  static create(id: string): WsRoom {
    if (this.rooms.has(id)) {
      throw new Error(`id=${id} already exists`);
    }
    const room = new WsRoom(id);
    this.rooms.set(id, room);
    this.createListeners.forEach((listener) => listener(room));
    console.log(`[RoomsManager] Created room for chatId=${id}`);
    return room;
  }

  /**
   * Deletes a room for a chat.
   * @param {string} id - The chat ID.
   */
  static delete(id: string): void {
    if (!this.rooms.has(id)) {
      throw new Error(`id=${id} does not exists`);
    }
    const room = this.rooms.get(id);
    if (room) {
      this.deleteListeners.forEach((listener) => listener(room));
      this.rooms.delete(id);
      room.destroy();
      console.log(`[RoomsManager] Deleted room for chatId=${id}`);
    }
  }

  /**
   * Gets a room by chat ID.
   * @param {string} id - The chat ID.
   * @returns {WsRoom|undefined} The room, if found.
   */
  static getByRoomId(id: string): WsRoom | undefined {
    return this.rooms.get(id);
  }

  /**
   * Gets all rooms.
   * @returns {WsRoom[]} All rooms.
   */
  static getAll(): WsRoom[] {
    return [...this.rooms.values()];
  }

  /**
   * Adds a listener for room creation or deletion.
   * @param {ListenerType|ListenerCallback} first - Listener type or callback.
   * @param {ListenerCallback} [second] - Callback if type is specified.
   * @returns {string} Listener ID.
   */
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
    console.log(`[RoomsManager] Added listener ${listenerId} for type ${type ?? 'both'}`);
    return listenerId;
  }

  /**
   * Removes a listener by ID.
   * @param {string} id - Listener ID.
   */
  static removeListener(id: string) {
    this.createListeners.delete(id);
    this.deleteListeners.delete(id);
    console.log(`[RoomsManager] Removed listener ${id}`);
  }
}

/**
 * Initializes all rooms for existing chats in the database.
 */
export async function initializeRoomsManager() {
  const chats = await dataSource.getRepository(Chat).find({ select: { id: true } });
  chats.map(({ id }) => {
    RoomsManager.create(id);
  });
  console.log(`[RoomsManager] Initialized ${chats.length} rooms from database`);
}
