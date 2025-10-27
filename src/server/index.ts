import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import { initDb } from '../db/index.js';
import { policyRoutes } from './routes/policy.js';
import { returnsRoutes } from './routes/returns.js';
import { aelRoutes } from './routes/ael.js';
import { webhookRoutes } from './routes/webhooks.js';
import { metricsRoutes } from './routes/metrics.js';
import { healthRoutes } from './routes/health.js';
import { adminRoutes } from './routes/admin.js';
import { authMiddleware } from './middleware/auth.js';
import { enhancedErrorHandler } from './middleware/enhanced-errors.js';
import { observabilityMiddleware } from './middleware/observability.js';
import { idempotencyPlugin } from './middleware/idempotency.js';
import { endpointRateLimitMiddleware } from './middleware/endpoint-rate-limit.js';
import { getBackgroundProcessor } from '../services/background-processor.js';

// Load environment variables
config();

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

// Register plugins
await server.register(cors, {
  origin: true,
});

// Global rate limit (fallback for unconfigured endpoints)
await server.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  skipOnError: true, // Don't block on rate limit errors
});

// Idempotency middleware
await server.register(idempotencyPlugin);

// Auth middleware (except for health check, webhooks, admin, and public metrics)
server.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/health') || 
      request.url.startsWith('/webhooks') ||
      request.url.startsWith('/admin') ||
      request.url === '/metrics/health') {
    return;
  }
  await authMiddleware(request, reply);
});

// Per-endpoint rate limiting (after auth, so we have merchantId)
server.addHook('onRequest', endpointRateLimitMiddleware);

// Observability (request logging)
server.addHook('onRequest', observabilityMiddleware);

// Error handler (enhanced)
server.setErrorHandler(enhancedErrorHandler);

// Health and metrics routes
await server.register(healthRoutes);

// Admin routes (no auth for init)
await server.register(adminRoutes, { prefix: '/admin' });

// Register routes
await server.register(policyRoutes, { prefix: '/policy' });
await server.register(returnsRoutes, { prefix: '/returns' });
await server.register(aelRoutes, { prefix: '/ael' });
await server.register(webhookRoutes, { prefix: '/webhooks' });
await server.register(metricsRoutes, { prefix: '/metrics' });

// JWKS endpoint
server.get('/.well-known/jwks.json', async () => {
  const { getPublicJWKS } = await import('../services/jwt.js');
  return await getPublicJWKS();
});

// Start server
const start = async () => {
  try {
    // Initialize database
    initDb();
    server.log.info('Database initialized');
    
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    
    server.log.info(`🚀 Arcana Returns API v0.1 running on port ${port}`);
    
    // Start background event processor
    const processor = getBackgroundProcessor();
    processor.start(10000); // Process events every 10 seconds
    server.log.info('Background event processor started');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

export default server;
