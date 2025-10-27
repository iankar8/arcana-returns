#!/usr/bin/env node

/**
 * Arcana Returns - Complete Return Flow Example
 * 
 * Demonstrates the full 3-step returns process:
 * 1. Issue Return Token
 * 2. Authorize with Evidence
 * 3. Commit Return
 * 
 * Prerequisites:
 * - Arcana API server running (npm run dev)
 * - API key created (npm run cli -- keys create --merchant merchant_test --name "Test Key")
 * - At least one policy imported
 * 
 * Usage:
 *   ARCANA_API_KEY=sk_test_... node examples/complete-return-flow.js
 * 
 * Advanced:
 *   ARCANA_API_KEY=sk_test_... \
 *   ARCANA_BASE_URL=https://api.arcana.returns \
 *   POLICY_ID=plc_your_policy \
 *   node examples/complete-return-flow.js
 */

// Configuration from environment
const API_KEY = process.env.ARCANA_API_KEY;
const BASE_URL = process.env.ARCANA_BASE_URL || 'http://localhost:3000';
const POLICY_ID = process.env.POLICY_ID || 'plc_default';

// Validate configuration
if (!API_KEY) {
  console.error('❌ Error: ARCANA_API_KEY environment variable required');
  console.error('\nUsage:');
  console.error('  ARCANA_API_KEY=sk_test_... node examples/complete-return-flow.js');
  console.error('\nCreate an API key:');
  console.error('  npm run cli -- keys create --merchant merchant_test --name "Test Key"');
  process.exit(1);
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint path (e.g., '/returns/token')
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {object|null} body - Request body (will be JSON stringified)
 * @returns {Promise<object>} Response data
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  
  console.log(`\n📡 ${method} ${endpoint}`);
  if (body) {
    console.log('   Request:', JSON.stringify(body, null, 2).split('\n').map(line => `   ${line}`).join('\n').trim());
  }
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = data.error || {};
    throw new Error(
      `API Error: ${error.code || 'UNKNOWN'} - ${error.message || 'Unknown error'}\n` +
      `Trace ID: ${error.trace_id || 'N/A'}\n` +
      `Status: ${response.status}`
    );
  }
  
  console.log(`   ✅ Success (${response.status})`);
  return data;
}

/**
 * Main flow demonstration
 */
