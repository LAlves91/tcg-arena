import { Logger } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';
import { RealtimeService } from './realtime.service';
import {
  AuthenticatedSocket,
  AuthenticatedSocketData,
  RoomNames,
  SOCKET_PATH,
} from './realtime.types';

interface HandshakeAuth {
  token?: unknown;
}

@WebSocketGateway({ path: SOCKET_PATH, cors: false })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tokens: TokenService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.bindServer(server);
    server.use((socket: Socket, next: (err?: Error) => void) => {
      try {
        const auth = (socket.handshake.auth ?? {}) as HandshakeAuth;
        if (typeof auth.token !== 'string' || auth.token.length === 0) {
          next(new Error('unauthorized'));
          return;
        }
        const payload = this.tokens.verifyAccessToken(auth.token);
        const data: AuthenticatedSocketData = {
          userId: payload.sub,
          sessionId: payload.sid,
        };
        Object.assign(socket.data as Record<string, unknown>, data);
        next();
      } catch (err) {
        this.logger.debug(
          `Rejected socket ${socket.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        next(new Error('unauthorized'));
      }
    });
  }

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    await socket.join(RoomNames.user(socket.data.userId));
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    this.logger.debug(`Disconnect ${socket.id} user=${socket.data.userId ?? 'unknown'}`);
  }

  @SubscribeMessage('ping')
  ping(@MessageBody() payload: unknown): { event: 'pong'; payload: unknown; at: number } {
    return { event: 'pong', payload: payload ?? null, at: Date.now() };
  }
}
