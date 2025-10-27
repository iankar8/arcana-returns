#!/usr/bin/env node

/**
 * Arcana Returns - AEL Replay & Debugging Example
 * 
 * Demonstrates the Audit & Eval Ledger (AEL) features:
 * 1. Make a return decision
 * 2. Retrieve the decision with Bill of Materials (BOM)
 * 3. Generate a replay artifact
 * 4. Compare two decisions (A/B testing)
 * 5. List recent decisions
 * 
 * Prerequisites:
 * - Arcana API server running (npm run dev)
 * - API key created
 * - At least one policy imported
 * 
 * Usage:
 *   ARCANA_API_KEY=sk_test_... node examples/ael-replay-debugging.js
 */

const API_KEY = process.env.ARCANA_API_KEY;
const BASE_URL = process.env.ARCANA_BASE_URL || 'http://localhost:3000';
const POLICY_ID = process.env.POLICY_ID || 'plc_default';

if (!API_KEY) {
  console.error('❌ Error: ARCANA_API_KEY environment variable required');
  console.error('\nUsage:');
  console.error('  ARCANA_API_KEY=sk_test_... node examples/ael-replay-debugging.js');
  process.exit(1);
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  
  console.log(`\n📡 ${method} ${endpoint}`);
  
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
      `Trace ID: ${error.trace_id || 'N/A'}`
    );
  }
  
  console.log(`   ✅ Success (${response.status})`);
  return data;
}

