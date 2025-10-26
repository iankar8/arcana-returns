import { FastifyInstance } from 'fastify';
import { getDb } from '../../db/index.js';
import { generateId } from '../../types/common.js';

export async function webhookRoutes(server: FastifyInstance) {
  /**
   * POST /webhooks/shopify
   * Handle Shopify webhook events
   */
  server.post('/shopify', async (request, reply) => {
    const db = getDb();
    const topic = request.headers['x-shopify-topic'] as string;
    const shopDomain = request.headers['x-shopify-shop-domain'] as string;
    
    // Store event for async processing
    const eventId = generateId('shp_evt');
    db.prepare(`
      INSERT INTO shopify_events (event_id, merchant_id, topic, payload)
      VALUES (?, ?, ?, ?)
    `).run(
      eventId,
      shopDomain || 'unknown',
      topic || 'unknown',
      JSON.stringify(request.body)
    );
    
    request.log.info({ eventId, topic }, 'Shopify webhook received');
    
    return reply.status(200).send({ received: true });
  });
  
  /**
   * POST /webhooks/stripe
   * Handle Stripe webhook events
   */
  server.post('/stripe', async (request, reply) => {
    const db = getDb();
    const event = request.body as any;
    
    // Store event for async processing
    const eventId = generateId('str_evt');
    db.prepare(`
      INSERT INTO stripe_events (event_id, merchant_id, type, payload)
      VALUES (?, ?, ?, ?)
    `).run(
      eventId,
      event.account || 'unknown',
      event.type || 'unknown',
      JSON.stringify(event)
    );
    
    request.log.info({ eventId, type: event.type }, 'Stripe webhook received');
    
    return reply.status(200).send({ received: true });
  });
}
