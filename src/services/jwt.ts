import * as jose from 'jose';
import { readFileSync } from 'fs';
import { ReturnTokenClaims } from '../types/returns.js';
import { ArcanaError, ErrorCodes } from '../types/common.js';

let privateKey: jose.KeyLike | null = null;
let publicKey: jose.KeyLike | null = null;

async function loadKeys() {
  if (!privateKey || !publicKey) {
    const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem';
    const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem';
    
    const privateKeyPem = readFileSync(privateKeyPath, 'utf-8');
    const publicKeyPem = readFileSync(publicKeyPath, 'utf-8');
    
    privateKey = await jose.importPKCS8(privateKeyPem, 'EdDSA');
    publicKey = await jose.importSPKI(publicKeyPem, 'EdDSA');
  }
  
  return { privateKey, publicKey };
}

export async function signReturnToken(claims: ReturnTokenClaims): Promise<string> {
  const { privateKey } = await loadKeys();
  
  const jwt = await new jose.SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(claims.iss)
    .setExpirationTime(claims.exp)
    .setJti(claims.jti)
    .sign(privateKey!);
  
  return jwt;
}

export async function verifyReturnToken(token: string): Promise<ReturnTokenClaims> {
  const { publicKey } = await loadKeys();
  
  try {
    const { payload } = await jose.jwtVerify(token, publicKey!, {
      issuer: process.env.JWT_ISSUER || 'arcana',
    });
    
    return payload as unknown as ReturnTokenClaims;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new ArcanaError(ErrorCodes.RT_004, 'Return token has expired', 401);
    }
    throw new ArcanaError(ErrorCodes.RT_007, 'Invalid token signature', 401);
  }
}

export async function getPublicJWKS(): Promise<jose.JSONWebKeySet> {
  const { publicKey } = await loadKeys();
  const jwk = await jose.exportJWK(publicKey!);
  
  return {
    keys: [
      {
        ...jwk,
        use: 'sig',
        alg: 'EdDSA',
        kid: 'arcana-v1',
      },
    ],
  };
}
