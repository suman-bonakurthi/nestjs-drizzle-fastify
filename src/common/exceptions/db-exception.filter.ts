import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FastifyReply, FastifyRequest } from 'fastify';
import { normalizeDbError } from '../exceptions/normalize-db-error.util';
import { DBNotFoundException } from './not-found.exception';

/**
 * Cross-framework request type (Fastify | Express)
 */
interface HttpRequestLike {
  url?: string;
}

/**
 * Cross-framework reply type (Fastify | Express)
 */
type HttpReplyLike = FastifyReply | Response;

/**
 * Unified error payload structure
 */
interface HttpExceptionPayload {
  statusCode: number;
  message: string;
  error: string;
}

@Catch()
export class DBExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const reply = ctx.getResponse<HttpReplyLike>();
    const request = ctx.getRequest<FastifyRequest | Request>();

    // ✅ 1. Handle logical "not found" errors
    if (exception instanceof DBNotFoundException) {
      const payload: HttpExceptionPayload = {
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Not Found',
      };

      this.sendResponse(reply, payload);
      return;
    }

    // ✅ 2. Handle database errors
    const normalized = normalizeDbError(exception);

    const payload = this.mapToHttpResponse(normalized, request);
    this.sendResponse(reply, payload);
  }

  /**
   * ✅ Unified response sender (Fastify + Express)
   */
  private sendResponse(
    reply: HttpReplyLike,
    payload: HttpExceptionPayload,
  ): void {
    // Fastify reply
    if ('send' in reply && typeof reply.status === 'function') {
      reply.status(payload.statusCode).send(payload);
      return;
    }

    // Express response
    if ('json' in reply && typeof reply.status === 'function') {
      (reply as Response).status(payload.statusCode).json(payload);
      return;
    }

    // Non-HTTP (CLI, job)
    console.error('Unhandled DB Exception:', payload);
    throw new Error(payload.message);
  }

  /**
   * ✅ Map normalized DB error to HTTP response
   */
  private mapToHttpResponse(
    normalized: ReturnType<typeof normalizeDbError>,
    request: HttpRequestLike,
  ): HttpExceptionPayload {
    switch (normalized.type) {
      case 'unique_violation':
        return {
          statusCode: HttpStatus.CONFLICT,
          message:
            normalized.detail || 'Duplicate record violates unique constraint',
          error: 'Conflict',
        };

      case 'foreign_key_violation':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: normalized.detail || 'Foreign key constraint violation',
          error: 'Bad Request',
        };

      case 'not_null_violation':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: normalized.detail || 'Missing required field',
          error: 'Bad Request',
        };

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Unexpected database error',
          error: 'Internal Server Error',
        };
    }
  }
}
