import { test, expect } from '@playwright/test';
import { generateTestId, cleanupTestInvitations, loginAsAdmin } from './helpers/utils';
import path from 'path';
import fs from 'fs';

test.describe.serial('Golden Path', () => {
  let testId: string;
  let editorUrl: string;
  let publicSlug: string;

  test.beforeAll(async () => {
    testId = generateTestId();
  });

  test.afterAll(async () => {
    await cleanupTestInvitations(testId);
  });

  test('Anonymous Create & Autosave', async ({ page }) => {
    await page.goto('/templates');
    
    // Choose Layali
    await page.locator('a').filter({ hasText: 'ليالي' }).first().click();
    await page.getByRole('button', { name: 'استخدم هذا القالب' }).click();

    // Wait for either the editor URL or the "دخول المحرر" button
    try {
      await page.waitForURL(/\/editor\/.+/, { timeout: 60000 });
      console.log('Redirected to editor!');
    } catch {
      console.log('Did not redirect to editor, waiting for دخول المحرر');
      const enterEditorBtn = page.getByText('دخول المحرر');
      try {
        await enterEditorBtn.waitFor({ state: 'visible', timeout: 5000 });
        await enterEditorBtn.click();
      } catch (err) {
        console.log("PAGE CONTENT: ", await page.content());
        throw err;
      }
      await expect(page).toHaveURL(/\/editor\/.+/);
    }
    editorUrl = page.url();

    // Expand accordion if needed (shadcn accordion might be closed)
    await page.getByRole('button', { name: 'معلومات المناسبة' }).click();

    // Fill details
    await page.getByPlaceholder('مثال: أحمد محمد').fill('عريس ' + testId);
    await page.getByPlaceholder('مثال: زهراء علي').fill('عروس ' + testId);
    
    // Wait for autosave indicator
    await expect(page.getByText('تم الحفظ')).toBeVisible({ timeout: 10000 });

    // Reload page to verify persistence
    await page.reload();
    await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
    await expect(page.getByPlaceholder('مثال: أحمد محمد')).toHaveValue('عريس ' + testId);
  });

  test('Storage Upload & Preview', async ({ page }) => {
    await page.goto(editorUrl);
    
    // Open gallery accordion
    await page.getByRole('button', { name: 'معرض الصور' }).click();

    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('+ إضافة صور').first().click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: fs.readFileSync(path.join(__dirname, 'fixtures/test-image.png'))
    });
    
    // Check if the upload succeeds (queue item shows success)
    await expect(page.getByText('✓ تم').first()).toBeVisible({ timeout: 15000 });
  });

  test('Payment Order & Admin Confirmation & Publish', async ({ page, context }) => {
    await page.goto(editorUrl);
    
    // Go to publish / payment
    await page.getByRole('button', { name: 'نشر الدعوة' }).click();
    
    // Select a plan
    await page.getByRole('button', { name: 'اختيار الباقة' }).first().click();
    
    // Now on payment page
    await expect(page).toHaveURL(/\/dashboard\/payment\/.+/);
    
    // Click manual transfer
    await page.getByRole('button', { name: 'تأكيد التحويل وإنهاء الطلب' }).click();
    
    // Should see pending status
    await expect(page.getByText('قيد المراجعة')).toBeVisible();
    
    // Admin Flow
    const adminPage = await context.newPage();
    await loginAsAdmin(adminPage);
    
    await adminPage.goto('/admin/orders');
    // Find our specific testId title
    await adminPage.locator('tr').filter({ hasText: testId }).getByRole('button', { name: 'تأكيد' }).click();
    
    await adminPage.close();

    // Back to owner page
    await page.reload();
    // Paid state
    await expect(page.getByText('مؤكد')).toBeVisible();

    // Go to dashboard to publish
    await page.goto(editorUrl);
    await page.getByRole('button', { name: 'نشر الدعوة' }).click();
    
    // Since paid, it should now publish
    await expect(page).toHaveURL(/\/editor\/.+\/share/);
    
    // Get public URL
    // Actually, ShareCenter has: span with dir-ltr
    const publicUrlSpan = page.locator('span.dir-ltr');
    const fullUrl = await publicUrlSpan.innerText();
    publicSlug = fullUrl.split('/').pop() || '';
    expect(publicSlug).toBeTruthy();
  });

  test('Public Invitation & RSVP', async ({ browser }) => {
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    
    await publicPage.goto(`/${publicSlug}`);
    await expect(publicPage.getByText(testId)).toBeVisible();
    
    // Submit RSVP
    await publicPage.getByPlaceholder('مثال: أحمد محمد').fill('ضيف ' + testId);
    // guest_count input
    await publicPage.locator('input[type="number"]').fill('2');
    await publicPage.getByRole('button', { name: 'تأكيد الرد' }).click();
    
    await expect(publicPage.getByText('شكراً لك')).toBeVisible();
    await publicContext.close();
  });

  test('Owner RSVP Dashboard', async ({ page }) => {
    await page.goto(editorUrl.replace('/edit', '/editor').replace('/share', '') + '/guests');
    await expect(page.getByText('ضيف ' + testId)).toBeVisible();
    await expect(page.getByText('2')).toBeVisible(); // guest count
  });

  test('Share Center & OG / Story', async ({ page }) => {
    await page.goto(editorUrl.replace('/edit', '/editor').replace('/guests', '') + '/share');
    await expect(page.getByText('منشورة ✓')).toBeVisible();
    
    // Story API Check
    const storyRes = await page.request.get(`/api/invitations/${publicSlug}/story`);
    expect(storyRes.status()).toBe(401); // Public shouldn't get story directly, or maybe it does? Actually we wait for download instead.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'تحميل صورة الستوري (1080x1920)' }).click()
    ]);
    expect(download.suggestedFilename()).toContain(publicSlug);

    // OG Check
    const ogRes = await page.request.get(`/${publicSlug}/opengraph-image`);
    expect(ogRes.status()).toBe(200);
    expect(ogRes.headers()['content-type']).toBe('image/png');
  });
});
