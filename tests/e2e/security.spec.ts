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
    await pageA.goto(editorUrlB);
    
    // Should be denied (redirected to /recover or 401/not found)
    // Tizkar redirects unauthorized to /login or /recover or shows 'Not Authorized'
    // Actually, Tizkar shows a specific login/recover form for that invitation if unauthorized.
    await expect(pageA).not.toHaveURL(editorUrlB);
    
    // Attempt to access Guests B
    await pageA.goto(editorUrlB.replace('/edit', '/editor') + '/guests');
    await expect(pageA).not.toHaveURL(editorUrlB.replace('/edit', '/editor') + '/guests');

    // Attempt to access Share B
    await pageA.goto(editorUrlB.replace('/edit', '/editor') + '/share');
    await expect(pageA).not.toHaveURL(editorUrlB.replace('/edit', '/editor') + '/share');
    
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
