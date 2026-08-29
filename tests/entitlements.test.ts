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

  test('FREE_PREVIEW provides basic limits but preserves features', () => {
    const ent = getPackageEntitlements('FREE_PREVIEW');
    expect(ent.analytics).toBe(true);
    expect(ent.premiumTemplates).toBe(false);
    expect(ent.maxImages).toBe(10);
    expect(ent.invitationDurationDays).toBe(0);
  });
});
