/**
 * Evidence Validator Service
 * 
 * Validates evidence submissions before processing returns:
 * - URL accessibility
 * - Content-type verification
 * - File size limits
 * - (Optional) Quality checks
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  suggestion: string;
}

export interface Evidence {
  type: string;
  url: string;
  notes?: string;
}

export class EvidenceValidator {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_RETRIES = 3;
  
  private readonly ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
    photo_packaging: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
    photo_defect: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
    photo_receipt: ['image/jpeg', 'image/jpg', 'image/png', 'image/pdf'],
    video: ['video/mp4', 'video/quicktime', 'video/mpeg', 'video/webm'],
    receipt_pdf: ['application/pdf'],
    tracking_info: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'text/plain'],
  };

  /**
   * Validate array of evidence
   */
  async validateEvidence(evidence: Evidence[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    for (let i = 0; i < evidence.length; i++) {
      const item = evidence[i];
      
      // Validate URL format
      const urlValidation = this.validateUrl(item.url, i);
      if (!urlValidation.valid) {
        errors.push(...urlValidation.errors);
        continue; // Skip further checks if URL is invalid
      }

      // Check URL accessibility
      const accessibilityResult = await this.checkUrlAccessibility(item.url, i);
      if (!accessibilityResult.valid) {
        errors.push(...accessibilityResult.errors);
        continue; // Skip further checks if not accessible
      }

      // Check content type
      const contentTypeResult = await this.checkContentType(item.url, item.type, i);
      if (!contentTypeResult.valid) {
        errors.push(...contentTypeResult.errors);
        continue;
      }

      // Check file size
      const fileSizeResult = await this.checkFileSize(item.url, i);
      if (!fileSizeResult.valid) {
        errors.push(...fileSizeResult.errors);
        continue;
      }

      // Optional: Check image quality for photos
      if (item.type.startsWith('photo_')) {
        const qualityResult = await this.checkImageQuality(item.url, i);
        if (!qualityResult.valid) {
          // Quality checks are warnings, not hard failures
          errors.push(...qualityResult.errors);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: string, index: number): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      const parsed = new URL(url);
      
      // Must be HTTP or HTTPS
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push({
          field: `evidence[${index}].url`,
          code: 'EV_001',
          message: 'URL must use HTTP or HTTPS protocol',
          suggestion: 'Ensure the URL starts with https:// or http://',
        });
      }

      // Must have a hostname
      if (!parsed.hostname) {
        errors.push({
          field: `evidence[${index}].url`,
          code: 'EV_002',
          message: 'URL must have a valid hostname',
          suggestion: 'Provide a complete URL like https://cdn.example.com/image.jpg',
        });
      }
    } catch (error) {
      errors.push({
        field: `evidence[${index}].url`,
        code: 'EV_003',
        message: 'Invalid URL format',
        suggestion: 'Provide a valid URL starting with https://',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if URL is accessible
   */
  private async checkUrlAccessibility(url: string, index: number): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (attempt === this.MAX_RETRIES - 1) {
            errors.push({
              field: `evidence[${index}].url`,
              code: 'EV_004',
              message: `URL returned ${response.status} ${response.statusText}`,
              suggestion: 'Ensure the URL is publicly accessible and returns 200 OK',
            });
          }
          continue;
        }

        // Success!
        return { valid: true, errors: [] };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          if (attempt === this.MAX_RETRIES - 1) {
            errors.push({
              field: `evidence[${index}].url`,
              code: 'EV_005',
              message: 'Request timed out after 5 seconds',
              suggestion: 'Ensure the URL is accessible and responds quickly. Check firewall/CORS settings.',
            });
          }
        } else if (attempt === this.MAX_RETRIES - 1) {
          errors.push({
            field: `evidence[${index}].url`,
            code: 'EV_006',
            message: `Network error: ${error.message}`,
            suggestion: 'Ensure the URL is accessible from our servers. Check DNS and network connectivity.',
          });
        }

        // Exponential backoff
        if (attempt < this.MAX_RETRIES - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Check content type
   */
  private async checkContentType(url: string, evidenceType: string, index: number): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      if (!contentType) {
        errors.push({
          field: `evidence[${index}].url`,
          code: 'EV_007',
          message: 'Content-Type header missing',
          suggestion: 'Ensure the server sends a Content-Type header with the response',
        });
        return { valid: false, errors };
      }

      // Get base content type (remove charset, etc.)
      const baseContentType = contentType.split(';')[0].trim().toLowerCase();

      // Check if content type is allowed for this evidence type
      const allowedTypes = this.ALLOWED_CONTENT_TYPES[evidenceType];
      if (!allowedTypes) {
        // Unknown evidence type - allow any image or PDF
        if (!baseContentType.startsWith('image/') && baseContentType !== 'application/pdf') {
          errors.push({
            field: `evidence[${index}].type`,
            code: 'EV_008',
            message: `Unknown evidence type: ${evidenceType}`,
            suggestion: 'Use a supported evidence type: photo_packaging, photo_defect, photo_receipt, video, receipt_pdf, tracking_info',
          });
        }
      } else if (!allowedTypes.includes(baseContentType)) {
        errors.push({
          field: `evidence[${index}].url`,
          code: 'EV_009',
          message: `Content-Type ${baseContentType} not allowed for ${evidenceType}`,
          suggestion: `Upload one of: ${allowedTypes.join(', ')}`,
        });
      }
    } catch (error: any) {
      errors.push({
        field: `evidence[${index}].url`,
        code: 'EV_010',
        message: `Could not verify content type: ${error.message}`,
        suggestion: 'Ensure the URL is accessible and the server responds with proper headers',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check file size
   */
  private async checkFileSize(url: string, index: number): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentLength = response.headers.get('content-length');
      if (!contentLength) {
        // Content-Length missing - not a hard failure, but log warning
        return { valid: true, errors: [] };
      }

      const fileSize = parseInt(contentLength, 10);
      if (fileSize > this.MAX_FILE_SIZE) {
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        errors.push({
          field: `evidence[${index}].url`,
          code: 'EV_011',
          message: `File size (${sizeMB}MB) exceeds maximum (10MB)`,
          suggestion: 'Compress the file or upload to a CDN that serves optimized versions',
        });
      }
    } catch (error: any) {
      // File size check is not critical - allow it to pass
      return { valid: true, errors: [] };
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check image quality (basic checks)
   * This is a soft check - returns warnings, not hard failures
   */
  private async checkImageQuality(url: string, index: number): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // For MVP, we'll just do basic checks
    // In production, you could use sharp library or external service

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Basic check: file should be at least 10KB (avoid tiny images)
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const fileSize = parseInt(contentLength, 10);
        if (fileSize < 10 * 1024) {
          errors.push({
            field: `evidence[${index}].url`,
            code: 'EV_012',
            message: 'Image file size too small (< 10KB), may be low quality',
            suggestion: 'Upload a higher resolution image for better verification',
          });
        }
      }

      // TODO: In production, add:
      // - Image dimension checks (min 640x480)
      // - Blur detection
      // - Brightness/contrast checks
      // - EXIF data validation
    } catch (error) {
      // Quality checks are optional - don't fail
      return { valid: true, errors: [] };
    }

    // Quality warnings don't fail validation
    return { valid: true, errors };
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Quick validation (URL format only, no network calls)
   * Useful for pre-validation before async checks
   */
  validateUrlsFormat(evidence: Evidence[]): ValidationResult {
    const errors: ValidationError[] = [];

    for (let i = 0; i < evidence.length; i++) {
      const urlValidation = this.validateUrl(evidence[i].url, i);
      if (!urlValidation.valid) {
        errors.push(...urlValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const evidenceValidator = new EvidenceValidator();
