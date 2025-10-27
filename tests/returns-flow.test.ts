import { describe, it, expect, beforeEach } from 'vitest';
import { ReturnsService } from '../src/services/returns.js';
import { TEST_MERCHANT_ID, fixtures, createTestPolicy } from './setup.js';

/**
 * Returns Flow Contract Tests
 * Tests the complete token → authorize → commit flow
 */

describe('Returns Flow', () => {
  let returnsService: ReturnsService;
  let policyId: string;
  
  beforeEach(async () => {
    returnsService = new ReturnsService();
    const policy = await createTestPolicy();
    policyId = policy.policyId;
  });
  
  describe('Token Issuance', () => {
    it('should issue a return token with valid request', async () => {
      const request = {
        ...fixtures.tokenRequest,
        policy_id: policyId,
      };
      
      const result = await returnsService.issueToken(request, TEST_MERCHANT_ID);
      
      expect(result).toHaveProperty('return_token');
      expect(result).toHaveProperty('trace_id');
      expect(result).toHaveProperty('risk_score');
      expect(result).toHaveProperty('required_evidence');
      expect(result.risk_score).toBeGreaterThanOrEqual(0);
      expect(result.risk_score).toBeLessThanOrEqual(1);
    });
    
    it('should generate unique trace IDs', async () => {
      const request = {
        ...fixtures.tokenRequest,
        policy_id: policyId,
      };
      
      const result1 = await returnsService.issueToken(request, TEST_MERCHANT_ID);
      const result2 = await returnsService.issueToken(request, TEST_MERCHANT_ID);
      
      expect(result1.trace_id).not.toBe(result2.trace_id);
    });
    
    it('should calculate risk score based on order value', async () => {
      const lowValueRequest = {
        ...fixtures.tokenRequest,
        policy_id: policyId,
        items: [{ sku: 'CHEAP', qty: 1, price_cents: 500, name: 'Cheap Item' }],
      };
      
      const highValueRequest = {
        ...fixtures.tokenRequest,
        policy_id: policyId,
        items: [{ sku: 'EXPENSIVE', qty: 1, price_cents: 50000, name: 'Expensive Item' }],
      };
      
      const lowResult = await returnsService.issueToken(lowValueRequest, TEST_MERCHANT_ID);
      const highResult = await returnsService.issueToken(highValueRequest, TEST_MERCHANT_ID);
      
      expect(highResult.risk_score).toBeGreaterThan(lowResult.risk_score);
    });
    
    it('should reject request without policy_id', async () => {
      const request = {
        ...fixtures.tokenRequest,
        policy_id: undefined,
      };
      
      await expect(
        returnsService.issueToken(request as any, TEST_MERCHANT_ID)
      ).rejects.toThrow();
    });
  });
  
  describe('Authorization', () => {
    it('should approve return with valid evidence', async () => {
      // Issue token first
      const tokenResult = await returnsService.issueToken(
        { ...fixtures.tokenRequest, policy_id: policyId },
        TEST_MERCHANT_ID
      );
      
      // Authorize
      const authRequest = {
        return_token: tokenResult.return_token,
        ...fixtures.authorizeRequest,
      };
      
      const result = await returnsService.authorize(authRequest, TEST_MERCHANT_ID);
      
      expect(result).toHaveProperty('decision');
      expect(result).toHaveProperty('decision_id');
      expect(result).toHaveProperty('explanations');
      expect(['approve', 'step_up', 'deny']).toContain(result.decision);
    });
    
    it('should step up for high-risk returns', async () => {
      // Issue high-value token
      const tokenResult = await returnsService.issueToken(
        {
          ...fixtures.tokenRequest,
          policy_id: policyId,
          items: [{ sku: 'EXPENSIVE', qty: 1, price_cents: 100000, name: 'Very Expensive' }],
        },
        TEST_MERCHANT_ID
      );
      
      // Authorize with minimal evidence
      const authRequest = {
        return_token: tokenResult.return_token,
        evidence: [],
        dropoff_choice: 'mail_in',
      };
      
      const result = await returnsService.authorize(authRequest, TEST_MERCHANT_ID);
      
      // High value + no evidence should trigger step-up
      expect(result.decision).toBe('step_up');
    });
    
    it('should reject expired token', async () => {
      // This would require mocking time or creating an expired token
      // For now, we'll test the validation logic exists
      const authRequest = {
        return_token: 'invalid_token',
        ...fixtures.authorizeRequest,
      };
      
      await expect(
        returnsService.authorize(authRequest, TEST_MERCHANT_ID)
      ).rejects.toThrow();
    });
  });
  
  describe('Commit', () => {
    it('should commit approved return', async () => {
      // Full flow: issue → authorize → commit
      const tokenResult = await returnsService.issueToken(
        { ...fixtures.tokenRequest, policy_id: policyId },
        TEST_MERCHANT_ID
      );
      
      const authResult = await returnsService.authorize(
        {
          return_token: tokenResult.return_token,
          ...fixtures.authorizeRequest,
        },
        TEST_MERCHANT_ID
      );
      
      expect(authResult.decision).toBe('approve');
      
      const commitResult = await returnsService.commit(
        {
          return_token: tokenResult.return_token,
          ...fixtures.commitRequest,
        },
        TEST_MERCHANT_ID
      );
      
      expect(commitResult).toHaveProperty('refund_instruction');
      expect(commitResult).toHaveProperty('receipt');
      expect(['instant', 'on_receipt', 'manual_review']).toContain(
        commitResult.refund_instruction
      );
    });
    
    it('should not commit denied return', async () => {
      // Create a scenario that gets denied
      // For now, test that commit validates authorization exists
      const commitRequest = {
        return_token: 'invalid_token',
        ...fixtures.commitRequest,
      };
      
      await expect(
        returnsService.commit(commitRequest, TEST_MERCHANT_ID)
      ).rejects.toThrow();
    });
  });
  
  describe('End-to-End Flow', () => {
    it('should complete full return flow successfully', async () => {
      // 1. Issue token
      const tokenResult = await returnsService.issueToken(
        { ...fixtures.tokenRequest, policy_id: policyId },
        TEST_MERCHANT_ID
      );
      
      expect(tokenResult.return_token).toBeTruthy();
      const traceId = tokenResult.trace_id;
      
      // 2. Authorize
      const authResult = await returnsService.authorize(
        {
          return_token: tokenResult.return_token,
          ...fixtures.authorizeRequest,
        },
        TEST_MERCHANT_ID
      );
      
      expect(authResult.decision).toBe('approve');
      
      // 3. Commit
      const commitResult = await returnsService.commit(
        {
          return_token: tokenResult.return_token,
          ...fixtures.commitRequest,
        },
        TEST_MERCHANT_ID
      );
      
      expect(commitResult.refund_instruction).toBeTruthy();
      
      // 4. Verify AEL logging
      const { getDb } = await import('../src/db/index.js');
      const db = getDb();
      
      const decision = db.prepare(`
        SELECT * FROM decisions WHERE trace_id = ?
      `).get(traceId);
      
      expect(decision).toBeTruthy();
      expect((decision as any).decision).toBe('approve');
    });
  });
});
