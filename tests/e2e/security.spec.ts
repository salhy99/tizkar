import { test, expect } from '@playwright/test';
import { generateTestId, cleanupTestInvitations } from './helpers/utils';

test.describe.serial('Security & Access Control', () => {
  let testIdA: string;
  let testIdB: string;
  let editorUrlB: string;

  test.beforeAll(async () => {
    testIdA = generateTestId();
    testIdB = generateTestId();
  });

  test.afterAll(async () => {
    await cleanupTestInvitations(testIdA);
    await cleanupTestInvitations(testIdB);
  });

  test('Create Invitation B and Publish', async ({ page }) => {
    // Create B
    await page.goto('/templates');
    await page.locator('a').filter({ hasText: 'ليالي' }).first().click();
    await page.getByRole('button', { name: 'استخدم هذا القالب' }).click();
    try {
      await page.waitForURL(/\/editor\/.+/, { timeout: 60000 });
    } catch {
      const enterEditorBtnB = page.getByText('دخول المحرر');
      await enterEditorBtnB.waitFor({ state: 'visible', timeout: 5000 });
      await enterEditorBtnB.click();
      await expect(page).toHaveURL(/\/editor\/.+/);
    }
    editorUrlB = page.url();

    // Since we are not paying, it won't be easily published unless we mock payment, but wait:
    // Draft invitations can be checked for security too. We just need its editor URL.
  });

  test('Create Invitation A and test isolation', async ({ browser }) => {
    // Use an isolated context for A
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    
    // Create A
    await pageA.goto('/templates');
    await pageA.locator('a').filter({ hasText: 'ليالي' }).first().click();
    await pageA.getByRole('button', { name: 'استخدم هذا القالب' }).click();
    try {
      await pageA.waitForURL(/\/editor\/.+/, { timeout: 60000 });
    } catch {
      const enterEditorBtnA = pageA.getByText('دخول المحرر');
      await enterEditorBtnA.waitFor({ state: 'visible', timeout: 5000 });
      await enterEditorBtnA.click();
      await expect(pageA).toHaveURL(/\/editor\/.+/);
    }

    // Attempt to access Editor B using Context A
    const res = await pageA.goto(editorUrlB);
    
    // The server should either return a 404 Not Found (via notFound()) or redirect
    if (pageA.url() === editorUrlB) {
      // If it stays on the same URL, it MUST be a 404 Not Found page or auth gate.
      expect(res?.status()).toBe(404);
      // Ensure the actual editor UI (like "حفظ", "نشر", "ضيوف") is not available.
      await expect(pageA.getByRole('button', { name: 'حفظ' })).not.toBeVisible();
      await expect(pageA.getByRole('button', { name: 'نشر' })).not.toBeVisible();
      
      // Explicitly check that private data is not returned in HTML or DOM
      const content = await pageA.content();
      expect(content).not.toContain(testIdB); // B's title/data must not leak
    } else {
      // It redirected successfully away from the editor
      expect(pageA.url()).not.toBe(editorUrlB);
    }
    
    // Attempt to access Guests B
    const guestsRes = await pageA.goto(editorUrlB.replace('/edit', '/editor') + '/guests');
    if (pageA.url() === editorUrlB.replace('/edit', '/editor') + '/guests') {
      expect(guestsRes?.status()).toBe(404);
    }
    
    // Attempt to access Share B
    const shareRes = await pageA.goto(editorUrlB.replace('/edit', '/editor') + '/share');
    if (pageA.url() === editorUrlB.replace('/edit', '/editor') + '/share') {
      expect(shareRes?.status()).toBe(404);
    }
    
    await contextA.close();
  });

  test('Admin routes are denied for anonymous/editor', async ({ page }) => {
    // page is an anonymous context
    const adminRoutes = [
      '/admin',
      '/admin/orders',
      '/admin/invitations'
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      // Expected to redirect to /login
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('Draft public access is denied', async ({ page }) => {
    // Editor B is still in DRAFT
    const slugB = editorUrlB.split('/editor/')[1];
    
    // Public route
    await page.goto(`/${slugB}`);
    // Should show "هذه الدعوة قيد التجهيز" (Draft fallback) or 404
    await expect(page.getByText('هذه الدعوة قيد التجهيز')).toBeVisible();

    // OG Image
    const ogRes = await page.request.get(`/${slugB}/opengraph-image`);
    expect(ogRes.status()).toBe(404);

    // Story
    const storyRes = await page.request.get(`/api/invitations/${slugB}/story`);
    // Should be unauthorized
    expect(storyRes.status()).toBe(401);
  });
});
