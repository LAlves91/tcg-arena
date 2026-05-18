import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { AuthenticatedSocket, RoomNames } from './realtime.types';

/**
 * Room helpers. Feature code MUST go through these methods — never
 * `socket.join(...)` or `server.to(...)` with raw room names.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  // --- join ----------------------------------------------------------------

  async joinUserRoom(socket: AuthenticatedSocket, userId: string): Promise<void> {
    await socket.join(RoomNames.user(userId));
  }

  async joinLobbyRoom(socket: AuthenticatedSocket, lobbyId: string): Promise<void> {
    await socket.join(RoomNames.lobby(lobbyId));
  }

  async joinMatchRoom(socket: AuthenticatedSocket, matchId: string): Promise<void> {
    await socket.join(RoomNames.match(matchId));
  }

  // --- leave ---------------------------------------------------------------

  async leaveLobbyRoom(socket: AuthenticatedSocket, lobbyId: string): Promise<void> {
    await socket.leave(RoomNames.lobby(lobbyId));
  }

  async leaveMatchRoom(socket: AuthenticatedSocket, matchId: string): Promise<void> {
    await socket.leave(RoomNames.match(matchId));
  }

  // --- broadcast (server-originating) --------------------------------------

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.requireServer().to(RoomNames.user(userId)).emit(event, payload);
  }

  emitToLobby(lobbyId: string, event: string, payload: unknown): void {
    this.requireServer().to(RoomNames.lobby(lobbyId)).emit(event, payload);
  }

  emitToMatch(matchId: string, event: string, payload: unknown): void {
    this.requireServer().to(RoomNames.match(matchId)).emit(event, payload);
  }

  private requireServer(): Server {
    if (!this.server) {
      throw new Error('RealtimeService used before gateway initialised the server');
    }
    return this.server;
  }
}
