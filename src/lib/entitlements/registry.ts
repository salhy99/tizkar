export type PackageEntitlements = {
  // Core Modules
  analytics: boolean;
  guestManagementPro: boolean;
  premiumTemplates: boolean;
  
  // Customization
  removeBranding: boolean;
  audioAllowed: boolean;
  storyExport: boolean;
  
  // Limits
  maxImages: number;
  maxAudioBytes: number;
  invitationDurationDays: number;
  maxGuestResponses: number | null; // null = unlimited
};

// We use the stable plan names defined in initial_schema.sql as keys.
// For Phase 8.3, we preserve existing production behavior by granting Analytics
// and Guest Management Pro to all paid plans (and FREE_PREVIEW for testing) 
// until business explicitly locks them.
export const PACKAGE_REGISTRY: Record<string, PackageEntitlements> = {
  FREE_PREVIEW: {
    analytics: true, // Preserving existing accessibility
    guestManagementPro: true, // Preserving existing accessibility
    premiumTemplates: false,
    removeBranding: false,
    audioAllowed: false,
    storyExport: false,
    maxImages: 5,
    maxAudioBytes: 0,
    invitationDurationDays: 120,
    maxGuestResponses: 50,
  },
  BASIC: {
    analytics: true,
    guestManagementPro: true,
    premiumTemplates: false,
    removeBranding: false,
    audioAllowed: false, // Per existing logic: plus/premium only
    storyExport: false,
    maxImages: 10,
    maxAudioBytes: 0,
    invitationDurationDays: 120,
    maxGuestResponses: 100,
  },
  PLUS: {
    analytics: true,
    guestManagementPro: true,
    premiumTemplates: false,
    removeBranding: false,
    audioAllowed: true,
    storyExport: true,
    maxImages: 20,
    maxAudioBytes: 5 * 1024 * 1024,
    invitationDurationDays: 120,
    maxGuestResponses: 250,
  },
  PREMIUM: {
    analytics: true,
    guestManagementPro: true,
    premiumTemplates: true,
    removeBranding: true,
    audioAllowed: true,
    storyExport: true,
    maxImages: 50,
    maxAudioBytes: 10 * 1024 * 1024,
    invitationDurationDays: 120,
    maxGuestResponses: null, // unlimited
  },
};

// Fallback for unknown plans (safest least-privilege)
export const DEFAULT_ENTITLEMENTS: PackageEntitlements = {
  analytics: true, // preserve current behavior
  guestManagementPro: true, // preserve current behavior
  premiumTemplates: false,
  removeBranding: false,
  audioAllowed: false,
  storyExport: false,
  maxImages: 5,
  maxAudioBytes: 0,
  invitationDurationDays: 0,
  maxGuestResponses: 50,
};

export function getPackageEntitlements(planName: string | null | undefined): PackageEntitlements {
  if (!planName) return DEFAULT_ENTITLEMENTS;
  
  // Normalize key
  const normalizedKey = planName.trim().toUpperCase();
  
  return PACKAGE_REGISTRY[normalizedKey] || DEFAULT_ENTITLEMENTS;
}
