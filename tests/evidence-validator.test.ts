import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EvidenceValidator } from '../src/services/evidence-validator.js';
import http from 'http';

describe('Evidence Validator', () => {
  let testServer: http.Server;
  let validator: EvidenceValidator;
  let serverUrl: string;

  // Set up a test HTTP server
  beforeAll(async () => {
    validator = new EvidenceValidator();
    
    await new Promise<void>((resolve) => {
      testServer = http.createServer((req, res) => {
      // Handle different test cases based on URL
      const url = new URL(req.url || '', `http://localhost:${(testServer.address() as any).port}`);
      
      if (url.pathname === '/valid-image.jpg') {
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'Content-Length': '50000',
        });
        res.end('fake image data');
      } else if (url.pathname === '/large-file.jpg') {
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'Content-Length': '20000000', // 20MB
        });
        res.end();
      } else if (url.pathname === '/wrong-type.txt') {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Content-Length': '100',
        });
        res.end('not an image');
      } else if (url.pathname === '/no-content-type.jpg') {
        res.writeHead(200, {
          'Content-Length': '1000',
        });
        res.end();
      } else if (url.pathname === '/not-found.jpg') {
        res.writeHead(404);
        res.end('Not Found');
      } else if (url.pathname === '/timeout.jpg') {
        // Don't respond - will timeout
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end();
        }, 10000); // 10 seconds (longer than validator timeout)
      } else if (url.pathname === '/tiny-image.jpg') {
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'Content-Length': '5000', // 5KB - below 10KB threshold
        });
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    });

      testServer.listen(0, () => {
        const port = (testServer.address() as any).port;
        serverUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    });
  });

  describe('URL Format Validation', () => {
    it('should accept valid HTTPS URL', () => {
      const result = validator.validateUrlsFormat([
        { type: 'photo_packaging', url: 'https://example.com/image.jpg' }
      ]);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid HTTP URL', () => {
      const result = validator.validateUrlsFormat([
        { type: 'photo_packaging', url: 'http://example.com/image.jpg' }
      ]);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-HTTP protocols', () => {
      const result = validator.validateUrlsFormat([
        { type: 'photo_packaging', url: 'ftp://example.com/image.jpg' }
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EV_001');
    });

    it('should reject invalid URL format', () => {
      const result = validator.validateUrlsFormat([
        { type: 'photo_packaging', url: 'not-a-url' }
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EV_003');
    });

    it('should reject URL without hostname', () => {
      const result = validator.validateUrlsFormat([
        { type: 'photo_packaging', url: 'https:///image.jpg' }
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('EV_002');
    });
  });

  describe('URL Accessibility', () => {
    it('should accept accessible URL', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/valid-image.jpg` }
      ]);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject 404 URL', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/not-found.jpg` }
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EV_004');
      expect(result.errors[0].message).toContain('404');
    });

    it('should reject unreachable URL', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: 'https://this-domain-does-not-exist-12345.com/image.jpg' }
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EV_006');
    }, 20000); // Longer timeout for network errors
  });

  describe('Content Type Validation', () => {
    it('should accept correct content type for photo', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/valid-image.jpg` }
      ]);
      
      expect(result.valid).toBe(true);
    });

    it('should reject wrong content type', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/wrong-type.txt` }
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EV_009');
      expect(result.errors[0].message).toContain('text/plain');
    });

    it('should reject missing content type', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/no-content-type.jpg` }
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EV_007');
    });
  });

  describe('File Size Validation', () => {
    it('should accept file within size limit', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/valid-image.jpg` }
      ]);
      
      expect(result.valid).toBe(true);
    });

    it('should reject file exceeding size limit', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/large-file.jpg` }
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EV_011');
      expect(result.errors[0].message).toContain('10MB');
    });
  });

  describe('Image Quality Checks', () => {
    it('should warn about tiny images', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/tiny-image.jpg` }
      ]);
      
      // Quality warnings don't fail validation
      expect(result.valid).toBe(true);
      // But should include warning
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EV_012');
    });
  });

  describe('Multiple Evidence Items', () => {
    it('should validate all items', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/valid-image.jpg` },
        { type: 'photo_defect', url: `${serverUrl}/valid-image.jpg` },
      ]);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report all errors', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/not-found.jpg` },
        { type: 'photo_defect', url: `${serverUrl}/wrong-type.txt` },
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      
      // Should have error for index 0
      const error0 = result.errors.find(e => e.field.includes('[0]'));
      expect(error0).toBeDefined();
    });

    it('should include field names in errors', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/not-found.jpg` },
        { type: 'photo_defect', url: `${serverUrl}/not-found.jpg` },
      ]);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toContain('evidence[0]');
      expect(result.errors[1].field).toContain('evidence[1]');
    });
  });

  describe('Error Messages', () => {
    it('should include helpful suggestions', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/not-found.jpg` }
      ]);
      
      expect(result.errors[0].suggestion).toBeTruthy();
      expect(result.errors[0].suggestion.length).toBeGreaterThan(10);
    });

    it('should include field reference', async () => {
      const result = await validator.validateEvidence([
        { type: 'photo_packaging', url: `${serverUrl}/not-found.jpg` }
      ]);
      
      expect(result.errors[0].field).toBe('evidence[0].url');
    });
  });
});
