import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

/** Thin emit facade over the Socket.IO server so other modules never touch sockets directly. */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  /** Called by the gateway once the Socket.IO server exists. */
  attach(server: Server): void {
    this.server = server;
  }

  emitToRoom(room: string, event: string, payload: unknown): void {
    this.server?.to(room).emit(event, payload);
  }

  broadcast(event: string, payload: unknown): void {
    this.server?.emit(event, payload);
  }

  /** Test support: drop every client connection (clients reconnect on their own). */
  disconnectAll(): void {
    this.server?.disconnectSockets(true);
  }
}
