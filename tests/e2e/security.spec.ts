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

    // Open Accordion and populate synthetic private fields to verify they are not leaked
    await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
    await page.getByPlaceholder('مثال: أحمد محمد').fill(`groom-${testIdB}`);
    await page.getByPlaceholder('مثال: زهراء علي').fill(`bride-${testIdB}`);
    // Editor uses auto-save, wait for it to complete
    await expect(page.getByText('تم الحفظ ✓')).toBeVisible({ timeout: 15000 });
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
      expect(content).not.toContain(`groom-${testIdB}`); // B's title/data must not leak
      expect(content).not.toContain(`bride-${testIdB}`);
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
    const res = await page.goto(`/${slugB}`);
    // Should show the not available fallback
    await expect(page.getByText('هذه الدعوة غير متاحة حالياً')).toBeVisible();
    
    // Ensure no private data leaked
    const content = await page.content();
    expect(content).not.toContain(`groom-${testIdB}`);
    expect(content).not.toContain(`bride-${testIdB}`);
    expect(content).not.toContain('tzk_'); // Check that edit tokens are not leaked in HTML
    
    // Ensure not 200 Success if it's the draft page (App returns 404, or 200 with fallback? Let's check status if available)
    if (res?.status() === 200) {
       expect(content).toContain('هذه الدعوة غير متاحة حالياً'); // Fallback is rendered safely
    }

    // OG Image
    const ogRes = await page.request.get(`/${slugB}/opengraph-image`);
    expect(ogRes.status()).toBe(404);
    const ogText = await ogRes.text();
    expect(ogText).not.toContain(`groom-${testIdB}`);

    // Story
    const storyRes = await page.request.get(`/api/invitations/${slugB}/story`);
    // Should be unauthorized
    expect(storyRes.status()).toBe(401);
  });
});
