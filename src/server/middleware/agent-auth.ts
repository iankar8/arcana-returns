import { FastifyRequest, FastifyReply } from 'fastify';
import { AttestationService } from '../../services/attestation.js';
import { AgentContext, AgentPlatform } from '../../types/attestation.js';
import { getDb } from '../../db/index.js';
import { generateId } from '../../types/common.js';

// Extend Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    agentContext?: AgentContext;
  }
}

const attestationService = new AttestationService();

/**
 * Agent Authentication Middleware
 * Verifies agent attestations and injects verified context into request
 */
export async function agentAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Extract attestation header
  const attestationHeader = (
    request.headers['x-agent-attestation'] ||
    request.headers['authorization']?.replace(/^Bearer\s+/, '')
  ) as string | undefined;
  
  // Optional platform hint
  const platformHint = request.headers['x-agent-platform'] as AgentPlatform | undefined;
  
  // If no attestation provided, continue without agent context
  if (!attestationHeader) {
    return;
  }
  
  try {
    // Verify attestation
    const result = await attestationService.verifyAttestation(
      attestationHeader,
      platformHint
    );
    
    if (!result.valid) {
      // Log failed verification
      request.log.warn({
        msg: 'Agent attestation verification failed',
        error: result.error,
        error_code: result.error_code,
      });
      
      // Optional: Reject request if attestation is invalid
      // For MVP, we'll allow it through but mark as unverified
      // Uncomment to enforce verification:
      // return reply.code(401).send({
      //   error: {
      //     code: 'INVALID_ATTESTATION',
      //     message: result.error || 'Attestation verification failed',
      //   },
      // });
      
      return;
    }
    
    // Inject verified agent context into request
    request.agentContext = result.agent_context;
    
    // Log attestation event
    logAttestation(request, result.agent_context!);
    
    request.log.info({
      msg: 'Agent attestation verified',
      platform: result.agent_context!.platform,
      agent_id: result.agent_context!.agent_id,
    });
    
  } catch (error) {
    request.log.error({
      msg: 'Error verifying agent attestation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Continue without agent context
  }
}

/**
 * Log attestation event to database
 */
function logAttestation(request: FastifyRequest, agentContext: AgentContext): void {
  try {
    const db = getDb();
    const traceId = (request as any).trace_id || 'unknown';
    
    db.prepare(`
      INSERT INTO agent_attestations (
        id, trace_id, platform, agent_id, attestation_format,
        verified, claims, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId('att'),
      traceId,
      agentContext.platform,
      agentContext.agent_id,
      agentContext.attestation_format,
      agentContext.verified ? 1 : 0,
      JSON.stringify(agentContext.claims || {}),
      new Date().toISOString()
    );
  } catch (error) {
    // Don't fail request if logging fails
    request.log.error({
      msg: 'Failed to log attestation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Require verified agent (strict mode)
 * Use this middleware when agent attestation is required
 */
export async function requireAgent(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.agentContext) {
    return reply.code(401).send({
      error: {
        code: 'AGENT_REQUIRED',
        message: 'Valid agent attestation required',
      },
    });
  }
  
  if (!request.agentContext.verified) {
    return reply.code(401).send({
      error: {
        code: 'AGENT_NOT_VERIFIED',
        message: 'Agent attestation verification failed',
      },
    });
  }
}
