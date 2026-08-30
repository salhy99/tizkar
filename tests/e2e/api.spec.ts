import { test, expect } from '@playwright/test';

test.describe('API Security Routes', () => {
  test('/api/media structural validation and security', async ({ request }) => {
    // 1. Missing parameters
    const res1 = await request.get('/api/media');
    expect(res1.status()).toBe(404);

    // 2. Malformed path
    const res2 = await request.get('/api/media?path=invalid/path/without/enough/segments');
    expect(res2.status()).toBe(404);

    // 3. Directory traversal attempt
    const res3 = await request.get('/api/media?path=user123/inv123/../../etc/passwd');
    expect(res3.status()).toBe(404);

    // 4. Invalid UUID format
    const res4 = await request.get('/api/media?path=user123/inv123/not-a-uuid.jpg');
    expect(res4.status()).toBe(404);

    // 5. Invalid extension
    const res5 = await request.get('/api/media?path=user123/inv123/12345678-1234-1234-1234-1234567890ab.exe');
    expect(res5.status()).toBe(404);

    // 6. Non-existent path (Structurally valid but no invitation in DB)
    const res6 = await request.get('/api/media?path=user123/inv123/12345678-1234-1234-1234-1234567890ab.jpg');
    expect(res6.status()).toBe(404); // Not Found/Denied because it can't find an invitation/session
  });
});
