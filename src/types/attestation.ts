import { z } from 'zod';

/**
 * Attestation Types - Agent identity verification
 */

export type AttestationFormat = 'jwt' | 'vc' | 'spt' | 'custom';

export type AgentPlatform = 
  | 'chatgpt' 
  | 'gemini' 
  | 'claude' 
  | 'perplexity'
  | 'custom';

/**
 * Agent Context - Verified identity extracted from attestation
 */
export interface AgentContext {
  platform: AgentPlatform;
  agent_id: string;
  attestation_format: AttestationFormat;
  verified: boolean;
  verified_at: Date;
  claims?: Record<string, any>;
  issuer?: string;
  expires_at?: Date;
}

/**
 * Attestation Verification Result
 */
export interface AttestationVerificationResult {
  valid: boolean;
  agent_context?: AgentContext;
  error?: string;
  error_code?: string;
}

/**
 * JWT Claims (Visa TAP, Custom)
 */
export interface JWTClaims {
  iss: string;      // Issuer
  sub?: string;     // Subject (agent_id)
  aud?: string;     // Audience
  exp: number;      // Expiry
  iat?: number;     // Issued at
  jti?: string;     // JWT ID
  agent_id?: string; // Agent identifier
  platform?: string; // Platform identifier
  [key: string]: any; // Additional claims
}

/**
 * Verifiable Credential (Google AP2)
 */
export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string | { id: string };
  issuanceDate: string;
  credentialSubject: {
    id: string;
    agent_id?: string;
    platform?: string;
    [key: string]: any;
  };
  proof: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    jws?: string;
    [key: string]: any;
  };
}

/**
 * SPT Token Info (Stripe/OpenAI ACP)
 */
export interface SPTTokenInfo {
  token_id: string;
  platform: string;
  agent_id: string;
  merchant_id: string;
  max_amount?: number;
  expires_at: string;
  revoked: boolean;
}

/**
 * JWKS (JSON Web Key Set)
 */
export interface JWKS {
  keys: JWK[];
}

export interface JWK {
  kty: string;
  use?: string;
  alg?: string;
  kid?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
  [key: string]: any;
}

/**
 * Platform Configuration
 */
export interface PlatformConfig {
  platform: AgentPlatform;
  jwks_url?: string;
  public_key?: string;
  issuer?: string;
  audience?: string;
  verification_endpoint?: string;
}

/**
 * Zod Schemas for Validation
 */
export const AgentContextSchema = z.object({
  platform: z.enum(['chatgpt', 'gemini', 'claude', 'perplexity', 'custom']),
  agent_id: z.string(),
  attestation_format: z.enum(['jwt', 'vc', 'spt', 'custom']),
  verified: z.boolean(),
  verified_at: z.date(),
  claims: z.record(z.any()).optional(),
  issuer: z.string().optional(),
  expires_at: z.date().optional(),
});

export const PlatformConfigSchema = z.object({
  platform: z.enum(['chatgpt', 'gemini', 'claude', 'perplexity', 'custom']),
  jwks_url: z.string().url().optional(),
  public_key: z.string().optional(),
  issuer: z.string().optional(),
  audience: z.string().optional(),
  verification_endpoint: z.string().url().optional(),
});
