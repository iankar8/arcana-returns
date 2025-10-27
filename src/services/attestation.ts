import {
  AttestationFormat,
  AttestationVerificationResult,
  AgentContext,
  PlatformConfig,
  AgentPlatform,
} from '../types/attestation.js';
import { JWTVerifier } from '../adapters/jwt-verifier.js';
import { ArcanaError, ErrorCodes } from '../types/common.js';

/**
 * Attestation Service - Main entry point for verifying agent attestations
 */
export class AttestationService {
  private jwtVerifier: JWTVerifier;
  private platformConfigs: Map<AgentPlatform, PlatformConfig>;
  
  constructor() {
    this.jwtVerifier = new JWTVerifier();
    this.platformConfigs = this.loadPlatformConfigs();
  }
  
  /**
   * Verify attestation from header value
   */
  async verifyAttestation(
    attestationHeader: string,
    platformHint?: AgentPlatform
  ): Promise<AttestationVerificationResult> {
    try {
      // Detect format
      const format = this.detectFormat(attestationHeader);
      
      // Get platform config
      const platform = platformHint || this.detectPlatform(attestationHeader);
      const config = this.platformConfigs.get(platform);
      
      if (!config) {
        return {
          valid: false,
          error: `No configuration found for platform: ${platform}`,
          error_code: 'PLATFORM_NOT_CONFIGURED',
        };
      }
      
      // Route to appropriate verifier
      switch (format) {
        case 'jwt':
          return await this.jwtVerifier.verify(attestationHeader, config);
        
        case 'vc':
          return await this.verifyVC(attestationHeader, config);
        
        case 'spt':
          return await this.verifySPT(attestationHeader, config);
        
        case 'custom':
          return await this.verifyCustom(attestationHeader, config);
        
        default:
          return {
            valid: false,
            error: 'Unknown attestation format',
            error_code: ErrorCodes.ATT_001,
          };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
        error_code: ErrorCodes.ATT_002,
      };
    }
  }
  
  /**
   * Detect attestation format from header value
   */
  private detectFormat(attestation: string): AttestationFormat {
    // JWT format: three base64url parts separated by dots
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(attestation)) {
      return 'jwt';
    }
    
    // Verifiable Credential: JSON with @context
    try {
      const parsed = JSON.parse(attestation);
      if (parsed['@context'] && parsed.type && parsed.proof) {
        return 'vc';
      }
    } catch {
      // Not JSON, continue
    }
    
    // SPT: Starts with spt_ prefix
    if (attestation.startsWith('spt_')) {
      return 'spt';
    }
    
    return 'custom';
  }
  
  /**
   * Detect platform from attestation (if possible)
   */
  private detectPlatform(attestation: string): AgentPlatform {
    // Try to decode JWT header to check issuer
    if (this.detectFormat(attestation) === 'jwt') {
      try {
        const parts = attestation.split('.');
        const header = JSON.parse(
          Buffer.from(parts[0], 'base64url').toString('utf8')
        );
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8')
        );
        
        // Check issuer
        if (payload.iss?.includes('openai')) return 'chatgpt';
        if (payload.iss?.includes('google')) return 'gemini';
        if (payload.iss?.includes('anthropic')) return 'claude';
        if (payload.iss?.includes('perplexity')) return 'perplexity';
        if (payload.iss?.includes('visa')) return 'custom'; // Visa TAP
      } catch {
        // Couldn't decode
      }
    }
    
    // Check SPT format (Stripe/OpenAI)
    if (attestation.startsWith('spt_')) {
      return 'chatgpt';
    }
    
    return 'custom';
  }
  
  /**
   * Verify Verifiable Credential (Google AP2)
   */
  private async verifyVC(
    attestation: string,
    config: PlatformConfig
  ): Promise<AttestationVerificationResult> {
    // TODO: Implement VC verification
    // For now, return not implemented
    return {
      valid: false,
      error: 'VC verification not yet implemented',
      error_code: 'NOT_IMPLEMENTED',
    };
  }
  
  /**
   * Verify SPT (Stripe/OpenAI ACP)
   */
  private async verifySPT(
    attestation: string,
    config: PlatformConfig
  ): Promise<AttestationVerificationResult> {
    // TODO: Implement SPT verification via Stripe API
    // For now, return basic validation
    if (!attestation.startsWith('spt_')) {
      return {
        valid: false,
        error: 'Invalid SPT format',
        error_code: ErrorCodes.ATT_001,
      };
    }
    
    // In production, would call Stripe API to verify token
    // For MVP, accept any spt_ token
    const agentContext: AgentContext = {
      platform: 'chatgpt',
      agent_id: 'spt_agent', // Would extract from Stripe API response
      attestation_format: 'spt',
      verified: true,
      verified_at: new Date(),
      claims: {
        token_id: attestation,
      },
    };
    
    return {
      valid: true,
      agent_context: agentContext,
    };
  }
  
  /**
   * Verify custom attestation format
   */
  private async verifyCustom(
    attestation: string,
    config: PlatformConfig
  ): Promise<AttestationVerificationResult> {
    // Default to JWT verification for custom formats
    return await this.jwtVerifier.verify(attestation, config);
  }
  
  /**
   * Load platform configurations from environment
   */
  private loadPlatformConfigs(): Map<AgentPlatform, PlatformConfig> {
    const configs = new Map<AgentPlatform, PlatformConfig>();
    
    // ChatGPT / OpenAI
    configs.set('chatgpt', {
      platform: 'chatgpt',
      jwks_url: process.env.OPENAI_JWKS_URL,
      issuer: 'openai',
    });
    
    // Gemini / Google
    configs.set('gemini', {
      platform: 'gemini',
      jwks_url: process.env.GOOGLE_JWKS_URL,
      issuer: 'google',
    });
    
    // Claude / Anthropic
    configs.set('claude', {
      platform: 'claude',
      jwks_url: process.env.ANTHROPIC_JWKS_URL,
      issuer: 'anthropic',
    });
    
    // Perplexity
    configs.set('perplexity', {
      platform: 'perplexity',
      jwks_url: process.env.PERPLEXITY_JWKS_URL,
      issuer: 'perplexity',
    });
    
    // Custom / Visa TAP
    configs.set('custom', {
      platform: 'custom',
      jwks_url: process.env.VISA_TAP_JWKS_URL,
      public_key: process.env.VISA_TAP_PUBLIC_KEY,
      issuer: 'visa',
    });
    
    return configs;
  }
  
  /**
   * Add or update platform configuration
   */
  setPlatformConfig(platform: AgentPlatform, config: PlatformConfig): void {
    this.platformConfigs.set(platform, config);
  }
  
  /**
   * Get platform configuration
   */
  getPlatformConfig(platform: AgentPlatform): PlatformConfig | undefined {
    return this.platformConfigs.get(platform);
  }
}
