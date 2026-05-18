import type { Socket } from 'socket.io';

/** Data we attach to every authenticated socket. */
export interface AuthenticatedSocketData {
  userId: string;
  sessionId: string;
}

/** A Socket whose `data` field is guaranteed to hold our auth payload. */
export type AuthenticatedSocket = Socket<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  AuthenticatedSocketData
>;

export const SOCKET_PATH = '/socket';

/** Room naming. Centralised so feature code never builds these strings itself. */
export const RoomNames = {
  user: (userId: string): `user:${string}` => `user:${userId}`,
  lobby: (lobbyId: string): `lobby:${string}` => `lobby:${lobbyId}`,
  match: (matchId: string): `match:${string}` => `match:${matchId}`,
} as const;
