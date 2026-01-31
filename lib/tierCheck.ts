import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export type Tier = 'claimed' | 'starter' | 'spotlight' | 'elite';

export interface TierCheckResult {
  authorized: boolean;
  partner: any | null;
  tier: Tier | null;
  error?: string;
}

/**
 * Check if partner has required tier
 * @param userToken - Cookie token
 * @param requiredTier - Minimum tier required ('claimed', 'starter', 'spotlight', 'elite')
 */
export function checkPartnerTier(userToken: string | undefined, requiredTier: Tier): TierCheckResult {
  if (!userToken) {
    return { authorized: false, partner: null, tier: null, error: 'Unauthorized' };
  }

  const db = new Database(DB_PATH);

  const user = db.prepare(`
    SELECT 
      u.id,
      u.partner_id,
      p.id as p_id,
      p.tier as p_tier,
      p.status,
      p.business_name
    FROM user_sessions us
    JOIN users u ON u.id = us.user_id
    LEFT JOIN partners p ON u.partner_id = p.id
    WHERE us.token = ? AND us.expires_at > datetime('now')
  `).get(userToken) as any;

  db.close();

  if (!user || !user.partner_id) {
    return { authorized: false, partner: null, tier: null, error: 'Not a partner' };
  }

  // Use p_tier (from partners table), not user.tier
  const tier = (user.p_tier || 'claimed') as Tier;
  
  // Tier hierarchy: elite > spotlight > starter > claimed
  const tierLevel: Record<Tier, number> = { claimed: 1, starter: 2, spotlight: 3, elite: 4 };
  const hasAccess = tierLevel[tier] >= tierLevel[requiredTier];

  if (!hasAccess) {
    return { 
      authorized: false, 
      partner: user, 
      tier, 
      error: `Requires ${requiredTier} tier` 
    };
  }

  return { authorized: true, partner: user, tier };
}
