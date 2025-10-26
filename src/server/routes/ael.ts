import { FastifyInstance } from 'fastify';
import { AELService } from '../../services/ael.js';

const aelService = new AELService();

export async function aelRoutes(server: FastifyInstance) {
  /**
   * GET /ael/decision/:id
   * Get decision with BOM
   */
  server.get('/decision/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const decision = aelService.getDecision(id);
    
    if (!decision) {
      return reply.status(404).send({
        error: {
          code: 'AEL-001',
          message: 'Decision not found',
        },
      });
    }
    
    return reply.send(decision);
  });
  
  /**
   * POST /ael/replay/:id
   * Generate replay pack for a decision
   */
  server.post('/replay/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const replayId = await aelService.generateReplay(id);
    
    return reply.send({
      replay_id: replayId,
      status: 'generated',
    });
  });
  
  /**
   * GET /ael/replay/:replayId
   * Get replay artifact
   */
  server.get('/replay/:replayId', async (request, reply) => {
    const { replayId } = request.params as { replayId: string };
    const replay = aelService.getReplay(replayId);
    
    if (!replay) {
      return reply.status(404).send({
        error: {
          code: 'AEL-001',
          message: 'Replay not found',
        },
      });
    }
    
    return reply.send(replay);
  });
  
  /**
   * GET /ael/diff
   * Compare two decisions
   */
  server.get('/diff', async (request, reply) => {
    const { baseline, candidate } = request.query as { baseline?: string; candidate?: string };
    
    if (!baseline || !candidate) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing baseline or candidate query parameters',
        },
      });
    }
    
    const diff = aelService.diffDecisions(baseline, candidate);
    return reply.send(diff);
  });
  
  /**
   * GET /ael/decisions
   * List decisions for merchant
   */
  server.get('/decisions', async (request, reply) => {
    const { limit } = request.query as { limit?: string };
    const decisions = aelService.listDecisions(
      request.merchantId,
      limit ? parseInt(limit) : 50
    );
    
    return reply.send({ decisions });
  });
}
