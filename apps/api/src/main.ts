import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app/app.module';
import { EnvService } from './config/env.service';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      genReqId: (req: IncomingMessage | Http2ServerRequest) => {
        const incoming = req.headers['x-trace-id'];
        if (typeof incoming === 'string' && incoming.length > 0) {
          return incoming;
        }
        return randomUUID();
      },
    }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  const env = app.get(EnvService);

  await app.register(helmet);
  await app.register(compress);

  app.enableCors({
    origin: [env.get('WEB_ORIGIN'), env.get('DISCORD_ACTIVITY_ORIGIN')],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Trace-Id'],
  });

  const ioAdapter = new RedisIoAdapter(app);
  await ioAdapter.connectToRedis(env);
  app.useWebSocketAdapter(ioAdapter);

  app.enableShutdownHooks();

  const port = env.get('PORT');
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
