import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceRole);

if (supabaseUrl === 'https://hnjfxdyterpbmkisaiiw.supabase.co') {
  throw new Error('FATAL: Cannot run destructive E2E tests against Production database.');
}
test.describe('/api/media HTTP Authorization', () => {
  let user: { id: string, email?: string };
  let invA: { id: string, slug: string };
  let invB: { id: string, slug: string };
  let invC: { id: string, slug: string };
  let invD: { id: string, slug: string };

  const MOCK_UUID = '123e4567-e89b-42d3-a456-426614174000';

  test.beforeAll(async () => {
    // Get existing users to avoid rate limits
    const { data: users, error: userError } = await adminClient.auth.admin.listUsers();
    if (userError || !users?.users?.length || users.users.length < 2) throw new Error('At least two users needed');
    user = users.users[0];
    const foreignUser = users.users[1];

    // Create synthetic invitations
    const { data: invs, error: invError } = await adminClient.from('invitations').insert([
      { user_id: user.id, title: 'Draft Inv', status: 'DRAFT', slug: `draft-${Date.now()}` },
      { user_id: user.id, title: 'Published Inv', status: 'PUBLISHED', slug: `pub-${Date.now()}` },
      { user_id: user.id, title: 'Expired Inv', status: 'PUBLISHED', slug: `exp-${Date.now()}`, expires_at: new Date(Date.now() - 10000).toISOString() },
      { user_id: foreignUser.id, title: 'Foreign Inv', status: 'PUBLISHED', slug: `foreign-${Date.now()}` }
    ]).select();

    if (invError) throw invError;
    [invA, invB, invC, invD] = invs;

    // Add versions
    await adminClient.from('invitation_versions').insert([
      { invitation_id: invB.id, is_published: true, invitation_data: { coverImage: `${user.id}/${invB.id}/${MOCK_UUID}.jpg`, gallery: [`${user.id}/${invB.id}/${MOCK_UUID}.png`], music: { type: 'MP3', url: `${user.id}/${invB.id}/${MOCK_UUID}.mp3` } } },
      { invitation_id: invC.id, is_published: true, invitation_data: { coverImage: `${user.id}/${invC.id}/${MOCK_UUID}.jpg` } },
      { invitation_id: invD.id, is_published: true, invitation_data: { coverImage: `${foreignUser.id}/${invD.id}/${MOCK_UUID}.jpg` } }
    ]);

    // Upload dummy files to Storage
    const paths = [
      `${user.id}/${invB.id}/${MOCK_UUID}.jpg`,
      `${user.id}/${invB.id}/${MOCK_UUID}.png`,
      `${user.id}/${invB.id}/${MOCK_UUID}.mp3`,
      `${user.id}/${invA.id}/${MOCK_UUID}.jpg`,
      `${user.id}/${invB.id}/${MOCK_UUID}_orphan.png`,
      `${user.id}/${invC.id}/${MOCK_UUID}.jpg`
    ];

    for (const p of paths) {
      const contentType = p.endsWith('.mp3') ? 'audio/mpeg' : p.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const { error } = await adminClient.storage.from('invitations_assets').upload(p, 'dummy content', {
        contentType,
        upsert: true
      });
      if (error) throw new Error(`Failed to upload ${p}: ${error.message}`);
    }
  });

  test.afterAll(async () => {
    const paths = [
      `${user.id}/${invB.id}/${MOCK_UUID}.jpg`,
      `${user.id}/${invB.id}/${MOCK_UUID}.png`,
      `${user.id}/${invB.id}/${MOCK_UUID}.mp3`,
      `${user.id}/${invA.id}/${MOCK_UUID}.jpg`,
      `${user.id}/${invB.id}/${MOCK_UUID}_orphan.png`,
      `${user.id}/${invC.id}/${MOCK_UUID}.jpg`
    ];
    await adminClient.storage.from('invitations_assets').remove(paths);
    await adminClient.from('invitations').delete().in('id', [invA.id, invB.id, invC.id, invD.id]);
  });

  test('Published referenced cover (ALLOW)', async ({ request }) => {
    const res = await request.get(`/api/media?path=${user.id}/${invB.id}/${MOCK_UUID}.jpg`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers().location).toContain('supabase.co');
  });

  test('Published referenced gallery (ALLOW)', async ({ request }) => {
    const res = await request.get(`/api/media?path=${user.id}/${invB.id}/${MOCK_UUID}.png`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
  });

  test('Published referenced audio (ALLOW)', async ({ request }) => {
    const res = await request.get(`/api/media?path=${user.id}/${invB.id}/${MOCK_UUID}.mp3`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
  });

  test('Draft guest access (DENY)', async ({ request }) => {
    const res = await request.get(`/api/media?path=${user.id}/${invA.id}/${MOCK_UUID}.jpg`);
    expect(res.status()).toBe(404); // Using 404 to avoid leaking existence
  });

  test('Draft owner access (ALLOW)', async ({ request }) => {
    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const token = `tzk_${rawToken}`;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    await adminClient.from('invitations').update({ edit_token_hash: hashed }).eq('id', invA.id);

    const res = await request.get(`/api/media?path=${user.id}/${invA.id}/${MOCK_UUID}.jpg`, {
      headers: {
        Cookie: `tzk_editor_session_${invA.id}=${token}`
      },
      maxRedirects: 0
    });
    expect(res.status()).toBe(302);
  });

  test('Foreign editor access (DENY)', async ({ request }) => {
    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const token = `tzk_${rawToken}`;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    await adminClient.from('invitations').update({ edit_token_hash: hashed }).eq('id', invA.id); // Valid session for A

    // Try to access B's media using A's session cookie
    const res = await request.get(`/api/media?path=${user.id}/${invB.id}/${MOCK_UUID}_orphan.png`, {
      headers: {
        Cookie: `tzk_editor_session_${invA.id}=${token}`
      },
      maxRedirects: 0
    });
    expect(res.status()).toBe(404);
  });

  test('Orphan public access (DENY)', async ({ request }) => {
    const res = await request.get(`/api/media?path=${user.id}/${invB.id}/${MOCK_UUID}_orphan.png`);
    expect(res.status()).toBe(404);
  });

  test('Expired public access (DENY)', async ({ request }) => {
    const res = await request.get(`/api/media?path=${user.id}/${invC.id}/${MOCK_UUID}.jpg`);
    expect(res.status()).toBe(404);
  });

  test('Malformed paths (DENY)', async ({ request }) => {
    const res1 = await request.get(`/api/media?path=invalid/path`);
    expect(res1.status()).toBe(404);

    const res2 = await request.get(`/api/media?path=../${user.id}/${invB.id}/${MOCK_UUID}.jpg`);
    expect(res2.status()).toBe(404);
  });

  test('Legacy Auth owner access (ALLOW)', async ({ page }) => {
    const testPhone = '+9647701111111';
    
    // Pre-create the user to avoid `signUp` email rate limits in the Next.js API route
    const dummyEmail = '9647701111111@tidkar.local';
    const dummyPassword = process.env.SUPABASE_DUMMY_PASSWORD || 'tidkar-dev-pass-2026';
    await adminClient.auth.admin.createUser({
      email: dummyEmail,
      password: dummyPassword,
      email_confirm: true
    });
    // Ensure profile exists
    const { data: userRecord } = await adminClient.auth.admin.listUsers();
    const createdUser = userRecord?.users.find(u => u.email === dummyEmail);
    if (createdUser) {
      await adminClient.from('profiles').upsert({ id: createdUser.id, phone: testPhone, display_name: 'E2E Test User' });
    }

    // Bypass cooldown rate limiting for the fixed phone number
    await adminClient.from('otp_requests').delete().eq('phone', '9647701111111');

    // Navigate to login
    await page.goto('/login');
    
    // Perform login with a fixed test phone
    await page.getByPlaceholder('مثال: +9647701234567').fill(testPhone);
    await page.locator('button[type="submit"]').click();
    
    // Wait for the OTP request to be created by polling the DB
    let otpCreated = false;
    for (let i = 0; i < 10; i++) {
      const { data } = await adminClient.from('otp_requests').select('id').eq('phone', '9647701111111').eq('status', 'PENDING').maybeSingle();
      if (data) {
        otpCreated = true;
        break;
      }
      await page.waitForTimeout(500);
    }
    
    if (!otpCreated) {
      await page.screenshot({ path: 'login-error.png' });
      const { data: allReqs } = await adminClient.from('otp_requests').select('*').eq('phone', '9647701111111');
      console.log('OTP requests in DB:', allReqs);
      throw new Error("OTP request row was not created in time.");
    }

    const crypto = await import('crypto');
    const secret = process.env.OTP_HASH_SECRET || 'tidkar-dev-secret-2026';
    const mockHash = crypto.createHmac('sha256', secret).update('123456').digest('hex');
    await adminClient.from('otp_requests').update({ otp_hash: mockHash }).eq('phone', '9647701111111').eq('status', 'PENDING');

    // Verify OTP
    await page.getByPlaceholder('123456').fill('123456');
    await page.locator('button[type="submit"]').click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Get the auth user from the database directly by finding the most recent profile
    const { data: profiles } = await adminClient.from('profiles').select('id').eq('phone', testPhone).single();
    const legacyUserId = profiles?.id;
    expect(legacyUserId).toBeTruthy();

    // Create an invitation owned by this new legacy user
    const { data: legacyInv } = await adminClient.from('invitations').insert({
      user_id: legacyUserId,
      title: 'Legacy Auth Inv',
      status: 'DRAFT',
      slug: `legacy-${Date.now()}`
    }).select().single();

    // Add a version and dummy file
    await adminClient.from('invitation_versions').insert({
      invitation_id: legacyInv.id,
      is_published: false,
      invitation_data: { coverImage: `${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg` }
    });
    await adminClient.storage.from('invitations_assets').upload(`${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg`, 'dummy content', { contentType: 'image/jpeg', upsert: true });

    // NOW use the page's request context which has the cookies attached!
    const res = await page.request.get(`/api/media?path=${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg`, {
      maxRedirects: 0
    });
    
    expect(res.status()).toBe(302);
    
    // Cleanup
    await adminClient.storage.from('invitations_assets').remove([`${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg`]);
    await adminClient.from('invitations').delete().eq('id', legacyInv.id);
  });
});
