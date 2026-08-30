import { createClient } from '@/lib/supabase/server';
import { getPackageEntitlements, PackageEntitlements, DEFAULT_ENTITLEMENTS } from './registry';

export type EntitlementState = {
  isPaid: boolean;
  isPublished: boolean;
  planName: string;
  entitlements: PackageEntitlements;
};

/**
 * Resolves the trusted server-side entitlements for a given invitation.
 * This MUST be the single source of truth for authorization.
 */
export async function getInvitationEntitlements(invitationId: string): Promise<EntitlementState> {
  const supabase = createClient();
  
  // 1. Check if the invitation exists and is published
  const { data: invData, error: invError } = await (await supabase)
    .from('invitations')
    .select('status')
    .eq('id', invitationId)
    .single();

  if (invError || !invData) {
    return {
      isPaid: false,
      isPublished: false,
      planName: 'UNKNOWN',
      entitlements: DEFAULT_ENTITLEMENTS,
    };
  }

  // 2. Fetch the LATEST PAID order for this invitation
  const { data: orderData, error: orderError } = await (await supabase)
    .from('orders')
    .select(`
      status,
      created_at,
      paid_at,
      plans (
        name
      )
    `)
    .eq('invitation_id', invitationId)
    .eq('status', 'PAID')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // If there's no paid order, return FREE_PREVIEW entitlements
  if (orderError || !orderData) {
    return {
      isPaid: false,
      isPublished: invData.status === 'PUBLISHED',
      planName: 'FREE_PREVIEW',
      entitlements: getPackageEntitlements('FREE_PREVIEW'),
    };
  }

  // If there's a paid order, return its plan entitlements
  const planName = Array.isArray(orderData.plans) 
    ? orderData.plans[0]?.name 
    : orderData.plans?.name;

  const baseEntitlements = getPackageEntitlements(planName);
  
  // Phase 8.6 Grandfathering:
  // Invitations PAID before this precise release cutoff retain Analytics and Guest Management
  // even if they were on BASIC.
  const COMMERCIAL_POLICY_V2_CUTOFF = new Date('2026-08-30T12:00:00Z');
  
  // Use paid_at if available, otherwise fallback to created_at for older legacy orders
  const effectivePaidAtStr = (orderData as any).paid_at || orderData.created_at;
  const orderDate = new Date(effectivePaidAtStr || new Date().toISOString());
  const isGrandfathered = orderDate < COMMERCIAL_POLICY_V2_CUTOFF;

  const resolvedEntitlements = isGrandfathered ? {
    ...baseEntitlements,
    analytics: true,
    guestManagementPro: true,
  } : baseEntitlements;

  return {
    isPaid: true,
    isPublished: invData.status === 'PUBLISHED',
    planName: planName || 'UNKNOWN',
    entitlements: resolvedEntitlements,
  };
}

/**
 * Authorization helpers
 */
export async function requireInvitationFeature<K extends keyof PackageEntitlements>(
  invitationId: string,
  featureKey: K
): Promise<boolean> {
  const state = await getInvitationEntitlements(invitationId);
  return state.entitlements[featureKey] === true;
}

export async function requireInvitationLimit<K extends keyof PackageEntitlements>(
  invitationId: string,
  limitKey: K,
  requestedAmount: number
): Promise<boolean> {
  const state = await getInvitationEntitlements(invitationId);
  const limit = state.entitlements[limitKey];
  
  if (limit === null) return true; // unlimited
  if (typeof limit === 'number') return requestedAmount <= limit;
  return false;
}
