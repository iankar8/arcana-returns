import { Command } from 'commander';
import { getBackgroundProcessor } from '../../services/background-processor.js';

export const processCommand = new Command('process')
  .description('Process pending webhook events');

processCommand
  .command('events')
  .description('Process all pending Shopify and Stripe events')
  .action(async () => {
    try {
      console.log('Processing pending events...\n');
      
      const processor = getBackgroundProcessor();
      const result = await processor.processOnce();
      
      console.log(`✓ Processed ${result.shopify} Shopify events`);
      console.log(`✓ Processed ${result.stripe} Stripe events`);
      console.log();
      
      if (result.shopify === 0 && result.stripe === 0) {
        console.log('No pending events to process.');
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });
