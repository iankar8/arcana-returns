import { Command } from 'commander';
import { getDb } from '../../db/index.js';
import { cleanupExpiredKeys } from '../../server/middleware/idempotency.js';
import { webhookRetryService } from '../../services/webhook-retry.js';
import { endpointRateLimiter } from '../../server/middleware/endpoint-rate-limit.js';

export const maintenanceCommand = new Command('maintenance')
  .description('Database maintenance tasks');

maintenanceCommand
  .command('cleanup-idempotency')
    .description('Remove expired idempotency keys')
    .action(async () => {
      console.log('Cleaning up expired idempotency keys...');
      
      const deleted = cleanupExpiredKeys();
      
      console.log(`✓ Deleted ${deleted} expired idempotency key(s)`);
    });

maintenanceCommand
  .command('cleanup-old-events')
    .description('Remove old processed events')
    .option('--days <days>', 'Keep events newer than N days', '30')
    .action(async (options) => {
      const db = getDb();
      const days = parseInt(options.days);
      
      console.log(`Cleaning up events older than ${days} days...`);
      
      // Clean up Shopify events
      const shopifyResult = db.prepare(`
        DELETE FROM shopify_events
        WHERE processed = 1
          AND processed_at < datetime('now', '-${days} days')
      `).run();
      
      // Clean up Stripe events
      const stripeResult = db.prepare(`
        DELETE FROM stripe_events
        WHERE processed = 1
          AND processed_at < datetime('now', '-${days} days')
      `).run();
      
      console.log(`✓ Deleted ${shopifyResult.changes} Shopify event(s)`);
      console.log(`✓ Deleted ${stripeResult.changes} Stripe event(s)`);
    });

maintenanceCommand
  .command('retry-dlq')
  .description('Retry events in the dead letter queue')
  .action(async () => {
    console.log('Retrying failed events from DLQ...\n');
    
    const result = await webhookRetryService.retryDeadLetterQueue();
    
    console.log(`📊 DLQ Retry Results:`);
    console.log(`  Attempted: ${result.attempted}`);
    console.log(`  Succeeded: ${result.succeeded}`);
    console.log(`  Failed: ${result.failed}`);
    
    if (result.succeeded > 0) {
      console.log(`\n✓ Successfully processed ${result.succeeded} event(s)`);
    }
    if (result.failed > 0) {
      console.log(`\n⚠️  ${result.failed} event(s) still failing`);
    }
  });

maintenanceCommand
  .command('dlq-stats')
  .description('Show dead letter queue statistics')
  .action(async () => {
    const stats = webhookRetryService.getDeadLetterQueueStats();
    
    console.log('\n📊 Dead Letter Queue Statistics\n');
    console.log(`Total Events: ${stats.total}`);
    console.log(`Unresolved: ${stats.unresolved}`);
    console.log(`Resolved: ${stats.resolved}`);
    
    if (stats.oldestUnresolved) {
      console.log(`\nOldest Unresolved: ${stats.oldestUnresolved}`);
    }
    
    if (stats.unresolved > 0) {
      console.log(`\n⚠️  ${stats.unresolved} event(s) need attention`);
      console.log(`Run: npm run cli -- maintenance retry-dlq`);
    } else {
      console.log(`\n✓ No events in DLQ`);
    }
    
    console.log('');
  });

maintenanceCommand
  .command('rate-limits')
  .description('Show rate limit configuration and statistics')
  .action(async () => {
    console.log('\n📊 Rate Limit Configuration\n');
    
    const configs = endpointRateLimiter.getConfiguredLimits();
    
    console.log('Configured Limits:');
    for (const config of configs) {
      console.log(`  ${config.endpoint}`);
      console.log(`    Limit: ${config.maxRequests} requests per ${config.windowMs / 1000}s`);
    }
    
    console.log('\n📈 Current Statistics:\n');
    const stats = endpointRateLimiter.getStatistics();
    
    for (const stat of stats) {
      console.log(`${stat.endpoint}:`);
      console.log(`  Limit: ${stat.limit} req/min`);
      console.log(`  Active merchants: ${stat.activeKeys}`);
      console.log(`  Total requests (current window): ${stat.totalRequests}`);
      console.log('');
    }
  });

maintenanceCommand
  .command('reset-rate-limit')
  .description('Reset rate limit for a merchant/endpoint')
  .requiredOption('-m, --merchant <merchantId>', 'Merchant ID')
  .requiredOption('-e, --endpoint <endpoint>', 'Endpoint path (e.g., /returns/token)')
  .action(async (options) => {
    endpointRateLimiter.resetRateLimit(options.merchant, options.endpoint);
    console.log(`✓ Reset rate limit for merchant ${options.merchant} on ${options.endpoint}`);
  });

maintenanceCommand
  .command('stats')
    .description('Show database statistics')
    .action(async () => {
      const db = getDb();
      
      console.log('\n📊 Database Statistics\n');
      
      // Idempotency keys
      const idempotencyStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as valid,
          COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired
        FROM idempotency_keys
      `).get() as any;
      
      console.log('Idempotency Keys:');
      console.log(`  Total: ${idempotencyStats.total}`);
      console.log(`  Valid: ${idempotencyStats.valid}`);
      console.log(`  Expired: ${idempotencyStats.expired}`);
      
      // Return tokens
      const tokenStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN revoked = 0 THEN 1 END) as active,
          COUNT(CASE WHEN revoked = 1 THEN 1 END) as revoked
        FROM return_tokens
      `).get() as any;
      
      console.log('\nReturn Tokens:');
      console.log(`  Total: ${tokenStats.total}`);
      console.log(`  Active: ${tokenStats.active}`);
      console.log(`  Revoked: ${tokenStats.revoked}`);
      
      // Decisions
      const decisionStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN decision = 'approve' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN decision = 'step_up' THEN 1 ELSE 0 END) as step_up,
          SUM(CASE WHEN decision = 'deny' THEN 1 ELSE 0 END) as denied
        FROM decisions
      `).get() as any;
      
      console.log('\nDecisions:');
      console.log(`  Total: ${decisionStats.total}`);
      console.log(`  Approved: ${decisionStats.approved || 0}`);
      console.log(`  Step-up: ${decisionStats.step_up || 0}`);
      console.log(`  Denied: ${decisionStats.denied || 0}`);
      
      // Events
      const eventStats = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM shopify_events) as shopify_total,
          (SELECT COUNT(*) FROM shopify_events WHERE processed = 1) as shopify_processed,
          (SELECT COUNT(*) FROM stripe_events) as stripe_total,
          (SELECT COUNT(*) FROM stripe_events WHERE processed = 1) as stripe_processed
      `).get() as any;
      
      console.log('\nWebhook Events:');
      console.log(`  Shopify: ${eventStats.shopify_processed}/${eventStats.shopify_total} processed`);
      console.log(`  Stripe: ${eventStats.stripe_processed}/${eventStats.stripe_total} processed`);
      
      // DLQ stats
      const dlqStats = webhookRetryService.getDeadLetterQueueStats();
      console.log('\nDead Letter Queue:');
      console.log(`  Total: ${dlqStats.total}`);
      console.log(`  Unresolved: ${dlqStats.unresolved}`);
      console.log(`  Resolved: ${dlqStats.resolved}`);
      
      if (dlqStats.unresolved > 0) {
        console.log(`\n⚠️  ${dlqStats.unresolved} failed event(s) need attention`);
      }
      
      console.log('');
    });
