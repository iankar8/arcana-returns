import { Command } from 'commander';
import { ReturnsService } from '../../services/returns.js';
import { TokenRequest } from '../../types/returns.js';

const returnsService = new ReturnsService();

export const returnsCommand = new Command('returns')
  .description('Returns simulation and testing');

returnsCommand
  .command('simulate')
  .description('Simulate a return decision')
  .requiredOption('--order <orderId>', 'Order ID')
  .requiredOption('--sku <sku>', 'SKU to return')
  .requiredOption('--reason <reason>', 'Return reason code')
  .option('--customer <customerId>', 'Customer reference', 'cust_test')
  .option('--merchant <merchantId>', 'Merchant ID', 'merchant_test')
  .option('--policy <policyId>', 'Policy ID', 'plc_default')
  .option('--price <cents>', 'Item price in cents', '5000')
  .option('--qty <quantity>', 'Quantity', '1')
  .action(async (options) => {
    try {
      const request: TokenRequest = {
        order_id: options.order,
        customer_ref: options.customer,
        items: [{
          sku: options.sku,
          qty: parseInt(options.qty),
          price_cents: parseInt(options.price),
        }],
        reason_code: options.reason,
        policy_id: options.policy,
      };
      
      const result = await returnsService.issueToken(request, options.merchant);
      
      console.log('\n✓ Return Token Issued\n');
      console.log('Token:', result.return_token.substring(0, 50) + '...');
      console.log('Trace ID:', result.trace_id);
      console.log('Risk Score:', result.risk_score.toFixed(2));
      console.log('Required Evidence:', result.required_evidence.join(', '));
      console.log('Policy Hash:', result.policy_snapshot_hash.substring(0, 20) + '...');
      console.log('Expires:', result.expires_at);
      console.log();
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

returnsCommand
  .command('list')
  .description('List recent return decisions')
  .option('--merchant <merchantId>', 'Merchant ID', 'merchant_test')
  .option('--limit <number>', 'Number of results', '10')
  .action(async (options) => {
    try {
      const { AELService } = await import('../../services/ael.js');
      const aelService = new AELService();
      
      const decisions = aelService.listDecisions(options.merchant, parseInt(options.limit));
      
      console.log(`\n${decisions.length} Recent Decisions:\n`);
      for (const decision of decisions) {
        console.log(`${decision.decision_id} | ${decision.output.decision.toUpperCase()} | Risk: ${decision.output.risk_score.toFixed(2)} | ${decision.created_at}`);
      }
      console.log();
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });
