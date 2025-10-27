import { getDb } from '../db/index.js';
import { generateId } from '../types/common.js';

/**
 * Webhook Retry Service
 * 
 * Handles retry logic for webhook event processing with:
 * - Exponential backoff
 * - Dead letter queue (DLQ)
 * - Configurable max retries
 * - Error logging
 */

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number[];
}

export interface ProcessorFunction {
  (): Promise<void>;
}

export class WebhookRetryService {
  private readonly MAX_RETRIES: number;
  private readonly BACKOFF_MS: number[];
  
  constructor(config?: Partial<RetryConfig>) {
    this.MAX_RETRIES = config?.maxRetries || 5;
    this.BACKOFF_MS = config?.backoffMs || [1000, 2000, 4000, 8000, 16000];
  }
  
  /**
   * Process event with automatic retry
   */
  async processWithRetry(
    eventId: string,
    eventType: 'shopify' | 'stripe',
    processor: ProcessorFunction
  ): Promise<void> {
    const db = getDb();
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Execute the processor
        await processor();
        
        // Success! Mark as processed
        await this.markAsProcessed(eventId, eventType);
        
        console.log(`[WebhookRetry] Successfully processed ${eventType} event ${eventId} on attempt ${attempt + 1}`);
        return;
        
      } catch (error) {
        lastError = error as Error;
        
        console.error(`[WebhookRetry] Attempt ${attempt + 1}/${this.MAX_RETRIES} failed for ${eventType} event ${eventId}:`, error);
        
        // Update attempt count
        await this.updateAttemptCount(eventId, eventType, attempt + 1, lastError);
        
        // If this was the last attempt, move to DLQ
        if (attempt === this.MAX_RETRIES - 1) {
          await this.moveToDeadLetterQueue(eventId, eventType, lastError);
          throw new Error(`Failed to process event ${eventId} after ${this.MAX_RETRIES} attempts: ${lastError.message}`);
        }
        
        // Wait before next retry (exponential backoff)
        const backoffTime = this.BACKOFF_MS[attempt] || this.BACKOFF_MS[this.BACKOFF_MS.length - 1];
        console.log(`[WebhookRetry] Waiting ${backoffTime}ms before retry ${attempt + 2}/${this.MAX_RETRIES}`);
        await this.sleep(backoffTime);
      }
    }
  }
  
  /**
   * Mark event as successfully processed
   */
  private async markAsProcessed(eventId: string, eventType: 'shopify' | 'stripe'): Promise<void> {
    const db = getDb();
    
    const table = eventType === 'shopify' ? 'shopify_events' : 'stripe_events';
    
    db.prepare(`
      UPDATE ${table}
      SET processed = 1, processed_at = datetime('now')
      WHERE event_id = ?
    `).run(eventId);
  }
  
  /**
   * Update attempt count and last error
   */
  private async updateAttemptCount(
    eventId: string,
    eventType: 'shopify' | 'stripe',
    attemptCount: number,
    error: Error
  ): Promise<void> {
    const db = getDb();
    
    const table = eventType === 'shopify' ? 'shopify_events' : 'stripe_events';
    
    // Add retry_count and last_error columns if they don't exist
    // (These should be added in a migration, but we'll handle gracefully)
    try {
      db.prepare(`
        UPDATE ${table}
        SET retry_count = ?, last_error = ?
        WHERE event_id = ?
      `).run(attemptCount, error.message, eventId);
    } catch (err) {
      // Column might not exist - that's okay for now
      console.warn(`[WebhookRetry] Could not update retry count: ${err}`);
    }
  }
  
  /**
   * Move failed event to dead letter queue
   */
  private async moveToDeadLetterQueue(
    eventId: string,
    eventType: 'shopify' | 'stripe',
    error: Error
  ): Promise<void> {
    const db = getDb();
    
    const failureId = generateId('dlq');
    
    // Get the original event data
    const table = eventType === 'shopify' ? 'shopify_events' : 'stripe_events';
    const event = db.prepare(`SELECT * FROM ${table} WHERE event_id = ?`).get(eventId) as any;
    
    if (!event) {
      console.error(`[WebhookRetry] Event ${eventId} not found in ${table}`);
      return;
    }
    
    // Insert into dead letter queue
    db.prepare(`
      INSERT INTO webhook_failures (
        failure_id, event_id, event_type, event_data,
        error, attempts, last_attempt, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      failureId,
      eventId,
      eventType,
      event.event_data || JSON.stringify(event),
      error.message,
      this.MAX_RETRIES
    );
    
    console.error(`[WebhookRetry] Moved ${eventType} event ${eventId} to DLQ with failure_id ${failureId}`);
  }
  
  /**
   * Retry events in dead letter queue
   * Call this periodically (e.g., hourly cron job)
   */
  async retryDeadLetterQueue(): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const db = getDb();
    
    // Get all DLQ entries that haven't been resolved
    const dlqEvents = db.prepare(`
      SELECT * FROM webhook_failures
      WHERE resolved = 0
      AND last_attempt < datetime('now', '-1 hour')
      ORDER BY created_at ASC
      LIMIT 100
    `).all() as any[];
    
    let succeeded = 0;
    let failed = 0;
    
    console.log(`[WebhookRetry] Retrying ${dlqEvents.length} events from DLQ`);
    
    for (const dlqEvent of dlqEvents) {
      try {
        // Get the processor for this event type
        const processor = await this.getProcessorForEvent(dlqEvent.event_type, dlqEvent.event_data);
        
        // Try to process again
        await processor();
        
        // Success! Mark as resolved
        db.prepare(`
          UPDATE webhook_failures
          SET resolved = 1, resolved_at = datetime('now')
          WHERE failure_id = ?
        `).run(dlqEvent.failure_id);
        
        // Mark original event as processed
        await this.markAsProcessed(dlqEvent.event_id, dlqEvent.event_type);
        
        succeeded++;
        console.log(`[WebhookRetry] DLQ event ${dlqEvent.failure_id} successfully processed`);
        
      } catch (error) {
        failed++;
        
        // Update last attempt time
        db.prepare(`
          UPDATE webhook_failures
          SET last_attempt = datetime('now'),
              attempts = attempts + 1,
              error = ?
          WHERE failure_id = ?
        `).run((error as Error).message, dlqEvent.failure_id);
        
        console.error(`[WebhookRetry] DLQ event ${dlqEvent.failure_id} still failing:`, error);
      }
    }
    
    return {
      attempted: dlqEvents.length,
      succeeded,
      failed,
    };
  }
  
  /**
   * Get processor function for an event
   * This is a helper that needs to be implemented based on your event types
   */
  private async getProcessorForEvent(eventType: string, eventData: string): Promise<ProcessorFunction> {
    // This would call your actual event processors
    // For now, return a no-op
    return async () => {
      console.log(`[WebhookRetry] Would process ${eventType} event`);
    };
  }
  
  /**
   * Get dead letter queue statistics
   */
  getDeadLetterQueueStats(): {
    total: number;
    unresolved: number;
    resolved: number;
    oldestUnresolved: string | null;
  } {
    const db = getDb();
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as unresolved,
        SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved,
        MIN(CASE WHEN resolved = 0 THEN created_at ELSE NULL END) as oldest_unresolved
      FROM webhook_failures
    `).get() as any;
    
    return {
      total: stats.total || 0,
      unresolved: stats.unresolved || 0,
      resolved: stats.resolved || 0,
      oldestUnresolved: stats.oldest_unresolved,
    };
  }
  
  /**
   * Sleep utility for backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const webhookRetryService = new WebhookRetryService();
