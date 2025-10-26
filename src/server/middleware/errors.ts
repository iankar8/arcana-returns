import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ArcanaError } from '../../types/common.js';
import { ZodError } from 'zod';

/**
 * Global error handler
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  request.log.error({
    err: error,
    trace_id: (request as any).trace_id,
  });
  
  // Handle Arcana errors
  if (error instanceof ArcanaError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        trace_id: (request as any).trace_id,
      },
    });
  }
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: error.errors,
        trace_id: (request as any).trace_id,
      },
    });
  }
  
  // Handle rate limit errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: {
        code: 'RATE-001',
        message: 'Rate limit exceeded',
        trace_id: (request as any).trace_id,
      },
    });
  }
  
  // Generic error
  return reply.status(error.statusCode || 500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
      trace_id: (request as any).trace_id,
    },
  });
}
