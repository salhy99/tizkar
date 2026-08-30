import { test, expect } from '@playwright/test';

if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://hnjfxdyterpbmkisaiiw.supabase.co') {
  throw new Error('FATAL: Cannot run destructive E2E tests against Production database.');
}

test.describe('Recovery Runtime Verification', () => {
  let invitationId: string;
  let originalRecoveryKey: string;

  test.beforeAll(async ({ browser }) => {
    // 1. Create a real invitation through the UI to ensure all DB relations (versions, templates, analytics) are properly set
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/templates');
    await page.locator('a').filter({ hasText: 'ليالي' }).first().click();
    await page.getByRole('button', { name: 'استخدم هذا القالب' }).click();

    // Wait for the success modal
    await page.waitForSelector('text=احفظ بيانات استرداد دعوتك');
    
    // Extract recovery key
    const recoveryKeyText = await page.locator('div.tracking-wider.text-primary').textContent();
    if (!recoveryKeyText || !recoveryKeyText.includes('TZK-RCV-')) {
      throw new Error("Recovery key not found in DOM");
    }
    originalRecoveryKey = recoveryKeyText.trim();
    
    // Extract invitation ID from the button link
    const enterEditorBtn = page.getByRole('link', { name: 'دخول المحرر' });
    const href = await enterEditorBtn.getAttribute('href');
    if (!href) throw new Error("Editor link not found");
    invitationId = href.split('/editor/')[1];

    await context.close();
  });

  test('Valid recovery key rotates access and invalidates old key', async ({ page }) => {
    // Generate a random IP for this test run to bypass the IP-based rate limit
    const mockIp = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': mockIp });

    // 1. Navigate to recover page
    await page.goto('/recover');
    
    // 2. Fill in the original recovery key
    await page.getByPlaceholder('مثال: TZK-RCV-XXXX-XXXX').fill(originalRecoveryKey);
    await page.getByRole('button', { name: 'استرجاع الدعوة' }).click();
    
    // 3. Expect success message
    await expect(page.getByText('تم استرجاع الدعوة بنجاح')).toBeVisible({ timeout: 10000 });
    
    // 4. Verify new access works by clicking "فتح المحرر"
    await page.getByRole('link', { name: 'فتح المحرر' }).click();
    
    // 5. Expect to be in the editor
    await expect(page).toHaveURL(new RegExp(`/editor/${invitationId}`));
    await expect(page.getByText('معلومات المناسبة')).toBeAttached();

    // 6. Old recovery key should now be denied
    await page.goto('/recover');
    await page.getByPlaceholder('مثال: TZK-RCV-XXXX-XXXX').fill(originalRecoveryKey);
    await page.getByRole('button', { name: 'استرجاع الدعوة' }).click();
    
    await expect(page.getByText('رمز الاسترداد غير صحيح أو لم يعد صالحاً.')).toBeVisible();
  });
});
