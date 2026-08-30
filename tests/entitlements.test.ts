import { getPackageEntitlements, DEFAULT_ENTITLEMENTS } from '../src/lib/entitlements/registry';

describe('Entitlements Registry', () => {
  test('returns fallback for unknown plan', () => {
    const ent = getPackageEntitlements('NON_EXISTENT_PLAN');
    expect(ent).toEqual(DEFAULT_ENTITLEMENTS);
  });

  test('normalizes case for known plans', () => {
    const ent1 = getPackageEntitlements('premium');
    const ent2 = getPackageEntitlements('PREMIUM');
    expect(ent1.premiumTemplates).toBe(true);
    expect(ent1).toEqual(ent2);
  });

  test('returns default for null or undefined', () => {
    expect(getPackageEntitlements(null)).toEqual(DEFAULT_ENTITLEMENTS);
    expect(getPackageEntitlements(undefined)).toEqual(DEFAULT_ENTITLEMENTS);
  });

  it('implements final commercial matrix (Phase 8.6)', () => {
    // FREE_PREVIEW
    const free = getPackageEntitlements('FREE_PREVIEW');
    expect(free.analytics).toBe(false);
    expect(free.guestManagementPro).toBe(false);
    expect(free.premiumTemplates).toBe(false);
    expect(free.removeBranding).toBe(false);
    expect(free.audioAllowed).toBe(false);
    expect(free.storyExport).toBe(false);
    expect(free.maxImages).toBe(5);
    expect(free.maxGuestResponses).toBe(50);

    // BASIC
    const basic = getPackageEntitlements('BASIC');
    expect(basic.analytics).toBe(false);
    expect(basic.guestManagementPro).toBe(false);
    expect(basic.premiumTemplates).toBe(false);
    expect(basic.removeBranding).toBe(false);
    expect(basic.audioAllowed).toBe(false);
    expect(basic.storyExport).toBe(false);
    expect(basic.maxImages).toBe(10);
    expect(basic.maxGuestResponses).toBe(100);

    // PLUS
    const plus = getPackageEntitlements('PLUS');
    expect(plus.analytics).toBe(true);
    expect(plus.guestManagementPro).toBe(true);
    expect(plus.premiumTemplates).toBe(false);
    expect(plus.removeBranding).toBe(false);
    expect(plus.audioAllowed).toBe(true);
    expect(plus.storyExport).toBe(true);
    expect(plus.maxImages).toBe(20);
    expect(plus.maxGuestResponses).toBe(250);

    // PREMIUM
    const premium = getPackageEntitlements('PREMIUM');
    expect(premium.analytics).toBe(true);
    expect(premium.guestManagementPro).toBe(true);
    expect(premium.premiumTemplates).toBe(true);
    expect(premium.audioAllowed).toBe(true);
    expect(premium.storyExport).toBe(true);
    expect(premium.maxImages).toBe(50);
    expect(premium.maxGuestResponses).toBe(null);
  });

  it('guarantees DEFAULT_ENTITLEMENTS safety compared to FREE_PREVIEW', () => {
    const free = getPackageEntitlements('FREE_PREVIEW');
    const def = DEFAULT_ENTITLEMENTS;

    expect(def.analytics).toBe(false);
    expect(def.guestManagementPro).toBe(false);
    expect(def.audioAllowed).toBe(false);
    expect(def.storyExport).toBe(false);
    expect(def.premiumTemplates).toBe(false);
    expect(def.removeBranding).toBe(false);
    expect(def.maxImages).toBeLessThanOrEqual(free.maxImages);
    expect(def.maxGuestResponses).toBeLessThanOrEqual(free.maxGuestResponses!);
  });

  it('guarantees package monotonicity', () => {
    const free = getPackageEntitlements('FREE_PREVIEW');
    const basic = getPackageEntitlements('BASIC');
    const plus = getPackageEntitlements('PLUS');
    const premium = getPackageEntitlements('PREMIUM');

    const tiers = [free, basic, plus, premium];

    for (let i = 0; i < tiers.length - 1; i++) {
      const current = tiers[i];
      const next = tiers[i + 1];

      // Booleans should not regress from true to false
      expect(current.analytics ? next.analytics : true).toBe(true);
      expect(current.guestManagementPro ? next.guestManagementPro : true).toBe(true);
      expect(current.audioAllowed ? next.audioAllowed : true).toBe(true);
      expect(current.storyExport ? next.storyExport : true).toBe(true);
      expect(current.premiumTemplates ? next.premiumTemplates : true).toBe(true);
      expect(current.removeBranding ? next.removeBranding : true).toBe(true);

      // Limits should be non-decreasing
      expect(next.maxImages).toBeGreaterThanOrEqual(current.maxImages);
      
      if (current.maxGuestResponses !== null) {
        if (next.maxGuestResponses !== null) {
          expect(next.maxGuestResponses).toBeGreaterThanOrEqual(current.maxGuestResponses);
        } else {
          expect(next.maxGuestResponses).toBeNull(); // Upgrade to unlimited is valid
        }
      }
    }
  });
});
