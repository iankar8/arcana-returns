#!/usr/bin/env node

/**
 * Arcana Returns - Policy Management Example
 * 
 * Demonstrates policy import, retrieval, and versioning:
 * 1. Import a policy from text
 * 2. Retrieve the policy
 * 3. Import an updated version
 * 4. Compare policy versions (diff)
 * 
 * Prerequisites:
 * - Arcana API server running (npm run dev)
 * - API key created (npm run cli -- keys create --merchant merchant_test --name "Test Key")
 * 
 * Usage:
 *   ARCANA_API_KEY=sk_test_... node examples/policy-management.js
 */

const API_KEY = process.env.ARCANA_API_KEY;
const BASE_URL = process.env.ARCANA_BASE_URL || 'http://localhost:3000';
const MERCHANT_ID = process.env.MERCHANT_ID || 'merchant_test';

if (!API_KEY) {
  console.error('❌ Error: ARCANA_API_KEY environment variable required');
  console.error('\nUsage:');
  console.error('  ARCANA_API_KEY=sk_test_... node examples/policy-management.js');
  process.exit(1);
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  
  console.log(`\n📡 ${method} ${endpoint}`);
  if (body && method !== 'GET') {
    console.log('   Request:', JSON.stringify(body, null, 2).split('\n').slice(0, 10).map(line => `   ${line}`).join('\n').trim());
    if (JSON.stringify(body, null, 2).split('\n').length > 10) {
      console.log('   ... (truncated)');
    }
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

async function main() {
  console.log('🚀 Arcana Returns - Policy Management Demo');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Merchant: ${MERCHANT_ID}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Import Initial Policy
    console.log('\n📝 STEP 1: Importing Initial Policy (v1)');
    console.log('-'.repeat(60));
    
    const initialPolicy = {
      source_type: 'text',
      source_content: `
        Return Policy - Version 1.0
        
        Returns accepted within 30 days of purchase.
        Items must be in original packaging with tags attached.
        Restocking fee: 0% for all items.
        
        Accepted return methods:
        - Mail-in returns (prepaid label provided)
        - Drop-off at carrier locations
        
        Evidence required:
        - Photo of packaging for items over $50
        
        Exclusions:
        - Gift cards
        - Personalized items
        - Final sale items
      `.trim(),
      merchant_id: MERCHANT_ID,
      effective_at: new Date().toISOString(),
    };
    
    const importResponse1 = await apiRequest('/policy/import', 'POST', initialPolicy);
    
    console.log('\n   📊 Import Result:');
    console.log(`   • Policy ID: ${importResponse1.policy_id}`);
    console.log(`   • Snapshot ID: ${importResponse1.snapshot_id}`);
    console.log(`   • Hash: ${importResponse1.policy_snapshot_hash.substring(0, 30)}...`);
    console.log(`   • Requires Review: ${importResponse1.requires_review ? '⚠️  Yes' : '✅ No'}`);
    
    if (importResponse1.extracted_fields) {
      console.log('\n   📋 Extracted Fields:');
      if (importResponse1.extracted_fields.return_window_days) {
        console.log(`   • Return Window: ${importResponse1.extracted_fields.return_window_days} days`);
      }
      if (importResponse1.extracted_fields.restock_fee_pct !== undefined) {
        console.log(`   • Restocking Fee: ${importResponse1.extracted_fields.restock_fee_pct}%`);
      }
      if (importResponse1.extracted_fields.allowed_channels) {
        console.log(`   • Channels: ${importResponse1.extracted_fields.allowed_channels.join(', ')}`);
      }
    }
    
    const policyId = importResponse1.policy_id;
    const snapshot1 = importResponse1.snapshot_id;
    
    await sleep(500);
    
    // Step 2: Retrieve the Policy
    console.log('\n🔍 STEP 2: Retrieving Policy');
    console.log('-'.repeat(60));
    
    const policy = await apiRequest(`/policy/${policyId}`, 'GET');
    
    console.log('\n   📊 Policy Details:');
    console.log(`   • Policy ID: ${policy.policy_id}`);
    console.log(`   • Snapshot ID: ${policy.snapshot_id}`);
    console.log(`   • Effective At: ${new Date(policy.effective_at).toLocaleString()}`);
    console.log(`   • Return Window: ${policy.return_window_days} days`);
    console.log(`   • Restocking Fee: ${policy.restock_fee_pct}%`);
    console.log(`   • Allowed Channels: ${policy.allowed_channels.join(', ')}`);
    
    if (policy.evidence && policy.evidence.length > 0) {
      console.log(`   • Evidence Required: ${policy.evidence.join(', ')}`);
    }
    
    if (policy.exclusions && policy.exclusions.length > 0) {
      console.log(`   • Exclusions: ${policy.exclusions.join(', ')}`);
    }
    
    if (policy.item_classes && policy.item_classes.length > 0) {
      console.log(`   • Item Classes: ${policy.item_classes.length} defined`);
    }
    
    await sleep(500);
    
    // Step 3: Import Updated Policy
    console.log('\n📝 STEP 3: Importing Updated Policy (v2)');
    console.log('-'.repeat(60));
    
    const updatedPolicy = {
      source_type: 'text',
      source_content: `
        Return Policy - Version 2.0
        
        Returns accepted within 45 days of purchase.
        Items must be in original packaging with tags attached.
        Restocking fee: 10% for electronics, 0% for other items.
        
        Accepted return methods:
        - Mail-in returns (prepaid label provided)
        - Drop-off at carrier locations
        - In-store returns (select locations)
        
        Evidence required:
        - Photo of packaging for items over $50
        - Receipt for all returns
        
        Exclusions:
        - Gift cards
        - Personalized items
        - Final sale items
        - Opened software
      `.trim(),
      merchant_id: MERCHANT_ID,
      effective_at: new Date(Date.now() + 86400000).toISOString(), // Effective tomorrow
    };
    
    const importResponse2 = await apiRequest('/policy/import', 'POST', updatedPolicy);
    
    console.log('\n   📊 Import Result:');
    console.log(`   • Policy ID: ${importResponse2.policy_id} ${importResponse2.policy_id === policyId ? '(same)' : '(new)'}`);
    console.log(`   • Snapshot ID: ${importResponse2.snapshot_id}`);
    console.log(`   • Hash: ${importResponse2.policy_snapshot_hash.substring(0, 30)}...`);
    console.log(`   • Version Change: v1 → v2`);
    
    const snapshot2 = importResponse2.snapshot_id;
    
    await sleep(500);
    
    // Step 4: Compare Policy Versions
    console.log('\n🔍 STEP 4: Comparing Policy Versions');
    console.log('-'.repeat(60));
    
    const diff = await apiRequest(
      `/policy/${policyId}/diff?from=${snapshot1}&to=${snapshot2}`,
      'GET'
    );
    
    console.log('\n   📊 Policy Diff:');
    console.log(`   • From: ${diff.from_snapshot_id}`);
    console.log(`   • To: ${diff.to_snapshot_id}`);
    console.log(`   • Changes: ${diff.changes.length} field(s) modified`);
    
    if (diff.changes.length > 0) {
      console.log('\n   📋 Detailed Changes:');
      diff.changes.forEach((change, index) => {
        console.log(`\n   ${index + 1}. ${change.field} (${change.change_type})`);
        if (change.change_type === 'modified') {
          console.log(`      Old: ${JSON.stringify(change.old_value)}`);
          console.log(`      New: ${JSON.stringify(change.new_value)}`);
        } else if (change.change_type === 'added') {
          console.log(`      Value: ${JSON.stringify(change.new_value)}`);
        } else if (change.change_type === 'removed') {
          console.log(`      Value: ${JSON.stringify(change.old_value)}`);
        }
      });
    }
    
    if (diff.summary) {
      console.log('\n   💬 Summary:');
      console.log(`   ${diff.summary}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 POLICY MANAGEMENT COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nWhat We Did:');
    console.log('  1. ✅ Imported initial policy (v1)');
    console.log('  2. ✅ Retrieved policy details');
    console.log('  3. ✅ Imported updated policy (v2)');
    console.log('  4. ✅ Compared versions and saw changes');
    console.log('\nKey Insights:');
    console.log('  • Policies are versioned automatically');
    console.log('  • Each version has a unique snapshot hash');
    console.log('  • Changes are tracked for audit/compliance');
    console.log('  • Return tokens bind to specific policy versions');
    console.log('\nNext Steps:');
    console.log(`  • Use policy ID "${policyId}" in returns`);
    console.log('  • Monitor policy changes over time');
    console.log('  • Set up alerts for policy updates');
    
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
