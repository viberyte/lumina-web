import crypto from 'crypto';

/**
 * Generate a unique claim token for partner outreach
 * Format: 8-char alphanumeric (URL-safe, easy to type)
 */
export function generateClaimToken(): string {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Generate a longer secure token for sensitive operations
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(16).toString('hex');
}
