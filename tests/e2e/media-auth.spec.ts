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
  let foreignUserId: string;

  test.beforeAll(async () => {
    // Create distinct synthetic users
    const { createTestUser } = await import('./helpers/utils');
    const createdUser = await createTestUser('media-owner');
    const createdForeignUser = await createTestUser('media-foreign');
    
    user = createdUser;
    foreignUserId = createdForeignUser.id;

    // Create synthetic invitations
    const { data: invs, error: invError } = await adminClient.from('invitations').insert([
      { user_id: user.id, title: 'Draft Inv', status: 'DRAFT', slug: `draft-${Date.now()}` },
      { user_id: user.id, title: 'Published Inv', status: 'PUBLISHED', slug: `pub-${Date.now()}` },
      { user_id: user.id, title: 'Expired Inv', status: 'PUBLISHED', slug: `exp-${Date.now()}`, expires_at: new Date(Date.now() - 10000).toISOString() },
      { user_id: foreignUserId, title: 'Foreign Inv', status: 'PUBLISHED', slug: `foreign-${Date.now()}` }
    ]).select();

    if (invError) throw invError;
    [invA, invB, invC, invD] = invs;

    // Add versions
    await adminClient.from('invitation_versions').insert([
      { invitation_id: invB.id, is_published: true, invitation_data: { coverImage: `${user.id}/${invB.id}/${MOCK_UUID}.jpg`, gallery: [`${user.id}/${invB.id}/${MOCK_UUID}.png`], music: { type: 'MP3', url: `${user.id}/${invB.id}/${MOCK_UUID}.mp3` } } },
      { invitation_id: invC.id, is_published: true, invitation_data: { coverImage: `${user.id}/${invC.id}/${MOCK_UUID}.jpg` } },
      { invitation_id: invD.id, is_published: true, invitation_data: { coverImage: `${foreignUserId}/${invD.id}/${MOCK_UUID}.jpg` } }
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
    if (user && invB && invA && invC) {
      const paths = [
        `${user.id}/${invB.id}/${MOCK_UUID}.jpg`,
        `${user.id}/${invB.id}/${MOCK_UUID}.png`,
        `${user.id}/${invB.id}/${MOCK_UUID}.mp3`,
        `${user.id}/${invA.id}/${MOCK_UUID}.jpg`,
        `${user.id}/${invB.id}/${MOCK_UUID}_orphan.png`,
        `${user.id}/${invC.id}/${MOCK_UUID}.jpg`
      ];
      await adminClient.storage.from('invitations_assets').remove(paths);
    }
    
    const invIds = [invA?.id, invB?.id, invC?.id, invD?.id].filter(Boolean) as string[];
    if (invIds.length > 0) {
      await adminClient.from('invitations').delete().in('id', invIds);
    }
    
    const { deleteTestUser } = await import('./helpers/utils');
    if (user?.id) await deleteTestUser(user.id);
    if (foreignUserId) await deleteTestUser(foreignUserId);
  });

  test('Published referenced cover (ALLOW)', async ({ request }) => {
    const res = await request.get(`/api/media?path=${user.id}/${invB.id}/${MOCK_UUID}.jpg`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    
    const location = res.headers().location;
    expect(location).toBeTruthy();
    
    const loc = new URL(location);
    const expectedOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321').origin;
    expect(loc.origin.toLowerCase()).toBe(expectedOrigin.toLowerCase());
    expect(loc.origin).not.toContain('hnjfxdyterpbmkisaiiw.supabase.co'); // Ensure no E2E target hits Prod
    expect(loc.pathname).toContain('/storage/v1/object/sign/invitations_assets/');
    expect(loc.pathname).toContain(`${user.id}/${invB.id}/${MOCK_UUID}.jpg`);
    expect(loc.searchParams.has('token')).toBe(true);
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

  test('Legacy Auth owner access (ALLOW)', async ({ request }) => {
    // Authenticate through the supported Supabase password flow to establish a standard session
    const dummyPassword = process.env.SUPABASE_DUMMY_PASSWORD || 'tidkar-dev-pass-2026';
    
    // Create the test user via Admin API
    const { createTestUser } = await import('./helpers/utils');
    const legacyUser = await createTestUser('legacy-auth-e2e');
    const legacyUserId = legacyUser.id;

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

    // Login using the official @supabase/ssr helper to establish a standard session without handcrafting cookies
    const { createServerClient } = await import('@supabase/ssr');
    const cookieJar = new Map<string, string>();
    const serverClient = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })),
        setAll: (cookiesToSet) => cookiesToSet.forEach(c => cookieJar.set(c.name, c.value))
      }
    });

    const { error: authError } = await serverClient.auth.signInWithPassword({
      email: legacyUser.email!,
      password: dummyPassword
    });
    expect(authError).toBeNull();
    expect(cookieJar.size).toBeGreaterThan(0);

    // Verify foreign access is denied BEFORE we attach the token
    const unauthRes = await request.get(`/api/media?path=${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg`, { maxRedirects: 0 });
    expect(unauthRes.status()).toBe(404);

    // Pass the official cookies generated by the SDK to the request context
    const cookieHeader = Array.from(cookieJar.entries())
      .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
      .join('; ');
    
    const res = await request.get(`/api/media?path=${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg`, {
      headers: {
        Cookie: cookieHeader
      },
      maxRedirects: 0
    });
    
    expect(res.status()).toBe(302); // Successfully authorized and signed URL returned
    
    // Cleanup safely
    await adminClient.storage.from('invitations_assets').remove([`${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg`]);
    await adminClient.from('invitations').delete().eq('id', legacyInv.id);
    const { deleteTestUser } = await import('./helpers/utils');
    await deleteTestUser(legacyUserId);
  });
});