async function main() {
  console.log('🚀 Arcana Returns - AEL Replay & Debugging Demo');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Policy ID: ${POLICY_ID}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Create a Return Decision
    console.log('\n📝 STEP 1: Creating Return Decision');
    console.log('-'.repeat(60));
    console.log('Making a return request to generate an AEL decision...');
    
    // Issue token
    const tokenResponse = await apiRequest('/returns/token', 'POST', {
      order_id: `ord_ael_demo_${Date.now()}`,
      customer_ref: 'cust_ael_test',
      items: [
        { sku: 'LAPTOP-15-SILVER', qty: 1, price_cents: 89999, name: 'Laptop 15" Silver' }
      ],
      reason_code: 'not_as_described',
      device_fingerprint: 'fp_ael_demo',
      policy_id: POLICY_ID,
    });
    
    const returnToken = tokenResponse.return_token;
    const traceId = tokenResponse.trace_id;
    
    console.log(`   • Token issued (trace: ${traceId})`);
    console.log(`   • Risk score: ${tokenResponse.risk_score}`);
    
    // Authorize (this creates the AEL decision)
    const authResponse = await apiRequest('/returns/authorize', 'POST', {
      return_token: returnToken,
      evidence: [
        { type: 'photo_packaging', url: 'https://example.com/ael-demo-pkg.jpg' },
        { type: 'receipt', url: 'https://example.com/ael-demo-receipt.pdf' }
      ],
      dropoff_choice: 'mail_in',
    });
    
    const decisionId = authResponse.audit_ref;
    
    console.log('\n   📊 Decision Made:');
    console.log(`   • Decision: ${authResponse.decision.toUpperCase()}`);
    console.log(`   • Audit Ref (Decision ID): ${decisionId}`);
    console.log(`   • Explanations: ${authResponse.explanations.join(', ')}`);
    
    await sleep(500);
    
    // Step 2: Retrieve Decision with BOM
    console.log('\n🔍 STEP 2: Retrieving Decision with Bill of Materials');
    console.log('-'.repeat(60));
    
    const decisionData = await apiRequest(`/ael/decision/${decisionId}`, 'GET');
    
    console.log('\n   📊 Decision Details:');
    console.log(`   • Decision ID: ${decisionData.decision.decision_id}`);
    console.log(`   • Trace ID: ${decisionData.decision.trace_id}`);
    console.log(`   • Timestamp: ${new Date(decisionData.decision.ts).toLocaleString()}`);
    console.log(`   • Merchant: ${decisionData.decision.merchant_id}`);
    console.log(`   • Return Token JTI: ${decisionData.decision.return_token_jti}`);
    console.log(`   • Decision: ${decisionData.decision.output.decision}`);
    console.log(`   • Risk Score: ${decisionData.decision.output.risk_score}`);
    
    console.log('\n   🧾 Bill of Materials (BOM):');
    console.log(`   • Policy Hash: ${decisionData.bom.policy_snapshot_hash.substring(0, 40)}...`);
    console.log(`   • Code Version: ${decisionData.bom.code_version || 'N/A'}`);
    
    if (decisionData.bom.model_ref) {
      console.log(`   • Model: ${decisionData.bom.model_ref}`);
    }
    
    if (decisionData.bom.tool_refs && decisionData.bom.tool_refs.length > 0) {
      console.log(`   • Tools: ${decisionData.bom.tool_refs.join(', ')}`);
    }
    
    console.log('\n   💡 Why BOM Matters:');
    console.log('   • Enables exact decision replay');
    console.log('   • Tracks which policy version was used');
    console.log('   • Records all dependencies (model, tools, code)');
    console.log('   • Essential for compliance and debugging');
    
    await sleep(500);
    
    // Step 3: Generate Replay Artifact
    console.log('\n🔄 STEP 3: Generating Replay Artifact');
    console.log('-'.repeat(60));
    
    const replayResponse = await apiRequest(`/ael/replay/${decisionId}`, 'POST');
    
    console.log('\n   📦 Replay Artifact Created:');
    console.log(`   • Replay ID: ${replayResponse.replay_id}`);
    console.log(`   • Status: ${replayResponse.status}`);
    
    const replayId = replayResponse.replay_id;
    
    await sleep(500);
    
    // Retrieve replay artifact
    const replayArtifact = await apiRequest(`/ael/replay/${replayId}`, 'GET');
    
    console.log('\n   📊 Replay Artifact Details:');
    console.log(`   • Replay ID: ${replayArtifact.replay_id}`);
    console.log(`   • Decision ID: ${replayArtifact.decision_id}`);
    console.log(`   • Created: ${new Date(replayArtifact.created_at).toLocaleString()}`);
    
    console.log('\n   🔒 Environment Lock:');
    console.log(`   • Policy Hash: ${replayArtifact.env_lock.policy_snapshot_hash.substring(0, 40)}...`);
    
    if (replayArtifact.env_lock.tools_versions) {
      const tools = Object.keys(replayArtifact.env_lock.tools_versions);
      console.log(`   • Locked Tools: ${tools.length} tool(s)`);
    }
    
    console.log('\n   💡 Replay Use Cases:');
    console.log('   • Time-travel debugging (reproduce exact decision)');
    console.log('   • A/B testing (compare old vs new logic)');
    console.log('   • Compliance audits (prove decision was correct)');
    console.log('   • Model evaluation (test new models on historical data)');
    
    await sleep(500);
    
    // Step 4: List Recent Decisions
    console.log('\n📋 STEP 4: Listing Recent Decisions');
    console.log('-'.repeat(60));
    
    const decisionsList = await apiRequest('/ael/decisions?limit=5', 'GET');
    
    console.log(`\n   📊 Found ${decisionsList.decisions.length} recent decision(s):\n`);
    
    decisionsList.decisions.forEach((dec, index) => {
      console.log(`   ${index + 1}. ${dec.decision_id}`);
      console.log(`      Decision: ${dec.output.decision}`);
      console.log(`      Risk: ${dec.output.risk_score.toFixed(2)}`);
      console.log(`      Time: ${new Date(dec.ts).toLocaleString()}`);
      console.log('');
    });
    
    // Step 5: Compare Decisions (if we have multiple)
    if (decisionsList.decisions.length >= 2) {
      console.log('\n🔍 STEP 5: Comparing Two Decisions');
      console.log('-'.repeat(60));
      
      const baseline = decisionsList.decisions[0].decision_id;
      const candidate = decisionsList.decisions[1].decision_id;
      
      const diffReport = await apiRequest(
        `/ael/diff?baseline=${baseline}&candidate=${candidate}`,
        'GET'
      );
      
      console.log('\n   📊 Decision Comparison:');
      console.log(`   • Baseline: ${diffReport.baseline_decision_id}`);
      console.log(`   • Candidate: ${diffReport.candidate_decision_id}`);
      
      console.log('\n   🏛️ Environment Comparison:');
      console.log(`   • Baseline Policy: ${diffReport.baseline_env.policy_hash.substring(0, 30)}...`);
      console.log(`   • Candidate Policy: ${diffReport.candidate_env.policy_hash.substring(0, 30)}...`);
      console.log(`   • Same Policy: ${diffReport.baseline_env.policy_hash === diffReport.candidate_env.policy_hash ? '✅ Yes' : '⚠️  No'}`);
      
      console.log('\n   ⚖️  Decision Comparison:');
      console.log(`   • Baseline: ${diffReport.changes.decision_delta.baseline}`);
      console.log(`   • Candidate: ${diffReport.changes.decision_delta.candidate}`);
      console.log(`   • Changed: ${diffReport.changes.decision_delta.changed ? '⚠️  Yes' : '✅ No (consistent)'}`);
      
      if (diffReport.changes.rationale_delta.length > 0) {
        console.log('\n   📋 Rationale Differences:');
        diffReport.changes.rationale_delta.forEach((delta, index) => {
          console.log(`\n   ${index + 1}. ${delta.field}`);
          console.log(`      Baseline: ${JSON.stringify(delta.baseline_value)}`);
          console.log(`      Candidate: ${JSON.stringify(delta.candidate_value)}`);
        });
      }
      
      if (diffReport.summary) {
        console.log('\n   💬 Summary:');
        console.log(`   ${diffReport.summary}`);
      }
      
      console.log('\n   💡 Why Compare Decisions?');
      console.log('   • A/B test policy changes');
      console.log('   • Detect regressions in decision logic');
      console.log('   • Validate model updates');
      console.log('   • Analyze decision consistency');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 AEL REPLAY & DEBUGGING COMPLETED!');
    console.log('='.repeat(60));
    console.log('\nWhat We Demonstrated:');
    console.log('  1. ✅ Created a return decision (logged to AEL)');
    console.log('  2. ✅ Retrieved decision with full BOM');
    console.log('  3. ✅ Generated replay artifact');
    console.log('  4. ✅ Listed recent decisions');
    if (decisionsList.decisions.length >= 2) {
      console.log('  5. ✅ Compared two decisions');
    }
    
    console.log('\nKey AEL Features:');
    console.log('  • 📜 Append-only ledger (immutable audit trail)');
    console.log('  • 🔄 Time-travel replay (reproduce exact decisions)');
    console.log('  • 🧾 Bill of Materials (track all dependencies)');
    console.log('  • ⚖️  Decision comparison (A/B testing)');
    console.log('  • 🔍 Full traceability (compliance ready)');
    
    console.log('\nPractical Use Cases:');
    console.log('  • Debugging why a return was approved/denied');
    console.log('  • Testing policy changes before deployment');
    console.log('  • Compliance audits and reporting');
    console.log('  • Model evaluation and improvement');
    console.log('  • Investigating customer disputes');
    
    console.log('\nNext Steps:');
    console.log(`  • Export replay: GET /ael/replay/${replayId}`);
    console.log('  • Analyze decision patterns over time');
    console.log('  • Set up alerts for decision anomalies');
    console.log('  • Use diffs for policy impact analysis');
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error(error.message);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(error => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});
