import { FastifyInstance } from 'fastify';
import { getDb } from '../../db/index.js';

/**
 * Metrics & Observability Routes
 * Provides visibility into system health and decision patterns
 */

export async function metricsRoutes(server: FastifyInstance) {
  
  /**
   * GET /metrics - System-wide metrics
   */
  server.get('/metrics', async () => {
    const db = getDb();
    
    // Decision counts in last 24h
    const decisions24h = db.prepare(`
      SELECT decision, COUNT(*) as count 
      FROM decisions 
      WHERE created_at > datetime('now', '-1 day')
      GROUP BY decision
    `).all() as any[];
    
    const decisionMap = {
      approve: 0,
      step_up: 0,
      deny: 0,
    };
    
    decisions24h.forEach((row: any) => {
      decisionMap[row.decision as keyof typeof decisionMap] = row.count;
    });
    
    // Total decisions all time
    const totalDecisions = db.prepare(`
      SELECT COUNT(*) as count FROM decisions
    `).get() as any;
    
    // Average risk score
    const avgRisk = db.prepare(`
      SELECT AVG(risk_score) as avg_score 
      FROM decisions 
      WHERE created_at > datetime('now', '-1 day')
    `).get() as any;
    
    // Pending events
    const pendingShopify = db.prepare(`
      SELECT COUNT(*) as count FROM shopify_events WHERE processed = 0
    `).get() as any;
    
    const pendingStripe = db.prepare(`
      SELECT COUNT(*) as count FROM stripe_events WHERE processed = 0
    `).get() as any;
    
    // Active merchants (with decisions in last 7 days)
    const activeMerchants = db.prepare(`
      SELECT COUNT(DISTINCT merchant_id) as count 
      FROM decisions 
      WHERE created_at > datetime('now', '-7 days')
    `).get() as any;
    
    // Return tokens issued in last 24h
    const tokensIssued = db.prepare(`
      SELECT COUNT(*) as count 
      FROM return_tokens 
      WHERE issued_at > datetime('now', '-1 day')
    `).get() as any;
    
    // Revoked tokens (committed returns)
    const tokensRevoked = db.prepare(`
      SELECT COUNT(*) as count 
      FROM return_tokens 
      WHERE revoked = 1 AND revoked_at > datetime('now', '-1 day')
    `).get() as any;
    
    return {
      timestamp: new Date().toISOString(),
      decisions: {
        last_24h: decisionMap,
        total: totalDecisions.count,
        avg_risk_score: avgRisk.avg_score ? parseFloat(avgRisk.avg_score.toFixed(2)) : 0,
      },
      tokens: {
        issued_24h: tokensIssued.count,
        committed_24h: tokensRevoked.count,
      },
      events: {
        pending_shopify: pendingShopify.count,
        pending_stripe: pendingStripe.count,
      },
      merchants: {
        active_7d: activeMerchants.count,
      },
    };
  });
  
  /**
   * GET /metrics/merchant/:merchantId - Per-merchant metrics
   */
  server.get<{ Params: { merchantId: string } }>(
    '/metrics/merchant/:merchantId',
    async (request) => {
      const { merchantId } = request.params;
      const db = getDb();
      
      // Decisions breakdown
      const decisions = db.prepare(`
        SELECT decision, COUNT(*) as count 
        FROM decisions 
        WHERE merchant_id = ? AND created_at > datetime('now', '-7 days')
        GROUP BY decision
      `).all(merchantId) as any[];
      
      const decisionMap = {
        approve: 0,
        step_up: 0,
        deny: 0,
      };
      
      decisions.forEach((row: any) => {
        decisionMap[row.decision as keyof typeof decisionMap] = row.count;
      });
      
      // Average risk score
      const avgRisk = db.prepare(`
        SELECT AVG(risk_score) as avg_score 
        FROM decisions 
        WHERE merchant_id = ? AND created_at > datetime('now', '-7 days')
      `).get(merchantId) as any;
      
      // Policy info
      const policy = db.prepare(`
        SELECT policy_id, hash, return_window_days, restock_fee_pct, created_at
        FROM policy_snapshots 
        WHERE merchant_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(merchantId) as any;
      
      // Recent decisions
      const recentDecisions = db.prepare(`
        SELECT decision_id, decision, risk_score, created_at, trace_id
        FROM decisions 
        WHERE merchant_id = ? 
        ORDER BY created_at DESC 
        LIMIT 10
      `).all(merchantId) as any[];
      
      return {
        merchant_id: merchantId,
        timestamp: new Date().toISOString(),
        decisions_7d: decisionMap,
        avg_risk_score: avgRisk.avg_score ? parseFloat(avgRisk.avg_score.toFixed(2)) : 0,
        active_policy: policy || null,
        recent_decisions: recentDecisions,
      };
    }
  );
  
  /**
   * GET /metrics/timeline - Decision timeline (hourly buckets)
   */
  server.get('/metrics/timeline', async () => {
    const db = getDb();
    
    const timeline = db.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', created_at) as hour,
        decision,
        COUNT(*) as count
      FROM decisions
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY hour, decision
      ORDER BY hour DESC
    `).all() as any[];
    
    return {
      timeline,
      period: 'last_24h',
      timestamp: new Date().toISOString(),
    };
  });
  
  /**
   * GET /metrics/health - Detailed health check
   */
  server.get('/metrics/health', async () => {
    const db = getDb();
    
    // Check database connectivity
    let dbHealthy = true;
    try {
      db.prepare('SELECT 1').get();
    } catch (error) {
      dbHealthy = false;
    }
    
    // Check for stale events (not processed in 1 hour)
    const staleShopify = db.prepare(`
      SELECT COUNT(*) as count 
      FROM shopify_events 
      WHERE processed = 0 AND created_at < datetime('now', '-1 hour')
    `).get() as any;
    
    const staleStripe = db.prepare(`
      SELECT COUNT(*) as count 
      FROM stripe_events 
      WHERE processed = 0 AND created_at < datetime('now', '-1 hour')
    `).get() as any;
    
    // Check for expired idempotency keys that should be cleaned
    const expiredKeys = db.prepare(`
      SELECT COUNT(*) as count 
      FROM idempotency_keys 
      WHERE expires_at < datetime('now')
    `).get() as any;
    
    const issues = [];
    
    if (!dbHealthy) {
      issues.push({ type: 'database', severity: 'critical', message: 'Database not accessible' });
    }
    
    if (staleShopify.count > 0) {
      issues.push({ 
        type: 'events', 
        severity: 'warning', 
        message: `${staleShopify.count} Shopify events not processed in 1 hour` 
      });
    }
    
    if (staleStripe.count > 0) {
      issues.push({ 
        type: 'events', 
        severity: 'warning', 
        message: `${staleStripe.count} Stripe events not processed in 1 hour` 
      });
    }
    
    if (expiredKeys.count > 100) {
      issues.push({ 
        type: 'cleanup', 
        severity: 'info', 
        message: `${expiredKeys.count} expired idempotency keys should be cleaned` 
      });
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'ok' : 'failed',
        event_processing: staleShopify.count === 0 && staleStripe.count === 0 ? 'ok' : 'degraded',
      },
      issues,
    };
  });
}
