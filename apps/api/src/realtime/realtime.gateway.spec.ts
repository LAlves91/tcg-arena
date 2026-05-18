import { createServer, Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { Server as IoServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { EnvService } from '../config/env.service';
import { TokenService } from '../auth/token.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { SOCKET_PATH } from './realtime.types';

function makeEnv(): EnvService {
  const values: Record<string, unknown> = {
    JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '30d',
  };
  return {
    get: (k: string) => values[k],
    isProduction: false,
    isDevelopment: false,
  } as unknown as EnvService;
}

interface Harness {
  port: number;
  io: IoServer;
  http: HttpServer;
  tokens: TokenService;
  realtime: RealtimeService;
  close: () => Promise<void>;
}

async function startHarness(): Promise<Harness> {
  const env = makeEnv();
  const tokens = new TokenService(env);
  const realtime = new RealtimeService();
  const gateway = new RealtimeGateway(tokens, realtime);

  const http = createServer();
  const io = new IoServer(http, { path: SOCKET_PATH });
  gateway.server = io;
  gateway.afterInit(io);

  io.on('connection', (socket) => {
    void gateway.handleConnection(socket);
    socket.on('disconnect', () => gateway.handleDisconnect(socket));
    socket.on('ping', async (payload: unknown, ack?: (response: unknown) => void) => {
      const response = gateway.ping(payload);
      if (typeof ack === 'function') ack(response);
    });
  });

  await new Promise<void>((resolve) => http.listen(0, resolve));
  const port = (http.address() as AddressInfo).port;

  return {
    port,
    io,
    http,
    tokens,
    realtime,
    close: async () => {
      // `io.close()` shuts down the attached HTTP server too, so we don't
      // call `http.close()` after it.
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
      });
    },
  };
}

function connect(port: number, auth: Record<string, unknown>): ClientSocket {
  return ioClient(`http://127.0.0.1:${port}`, {
    path: SOCKET_PATH,
    auth,
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
}

describe('RealtimeGateway', () => {
  let h: Harness;

  beforeEach(async () => {
    h = await startHarness();
  });

  afterEach(async () => {
    await h.close();
  });

  it('rejects connections without a token', async () => {
    const client = connect(h.port, {});
    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', (e) => resolve(e));
      client.on('connect', () => resolve(new Error('should not connect')));
    });
    expect(err.message).toBe('unauthorized');
    client.disconnect();
  });

  it('rejects connections with an invalid token', async () => {
    const client = connect(h.port, { token: 'definitely-not-a-jwt' });
    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', (e) => resolve(e));
      client.on('connect', () => resolve(new Error('should not connect')));
    });
    expect(err.message).toBe('unauthorized');
    client.disconnect();
  });

  it('accepts a valid token and echoes ping with pong', async () => {
    const { token } = h.tokens.signAccessToken({ sub: 'user-1', sid: 'session-1' });
    const client = connect(h.port, { token });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (e) => reject(e));
    });

    const ack = await new Promise<{ event: string; payload: unknown }>((resolve) => {
      client.emit('ping', { hello: 'world' }, (response: unknown) => {
        resolve(response as { event: string; payload: unknown });
      });
    });
    expect(ack.event).toBe('pong');
    expect(ack.payload).toEqual({ hello: 'world' });

    client.disconnect();
  });

  it('auto-joins the connecting user to their user room and emitToUser reaches them', async () => {
    const { token } = h.tokens.signAccessToken({ sub: 'user-42', sid: 'session-x' });
    const client = connect(h.port, { token });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (e) => reject(e));
    });

    const received = new Promise<unknown>((resolve) => {
      client.on('notice', (payload) => resolve(payload));
    });

    // Give the join() a tick to settle before broadcasting.
    await new Promise((r) => setImmediate(r));
    h.realtime.emitToUser('user-42', 'notice', { kind: 'hi' });

    expect(await received).toEqual({ kind: 'hi' });
    client.disconnect();
  });

  it('routes broadcasts via room helpers to the right subscribers', async () => {
    const { token: tA } = h.tokens.signAccessToken({ sub: 'user-A', sid: 'sA' });
    const { token: tB } = h.tokens.signAccessToken({ sub: 'user-B', sid: 'sB' });
    const a = connect(h.port, { token: tA });
    const b = connect(h.port, { token: tB });

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        a.on('connect', () => resolve());
        a.on('connect_error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        b.on('connect', () => resolve());
        b.on('connect_error', reject);
      }),
    ]);

    // Join A to a lobby room via the server-side socket reference.
    const sockets = await h.io.fetchSockets();
    const aServer = sockets.find((s) => (s.data as { userId: string }).userId === 'user-A');
    if (!aServer) throw new Error('did not find user-A on the server side');
    await aServer.join('lobby:abc');

    const onA = new Promise<unknown>((resolve) => a.on('lobby:event', resolve));
    let bGotIt = false;
    b.on('lobby:event', () => {
      bGotIt = true;
    });

    h.realtime.emitToLobby('abc', 'lobby:event', { msg: 'joined' });
    expect(await onA).toEqual({ msg: 'joined' });
    expect(bGotIt).toBe(false);

    a.disconnect();
    b.disconnect();
  });
});
