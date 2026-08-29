import * as serverModule from '../src/lib/entitlements/server';

// Mock Supabase to return specific data based on our tests
vi.mock('@/lib/supabase/server', () => {
  return {
    createClient: vi.fn(() => Promise.resolve({
      from: vi.fn((table) => {
        // Mock table responses
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn(() => {
            if (table === 'invitations') {
              return Promise.resolve({ data: { status: 'PUBLISHED' }, error: null });
            }
            if (table === 'orders') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return Promise.resolve({ data: (globalThis as any).__mockOrderData, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          })
        };
      })
    }))
  };
});

describe('Entitlements Server Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('requireInvitationFeature DENIES when capability missing', async () => {
    // FREE_PREVIEW has premiumTemplates = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__mockOrderData = null; 

    const result = await serverModule.requireInvitationFeature('inv-1', 'premiumTemplates');
    expect(result).toBe(false);
  });

  test('requireInvitationFeature ALLOWS when capability present', async () => {
    // PREMIUM has premiumTemplates = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__mockOrderData = { status: 'PAID', created_at: new Date().toISOString(), plans: { name: 'PREMIUM' } };

    const result = await serverModule.requireInvitationFeature('inv-1', 'premiumTemplates');
    expect(result).toBe(true);
  });

  test('requireInvitationLimit ALLOWS when requested amount is under limit', async () => {
    // BASIC maxImages = 10
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__mockOrderData = { status: 'PAID', created_at: new Date().toISOString(), plans: { name: 'BASIC' } };

    const result = await serverModule.requireInvitationLimit('inv-1', 'maxImages', 5);
    expect(result).toBe(true);
  });

  test('requireInvitationLimit DENIES when requested amount is over limit', async () => {
    // BASIC maxImages = 10
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__mockOrderData = { status: 'PAID', created_at: new Date().toISOString(), plans: { name: 'BASIC' } };

    const result = await serverModule.requireInvitationLimit('inv-1', 'maxImages', 15);
    expect(result).toBe(false);
  });

  test('requireInvitationLimit ALLOWS when limit is null (unlimited)', async () => {
    // PREMIUM maxGuestResponses = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__mockOrderData = { status: 'PAID', created_at: new Date().toISOString(), plans: { name: 'PREMIUM' } };

    const result = await serverModule.requireInvitationLimit('inv-1', 'maxGuestResponses', 9999);
    expect(result).toBe(true);
  });
});
