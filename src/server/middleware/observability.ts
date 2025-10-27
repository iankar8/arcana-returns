import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Observability Middleware
 * 
 * Provides metrics, logging, and tracing for production monitoring:
 * - Request/response logging
 * - Performance metrics
 * - Error tracking
 * - Custom events
 */

export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  merchantId?: string;
  traceId?: string;
}

export class ObservabilityService {
  private metrics: RequestMetrics[] = [];
  private readonly MAX_METRICS = 10000;
  
  /**
   * Log request start
   */
  logRequestStart(request: FastifyRequest): void {
    (request as any).startTime = Date.now();
  }
  
  /**
   * Log request end
   */
  logRequestEnd(request: FastifyRequest, reply: FastifyReply): void {
    const startTime = (request as any).startTime || Date.now();
    const duration = Date.now() - startTime;
    
    const metric: RequestMetrics = {
      method: request.method,
      path: this.sanitizePath(request.url),
      statusCode: reply.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      merchantId: (request as any).merchantId,
      traceId: (request as any).trace_id,
    };
    
    this.recordMetric(metric);
    this.logMetric(metric);
  }
  
  /**
   * Get hook for reply
   */
  getReplyHook(request: FastifyRequest, reply: FastifyReply): () => void {
    return () => this.logRequestEnd(request, reply);
  }
  
  /**
   * Record metric for analytics
   */
  private recordMetric(metric: RequestMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }
  
  /**
   * Log metric to console
   */
  private logMetric(metric: RequestMetrics): void {
    const { method, path, statusCode, duration, traceId } = metric;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    console.log(`[${level.toUpperCase()}] ${method} ${path} ${statusCode} ${duration}ms trace_id=${traceId}`);
  }
  
  /**
   * Sanitize path to remove IDs
   */
  private sanitizePath(url: string): string {
    return url.split('?')[0]
      .replace(/\/[a-f0-9-]{20,}/g, '/:id')
      .replace(/\/\d+/g, '/:id');
  }
  
  /**
   * Get metrics summary
   */
  getSummary(): {
    totalRequests: number;
    avgDuration: number;
    errorRate: number;
    requestsByEndpoint: Record<string, number>;
    statusCodeDistribution: Record<number, number>;
  } {
    const total = this.metrics.length;
    const avgDuration = total > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total 
      : 0;
    
    const errors = this.metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = total > 0 ? errors / total : 0;
    
    const byEndpoint: Record<string, number> = {};
    const byStatus: Record<number, number> = {};
    
    for (const metric of this.metrics) {
      byEndpoint[metric.path] = (byEndpoint[metric.path] || 0) + 1;
      byStatus[metric.statusCode] = (byStatus[metric.statusCode] || 0) + 1;
    }
    
    return {
      totalRequests: total,
      avgDuration,
      errorRate,
      requestsByEndpoint: byEndpoint,
      statusCodeDistribution: byStatus,
    };
  }
  
  /**
   * Get slow requests (> 1000ms)
   */
  getSlowRequests(threshold = 1000): RequestMetrics[] {
    return this.metrics
      .filter(m => m.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 100);
  }
}

export const observabilityService = new ObservabilityService();

/**
 * Observability middleware
 */
export async function observabilityMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  observabilityService.logRequestStart(request);
  
  // Log when response is sent
  reply.raw.on('finish', () => {
    observabilityService.logRequestEnd(request, reply);
  });
}
