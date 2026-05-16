import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { ZodValidationException } from 'nestjs-zod';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId: string;
  [key: string]: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const traceId = String(request.id ?? '');

    const problem = this.toProblem(exception, request.url, traceId);

    if (problem.status >= 500) {
      this.logger.error({ err: exception, traceId, status: problem.status }, problem.title);
    } else {
      this.logger.warn({ traceId, status: problem.status, detail: problem.detail }, problem.title);
    }

    void reply
      .status(problem.status)
      .header('content-type', 'application/problem+json')
      .send(problem);
  }

  private toProblem(exception: unknown, instance: string, traceId: string): ProblemDetails {
    if (exception instanceof ZodValidationException) {
      const issues = exception.getZodError().issues;
      return {
        type: 'about:blank',
        title: 'Validation failed',
        status: HttpStatus.BAD_REQUEST,
        detail: 'Request body or parameters did not pass validation.',
        instance,
        traceId,
        errors: issues,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const title = HTTP_TITLES[status] ?? exception.name;
      const detail =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message?.toString() ??
            exception.message);
      return {
        type: 'about:blank',
        title,
        status,
        detail,
        instance,
        traceId,
      };
    }

    return {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred.',
      instance,
      traceId,
    };
  }
}

const HTTP_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};
