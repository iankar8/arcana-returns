import { FastifyInstance } from 'fastify';
import { PolicyService } from '../../services/policy.js';
import { PolicyImportRequestSchema } from '../../types/policy.js';

const policyService = new PolicyService();

export async function policyRoutes(server: FastifyInstance) {
  /**
   * POST /policy/import
   * Import a policy from PDF, URL, or text
   */
  server.post('/import', async (request, reply) => {
    const body = PolicyImportRequestSchema.parse(request.body);
    const result = await policyService.importPolicy(body);
    return reply.send(result);
  });
  
  /**
   * GET /policy/:policyId
   * Get latest policy snapshot
   */
  server.get('/:policyId', async (request, reply) => {
    const { policyId } = request.params as { policyId: string };
    const policy = policyService.getPolicy(policyId);
    
    if (!policy) {
      return reply.status(404).send({
        error: {
          code: 'POL-001',
          message: 'Policy not found',
        },
      });
    }
    
    return reply.send(policy);
  });
  
  /**
   * GET /policy/:policyId/diff
   * Compare two policy snapshots
   */
  server.get('/:policyId/diff', async (request, reply) => {
    const { policyId } = request.params as { policyId: string };
    const { from, to } = request.query as { from?: string; to?: string };
    
    if (!from || !to) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing from or to query parameters',
        },
      });
    }
    
    const diff = policyService.diffPolicies(from, to);
    return reply.send(diff);
  });
}
