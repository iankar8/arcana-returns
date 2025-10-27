import { FastifyInstance } from 'fastify';
import { getDb } from '../../db/index.js';
import { observabilityService } from '../middleware/observability.js';
import { endpointRateLimiter } from '../middleware/endpoint-rate-limit.js';
import { webhookRetryService } from '../../services/webhook-retry.js';

/**
 * Health & Status Routes
 * 
 * Production-ready health checks and status endpoints
 */

export async function healthRoutes(server: FastifyInstance) {
  /**
   * GET /health - Basic health check
   */
  server.get('/health', async () => {
    return { 
      status: 'ok',
      version: process.env.npm_package_version || '0.1.0',
      timestamp: new Date().toISOString(),
    };
  });
  
  /**
   * GET /health/detailed - Detailed health check
   */
  server.get('/health/detailed', async () => {
    const db = getDb();
    
    // Check database connectivity
    let dbHealthy = false;
    try {
      db.prepare('SELECT 1').get();
      dbHealthy = true;
    } catch (error) {
      dbHealthy = false;
    }
    
    // Get DLQ stats
    const dlqStats = webhookRetryService.getDeadLetterQueueStats();
    
    // Get rate limit stats
    const rateLimitStats = endpointRateLimiter.getStatistics();
    
    // Get request metrics
    const metrics = observabilityService.getSummary();
    
    return {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        database: {
          status: dbHealthy ? 'up' : 'down',
        },
        dlq: {
          status: dlqStats.unresolved > 100 ? 'warning' : 'ok',
          unresolved: dlqStats.unresolved,
          total: dlqStats.total,
        },
        rateLimits: {
          status: 'ok',
          activeEndpoints: rateLimitStats.length,
        },
      },
      metrics: {
        requests: {
          total: metrics.totalRequests,
          avgDuration: Math.round(metrics.avgDuration),
          errorRate: Math.round(metrics.errorRate * 100) / 100,
        },
      },
    };
  });
  
  /**
   * GET /metrics - Prometheus-compatible metrics
   */
  server.get('/metrics', async () => {
    const metrics = observabilityService.getSummary();
    const dlqStats = webhookRetryService.getDeadLetterQueueStats();
    
    // Simple Prometheus format
    const lines = [
      '# HELP arcana_requests_total Total number of requests',
      '# TYPE arcana_requests_total counter',
      `arcana_requests_total ${metrics.totalRequests}`,
      '',
      '# HELP arcana_request_duration_ms Average request duration in milliseconds',
      '# TYPE arcana_request_duration_ms gauge',
      `arcana_request_duration_ms ${Math.round(metrics.avgDuration)}`,
      '',
      '# HELP arcana_error_rate Request error rate (0-1)',
      '# TYPE arcana_error_rate gauge',
      `arcana_error_rate ${metrics.errorRate}`,
      '',
      '# HELP arcana_dlq_unresolved Unresolved DLQ events',
      '# TYPE arcana_dlq_unresolved gauge',
      `arcana_dlq_unresolved ${dlqStats.unresolved}`,
      '',
    ];
    
    // Add status codes
    for (const [code, count] of Object.entries(metrics.statusCodeDistribution)) {
      lines.push(`arcana_status_${code}_total ${count}`);
    }
    
    return lines.join('\n');
  });
}
