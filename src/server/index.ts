import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import { initDb } from '../db/index.js';
import { policyRoutes } from './routes/policy.js';
import { returnsRoutes } from './routes/returns.js';
import { aelRoutes } from './routes/ael.js';
import { webhookRoutes } from './routes/webhooks.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';

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

await server.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
});

// Auth middleware (except for health check and webhooks)
server.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/health') || request.url.startsWith('/webhooks')) {
    return;
  }
  await authMiddleware(request, reply);
});

// Error handler
server.setErrorHandler(errorHandler);

// Health check
server.get('/health', async () => {
  return { status: 'ok', version: '0.1.0' };
});

// Register routes
await server.register(policyRoutes, { prefix: '/policy' });
await server.register(returnsRoutes, { prefix: '/returns' });
await server.register(aelRoutes, { prefix: '/ael' });
await server.register(webhookRoutes, { prefix: '/webhooks' });

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
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

export default server;
