import { Command } from 'commander';
import { createHash, randomBytes } from 'crypto';
import { getDb } from '../../db/index.js';
import { generateId } from '../../types/common.js';

export const keysCommand = new Command('keys')
  .description('API key management');

keysCommand
  .command('create')
  .description('Create a new API key for a merchant')
  .requiredOption('--merchant <merchantId>', 'Merchant ID')
  .option('--name <name>', 'Key name/description')
  .action((options) => {
    try {
      const db = getDb();
      
      // Generate API key
      const apiKey = 'sk_' + randomBytes(32).toString('hex');
      const keyHash = 'sha256:' + createHash('sha256').update(apiKey).digest('hex');
      const keyId = generateId('key');
      
      // Store in database
      db.prepare(`
        INSERT INTO api_keys (key_id, merchant_id, key_hash, name)
        VALUES (?, ?, ?, ?)
      `).run(keyId, options.merchant, keyHash, options.name || null);
      
      console.log('\n✓ API Key Created\n');
      console.log('Key ID:', keyId);
      console.log('Merchant:', options.merchant);
      console.log('API Key:', apiKey);
      console.log('\n⚠️  Save this key securely - it will not be shown again!\n');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

keysCommand
  .command('list')
  .description('List API keys for a merchant')
  .requiredOption('--merchant <merchantId>', 'Merchant ID')
  .action((options) => {
    try {
      const db = getDb();
      const keys = db.prepare(`
        SELECT key_id, name, created_at, revoked, last_used_at
        FROM api_keys
        WHERE merchant_id = ?
        ORDER BY created_at DESC
      `).all(options.merchant);
      
      console.log(`\nAPI Keys for ${options.merchant}:\n`);
      for (const key of keys as any[]) {
        const status = key.revoked ? 'REVOKED' : 'ACTIVE';
        const lastUsed = key.last_used_at || 'Never';
        console.log(`${key.key_id} | ${status} | ${key.name || '(unnamed)'} | Last used: ${lastUsed}`);
      }
      console.log();
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

keysCommand
  .command('revoke')
  .description('Revoke an API key')
  .requiredOption('--key <keyId>', 'Key ID to revoke')
  .action((options) => {
    try {
      const db = getDb();
      db.prepare(`
        UPDATE api_keys
        SET revoked = 1, revoked_at = ?
        WHERE key_id = ?
      `).run(new Date().toISOString(), options.key);
      
      console.log(`\n✓ API key ${options.key} has been revoked\n`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });
