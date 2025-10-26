import { FastifyInstance } from 'fastify';
import { ReturnsService } from '../../services/returns.js';
import { 
  TokenRequestSchema,
  AuthorizeRequestSchema,
  CommitRequestSchema 
} from '../../types/returns.js';
import { generateTraceId } from '../../types/common.js';

const returnsService = new ReturnsService();

export async function returnsRoutes(server: FastifyInstance) {
  // Add trace ID to all requests
  server.addHook('onRequest', async (request) => {
    (request as any).trace_id = generateTraceId();
  });
  
  /**
   * POST /returns/token
   * Issue a signed Return Token
   */
  server.post('/token', async (request, reply) => {
    const body = TokenRequestSchema.parse(request.body);
    const result = await returnsService.issueToken(body, request.merchantId);
    return reply.send(result);
  });
  
  /**
   * POST /returns/authorize
   * Authorize a return with evidence
   */
  server.post('/authorize', async (request, reply) => {
    const body = AuthorizeRequestSchema.parse(request.body);
    const result = await returnsService.authorize(body, request.merchantId);
    return reply.send(result);
  });
  
  /**
   * POST /returns/commit
   * Commit a return and issue refund instruction
   */
  server.post('/commit', async (request, reply) => {
    const body = CommitRequestSchema.parse(request.body);
    const result = await returnsService.commit(body, request.merchantId);
    return reply.send(result);
  });
}
