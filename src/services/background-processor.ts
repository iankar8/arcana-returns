import { ShopifyProcessor } from './shopify-processor.js';
import { StripeProcessor } from './stripe-processor.js';

/**
 * Background Job Processor
 * Runs async event processing for Shopify and Stripe webhooks
 */

export class BackgroundProcessor {
  private shopifyProcessor: ShopifyProcessor;
  private stripeProcessor: StripeProcessor;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  
  constructor() {
    this.shopifyProcessor = new ShopifyProcessor();
    this.stripeProcessor = new StripeProcessor();
  }
  
  /**
   * Start the background processor
   */
  start(intervalMs: number = 10000): void {
    if (this.isRunning) {
      console.log('Background processor already running');
      return;
    }
    
    this.isRunning = true;
    console.log(`Starting background processor (interval: ${intervalMs}ms)`);
    
    // Run immediately
    this.processEvents();
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      this.processEvents();
    }, intervalMs);
  }
  
  /**
   * Stop the background processor
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    console.log('Stopping background processor');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }
  
  /**
   * Process pending events from both Shopify and Stripe
   */
  private async processEvents(): Promise<void> {
    try {
      const shopifyCount = await this.shopifyProcessor.processPendingEvents();
      const stripeCount = await this.stripeProcessor.processPendingEvents();
      
      if (shopifyCount > 0 || stripeCount > 0) {
        console.log(`Processed ${shopifyCount} Shopify events, ${stripeCount} Stripe events`);
      }
    } catch (error: any) {
      console.error('Error in background processor:', error.message);
    }
  }
  
  /**
   * Process events once (for manual triggering)
   */
  async processOnce(): Promise<{ shopify: number; stripe: number }> {
    const shopifyCount = await this.shopifyProcessor.processPendingEvents();
    const stripeCount = await this.stripeProcessor.processPendingEvents();
    
    return {
      shopify: shopifyCount,
      stripe: stripeCount,
    };
  }
}

// Singleton instance
let processorInstance: BackgroundProcessor | null = null;

export function getBackgroundProcessor(): BackgroundProcessor {
  if (!processorInstance) {
    processorInstance = new BackgroundProcessor();
  }
  return processorInstance;
}
