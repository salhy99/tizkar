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

  it('FREE_PREVIEW provides basic limits but preserves features', () => {
    const entitlements = getPackageEntitlements('FREE_PREVIEW')
    expect(entitlements.analytics).toBe(true)
    expect(entitlements.guestManagementPro).toBe(true)
    expect(entitlements.maxImages).toBe(5)
    expect(entitlements.maxAudioBytes).toBe(0)
    expect(entitlements.maxGuestResponses).toBe(50)
    expect(entitlements.storyExport).toBe(false)
    expect(entitlements.audioAllowed).toBe(false)
  });
});
