import { FastifyReply } from 'fastify';
import { ArcanaError } from '../../types/common.js';
import { ZodError } from 'zod';

/**
 * Enhanced Error Response Formatter
 * 
 * Provides developer-friendly error messages with:
 * - Field-specific validation errors
 * - Actionable suggestions
 * - Links to documentation
 * - Example fixes
 */

export interface EnhancedErrorResponse {
  error: {
    code: string;
    message: string;
    suggestion?: string;
    fields?: {
      field: string;
      issue: string;
      example?: string;
    }[];
    docs_url?: string;
    trace_id?: string;
  };
}

export class EnhancedErrorFormatter {
  private readonly DOCS_BASE_URL = 'https://docs.arcana.dev/errors';
  
  /**
   * Format ArcanaError for response
   */
  formatArcanaError(error: ArcanaError, traceId?: string): EnhancedErrorResponse {
    return {
      error: {
        code: error.code,
        message: error.message,
        suggestion: this.getSuggestion(error.code),
        docs_url: `${this.DOCS_BASE_URL}/${error.code}`,
        trace_id: traceId,
        ...(error.details && { fields: this.formatDetails(error.details) }),
      },
    };
  }
  
  /**
   * Format Zod validation error
   */
  formatZodError(error: ZodError, traceId?: string): EnhancedErrorResponse {
    const fields = error.errors.map(err => ({
      field: err.path.join('.'),
      issue: err.message,
      example: this.getExampleForPath(err.path.join('.')),
    }));
    
    return {
      error: {
        code: 'VALIDATION-001',
        message: 'Request validation failed',
        suggestion: 'Check the fields array for specific validation errors. Ensure all required fields are present and correctly formatted.',
        fields,
        docs_url: `${this.DOCS_BASE_URL}/VALIDATION-001`,
        trace_id: traceId,
      },
    };
  }
  
  /**
   * Get helpful suggestion for error code
   */
  private getSuggestion(code: string): string {
    const suggestions: Record<string, string> = {
      'RT-001': 'Check the request body format. Ensure all required fields are present and have the correct data types.',
      'RT-004': 'The return token has expired (15 minute TTL). Generate a new token via POST /returns/token.',
      'RT-007': 'Token signature invalid. Do not modify the token. If the issue persists, generate a new token.',
      'RT-010': 'The policy has changed since token issuance. Generate a new token to use the latest policy.',
      'RT-021': 'This return has already been committed. Check your idempotency keys to avoid duplicates.',
      'POL-001': 'Policy not found. Verify the policy_id exists and is active for your merchant account.',
      'AUTH-001': 'Invalid API key. Check that your Authorization header is set correctly: "Bearer sk_..."',
      'AUTH-002': 'Access denied. This resource belongs to a different merchant or you lack permissions.',
      'RATE-001': 'Rate limit exceeded. Wait for the duration specified in Retry-After header, or contact support to increase limits.',
      'EV-001': 'Evidence URL must use HTTPS protocol for security.',
      'EV-004': 'Evidence URL is not accessible. Ensure the URL is publicly reachable and returns 200 OK.',
      'EV-009': 'Evidence content type does not match the evidence type. Upload the correct file format.',
      'EV-011': 'Evidence file exceeds 10MB limit. Compress the file or use a CDN with automatic optimization.',
    };
    
    return suggestions[code] || 'See documentation for more details on this error.';
  }
  
  /**
   * Format error details into field errors
   */
  private formatDetails(details: Record<string, any>): {
    field: string;
    issue: string;
    example?: string;
  }[] {
    if (details.errors && Array.isArray(details.errors)) {
      return details.errors.map((err: any) => ({
        field: err.field || 'unknown',
        issue: err.message || err.toString(),
        example: this.getExampleForPath(err.field),
      }));
    }
    
    return Object.entries(details).map(([field, issue]) => ({
      field,
      issue: String(issue),
      example: this.getExampleForPath(field),
    }));
  }
  
  /**
   * Get example value for a field path
   */
  private getExampleForPath(path: string): string | undefined {
    const examples: Record<string, string> = {
      'order_id': 'ord_1234567890',
      'customer_ref': 'cust_abc123xyz',
      'return_token': 'rt.eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...',
      'policy_id': 'plc_NFB5TJw3uVnS',
      'items': '[{"sku": "SHIRT-M", "qty": 1, "price_cents": 2999}]',
      'items.0.sku': 'SHIRT-M',
      'items.0.qty': '1',
      'items.0.price_cents': '2999',
      'reason_code': 'doesnt_fit',
      'evidence': '[{"type": "photo_packaging", "url": "https://cdn.example.com/img.jpg"}]',
      'evidence.0.type': 'photo_packaging',
      'evidence.0.url': 'https://cdn.example.com/evidence.jpg',
      'receipt_event.type': 'scan',
      'receipt_event.ts': '2025-10-26T10:00:00Z',
    };
    
    return examples[path];
  }
}

/**
 * Enhanced error handler with better formatting
 */
export async function enhancedErrorHandler(
  error: Error,
  request: any,
  reply: FastifyReply
): Promise<void> {
  const formatter = new EnhancedErrorFormatter();
  const traceId = request.trace_id;
  
  // Log error for debugging
  console.error('[Error]', {
    trace_id: traceId,
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });
  
  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    const response = formatter.formatZodError(error as ZodError, traceId);
    return reply.code(400).send(response);
  }
  
  // Handle Arcana errors
  if (error instanceof ArcanaError) {
    const response = formatter.formatArcanaError(error, traceId);
    return reply.code(error.statusCode).send(response);
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    const code = error.name === 'TokenExpiredError' ? 'RT-004' : 'RT-007';
    const arcanaError = new ArcanaError(
      code,
      error.message,
      error.name === 'TokenExpiredError' ? 410 : 401
    );
    const response = formatter.formatArcanaError(arcanaError, traceId);
    return reply.code(arcanaError.statusCode).send(response);
  }
  
  // Unknown errors - sanitize for security
  const response: EnhancedErrorResponse = {
    error: {
      code: 'INTERNAL-001',
      message: 'An internal error occurred. Please contact support with the trace_id.',
      suggestion: 'If this error persists, contact support@arcana.dev with the trace_id for assistance.',
      docs_url: 'https://docs.arcana.dev/errors/INTERNAL-001',
      trace_id: traceId,
    },
  };
  
  return reply.code(500).send(response);
}

export const enhancedErrorFormatter = new EnhancedErrorFormatter();
