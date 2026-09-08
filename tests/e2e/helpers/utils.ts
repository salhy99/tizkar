import { Page, expect } from '@playwright/test';

export function generateTestId() {
  return `E2E-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD');
  }

  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for admin dashboard
  await expect(page).toHaveURL(/\/admin/);
}

// Cleanup is tricky via browser because admin UI might not have a hard delete.
// The best approach is to let Supabase clean up via an external script,
// or we create a test helper using Supabase admin client directly in tests.
import { createClient } from '@supabase/supabase-js';

export async function cleanupTestInvitations(testPrefix: string = 'E2E-') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let host = '';
  try {
    host = new URL(supabaseUrl).hostname.toLowerCase();
  } catch {
    console.warn('Skipping cleanup: invalid Supabase URL.');
    return;
  }

  if (host.includes('hnjfxdyterpbmkisaiiw') || host.includes('tizkar.com')) {
    console.error('FATAL SAFETY BLOCK: Cannot execute cleanup on Production target.');
    return;
  }

  const isAllowedTestTarget =
    host.includes('zxrzqyvlydsdczngxxst') ||
    host === 'localhost' ||
    host === '127.0.0.1';

  if (!isAllowedTestTarget) {
    console.warn('Skipping cleanup because target is not an authorized test environment.');
    return;
  }
  
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from('invitations')
    .delete()
    .like('title', `${testPrefix}%`);
    
  if (error) {
    console.error('Failed to cleanup E2E invitations:', error);
  }
}