async function main() {
  console.log('🚀 Arcana Returns - Complete Return Flow Demo');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Policy ID: ${POLICY_ID}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Issue Return Token
    console.log('\n📝 STEP 1: Issuing Return Token');
    console.log('-'.repeat(60));
    
    const tokenRequest = {
      order_id: `ord_example_${Date.now()}`,
      customer_ref: 'cust_demo_user_123',
      items: [
        {
          sku: 'SHIRT-M-BLUE',
          qty: 1,
          price_cents: 2999,
          name: 'Blue Cotton Shirt - Medium'
        },
        {
          sku: 'JEANS-32-INDIGO',
          qty: 1,
          price_cents: 4999,
          name: 'Indigo Denim Jeans - 32'
        }
      ],
      reason_code: 'doesnt_fit',
      device_fingerprint: 'fp_demo_browser_abc123',
      policy_id: POLICY_ID,
    };
    
    const tokenResponse = await apiRequest('/returns/token', 'POST', tokenRequest);
    
    console.log('\n   📊 Token Details:');
    console.log(`   • Risk Score: ${tokenResponse.risk_score} (${getRiskLevel(tokenResponse.risk_score)})`);
    console.log(`   • Required Evidence: ${tokenResponse.required_evidence.join(', ')}`);
    console.log(`   • Policy Hash: ${tokenResponse.policy_snapshot_hash.substring(0, 20)}...`);
    console.log(`   • Trace ID: ${tokenResponse.trace_id}`);
    console.log(`   • Expires: ${new Date(tokenResponse.expires_at).toLocaleString()}`);
    console.log(`   • Token (preview): ${tokenResponse.return_token.substring(0, 30)}...`);
    
    const returnToken = tokenResponse.return_token;
    const traceId = tokenResponse.trace_id;
    
    // Small delay to simulate customer uploading evidence
    console.log('\n   ⏳ Simulating customer evidence upload...');
    await sleep(1000);
    
    // Step 2: Authorize Return
    console.log('\n🔍 STEP 2: Authorizing Return with Evidence');
    console.log('-'.repeat(60));
    
    const authorizeRequest = {
      return_token: returnToken,
      evidence: [
        {
          type: 'photo_packaging',
          url: 'https://example.com/evidence/packaging_photo.jpg',
          uploaded_at: new Date().toISOString()
        }
      ],
      dropoff_choice: 'mail_in'
    };
    
    const authResponse = await apiRequest('/returns/authorize', 'POST', authorizeRequest);
    
    console.log('\n   📊 Authorization Result:');
    console.log(`   • Decision: ${getDecisionEmoji(authResponse.decision)} ${authResponse.decision.toUpperCase()}`);
    console.log(`   • Restocking Fee: ${authResponse.conditions.restock_pct}%`);
    console.log(`   • Return Window: ${authResponse.conditions.window} days remaining`);
    console.log(`   • Label Credential: ${authResponse.label_credential || 'N/A'}`);
    console.log(`   • Audit Reference: ${authResponse.audit_ref}`);
    console.log('\n   💬 Explanations:');
    authResponse.explanations.forEach(exp => console.log(`      - ${exp}`));
    
    if (authResponse.decision === 'step_up') {
      console.log('\n   ⚠️  Additional Evidence Required:');
      authResponse.step_up_requirements.forEach(req => console.log(`      - ${req}`));
      console.log('\n   ⚠️  Cannot proceed to commit. Additional evidence needed.');
      return;
    }
    
    if (authResponse.decision === 'deny') {
      console.log('\n   ❌ Return denied. Cannot proceed to commit.');
      return;
    }
    
    // Small delay to simulate package shipping
    console.log('\n   ⏳ Simulating package shipment...');
    await sleep(1000);
    
    // Step 3: Commit Return
    console.log('\n✅ STEP 3: Committing Return');
    console.log('-'.repeat(60));
    
    const commitRequest = {
      return_token: returnToken,
      receipt_event: {
        type: 'scan',
        carrier: 'UPS',
        ts: new Date().toISOString(),
        tracking_number: '1Z999AA10123456784'
      }
    };
    
    const commitResponse = await apiRequest('/returns/commit', 'POST', commitRequest);
    
    console.log('\n   📊 Commit Result:');
    console.log(`   • Refund Instruction: ${getRefundEmoji(commitResponse.refund_instruction)} ${commitResponse.refund_instruction.toUpperCase()}`);
    console.log(`   • Receipt ID: ${commitResponse.final_receipt.id}`);
    
    if (commitResponse.final_receipt.refund_amount_cents) {
      const refundAmount = (commitResponse.final_receipt.refund_amount_cents / 100).toFixed(2);
      console.log(`   • Refund Amount: $${refundAmount}`);
    }
    
    if (commitResponse.final_receipt.refund_method) {
      console.log(`   • Refund Method: ${commitResponse.final_receipt.refund_method}`);
    }
    
    console.log(`   • Final Audit Ref: ${commitResponse.audit_ref}`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 RETURN FLOW COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nFlow Summary:');
    console.log(`  1. ✅ Token issued (trace: ${traceId})`);
    console.log(`  2. ✅ Return authorized (decision: ${authResponse.decision})`);
    console.log(`  3. ✅ Return committed (refund: ${commitResponse.refund_instruction})`);
    console.log('\nAudit Trail:');
    console.log(`  • Authorization Decision: ${authResponse.audit_ref}`);
    console.log(`  • Final Commit: ${commitResponse.audit_ref}`);
    console.log('\nNext Steps:');
    console.log('  • View decision in AEL: GET /ael/decision/' + authResponse.audit_ref);
    console.log('  • Generate replay: POST /ael/replay/' + authResponse.audit_ref);
    console.log('  • Issue refund in your payment system');
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Helper functions
 */

function getRiskLevel(score) {
  if (score < 0.3) return '🟢 Low Risk';
  if (score < 0.7) return '🟡 Medium Risk';
  return '🔴 High Risk';
}

function getDecisionEmoji(decision) {
  const map = {
    approve: '✅',
    step_up: '⚠️',
    deny: '❌'
  };
  return map[decision] || '❓';
}

function getRefundEmoji(instruction) {
  const map = {
    instant: '⚡',
    hold: '⏸️',
    partial: '📊',
    deny: '❌'
  };
  return map[instruction] || '❓';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the example
main().catch(error => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});
