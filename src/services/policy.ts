import { createHash } from 'crypto';
import pdfParse from 'pdf-parse';
import { getDb } from '../db/index.js';
import { 
  PolicyGraph, 
  PolicyImportRequest, 
  PolicyImportResponse,
  PolicyDiff 
} from '../types/policy.js';
import { ArcanaError, ErrorCodes, generateId } from '../types/common.js';

/**
 * Policy Snapshot Extractor
 * Converts merchant return policies into versioned, hashed Policy Graphs
 */

export class PolicyService {
  /**
   * Import a policy from PDF, URL, or text
   */
  async importPolicy(request: PolicyImportRequest): Promise<PolicyImportResponse> {
    const db = getDb();
    
    // Extract text from source
    let rawText = '';
    let sourceChecksum = '';
    
    if (request.source_type === 'pdf' && request.source_content) {
      const buffer = Buffer.from(request.source_content, 'base64');
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text;
      sourceChecksum = createHash('sha256').update(buffer).digest('hex');
    } else if (request.source_type === 'url' && request.source_url) {
      // Fetch URL content (simplified - in production, use proper HTTP client)
      const response = await fetch(request.source_url);
      rawText = await response.text();
      sourceChecksum = createHash('sha256').update(rawText).digest('hex');
    } else if (request.source_type === 'text' && request.source_content) {
      rawText = request.source_content;
      sourceChecksum = createHash('sha256').update(rawText).digest('hex');
    }
    
    // Parse policy (simplified extraction - in production, use LLM or structured parser)
    const extractedFields = this.extractPolicyFields(rawText);
    
    // Generate policy ID if new
    const policyId = generateId('plc');
    const snapshotId = `${policyId}_v1`;
    
    // Compute content hash
    const policyHash = this.computePolicyHash(extractedFields);
    
    // Check if identical policy already exists
    const existing = db.prepare(
      'SELECT snapshot_id FROM policy_snapshots WHERE hash = ? AND merchant_id = ?'
    ).get(policyHash, request.merchant_id);
    
    if (existing) {
      return {
        policy_id: policyId,
        snapshot_id: (existing as any).snapshot_id,
        policy_snapshot_hash: policyHash,
        requires_review: false,
        extracted_fields: extractedFields,
      };
    }
    
    // Insert new snapshot
    db.prepare(`
      INSERT INTO policy_snapshots (
        snapshot_id, policy_id, hash, effective_at, return_window_days,
        restock_fee_pct, allowed_channels, evidence, exclusions,
        item_classes, geo_rules, raw_source, source_url, source_checksum,
        merchant_id, reviewed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshotId,
      policyId,
      policyHash,
      request.effective_at || new Date().toISOString(),
      extractedFields.return_window_days || 30,
      extractedFields.restock_fee_pct || 0,
      JSON.stringify(extractedFields.allowed_channels || ['mail_in']),
      JSON.stringify(extractedFields.evidence || []),
      JSON.stringify(extractedFields.exclusions || []),
      JSON.stringify(extractedFields.item_classes || []),
      JSON.stringify(extractedFields.geo_rules || []),
      rawText,
      request.source_url || null,
      sourceChecksum,
      request.merchant_id,
      0 // Requires human review
    );
    
    return {
      policy_id: policyId,
      snapshot_id: snapshotId,
      policy_snapshot_hash: policyHash,
      requires_review: true,
      extracted_fields: extractedFields,
    };
  }
  
  /**
   * Get latest policy snapshot
   */
  getPolicy(policyId: string): PolicyGraph | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM policy_snapshots 
      WHERE policy_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(policyId);
    
    if (!row) return null;
    
    return this.rowToPolicyGraph(row as any);
  }
  
  /**
   * Get policy by hash
   */
  getPolicyByHash(hash: string): PolicyGraph | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM policy_snapshots WHERE hash = ?').get(hash);
    
    if (!row) return null;
    
    return this.rowToPolicyGraph(row as any);
  }
  
  /**
   * Compute diff between two policy snapshots
   */
  diffPolicies(fromSnapshotId: string, toSnapshotId: string): PolicyDiff {
    const db = getDb();
    
    const fromRow = db.prepare('SELECT * FROM policy_snapshots WHERE snapshot_id = ?').get(fromSnapshotId);
    const toRow = db.prepare('SELECT * FROM policy_snapshots WHERE snapshot_id = ?').get(toSnapshotId);
    
    if (!fromRow || !toRow) {
      throw new ArcanaError(ErrorCodes.POL_001, 'Policy snapshot not found', 404);
    }
    
    const from = this.rowToPolicyGraph(fromRow as any);
    const to = this.rowToPolicyGraph(toRow as any);
    
    const changes: PolicyDiff['changes'] = [];
    
    // Compare fields
    const fields: (keyof PolicyGraph)[] = [
      'return_window_days', 'restock_fee_pct', 'allowed_channels',
      'evidence', 'exclusions', 'item_classes', 'geo_rules'
    ];
    
    for (const field of fields) {
      const oldVal = from[field];
      const newVal = to[field];
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field,
          old_value: oldVal,
          new_value: newVal,
          change_type: 'modified',
        });
      }
    }
    
    return {
      from_snapshot_id: fromSnapshotId,
      to_snapshot_id: toSnapshotId,
      changes,
      summary: `${changes.length} field(s) changed`,
    };
  }
  
  /**
   * Extract policy fields from raw text (simplified)
   * In production, use LLM or structured parser
   */
  private extractPolicyFields(text: string): Partial<PolicyGraph> {
    const fields: Partial<PolicyGraph> = {};
    
    // Simple keyword extraction (placeholder)
    const windowMatch = text.match(/(\d+)\s*days?/i);
    if (windowMatch) {
      fields.return_window_days = parseInt(windowMatch[1]);
    }
    
    // Default values
    fields.return_window_days = fields.return_window_days || 30;
    fields.restock_fee_pct = 0;
    fields.allowed_channels = ['mail_in', 'drop_off'];
    fields.evidence = ['photo_packaging'];
    fields.exclusions = [];
    fields.item_classes = [];
    fields.geo_rules = [];
    
    return fields;
  }
  
  /**
   * Compute content hash of policy
   */
  private computePolicyHash(policy: Partial<PolicyGraph>): string {
    const canonical = JSON.stringify({
      return_window_days: policy.return_window_days,
      restock_fee_pct: policy.restock_fee_pct,
      allowed_channels: policy.allowed_channels,
      evidence: policy.evidence,
      exclusions: policy.exclusions,
      item_classes: policy.item_classes,
      geo_rules: policy.geo_rules,
    }, Object.keys(policy).sort());
    
    return 'sha256:' + createHash('sha256').update(canonical).digest('hex');
  }
  
  /**
   * Convert DB row to PolicyGraph
   */
  private rowToPolicyGraph(row: any): PolicyGraph {
    return {
      policy_id: row.policy_id,
      snapshot_id: row.snapshot_id,
      hash: row.hash,
      effective_at: row.effective_at,
      return_window_days: row.return_window_days,
      restock_fee_pct: row.restock_fee_pct,
      allowed_channels: JSON.parse(row.allowed_channels),
      evidence: JSON.parse(row.evidence),
      exclusions: JSON.parse(row.exclusions),
      item_classes: JSON.parse(row.item_classes),
      geo_rules: JSON.parse(row.geo_rules),
      raw_source: row.raw_source,
      source_url: row.source_url,
      source_checksum: row.source_checksum,
    };
  }
}
