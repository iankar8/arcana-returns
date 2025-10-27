import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Per-Endpoint Rate Limiting Middleware
 * 
 * Implements rate limiting with per-merchant, per-endpoint granularity:
 * - Different limits for different endpoints
 * - Sliding window algorithm
 * - Rate limit headers in responses
 * - Configurable limits per endpoint
 */

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

export class EndpointRateLimiter {
  private limits: Map<string, RateLimitConfig>;
  private cache: Map<string, RateLimitState>;
  
  constructor() {
    this.limits = new Map();
    this.cache = new Map();
    
    // Default rate limits per endpoint
    this.setEndpointLimit('/returns/token', 100, 60000);        // 100 req/min
    this.setEndpointLimit('/returns/authorize', 50, 60000);     // 50 req/min (more expensive)
    this.setEndpointLimit('/returns/commit', 50, 60000);        // 50 req/min
    this.setEndpointLimit('/webhooks/shopify', 200, 60000);     // 200 req/min
    this.setEndpointLimit('/webhooks/stripe', 200, 60000);      // 200 req/min
    
    // Cleanup cache every 5 minutes
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }
  
  /**
   * Set rate limit for an endpoint
   */
  setEndpointLimit(endpoint: string, maxRequests: number, windowMs: number): void {
    this.limits.set(endpoint, { endpoint, maxRequests, windowMs });
  }
  
  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(
    merchantId: string,
    endpoint: string,
    reply: FastifyReply
  ): Promise<boolean> {
    // Get limit config for this endpoint
    const config = this.limits.get(endpoint);
    if (!config) {
      // No limit configured - allow
      return false;
    }
    
    // Generate cache key
    const cacheKey = `${merchantId}:${endpoint}`;
    
    // Get or create state
    const now = Date.now();
    let state = this.cache.get(cacheKey);
    
    if (!state || now >= state.resetAt) {
      // Create new window
      state = {
        count: 0,
        resetAt: now + config.windowMs,
      };
      this.cache.set(cacheKey, state);
    }
    
    // Increment counter
    state.count++;
    
    // Calculate remaining and reset time
    const remaining = Math.max(0, config.maxRequests - state.count);
    const resetIn = Math.ceil((state.resetAt - now) / 1000);
    
    // Set rate limit headers
    reply.header('X-RateLimit-Limit', config.maxRequests.toString());
    reply.header('X-RateLimit-Remaining', remaining.toString());
    reply.header('X-RateLimit-Reset', resetIn.toString());
    reply.header('X-RateLimit-Window', (config.windowMs / 1000).toString());
    
    // Check if over limit
    if (state.count > config.maxRequests) {
      reply.header('Retry-After', resetIn.toString());
      return true; // Rate limited
    }
    
    return false; // Not rate limited
  }
  
  /**
   * Get current rate limit status for a merchant/endpoint
   */
  getRateLimitStatus(merchantId: string, endpoint: string): {
    limit: number;
    remaining: number;
    resetAt: number;
  } | null {
    const config = this.limits.get(endpoint);
    if (!config) return null;
    
    const cacheKey = `${merchantId}:${endpoint}`;
    const state = this.cache.get(cacheKey);
    
    if (!state) {
      return {
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: Date.now() + config.windowMs,
      };
    }
    
    return {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - state.count),
      resetAt: state.resetAt,
    };
  }
  
  /**
   * Reset rate limit for a merchant/endpoint
   */
  resetRateLimit(merchantId: string, endpoint: string): void {
    const cacheKey = `${merchantId}:${endpoint}`;
    this.cache.delete(cacheKey);
  }
  
  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, state] of this.cache.entries()) {
      if (now >= state.resetAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[RateLimit] Cleaned up ${cleaned} expired cache entries`);
    }
  }
  
  /**
   * Get all configured limits
   */
  getConfiguredLimits(): RateLimitConfig[] {
    return Array.from(this.limits.values());
  }
  
  /**
   * Get statistics for all endpoints
   */
  getStatistics(): {
    endpoint: string;
    limit: number;
    activeKeys: number;
    totalRequests: number;
  }[] {
    const stats = new Map<string, { endpoint: string; limit: number; activeKeys: number; totalRequests: number }>();
    
    // Initialize with all configured endpoints
    for (const [endpoint, config] of this.limits) {
      stats.set(endpoint, {
        endpoint,
        limit: config.maxRequests,
        activeKeys: 0,
        totalRequests: 0,
      });
    }
    
    // Count active keys and requests
    for (const [key, state] of this.cache.entries()) {
      const endpoint = key.split(':').slice(1).join(':');
      const stat = stats.get(endpoint);
      
      if (stat) {
        stat.activeKeys++;
        stat.totalRequests += state.count;
      }
    }
    
    return Array.from(stats.values());
  }
}

// Export singleton
export const endpointRateLimiter = new EndpointRateLimiter();

/**
 * Fastify middleware for per-endpoint rate limiting
 */
export async function endpointRateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip rate limiting for health checks
  if (request.url === '/health') {
    return;
  }
  
  // Get merchant ID from auth middleware
  const merchantId = (request as any).merchantId;
  if (!merchantId) {
    // Not authenticated yet - will be handled by auth middleware
    return;
  }
  
  // Get endpoint path (without query params)
  const endpoint = request.url.split('?')[0];
  
  // Check rate limit
  const isLimited = await endpointRateLimiter.checkRateLimit(merchantId, endpoint, reply);
  
  if (isLimited) {
    reply.code(429).send({
      error: {
        code: 'RATE-001',
        message: 'Rate limit exceeded for this endpoint',
        details: {
          endpoint,
          limit: endpointRateLimiter.getRateLimitStatus(merchantId, endpoint)?.limit,
          retryAfter: reply.getHeader('Retry-After'),
        },
      },
    });
  }
}
