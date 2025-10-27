import * as jose from 'jose';
import {
  AttestationVerificationResult,
  AgentContext,
  JWTClaims,
  PlatformConfig,
  JWKS,
} from '../types/attestation.js';
import { ArcanaError, ErrorCodes } from '../types/common.js';

/**
 * JWT Verifier - For Visa TAP and custom JWT-based attestations
 */
export class JWTVerifier {
  private jwksCache: Map<string, { jwks: JWKS; cached_at: number }> = new Map();
  private publicKeyCache: Map<string, jose.KeyLike> = new Map();
  private readonly JWKS_CACHE_TTL = 3600000; // 1 hour

  /**
   * Verify JWT attestation
   */
  async verify(
    token: string,
    config: PlatformConfig
  ): Promise<AttestationVerificationResult> {
    try {
      // Decode header to get kid (key ID)
      const header = jose.decodeProtectedHeader(token);
      
      // Get verification key
      const publicKey = await this.getPublicKey(config, header.kid);
      
      // Verify JWT
      const { payload } = await jose.jwtVerify(token, publicKey as any, {
        issuer: config.issuer,
        audience: config.audience,
      });
      
      const claims = payload as unknown as JWTClaims;
      
      // Extract agent context
      const agentContext: AgentContext = {
        platform: config.platform,
        agent_id: claims.agent_id || claims.sub || 'unknown',
        attestation_format: 'jwt',
        verified: true,
        verified_at: new Date(),
        claims,
        issuer: claims.iss,
        expires_at: new Date(claims.exp * 1000),
      };
      
      return {
        valid: true,
        agent_context: agentContext,
      };
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        return {
          valid: false,
          error: 'JWT has expired',
          error_code: 'JWT_EXPIRED',
        };
      }
      
      if (error instanceof jose.errors.JWTClaimValidationFailed) {
        return {
          valid: false,
          error: 'JWT claim validation failed',
          error_code: 'JWT_INVALID_CLAIMS',
        };
      }
      
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'JWT verification failed',
        error_code: 'JWT_VERIFICATION_FAILED',
      };
    }
  }
  
  /**
   * Get public key for verification
   */
  private async getPublicKey(
    config: PlatformConfig,
    kid?: string
  ): Promise<jose.KeyLike> {
    // If static public key is provided
    if (config.public_key) {
      const cacheKey = `static_${config.platform}`;
      
      if (this.publicKeyCache.has(cacheKey)) {
        return this.publicKeyCache.get(cacheKey)!;
      }
      
      const publicKey = await jose.importSPKI(config.public_key, 'EdDSA');
      this.publicKeyCache.set(cacheKey, publicKey);
      return publicKey;
    }
    
    // If JWKS URL is provided
    if (config.jwks_url) {
      const jwks = await this.fetchJWKS(config.jwks_url);
      
      // Find key by kid
      const jwk = kid 
        ? jwks.keys.find(k => k.kid === kid)
        : jwks.keys[0];
      
      if (!jwk) {
        throw new ArcanaError(
          ErrorCodes.AUTH_003,
          'Public key not found in JWKS',
          401
        );
      }
      
      const cacheKey = `jwks_${config.platform}_${kid || 'default'}`;
      
      if (this.publicKeyCache.has(cacheKey)) {
        return this.publicKeyCache.get(cacheKey)!;
      }
      
      const publicKey: any = await jose.importJWK(jwk, jwk.alg);
      this.publicKeyCache.set(cacheKey, publicKey);
      return publicKey;
    }
    
    throw new ArcanaError(
      ErrorCodes.CONFIG_001,
      'No public key or JWKS URL configured',
      500
    );
  }
  
  /**
   * Fetch JWKS from URL with caching
   */
  private async fetchJWKS(url: string): Promise<JWKS> {
    const now = Date.now();
    const cached = this.jwksCache.get(url);
    
    // Return cached JWKS if still valid
    if (cached && now - cached.cached_at < this.JWKS_CACHE_TTL) {
      return cached.jwks;
    }
    
    // Fetch fresh JWKS
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new ArcanaError(
        ErrorCodes.EXT_001,
        `Failed to fetch JWKS: ${response.statusText}`,
        502
      );
    }
    
    const jwks = await response.json() as JWKS;
    
    // Cache for future use
    this.jwksCache.set(url, {
      jwks,
      cached_at: now,
    });
    
    return jwks;
  }
  
  /**
   * Clear caches (useful for testing)
   */
  clearCache(): void {
    this.jwksCache.clear();
    this.publicKeyCache.clear();
  }
}
