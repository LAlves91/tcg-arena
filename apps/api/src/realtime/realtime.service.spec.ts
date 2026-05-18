import type { Server } from 'socket.io';
import { RealtimeService } from './realtime.service';
import { AuthenticatedSocket } from './realtime.types';

interface FakeSocket {
  joined: string[];
  left: string[];
  join: jest.Mock;
  leave: jest.Mock;
}

function makeSocket(): FakeSocket {
  const joined: string[] = [];
  const left: string[] = [];
  return {
    joined,
    left,
    join: jest.fn(async (room: string) => {
      joined.push(room);
    }),
    leave: jest.fn(async (room: string) => {
      left.push(room);
    }),
  };
}

function makeServer(): { server: Server; emits: Array<{ room: string; event: string; payload: unknown }> } {
  const emits: Array<{ room: string; event: string; payload: unknown }> = [];
  const server = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        emits.push({ room, event, payload });
        return true;
      },
    }),
  } as unknown as Server;
  return { server, emits };
}

describe('RealtimeService', () => {
  it('joins typed user/lobby/match rooms by id', async () => {
    const service = new RealtimeService();
    const socket = makeSocket() as unknown as AuthenticatedSocket;
    await service.joinUserRoom(socket, 'u1');
    await service.joinLobbyRoom(socket, 'l1');
    await service.joinMatchRoom(socket, 'm1');
    expect((socket as unknown as FakeSocket).joined).toEqual(['user:u1', 'lobby:l1', 'match:m1']);
  });

  it('leaves lobby and match rooms', async () => {
    const service = new RealtimeService();
    const socket = makeSocket() as unknown as AuthenticatedSocket;
    await service.leaveLobbyRoom(socket, 'l1');
    await service.leaveMatchRoom(socket, 'm1');
    expect((socket as unknown as FakeSocket).left).toEqual(['lobby:l1', 'match:m1']);
  });

  it('emits to rooms via the bound server', () => {
    const service = new RealtimeService();
    const { server, emits } = makeServer();
    service.bindServer(server);
    service.emitToUser('u1', 'foo', { x: 1 });
    service.emitToLobby('l1', 'bar', { y: 2 });
    service.emitToMatch('m1', 'baz', { z: 3 });
    expect(emits).toEqual([
      { room: 'user:u1', event: 'foo', payload: { x: 1 } },
      { room: 'lobby:l1', event: 'bar', payload: { y: 2 } },
      { room: 'match:m1', event: 'baz', payload: { z: 3 } },
    ]);
  });

  it('throws if used before the server is bound', () => {
    const service = new RealtimeService();
    expect(() => service.emitToUser('u1', 'foo', {})).toThrow(/server/i);
  });
});
